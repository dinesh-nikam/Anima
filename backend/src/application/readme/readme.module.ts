import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ReadmeRenderService } from './readme.service';
import { ReadmeDraftService } from './readme-draft.service';
import { ReadmePublicationService } from './services/readme-publication.service';
import { ReadmeDiffService } from './services/readme-diff.service';
import { GithubClient } from '../../integration/github.client';
import { EncryptionService } from '../../security/encryption.service';
import { ReadmeComponentRegistry } from './registry/component-registry.service';
import { MarkdownRenderer } from './renderers/markdown.renderer';
import { HeroRenderer } from './renderers/hero.renderer';
import { GithubStatsRenderer } from './renderers/github-stats.renderer';
import {
  StreakStatsRenderer,
  TopLanguagesRenderer,
  ContributionStatsRenderer,
  ContributionGraphRenderer,
  RepositoryStatsRenderer,
  ActivityRenderer,
  PullRequestsRenderer,
  IssuesRenderer,
  ReviewsRenderer,
} from './renderers/statistics.renderers';
import {
  AboutRenderer,
  ProfileSummaryRenderer,
  SocialLinksRenderer,
  ContactRenderer,
  CurrentFocusRenderer,
} from './renderers/profile.renderers';
import {
  AchievementsRenderer,
  TrophyWallRenderer,
  AchievementSummaryRenderer,
  AchievementTimelineRenderer,
  SkillsRenderer,
  ProjectsRenderer,
  FeaturedProjectsRenderer,
  QuoteRenderer,
  CalloutRenderer,
  DividerRenderer,
  FooterRenderer,
  VisitorCounterRenderer,
  CustomMarkdownRenderer,
} from './renderers/achievements-and-presentation.renderers';
import {
  FollowersRenderer,
  FollowingRenderer,
  OpenSourceRenderer,
  SponsorsRenderer,
} from './renderers/community.renderers';
import { ThemeRegistry } from './themes/theme.registry';
import { TemplateRegistry } from './templates/template.registry';
import { ProviderRegistry } from './providers/provider.registry';
import { ProviderHealthService } from './providers/provider-health.service';
import {
  InternalGithubStatsProvider,
  InternalContributionsProvider,
  InternalLanguagesProvider,
  InternalAchievementsProvider,
  InternalTrophiesProvider,
  InternalActivityProvider,
} from './providers/internal-providers';
import {
  ExternalGithubStatsProvider,
  ExternalStreakStatsProvider,
  ExternalTopLanguagesProvider,
  ExternalProfileTrophyProvider,
  ExternalShieldsBadgeProvider,
  ExternalVisitorCounterProvider,
  ExternalCustomImageProvider,
} from './providers/external-providers';
import { RenderContextBuilder } from './render-context.builder';
import { AnalyticsService } from '../analytics/analytics.service';
import { StreakCalculator } from '../analytics/calculators/streak.calculator';
import { AchievementService } from '../achievements/achievement.service';
import { AchievementRuleEngine } from '../achievements/rules/rule-engine';

