import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { AchievementService } from '../achievements/achievement.service';
import {
  RenderContext,
  RenderContextStatistics,
  RenderContextStreak,
  AvailabilityStatus,
  AvailabilityTagged,
  README_RENDERER_VERSION,
} from './models/readme.model';

// ---------------------------------------------------------------------------
// Render context builder — converts authoritative Phase 4/5 data into the
// strongly-typed render context with explicit availability semantics.
// ---------------------------------------------------------------------------

@Injectable()
export class RenderContextBuilder {
  private readonly logger = new Logger(RenderContextBuilder.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly achievementService: AchievementService,
  ) {}

  async build(userId: string): Promise<RenderContext> {
    let analytics;
    try {
      analytics = await this.analyticsService.getOverview(userId);
    } catch (err) {
      this.logger.warn(`Analytics unavailable for user ${userId}: ${(err as Error).message}`);
      analytics = null;
    }

    const account = await this.prisma.githubAccount.findUnique({ where: { userId } });

    const userAchievements = await this.achievementService.getUserAchievements(userId).catch(() => []);

    const repositories = await this.loadRepositories(account?.id);

    const activity = await this.loadActivity(account?.id);

    const social = await this.loadSocial(account);

    const skills = await this.loadSkills(account?.id);

    const projects = await this.loadProjects();

    const statistics: RenderContextStatistics = this.buildStatistics(analytics);
    const streak: RenderContextStreak = this.buildStreak(analytics);

    return {
      profile: {
        displayName: account?.githubName || account?.githubLogin,
        bio: '', // bio is not currently persisted by sync; surface as empty rather than fabricate
        githubLogin: account?.githubLogin,
        avatarUrl: account?.avatarUrl,
        profileUrl: account?.githubProfileUrl,
        company: undefined,
        location: undefined,
        website: undefined,
        twitterUsername: undefined,
      },
      statistics,
      streak,
      languages: {
        items: analytics?.languages
          ? { status: 'AVAILABLE', value: analytics.languages.map((l) => ({
              name: l.name,
              percentage: l.percentage,
              bytes: l.bytes,
            })) }
          : { status: 'UNAVAILABLE' },
      },
      repositories: { items: repositories },
      activity: { items: activity },
      achievements: this.buildAchievements(userAchievements as any[]),
      trophies: { items: { status: 'UNAVAILABLE', reason: 'Trophy data not yet exposed by Phase 5' } },
      socialLinks: { items: social },
      customData: {
        skills,
        projects,
        currentFocus: undefined,
        quote: undefined,
      },
      themeId: '',
      providerResults: {},
      renderMetadata: {
        rendererVersion: README_RENDERER_VERSION,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private buildStatistics(analytics: any): RenderContextStatistics {
    const status: AvailabilityStatus = analytics ? 'AVAILABLE' : 'UNAVAILABLE';
    const freshness: AvailabilityStatus =
      analytics?.dataFreshness?.status === 'STALE' ? 'STALE' : status;

    return {
      repositories: analytics?.profile?.repositories !== undefined
        ? { status: freshness, value: analytics.profile.repositories, sourceUpdatedAt: analytics?.dataFreshness?.lastSyncAt?.toISOString?.() }
        : { status: 'UNAVAILABLE' },
      followers: analytics?.profile?.followers !== undefined
        ? { status: freshness, value: analytics.profile.followers }
        : { status: 'UNAVAILABLE', reason: 'Follower count not yet synchronized from GitHub' },
      following: analytics?.profile?.following !== undefined
        ? { status: freshness, value: analytics.profile.followers }
        : { status: 'UNAVAILABLE', reason: 'Following count not yet synchronized from GitHub' },
      stars: { status: 'UNAVAILABLE', reason: 'Aggregate stars not yet exposed by AnalyticsService' },
      forks: { status: 'UNAVAILABLE', reason: 'Aggregate forks not yet exposed by AnalyticsService' },
      contributions: analytics?.contributions?.value !== undefined
        ? { status: freshness, value: analytics.contributions.value, sourceUpdatedAt: analytics?.dataFreshness?.lastSyncAt?.toISOString?.() }
        : { status: 'UNAVAILABLE' },
      pullRequests: { status: 'UNAVAILABLE', reason: 'Pull-request aggregate not yet exposed by AnalyticsService' },
      issues: { status: 'UNAVAILABLE', reason: 'Issue aggregate not yet exposed by AnalyticsService' },
      reviews: { status: 'UNAVAILABLE', reason: 'Review aggregate not yet exposed by AnalyticsService' },
    };
  }

  private buildStreak(analytics: any): RenderContextStreak {
    const status: AvailabilityStatus = analytics ? 'AVAILABLE' : 'UNAVAILABLE';
    return {
      current: analytics?.streak?.current !== undefined
        ? { status, value: analytics.streak.current }
        : { status: 'UNAVAILABLE' },
      longest: analytics?.streak?.longest !== undefined
        ? { status, value: analytics.streak.longest }
        : { status: 'UNAVAILABLE' },
    };
  }

  private buildAchievements(items: Array<{ status: string; achievement?: any; progressPercent?: number }>) {
    const earned = items
      .filter((i) => i.status === 'EARNED')
      .map((i) => ({
        code: i.achievement.code,
        name: i.achievement.name,
        description: i.achievement.description,
        category: i.achievement.category,
        rarity: i.achievement.rarity,
        icon: i.achievement.icon,
      }));
    const inProgress = items
      .filter((i) => i.status === 'IN_PROGRESS' || i.status === 'LOCKED')
      .map((i) => ({
        code: i.achievement.code,
        name: i.achievement.name,
        progressPercent: i.progressPercent || 0,
      }));
    return {
      earned: { status: 'AVAILABLE' as AvailabilityStatus, value: earned },
      inProgress: { status: 'AVAILABLE' as AvailabilityStatus, value: inProgress },
    };
  }

  private async loadRepositories(accountId?: string): Promise<AvailabilityTagged<any[]>> {
    if (!accountId) return { status: 'UNAVAILABLE' };
    const repos = await this.prisma.githubRepository.findMany({
      where: { githubAccountId: accountId, isArchived: false, isDisabled: false },
      orderBy: { stars: 'desc' },
      take: 20,
    });
    if (repos.length === 0) return { status: 'UNAVAILABLE' };
    return {
      status: 'AVAILABLE',
      value: repos.map((r) => ({
        name: r.name,
        fullName: r.fullName,
        description: r.description || undefined,
        url: r.htmlUrl,
        stars: r.stars,
        forks: r.forks,
        language: r.language || undefined,
        isArchived: r.isArchived,
        isFork: r.isFork,
      })),
    };
  }

  private async loadActivity(accountId?: string): Promise<AvailabilityTagged<any[]>> {
    if (!accountId) return { status: 'UNAVAILABLE' };
    const events = await this.prisma.githubActivityEvent.findMany({
      where: { githubAccountId: accountId },
      orderBy: { occurredAt: 'desc' },
      take: 20,
    });
    if (events.length === 0) return { status: 'UNAVAILABLE' };
    return {
      status: 'AVAILABLE',
      value: events.map((e) => ({
        type: e.eventType,
        repositoryName: e.repositoryName || undefined,
        summary: e.summary || undefined,
        url: e.url || undefined,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
  }

  private async loadSocial(account: any): Promise<AvailabilityTagged<Array<{ label: string; url: string }>>> {
    if (!account?.githubLogin) return { status: 'UNAVAILABLE' };
    const links: Array<{ label: string; url: string }> = [];
    const login = encodeURIComponent(account.githubLogin);
    links.push({ label: 'GitHub', url: `https://github.com/${login}` });
    return { status: 'AVAILABLE', value: links };
  }

  private async loadSkills(accountId?: string): Promise<AvailabilityTagged<string[]>> {
    if (!accountId) return { status: 'UNAVAILABLE' };
    const langs = await this.prisma.githubLanguage.findMany({
      where: { repository: { githubAccountId: accountId } },
      orderBy: { bytes: 'desc' },
      take: 10,
    });
    if (langs.length === 0) return { status: 'UNAVAILABLE' };
    return { status: 'AVAILABLE', value: langs.map((l) => l.language) };
  }

  private async loadProjects(): Promise<AvailabilityTagged<any[]>> {
    // User-curated projects live outside Phase 5 scope; expose as UNAVAILABLE.
    return { status: 'UNAVAILABLE', reason: 'User-curated projects not yet supported' };
  }
}
