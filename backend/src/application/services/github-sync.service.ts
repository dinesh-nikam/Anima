import { Injectable, Logger, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GithubClient } from '../../integration/github.client';
import { EncryptionService } from '../../security/encryption.service';
import { SessionService } from '../../infrastructure/external-services/session.service';
import { GithubAccountStatus, SyncStatus, SyncStage } from '@prisma/client';

@Injectable()
export class GithubSyncService {
  private readonly logger = new Logger(GithubSyncService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly githubClient: GithubClient,
    private readonly encryptionService: EncryptionService,
    private readonly sessionService: SessionService,
  ) {}

  async startFullSync(userId: string): Promise<string> {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new HttpException('No GitHub account linked to user', HttpStatus.NOT_FOUND);
    }

    // Create sync run record
    const syncRun = await this.prisma.githubSyncRun.create({
      data: {
        githubAccountId: account.id,
        syncType: 'MANUAL',
        status: SyncStatus.RUNNING,
      },
    });

    // In a production app, this would be dispatched to a background worker (e.g. BullMQ)
    // For now, we run it asynchronously in the process but return the ID immediately
    this.performSync(syncRun.id, account.id).catch(err => {
      this.logger.error(`Background sync failed for run ${syncRun.id}: ${err.message}`);
    });

    return syncRun.id;
  }

  private async performSync(syncRunId: string, accountId: string) {
    let currentStage: SyncStage = SyncStage.PROFILE;
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    try {
      const account = await this.prisma.githubAccount.findUnique({
        where: { id: accountId },
        include: { tokens: true },
      });

      if (!account || !account.tokens.length) {
        throw new Error('No available tokens for account');
      }

      const token = this.encryptionService.decrypt(account.tokens[0].accessTokenEncrypted);

      // STAGE 1: PROFILE
      currentStage = SyncStage.PROFILE;
      const profile: any = await this.githubClient.getUserProfile(token);
      await this.prisma.githubAccount.update({
        where: { id: accountId },
        data: {
          githubLogin: profile.login,
          avatarUrl: profile.avatar_url,
          githubName: profile.name,
          githubProfileUrl: profile.html_url,
          status: GithubAccountStatus.SYNCING,
        },
      });
      recordsProcessed++;

      // STAGE 2: REPOSITORIES
      currentStage = SyncStage.REPOSITORIES;
      let page = 1;
      let hasNext = true;
      while (hasNext) {
        const repos: any = (await this.githubClient.getRepositories(token, page)) || [];
        
        if (repos.length === 0) {
          hasNext = false;
        } else {
          for (const repo of repos) {
            const result = await this.prisma.githubRepository.upsert({
              where: { githubRepoId: repo.id.toString() },
              update: {
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                htmlUrl: repo.html_url,
                visibility: repo.visibility,
                isFork: repo.fork,
                isArchived: repo.archived,
                isDisabled: repo.disabled,
                updatedAt: new Date(repo.updated_at),
                pushedAt: new Date(repo.pushed_at),
                language: repo.language,
                stars: repo.stargazers_count,
                watchers: repo.watchers_count,
                forks: repo.forks_count,
                openIssues: repo.open_issues_count,
                size: repo.size,
                topics: repo.topics || [],
                fetchedAt: new Date(),
              },
              create: {
                githubRepoId: repo.id.toString(),
                githubAccountId: accountId,
                owner: repo.owner.login,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                htmlUrl: repo.html_url,
                visibility: repo.visibility,
                isFork: repo.fork,
                isArchived: repo.archived,
                isDisabled: repo.disabled,
                createdAt: new Date(repo.created_at),
                updatedAt: new Date(repo.updated_at),
                pushedAt: new Date(repo.pushed_at),
                defaultBranch: repo.default_branch,
                language: repo.language,
                stars: repo.stargazers_count,
                watchers: repo.watchers_count,
                forks: repo.forks_count,
                openIssues: repo.open_issues_count,
                size: repo.size,
                topics: repo.topics || [],
              },
            });
            
            recordsProcessed++;
            if (result.updatedAt.getTime() !== (new Date()).getTime()) {
                recordsUpdated++;
            } else {
                recordsCreated++;
            }
          }
          page++;
        }
      }

      // STAGE 3: LANGUAGES
      currentStage = SyncStage.LANGUAGES;
      const repos = await this.prisma.githubRepository.findMany({
        where: { githubAccountId: accountId },
      });

      for (const repo of repos) {
        const languages = await this.githubClient.getRepositoryLanguages(token, repo.owner, repo.name);
        for (const [lang, bytes] of Object.entries(languages)) {
          const totalBytes = Object.values(languages).reduce((a: any, b: any) => a + b, 0);
          await this.prisma.githubLanguage.upsert({
            where: {
              repositoryId_language: {
                repositoryId: repo.id,
                language: lang,
              },
            },
            update: {
              bytes,
              percentage: (bytes / totalBytes) * 100,
              fetchedAt: new Date(),
            },
            create: {
              repositoryId: repo.id,
              language: lang,
              bytes,
              percentage: (bytes / totalBytes) * 100,
            },
          });
          recordsProcessed++;
        }
      }

      await this.prisma.githubSyncRun.update({
        where: { id: syncRunId },
        data: {
          status: SyncStatus.COMPLETED,
          completedAt: new Date(),
          lastSuccessfulStage: SyncStage.LANGUAGES,
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
        },
      });

      await this.prisma.githubAccount.update({
        where: { id: accountId },
        data: { status: GithubAccountStatus.SYNCED },
      });

    } catch (error) {
      this.logger.error(`Sync failed at stage ${currentStage}: ${error.message}`);
      await this.prisma.githubSyncRun.update({
        where: { id: syncRunId },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          lastSuccessfulStage: currentStage,
          errorCode: error.name || 'UNKNOWN_ERROR',
          errorMessageSafe: error.message,
        },
      });
      
      await this.prisma.githubAccount.update({
        where: { id: accountId },
        data: { status: GithubAccountStatus.ERROR },
      });
    }
  }

  async getSyncStatus(syncId: string) {
    return this.prisma.githubSyncRun.findUnique({
      where: { id: syncId },
    });
  }

  async getProfile(userId: string) {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
    });
    if (!account) return null;

    return this.prisma.githubAccount.findUnique({
      where: { id: account.id },
      select: {
        githubLogin: true,
        githubName: true,
        avatarUrl: true,
        githubProfileUrl: true,
        githubEmail: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async getRepositories(userId: string) {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
    });
    if (!account) return [];

    return this.prisma.githubRepository.findMany({
      where: { githubAccountId: account.id },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
