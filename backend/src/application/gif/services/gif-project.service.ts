import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient, AuditAction } from '@prisma/client';
import { GifAssetService } from './gif-asset.service';
import { ImageAnalyzerService, ImageAnalysisPayload } from './image-analyzer.service';
import { RandomizationEngineService } from './randomization-engine.service';
import { RandomizeProjectDto } from '../dto/gif-randomize.dto';
import {
  CreateGifProjectDto,
  UpdateGifProjectDto,
  QueryGifProjectsDto,
} from '../dto/gif-project.dto';
import {
  GifProjectStatus,
  isValidStatusTransition,
  GIF_RESOURCE_LIMITS,
  RENDERER_VERSION,
  EFFECT_ENGINE_VERSION,
  AnimationConfiguration,
} from '../models/gif.model';

@Injectable()
export class GifProjectService {
  private readonly logger = new Logger(GifProjectService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly assetService: GifAssetService,
    private readonly analyzerService: ImageAnalyzerService,
    private readonly randomizationEngine: RandomizationEngineService,
  ) {}

  /**
   * Creates a new GIF Animation Studio project from an existing verified asset.
   */
  async createProject(userId: string, dto: CreateGifProjectDto) {
    if (!userId) {
      throw new BadRequestException('User identification required');
    }

    // 1. Verify and retrieve asset with ownership validation
    const asset = await this.assetService.getAssetById(dto.assetId, userId);

    // 2. Compute deterministic seed
    const randomSeed = dto.seed !== undefined
      ? BigInt(dto.seed)
      : BigInt(Math.floor(Math.random() * 900000) + 100000);

    const duration = dto.duration || GIF_RESOURCE_LIMITS.DEFAULT_DURATION_SECONDS;
    const fps = dto.fps || GIF_RESOURCE_LIMITS.DEFAULT_FPS;

    // 3. Default output dimensions (cap default export dimension to 1024 max for resource efficiency)
    let outputWidth = dto.outputWidth || asset.width;
    let outputHeight = dto.outputHeight || asset.height;

    const maxDefaultDim = 1024;
    if (!dto.outputWidth && !dto.outputHeight && (outputWidth > maxDefaultDim || outputHeight > maxDefaultDim)) {
      if (outputWidth >= outputHeight) {
        outputHeight = Math.round((outputHeight * maxDefaultDim) / outputWidth);
        outputWidth = maxDefaultDim;
      } else {
        outputWidth = Math.round((outputWidth * maxDefaultDim) / outputHeight);
        outputHeight = maxDefaultDim;
      }
    }

    // 4. Construct initial deterministic animation configuration
    const initialConfig: AnimationConfiguration = {
      duration,
      fps,
      loopCount: 0,
      quality: 85,
      dithering: true,
      pixelArtMode: false,
      effects: [],
      seed: randomSeed.toString(),
      estimatedTotalFrames: Math.round(duration * fps),
    };

    const projectName = dto.name?.trim() || asset.originalFilename.replace(/\.[^/.]+$/, '') || 'New Animation';

    // 5. Persist project in database
    const project = await this.prisma.gifProject.create({
      data: {
        userId,
        name: projectName,
        originalAssetId: asset.id,
        originalImageHash: asset.fileHash,
        width: asset.width,
        height: asset.height,
        format: asset.format,
        animationConfiguration: initialConfig as any,
        randomSeed,
        rendererVersion: RENDERER_VERSION,
        effectEngineVersion: EFFECT_ENGINE_VERSION,
        duration,
        fps,
        outputFormat: 'GIF',
        outputWidth,
        outputHeight,
        status: 'DRAFT',
        metadata: {
          assetOriginalFilename: asset.originalFilename,
          assetMimeType: asset.mimeType,
          assetFileSize: asset.fileSizeBytes,
        },
      },
      include: {
        asset: true,
      },
    });

    // 6. Save initial Version 1 snapshot
    await this.prisma.gifProjectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: 1,
        animationConfiguration: initialConfig as any,
        randomSeed,
        duration,
        fps,
      },
    });

    // 7. Audit log
    await this.audit(userId, 'GIF_PROJECT_CREATED', project.id, 'SUCCESS');

    this.logger.log(`Created GIF project [${project.id}] "${projectName}" for user [${userId}]`);
    return this.serializeProject(project);
  }

  /**
   * Retrieves project by ID with tenant isolation check.
   */
  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
      include: {
        asset: true,
        _count: {
          select: { versions: true, renderJobs: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`GIF Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException(`Access denied to project [${projectId}]`);
    }

    return this.serializeProject(project);
  }

  /**
   * Updates project configuration, status, or parameters.
   */
  async updateProject(userId: string, projectId: string, dto: UpdateGifProjectDto) {
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`GIF Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException(`Access denied to project [${projectId}]`);
    }

    // 1. Explicit State Machine Transition Verification
    if (dto.status && dto.status !== project.status) {
      if (!isValidStatusTransition(project.status as GifProjectStatus, dto.status)) {
        throw new ConflictException(
          `Invalid state transition: Cannot change project status from '${project.status}' to '${dto.status}'`,
        );
      }
    }

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.fps !== undefined) updateData.fps = dto.fps;
    if (dto.outputWidth !== undefined) updateData.outputWidth = dto.outputWidth;
    if (dto.outputHeight !== undefined) updateData.outputHeight = dto.outputHeight;
    if (dto.randomSeed !== undefined) updateData.randomSeed = BigInt(dto.randomSeed);
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      updateData.statusReason = dto.statusReason || null;
    }

    let configUpdated = false;
    if (dto.animationConfiguration) {
      updateData.animationConfiguration = dto.animationConfiguration;
      configUpdated = true;
    }

    // 2. Perform update
    const updated = await this.prisma.gifProject.update({
      where: { id: projectId },
      data: updateData,
      include: {
        asset: true,
      },
    });

    // 3. If configuration or seed changed, save new Version snapshot
    if (configUpdated || dto.randomSeed !== undefined || dto.duration !== undefined || dto.fps !== undefined) {
      const latestVersion = await this.prisma.gifProjectVersion.findFirst({
        where: { projectId },
        orderBy: { versionNumber: 'desc' },
      });

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      await this.prisma.gifProjectVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          animationConfiguration: updated.animationConfiguration as any,
          randomSeed: updated.randomSeed,
          duration: updated.duration,
          fps: updated.fps,
        },
      });

      await this.audit(userId, 'GIF_PROJECT_VERSION_SAVED', projectId, 'SUCCESS', `v${nextVersionNumber}`);
    }

    if (dto.status && dto.status !== project.status) {
      await this.audit(
        userId,
        'GIF_PROJECT_STATUS_CHANGED',
        projectId,
        'SUCCESS',
        `${project.status} -> ${dto.status}`,
      );
    } else {
      await this.audit(userId, 'GIF_PROJECT_UPDATED', projectId, 'SUCCESS');
    }

    return this.serializeProject(updated);
  }

  /**
   * Explicit status transition endpoint.
   */
  async transitionStatus(
    userId: string,
    projectId: string,
    targetStatus: GifProjectStatus,
    reason?: string,
  ) {
    return this.updateProject(userId, projectId, {
      status: targetStatus,
      statusReason: reason,
    });
  }

  /**
   * Lists projects with pagination, sorting, and optional status filtering.
   */
  async listProjects(userId: string, query: QueryGifProjectsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.gifProject.count({ where }),
      this.prisma.gifProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          asset: true,
        },
      }),
    ]);

    return {
      items: items.map((p) => this.serializeProject(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Deletes a project and its associated version history.
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`GIF Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException(`Access denied to delete project [${projectId}]`);
    }

    await this.prisma.gifProject.delete({
      where: { id: projectId },
    });

    await this.audit(userId, 'GIF_PROJECT_DELETED', projectId, 'SUCCESS');
    this.logger.log(`Deleted project [${projectId}] for user [${userId}]`);
  }

  /**
   * Retrieves version history for a project.
   */
  async getProjectVersions(userId: string, projectId: string) {
    // Validate project ownership first
    await this.getProject(userId, projectId);

    const versions = await this.prisma.gifProjectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map((v) => ({
      ...v,
      randomSeed: v.randomSeed.toString(),
    }));
  }

  /**
   * Executes deep algorithmic image analysis on project's source asset.
   * Advances state: DRAFT -> ANALYZING -> READY (or ANALYSIS_FAILED on error).
   */
  async analyzeProject(userId: string, projectId: string) {
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
      include: { asset: true },
    });

    if (!project) {
      throw new NotFoundException(`GIF Project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException(`Access denied to project [${projectId}]`);
    }

    // Advance state to ANALYZING
    await this.prisma.gifProject.update({
      where: { id: projectId },
      data: {
        status: 'ANALYZING',
        statusReason: 'Algorithmic computer vision analysis in progress',
      },
    });

    try {
      // Fetch physical file buffer
      const { buffer } = await this.assetService.getAssetFile(project.originalAssetId, userId);

      // Run computer vision analysis
      const analysis: ImageAnalysisPayload = await this.analyzerService.analyze(
        buffer,
        project.format as any,
      );

      // Persist analysis result in database (upsert)
      const persistedAnalysis = await this.prisma.gifAnalysisResult.upsert({
        where: { projectId },
        update: {
          width: analysis.width,
          height: analysis.height,
          aspectRatio: analysis.aspectRatio,
          hasAlpha: analysis.hasAlpha,
          alphaCoverage: analysis.alphaCoverage,
          brightness: analysis.brightness,
          contrast: analysis.contrast,
          edgeDensity: analysis.edgeDensity,
          complexity: analysis.complexity,
          darkSceneConfidence: analysis.darkScene.confidence,
          pixelArtConfidence: analysis.pixelArt.confidence,
          photographicConfidence: analysis.photographic.confidence,
          flatAreaRatio: analysis.flatAreaRatio,
          dominantColors: analysis.dominantColors as any,
          uniqueColorCount: analysis.uniqueColorCount,
          features: analysis as any,
          segmentationStatus: analysis.semanticObjects.status,
          characterDetectionStatus: analysis.characters.status,
          analyzerVersion: analysis.analyzerVersion,
          analysisDurationMs: analysis.analysisDurationMs,
        },
        create: {
          projectId,
          assetId: project.originalAssetId,
          width: analysis.width,
          height: analysis.height,
          aspectRatio: analysis.aspectRatio,
          hasAlpha: analysis.hasAlpha,
          alphaCoverage: analysis.alphaCoverage,
          brightness: analysis.brightness,
          contrast: analysis.contrast,
          edgeDensity: analysis.edgeDensity,
          complexity: analysis.complexity,
          darkSceneConfidence: analysis.darkScene.confidence,
          pixelArtConfidence: analysis.pixelArt.confidence,
          photographicConfidence: analysis.photographic.confidence,
          flatAreaRatio: analysis.flatAreaRatio,
          dominantColors: analysis.dominantColors as any,
          uniqueColorCount: analysis.uniqueColorCount,
          features: analysis as any,
          segmentationStatus: analysis.semanticObjects.status,
          characterDetectionStatus: analysis.characters.status,
          analyzerVersion: analysis.analyzerVersion,
          analysisDurationMs: analysis.analysisDurationMs,
        },
      });

      // Update project configuration: if pixel art detected with high confidence, enable pixelArtMode
      const currentConfig = (project.animationConfiguration as any) || {};
      const shouldEnablePixelArt = analysis.pixelArt.detected && analysis.pixelArt.confidence >= 0.70;

      const updatedConfig = {
        ...currentConfig,
        pixelArtMode: shouldEnablePixelArt || Boolean(currentConfig.pixelArtMode),
      };

      const updatedProject = await this.prisma.gifProject.update({
        where: { id: projectId },
        data: {
          status: 'READY',
          statusReason: 'Image analysis completed successfully',
          animationConfiguration: updatedConfig,
          metadata: {
            ...((project.metadata as any) || {}),
            analysisSummary: {
              brightness: analysis.brightness,
              contrast: analysis.contrast,
              isPixelArt: analysis.pixelArt.detected,
              isDarkScene: analysis.darkScene.detected,
              dominantColors: analysis.dominantColors.slice(0, 3).map((c) => c.hex),
              durationMs: analysis.analysisDurationMs,
            },
          },
        },
        include: { asset: true, analysisResult: true },
      });

      await this.audit(userId, 'GIF_IMAGE_ANALYZED' as AuditAction, projectId, 'SUCCESS');
      this.logger.log(`Analysis complete for project [${projectId}] in ${analysis.analysisDurationMs}ms`);

      return {
        project: this.serializeProject(updatedProject),
        analysis,
      };
    } catch (err) {
      this.logger.error(`Analysis failed for project [${projectId}]: ${err.message}`, err.stack);

      await this.prisma.gifProject.update({
        where: { id: projectId },
        data: {
          status: 'ANALYSIS_FAILED',
          statusReason: `Analysis error: ${err.message}`,
        },
      });

      await this.audit(userId, 'GIF_IMAGE_ANALYZED' as AuditAction, projectId, 'FAILURE', err.message);
      throw err;
    }
  }

  /**
   * Retrieves stored analysis results for a project.
   */
  async getProjectAnalysis(userId: string, projectId: string) {
    await this.getProject(userId, projectId); // ownership check

    const analysis = await this.prisma.gifAnalysisResult.findUnique({
      where: { projectId },
    });

    if (!analysis) {
      throw new NotFoundException(`No analysis results found for project [${projectId}]`);
    }

    return analysis;
  }

  /**
   * Generates a randomized animation configuration for a project using its analysis, profile, and seed.
   * Preserves locked effects, updates the project configuration, creates a new version snapshot, and records an audit log.
   */
  async randomizeProject(
    userId: string,
    projectId: string,
    dto: RandomizeProjectDto = {},
  ) {
    // 1. Verify project access
    const project = await this.prisma.gifProject.findUnique({
      where: { id: projectId },
      include: { analysisResult: true },
    });

    if (!project) {
      throw new NotFoundException(`GIF project [${projectId}] not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this project');
    }

    // 2. Extract existing locked effects if preserveLocked is requested
    const currentConfig = (project.animationConfiguration as any) || {};
    const existingEffects = Array.isArray(currentConfig.effects) ? currentConfig.effects : [];

    // 3. Run Randomization Engine
    const randomizeResult = this.randomizationEngine.generateRandomConfiguration(
      project.analysisResult || undefined,
      {
        seed: dto.seed,
        profile: dto.profile,
        preserveLocked: dto.preserveLocked ?? true,
        targetEffectCount: dto.targetEffectCount,
        duration: dto.duration,
        fps: dto.fps,
        lockedEffects: existingEffects,
      },
    );

    const randomSeedBigInt = BigInt(randomizeResult.seed);

    // 4. Update project in database
    const updated = await this.prisma.gifProject.update({
      where: { id: projectId },
      data: {
        animationConfiguration: randomizeResult.configuration as any,
        randomSeed: randomSeedBigInt,
        duration: randomizeResult.configuration.duration,
        fps: randomizeResult.configuration.fps,
        status: project.status === 'DRAFT' ? 'READY' : project.status,
      },
      include: {
        asset: true,
        analysisResult: true,
      },
    });

    // 5. Append new version snapshot
    const latestVersion = await this.prisma.gifProjectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    await this.prisma.gifProjectVersion.create({
      data: {
        projectId,
        versionNumber: nextVersionNumber,
        animationConfiguration: randomizeResult.configuration as any,
        randomSeed: randomSeedBigInt,
        duration: randomizeResult.configuration.duration,
        fps: randomizeResult.configuration.fps,
      },
    });

    // 6. Record Audit Log
    await this.audit(userId, 'GIF_PROJECT_RANDOMIZED' as any, projectId, 'SUCCESS');

    this.logger.log(
      `Project [${projectId}] randomized with seed [${randomizeResult.seed}] (${randomizeResult.selectedEffectCount} effects, profile: ${randomizeResult.profile})`,
    );

    return {
      project: this.serializeProject(updated),
      randomizeResult,
    };
  }

  /**
   * Serializes BigInt and date fields for clean JSON delivery.
   */
  private serializeProject(project: any) {
    if (!project) return null;
    return {
      ...project,
      randomSeed: project.randomSeed ? project.randomSeed.toString() : '0',
    };
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
      this.logger.warn(`Failed to record audit log: ${err.message}`);
    }
  }
}
