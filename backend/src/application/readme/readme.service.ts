import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ReadmeDocument,
  ReadmeBlock,
  RenderContext,
  ComponentConfig,
  ReadmeMetadata,
  AvailabilityStatus,
  README_RENDERER_VERSION,
} from './models/readme.model';
import { ReadmeComponentRegistry } from './registry/component-registry.service';
import { MarkdownRenderer } from './renderers/markdown.renderer';
import { ThemeRegistry } from './themes/theme.registry';
import { TemplateRegistry, TemplateDefinition, TemplateSectionSpec } from './templates/template.registry';
import { RenderContextBuilder } from './render-context.builder';
import {
  ComponentNotFoundException,
  TemplateNotFoundException,
  ThemeNotFoundException,
  UnsupportedComponentException,
  RenderFailureException,
} from './exceptions/readme.exceptions';

export interface RenderResult {
  markdown: string;
  metadata: ReadmeMetadata;
  warnings: string[];
}

@Injectable()
export class ReadmeRenderService {
  private readonly logger = new Logger(ReadmeRenderService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly componentRegistry: ReadmeComponentRegistry,
    private readonly markdownRenderer: MarkdownRenderer,
    private readonly themes: ThemeRegistry,
    private readonly templates: TemplateRegistry,
    private readonly contextBuilder: RenderContextBuilder,
  ) {}

  /**
   * Canonical render entry point.
   *
   * Resolves authoritative data from the Phase 4/5 layer (NEVER from the
   * request body), loads the template + theme, validates section configs,
   * produces an IR, and renders deterministic Markdown.
   */
  async render(
    userId: string,
    templateKey: string,
    themeKey: string,
    sectionOverrides?: Array<{ sectionKey: string; settings?: Record<string, unknown>; fallback?: 'HIDE_COMPONENT' | 'RENDER_FALLBACK' | 'RENDER_UNAVAILABLE'; enabled?: boolean }>,
  ): Promise<RenderResult> {
    const template = this.templates.getByKey(templateKey);
    if (!template) throw new TemplateNotFoundException(templateKey);
    if (template.status === 'DISABLED') throw new TemplateNotFoundException(templateKey);

    const theme = this.themes.getByKey(themeKey);
    if (!theme) throw new ThemeNotFoundException(themeKey);

    const context = await this.contextBuilder.build(userId);
    context.themeId = themeKey;

    const effectiveSections = this.mergeSections(template, sectionOverrides);

    const warnings: string[] = [];
    const blocks: ReadmeBlock[] = [];

    for (const section of effectiveSections) {
      if (!section.enabled) continue;
      if (!this.componentRegistry.hasRenderer(section.componentKey)) {
        warnings.push(`Component "${section.componentKey}" is not registered and was skipped.`);
        continue;
      }
      try {
        const definition = this.componentRegistry.getDefinition(section.componentKey);
        const mergedSettings = this.componentRegistry.mergeWithDefaults(
          section.componentKey,
          section.configuration || {},
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
          fallback: section.fallback,
        };
        const renderer = this.componentRegistry.getRenderer(section.componentKey);
        const sectionBlocks = renderer.render(componentConfig, context);
        blocks.push(...sectionBlocks);
        void definition; // referenced for completeness
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        warnings.push(`Section "${section.sectionKey}" (${section.componentKey}) failed: ${message}`);
        this.logger.warn(`Section render failure: ${message}`);
      }
    }

    if (blocks.length === 0) {
      // A document with zero blocks is a render failure.
      throw new RenderFailureException('No renderable blocks were produced');
    }

    const metadata: ReadmeMetadata = {
      rendererVersion: README_RENDERER_VERSION,
      templateId: template.templateKey,
      templateVersion: template.version,
      themeId: theme.themeKey,
      themeVersion: theme.version,
      componentVersions: this.collectComponentVersions(effectiveSections),
      providerVersions: this.collectProviderVersions(),
      generatedAt: context.renderMetadata.generatedAt,
      sourceDataThrough: undefined,
      dataCompleteness: this.computeCompleteness(context),
      warnings,
    };

    const document: ReadmeDocument = { metadata, blocks };
    const markdown = this.markdownRenderer.render(document);

    // Persist audit log
    await this.auditRender(userId, template, theme, warnings.length === 0);

    return { markdown, metadata, warnings };
  }

