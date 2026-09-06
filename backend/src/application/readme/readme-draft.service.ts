import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClient, ReadmeDraftStatus, AuditAction } from '@prisma/client';
import { ReadmeComponentRegistry } from './registry/component-registry.service';
import { MarkdownRenderer } from './renderers/markdown.renderer';
import { ThemeRegistry } from './themes/theme.registry';
import { TemplateRegistry, TemplateDefinition } from './templates/template.registry';
import { ProviderRegistry } from './providers/provider.registry';
import { RenderContextBuilder } from './render-context.builder';
import {
  CreateDraftDto,
  UpdateDraftDto,
  AddSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  ApplyTemplateDto,
  TemplateApplyMode,
  PreviewDraftPayloadDto,
} from './dto/readme-draft.dto';
import {
  ReadmeBlock,
  ReadmeDocument,
  ReadmeMetadata,
  ComponentConfig,
  README_RENDERER_VERSION,
  AvailabilityStatus,
} from './models/readme.model';
import { ComponentNotFoundException, ThemeNotFoundException } from './exceptions/readme.exceptions';

export interface DraftValidationError {
  sectionId?: string;
  componentKey?: string;
  field?: string;
  reason: string;
}

@Injectable()
export class ReadmeDraftService {
  private readonly logger = new Logger(ReadmeDraftService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly componentRegistry: ReadmeComponentRegistry,
    private readonly markdownRenderer: MarkdownRenderer,
    private readonly themes: ThemeRegistry,
    private readonly templates: TemplateRegistry,
    private readonly contextBuilder: RenderContextBuilder,
    private readonly providerRegistry?: ProviderRegistry,
  ) {}

