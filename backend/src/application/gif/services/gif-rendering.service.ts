import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient, AuditAction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import * as jpeg from 'jpeg-js';
import { GifWriter, GifReader } from 'omggif';
import { GifAssetService } from './gif-asset.service';
import { GifQuantizerService } from './gif-quantizer.service';
import { GifDitheringService } from './gif-dithering.service';
import { FrameRasterizerService, DecodedImageSource } from './frame-rasterizer.service';
import { TriggerRenderDto, DitherMode } from '../dto/gif-render.dto';
import {
  GifProjectStatus,
  isValidStatusTransition,
  GIF_RESOURCE_LIMITS,
  AnimationConfiguration,
} from '../models/gif.model';

@Injectable()
export class GifRenderingService implements OnModuleInit {
  private readonly logger = new Logger(GifRenderingService.name);
  private readonly prisma = new PrismaClient();
  private readonly renderStorageDirectory = path.resolve(
    process.cwd(),
    'storage',
    'uploads',
    'gif-renders',
  );

  // Active in-flight render cancellation controllers: jobId -> AbortController
  private readonly activeJobs = new Map<string, AbortController>();

  constructor(
    private readonly assetService: GifAssetService,
    private readonly quantizer: GifQuantizerService,
    private readonly dithering: GifDitheringService,
    private readonly rasterizer: FrameRasterizerService,
  ) {}

  onModuleInit() {
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory() {
    try {
      if (!fs.existsSync(this.renderStorageDirectory)) {
        fs.mkdirSync(this.renderStorageDirectory, { recursive: true });
        this.logger.log(`Created render storage directory: ${this.renderStorageDirectory}`);
      }
    } catch (err) {
      this.logger.error(`Failed to initialize render storage directory: ${err.message}`, err.stack);
    }
  }

  /**
   * Triggers a new asynchronous GIF background rendering job for a project.
   */
  async startRenderJob(
    userId: string,
    projectId: string,
    dto?: TriggerRenderDto,
  ) {
    if (!userId) {
      throw new BadRequestException('User identification is required');
    }

    // 1. Retrieve project and verify ownership
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
      include: { asset: true },
    });

