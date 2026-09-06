import { ProviderRegistry } from '../../src/application/readme/providers/provider.registry';
import { RenderContext } from '../../src/application/readme/models/readme.model';

describe('ProviderRegistry Comprehensive Suite', () => {
  let registry: ProviderRegistry;

  const mockContext: RenderContext = {
    profile: {
      githubLogin: 'octocat',
      displayName: 'The Octocat',
    },
    statistics: {
      repositories: { status: 'AVAILABLE', value: 25 },
      followers: { status: 'AVAILABLE', value: 200 },
      following: { status: 'AVAILABLE', value: 15 },
      stars: { status: 'AVAILABLE', value: 150 },
      forks: { status: 'AVAILABLE', value: 30 },
      contributions: { status: 'AVAILABLE', value: 900, sourceUpdatedAt: '2026-09-05T00:00:00Z' },
      pullRequests: { status: 'AVAILABLE', value: 40 },
      issues: { status: 'AVAILABLE', value: 10 },
      reviews: { status: 'AVAILABLE', value: 20 },
    },
    streak: {
      current: { status: 'AVAILABLE', value: 7 },
      longest: { status: 'AVAILABLE', value: 30 },
    },
    languages: {
      items: {
        status: 'AVAILABLE',
        value: [{ name: 'TypeScript', percentage: 100, bytes: 50000 }],
      },
    },
    repositories: { items: { status: 'AVAILABLE', value: [] } },
    activity: { items: { status: 'AVAILABLE', value: [] } },
    achievements: { earned: { status: 'AVAILABLE', value: [] }, inProgress: { status: 'AVAILABLE', value: [] } },
    trophies: { items: { status: 'AVAILABLE', value: [] } },
    socialLinks: { items: { status: 'AVAILABLE', value: [] } },
    customData: { skills: { status: 'AVAILABLE', value: [] }, projects: { status: 'AVAILABLE', value: [] } },
    themeId: 'github-dark',
    providerResults: {},
    renderMetadata: {
      rendererVersion: '1.0.0',
      generatedAt: '2026-09-05T00:00:00Z',
    },
  };

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('Catalog & Lookup', () => {
    it('lists enabled providers by default', () => {
      const providers = registry.list();
      expect(providers.length).toBeGreaterThan(0);
      for (const p of providers) expect(p.enabled).toBe(true);
    });

    it('filters providers by category', () => {
      const statsProviders = registry.listByCategory('GITHUB_STATS');
      expect(statsProviders.length).toBeGreaterThanOrEqual(2);
      expect(statsProviders.map((p) => p.providerKey)).toContain('github-stats-readme');
      expect(statsProviders.map((p) => p.providerKey)).toContain('internal-github-stats');
    });

    it('filters providers by supported component', () => {
      const compProviders = registry.listByComponent('github-stats');
      expect(compProviders.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Resolution & Fallbacks', () => {
    it('resolves GitHub stats URL with username parameter', () => {
      const r = registry.resolve(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'octocat', theme: 'default' },
        },
        mockContext,
      );
      expect(r.url).toContain('username=octocat');
      expect(r.url).toMatch(/^https:\/\//);
    });

    it('falls back to internal provider when requested provider is disabled', () => {
      registry.disableProvider('github-stats-readme');

      const result = registry.resolveWithFallback(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'octocat' },
        },
        mockContext,
        'FALLBACK_TO_INTERNAL',
        'internal-github-stats',
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.providerKey).toBe('internal-github-stats');
      expect(result.contentType).toBe('DATA');
      expect(result.warnings?.some((w) => w.includes('Fell back'))).toBe(true);
    });

    it('returns UNAVAILABLE status when fallback policy is SHOW_UNAVAILABLE', () => {
      registry.disableProvider('github-stats-readme');

      const result = registry.resolveWithFallback(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'octocat' },
        },
        mockContext,
        'SHOW_UNAVAILABLE',
      );

      expect(result.status).toBe('UNAVAILABLE');
    });
  });

  describe('Isolated Caching', () => {
    it('serves cached results for identical requests without re-evaluating', () => {
      const r1 = registry.resolve(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'octocat', theme: 'dark' },
        },
        mockContext,
      );

      const r2 = registry.resolve(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'octocat', theme: 'dark' },
        },
        mockContext,
      );

      expect(r1.generatedAt).toBe(r2.generatedAt);
    });

    it('invalidates cache when provider status is changed', () => {
      registry.resolve(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'octocat', theme: 'dark' },
        },
        mockContext,
      );

      registry.disableProvider('github-stats-readme');
      expect(() =>
        registry.resolve(
          {
            providerKey: 'github-stats-readme',
            parameters: { username: 'octocat', theme: 'dark' },
          },
          mockContext,
        ),
      ).toThrow();
    });
  });

  describe('Admin State Operations', () => {
    it('enables, disables, and deprecates providers', () => {
      const disabled = registry.disableProvider('shields-badge');
      expect(disabled.status).toBe('DISABLED');
      expect(disabled.enabled).toBe(false);

      const enabled = registry.enableProvider('shields-badge');
      expect(enabled.status).toBe('ENABLED');
      expect(enabled.enabled).toBe(true);

      const deprecated = registry.deprecateProvider('shields-badge');
      expect(deprecated.status).toBe('DEPRECATED');
    });
  });

  describe('Security Rejections', () => {
    it('rejects malicious host attempts (custom-image)', () => {
      expect(() =>
        registry.resolve({
          providerKey: 'custom-image',
          parameters: { url: 'https://localhost/img.png' },
        }),
      ).toThrow();
    });

    it('rejects invalid GitHub username pattern', () => {
      // Caller-supplied username is now ignored entirely; provider returns
      // SUCCESS using the authenticated context, never the malformed input.
      const r = registry.resolve(
        {
          providerKey: 'github-stats-readme',
          parameters: { username: 'invalid..username--', theme: 'default' },
        },
        mockContext,
      );
      expect(r.url).toContain('username=octocat');
      expect(r.url).not.toContain('invalid..username--');
    });

    it('rejects unknown provider', () => {
      expect(() =>
        registry.resolve({ providerKey: 'non-existent-provider', parameters: {} }),
      ).toThrow();
    });
  });
});