  /**
   * List all drafts owned by the authenticated user
   */
  async listDrafts(userId: string) {
    return this.prisma.readmeDraft.findMany({
      where: {
        userId,
        status: { not: 'ARCHIVED' },
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Create a new draft
   */
  async createDraft(userId: string, dto: CreateDraftDto) {
    const templateKey = dto.templateId || 'professional-developer';
    const template = this.templates.getByKey(templateKey);
    const themeKey = dto.themeId || template?.themeKey || 'github-dark';

    const sectionsToCreate: Array<{
      componentKey: string;
      displayOrder: number;
      enabled: boolean;
      configuration: any;
      schemaVersion: string;
      componentVersion: string;
    }> = [];

    if (dto.sections && dto.sections.length > 0) {
      dto.sections.forEach((sec, idx) => {
        const compKey = sec.componentKey;
        const config = this.componentRegistry.hasRenderer(compKey)
          ? this.componentRegistry.mergeWithDefaults(compKey, sec.configuration || {})
          : sec.configuration || {};
        const version = this.componentRegistry.hasRenderer(compKey)
          ? this.componentRegistry.getDefinition(compKey).version
          : '1.0.0';

        sectionsToCreate.push({
          componentKey: compKey,
          displayOrder: sec.displayOrder !== undefined ? sec.displayOrder : (idx + 1) * 10,
          enabled: sec.enabled !== false,
          configuration: config,
          schemaVersion: '1.0.0',
          componentVersion: version,
        });
      });
    } else if (template) {
      template.sections.forEach((sec, idx) => {
        const compKey = sec.componentKey;
        const config = this.componentRegistry.hasRenderer(compKey)
          ? this.componentRegistry.mergeWithDefaults(compKey, sec.configuration || {})
          : sec.configuration || {};
        const version = this.componentRegistry.hasRenderer(compKey)
          ? this.componentRegistry.getDefinition(compKey).version
          : '1.0.0';

        sectionsToCreate.push({
          componentKey: compKey,
          displayOrder: (idx + 1) * 10,
          enabled: sec.enabled,
          configuration: config,
          schemaVersion: sec.schemaVersion || '1.0.0',
          componentVersion: version,
        });
      });
    }

    const draft = await this.prisma.readmeDraft.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description || null,
        templateId: templateKey,
        templateVersion: template?.version || '1.0.0',
        themeId: themeKey,
        themeVersion: this.themes.getByKey(themeKey)?.version || '1.0.0',
        rendererVersion: README_RENDERER_VERSION,
        configuration: {},
        revision: 1,
        status: ReadmeDraftStatus.DRAFT,
        sections: {
          create: sectionsToCreate,
        },
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    await this.audit(userId, 'README_DRAFT_CREATED' as AuditAction, draft.id, 'SUCCESS');
    return draft;
  }

  /**
   * Get draft by ID with ownership enforcement
   */
  async getDraft(userId: string, draftId: string) {
    const draft = await this.prisma.readmeDraft.findUnique({
      where: { id: draftId },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException(`README draft not found: ${draftId}`);
    }

    if (draft.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this draft');
    }

    return draft;
  }

  /**
   * Update draft with optimistic concurrency check
   */
  async updateDraft(userId: string, draftId: string, dto: UpdateDraftDto) {
    const existing = await this.getDraft(userId, draftId);

    // Optimistic Concurrency Check
    if (existing.revision !== dto.expectedRevision) {
      await this.audit(userId, 'README_DRAFT_CONFLICT' as AuditAction, draftId, 'FAILURE', 'Revision mismatch');
      throw new HttpException(
        {
          code: 'README_DRAFT_CONFLICT',
          message: `Draft has been modified by another operation. Expected revision ${dto.expectedRevision}, server revision is ${existing.revision}.`,
          serverRevision: existing.revision,
          draftId,
        },
        HttpStatus.CONFLICT,
      );
    }

    const themeKey = dto.themeId || existing.themeId;
    const themeVersion = this.themes.getByKey(themeKey)?.version || existing.themeVersion;
    const templateKey = dto.templateId || existing.templateId;
    const templateVersion = templateKey ? (this.templates.getByKey(templateKey)?.version || existing.templateVersion) : existing.templateVersion;

    const updated = await this.prisma.readmeDraft.update({
      where: { id: draftId },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        themeId: themeKey,
        themeVersion,
        templateId: templateKey,
        templateVersion,
        configuration: dto.configuration !== undefined ? (dto.configuration as any) : existing.configuration,
        status: dto.status !== undefined ? (dto.status as ReadmeDraftStatus) : existing.status,
        revision: existing.revision + 1,
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    await this.audit(userId, 'README_DRAFT_UPDATED' as AuditAction, draftId, 'SUCCESS');
    return updated;
  }

  /**
   * Delete draft
   */
  async deleteDraft(userId: string, draftId: string) {
    await this.getDraft(userId, draftId); // verify ownership

    await this.prisma.readmeDraft.delete({
      where: { id: draftId },
    });

    await this.audit(userId, 'README_DRAFT_DELETED' as AuditAction, draftId, 'SUCCESS');
    return { message: 'Draft deleted successfully', draftId };
  }

  /**
   * Duplicate draft
   */
  async duplicateDraft(userId: string, draftId: string) {
    const original = await this.getDraft(userId, draftId);

    const newDraft = await this.prisma.readmeDraft.create({
      data: {
        userId,
        name: `${original.name} (Copy)`,
        description: original.description,
        templateId: original.templateId,
        templateVersion: original.templateVersion,
        themeId: original.themeId,
        themeVersion: original.themeVersion,
        rendererVersion: original.rendererVersion,
        configuration: original.configuration as any,
        revision: 1,
        status: ReadmeDraftStatus.DRAFT,
        sections: {
          create: original.sections.map((sec) => ({
            componentKey: sec.componentKey,
            displayOrder: sec.displayOrder,
            enabled: sec.enabled,
            configuration: sec.configuration as any,
            schemaVersion: sec.schemaVersion,
            componentVersion: sec.componentVersion,
          })),
        },
      },
      include: {
        sections: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    await this.audit(userId, 'README_DRAFT_DUPLICATED' as AuditAction, newDraft.id, 'SUCCESS');
    return newDraft;
  }

  /**
   * Add a section instance to draft
   */
  async addSection(userId: string, draftId: string, dto: AddSectionDto) {
    const draft = await this.getDraft(userId, draftId);

    if (!this.componentRegistry.hasRenderer(dto.componentKey)) {
      throw new ComponentNotFoundException(dto.componentKey);
    }

    const definition = this.componentRegistry.getDefinition(dto.componentKey);
    const mergedConfig = this.componentRegistry.mergeWithDefaults(
      dto.componentKey,
      dto.configuration || {},
    );

    // Validate configuration
    this.componentRegistry.validateConfiguration(dto.componentKey, {
      componentId: dto.componentKey,
      enabled: dto.enabled !== false,
      settings: mergedConfig,
    });

    const maxOrder = draft.sections.length > 0
      ? Math.max(...draft.sections.map((s) => s.displayOrder))
      : 0;

    const displayOrder = dto.displayOrder !== undefined ? dto.displayOrder : maxOrder + 10;

    const [section] = await this.prisma.$transaction([
      this.prisma.readmeSectionInstance.create({
        data: {
          draftId,
          componentKey: dto.componentKey,
          displayOrder,
          enabled: dto.enabled !== false,
          configuration: mergedConfig as any,
          schemaVersion: '1.0.0',
          componentVersion: definition.version,
        },
      }),
      this.prisma.readmeDraft.update({
        where: { id: draftId },
        data: {
          revision: draft.revision + 1,
          updatedAt: new Date(),
        },
      }),
    ]);

    return section;
  }

  /**
   * Update section instance configuration or state
   */
  async updateSection(userId: string, draftId: string, sectionId: string, dto: UpdateSectionDto) {
    const draft = await this.getDraft(userId, draftId);
    const section = draft.sections.find((s) => s.id === sectionId);

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found in draft ${draftId}`);
    }

    let finalConfig = section.configuration as Record<string, unknown>;

    if (dto.configuration !== undefined) {
      if (this.componentRegistry.hasRenderer(section.componentKey)) {
        finalConfig = this.componentRegistry.mergeWithDefaults(
          section.componentKey,
          dto.configuration,
        );
        this.componentRegistry.validateConfiguration(section.componentKey, {
          componentId: section.componentKey,
          enabled: dto.enabled !== undefined ? dto.enabled : section.enabled,
          settings: finalConfig,
        });
      } else {
        finalConfig = dto.configuration;
      }
    }

    const [updatedSection] = await this.prisma.$transaction([
      this.prisma.readmeSectionInstance.update({
        where: { id: sectionId },
        data: {
          configuration: finalConfig as any,
          enabled: dto.enabled !== undefined ? dto.enabled : section.enabled,
          displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : section.displayOrder,
        },
      }),
      this.prisma.readmeDraft.update({
        where: { id: draftId },
        data: {
          revision: draft.revision + 1,
          updatedAt: new Date(),
        },
      }),
    ]);

    return updatedSection;
  }

  /**
   * Delete section instance
   */
  async deleteSection(userId: string, draftId: string, sectionId: string) {
    const draft = await this.getDraft(userId, draftId);
    const section = draft.sections.find((s) => s.id === sectionId);

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found in draft ${draftId}`);
    }

    await this.prisma.$transaction([
      this.prisma.readmeSectionInstance.delete({
        where: { id: sectionId },
      }),
      this.prisma.readmeDraft.update({
        where: { id: draftId },
        data: {
          revision: draft.revision + 1,
          updatedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Section removed successfully', sectionId };
  }

  /**
   * Atomically reorder all sections of a draft
   */
  async reorderSections(userId: string, draftId: string, dto: ReorderSectionsDto) {
    const draft = await this.getDraft(userId, draftId);
    const existingIds = new Set(draft.sections.map((s) => s.id));

    // Validations: length must match, no duplicates, all IDs must exist in draft
    if (dto.sectionIds.length !== draft.sections.length) {
      throw new BadRequestException(
        `Reorder list length (${dto.sectionIds.length}) does not match draft sections count (${draft.sections.length})`,
      );
    }

    const uniqueRequestedIds = new Set(dto.sectionIds);
    if (uniqueRequestedIds.size !== dto.sectionIds.length) {
      throw new BadRequestException('Reorder list contains duplicate section IDs');
    }

    for (const id of dto.sectionIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Section ID ${id} does not belong to draft ${draftId}`);
      }
    }

    // Atomic transaction
    const updateOps = dto.sectionIds.map((id, index) =>
      this.prisma.readmeSectionInstance.update({
        where: { id },
        data: { displayOrder: (index + 1) * 10 },
      }),
    );

    await this.prisma.$transaction([
      ...updateOps,
      this.prisma.readmeDraft.update({
        where: { id: draftId },
        data: {
          revision: draft.revision + 1,
          updatedAt: new Date(),
        },
      }),
    ]);

    return this.prisma.readmeSectionInstance.findMany({
      where: { draftId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Apply template to draft (REPLACE or MERGE mode)
   */
  async applyTemplate(userId: string, draftId: string, dto: ApplyTemplateDto) {
    const draft = await this.getDraft(userId, draftId);
    const template = this.templates.getByKey(dto.templateKey);

    if (!template) {
      throw new NotFoundException(`Template ${dto.templateKey} not found`);
    }

    const mode = dto.mode || TemplateApplyMode.REPLACE;

    await this.prisma.$transaction(async (tx) => {
      if (mode === TemplateApplyMode.REPLACE) {
        // Remove all existing sections
        await tx.readmeSectionInstance.deleteMany({
          where: { draftId },
        });

        // Insert template sections
        for (let i = 0; i < template.sections.length; i++) {
          const sec = template.sections[i];
          const compKey = sec.componentKey;
          const config = this.componentRegistry.hasRenderer(compKey)
            ? this.componentRegistry.mergeWithDefaults(compKey, sec.configuration || {})
            : sec.configuration || {};
          const version = this.componentRegistry.hasRenderer(compKey)
            ? this.componentRegistry.getDefinition(compKey).version
            : '1.0.0';

          await tx.readmeSectionInstance.create({
            data: {
              draftId,
              componentKey: compKey,
              displayOrder: (i + 1) * 10,
              enabled: sec.enabled,
              configuration: config as any,
              schemaVersion: sec.schemaVersion || '1.0.0',
              componentVersion: version,
            },
          });
        }
      } else {
        // MERGE mode: add missing template sections
        const existingCompKeys = new Set(draft.sections.map((s) => s.componentKey));
        let nextOrder = draft.sections.length > 0
          ? Math.max(...draft.sections.map((s) => s.displayOrder)) + 10
          : 10;

        for (const sec of template.sections) {
          if (!existingCompKeys.has(sec.componentKey)) {
            const compKey = sec.componentKey;
            const config = this.componentRegistry.hasRenderer(compKey)
              ? this.componentRegistry.mergeWithDefaults(compKey, sec.configuration || {})
              : sec.configuration || {};
            const version = this.componentRegistry.hasRenderer(compKey)
              ? this.componentRegistry.getDefinition(compKey).version
              : '1.0.0';

            await tx.readmeSectionInstance.create({
              data: {
                draftId,
                componentKey: compKey,
                displayOrder: nextOrder,
                enabled: sec.enabled,
                configuration: config as any,
                schemaVersion: sec.schemaVersion || '1.0.0',
                componentVersion: version,
              },
            });
            nextOrder += 10;
          }
        }
      }

      // Update draft template reference and theme
      await tx.readmeDraft.update({
        where: { id: draftId },
        data: {
          templateId: template.templateKey,
          templateVersion: template.version,
          themeId: template.themeKey || draft.themeId,
          themeVersion: this.themes.getByKey(template.themeKey || draft.themeId)?.version || '1.0.0',
          revision: draft.revision + 1,
          updatedAt: new Date(),
        },
      });
    });

    await this.audit(userId, 'README_TEMPLATE_APPLIED' as AuditAction, draftId, 'SUCCESS', `Applied ${dto.templateKey} (${mode})`);
    return this.getDraft(userId, draftId);
  }

  /**
   * Authoritative validation of draft and all section configurations
   */
  async validateDraft(userId: string, draftId: string): Promise<{ valid: boolean; errors: DraftValidationError[] }> {
    const draft = await this.getDraft(userId, draftId);
    const errors: DraftValidationError[] = [];

    // 1. Theme validation
    if (!this.themes.getByKey(draft.themeId)) {
      errors.push({
        reason: `Theme "${draft.themeId}" is not registered`,
      });
    }

    // 2. Sections validation
    for (const section of draft.sections) {
      if (!this.componentRegistry.hasRenderer(section.componentKey)) {
        errors.push({
          sectionId: section.id,
          componentKey: section.componentKey,
          reason: `Component "${section.componentKey}" is not registered in the catalog`,
        });
        continue;
      }

      try {
        this.componentRegistry.validateConfiguration(section.componentKey, {
          componentId: section.componentKey,
          enabled: section.enabled,
          settings: section.configuration as Record<string, unknown>,
        });
      } catch (err: any) {
        errors.push({
          sectionId: section.id,
          componentKey: section.componentKey,
          reason: err.message || 'Invalid section configuration',
        });
      }
    }

    const isValid = errors.length === 0;

    // Update draft status
    await this.prisma.readmeDraft.update({
      where: { id: draftId },
      data: {
        status: isValid ? ReadmeDraftStatus.VALID : ReadmeDraftStatus.INVALID,
      },
    });

    if (!isValid) {
      await this.audit(userId, 'README_VALIDATION_FAILED' as AuditAction, draftId, 'FAILURE', `${errors.length} errors`);
    }

    return { valid: isValid, errors };
  }

  /**
   * Live Preview render (supports unsaved working payload or persisted state)
   */
  async previewDraft(userId: string, draftId: string, payload?: PreviewDraftPayloadDto) {
    const draft = await this.getDraft(userId, draftId);
    const themeKey = payload?.themeId || draft.themeId;
    const theme = this.themes.getByKey(themeKey) || this.themes.getByKey('github-dark')!;

    // Resolve authoritative context from Phase 4 & 5
    const context = await this.contextBuilder.build(userId);
    context.themeId = themeKey;

    const sectionsToRender: Array<{
      id?: string;
      componentKey: string;
      enabled: boolean;
      configuration: Record<string, unknown>;
      displayOrder: number;
    }> = [];

    if (payload?.sections && payload.sections.length > 0) {
      payload.sections.forEach((sec, idx) => {
        sectionsToRender.push({
          id: sec.id,
          componentKey: sec.componentKey,
          enabled: sec.enabled !== false,
          configuration: sec.configuration || {},
          displayOrder: sec.displayOrder !== undefined ? sec.displayOrder : (idx + 1) * 10,
        });
      });
    } else {
      draft.sections.forEach((sec) => {
        sectionsToRender.push({
          id: sec.id,
          componentKey: sec.componentKey,
          enabled: sec.enabled,
          configuration: (sec.configuration as Record<string, unknown>) || {},
          displayOrder: sec.displayOrder,
        });
      });
    }

    sectionsToRender.sort((a, b) => a.displayOrder - b.displayOrder);

    const warnings: string[] = [];
    const validationErrors: DraftValidationError[] = [];
    const blocks: ReadmeBlock[] = [];

    for (const section of sectionsToRender) {
      if (!section.enabled) continue;

      if (!this.componentRegistry.hasRenderer(section.componentKey)) {
        warnings.push(`Component "${section.componentKey}" is not registered`);
        validationErrors.push({
          sectionId: section.id,
          componentKey: section.componentKey,
          reason: 'Unknown component',
        });
        continue;
      }

      try {
        const mergedSettings = this.componentRegistry.mergeWithDefaults(
          section.componentKey,
          section.configuration,
        );

        this.componentRegistry.validateConfiguration(section.componentKey, {
          componentId: section.componentKey,
          enabled: section.enabled,
          settings: mergedSettings,
        });

        const componentConfig: ComponentConfig = {
          componentId: section.componentKey,
          enabled: section.enabled,
          settings: mergedSettings,
          fallback: 'RENDER_UNAVAILABLE',
        };

        const renderer = this.componentRegistry.getRenderer(section.componentKey);
        const sectionBlocks = renderer.render(componentConfig, context);
        blocks.push(...sectionBlocks);
      } catch (err: any) {
        const message = err.message || String(err);
        warnings.push(`Section "${section.componentKey}" error: ${message}`);
        validationErrors.push({
          sectionId: section.id,
          componentKey: section.componentKey,
          reason: message,
        });

        // Fail-safe block to keep preview usable
        blocks.push({
          type: 'TEXT' as any,
          content: `> ⚠️ *Error rendering component [${section.componentKey}]: ${message}*`,
        });
      }
    }

    const metadata: ReadmeMetadata = {
      rendererVersion: README_RENDERER_VERSION,
      templateId: payload?.templateId || draft.templateId || 'custom',
      templateVersion: '1.0.0',
      themeId: theme.themeKey,
      themeVersion: theme.version,
      componentVersions: Object.fromEntries(
        sectionsToRender.map((s) => [
          s.componentKey,
          this.componentRegistry.hasRenderer(s.componentKey)
            ? this.componentRegistry.getDefinition(s.componentKey).version
            : 'unknown',
        ]),
      ),
      providerVersions: this.providerRegistry
        ? Object.fromEntries(this.providerRegistry.list(true).map((p) => [p.providerKey, p.version]))
        : {},
      generatedAt: context.renderMetadata.generatedAt,
      sourceDataThrough: undefined,
      dataCompleteness: this.computeCompleteness(context),
      warnings,
    };

    const document: ReadmeDocument = { metadata, blocks };
    const markdown = this.markdownRenderer.render(document);

    // Update lastRenderedAt on draft
    await this.prisma.readmeDraft.update({
      where: { id: draftId },
      data: { lastRenderedAt: new Date() },
    });

    await this.audit(userId, 'README_RENDERED' as AuditAction, draftId, 'SUCCESS');

    return {
      markdown,
      metadata,
      validation: {
        valid: validationErrors.length === 0,
        errors: validationErrors,
      },
    };
  }

  /**
   * Get canonical Markdown output for draft
   */
  async getMarkdown(userId: string, draftId: string) {
    const preview = await this.previewDraft(userId, draftId);
    return {
      markdown: preview.markdown,
      metadata: preview.metadata,
    };
  }

  private computeCompleteness(context: any): AvailabilityStatus {
    const fields = [
      context.statistics?.contributions,
      context.statistics?.repositories,
      context.languages?.items,
      context.achievements?.earned,
      context.repositories?.items,
    ];
    const statuses = fields.filter(Boolean).map((f) => f.status);
    if (statuses.every((s) => s === 'AVAILABLE')) return 'AVAILABLE';
    if (statuses.some((s) => s === 'AVAILABLE')) return 'PARTIAL';
    return 'UNAVAILABLE';
  }

  private async audit(
    actor: string,
    action: AuditAction,
    resourceId: string,
    result: 'SUCCESS' | 'FAILURE',
    failureReason?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor,
          action,
          resource: 'README_DRAFT',
          resourceId,
          result,
          failureReason: failureReason || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Audit log failed: ${err.message}`);
    }
  }
}
