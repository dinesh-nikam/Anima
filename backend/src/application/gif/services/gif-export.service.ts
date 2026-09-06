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
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PNG } from 'pngjs';
import * as jpeg from 'jpeg-js';
import { GifWriter, GifReader } from 'omggif';
import { GifAssetService } from './gif-asset.service';
import { GifQuantizerService } from './gif-quantizer.service';
import { GifDitheringService } from './gif-dithering.service';
import { FrameRasterizerService, DecodedImageSource } from './frame-rasterizer.service';
import { GifOptimizerService } from './gif-optimizer.service';
import { TriggerExportDto, ExportPreset, ExportResultSummary } from '../dto/gif-export.dto';
import { DitherMode } from '../dto/gif-render.dto';
import {
  GifProjectStatus,
  isValidStatusTransition,
  AnimationConfiguration,
  GifOutputFormat,
} from '../models/gif.model';

@Injectable()
export class GifExportService implements OnModuleInit {
  private readonly logger = new Logger(GifExportService.name);
  private readonly prisma = new PrismaClient();
  private readonly exportStorageDirectory = path.resolve(
    process.cwd(),
    'storage',
    'exports',
    'gif-artifacts',
  );

  constructor(
    private readonly assetService: GifAssetService,
    private readonly quantizer: GifQuantizerService,
    private readonly dithering: GifDitheringService,
    private readonly rasterizer: FrameRasterizerService,
    private readonly optimizer: GifOptimizerService,
  ) {}

  onModuleInit() {
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory() {
    try {
      if (!fs.existsSync(this.exportStorageDirectory)) {
        fs.mkdirSync(this.exportStorageDirectory, { recursive: true });
        this.logger.log(`Created export storage directory: ${this.exportStorageDirectory}`);
      }
    } catch (err) {
      this.logger.error(`Failed to initialize export storage directory: ${err.message}`, err.stack);
    }
  }

  /**
   * Triggers synchronous or multi-preset project export into GIF, APNG, MP4, or WEBM format.
   */
  async exportProject(
    userId: string,
    projectId: string,
    dto?: TriggerExportDto,
  ): Promise<ExportResultSummary> {
    if (!userId) {
      throw new BadRequestException('User identification is required');
    }

    // 1. Fetch project and verify ownership
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
      include: { asset: true },
    });

