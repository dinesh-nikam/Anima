import { ReadmePublicationService } from '../../src/application/readme/services/readme-publication.service';
import { ReadmeDraftService } from '../../src/application/readme/readme-draft.service';
import { ReadmeDiffService } from '../../src/application/readme/services/readme-diff.service';
import { GithubClient } from '../../src/integration/github.client';
import { EncryptionService } from '../../src/security/encryption.service';
import { ProviderRegistry } from '../../src/application/readme/providers/provider.registry';
import { ReadmeComponentRegistry } from '../../src/application/readme/registry/component-registry.service';
import { ThemeRegistry } from '../../src/application/readme/themes/theme.registry';
import { TemplateRegistry } from '../../src/application/readme/templates/template.registry';
import { MarkdownRenderer } from '../../src/application/readme/renderers/markdown.renderer';
import { HeroRenderer } from '../../src/application/readme/renderers/hero.renderer';
import { AboutRenderer, ProfileSummaryRenderer, ContactRenderer } from '../../src/application/readme/renderers/profile.renderers';
import {
  GithubStatsRenderer,
  StreakStatsRenderer,
  TopLanguagesRenderer,
  ContributionStatsRenderer,
} from '../../src/application/readme/renderers/statistics.renderers';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  StalePublicationPreviewException,
  GithubAuthRequiredException,
} from '../../src/application/readme/exceptions/publish.exceptions';

