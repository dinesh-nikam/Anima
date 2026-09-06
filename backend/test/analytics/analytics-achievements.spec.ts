import { StreakCalculator } from '../../src/application/analytics/calculators/streak.calculator';
import { AchievementRuleEngine } from '../../src/application/achievements/rules/rule-engine';
import { AnalyticsService } from '../../src/application/analytics/analytics.service';
import { AchievementService } from '../../src/application/achievements/achievement.service';

describe('Phase 10 — Analytics & Achievement Engines Forensic Verification', () => {
  // ==========================================================================
  // 1. STREAK CALCULATOR
  // ==========================================================================
  describe('StreakCalculator', () => {
    let calculator: StreakCalculator;

    beforeEach(() => {
      calculator = new StreakCalculator();
    });

    it('returns 0 for empty or undefined contributions list', () => {
      expect(calculator.calculate([])).toEqual({ current: 0, longest: 0 });
    });

    it('calculates longest contiguous streak accurately', () => {
      const dates = [
        new Date('2026-01-01'),
        new Date('2026-01-02'),
        new Date('2026-01-03'),
        new Date('2026-01-04'),
        // Gap on 01-05
        new Date('2026-01-06'),
        new Date('2026-01-07'),
      ];

      const result = calculator.calculate(dates.map((d) => ({ date: d, count: 5 })));
      expect(result.longest).toBe(4);
    });

    it('computes current streak extending up to today/yesterday', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const contributions = [
        { date: twoDaysAgo, count: 3 },
        { date: yesterday, count: 7 },
        { date: today, count: 2 },
      ];

      const result = calculator.calculate(contributions);
      expect(result.current).toBe(3);
      expect(result.longest).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // 2. ACHIEVEMENT RULE ENGINE
  // ==========================================================================
  describe('AchievementRuleEngine', () => {
    let engine: AchievementRuleEngine;

    beforeEach(() => {
      engine = new AchievementRuleEngine();
    });

    it('evaluates GTE rules and computes exact progress percentage', () => {
      const rule = { metric: 'contributions' as const, operator: 'GTE' as const, threshold: 1000 };
      const context = {
        contributions: 750,
        currentStreak: 10,
        longestStreak: 20,
        repositories: 5,
        stars: 12,
        forks: 3,
        pullRequests: 8,
        issues: 4,
        reviews: 2,
        languagesCount: 3,
        activeDays: 45,
      };

      const result = engine.evaluate(rule, context);
      expect(result.earned).toBe(false);
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.progress).toBe(75);
      expect(result.currentValue).toBe(750);
      expect(result.targetValue).toBe(1000);
    });

    it('awards EARNED status when threshold is reached or exceeded', () => {
      const rule = { metric: 'repositories' as const, operator: 'GTE' as const, threshold: 10 };
      const context = {
        contributions: 500,
        currentStreak: 15,
        longestStreak: 30,
        repositories: 12, // Met
        stars: 50,
        forks: 10,
        pullRequests: 20,
        issues: 10,
        reviews: 5,
        languagesCount: 6,
        activeDays: 60,
      };

      const result = engine.evaluate(rule, context);
      expect(result.earned).toBe(true);
      expect(result.status).toBe('EARNED');
      expect(result.progress).toBe(100);
    });

    it('handles missing metric data safely without throwing errors', () => {
      const rule = { metric: 'nonExistentMetric' as any, operator: 'GTE' as const, threshold: 5 };
      const context = {
        contributions: 100,
        currentStreak: 5,
        longestStreak: 5,
        repositories: 2,
        stars: 0,
        forks: 0,
        pullRequests: 0,
        issues: 0,
        reviews: 0,
        languagesCount: 1,
        activeDays: 10,
      };

      const result = engine.evaluate(rule, context);
      expect(result.earned).toBe(false);
      expect(result.status).toBe('UNAVAILABLE');
      expect(result.currentValue).toBe(0);
    });
  });

  // ==========================================================================
  // 3. ANALYTICS SERVICE AGGREGATION
  // ==========================================================================
  describe('AnalyticsService Aggregations', () => {
    let service: AnalyticsService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        githubAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'gh-acc-1',
            userId: 'user-1',
            updatedAt: new Date(),
          }),
        },
        githubRepository: {
          count: jest.fn().mockResolvedValue(15),
        },
        githubContribution: {
          aggregate: jest.fn().mockResolvedValue({
            _sum: { total: 1840 },
          }),
          findMany: jest.fn().mockResolvedValue([
            { date: new Date(), total: 5 },
          ]),
        },
        githubLanguage: {
          findMany: jest.fn().mockResolvedValue([
            { language: 'TypeScript', percentage: 65.5, bytes: 150000 },
            { language: 'Python', percentage: 34.5, bytes: 80000 },
          ]),
        },
      };

      service = new AnalyticsService(new StreakCalculator());
      (service as any).prisma = mockPrisma;
    });

    it('aggregates profile, contributions, streaks, and languages into unified overview', async () => {
      const overview = await service.getOverview('user-1');

      expect(overview).toBeDefined();
      expect(overview.profile.repositories).toBe(15);
      expect(overview.contributions.value).toBe(1840);
      expect(overview.contributions.status).toBe('COMPLETE');
      expect(overview.languages).toHaveLength(2);
      expect(overview.languages[0].name).toBe('TypeScript');
      expect(overview.dataFreshness.status).toBe('FRESH');
    });
  });
});
