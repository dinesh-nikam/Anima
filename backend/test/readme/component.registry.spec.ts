import { ReadmeComponentRegistry } from '../../src/application/readme/registry/component-registry.service';
import { HeroRenderer } from '../../src/application/readme/renderers/hero.renderer';
import { GithubStatsRenderer } from '../../src/application/readme/renderers/github-stats.renderer';
import { CalloutRenderer } from '../../src/application/readme/renderers/achievements-and-presentation.renderers';
import { ProviderRegistry } from '../../src/application/readme/providers/provider.registry';

describe('ReadmeComponentRegistry', () => {
  let registry: ReadmeComponentRegistry;

  beforeEach(() => {
    registry = new ReadmeComponentRegistry();
    const providers = new ProviderRegistry();
    registry.register(new HeroRenderer());
    registry.register(new GithubStatsRenderer(providers));
    registry.register(new CalloutRenderer());
  });

  it('registers and retrieves a renderer', () => {
    const r = registry.getRenderer('hero');
    expect(r.id).toBe('hero');
    expect(r.definition.name).toBe('Hero');
  });

  it('throws for unknown renderer', () => {
    expect(() => registry.getRenderer('nope')).toThrow();
  });

  it('lists components sorted by name', () => {
    const defs = registry.getAvailableComponents();
    expect(defs.length).toBeGreaterThanOrEqual(3);
    const names = defs.map((d) => d.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('validates unknown settings as errors', () => {
    expect(() =>
      registry.validateConfiguration('hero', {
        componentId: 'hero',
        enabled: true,
        settings: { totallyUnknown: true },
      }),
    ).toThrow();
  });

  it('accepts valid settings and applies defaults when missing', () => {
    const merged = registry.mergeWithDefaults('hero', {});
    expect(merged['alignment']).toBe('left');
  });

  it('rejects setting payloads over 4096 bytes', () => {
    const huge: Record<string, unknown> = {};
    for (let i = 0; i < 200; i++) huge[`key${i}`] = 'x'.repeat(50);
    expect(() =>
      registry.validateConfiguration('hero', {
        componentId: 'hero',
        enabled: true,
        settings: huge,
      }),
    ).toThrow();
  });
});

describe('HeroRenderer', () => {
  it('renders a heading and bio when displayName and bio are present', () => {
    const hero = new HeroRenderer();
    const blocks = hero.render(
      {
        componentId: 'hero',
        enabled: true,
        settings: { alignment: 'left', showBio: true },
      },
      {
        profile: { displayName: 'Octocat', bio: 'I build things.' },
        statistics: anyStats(),
        streak: anyStreak(),
        languages: { items: { status: 'UNAVAILABLE' } },
        repositories: { items: { status: 'UNAVAILABLE' } },
        activity: { items: { status: 'UNAVAILABLE' } },
        achievements: { earned: { status: 'UNAVAILABLE' }, inProgress: { status: 'UNAVAILABLE' } },
        trophies: { items: { status: 'UNAVAILABLE' } },
        socialLinks: { items: { status: 'UNAVAILABLE' } },
        customData: { skills: { status: 'UNAVAILABLE' }, projects: { status: 'UNAVAILABLE' } },
        themeId: 'github-light',
        providerResults: {},
        renderMetadata: { rendererVersion: '1.0.0', generatedAt: 'x' },
      },
    );
    expect(blocks.length).toBeGreaterThan(0);
    expect(JSON.stringify(blocks)).toContain('Octocat');
    expect(JSON.stringify(blocks)).toContain('I build things.');
  });

  it('returns no blocks when displayName missing and fallback HIDE', () => {
    const hero = new HeroRenderer();
    const blocks = hero.render(
      {
        componentId: 'hero',
        enabled: true,
        settings: {},
        fallback: 'HIDE_COMPONENT',
      },
      {
        profile: {},
        statistics: anyStats(),
        streak: anyStreak(),
        languages: { items: { status: 'UNAVAILABLE' } },
        repositories: { items: { status: 'UNAVAILABLE' } },
        activity: { items: { status: 'UNAVAILABLE' } },
        achievements: { earned: { status: 'UNAVAILABLE' }, inProgress: { status: 'UNAVAILABLE' } },
        trophies: { items: { status: 'UNAVAILABLE' } },
        socialLinks: { items: { status: 'UNAVAILABLE' } },
        customData: { skills: { status: 'UNAVAILABLE' }, projects: { status: 'UNAVAILABLE' } },
        themeId: 'github-light',
        providerResults: {},
        renderMetadata: { rendererVersion: '1.0.0', generatedAt: 'x' },
      },
    );
    expect(blocks).toEqual([]);
  });
});

describe('GithubStatsRenderer', () => {
  it('produces an IMAGE block referencing the resolved provider URL', () => {
    const r = new GithubStatsRenderer(new ProviderRegistry());
    const blocks = r.render(
      {
        componentId: 'github-stats',
        enabled: true,
        settings: { theme: 'default', showIcons: true, alignment: 'center', title: 'GitHub Statistics' },
      },
      {
        profile: { githubLogin: 'octocat' },
        statistics: anyStats(),
        streak: anyStreak(),
        languages: { items: { status: 'UNAVAILABLE' } },
        repositories: { items: { status: 'UNAVAILABLE' } },
        activity: { items: { status: 'UNAVAILABLE' } },
        achievements: { earned: { status: 'UNAVAILABLE' }, inProgress: { status: 'UNAVAILABLE' } },
        trophies: { items: { status: 'UNAVAILABLE' } },
        socialLinks: { items: { status: 'UNAVAILABLE' } },
        customData: { skills: { status: 'UNAVAILABLE' }, projects: { status: 'UNAVAILABLE' } },
        themeId: 'github-light',
        providerResults: {},
        renderMetadata: { rendererVersion: '1.0.0', generatedAt: 'x' },
      },
    );
    const imageBlocks = blocks.filter((b) => b.type === ('IMAGE' as any));
    expect(imageBlocks.length).toBe(1);
    const meta = imageBlocks[0].metadata as any;
    expect(meta.src).toMatch(/^https:\/\/github-readme-stats\.vercel\.app\//);
    expect(meta.src).toContain('octocat');
  });
});

describe('CalloutRenderer', () => {
  it('renders a callout paragraph when title and message provided', () => {
    const r = new CalloutRenderer();
    const blocks = r.render(
      {
        componentId: 'callout',
        enabled: true,
        settings: { title: 'Hello', message: 'World', emoji: '🚀' },
      },
      anyContext(),
    );
    expect(blocks.length).toBe(1);
    const block = blocks[0];
    expect(block.content).toContain('Hello');
    expect(block.content).toContain('World');
    expect(block.content).toContain('🚀');
  });

  it('returns empty blocks when title/message missing and no fallback', () => {
    const r = new CalloutRenderer();
    const blocks = r.render(
      {
        componentId: 'callout',
        enabled: true,
        settings: {},
        fallback: 'HIDE_COMPONENT',
      },
      anyContext(),
    );
    expect(blocks).toEqual([]);
  });
});

function anyStats(): any {
  return {
    repositories: { status: 'UNAVAILABLE' },
    followers: { status: 'UNAVAILABLE' },
    following: { status: 'UNAVAILABLE' },
    stars: { status: 'UNAVAILABLE' },
    forks: { status: 'UNAVAILABLE' },
    contributions: { status: 'UNAVAILABLE' },
    pullRequests: { status: 'UNAVAILABLE' },
    issues: { status: 'UNAVAILABLE' },
    reviews: { status: 'UNAVAILABLE' },
  };
}

function anyStreak(): any {
  return {
    current: { status: 'UNAVAILABLE' },
    longest: { status: 'UNAVAILABLE' },
  };
}

function anyContext(): any {
  return {
    profile: {},
    statistics: anyStats(),
    streak: anyStreak(),
    languages: { items: { status: 'UNAVAILABLE' } },
    repositories: { items: { status: 'UNAVAILABLE' } },
    activity: { items: { status: 'UNAVAILABLE' } },
    achievements: { earned: { status: 'UNAVAILABLE' }, inProgress: { status: 'UNAVAILABLE' } },
    trophies: { items: { status: 'UNAVAILABLE' } },
    socialLinks: { items: { status: 'UNAVAILABLE' } },
    customData: { skills: { status: 'UNAVAILABLE' }, projects: { status: 'UNAVAILABLE' } },
    themeId: 'github-light',
    providerResults: {},
    renderMetadata: { rendererVersion: '1.0.0', generatedAt: 'x' },
  };
}

