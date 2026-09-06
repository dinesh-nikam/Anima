import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../security/auth.guard';
import { GifAssetService } from '../../application/gif/services/gif-asset.service';
import { GifProjectService } from '../../application/gif/services/gif-project.service';
import { EffectRegistryService } from '../../application/gif/registry/effect-registry.service';
import { AnimationEngineService } from '../../application/gif/services/animation-engine.service';
import { RandomizationEngineService } from '../../application/gif/services/randomization-engine.service';
import { EffectCategory } from '../../application/gif/effects/effect.contract';
import { EstimateBudgetDto } from '../../application/gif/dto/gif-engine.dto';
import {
  RandomizeProjectDto,
  StatelessRandomizeDto,
} from '../../application/gif/dto/gif-randomize.dto';
import { TriggerRenderDto } from '../../application/gif/dto/gif-render.dto';
import { GifRenderingService } from '../../application/gif/services/gif-rendering.service';
import { TriggerExportDto } from '../../application/gif/dto/gif-export.dto';
import { GifExportService } from '../../application/gif/services/gif-export.service';
import {
  CreateGifProjectDto,
  UpdateGifProjectDto,
  QueryGifProjectsDto,
  TransitionProjectStatusDto,
} from '../../application/gif/dto/gif-project.dto';

import { SecuritySanitizerService } from '../../application/gif/services/security-sanitizer.service';
import { GifGuardrailsService } from '../../application/gif/services/gif-guardrails.service';
import { RateLimitGuard, RateLimit } from '../../application/gif/guards/rate-limit.guard';
import { GifMetricsService } from '../../application/gif/services/gif-metrics.service';
import { GifAuditInterceptor } from '../../application/gif/interceptors/gif-audit.interceptor';

import { ForensicAuditService } from '../../application/gif/services/forensic-audit.service';

interface MulterUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller('gif')
@UseGuards(AuthGuard, RateLimitGuard)
@UseInterceptors(GifAuditInterceptor)
export class GifController {
  constructor(
    private readonly assetService: GifAssetService,
    private readonly projectService: GifProjectService,
    private readonly effectRegistry: EffectRegistryService,
    private readonly animationEngine: AnimationEngineService,
    private readonly randomizationEngine: RandomizationEngineService,
    private readonly renderingService: GifRenderingService,
    private readonly exportService: GifExportService,
    private readonly sanitizer: SecuritySanitizerService,
    private readonly guardrails: GifGuardrailsService,
    private readonly metrics: GifMetricsService,
    private readonly forensicAudit: ForensicAuditService,
  ) {}

  // ==========================================================================
  // Asset Endpoints
  // ==========================================================================

  /**
   * Uploads an image asset with deep binary inspection and deduplication.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Req() req: Request,
    @UploadedFile() file: MulterUploadedFile,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided. Form field name must be "file"');
    }

    const userId = req['user']?.id;
    return this.assetService.processAndStoreUpload(userId, file.buffer, file.originalname);
  }

  /**
   * Securely streams an uploaded asset binary.
   */
  @Get('assets/:id')
  async getAssetFile(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const userId = req['user']?.id;
    const { buffer, mimeType, filename } = await this.assetService.getAssetFile(id, userId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

    return res.status(HttpStatus.OK).send(buffer);
  }

  // ==========================================================================
  // Project Lifecycle Endpoints
  // ==========================================================================

  /**
   * Creates a new animation project from an asset.
   */
  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  async createProject(
    @Req() req: Request,
    @Body() dto: CreateGifProjectDto,
  ) {
    const userId = req['user']?.id;
    return this.projectService.createProject(userId, dto);
  }

  /**
   * Lists projects with pagination and status filtering.
   */
  @Get('projects')
  async listProjects(
    @Req() req: Request,
    @Query() query: QueryGifProjectsDto,
  ) {
    const userId = req['user']?.id;
    return this.projectService.listProjects(userId, query);
  }

  /**
   * Retrieves full project details.
   */
  @Get('projects/:id')
  async getProject(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = req['user']?.id;
    return this.projectService.getProject(userId, id);
  }

  /**
   * Updates project configuration, parameters, or status.
   */
  @Put('projects/:id')
  async updateProject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateGifProjectDto,
  ) {
    const userId = req['user']?.id;
    return this.projectService.updateProject(userId, id, dto);
  }

  /**
   * Triggers deep algorithmic image analysis on the project's source image.
   */
  @Post('projects/:id/analyze')
  async analyzeProject(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = req['user']?.id;
    return this.projectService.analyzeProject(userId, id);
  }

  /**
   * Retrieves stored analysis results for a project.
   */
  @Get('projects/:id/analysis')
  async getProjectAnalysis(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = req['user']?.id;
    return this.projectService.getProjectAnalysis(userId, id);
  }