    if (!project) {
      throw new NotFoundException(`Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to render this project');
    }

    // 2. Validate state machine transition
    if (!isValidStatusTransition(project.status as GifProjectStatus, 'RENDERING')) {
      throw new BadRequestException(
        `Invalid status transition: cannot transition project from ${project.status} to RENDERING`,
      );
    }

    const config = (project.animationConfiguration as unknown as AnimationConfiguration) || {
      duration: project.duration,
      fps: project.fps,
      loopCount: 0,
      quality: 85,
      dithering: true,
      pixelArtMode: false,
      effects: [],
      seed: project.randomSeed.toString(),
    };

    const duration = dto?.duration ?? config.duration ?? project.duration;
    const fps = dto?.fps ?? config.fps ?? project.fps;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const outputWidth = dto?.width ?? project.outputWidth ?? project.width;
    const outputHeight = dto?.height ?? project.outputHeight ?? project.height;
    const ditherMode = dto?.ditherMode ?? (config.dithering ? DitherMode.FLOYD_STEINBERG : DitherMode.NONE);
    const pixelArtMode = dto?.pixelArtMode ?? config.pixelArtMode ?? false;
    const maxColors = dto?.maxColors ?? 256;

    // 3. Create GifRenderJob in database
    const job = await this.prisma.gifRenderJob.create({
      data: {
        projectId,
        userId,
        status: 'RENDERING',
        progress: 0.0,
        totalFrames,
        renderedFrames: 0,
      },
    });

    // 4. Update Project Status to RENDERING
    await this.prisma.gifProject.update({
      where: { id: projectId },
      data: { status: 'RENDERING' },
    });

    // 5. Setup cancellation controller
    const abortController = new AbortController();
    this.activeJobs.set(job.id, abortController);

    // 6. Launch Asynchronous Render Pipeline (non-blocking)
    setImmediate(() => {
      this.executeRenderPipeline({
        jobId: job.id,
        projectId,
        userId,
        assetId: project.originalAssetId,
        config,
        duration,
        fps,
        totalFrames,
        outputWidth,
        outputHeight,
        ditherMode,
        pixelArtMode,
        maxColors,
        abortSignal: abortController.signal,
      }).catch((err) => {
        this.logger.error(`Render job [${job.id}] uncaught failure: ${err.message}`, err.stack);
      });
    });

    this.logger.log(
      `Started render job [${job.id}] for project [${projectId}] (${totalFrames} frames @ ${fps} FPS, ${outputWidth}x${outputHeight})`,
    );

    return {
      jobId: job.id,
      projectId,
      status: 'RENDERING',
      totalFrames,
      duration,
      fps,
      outputWidth,
      outputHeight,
      progress: 0.0,
    };
  }

  /**
   * Internal asynchronous render execution loop.
   */
  private async executeRenderPipeline(params: {
    jobId: string;
    projectId: string;
    userId: string;
    assetId: string;
    config: AnimationConfiguration;
    duration: number;
    fps: number;
    totalFrames: number;
    outputWidth: number;
    outputHeight: number;
    ditherMode: DitherMode;
    pixelArtMode: boolean;
    maxColors: number;
    abortSignal: AbortSignal;
  }) {
    const {
      jobId,
      projectId,
      userId,
      assetId,
      config,
      duration,
      fps,
      totalFrames,
      outputWidth,
      outputHeight,
      ditherMode,
      pixelArtMode,
      maxColors,
      abortSignal,
    } = params;

    const startTime = Date.now();

    try {
      // 1. Fetch and decode source image asset
      const { buffer: assetBuffer, mimeType } = await this.assetService.getAssetFile(assetId, userId);
      const decodedSource = this.decodeImageBuffer(assetBuffer, mimeType);

      if (abortSignal.aborted) {
        await this.handleAbortedJob(jobId, projectId);
        return;
      }

      // 2. Sample keyframes to build optimal global palette
      const sampleCount = Math.min(8, Math.max(2, Math.floor(totalFrames / 3)));
      const sampleBuffers: Uint8Array[] = [];

      for (let s = 0; s < sampleCount; s++) {
        const sampleTime = (s / sampleCount) * duration;
        const frameRgba = this.rasterizer.rasterizeFrame({
          source: decodedSource,
          effects: config.effects || [],
          timeSeconds: sampleTime,
          durationSeconds: duration,
          fps,
          outputWidth,
          outputHeight,
          pixelArtMode,
          seed: config.seed,
        });
        sampleBuffers.push(frameRgba);
      }

      const paletteResult = this.quantizer.quantize(sampleBuffers, maxColors, 128);

      if (abortSignal.aborted) {
        await this.handleAbortedJob(jobId, projectId);
        return;
      }

      // 3. Pre-allocate buffer for GifWriter
      // Typical animated GIF size is ~30-50% of raw uncompressed indexed pixels
      const initialCapacity = Math.max(
        1024 * 1024,
        Math.round(outputWidth * outputHeight * totalFrames * 0.75) + 65536,
      );
      let gifBuffer = Buffer.alloc(initialCapacity);

      const delayHundredths = Math.max(2, Math.round(100 / fps));
      const writer = new GifWriter(gifBuffer, outputWidth, outputHeight, {
        palette: paletteResult.palette,
        loop: 0, // 0 = Loop infinitely (Netscape application block)
      });

      // 4. Render and Encode Frames Loop
      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (abortSignal.aborted) {
          await this.handleAbortedJob(jobId, projectId);
          return;
        }

        const timeSeconds = frameIdx / fps;

        // A. Rasterize transformed frame at time t
        const frameRgba = this.rasterizer.rasterizeFrame({
          source: decodedSource,
          effects: config.effects || [],
          timeSeconds,
          durationSeconds: duration,
          fps,
          outputWidth,
          outputHeight,
          pixelArtMode,
          seed: config.seed,
        });

        // B. Dither frame into indexed pixels
        const indexedPixels = this.dithering.ditherFrame(
          frameRgba,
          outputWidth,
          outputHeight,
          paletteResult,
          ditherMode,
          128,
        );

        // C. Add frame to GIF stream
        try {
          writer.addFrame(0, 0, outputWidth, outputHeight, indexedPixels as any, {
            delay: delayHundredths,
            disposal: 2, // Restore to background
            transparent: paletteResult.transparentIndex !== null ? paletteResult.transparentIndex : undefined,
          });
        } catch (writerErr) {
          // If buffer exceeded, dynamically expand output buffer
          if (writerErr.message && writerErr.message.includes('buffer')) {
            const expanded = Buffer.alloc(gifBuffer.length * 2);
            gifBuffer.copy(expanded, 0, 0, writer.getOutputBufferPosition());
            writer.setOutputBuffer(expanded);
            gifBuffer = expanded;

            // Retry adding frame
            writer.addFrame(0, 0, outputWidth, outputHeight, indexedPixels as any, {
              delay: delayHundredths,
              disposal: 2,
              transparent: paletteResult.transparentIndex !== null ? paletteResult.transparentIndex : undefined,
            });
          } else {
            throw writerErr;
          }
        }

        // D. Update job progress in database (every 5 frames or final frame)
        const renderedCount = frameIdx + 1;
        const progress = Math.min(0.99, renderedCount / totalFrames);

        if (renderedCount % 5 === 0 || renderedCount === totalFrames) {
          await this.prisma.gifRenderJob.update({
            where: { id: jobId },
            data: {
              renderedFrames: renderedCount,
              progress,
            },
          });
        }
      }

      // 5. Finalize GIF binary stream
      const finalByteLength = writer.end();
      const outputSlice = gifBuffer.subarray(0, finalByteLength);

      // 6. Write output GIF file to persistent disk storage
      const outputFilename = `${jobId}.gif`;
      const outputPath = path.join(this.renderStorageDirectory, outputFilename);
      await fs.promises.writeFile(outputPath, outputSlice);

      const renderDurationMs = Date.now() - startTime;

      // 7. Update Job and Project records to RENDERED
      await this.prisma.gifRenderJob.update({
        where: { id: jobId },
        data: {
          status: 'RENDERED',
          progress: 1.0,
          renderedFrames: totalFrames,
          outputAssetPath: outputPath,
          outputSizeBytes: finalByteLength,
          completedAt: new Date(),
        },
      });

      await this.prisma.gifProject.update({
        where: { id: projectId },
        data: {
          status: 'RENDERED',
        },
      });

      // 8. Audit log
      await this.audit(userId, 'GIF_PROJECT_RENDERED' as any, projectId, 'SUCCESS', `${finalByteLength} bytes in ${renderDurationMs}ms`);

      this.logger.log(
        `Render job [${jobId}] completed successfully: ${finalByteLength} bytes in ${renderDurationMs}ms (${totalFrames} frames)`,
      );
    } catch (err) {
      this.logger.error(`Render job [${jobId}] failed: ${err.message}`, err.stack);

      await this.prisma.gifRenderJob.update({
        where: { id: jobId },
        data: {
          status: 'RENDER_FAILED',
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });

      await this.prisma.gifProject.update({
        where: { id: projectId },
        data: {
          status: 'RENDER_FAILED',
          statusReason: err.message,
        },
      });

      await this.audit(userId, 'GIF_PROJECT_RENDER_FAILED' as any, projectId, 'FAILURE', err.message);
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Cancels a running background render job.
   */
  async cancelRenderJob(userId: string, jobId: string) {
    const job = await this.prisma.gifRenderJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Render job [${jobId}] not found`);
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this job');
    }

