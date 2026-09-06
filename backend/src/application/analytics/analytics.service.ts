import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StreakCalculator } from './calculators/streak.calculator';

export interface AnalyticsOverview {
  profile: {
    repositories: number;
    followers: number;
    following: number;
  };
  contributions: {
    value: number;
    status: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
    period: string;
  };
  streak: {
    current: number;
    longest: number;
  };
  languages: {
    name: string;
    percentage: number;
    bytes: number;
  }[];
  dataFreshness: {
    lastSyncAt: Date;
    status: 'FRESH' | 'STALE';
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly prisma = new PrismaClient();

  constructor(private readonly streakCalculator: StreakCalculator) {}

  async getOverview(userId: string): Promise<AnalyticsOverview> {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new Error('GitHub account not linked');
    }

    // 1. Profile Stats
    const repoCount = await this.prisma.githubRepository.count({
      where: { githubAccountId: account.id },
    });

    // 2. Contribution Total (Current Year)
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const yearContributions = await this.prisma.githubContribution.aggregate({
      where: {
        githubAccountId: account.id,
        date: { gte: yearStart, lte: yearEnd },
      },
      _sum: { total: true },
    });

    // 3. Streak Calculation
    const dailyData = await this.prisma.githubContribution.findMany({
      where: { githubAccountId: account.id },
      orderBy: { date: 'asc' },
    });

    const contributionDays = dailyData.map(d => ({
      date: d.date,
      count: d.total,
    })).filter(d => d.count > 0);

    const streaks = this.streakCalculator.calculate(contributionDays);

    // 4. Language Analytics
    const languages = await this.prisma.githubLanguage.findMany({
      where: {
        repository: { githubAccountId: account.id },
      },
      orderBy: { bytes: 'desc' },
      take: 5,
    });

    // 5. Freshness
    const isStale = account.updatedAt < new Date(Date.now() - 24 * 60 * 60 * 1000);

    return {
      profile: {
        repositories: repoCount,
        followers: 0, // Source needed from Profile Sync
        following: 0,  // Source needed from Profile Sync
      },
      contributions: {
        value: yearContributions._sum.total || 0,
        status: 'COMPLETE',
        period: currentYear.toString(),
      },
      streak: streaks,
      languages: languages.map(l => ({
        name: l.language,
        percentage: l.percentage,
        bytes: l.bytes,
      })),
      dataFreshness: {
        lastSyncAt: account.updatedAt,
        status: isStale ? 'STALE' : 'FRESH',
      },
    };
  }

  async getContributionCalendar(userId: string, year: number) {
    const account = await this.prisma.githubAccount.findUnique({
      where: { userId },
    });

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    const contributions = await this.prisma.githubContribution.findMany({
      where: {
        githubAccountId: account!.id,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    return contributions.map(c => ({
      date: c.date.toISOString().split('T')[0],
      count: c.total,
    }));
  }
}
