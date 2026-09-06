import { Injectable, Logger } from '@nestjs/common';

export interface ContributionDay {
  date: Date;
  count: number;
}

export interface StreakResult {
  current: number;
  longest: number;
}

@Injectable()
export class StreakCalculator {
  calculate(contributions: ContributionDay[]): StreakResult {
    if (!contributions || contributions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Sort dates ascending
    const sorted = contributions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let longest = 0;
    let current = 0;
    let tempLongest = 0;
    
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const dateSet = new Set(
      sorted.filter((c) => c.count > 0).map((c) => formatDate(c.date))
    );

    // Calculate Longest Streak
    let streak = 0;
    const sortedDates = Array.from(dateSet).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i > 0) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diff === 1) {
          streak++;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }
      longest = Math.max(longest, streak);
    }

    // Calculate Current Streak
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const todayStr = formatDate(checkDate);

    while (true) {
      const dateStr = formatDate(checkDate);
      if (dateSet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Allow one gap day (yesterday) to keep streak alive if today is 0
        if (currentStreak === 0 && dateStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    return {
      current: currentStreak,
      longest: longest,
    };
  }
}
