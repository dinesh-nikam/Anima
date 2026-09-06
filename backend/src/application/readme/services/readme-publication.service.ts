import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PrismaClient, ReadmePublicationStatus, AuditAction } from '@prisma/client';
import { GithubClient } from '../../../integration/github.client';
import { EncryptionService } from '../../../security/encryption.service';
import { ReadmeDraftService } from '../readme-draft.service';
import { ReadmeDiffService, DiffSummary } from './readme-diff.service';
import {
  CreatePublishPreviewDto,
  ConfirmPublishDto,
  PublishPreviewResponseDto,
  PublicationReceiptDto,
  TargetRepositoryItemDto,
} from '../dto/readme-publish.dto';
import {
  RepositoryNotFoundException,
  RepositoryAccessDeniedException,
  BranchNotFoundException,
  StalePublicationPreviewException,
  PublicationIntentExpiredException,
  PublicationIntentNotFoundException,
  GithubAuthRequiredException,
  BranchProtectedException,
  PublicationConflictException,
  InvalidReadmePathException,
} from '../exceptions/publish.exceptions';

@Injectable()
export class ReadmePublicationService {
  private readonly logger = new Logger(ReadmePublicationService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly githubClient: GithubClient,
    private readonly encryptionService: EncryptionService,
    private readonly draftService: ReadmeDraftService,
    private readonly diffService: ReadmeDiffService,
  ) {}

