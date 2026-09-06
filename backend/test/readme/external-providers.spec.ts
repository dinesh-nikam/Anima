import {
  ExternalGithubStatsProvider,
  ExternalStreakStatsProvider,
  ExternalTopLanguagesProvider,
  ExternalProfileTrophyProvider,
  ExternalShieldsBadgeProvider,
  ExternalVisitorCounterProvider,
  ExternalCustomImageProvider,
} from '../../src/application/readme/providers/external-providers';
import { RenderContext } from '../../src/application/readme/models/readme.model';

const buildContext = (login: string): RenderContext => ({
  profile: {
    displayName: login,
    bio: '',
    githubLogin: login,
    avatarUrl: undefined,
    profileUrl: undefined,
    company: undefined,
    location: undefined,
    website: undefined,
    twitterUsername: undefined,
  },
  statistics: {} as any,
  streak: {} as any,
  languages: { items: { status: 'UNAVAILABLE' } },
  repositories: { items: { status: 'UNAVAILABLE' } },
  activity: { items: { status: 'UNAVAILABLE' } },
  achievements: { earned: { status: 'UNAVAILABLE' }, inProgress: { status: 'UNAVAILABLE' } },
  trophies: { items: { status: 'UNAVAILABLE' } },
  socialLinks: { items: { status: 'UNAVAILABLE' } },
  customData: {
    skills: { status: 'UNAVAILABLE' },
    projects: { status: 'UNAVAILABLE' },
    currentFocus: undefined,
    quote: undefined,
  },
  themeId: 'github-dark',
  providerResults: {},
  renderMetadata: { rendererVersion: 'test', generatedAt: new Date().toISOString() },
});