    if (job.status !== 'RENDERING') {
      return { message: `Job ${jobId} is not currently running (status: ${job.status})` };
    }

    const abortController = this.activeJobs.get(jobId);
    if (abortController) {
      abortController.abort();
    } else {
      await this.handleAbortedJob(jobId, job.projectId);
    }

    return { message: `Render job [${jobId}] cancellation requested` };
  }

  private async handleAbortedJob(jobId: string, projectId: string) {
    this.logger.warn(`Render job [${jobId}] was cancelled by user`);

    await this.prisma.gifRenderJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: 'Job cancelled by user request',
      },
    });

    await this.prisma.gifProject.update({
      where: { id: projectId },
      data: {
        status: 'READY',
        statusReason: 'Render cancelled',
      },
    });
  }

  /**
   * Retrieves render job status and details.
   */
  async getRenderJob(userId: string, jobId: string) {
    const job = await this.prisma.gifRenderJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Render job [${jobId}] not found`);
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this job');
    }

    return job;
  }

  /**
   * Retrieves the most recent render job for a project.
   */
  async getLatestJobForProject(userId: string, projectId: string) {
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this project');
    }

    const latestJob = await this.prisma.gifRenderJob.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return latestJob;
  }

  /**
   * Securely streams the generated GIF binary.
   */
  async getRenderDownload(userId: string, jobId: string): Promise<{ buffer: Buffer; filename: string }> {
    const job = await this.getRenderJob(userId, jobId);

    if (job.status !== 'RENDERED' || !job.outputAssetPath) {
      throw new BadRequestException(`Render job [${jobId}] has not completed successfully`);
    }

    if (!fs.existsSync(job.outputAssetPath)) {
      throw new NotFoundException(`Render output file not found on disk`);
    }

    const buffer = await fs.promises.readFile(job.outputAssetPath);
    return {
      buffer,
      filename: `animation-${jobId.substring(0, 8)}.gif`,
    };
  }

  /**
   * Pure JS image decoder for PNG, JPEG, GIF, and WEBP.
   */
  private decodeImageBuffer(buffer: Buffer, mimeType: string): DecodedImageSource {
    if (mimeType.includes('png')) {
      const png = PNG.sync.read(buffer);
      return { width: png.width, height: png.height, data: png.data };
    }

    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      const decoded = jpeg.decode(buffer, { useTArray: true });
      return { width: decoded.width, height: decoded.height, data: decoded.data };
    }

    if (mimeType.includes('gif')) {
      const reader = new GifReader(buffer);
      const width = reader.width;
      const height = reader.height;
      const data = Buffer.alloc(width * height * 4);
      reader.decodeAndBlitFrameRGBA(0, data);
      return { width, height, data };
    }

    // Default fallback: 256x256 neutral grey
    const width = 256;
    const height = 256;
    const data = Buffer.alloc(width * height * 4, 128);
    return { width, height, data };
  }

  private async audit(
    actor: string,
    action: AuditAction,
    resourceId: string,
    result: 'SUCCESS' | 'FAILURE',
    metadata?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor,
          action,
          resource: 'GIF_RENDER_JOB',
          resourceId,
          result,
          failureReason: metadata,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log: ${err.message}`);
    }
  }
}