describe('Phase 10 — Critical Enterprise End-to-End System Scenarios', () => {
  let publicationService: ReadmePublicationService;
  let draftService: ReadmeDraftService;
  let diffService: ReadmeDiffService;
  let providerRegistry: ProviderRegistry;
  let componentRegistry: ReadmeComponentRegistry;
  let themeRegistry: ThemeRegistry;
  let templateRegistry: TemplateRegistry;
  let markdownRenderer: MarkdownRenderer;
  let mockContextBuilder: any;
  let mockGithubClient: any;
  let mockEncryptionService: any;
  let mockPrisma: any;

  beforeEach(() => {
    themeRegistry = new ThemeRegistry();
    templateRegistry = new TemplateRegistry();
    componentRegistry = new ReadmeComponentRegistry();
    markdownRenderer = new MarkdownRenderer();
    diffService = new ReadmeDiffService();
    providerRegistry = new ProviderRegistry();

    // Register all component renderers
    componentRegistry.register(new HeroRenderer());
    componentRegistry.register(new AboutRenderer());
    componentRegistry.register(new ProfileSummaryRenderer());
    componentRegistry.register(new ContactRenderer());
    componentRegistry.register(new GithubStatsRenderer(providerRegistry));
    componentRegistry.register(new StreakStatsRenderer(providerRegistry));
    componentRegistry.register(new TopLanguagesRenderer(providerRegistry));
    componentRegistry.register(new ContributionStatsRenderer());

    mockContextBuilder = {
      build: jest.fn().mockResolvedValue({
        profile: {
          displayName: 'Carxen',
          bio: 'Building reliable distributed systems.',
          githubLogin: 'carxen',
        },
        statistics: {
          repositories: { status: 'AVAILABLE', value: 42 },
          followers: { status: 'AVAILABLE', value: 128 },
          following: { status: 'AVAILABLE', value: 10 },
          stars: { status: 'AVAILABLE', value: 512 },
          forks: { status: 'AVAILABLE', value: 64 },
          contributions: { status: 'AVAILABLE', value: 2450, sourceUpdatedAt: '2026-01-01' },
          pullRequests: { status: 'AVAILABLE', value: 80 },
          issues: { status: 'AVAILABLE', value: 20 },
          reviews: { status: 'AVAILABLE', value: 50 },
        },
        streak: {
          current: { status: 'AVAILABLE', value: 15 },
          longest: { status: 'AVAILABLE', value: 45 },
        },
        languages: {
          items: {
            status: 'AVAILABLE',
            value: [{ name: 'TypeScript', percentage: 70, bytes: 70000 }],
          },
        },
        activity: { items: { status: 'AVAILABLE', value: [] } },
        achievements: { items: { status: 'AVAILABLE', value: [] } },
        trophies: { items: { status: 'AVAILABLE', value: [] } },
        renderMetadata: { generatedAt: new Date().toISOString() },
      }),
    };

    mockEncryptionService = {
      encrypt: jest.fn((t: string) => `enc_${t}`),
      decrypt: jest.fn((t: string) => t.replace('enc_', '')),
    };

    mockGithubClient = {
      verifyWriteAccess: jest.fn().mockResolvedValue({
        canWrite: true,
        defaultBranch: 'main',
        isArchived: false,
        isDisabled: false,
        repoId: 1001,
        fullName: 'carxen/carxen',
      }),
      getBranch: jest.fn().mockResolvedValue({
        name: 'main',
        commit: { sha: 'branch-sha-abc', url: '' },
        protected: false,
      }),
      getRepositoryContent: jest.fn().mockResolvedValue({
        exists: true,
        name: 'README.md',
        path: 'README.md',
        sha: 'initial-file-sha-111',
        content: '# Old Profile README\n\nSome outdated bio.',
      }),
      createOrUpdateRepositoryFile: jest.fn().mockResolvedValue({
        commit: {
          sha: 'commit-sha-777',
          html_url: 'https://github.com/carxen/carxen/commit/commit-sha-777',
        },
        content: {
          sha: 'final-file-sha-999',
          path: 'README.md',
        },
      }),
    };

    // Shared mock database state
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-100', role: 'USER', status: 'ACTIVE' }),
      },
      githubAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'gh-acc-100',
          userId: 'user-100',
          githubLogin: 'carxen',
          tokens: [{ accessTokenEncrypted: 'enc_ghp_valid_token_123' }],
          repos: [
            {
              id: 'repo-1',
              githubRepoId: '1001',
              owner: 'carxen',
              name: 'carxen',
              fullName: 'carxen/carxen',
              visibility: 'PUBLIC',
              defaultBranch: 'main',
              isArchived: false,
              isDisabled: false,
              pushedAt: new Date(),
            },
          ],
        }),
      },
      githubRepository: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'repo-1',
          githubRepoId: '1001',
          owner: 'carxen',
          name: 'carxen',
          fullName: 'carxen/carxen',
          defaultBranch: 'main',
          githubAccount: { userId: 'user-100' },
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-1',
          githubRepoId: '1001',
          owner: 'carxen',
          name: 'carxen',
          fullName: 'carxen/carxen',
          defaultBranch: 'main',
          githubAccount: { userId: 'user-100' },
        }),
      },
      readmeDraft: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      readmePublishIntent: {
        create: jest.fn((args: any) => Promise.resolve({ id: 'intent-default-id', ...args?.data })),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      readmeVersion: {
        create: jest.fn(),
      },
      readmePublication: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    // Instantiate services
    draftService = new ReadmeDraftService(
      componentRegistry,
      markdownRenderer,
      themeRegistry,
      templateRegistry,
      mockContextBuilder,
      providerRegistry,
    );
    (draftService as any).prisma = mockPrisma;

    publicationService = new ReadmePublicationService(
      mockGithubClient as any,
      mockEncryptionService as any,
      draftService,
      diffService,
    );
    (publicationService as any).prisma = mockPrisma;
  });

  // ==========================================================================
  // SCENARIO 1 (#63): Full End-to-End Success Lifecycle
  // ==========================================================================
  describe('Requirement #63: Critical Full End-to-End Success Lifecycle', () => {
    it('executes full pipeline: template -> render -> preview -> diff -> confirm -> publish -> audit', async () => {
      const draftState = {
        id: 'draft-e2e-1',
        userId: 'user-100',
        name: 'Enterprise Portfolio',
        templateId: 'professional-developer',
        themeId: 'github-dark',
        revision: 1,
        status: 'VALID',
        sections: [
          {
            id: 'sec-1',
            componentKey: 'hero',
            configuration: { alignment: 'center', showBio: true, showAvatar: false },
            enabled: true,
            displayOrder: 10,
          },
          {
            id: 'sec-2',
            componentKey: 'about',
            configuration: { title: 'About Me', alignment: 'center' },
            enabled: true,
            displayOrder: 20,
          },
          {
            id: 'sec-3',
            componentKey: 'contribution-stats',
            configuration: { title: 'Contributions', alignment: 'center' },
            enabled: true,
            displayOrder: 30,
          },
        ],
      };

      mockPrisma.readmeDraft.findFirst.mockResolvedValue(draftState);
      mockPrisma.readmeDraft.findUnique.mockResolvedValue(draftState);

      // 1. Generate Publication Preview & Diff
      const previewDto = {
        repositoryId: 'repo-1',
        owner: 'carxen',
        repo: 'carxen',
        branch: 'main',
        path: 'README.md',
        commitMessage: 'docs: deploy verified profile README',
      };

      let storedIntent: any = null;
      mockPrisma.readmePublishIntent.create.mockImplementation((args: any) => {
        storedIntent = { id: 'intent-e2e-100', ...args.data };
        return Promise.resolve(storedIntent);
      });

      const previewRes = await publicationService.createPublicationPreview('user-100', 'draft-e2e-1', previewDto);

      expect(previewRes).toBeDefined();
      expect(previewRes.intentId).toBe('intent-e2e-100');
      expect(previewRes.changeStatus).toBe('CHANGED');
      expect(previewRes.diff.summary.additions).toBeGreaterThan(0);
      expect(previewRes.currentSha).toBe('initial-file-sha-111');
      expect(mockGithubClient.getRepositoryContent).toHaveBeenCalledWith(
        'ghp_valid_token_123',
        'carxen',
        'carxen',
        'README.md',
        'main',
      );

      // 2. Confirm and Publish
      mockPrisma.readmePublishIntent.findUnique.mockResolvedValue(storedIntent);
      mockPrisma.readmePublishIntent.findFirst.mockResolvedValue(storedIntent);
      mockPrisma.readmeVersion.create.mockResolvedValue({ id: 'ver-100' });
      mockPrisma.readmePublication.create.mockResolvedValue({
        id: 'pub-rec-100',
        userId: 'user-100',
        draftId: 'draft-e2e-1',
        versionId: 'ver-100',
        githubRepositoryId: 'repo-1',
        owner: 'carxen',
        repo: 'carxen',
        branch: 'main',
        path: 'README.md',
        previousFileSha: 'initial-file-sha-111',
        publishedFileSha: 'final-file-sha-999',
        commitSha: 'commit-sha-777',
        commitUrl: 'https://github.com/carxen/carxen/commit/commit-sha-777',
        status: 'PUBLISHED',
        isNoOp: false,
        createdAt: new Date(),
        completedAt: new Date(),
        repository: { fullName: 'carxen/carxen' },
      });

      const receipt = await publicationService.confirmAndPublish('user-100', 'draft-e2e-1', {
        intentId: 'intent-e2e-100',
      });

      expect(receipt).toBeDefined();
      expect(receipt.status).toBe('PUBLISHED');
      expect(receipt.commitSha).toBe('commit-sha-777');
      expect(receipt.publishedFileSha).toBe('final-file-sha-999');
      expect(receipt.isNoOp).toBe(false);

      // 3. Verify GitHub API write called with exact expected SHA
      expect(mockGithubClient.createOrUpdateRepositoryFile).toHaveBeenCalledWith(
        'ghp_valid_token_123',
        'carxen',
        'carxen',
        'README.md',
        expect.objectContaining({
          branch: 'main',
          sha: 'initial-file-sha-111',
          message: 'docs: deploy verified profile README',
        }),
      );

      // 4. Verify Audit Logs captured
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actor: 'user-100',
            result: 'SUCCESS',
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // SCENARIO 2 (#64): Stale Preview / Concurrency Rejection
  // ==========================================================================
  describe('Requirement #64: Second End-to-End Failure Test (Stale Preview Conflict)', () => {
    it('rejects publication when GitHub README has been modified concurrently after preview', async () => {
      const draftState = {
        id: 'draft-e2e-2',
        userId: 'user-100',
        name: 'Concurrent Draft',
        sections: [{ id: 's1', componentKey: 'hero', configuration: { alignment: 'center' }, enabled: true, displayOrder: 10 }],
      };
      mockPrisma.readmeDraft.findFirst.mockResolvedValue(draftState);
      mockPrisma.readmeDraft.findUnique.mockResolvedValue(draftState);

      const intent = {
        id: 'intent-stale-200',
        userId: 'user-100',
        draftId: 'draft-e2e-2',
        githubRepositoryId: 'repo-1',
        owner: 'carxen',
        repo: 'carxen',
        branch: 'main',
        path: 'README.md',
        expectedCurrentSha: 'initial-file-sha-111', // Intent captured when file was sha-111
        renderedContentHash: 'hash-abc',
        canonicalMarkdown: '# New Markdown',
        commitMessage: 'update',
        status: 'PREVIEWED',
        expiresAt: new Date(Date.now() + 600000),
      };
      mockPrisma.readmePublishIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.readmePublishIntent.findFirst.mockResolvedValue(intent);

      // Simulate concurrent GitHub update: head content now has different SHA
      mockGithubClient.getRepositoryContent.mockResolvedValueOnce({
        exists: true,
        path: 'README.md',
        sha: 'concurrent-remote-sha-888', // Changed concurrently on GitHub!
        content: '# Changed by external commit',
      });

      await expect(
        publicationService.confirmAndPublish('user-100', 'draft-e2e-2', { intentId: 'intent-stale-200' }),
      ).rejects.toThrow(StalePublicationPreviewException);

      // Must NOT commit to GitHub
      expect(mockGithubClient.createOrUpdateRepositoryFile).not.toHaveBeenCalled();

      // Audit failure logged
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'README_PUBLICATION_CONFLICT',
            result: 'FAILURE',
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // SCENARIO 3 (#65): OAuth Expiration & Reauthorization
  // ==========================================================================
  describe('Requirement #65: Third End-to-End Failure Test (Expired Token Safe Handling)', () => {
    it('detects GitHub 401 authentication failure and enters safe reauthorization state', async () => {
      const draftState = {
        id: 'draft-e2e-3',
        userId: 'user-100',
        name: 'Auth Draft',
        sections: [{ id: 's1', componentKey: 'hero', configuration: { alignment: 'center' }, enabled: true, displayOrder: 10 }],
      };
      mockPrisma.readmeDraft.findFirst.mockResolvedValue(draftState);
      mockPrisma.readmeDraft.findUnique.mockResolvedValue(draftState);

      mockGithubClient.verifyWriteAccess.mockRejectedValueOnce({
        status: 401,
        message: 'GitHub token invalid or expired',
      });

      const previewDto = {
        repositoryId: 'repo-1',
        owner: 'carxen',
        repo: 'carxen',
        branch: 'main',
        path: 'README.md',
      };

      await expect(
        publicationService.createPublicationPreview('user-100', 'draft-e2e-3', previewDto),
      ).rejects.toThrow(GithubAuthRequiredException);

      // Verify audit recorded REAUTH_REQUIRED
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'README_PUBLICATION_REAUTH_REQUIRED',
            result: 'FAILURE',
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // SCENARIO 4 (#66): External Provider Fallback & Degraded State
  // ==========================================================================
  describe('Requirement #66: Fourth End-to-End Failure Test (External Provider Fallback)', () => {
    it('gracefully falls back to internal provider data with warnings when primary provider is disabled', () => {
      providerRegistry.disableProvider('github-streak-stats');

      const renderContext = {
        profile: { githubLogin: 'carxen', name: 'Carxen' },
        statistics: {
          contributions: { value: 2450, status: 'AVAILABLE' },
        },
      };

      const result = providerRegistry.resolveWithFallback(
        { providerKey: 'github-streak-stats', parameters: { username: 'carxen' } },
        renderContext as any,
        'FALLBACK_TO_INTERNAL',
        'internal-contributions',
      );

      expect(result.status).toBe('SUCCESS');
      expect(result.providerKey).toBe('internal-contributions');
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((w) => w.includes('Fell back'))).toBe(true);
      expect((result.data as any).totalContributions).toBe(2450);
    });
  });

  // ==========================================================================
  // SCENARIO 5 (#67): Multi-Browser Draft Concurrency Conflict
  // ==========================================================================
  describe('Requirement #67: Fifth End-to-End Failure Test (Draft Concurrency Conflict)', () => {
    it('prevents silent overwrite when two sessions attempt to save from the same revision', async () => {
      const serverDraft = {
        id: 'draft-concurrency',
        userId: 'user-100',
        name: 'My Draft',
        revision: 11, // Server is already on rev 11
        status: 'VALID',
        sections: [],
      };
      mockPrisma.readmeDraft.findFirst.mockResolvedValue(serverDraft);
      mockPrisma.readmeDraft.findUnique.mockResolvedValue(serverDraft);

      // Browser B attempts to save expecting revision 10 (stale client)
      try {
        await draftService.updateDraft('user-100', 'draft-concurrency', {
          name: 'Overwrite Attempt',
          expectedRevision: 10,
        });
        fail('Should have thrown conflict exception');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
        expect(err.getResponse().code).toBe('README_DRAFT_CONFLICT');
      }

      // Verify no DB update occurred
      expect(mockPrisma.readmeDraft.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SCENARIO 6 (#68): Ambiguous Network Drop & Verification
  // ==========================================================================
  describe('Requirement #68: Sixth End-to-End Failure Test (Ambiguous Mutation Re-check)', () => {
    it('verifies final repository state and handles no-op if content was already written', async () => {
      const draftState = {
        id: 'draft-e2e-6',
        userId: 'user-100',
        name: 'Idempotent Draft',
        templateId: 'professional-developer',
        themeId: 'github-dark',
        sections: [{ id: 's1', componentKey: 'hero', configuration: { alignment: 'center', showBio: true }, enabled: true, displayOrder: 10 }],
      };
      mockPrisma.readmeDraft.findFirst.mockResolvedValue(draftState);
      mockPrisma.readmeDraft.findUnique.mockResolvedValue(draftState);

      // Render the markdown first to know what to mock as already existing on GitHub
      const previewRes = await draftService.previewDraft('user-100', 'draft-e2e-6');
      const expectedMd = previewRes.markdown;

      mockGithubClient.getRepositoryContent.mockResolvedValueOnce({
        exists: true,
        path: 'README.md',
        sha: 'matching-sha-555',
        content: expectedMd, // Exact match on GitHub
      });

      const preview = await publicationService.createPublicationPreview('user-100', 'draft-e2e-6', {
        repositoryId: 'repo-1',
        owner: 'carxen',
        repo: 'carxen',
        branch: 'main',
        path: 'README.md',
      });

      expect(preview.changeStatus).toBe('UNCHANGED');
      expect(preview.diff.summary.additions).toBe(0);
      expect(preview.diff.summary.deletions).toBe(0);
    });
  });
});