@Module({
  providers: [
    ReadmeRenderService,
    ReadmeDraftService,
    ReadmePublicationService,
    ReadmeDiffService,
    GithubClient,
    EncryptionService,
    ReadmeComponentRegistry,
    MarkdownRenderer,
    HeroRenderer,
    GithubStatsRenderer,
    StreakStatsRenderer,
    TopLanguagesRenderer,
    ContributionStatsRenderer,
    ContributionGraphRenderer,
    RepositoryStatsRenderer,
    ActivityRenderer,
    PullRequestsRenderer,
    IssuesRenderer,
    ReviewsRenderer,
    AboutRenderer,
    ProfileSummaryRenderer,
    SocialLinksRenderer,
    ContactRenderer,
    CurrentFocusRenderer,
    AchievementsRenderer,
    TrophyWallRenderer,
    AchievementSummaryRenderer,
    AchievementTimelineRenderer,
    SkillsRenderer,
    ProjectsRenderer,
    FeaturedProjectsRenderer,
    QuoteRenderer,
    CalloutRenderer,
    DividerRenderer,
    FooterRenderer,
    VisitorCounterRenderer,
    CustomMarkdownRenderer,
    FollowersRenderer,
    FollowingRenderer,
    OpenSourceRenderer,
    SponsorsRenderer,
    ThemeRegistry,
    TemplateRegistry,
    ProviderRegistry,
    ProviderHealthService,
    InternalGithubStatsProvider,
    InternalContributionsProvider,
    InternalLanguagesProvider,
    InternalAchievementsProvider,
    InternalTrophiesProvider,
    InternalActivityProvider,
    ExternalGithubStatsProvider,
    ExternalStreakStatsProvider,
    ExternalTopLanguagesProvider,
    ExternalProfileTrophyProvider,
    ExternalShieldsBadgeProvider,
    ExternalVisitorCounterProvider,
    ExternalCustomImageProvider,
    RenderContextBuilder,
    AnalyticsService,
    StreakCalculator,
    AchievementService,
    AchievementRuleEngine,
  ],
  exports: [
    ReadmeRenderService,
    ReadmeDraftService,
    ReadmePublicationService,
    ReadmeDiffService,
    ReadmeComponentRegistry,
    MarkdownRenderer,
    ThemeRegistry,
    TemplateRegistry,
    ProviderRegistry,
    ProviderHealthService,
    RenderContextBuilder,
  ],
})
export class ReadmeModule implements OnModuleInit {
  private readonly logger = new Logger(ReadmeModule.name);

  constructor(
    private readonly registry: ReadmeComponentRegistry,
    private readonly hero: HeroRenderer,
    private readonly about: AboutRenderer,
    private readonly profileSummary: ProfileSummaryRenderer,
    private readonly socialLinks: SocialLinksRenderer,
    private readonly contact: ContactRenderer,
    private readonly currentFocus: CurrentFocusRenderer,
    private readonly githubStats: GithubStatsRenderer,
    private readonly streakStats: StreakStatsRenderer,
    private readonly topLanguages: TopLanguagesRenderer,
    private readonly contributionStats: ContributionStatsRenderer,
    private readonly contributionGraph: ContributionGraphRenderer,
    private readonly repositoryStats: RepositoryStatsRenderer,
    private readonly activity: ActivityRenderer,
    private readonly pullRequests: PullRequestsRenderer,
    private readonly issues: IssuesRenderer,
    private readonly reviews: ReviewsRenderer,
    private readonly achievements: AchievementsRenderer,
    private readonly trophyWall: TrophyWallRenderer,
    private readonly achievementSummary: AchievementSummaryRenderer,
    private readonly achievementTimeline: AchievementTimelineRenderer,
    private readonly skills: SkillsRenderer,
    private readonly projects: ProjectsRenderer,
    private readonly featuredProjects: FeaturedProjectsRenderer,
    private readonly quote: QuoteRenderer,
    private readonly callout: CalloutRenderer,
    private readonly divider: DividerRenderer,
    private readonly footer: FooterRenderer,
    private readonly visitorCounter: VisitorCounterRenderer,
    private readonly customMarkdown: CustomMarkdownRenderer,
    private readonly followers: FollowersRenderer,
    private readonly following: FollowingRenderer,
    private readonly openSource: OpenSourceRenderer,
    private readonly sponsors: SponsorsRenderer,
  ) {}

  onModuleInit(): void {
    const renderers = [
      this.hero,
      this.about,
      this.profileSummary,
      this.socialLinks,
      this.contact,
      this.currentFocus,
      this.githubStats,
      this.streakStats,
      this.topLanguages,
      this.contributionStats,
      this.contributionGraph,
      this.repositoryStats,
      this.activity,
      this.pullRequests,
      this.issues,
      this.reviews,
      this.achievements,
      this.trophyWall,
      this.achievementSummary,
      this.achievementTimeline,
      this.skills,
      this.projects,
      this.featuredProjects,
      this.quote,
      this.callout,
      this.divider,
      this.footer,
      this.visitorCounter,
      this.customMarkdown,
      this.followers,
      this.following,
      this.openSource,
      this.sponsors,
    ];
    for (const r of renderers) {
      this.registry.register(r);
    }
    this.logger.log(`Registered ${renderers.length} README components`);
  }
}
