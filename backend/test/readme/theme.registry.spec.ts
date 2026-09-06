import { ThemeRegistry } from '../../src/application/readme/themes/theme.registry';

describe('ThemeRegistry', () => {
  let registry: ThemeRegistry;

  beforeEach(() => {
    registry = new ThemeRegistry();
  });

  it('includes the eight built-in themes', () => {
    const themes = registry.list();
    const keys = themes.map((t) => t.themeKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        'github-light',
        'github-dark',
        'tokyo-night',
        'dracula',
        'nord',
        'monochrome',
        'cyberpunk',
        'professional',
      ]),
    );
  });

  it('resolves a theme by key', () => {
    const ctx = registry.resolve('github-dark');
    expect(ctx.theme.themeKey).toBe('github-dark');
  });

  it('falls back to github-dark for unknown keys without throwing', () => {
    const ctx = registry.resolve('does-not-exist');
    expect(ctx.theme.themeKey).toBe('github-dark');
  });

  it('returns distinct themes for distinct keys', () => {
    const a = registry.resolve('github-light');
    const b = registry.resolve('dracula');
    expect(a.theme.themeKey).not.toBe(b.theme.themeKey);
  });
});

