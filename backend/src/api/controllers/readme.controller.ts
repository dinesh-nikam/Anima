import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '../../security/auth.guard';
import { ReadmeDraftService } from '../../application/readme/readme-draft.service';
import { ReadmePublicationService } from '../../application/readme/services/readme-publication.service';
import { ReadmeComponentRegistry } from '../../application/readme/registry/component-registry.service';
import { ThemeRegistry } from '../../application/readme/themes/theme.registry';
import { TemplateRegistry } from '../../application/readme/templates/template.registry';
import { ProviderRegistry, ProviderCategory } from '../../application/readme/providers/provider.registry';
import {
  CreateDraftDto,
  UpdateDraftDto,
  AddSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  ApplyTemplateDto,
  PreviewDraftPayloadDto,
} from '../../application/readme/dto/readme-draft.dto';
import {
  CreatePublishPreviewDto,
  ConfirmPublishDto,
} from '../../application/readme/dto/readme-publish.dto';

@Controller('readme')
export class ReadmeController {
  constructor(
    private readonly draftService: ReadmeDraftService,
    private readonly publicationService: ReadmePublicationService,
    private readonly componentRegistry: ReadmeComponentRegistry,
    private readonly themeRegistry: ThemeRegistry,
    private readonly templateRegistry: TemplateRegistry,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  // ==========================================================================
  // Catalog Endpoints (Public / Read-only)
  // ==========================================================================

  @Get('providers')
  getProviders(
    @Query('category') category?: ProviderCategory,
    @Query('component') component?: string,
    @Query('includeDisabled') includeDisabled?: string,
  ) {
    const showAll = includeDisabled === 'true';
    if (category) {
      return this.providerRegistry.listByCategory(category, showAll);
    }
    if (component) {
      return this.providerRegistry.listByComponent(component, showAll);
    }
    return this.providerRegistry.list(showAll);
  }

  @Get('providers/:key')
  getProviderByKey(@Param('key') key: string) {
    const p = this.providerRegistry.getByKey(key);
    if (!p) throw new UnauthorizedException(`Provider not found: ${key}`);
    return p;
  }

  @Get('providers/:key/health')
  getProviderHealth(@Param('key') key: string) {
    return this.providerRegistry.getHealth(key);
  }

  @Put('admin/providers/:key')
  @UseGuards(AuthGuard)
  updateProviderStatus(
    @Req() req: any,
    @Param('key') key: string,
    @Body() body: { action: 'ENABLE' | 'DISABLE' | 'DEPRECATE' },
  ) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required to manage dynamic providers');
    }
    switch (body.action) {
      case 'ENABLE':
        return this.providerRegistry.enableProvider(key);
      case 'DISABLE':
        return this.providerRegistry.disableProvider(key);
      case 'DEPRECATE':
        return this.providerRegistry.deprecateProvider(key);
      default:
        throw new ForbiddenException(`Invalid action: ${(body as any).action}`);
    }
  }

  @Post('admin/providers/:key/health-check')
  @UseGuards(AuthGuard)
  async triggerProviderHealthCheck(@Req() req: any, @Param('key') key: string) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required to trigger health checks');
    }
    return this.providerRegistry.runHealthCheck(key, true);
  }

  @Get('components')
  getComponents() {
    return this.componentRegistry.getAvailableComponents();
  }

  @Get('components/:id')
  getComponentById(@Param('id') id: string) {
    return this.componentRegistry.getDefinition(id);
  }

  @Get('templates')
  getTemplates() {
    return this.templateRegistry.list();
  }

  @Get('templates/:key')
  getTemplateByKey(@Param('key') key: string) {
    return this.templateRegistry.getByKey(key);
  }

  @Get('themes')
  getThemes() {
    return this.themeRegistry.list();
  }

  @Get('themes/:key')
  getThemeByKey(@Param('key') key: string) {
    return this.themeRegistry.getByKey(key);
  }

  // ==========================================================================
  // Draft Management Endpoints (Authenticated)
  // ==========================================================================

  @Get('drafts')
  @UseGuards(AuthGuard)
  async listDrafts(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.listDrafts(userId);
  }

  @Post('drafts')
  @UseGuards(AuthGuard)
  async createDraft(@Req() req: any, @Body() dto: CreateDraftDto) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.createDraft(userId, dto);
  }

  @Get('drafts/:id')
  @UseGuards(AuthGuard)
  async getDraft(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.getDraft(userId, id);
  }

  @Put('drafts/:id')
  @UseGuards(AuthGuard)
  async updateDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.updateDraft(userId, id, dto);
  }

  @Delete('drafts/:id')
  @UseGuards(AuthGuard)
  async deleteDraft(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.deleteDraft(userId, id);
  }

  @Post('drafts/:id/duplicate')
  @UseGuards(AuthGuard)
  async duplicateDraft(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.duplicateDraft(userId, id);
  }

  // ==========================================================================
  // Section Management Endpoints (Authenticated)
  // ==========================================================================

  @Post('drafts/:id/sections')
  @UseGuards(AuthGuard)
  async addSection(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddSectionDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.addSection(userId, id, dto);
  }

  @Put('drafts/:id/sections/:sectionId')
  @UseGuards(AuthGuard)
  async updateSection(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.updateSection(userId, id, sectionId, dto);
  }

  @Delete('drafts/:id/sections/:sectionId')
  @UseGuards(AuthGuard)
  async deleteSection(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.deleteSection(userId, id, sectionId);
  }

  @Put('drafts/:id/sections/order')
  @UseGuards(AuthGuard)
  async reorderSections(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.reorderSections(userId, id, dto);
  }

  // ==========================================================================
  // Template, Preview, Validation & Rendering Endpoints (Authenticated)
  // ==========================================================================

  @Post('drafts/:id/apply-template')
  @UseGuards(AuthGuard)
  async applyTemplate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ApplyTemplateDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.applyTemplate(userId, id, dto);
  }

  @Post('drafts/:id/preview')
  @UseGuards(AuthGuard)
  async previewDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Body() payload: PreviewDraftPayloadDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.previewDraft(userId, id, payload);
  }

  @Post('drafts/:id/validate')
  @UseGuards(AuthGuard)
  async validateDraft(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.validateDraft(userId, id);
  }

  @Get('drafts/:id/markdown')
  @UseGuards(AuthGuard)
  async getMarkdown(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.draftService.getMarkdown(userId, id);
  }

  // ==========================================================================
  // PHASE 8 — Publishing, Synchronization & Version Control (Authenticated)
  // ==========================================================================

  @Get('targets')
  @UseGuards(AuthGuard)
  async getPublishTargets(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.getTargetRepositories(userId);
  }

  @Get('targets/:owner/:repo/branches')
  @UseGuards(AuthGuard)
  async getTargetBranches(
    @Req() req: any,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.getBranches(userId, owner, repo);
  }

  @Post('drafts/:id/publish/preview')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createPublishPreview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreatePublishPreviewDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.createPublicationPreview(userId, id, dto);
  }

  @Post('drafts/:id/publish')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmPublish(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ConfirmPublishDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.confirmAndPublish(userId, id, dto);
  }

  @Get('drafts/:id/publications')
  @UseGuards(AuthGuard)
  async getDraftPublications(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.getDraftPublications(userId, id);
  }

  @Get('publications/:publicationId')
  @UseGuards(AuthGuard)
  async getPublication(
    @Req() req: any,
    @Param('publicationId') publicationId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.getPublication(userId, publicationId);
  }

  @Get('drafts/:id/versions')
  @UseGuards(AuthGuard)
  async getDraftVersions(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.publicationService.getDraftVersions(userId, id);
  }
}
