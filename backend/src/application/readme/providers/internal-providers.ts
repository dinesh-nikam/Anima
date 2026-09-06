import { Injectable } from '@nestjs/common';
import { RenderContext } from '../models/readme.model';
import {
  DynamicProvider,
  ProviderCapability,
  ProviderMetadata,
  ProviderRequest,
  ProviderResult,
  ProviderHealth,
} from './provider.contract';

// ---------------------------------------------------------------------------
// 1. Internal GitHub Stats Provider (Authoritative Analytics)
// ---------------------------------------------------------------------------

@Injectable()
export class InternalGithubStatsProvider implements DynamicProvider {
  metadata(): ProviderMetadata {
    return {
      providerKey: 'internal-github-stats',
      name: 'Internal Verified GitHub Stats',
      description: 'Authoritative statistics computed directly from verified repository analytics.',
      category: 'GITHUB_STATS',
      version: '1.0.0',
      enabled: true,
      status: 'ENABLED',
      isSystem: true,
      capabilities: ['STATISTICS', 'STATIC_MARKDOWN', 'PROFILE_DATA'],
      supportedComponents: [
        'github-stats',
        'repository-stats',
        'pull-requests',
        'issues',
        'reviews',
      ],
      configurationSchema: [
        {
          name: 'showIcons',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Display icons next to metrics',
        },
        {
          name: 'includePrivate',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include private repository stats if permitted',
        },
      ],
    };
  }

  capabilities(): ProviderCapability[] {
    return ['STATISTICS', 'STATIC_MARKDOWN', 'PROFILE_DATA'];
  }

  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown> {
    return {
      showIcons: parameters['showIcons'] !== false,
      includePrivate: Boolean(parameters['includePrivate']),
    };
  }

  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const stats = context?.statistics;
    const profile = context?.profile;

    if (!stats || !profile?.githubLogin) {
      return {
        providerKey: 'internal-github-stats',
        version: '1.0.0',
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: ['User statistics or profile not available in render context'],
        generatedAt: new Date().toISOString(),
      };
    }

    const availableMetrics: Record<string, number | undefined> = {};
    if (stats.contributions.status === 'AVAILABLE') availableMetrics['contributions'] = stats.contributions.value;
    if (stats.repositories.status === 'AVAILABLE') availableMetrics['repositories'] = stats.repositories.value;
    if (stats.stars.status === 'AVAILABLE') availableMetrics['stars'] = stats.stars.value;
    if (stats.forks.status === 'AVAILABLE') availableMetrics['forks'] = stats.forks.value;
    if (stats.pullRequests.status === 'AVAILABLE') availableMetrics['pullRequests'] = stats.pullRequests.value;
    if (stats.issues.status === 'AVAILABLE') availableMetrics['issues'] = stats.issues.value;
    if (stats.reviews.status === 'AVAILABLE') availableMetrics['reviews'] = stats.reviews.value;
    if (stats.followers.status === 'AVAILABLE') availableMetrics['followers'] = stats.followers.value;

