import { ReadmeRenderService } from '../../src/application/readme/readme.service';
import { ReadmeComponentRegistry } from '../../src/application/readme/registry/component-registry.service';
import { MarkdownRenderer } from '../../src/application/readme/renderers/markdown.renderer';
import { HeroRenderer } from '../../src/application/readme/renderers/hero.renderer';
import { ThemeRegistry } from '../../src/application/readme/themes/theme.registry';
import { TemplateRegistry } from '../../src/application/readme/templates/template.registry';

describe('ReadmeRenderService — validation', () => {
  let service: ReadmeRenderService;

  beforeEach(() => {
    // We don't exercise the full render() path here (it requires Prisma + Analytics),
    // only the pure validation surface.
    const registry = new ReadmeComponentRegistry();
    registry.register(new HeroRenderer());
    const md = new MarkdownRenderer();
    const themes = new ThemeRegistry();
    const templates = new TemplateRegistry();
    service = new ReadmeRenderService(registry, md, themes, templates, {} as any);
  });

  it('accepts a valid template/theme/sections set', () => {
    const result = service.validate('minimal', 'github-light', [
      { sectionKey: 'hero', componentKey: 'hero', enabled: true, settings: {} },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects unknown template', () => {
    const result = service.validate('nope', 'github-light', [
      { sectionKey: 'hero', componentKey: 'hero', enabled: true, settings: {} },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Template not found');
  });

  it('rejects unknown theme', () => {
    const result = service.validate('minimal', 'does-not-exist', [
      { sectionKey: 'hero', componentKey: 'hero', enabled: true, settings: {} },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Theme not found');
  });

  it('rejects unknown component', () => {
    const result = service.validate('minimal', 'github-light', [
      { sectionKey: 'x', componentKey: 'does-not-exist', enabled: true, settings: {} },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Unknown component');
  });
});