describe('Dynamic External Providers', () => {
  it('ExternalGithubStatsProvider resolves safe URL using context githubLogin', () => {
    const p = new ExternalGithubStatsProvider();
    const result = p.resolve(
      { providerKey: 'github-stats-readme', parameters: { theme: 'tokyonight', showIcons: true } },
      buildContext('octocat'),
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.contentType).toBe('IMAGE_URL');
    expect(result.url).toContain('https://github-readme-stats.vercel.app/api?');
    expect(result.url).toContain('username=octocat');
    expect(result.url).toContain('theme=tokyonight');
  });

  it('ExternalStreakStatsProvider resolves streak stats URL using context githubLogin', () => {
    const p = new ExternalStreakStatsProvider();
    const result = p.resolve(
      { providerKey: 'github-streak-stats', parameters: { theme: 'radical' } },
      buildContext('octocat'),
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain('https://streak-stats.demolab.com?user=octocat');
    expect(result.url).toContain('theme=radical');
  });

  it('ExternalTopLanguagesProvider resolves top languages card URL using context githubLogin', () => {
    const p = new ExternalTopLanguagesProvider();
    const result = p.resolve(
      { providerKey: 'github-top-langs', parameters: { layout: 'compact', theme: 'dark' } },
      buildContext('octocat'),
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain('github-readme-stats.vercel.app/api/top-langs');
    expect(result.url).toContain('username=octocat');
    expect(result.url).toContain('layout=compact');
  });

  it('ExternalProfileTrophyProvider resolves trophy card URL using context githubLogin', () => {
    const p = new ExternalProfileTrophyProvider();
    const result = p.resolve(
      { providerKey: 'github-profile-trophy', parameters: { theme: 'flat', noFrame: true } },
      buildContext('octocat'),
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain('github-profile-trophy.vercel.app');
    expect(result.url).toContain('username=octocat');
    expect(result.url).toContain('no-frame=true');
  });

  it('ExternalShieldsBadgeProvider escapes and formats badge URLs', () => {
    const p = new ExternalShieldsBadgeProvider();
    const result = p.resolve({
      providerKey: 'shields-badge',
      parameters: { label: 'coverage', message: '98%', color: 'brightgreen', style: 'flat' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain('img.shields.io/badge/coverage-98%25-brightgreen?style=flat');
  });

  it('ExternalVisitorCounterProvider generates visitor count badge', () => {
    const p = new ExternalVisitorCounterProvider();
    const result = p.resolve({
      providerKey: 'visitor-counter',
      parameters: { page: 'octocat.profile', color: 'blue' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain('visitor-badge.laobi.workers.dev/?page=octocat.profile&color=blue');
  });

  it('ExternalCustomImageProvider validates direct HTTPS URLs', () => {
    const p = new ExternalCustomImageProvider();
    const result = p.resolve({
      providerKey: 'custom-image',
      parameters: { url: 'https://images.unsplash.com/photo-123' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.url).toBe('https://images.unsplash.com/photo-123');
  });
});

// ============================================================================
// SECURITY — Phase 11 Finding: Username Impersonation in External Providers
// ============================================================================
// These tests verify that caller-supplied parameters.username cannot override
// the authenticated user's identity (RenderContext.profile.githubLogin).
// A user must NOT be able to render another GitHub user's trophies / stats /
// languages / streak into their own published README.
describe('Phase 11 — External Providers: Authenticated Identity Binding', () => {
  const maliciousParameters = [
    { providerKey: 'github-stats-readme', parameters: { username: 'torvalds', theme: 'tokyonight' } },
    { providerKey: 'github-streak-stats', parameters: { username: 'torvalds', theme: 'radical' } },
    { providerKey: 'github-top-langs', parameters: { username: 'torvalds', layout: 'compact' } },
    { providerKey: 'github-profile-trophy', parameters: { username: 'torvalds', noFrame: true } },
  ];

  const victimContext = buildContext('alice'); // authenticated user is alice
  const victimLoginEncoded = 'alice';
  const attackerLoginEncoded = 'torvalds';

  it('ExternalGithubStatsProvider ignores caller-supplied username', () => {
    const p = new ExternalGithubStatsProvider();
    const result = p.resolve(maliciousParameters[0], victimContext);
    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain(`username=${victimLoginEncoded}`);
    expect(result.url).not.toContain(`username=${attackerLoginEncoded}`);
  });

  it('ExternalStreakStatsProvider ignores caller-supplied username', () => {
    const p = new ExternalStreakStatsProvider();
    const result = p.resolve(maliciousParameters[1], victimContext);
    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain(`user=${victimLoginEncoded}`);
    expect(result.url).not.toContain(`user=${attackerLoginEncoded}`);
  });

  it('ExternalTopLanguagesProvider ignores caller-supplied username', () => {
    const p = new ExternalTopLanguagesProvider();
    const result = p.resolve(maliciousParameters[2], victimContext);
    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain(`username=${victimLoginEncoded}`);
    expect(result.url).not.toContain(`username=${attackerLoginEncoded}`);
  });

  it('ExternalProfileTrophyProvider ignores caller-supplied username', () => {
    const p = new ExternalProfileTrophyProvider();
    const result = p.resolve(maliciousParameters[3], victimContext);
    expect(result.status).toBe('SUCCESS');
    expect(result.url).toContain(`username=${victimLoginEncoded}`);
    expect(result.url).not.toContain(`username=${attackerLoginEncoded}`);
  });

  it('All four external providers return UNAVAILABLE when context has no githubLogin', () => {
    const emptyContext = buildContext('') as RenderContext;
    (emptyContext.profile as any).githubLogin = undefined;

    for (const req of maliciousParameters) {
      let provider;
      switch (req.providerKey) {
        case 'github-stats-readme': provider = new ExternalGithubStatsProvider(); break;
        case 'github-streak-stats': provider = new ExternalStreakStatsProvider(); break;
        case 'github-top-langs': provider = new ExternalTopLanguagesProvider(); break;
        case 'github-profile-trophy': provider = new ExternalProfileTrophyProvider(); break;
      }
      const result = provider!.resolve(req, emptyContext);
      expect(result.status).toBe('UNAVAILABLE');
      expect(result.url).toBeUndefined();
    }
  });
});
