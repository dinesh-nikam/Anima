import {
  InternalGithubStatsProvider,
  InternalContributionsProvider,
  InternalLanguagesProvider,
  InternalAchievementsProvider,
  InternalTrophiesProvider,
  InternalActivityProvider,
} from '../../src/application/readme/providers/internal-providers';
import { RenderContext } from '../../src/application/readme/models/readme.model';

describe('Built-in Internal Authoritative Providers', () => {
  const mockContext: RenderContext = {
    profile: {
      githubLogin: 'octocat',
      displayName: 'The Octocat',
    },
    statistics: {
      repositories: { status: 'AVAILABLE', value: 42 },
      followers: { status: 'AVAILABLE', value: 1000 },
      following: { status: 'AVAILABLE', value: 10 },
      stars: { status: 'AVAILABLE', value: 500 },
      forks: { status: 'AVAILABLE', value: 120 },
      contributions: { status: 'AVAILABLE', value: 1337, sourceUpdatedAt: '2026-09-05T00:00:00.000Z' },
      pullRequests: { status: 'AVAILABLE', value: 85 },
      issues: { status: 'AVAILABLE', value: 30 },
      reviews: { status: 'AVAILABLE', value: 45 },
    },
    streak: {
      current: { status: 'AVAILABLE', value: 14 },
      longest: { status: 'AVAILABLE', value: 60 },
    },
    languages: {
      items: {
        status: 'AVAILABLE',
        value: [
          { name: 'TypeScript', percentage: 65.5, bytes: 100000 },
          { name: 'Rust', percentage: 24.5, bytes: 40000 },
          { name: 'Go', percentage: 10.0, bytes: 15000 },
        ],
      },
    },
    repositories: { items: { status: 'AVAILABLE', value: [] } },
    activity: {
      items: {
        status: 'AVAILABLE',
        value: [
          { type: 'PushEvent', repositoryName: 'octocat/hello', occurredAt: '2026-09-05T12:00:00Z' },
        ],
      },
    },
    achievements: {
      earned: {
        status: 'AVAILABLE',
        value: [
          { code: 'PR_CHAMP', name: 'PR Champion', description: 'Merged 50+ PRs', category: 'PULL_REQUESTS', rarity: 'RARE' },
        ],
      },
      inProgress: { status: 'AVAILABLE', value: [] },
    },
    trophies: {
      items: {
        status: 'AVAILABLE',
        value: [
          { code: 'CONTRIBUTOR_GOLD', name: 'Master Contributor', category: 'CONTRIBUTIONS', level: 'GOLD' },
        ],
      },
    },
    socialLinks: { items: { status: 'AVAILABLE', value: [] } },
    customData: {
      skills: { status: 'AVAILABLE', value: ['TypeScript', 'Node.js'] },
      projects: { status: 'AVAILABLE', value: [] },
    },
    themeId: 'github-dark',
    providerResults: {},
    renderMetadata: {
      rendererVersion: '1.0.0',
      generatedAt: '2026-09-05T00:00:00.000Z',
    },
  };

  it('InternalGithubStatsProvider resolves authoritative metrics', () => {
    const provider = new InternalGithubStatsProvider();
    const result = provider.resolve({ providerKey: 'internal-github-stats', parameters: {} }, mockContext);

    expect(result.status).toBe('SUCCESS');
    expect(result.contentType).toBe('DATA');
    expect(result.data).toBeDefined();
    const data = result.data as any;
    expect(data.username).toBe('octocat');
    expect(data.metrics.contributions).toBe(1337);
    expect(data.metrics.repositories).toBe(42);
    expect(data.metrics.stars).toBe(500);
  });

  it('InternalContributionsProvider resolves contribution counts', () => {
    const provider = new InternalContributionsProvider();
    const result = provider.resolve({ providerKey: 'internal-contributions', parameters: { days: 90 } }, mockContext);

    expect(result.status).toBe('SUCCESS');
    const data = result.data as any;
    expect(data.totalContributions).toBe(1337);
  });

  it('InternalLanguagesProvider resolves top languages', () => {
    const provider = new InternalLanguagesProvider();
    const result = provider.resolve({ providerKey: 'internal-languages', parameters: { limit: 2 } }, mockContext);

    expect(result.status).toBe('SUCCESS');
    const data = result.data as any;
    expect(data.languages.length).toBe(2);
    expect(data.languages[0].name).toBe('TypeScript');
  });

  it('InternalAchievementsProvider resolves earned achievements', () => {
    const provider = new InternalAchievementsProvider();
    const result = provider.resolve({ providerKey: 'internal-achievements', parameters: {} }, mockContext);

    expect(result.status).toBe('SUCCESS');
    const data = result.data as any;
    expect(data.earned.length).toBe(1);
    expect(data.earned[0].name).toBe('PR Champion');
  });

  it('InternalTrophiesProvider resolves trophy wall', () => {
    const provider = new InternalTrophiesProvider();
    const result = provider.resolve({ providerKey: 'internal-trophies', parameters: {} }, mockContext);

    expect(result.status).toBe('SUCCESS');
    const data = result.data as any;
    expect(data.trophies.length).toBe(1);
    expect(data.trophies[0].level).toBe('GOLD');
  });

  it('InternalActivityProvider resolves activity events', () => {
    const provider = new InternalActivityProvider();
    const result = provider.resolve({ providerKey: 'internal-activity', parameters: { limit: 5 } }, mockContext);

    expect(result.status).toBe('SUCCESS');
    const data = result.data as any;
    expect(data.items.length).toBe(1);
    expect(data.items[0].type).toBe('PushEvent');
  });
});
