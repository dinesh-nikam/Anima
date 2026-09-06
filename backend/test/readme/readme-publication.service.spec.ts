import { ReadmePublicationService } from '../../src/application/readme/services/readme-publication.service';
import { GithubClient } from '../../src/integration/github.client';
import { EncryptionService } from '../../src/security/encryption.service';
import { ReadmeDraftService } from '../../src/application/readme/readme-draft.service';
import { ReadmeDiffService } from '../../src/application/readme/services/readme-diff.service';
import {
  StalePublicationPreviewException,
  PublicationIntentExpiredException,
  RepositoryAccessDeniedException,
} from '../../src/application/readme/exceptions/publish.exceptions';

describe('ReadmePublicationService', () => {
  let service: ReadmePublicationService;
  let mockGithubClient: Partial<GithubClient>;
  let mockEncryptionService: Partial<EncryptionService>;
  let mockDraftService: Partial<ReadmeDraftService>;
  let diffService: ReadmeDiffService;
  let mockPrisma: any;

  beforeEach(() => {
    diffService = new ReadmeDiffService();

    mockGithubClient = {
      verifyWriteAccess: jest.fn().mockResolvedValue({
        canWrite: true,
        defaultBranch: 'main',
        isArchived: false,
        isDisabled: false,
        repoId: 101,
        fullName: 'testuser/profile-repo',
      }),
      getBranch: jest.fn().mockResolvedValue({
        name: 'main',
        commit: { sha: 'branch-head-sha', url: '' },
        protected: false,
      }),
      getRepositoryContent: jest.fn().mockResolvedValue({
        exists: true,
        name: 'README.md',
        path: 'README.md',
        sha: 'current-sha-111',
        content: '# Old Profile Content',
      }),
      createOrUpdateRepositoryFile: jest.fn().mockResolvedValue({
        commit: {
          sha: 'published-commit-sha-999',
          html_url: 'https://github.com/testuser/profile-repo/commit/published-commit-sha-999',
        },
        content: {
          sha: 'new-file-sha-222',
          path: 'README.md',
        },
      }),
    };

    mockEncryptionService = {
      encrypt: jest.fn((t) => `enc_${t}`),
      decrypt: jest.fn((t) => t.replace('enc_', '')),
    };

    mockDraftService = {
      getDraft: jest.fn().mockResolvedValue({
        id: 'draft-1',
        userId: 'user-1',
        name: 'Main Profile README',
        revision: 1,
        sections: [],
      }),
      previewDraft: jest.fn().mockResolvedValue({
        markdown: '# Rendered Canonical Profile Markdown\n- Skills: TS, PG',
        metadata: { warnings: [] },
      }),
    };

    mockPrisma = {
      githubAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'gh-acc-1',
          userId: 'user-1',
          githubLogin: 'testuser',
          tokens: [{ accessTokenEncrypted: 'enc_gho_valid_token_123' }],
          repos: [
            {
              id: 'repo-1',
              githubRepoId: '101',
              owner: 'testuser',
              name: 'profile-repo',
              fullName: 'testuser/profile-repo',
              defaultBranch: 'main',
              visibility: 'PUBLIC',
              isArchived: false,
              isDisabled: false,
              pushedAt: new Date(),
            },
          ],
        }),
      },
      githubRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-1',
          githubRepoId: '101',
          owner: 'testuser',
          name: 'profile-repo',
          fullName: 'testuser/profile-repo',
          visibility: 'PUBLIC',
          defaultBranch: 'main',
          githubAccount: { userId: 'user-1' },
        }),
        upsert: jest.fn(),
      },
      readmePublishIntent: {
        create: jest.fn().mockImplementation((args) => ({
          id: 'intent-uuid-123',
          ...args.data,
        })),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation((args) => ({
          id: args.where.id,
          ...args.data,
        })),
      },
      readmePublication: {
        create: jest.fn().mockImplementation((args) => ({
          id: 'pub-uuid-456',
          ...args.data,
        })),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      readmeVersion: {
        create: jest.fn().mockImplementation((args) => ({
          id: 'ver-uuid-789',
          ...args.data,
        })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    service = new ReadmePublicationService(
      mockGithubClient as GithubClient,
      mockEncryptionService as EncryptionService,
      mockDraftService as ReadmeDraftService,
      diffService,
    );

    (service as any).prisma = mockPrisma;
  });

  describe('createPublicationPreview', () => {
    it('should calculate diff, create a 15-minute intent, and audit preview event', async () => {
      const preview = await service.createPublicationPreview('user-1', 'draft-1', {
        repositoryId: 'repo-1',
        branch: 'main',
        path: 'README.md',
      });

      expect(preview.intentId).toBe('intent-uuid-123');
      expect(preview.draftId).toBe('draft-1');
      expect(preview.target.owner).toBe('testuser');
      expect(preview.target.repo).toBe('profile-repo');
      expect(preview.target.branch).toBe('main');
      expect(preview.currentSha).toBe('current-sha-111');
      expect(preview.changeStatus).toBe('CHANGED');
      expect(preview.diff.summary.additions).toBeGreaterThan(0);
      expect(preview.diff.summary.deletions).toBeGreaterThan(0);

      expect(mockPrisma.readmePublishIntent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            draftId: 'draft-1',
            expectedCurrentSha: 'current-sha-111',
            status: 'PREVIEWED',
          }),
        }),
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'README_PUBLICATION_PREVIEWED',
            result: 'SUCCESS',
          }),
        }),
      );
    });

    it('should reject preview if repository write access is denied', async () => {
      (mockGithubClient.verifyWriteAccess as jest.Mock).mockResolvedValueOnce({
        canWrite: false,
        reason: 'Repository is archived',
        isArchived: true,
      });

      await expect(
        service.createPublicationPreview('user-1', 'draft-1', { repositoryId: 'repo-1' }),
      ).rejects.toThrow(RepositoryAccessDeniedException);
    });
  });

  describe('confirmAndPublish — Safe Update Execution', () => {
    it('should safely execute GitHub commit, create internal backups, record publication, and audit success', async () => {
      const intentRecord = {
        id: 'intent-uuid-123',
        userId: 'user-1',
        draftId: 'draft-1',
        githubRepositoryId: 'repo-1',
        owner: 'testuser',
        repo: 'profile-repo',
        branch: 'main',
        path: 'README.md',
        expectedCurrentSha: 'current-sha-111',
        renderedContentHash: diffService.generateContentHash('# Rendered Canonical Profile Markdown\n- Skills: TS, PG'),
        canonicalMarkdown: '# Rendered Canonical Profile Markdown\n- Skills: TS, PG',
        commitMessage: 'docs: update README via VeriFlow',
        diffSummary: { isNoOp: false, status: 'CHANGED' },
        status: 'PREVIEWED',
        expiresAt: new Date(Date.now() + 600000), // Active
      };

      mockPrisma.readmePublishIntent.findUnique.mockResolvedValue(intentRecord);

      const receipt = await service.confirmAndPublish('user-1', 'draft-1', {
        intentId: 'intent-uuid-123',
      });

      expect(receipt.publicationId).toBe('pub-uuid-456');
      expect(receipt.commitSha).toBe('published-commit-sha-999');
      expect(receipt.publishedFileSha).toBe('new-file-sha-222');
      expect(receipt.previousFileSha).toBe('current-sha-111');
      expect(receipt.status).toBe('PUBLISHED');
      expect(receipt.isNoOp).toBe(false);

      // Verify backup version was created for old content
      expect(mockPrisma.readmeVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: 'github-backup',
            canonicalMarkdown: '# Old Profile Content',
            fileSha: 'current-sha-111',
          }),
        }),
      );

      // Verify GitHub write was invoked with current SHA
      expect(mockGithubClient.createOrUpdateRepositoryFile).toHaveBeenCalledWith(
        'gho_valid_token_123',
        'testuser',
        'profile-repo',
        'README.md',
        expect.objectContaining({
          sha: 'current-sha-111',
          branch: 'main',
        }),
      );

      // Verify success audit log
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'README_PUBLICATION_SUCCEEDED',
            result: 'SUCCESS',
          }),
        }),
      );
    });

    it('should reject publication if preview has expired', async () => {
      mockPrisma.readmePublishIntent.findUnique.mockResolvedValue({
        id: 'expired-intent',
        userId: 'user-1',
        draftId: 'draft-1',
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: 'PREVIEWED',
      });

      await expect(
        service.confirmAndPublish('user-1', 'draft-1', { intentId: 'expired-intent' }),
      ).rejects.toThrow(PublicationIntentExpiredException);
    });

    it('should abort and throw StalePublicationPreviewException if target GitHub SHA changed concurrently', async () => {
      mockPrisma.readmePublishIntent.findUnique.mockResolvedValue({
        id: 'intent-123',
        userId: 'user-1',
        draftId: 'draft-1',
        githubRepositoryId: 'repo-1',
        owner: 'testuser',
        repo: 'profile-repo',
        branch: 'main',
        path: 'README.md',
        expectedCurrentSha: 'sha-before-edit',
        renderedContentHash: 'hash',
        canonicalMarkdown: '# Markdown',
        status: 'PREVIEWED',
        diffSummary: { isNoOp: false },
        expiresAt: new Date(Date.now() + 600000),
      });

      // Mock GitHub content returning modified SHA
      (mockGithubClient.getRepositoryContent as jest.Mock).mockResolvedValueOnce({
        exists: true,
        sha: 'sha-changed-by-someone-else',
        content: '# Modified by another user',
      });

      await expect(
        service.confirmAndPublish('user-1', 'draft-1', { intentId: 'intent-123' }),
      ).rejects.toThrow(StalePublicationPreviewException);

      // Ensure GitHub write was NOT executed
      expect(mockGithubClient.createOrUpdateRepositoryFile).not.toHaveBeenCalled();

      // Ensure conflict was audited
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'README_PUBLICATION_CONFLICT',
            result: 'FAILURE',
          }),
        }),
      );
    });

    it('should handle No-Op publication without creating a GitHub commit', async () => {
      mockPrisma.readmePublishIntent.findUnique.mockResolvedValue({
        id: 'intent-noop',
        userId: 'user-1',
        draftId: 'draft-1',
        githubRepositoryId: 'repo-1',
        owner: 'testuser',
        repo: 'profile-repo',
        branch: 'main',
        path: 'README.md',
        expectedCurrentSha: 'sha-identical',
        renderedContentHash: 'hash-noop',
        canonicalMarkdown: '# Identical',
        status: 'PREVIEWED',
        diffSummary: { isNoOp: true, status: 'UNCHANGED' },
        expiresAt: new Date(Date.now() + 600000),
      });

      const receipt = await service.confirmAndPublish('user-1', 'draft-1', { intentId: 'intent-noop' });

      expect(receipt.isNoOp).toBe(true);
      expect(receipt.status).toBe('NO_CHANGES');
      expect(mockGithubClient.createOrUpdateRepositoryFile).not.toHaveBeenCalled();
    });
  });
});
