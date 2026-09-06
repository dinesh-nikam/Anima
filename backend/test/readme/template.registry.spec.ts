import { TemplateRegistry } from '../../src/application/readme/templates/template.registry';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  it('includes the four curated system templates', () => {
    const keys = registry.list().map((t) => t.templateKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        'professional-developer',
        'open-source-developer',
        'minimal',
        'technical-portfolio',
      ]),
    );
  });

  it('resolves a template by key', () => {
    const t = registry.getByKey('minimal');
    expect(t).toBeDefined();
    expect(t!.sections.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown keys', () => {
    expect(registry.getByKey('nope')).toBeUndefined();
  });

  it('every section references a known component key (string)', () => {
    for (const t of registry.list()) {
      for (const s of t.sections) {
        expect(typeof s.componentKey).toBe('string');
        expect(s.componentKey.length).toBeGreaterThan(0);
      }
    }
  });

  it('exposes template versions and theme references', () => {
    const t = registry.getByKey('open-source-developer')!;
    expect(t.version).toBe('1.0.0');
    expect(t.themeKey).toBe('tokyo-night');
  });
});