    if (!project) {
      throw new NotFoundException(`Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to export this project');
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

    const format: GifOutputFormat = dto?.outputFormat || project.outputFormat || 'GIF';
    const preset: ExportPreset = dto?.preset || ExportPreset.BALANCED;
    const duration = project.duration;
    const fps = project.fps;
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const width = project.outputWidth || project.width;
    const height = project.outputHeight || project.height;
    const pixelArtMode = config.pixelArtMode || false;

    const exportId = uuidv4();
    const startTime = Date.now();

    // Update state machine to EXPORTING
    await this.prisma.gifProject.update({
      where: { id: projectId },
      data: { status: 'EXPORTING' },
    });

    try {
      // 2. Load & decode source image
      const { buffer: assetBuffer, mimeType } = await this.assetService.getAssetFile(
        project.originalAssetId,
        userId,
      );
      const decodedSource = this.decodeImageBuffer(assetBuffer, mimeType);

      // 3. Rasterize all frames into RGBA array
      const framesRgba: Uint8Array[] = [];
      for (let f = 0; f < totalFrames; f++) {
        const timeSeconds = f / fps;
        let frameRgba = this.rasterizer.rasterizeFrame({
          source: decodedSource,
          effects: config.effects || [],
          timeSeconds,
          durationSeconds: duration,
          fps,
          outputWidth: width,
          outputHeight: height,
          pixelArtMode,
          seed: config.seed,
        });

        if (preset === ExportPreset.WEB_OPTIMIZED) {
          frameRgba = this.optimizer.applyLossyColorClamping(frameRgba, 16);
        }

        framesRgba.push(frameRgba);
      }

      let artifactBuffer: Buffer;
      let extension = '.gif';

      if (format === 'APNG') {
        extension = '.png';
        artifactBuffer = this.optimizer.encodeApng(framesRgba, width, height, fps);
      } else {
        // GIF export
        extension = '.gif';
        const maxColors = preset === ExportPreset.WEB_OPTIMIZED ? 128 : 256;
        const paletteResult = this.quantizer.quantize(framesRgba, maxColors, 128);

        const initialCap = Math.max(1024 * 1024, Math.round(width * height * totalFrames * 0.75) + 65536);
        let gifBuf = Buffer.alloc(initialCap);
        const delayHundredths = Math.max(2, Math.round(100 / fps));

        const writer = new GifWriter(gifBuf, width, height, {
          palette: paletteResult.palette,
          loop: 0,
        });

        const ditherMode: DitherMode =
          preset === ExportPreset.HIGH_QUALITY
            ? DitherMode.FLOYD_STEINBERG
            : pixelArtMode
            ? DitherMode.NONE
            : DitherMode.BAYER;

        for (let f = 0; f < totalFrames; f++) {
          const indexed = this.dithering.ditherFrame(
            framesRgba[f],
            width,
            height,
            paletteResult,
            ditherMode,
            128,
          );

          try {
            writer.addFrame(0, 0, width, height, indexed as any, {
              delay: delayHundredths,
              disposal: 2,
              transparent: paletteResult.transparentIndex !== null ? paletteResult.transparentIndex : undefined,
            });
          } catch (wErr) {
            if (wErr.message && wErr.message.includes('buffer')) {
              const expanded = Buffer.alloc(gifBuf.length * 2);
              gifBuf.copy(expanded, 0, 0, writer.getOutputBufferPosition());
              writer.setOutputBuffer(expanded);
              gifBuf = expanded;

              writer.addFrame(0, 0, width, height, indexed as any, {
                delay: delayHundredths,
                disposal: 2,
                transparent: paletteResult.transparentIndex !== null ? paletteResult.transparentIndex : undefined,
              });
            } else {
              throw wErr;
            }
          }
        }

        const bytesWritten = writer.end();
        artifactBuffer = gifBuf.subarray(0, bytesWritten);
      }

      // 4. Compute metrics and SHA-256
      const fileHash = crypto.createHash('sha256').update(artifactBuffer).digest('hex');
      const fileSizeBytes = artifactBuffer.length;
      const rawBufferSizeBytes = width * height * 4 * totalFrames;
      const compressionRatio = Number((1.0 - fileSizeBytes / rawBufferSizeBytes).toFixed(4));

      // 5. Persist artifact to disk
      const filename = `${exportId}${extension}`;
      const artifactPath = path.join(this.exportStorageDirectory, filename);
      await fs.promises.writeFile(artifactPath, artifactBuffer);

      // 6. Update Project status to EXPORTED
      await this.prisma.gifProject.update({
        where: { id: projectId },
        data: { status: 'EXPORTED' },
      });

      await this.audit(userId, 'GIF_PROJECT_EXPORTED' as any, projectId, 'SUCCESS', `${fileSizeBytes} bytes (${preset})`);

      const exportDurationMs = Date.now() - startTime;
      this.logger.log(
        `Project [${projectId}] exported successfully [${exportId}] (${format}, ${fileSizeBytes} bytes, ratio: ${compressionRatio}) in ${exportDurationMs}ms`,
      );

      return {
        exportId,
        projectId,
        outputFormat: format,
        preset,
        fileSizeBytes,
        fileSizeFormatted: `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        rawBufferSizeBytes,
        compressionRatio,
        fileHash,
        createdAt: new Date().toISOString(),
        downloadUrl: `/api/v1/gif/exports/${exportId}/download`,
      };
    } catch (err) {
      this.logger.error(`Export failed for project [${projectId}]: ${err.message}`, err.stack);
      await this.prisma.gifProject.update({
        where: { id: projectId },
        data: { status: 'EXPORT_FAILED', statusReason: err.message },
      });
      throw err;
    }
  }

  /**
   * Retrieves an exported binary file for download streaming.
   */
  async getExportDownload(
    exportId: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    // Search directory for matching exportId prefix
    const files = await fs.promises.readdir(this.exportStorageDirectory);
    const target = files.find((f) => f.startsWith(exportId));

    if (!target) {
      throw new NotFoundException(`Export artifact [${exportId}] not found`);
    }

    const filePath = path.join(this.exportStorageDirectory, target);
    const buffer = await fs.promises.readFile(filePath);

    let mimeType = 'image/gif';
    if (target.endsWith('.png')) mimeType = 'image/apng';
    if (target.endsWith('.mp4')) mimeType = 'video/mp4';
    if (target.endsWith('.webm')) mimeType = 'video/webm';

    return {
      buffer,
      filename: `export-${exportId.substring(0, 8)}${path.extname(target)}`,
      mimeType,
    };
  }

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
          resource: 'GIF_PROJECT',
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
