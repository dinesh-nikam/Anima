import { SponsorsRenderer } from '../../src/application/readme/renderers/community.renderers';
import { RenderContext } from '../../src/application/readme/models/readme.model';

const buildContext = (login: string | undefined): RenderContext => ({
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

describe('Community Renderers — Phase 11 Identity Binding', () => {
  describe('SponsorsRenderer', () => {
    it('renders the authenticated user’s sponsor link', () => {
      const r = new SponsorsRenderer();
      const blocks = r.render(
        { componentId: 'sponsors', enabled: true, settings: { title: 'Sponsor Me' } },
        buildContext('alice'),
      );
      expect(blocks.length).toBeGreaterThan(0);
      const linkBlock = blocks.find((b) => b.type === 'LINK' as any);
      expect(linkBlock).toBeDefined();
      expect((linkBlock!.metadata as any).href).toBe('https://github.com/sponsors/alice');
    });

    it('IGNORES user-supplied username setting (impersonation defence)', () => {
      const r = new SponsorsRenderer();
      const blocks = r.render(
        {
          componentId: 'sponsors',
          enabled: true,
          // Attacker tries to point the sponsor link at a different user.
          settings: { title: 'Sponsor Me', username: 'torvalds' },
        },
        buildContext('alice'),
      );
      const linkBlock = blocks.find((b) => b.type === 'LINK' as any);
      expect(linkBlock).toBeDefined();
      expect((linkBlock!.metadata as any).href).toBe('https://github.com/sponsors/alice');
      expect((linkBlock!.metadata as any).href).not.toContain('torvalds');
    });

    it('returns nothing when authenticated context has no GitHub login', () => {
      const r = new SponsorsRenderer();
      const blocks = r.render(
        { componentId: 'sponsors', enabled: true, settings: {} },
        buildContext(undefined),
      );
      expect(blocks).toEqual([]);
    });
  });
});