    return {
      providerKey: 'internal-github-stats',
      version: '1.0.0',
      status: 'SUCCESS',
      contentType: 'DATA',
      data: {
        username: profile.githubLogin,
        metrics: availableMetrics,
      },
      metadata: {
        source: 'authoritative_analytics',
        sourceUpdatedAt: stats.contributions.sourceUpdatedAt,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  health(): ProviderHealth {
    return {
      providerKey: 'internal-github-stats',
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Internal Contributions Provider (Authoritative Sync Data)
// ---------------------------------------------------------------------------

@Injectable()
export class InternalContributionsProvider implements DynamicProvider {
  metadata(): ProviderMetadata {
    return {
      providerKey: 'internal-contributions',
      name: 'Internal Verified Contributions',
      description: 'Authoritative contribution summaries aggregated from verified git sync runs.',
      category: 'CONTRIBUTIONS',
      version: '1.0.0',
      enabled: true,
      status: 'ENABLED',
      isSystem: true,
      capabilities: ['CONTRIBUTION_DATA', 'STATISTICS', 'STATIC_MARKDOWN'],
      supportedComponents: ['contribution-stats', 'contribution-graph'],
      configurationSchema: [
        {
          name: 'days',
          type: 'number',
          required: false,
          default: 90,
          description: 'Number of past days to display',
        },
      ],
    };
  }

  capabilities(): ProviderCapability[] {
    return ['CONTRIBUTION_DATA', 'STATISTICS', 'STATIC_MARKDOWN'];
  }

  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown> {
    const days = Math.max(7, Math.min(365, Number(parameters['days']) || 90));
    return { days };
  }

  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const c = context?.statistics?.contributions;
    if (!c || c.status !== 'AVAILABLE' || c.value === undefined) {
      return {
        providerKey: 'internal-contributions',
        version: '1.0.0',
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: ['Contribution data unavailable in context'],
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      providerKey: 'internal-contributions',
      version: '1.0.0',
      status: 'SUCCESS',
      contentType: 'DATA',
      data: {
        totalContributions: c.value,
        sourceUpdatedAt: c.sourceUpdatedAt,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  health(): ProviderHealth {
    return {
      providerKey: 'internal-contributions',
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Internal Languages Provider (Verified Repository Languages)
// ---------------------------------------------------------------------------

@Injectable()
export class InternalLanguagesProvider implements DynamicProvider {
  metadata(): ProviderMetadata {
    return {
      providerKey: 'internal-languages',
      name: 'Internal Verified Languages',
      description: 'Authoritative language distribution extracted from verified user repositories.',
      category: 'TOP_LANGUAGES',
      version: '1.0.0',
      enabled: true,
      status: 'ENABLED',
      isSystem: true,
      capabilities: ['STATISTICS', 'STATIC_MARKDOWN'],
      supportedComponents: ['top-languages', 'skills'],
      configurationSchema: [
        {
          name: 'limit',
          type: 'number',
          required: false,
          default: 5,
          description: 'Maximum languages to return',
        },
      ],
    };
  }

  capabilities(): ProviderCapability[] {
    return ['STATISTICS', 'STATIC_MARKDOWN'];
  }

  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown> {
    const limit = Math.max(1, Math.min(20, Number(parameters['limit']) || 5));
    return { limit };
  }

  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const langs = context?.languages?.items;
    if (!langs || langs.status !== 'AVAILABLE' || !langs.value || langs.value.length === 0) {
      return {
        providerKey: 'internal-languages',
        version: '1.0.0',
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: ['Language statistics unavailable in context'],
        generatedAt: new Date().toISOString(),
      };
    }

    const limit = Number(request.parameters['limit']) || 5;
    const topLangs = langs.value.slice(0, limit);

    return {
      providerKey: 'internal-languages',
      version: '1.0.0',
      status: 'SUCCESS',
      contentType: 'DATA',
      data: {
        languages: topLangs,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  health(): ProviderHealth {
    return {
      providerKey: 'internal-languages',
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Internal Achievements Provider (Phase 5 Engine)
// ---------------------------------------------------------------------------

@Injectable()
export class InternalAchievementsProvider implements DynamicProvider {
  metadata(): ProviderMetadata {
    return {
      providerKey: 'internal-achievements',
      name: 'Internal Verified Achievements',
      description: 'Authoritative user achievements evaluated by the Phase 5 rule engine.',
      category: 'ACHIEVEMENTS',
      version: '1.0.0',
      enabled: true,
      status: 'ENABLED',
      isSystem: true,
      capabilities: ['BADGE', 'STATIC_MARKDOWN'],
      supportedComponents: ['achievements', 'achievement-summary', 'achievement-timeline'],
      configurationSchema: [
        {
          name: 'showRarity',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Display achievement rarity badge',
        },
      ],
    };
  }

  capabilities(): ProviderCapability[] {
    return ['BADGE', 'STATIC_MARKDOWN'];
  }

  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown> {
    return {
      showRarity: parameters['showRarity'] !== false,
    };
  }

  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const a = context?.achievements;
    if (!a || a.earned.status !== 'AVAILABLE' || !a.earned.value) {
      return {
        providerKey: 'internal-achievements',
        version: '1.0.0',
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: ['Achievements unavailable in context'],
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      providerKey: 'internal-achievements',
      version: '1.0.0',
      status: 'SUCCESS',
      contentType: 'DATA',
      data: {
        earned: a.earned.value,
        inProgress: a.inProgress.value || [],
      },
      generatedAt: new Date().toISOString(),
    };
  }

  health(): ProviderHealth {
    return {
      providerKey: 'internal-achievements',
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Internal Trophies Provider (Phase 5 Trophy Engine)
// ---------------------------------------------------------------------------

@Injectable()
export class InternalTrophiesProvider implements DynamicProvider {
  metadata(): ProviderMetadata {
    return {
      providerKey: 'internal-trophies',
      name: 'Internal Verified Trophies',
      description: 'Authoritative trophy showcase evaluated by the Phase 5 trophy engine.',
      category: 'TROPHIES',
      version: '1.0.0',
      enabled: true,
      status: 'ENABLED',
      isSystem: true,
      capabilities: ['TROPHY', 'STATIC_MARKDOWN'],
      supportedComponents: ['trophy-wall'],
      configurationSchema: [
        {
          name: 'minLevel',
          type: 'enum',
          required: false,
          default: 'BRONZE',
          enumValues: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
          description: 'Minimum trophy level to include',
        },
      ],
    };
  }

  capabilities(): ProviderCapability[] {
    return ['TROPHY', 'STATIC_MARKDOWN'];
  }

  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown> {
    const minLevel = String(parameters['minLevel'] || 'BRONZE');
    return { minLevel };
  }

  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const t = context?.trophies?.items;
    if (!t || t.status !== 'AVAILABLE' || !t.value) {
      return {
        providerKey: 'internal-trophies',
        version: '1.0.0',
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: ['Trophies unavailable in context'],
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      providerKey: 'internal-trophies',
      version: '1.0.0',
      status: 'SUCCESS',
      contentType: 'DATA',
      data: {
        trophies: t.value,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  health(): ProviderHealth {
    return {
      providerKey: 'internal-trophies',
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// 6. Internal Activity Provider (Authoritative Event Stream)
// ---------------------------------------------------------------------------

@Injectable()
export class InternalActivityProvider implements DynamicProvider {
  metadata(): ProviderMetadata {
    return {
      providerKey: 'internal-activity',
      name: 'Internal Verified Activity',
      description: 'Authoritative recent activity events aggregated from verified sync runs.',
      category: 'ACTIVITY',
      version: '1.0.0',
      enabled: true,
      status: 'ENABLED',
      isSystem: true,
      capabilities: ['PROFILE_DATA', 'STATIC_MARKDOWN'],
      supportedComponents: ['activity'],
      configurationSchema: [
        {
          name: 'limit',
          type: 'number',
          required: false,
          default: 5,
          description: 'Number of recent activities to display',
        },
      ],
    };
  }

  capabilities(): ProviderCapability[] {
    return ['PROFILE_DATA', 'STATIC_MARKDOWN'];
  }

  validateConfiguration(parameters: Record<string, unknown>): Record<string, unknown> {
    const limit = Math.max(1, Math.min(20, Number(parameters['limit']) || 5));
    return { limit };
  }

  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const act = context?.activity?.items;
    if (!act || act.status !== 'AVAILABLE' || !act.value) {
      return {
        providerKey: 'internal-activity',
        version: '1.0.0',
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: ['Activity stream unavailable in context'],
        generatedAt: new Date().toISOString(),
      };
    }

    const limit = Number(request.parameters['limit']) || 5;
    return {
      providerKey: 'internal-activity',
      version: '1.0.0',
      status: 'SUCCESS',
      contentType: 'DATA',
      data: {
        items: act.value.slice(0, limit),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  health(): ProviderHealth {
    return {
      providerKey: 'internal-activity',
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: 0,
    };
  }
}