  /**
   * List writable repositories available to the user for publishing
   */
  async getTargetRepositories(userId: string): Promise<TargetRepositoryItemDto[]> {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
      include: {
        repos: {
          orderBy: { pushedAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new GithubAuthRequiredException('No connected GitHub account found');
    }

    return account.repos.map((repo) => ({
      id: repo.id,
      githubRepoId: repo.githubRepoId,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch || 'main',
      visibility: repo.visibility,
      isArchived: repo.isArchived,
      isDisabled: repo.isDisabled,
      canWrite: !repo.isArchived && !repo.isDisabled,
      htmlUrl: repo.htmlUrl,
      pushedAt: repo.pushedAt.toISOString(),
    }));
  }

  /**
   * Fetch branches for a specific target repository
   */
  async getBranches(userId: string, owner: string, repo: string) {
    const token = await this.getDecryptedToken(userId);
    try {
      return await this.githubClient.getBranches(token, owner, repo);
    } catch (error: any) {
      this.logger.error(`Failed to fetch branches for ${owner}/${repo}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a publication preview and short-lived publication intent
   */
  async createPublicationPreview(
    userId: string,
    draftId: string,
    dto: CreatePublishPreviewDto,
  ): Promise<PublishPreviewResponseDto> {
    // 1. Verify draft ownership and render canonical Markdown
    const draft = await this.draftService.getDraft(userId, draftId);
    const renderResult = await this.draftService.previewDraft(userId, draftId);
    const canonicalMarkdown = renderResult.markdown;
    const renderedHash = this.diffService.generateContentHash(canonicalMarkdown);

    // 2. Resolve Target Repository
    const token = await this.getDecryptedToken(userId);
    const { repository, owner, repoName } = await this.resolveTargetRepository(userId, dto);

    // 3. Strict Path Sanitation & Validation
    const cleanPath = this.sanitizePath(dto.path || 'README.md');

    // 4. Verify Repository Access & Write Permissions
    let writeAccess: any;
    let currentResult: any;
    const targetBranch = dto.branch || 'main';

    try {
      writeAccess = await this.githubClient.verifyWriteAccess(token, owner, repoName);
      if (!writeAccess.canWrite) {
        throw new RepositoryAccessDeniedException(owner, repoName, writeAccess.reason);
      }

      // 5. Resolve & Validate Target Branch
      const branchToUse = dto.branch || writeAccess.defaultBranch || 'main';
      try {
        await this.githubClient.getBranch(token, owner, repoName, branchToUse);
      } catch (error: any) {
        if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
          throw new BranchNotFoundException(owner, repoName, branchToUse);
        }
        throw error;
      }

      // 6. Fetch Current GitHub README Content
      currentResult = await this.githubClient.getRepositoryContent(
        token,
        owner,
        repoName,
        cleanPath,
        branchToUse,
      );
    } catch (error: any) {
      if ((error instanceof HttpException && error.getStatus() === HttpStatus.UNAUTHORIZED) || error.status === 401) {
        await this.auditLog(userId, AuditAction.README_PUBLICATION_REAUTH_REQUIRED, draftId, 'FAILURE', 'GitHub OAuth token expired or invalid');
        throw new GithubAuthRequiredException('GitHub OAuth token expired or invalid. Please reauthorize.');
      }
      throw error;
    }

    // 7. Calculate Diff between current GitHub content and generated Markdown
    const diff = this.diffService.calculateDiff(
      currentResult.exists ? currentResult.content : null,
      canonicalMarkdown,
    );

    // 8. Create Publication Intent (15-minute TTL)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const intent = await this.prisma.readmePublishIntent.create({
      data: {
        userId,
        draftId,
        githubRepositoryId: repository.id,
        owner,
        repo: repoName,
        branch: targetBranch,
        path: cleanPath,
        expectedCurrentSha: currentResult.exists ? currentResult.sha || null : null,
        renderedContentHash: renderedHash,
        canonicalMarkdown,
        commitMessage: dto.commitMessage || `docs: update ${cleanPath} via VeriFlow`,
        diffSummary: diff.summary as any,
        status: ReadmePublicationStatus.PREVIEWED,
        expiresAt,
      },
    });

    // 9. Audit Event
    await this.auditLog(
      userId,
      AuditAction.README_PUBLICATION_PREVIEWED,
      intent.id,
      'SUCCESS',
      `Target: ${owner}/${repoName}@${targetBranch}:${cleanPath}, Status: ${diff.summary.status}`,
    );

    return {
      intentId: intent.id,
      draftId,
      target: {
        repositoryId: repository.id,
        githubRepoId: repository.githubRepoId,
        owner,
        repo: repoName,
        fullName: repository.fullName,
        branch: targetBranch,
        path: cleanPath,
        defaultBranch: writeAccess.defaultBranch,
        visibility: repository.visibility,
      },
      currentSha: currentResult.exists ? currentResult.sha || null : null,
      renderedHash,
      changeStatus: diff.summary.status,
      diff,
      warnings: renderResult.metadata?.warnings || [],
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Explicitly confirm and execute GitHub README publication
   */
  async confirmAndPublish(
    userId: string,
    draftId: string,
    dto: ConfirmPublishDto,
  ): Promise<PublicationReceiptDto> {
    // 1. Retrieve and Validate Publication Intent
    const intent = await this.prisma.readmePublishIntent.findUnique({
      where: { id: dto.intentId },
    });

    if (!intent || intent.userId !== userId || intent.draftId !== draftId) {
      throw new PublicationIntentNotFoundException(dto.intentId);
    }

    if (new Date() > intent.expiresAt) {
      await this.prisma.readmePublishIntent.update({
        where: { id: intent.id },
        data: { status: ReadmePublicationStatus.STALE },
      });
      throw new PublicationIntentExpiredException(intent.id);
    }

    if (intent.status === ReadmePublicationStatus.PUBLISHED) {
      // Idempotency: return existing receipt if already successfully published
      const existingPub = await this.prisma.readmePublication.findFirst({
        where: { draftId, contentHash: intent.renderedContentHash, status: ReadmePublicationStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
      });
      if (existingPub) {
        return this.formatReceipt(existingPub);
      }
    }

    if (intent.status === ReadmePublicationStatus.PUBLISHING) {
      throw new PublicationConflictException('A publication request for this preview is already in progress');
    }

    // 2. Lock intent state to PUBLISHING to guard against race conditions and double-clicks
    await this.prisma.readmePublishIntent.update({
      where: { id: intent.id },
      data: { status: ReadmePublicationStatus.PUBLISHING },
    });

    const token = await this.getDecryptedToken(userId);
    const commitMessage =
      dto.commitMessage?.trim() || intent.commitMessage || `docs: update ${intent.path} via VeriFlow`;

    // 3. Check for No-Op Publication
    const diffSummary = intent.diffSummary as unknown as DiffSummary;
    if (diffSummary?.isNoOp) {
      const noOpPub = await this.prisma.readmePublication.create({
        data: {
          userId,
          draftId,
          githubRepositoryId: intent.githubRepositoryId,
          owner: intent.owner,
          repo: intent.repo,
          branch: intent.branch,
          path: intent.path,
          previousFileSha: intent.expectedCurrentSha,
          publishedFileSha: intent.expectedCurrentSha,
          commitSha: null,
          commitUrl: null,
          contentHash: intent.renderedContentHash,
          status: ReadmePublicationStatus.NO_CHANGES,
          isNoOp: true,
          diffSummary: diffSummary as any,
          completedAt: new Date(),
        },
      });

      await this.prisma.readmePublishIntent.update({
        where: { id: intent.id },
        data: { status: ReadmePublicationStatus.NO_CHANGES },
      });

      await this.auditLog(
        userId,
        AuditAction.README_PUBLICATION_SUCCEEDED,
        noOpPub.id,
        'SUCCESS',
        'No-op publish: content identical to current GitHub README',
      );

      return this.formatReceipt(noOpPub);
    }

    // 4. Stale Preview Protection: Fetch current GitHub content & re-verify SHA
    const currentGithubState = await this.githubClient.getRepositoryContent(
      token,
      intent.owner,
      intent.repo,
      intent.path,
      intent.branch,
    );

    const currentActualSha = currentGithubState.exists ? currentGithubState.sha || null : null;
    if (currentActualSha !== intent.expectedCurrentSha) {
      await this.prisma.readmePublishIntent.update({
        where: { id: intent.id },
        data: { status: ReadmePublicationStatus.CONFLICT },
      });

      await this.auditLog(
        userId,
        AuditAction.README_PUBLICATION_CONFLICT,
        intent.id,
        'FAILURE',
        `Stale preview: expected SHA ${intent.expectedCurrentSha}, but target is ${currentActualSha}`,
      );

      throw new StalePublicationPreviewException(intent.expectedCurrentSha, currentActualSha);
    }

    // 5. Internal Backup: Capture previous content in ReadmeVersion before updating GitHub
    let previousVersionId: string | null = null;
    if (currentGithubState.exists && currentGithubState.content) {
      const backupVersion = await this.prisma.readmeVersion.create({
        data: {
          userId,
          draftId,
          templateId: 'github-backup',
          templateVersion: '1.0.0',
          themeId: 'github-dark',
          themeVersion: '1.0.0',
          rendererVersion: '1.0.0',
          canonicalMarkdown: currentGithubState.content,
          contentHash: this.diffService.generateContentHash(currentGithubState.content),
          githubRepositoryId: intent.githubRepositoryId,
          branch: intent.branch,
          path: intent.path,
          previousFileSha: currentGithubState.sha,
          fileSha: currentGithubState.sha,
          status: ReadmePublicationStatus.PUBLISHED,
          metadata: { backupReason: 'Pre-publish snapshot' },
        },
      });
      previousVersionId = backupVersion.id;
    }

    // 6. Audit Started
    await this.auditLog(
      userId,
      AuditAction.README_PUBLICATION_STARTED,
      intent.id,
      'SUCCESS',
      `Publishing to ${intent.owner}/${intent.repo}@${intent.branch}:${intent.path}`,
    );

    // 7. Safe GitHub Write via Contents API
    let commitResult: any;
    try {
      commitResult = await this.githubClient.createOrUpdateRepositoryFile(
        token,
        intent.owner,
        intent.repo,
        intent.path,
        {
          message: commitMessage,
          content: intent.canonicalMarkdown,
          sha: intent.expectedCurrentSha || undefined,
          branch: intent.branch,
        },
      );
    } catch (error: any) {
      this.logger.error(`GitHub commit failed for draft ${draftId}: ${error.message}`);
      await this.prisma.readmePublishIntent.update({
        where: { id: intent.id },
        data: { status: ReadmePublicationStatus.FAILED },
      });

      await this.auditLog(
        userId,
        AuditAction.README_PUBLICATION_FAILED,
        intent.id,
        'FAILURE',
        `GitHub write failed: ${error.message}`,
      );

      if (error instanceof HttpException && error.getStatus() === HttpStatus.UNPROCESSABLE_ENTITY) {
        throw new BranchProtectedException(intent.branch, error.message);
      }
      throw error;
    }

    // 8. Result Verification
    const publishedCommitSha = commitResult?.commit?.sha;
    const publishedFileSha = commitResult?.content?.sha;

    if (!publishedCommitSha || !publishedFileSha) {
      this.logger.warn(`GitHub write returned ambiguous response without commit/file SHA`);
    }

    // 9. Persist Published ReadmeVersion Snapshot
    const publishedVersion = await this.prisma.readmeVersion.create({
      data: {
        userId,
        draftId,
        templateId: 'custom',
        templateVersion: '1.0.0',
        themeId: 'github-dark',
        themeVersion: '1.0.0',
        rendererVersion: '1.0.0',
        canonicalMarkdown: intent.canonicalMarkdown,
        contentHash: intent.renderedContentHash,
        githubRepositoryId: intent.githubRepositoryId,
        branch: intent.branch,
        path: intent.path,
        commitSha: publishedCommitSha,
        previousFileSha: intent.expectedCurrentSha,
        fileSha: publishedFileSha,
        status: ReadmePublicationStatus.PUBLISHED,
        metadata: {
          intentId: intent.id,
          commitUrl: commitResult?.commit?.html_url,
          commitMessage,
        },
      },
    });

    // 10. Persist ReadmePublication Record
    const publication = await this.prisma.readmePublication.create({
      data: {
        userId,
        draftId,
        versionId: publishedVersion.id,
        githubRepositoryId: intent.githubRepositoryId,
        owner: intent.owner,
        repo: intent.repo,
        branch: intent.branch,
        path: intent.path,
        previousFileSha: intent.expectedCurrentSha,
        publishedFileSha,
        commitSha: publishedCommitSha,
        commitUrl: commitResult?.commit?.html_url,
        contentHash: intent.renderedContentHash,
        status: ReadmePublicationStatus.PUBLISHED,
        isNoOp: false,
        diffSummary: intent.diffSummary as any,
        completedAt: new Date(),
      },
    });

    // 11. Finalize Intent
    await this.prisma.readmePublishIntent.update({
      where: { id: intent.id },
      data: { status: ReadmePublicationStatus.PUBLISHED },
    });

    // 12. Audit Success
    await this.auditLog(
      userId,
      AuditAction.README_PUBLICATION_SUCCEEDED,
      publication.id,
      'SUCCESS',
      `Commit: ${publishedCommitSha}, File SHA: ${publishedFileSha}`,
    );

    return this.formatReceipt(publication);
  }

  /**
   * Get draft publication history
   */
  async getDraftPublications(userId: string, draftId: string) {
    await this.draftService.getDraft(userId, draftId);
    const publications = await this.prisma.readmePublication.findMany({
      where: { userId, draftId },
      orderBy: { createdAt: 'desc' },
      include: {
        repository: true,
      },
    });

    return {
      publications: publications.map((pub) => this.formatReceipt(pub)),
    };
  }

  /**
   * Get specific publication receipt
   */
  async getPublication(userId: string, publicationId: string) {
    const pub = await this.prisma.readmePublication.findUnique({
      where: { id: publicationId },
      include: {
        repository: true,
      },
    });

    if (!pub || pub.userId !== userId) {
      throw new NotFoundException(`Publication record "${publicationId}" not found`);
    }

    return this.formatReceipt(pub);
  }

  /**
   * Get versions / snapshots for draft
   */
  async getDraftVersions(userId: string, draftId: string) {
    await this.draftService.getDraft(userId, draftId);
    return this.prisma.readmeVersion.findMany({
      where: { userId, draftId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async getDecryptedToken(userId: string): Promise<string> {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
      include: { tokens: true },
    });

    if (!account || !account.tokens.length) {
      throw new GithubAuthRequiredException('No GitHub OAuth token available for this account');
    }

    try {
      return this.encryptionService.decrypt(account.tokens[0].accessTokenEncrypted);
    } catch (err: any) {
      this.logger.error(`Token decryption error for user ${userId}: ${err.message}`);
      throw new GithubAuthRequiredException('Failed to decrypt GitHub token. Reauthorization required.');
    }
  }

  private async resolveTargetRepository(userId: string, dto: CreatePublishPreviewDto) {
    if (dto.repositoryId) {
      const repo = await this.prisma.githubRepository.findUnique({
        where: { id: dto.repositoryId },
        include: { githubAccount: true },
      });
      if (!repo || repo.githubAccount.userId !== userId) {
        throw new RepositoryNotFoundException(dto.owner || '', dto.repo || dto.repositoryId);
      }
      return { repository: repo, owner: repo.owner, repoName: repo.name };
    }

    if (dto.owner && dto.repo) {
      const account = await this.prisma.githubAccount.findUnique({
        where: { userId },
        include: {
          repos: {
            where: {
              owner: { equals: dto.owner, mode: 'insensitive' },
              name: { equals: dto.repo, mode: 'insensitive' },
            },
          },
        },
      });

      if (account && account.repos.length > 0) {
        const repo = account.repos[0];
        return { repository: repo, owner: repo.owner, repoName: repo.name };
      }

      // If not yet synced locally, query GitHub directly and upsert
      const token = await this.getDecryptedToken(userId);
      const meta = await this.githubClient.getRepository(token, dto.owner, dto.repo);
      if (!meta) {
        throw new RepositoryNotFoundException(dto.owner, dto.repo);
      }

      const upserted = await this.prisma.githubRepository.upsert({
        where: { githubRepoId: meta.id.toString() },
        update: {
          name: meta.name,
          fullName: meta.full_name,
          visibility: meta.visibility,
          isArchived: meta.archived,
          isDisabled: meta.disabled,
          defaultBranch: meta.default_branch,
        },
        create: {
          githubRepoId: meta.id.toString(),
          githubAccountId: (await this.prisma.githubAccount.findUnique({ where: { userId } }))!.id,
          owner: meta.owner.login,
          name: meta.name,
          fullName: meta.full_name,
          htmlUrl: meta.html_url,
          visibility: meta.visibility,
          isFork: meta.fork,
          isArchived: meta.archived,
          isDisabled: meta.disabled,
          defaultBranch: meta.default_branch,
          createdAt: new Date(),
          updatedAt: new Date(),
          pushedAt: new Date(),
          size: 0,
        },
      });

      return { repository: upserted, owner: meta.owner.login, repoName: meta.name };
    }

    // Default: use the user's special profile repository (username/username) or the first active repository
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
      include: { repos: true },
    });

    if (!account || !account.repos.length) {
      throw new RepositoryNotFoundException('', '');
    }

    // Look for special profile README repository matching githubLogin
    const profileRepo = account.repos.find(
      (r) => r.name.toLowerCase() === account.githubLogin.toLowerCase(),
    );
    const targetRepo = profileRepo || account.repos[0];
    return { repository: targetRepo, owner: targetRepo.owner, repoName: targetRepo.name };
  }

  private sanitizePath(path: string): string {
    const clean = path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (clean.includes('..') || clean.includes('/.') || clean.startsWith('.')) {
      throw new InvalidReadmePathException(path, 'Path cannot contain parent directory traversal (..)');
    }
    return clean;
  }

  private formatReceipt(pub: any): PublicationReceiptDto {
    return {
      publicationId: pub.id,
      draftId: pub.draftId,
      versionId: pub.versionId,
      status: pub.status,
      isNoOp: pub.isNoOp,
      commitSha: pub.commitSha,
      publishedFileSha: pub.publishedFileSha,
      previousFileSha: pub.previousFileSha,
      commitUrl: pub.commitUrl,
      contentHash: pub.contentHash,
      target: {
        owner: pub.owner,
        repo: pub.repo,
        branch: pub.branch,
        path: pub.path,
        fullName: `${pub.owner}/${pub.repo}`,
      },
      diffSummary: pub.diffSummary,
      completedAt: pub.completedAt ? pub.completedAt.toISOString() : pub.createdAt.toISOString(),
    };
  }

  private async auditLog(
    actor: string,
    action: AuditAction,
    resourceId: string,
    result: 'SUCCESS' | 'FAILURE',
    failureReason?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor,
          action,
          resource: 'README_PUBLICATION',
          resourceId,
          result,
          failureReason: failureReason || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Audit log creation failed: ${err.message}`);
    }
  }
}
