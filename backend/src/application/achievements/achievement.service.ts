import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { AchievementRuleEngine, MetricContext } from './rules/rule-engine';
import { AchievementStatus, AchievementRarity, AchievementCategory } from '@prisma/client';

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly ruleEngine: AchievementRuleEngine,
  ) {}

  async evaluateUserAchievements(userId: string): Promise<void> {
    // 1. Load Metric Context from Phase 4 Analytics
    const overview = await this.analyticsService.getOverview(userId);
    
    const context: MetricContext = {
      contributions: overview.contributions.value,
      currentStreak: overview.streak.current,
      longestStreak: overview.streak.longest,
      repositories: overview.profile.repositories,
      stars: 0, // Needs addition to AnalyticsService
      forks: 0, // Needs addition to AnalyticsService
      pullRequests: 0, // Needs addition to AnalyticsService
      issues: 0, // Needs addition to AnalyticsService
      reviews: 0, // Needs addition to AnalyticsService
      languagesCount: overview.languages.length,
      activeDays: 0, // Needs addition to AnalyticsService
    };

    // 2. Load All Enabled Achievement Definitions
    const definitions = await this.prisma.achievementDefinition.findMany({
      where: { enabled: true },
    });

    // 3. Evaluate and Persist
    for (const def of definitions) {
      const result = this.ruleEngine.evaluate(
        {
          metric: def.metric as any,
          operator: def.operator as any,
          threshold: def.threshold,
        },
        context,
      );

      await this.prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: def.id,
          },
        },
        update: {
          status: result.status as any,
          currentValue: result.currentValue,
          progressPercent: result.progress,
          earnedAt: result.earned ? new Date() : undefined,
          lastEvaluatedAt: new Date(),
        },
        create: {
          userId,
          achievementId: def.id,
          status: result.status as any,
          currentValue: result.currentValue,
          targetValue: def.threshold,
          progressPercent: result.progress,
          earnedAt: result.earned ? new Date() : null,
        },
      });
    }
  }

  async getUserAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
  }

  async seedInitialAchievements() {
    const catalog = [
      { code: 'CONTRIB_100', name: '100 Contributions', description: 'Reach 100 total contributions', category: 'CONTRIBUTIONS', metric: 'contributions', operator: 'GTE', threshold: 100, rarity: 'COMMON' },
      { code: 'CONTRIB_1000', name: '1K Contributions', description: 'Reach 1000 total contributions', category: 'CONTRIBUTIONS', metric: 'contributions', operator: 'GTE', threshold: 1000, rarity: 'RARE' },
      { code: 'STREAK_30', name: '30 Day Streak', description: 'Maintain a 30 day contribution streak', category: 'STREAK', metric: 'currentStreak', operator: 'GTE', threshold: 30, rarity: 'UNCOMMON' },
      { code: 'REPO_10', name: '10 Repositories', description: 'Own 10 or more repositories', category: 'REPOSITORIES', metric: 'repositories', operator: 'GTE', threshold: 10, rarity: 'COMMON' },
      { code: 'LANG_5', name: 'Polyglot', description: 'Use 5 or more different languages', category: 'LANGUAGES', metric: 'languagesCount', operator: 'GTE', threshold: 5, rarity: 'UNCOMMON' },
    ];

    for (const item of catalog) {
      await this.prisma.achievementDefinition.upsert({
        where: { code: item.code },
        update: {},
        create: {
          code: item.code,
          name: item.name,
          description: item.description,
          category: item.category as AchievementCategory,
          metric: item.metric,
          operator: item.operator,
          threshold: item.threshold,
          rarity: item.rarity as AchievementRarity,
        },
      });
    }
  }
}
