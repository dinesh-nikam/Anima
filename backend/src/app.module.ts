import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './api/controllers/health.controller';
import { HealthService } from './infrastructure/external-services/health.service';
import { AuthController } from './api/controllers/auth.controller';
import { AuthService } from './application/services/auth.service';
import { GithubClient } from './integration/github.client';
import { EncryptionService } from './security/encryption.service';
import { SessionService } from './infrastructure/external-services/session.service';
import { GithubSyncService } from './application/services/github-sync.service';
import { GithubController } from './api/controllers/github.controller';
import { AnalyticsController } from './api/controllers/analytics.controller';
import { AnalyticsService } from './application/analytics/analytics.service';
import { StreakCalculator } from './application/analytics/calculators/streak.calculator';
import { AchievementController } from './api/controllers/achievement.controller';
import { AchievementService } from './application/achievements/achievement.service';
import { AchievementRuleEngine } from './application/achievements/rules/rule-engine';
import { ReadmeController } from './api/controllers/readme.controller';
import { ReadmeModule } from './application/readme/readme.module';
import { AuthGuard } from './security/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ReadmeModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    GithubController,
    AnalyticsController,
    AchievementController,
    ReadmeController,
  ],
  providers: [
    HealthService,
    AuthService,
    GithubClient,
    EncryptionService,
    SessionService,
    GithubSyncService,
    AnalyticsService,
    StreakCalculator,
    AchievementService,
    AchievementRuleEngine,
    AuthGuard,
  ],
})
export class AppModule {}