  /**
   * Pure validation entry point — no Markdown output, just structural feedback.
   */
  validate(
    templateKey: string,
    themeKey: string,
    sections: Array<{ sectionKey: string; componentKey: string; enabled?: boolean; settings?: Record<string, unknown> }>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const template = this.templates.getByKey(templateKey);
    if (!template) {
      errors.push(`Template not found: ${templateKey}`);
      return { valid: false, errors };
    }
    if (!this.themes.getByKey(themeKey)) {
      errors.push(`Theme not found: ${themeKey}`);
    }
    for (const s of sections) {
      if (!this.componentRegistry.hasRenderer(s.componentKey)) {
        errors.push(`Unknown component: ${s.componentKey}`);
        continue;
      }
      try {
        const merged = this.componentRegistry.mergeWithDefaults(s.componentKey, s.settings || {});
        this.componentRegistry.validateConfiguration(s.componentKey, {
          componentId: s.componentKey,
          enabled: s.enabled ?? true,
          settings: merged,
        });
      } catch (err) {
        if (err instanceof Error) errors.push(err.message);
        else errors.push(String(err));
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private mergeSections(
    template: TemplateDefinition,
    overrides?: Array<{ sectionKey: string; settings?: Record<string, unknown>; fallback?: 'HIDE_COMPONENT' | 'RENDER_FALLBACK' | 'RENDER_UNAVAILABLE'; enabled?: boolean }>,
  ): Array<TemplateSectionSpec & { fallback?: 'HIDE_COMPONENT' | 'RENDER_FALLBACK' | 'RENDER_UNAVAILABLE' }> {
    const merged = template.sections.map((s) => ({ ...s, fallback: undefined as any }));
    if (!overrides) return merged;
    for (const ov of overrides) {
      const target = merged.find((m) => m.sectionKey === ov.sectionKey);
      if (!target) continue;
      if (ov.settings) target.configuration = { ...target.configuration, ...ov.settings };
      if (ov.fallback) target.fallback = ov.fallback;
      if (ov.enabled !== undefined) target.enabled = ov.enabled;
    }
    merged.sort((a, b) => a.displayOrder - b.displayOrder);
    return merged;
  }

  private collectComponentVersions(sections: Array<{ componentKey: string }>): Record<string, string> {
    const versions: Record<string, string> = {};
    for (const s of sections) {
      try {
        const def = this.componentRegistry.getDefinition(s.componentKey);
        versions[s.componentKey] = def.version;
      } catch {
        versions[s.componentKey] = 'unknown';
      }
    }
    return versions;
  }

  private collectProviderVersions(): Record<string, string> {
    return Object.fromEntries(this.themes.list().map((t) => [t.themeKey, t.version]));
  }

  private computeCompleteness(context: RenderContext): AvailabilityStatus {
    const fields: Array<{ status: AvailabilityStatus }> = [
      context.statistics.contributions,
      context.statistics.repositories,
      context.languages.items,
      context.achievements.earned,
      context.repositories.items,
    ];
    const statuses = fields.map((f) => f.status);
    if (statuses.every((s) => s === 'AVAILABLE')) return 'AVAILABLE';
    if (statuses.some((s) => s === 'AVAILABLE')) return 'PARTIAL';
    return 'UNAVAILABLE';
  }

  private async auditRender(
    userId: string,
    template: TemplateDefinition,
    theme: { themeKey: string },
    success: boolean,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor: userId,
          action: 'README_CREATE' as any, // existing enum value
          resource: 'README',
          resourceId: `${template.templateKey}:${template.version}`,
          result: success ? 'SUCCESS' : 'FAILURE',
          ipMetadata: undefined as any,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed: ${(err as Error).message}`);
    }
  }
}

// (AvailabilityStatus is imported at the top of the file)