  /**
   * Explicit status transition endpoint (enforces state machine).
   */
  @Post('projects/:id/status')
  async transitionStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: TransitionProjectStatusDto,
  ) {
    const userId = req['user']?.id;
    return this.projectService.transitionStatus(userId, id, dto.status, dto.reason);
  }

  /**
   * Deletes a project.
   */
  @Delete('projects/:id')
  async deleteProject(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = req['user']?.id;
    await this.projectService.deleteProject(userId, id);
    return { message: `Project ${id} deleted successfully` };
  }

  /**
   * Retrieves historical version snapshots for a project.
   */
  @Get('projects/:id/versions')
  async getProjectVersions(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = req['user']?.id;
    return this.projectService.getProjectVersions(userId, id);
  }

  // ==========================================================================
  // Effect Registry & Animation Engine Endpoints
  // ==========================================================================

  /**
   * Retrieves all available animation effects in the registry, optionally filtered by category.
   */
  @Get('effects')
  async listEffects(@Query('category') category?: EffectCategory) {
    return this.effectRegistry.getMetadataList(category);
  }

  /**
   * Retrieves metadata for a specific animation effect.
   */
  @Get('effects/:id')
  async getEffect(@Param('id') id: string) {
    return this.effectRegistry.getMetadataById(id);
  }

  /**
   * Validates compatibility between a list of effect IDs.
   */
  @Post('effects/validate')
  async validateEffects(@Body('effectIds') effectIds: string[]) {
    if (!Array.isArray(effectIds)) {
      throw new BadRequestException('effectIds must be an array of effect ID strings');
    }
    return this.effectRegistry.validateCompatibility(effectIds);
  }

  /**
   * Estimates render frame count, uncompressed buffer footprint, output size, and latency.
   */
  @Post('estimate')
  async estimateBudget(@Body() dto: EstimateBudgetDto) {
    return this.animationEngine.estimateBudget(dto);
  }

  // ==========================================================================
  // Randomization Engine Endpoints (Phase 4)
  // ==========================================================================

  /**
   * Generates randomized animation effects for a project using its analysis, profile, and seed.
   * Preserves locked effects and records a project version snapshot.
   */
  @Post('projects/:id/randomize')
  async randomizeProject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: RandomizeProjectDto,
  ) {
    const userId = req['user']?.id;
    return this.projectService.randomizeProject(userId, id, dto);
  }

  /**
   * Stateless preview randomization endpoint for instant UI exploration.
   */
  @Post('randomize')
  async statelessRandomize(@Body() dto: StatelessRandomizeDto) {
    return this.randomizationEngine.generateRandomConfiguration(dto.analysis, {
      seed: dto.seed,
      profile: dto.profile,
      targetEffectCount: dto.targetEffectCount,
      duration: dto.duration,
      fps: dto.fps,
      lockedEffects: dto.lockedEffects,
    });
  }

  // ==========================================================================
  // Background Rendering & GIF Export Endpoints (Phase 6)
  // ==========================================================================

  /**
   * Triggers background asynchronous rendering for a GIF project.
   */
  @Post('projects/:id/render')
  async triggerRender(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: TriggerRenderDto,
  ) {
    const userId = req['user']?.id;
    return this.renderingService.startRenderJob(userId, id, dto);
  }

  /**
   * Retrieves the status of the latest render job for a project.
   */
  @Get('projects/:id/render-status')
  async getProjectRenderStatus(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const userId = req['user']?.id;
    return this.renderingService.getLatestJobForProject(userId, id);
  }

  /**
   * Retrieves status for a specific render job.
   */
  @Get('render-jobs/:jobId')
  async getRenderJob(
    @Req() req: Request,
    @Param('jobId') jobId: string,
  ) {
    const userId = req['user']?.id;
    return this.renderingService.getRenderJob(userId, jobId);
  }

  /**
   * Cancels an in-progress background render job.
   */
  @Post('render-jobs/:jobId/cancel')
  async cancelRenderJob(
    @Req() req: Request,
    @Param('jobId') jobId: string,
  ) {
    const userId = req['user']?.id;
    return this.renderingService.cancelRenderJob(userId, jobId);
  }

  /**
   * Streams the rendered GIF file for direct inline display or download.
   */
  @Get('render-jobs/:jobId/download')
  async downloadRenderedGif(
    @Req() req: Request,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const userId = req['user']?.id;
    const { buffer, filename } = await this.renderingService.getRenderDownload(userId, jobId);

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(HttpStatus.OK).send(buffer);
  }

  // ==========================================================================
  // Multi-Format Export & Optimization Endpoints (Phase 8)
  // ==========================================================================

  /**
   * Triggers multi-format optimized export (GIF, APNG, MP4, WEBM).
   */
  @Post('projects/:id/export')
  async triggerExport(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: TriggerExportDto,
  ) {
    const userId = req['user']?.id;
    return this.exportService.exportProject(userId, id, dto);
  }

  /**
   * Streams or downloads an exported artifact binary.
   */
  @Get('exports/:exportId/download')
  async downloadExportArtifact(
    @Param('exportId') exportId: string,
    @Res() res: Response,
  ) {
    const cleanId = this.sanitizer.validateId(exportId, 'Export');
    const { buffer, filename, mimeType } = await this.exportService.getExportDownload(cleanId);

    const safeFilename = this.sanitizer.sanitizeFilename(filename);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    return res.status(HttpStatus.OK).send(buffer);
  }

  // ==========================================================================
  // Observability & Telemetry Endpoints (Phase 9)
  // ==========================================================================

  /**
   * Returns application health status and node heap memory utilization.
   */
  @Get('health')
  getHealthStatus() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      system: this.guardrails.getSystemHealth(),
    };
  }

  /**
   * Returns observability metrics in JSON or Prometheus text format.
   */
  @Get('metrics')
  getSystemMetrics(
    @Query('format') format?: string,
    @Res() res?: Response,
  ) {
    if (format === 'prometheus' && res) {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return res.status(HttpStatus.OK).send(this.metrics.getPrometheusFormat());
    }

    const snapshot = this.metrics.getSnapshot();
    if (res) {
      return res.status(HttpStatus.OK).json(snapshot);
    }
    return snapshot;
  }

  /**
   * Triggers full-system forensic diagnostic audit across all 35 effects, quantizers, security, and telemetry.
   */
  @Get('audit')
  async runAuditDiagnostic() {
    return this.forensicAudit.runForensicAudit();
  }
}


