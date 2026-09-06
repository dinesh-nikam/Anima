import { Injectable } from '@nestjs/common';

export interface MetricContext {
  contributions: number;
  currentStreak: number;
  longestStreak: number;
  repositories: number;
  stars: number;
  forks: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  languagesCount: number;
  activeDays: number;
  [key: string]: any;
}

export interface EvaluationResult {
  earned: boolean;
  progress: number;
  currentValue: number;
  targetValue: number;
  status: 'LOCKED' | 'IN_PROGRESS' | 'EARNED' | 'UNAVAILABLE' | 'STALE';
}

export interface AchievementRule {
  metric: keyof MetricContext;
  operator: 'GTE' | 'LTE' | 'EQ';
  threshold: number;
}

@Injectable()
export class AchievementRuleEngine {
  evaluate(rule: AchievementRule, context: MetricContext): EvaluationResult {
    const currentValue = context[rule.metric];

    if (currentValue === undefined || currentValue === null) {
      return {
        earned: false,
        progress: 0,
        currentValue: 0,
        targetValue: rule.threshold,
        status: 'UNAVAILABLE',
      };
    }

    const { operator, threshold } = rule;
    let earned = false;

    switch (operator) {
      case 'GTE': earned = currentValue >= threshold; break;
      case 'LTE': earned = currentValue <= threshold; break;
      case 'EQ': earned = currentValue === threshold; break;
      default: throw new Error(`Unsupported operator: ${operator}`);
    }

    const progress = Math.min(100, (currentValue / threshold) * 100);

    return {
      earned,
      progress,
      currentValue,
      targetValue: threshold,
      status: earned ? 'EARNED' : 'IN_PROGRESS',
    };
  }
}
