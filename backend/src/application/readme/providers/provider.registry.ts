import { Injectable, Logger } from '@nestjs/common';
import { ProviderConfigurationException } from '../exceptions/readme.exceptions';
import { RenderContext } from '../models/readme.model';
import {
  DynamicProvider,
  ProviderCategory,
  ProviderCapability,
  ProviderFallbackPolicy,
  ProviderHealth,
  ProviderMetadata,
  ProviderParameterSchema,
  ProviderRequest,
  ProviderResult,
  ProviderStatus,
} from './provider.contract';
import {
  InternalGithubStatsProvider,
  InternalContributionsProvider,
  InternalLanguagesProvider,
  InternalAchievementsProvider,
  InternalTrophiesProvider,
  InternalActivityProvider,
} from './internal-providers';
import {
  ExternalGithubStatsProvider,
  ExternalStreakStatsProvider,
  ExternalTopLanguagesProvider,
  ExternalProfileTrophyProvider,
  ExternalShieldsBadgeProvider,
  ExternalVisitorCounterProvider,
  ExternalCustomImageProvider,
} from './external-providers';
import { ProviderHealthService } from './provider-health.service';

// Re-export contract types for clean modular consumption
export * from './provider.contract';
export * from './provider-url.builder';

// Backward compatibility alias for earlier phases
export type ProviderDefinition = ProviderMetadata;

interface CacheEntry {
  result: ProviderResult;
  expiresAt: number;
}

@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly providers = new Map<string, DynamicProvider>();
  private readonly resultCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds TTL

  constructor(
    private readonly healthService?: ProviderHealthService,
    internalStats?: InternalGithubStatsProvider,
    internalContributions?: InternalContributionsProvider,
    internalLanguages?: InternalLanguagesProvider,
    internalAchievements?: InternalAchievementsProvider,
    internalTrophies?: InternalTrophiesProvider,
    internalActivity?: InternalActivityProvider,
    externalStats?: ExternalGithubStatsProvider,
    externalStreak?: ExternalStreakStatsProvider,
    externalLanguages?: ExternalTopLanguagesProvider,
    externalTrophies?: ExternalProfileTrophyProvider,
    externalShields?: ExternalShieldsBadgeProvider,
    externalVisitor?: ExternalVisitorCounterProvider,
    externalCustom?: ExternalCustomImageProvider,
  ) {
    if (!this.healthService) {
      this.healthService = new ProviderHealthService();
    }

    const defaultProviders: DynamicProvider[] = [
      internalStats || new InternalGithubStatsProvider(),
      internalContributions || new InternalContributionsProvider(),
      internalLanguages || new InternalLanguagesProvider(),
      internalAchievements || new InternalAchievementsProvider(),
      internalTrophies || new InternalTrophiesProvider(),
      internalActivity || new InternalActivityProvider(),
      externalStats || new ExternalGithubStatsProvider(),
      externalStreak || new ExternalStreakStatsProvider(),
      externalLanguages || new ExternalTopLanguagesProvider(),
      externalTrophies || new ExternalProfileTrophyProvider(),
      externalShields || new ExternalShieldsBadgeProvider(),
      externalVisitor || new ExternalVisitorCounterProvider(),
      externalCustom || new ExternalCustomImageProvider(),
    ];

    for (const p of defaultProviders) {
      this.register(p);
    }
  }

  register(provider: DynamicProvider): void {
    const meta = provider.metadata();
    this.providers.set(meta.providerKey, provider);
    this.healthService?.getHealth(meta.providerKey, provider);
  }

  getProvider(key: string): DynamicProvider | undefined {
    return this.providers.get(key);
  }

  getByKey(key: string): ProviderMetadata | undefined {
    const p = this.providers.get(key);
    if (!p) return undefined;
    const meta = p.metadata();
    const health = this.healthService?.getHealth(key, p);
    return {
      ...meta,
      status: health?.status || meta.status,
      enabled: (health?.status || meta.status) === 'ENABLED',
    };
  }

  list(includeDisabled = false): ProviderMetadata[] {
    const all = Array.from(this.providers.keys()).map((k) => this.getByKey(k)!);
    return includeDisabled ? all : all.filter((p) => p.enabled && p.status === 'ENABLED');
  }

  listByCategory(category: ProviderCategory, includeDisabled = false): ProviderMetadata[] {
    return this.list(includeDisabled).filter((p) => p.category === category);
  }

  listByComponent(componentKey: string, includeDisabled = false): ProviderMetadata[] {
    return this.list(includeDisabled).filter(
      (p) => p.supportedComponents.includes(componentKey) || p.supportedComponents.includes('*'),
    );
  }

  /**
   * Primary resolution method for dynamic providers with isolated caching and health tracking.
   */
  resolve(request: ProviderRequest, context?: RenderContext): ProviderResult {
    const provider = this.providers.get(request.providerKey);
    if (!provider) {
      throw new ProviderConfigurationException(request.providerKey, 'Provider not found');
    }

    const meta = provider.metadata();
    const health = this.healthService?.getHealth(request.providerKey, provider);
    const effectiveStatus = health?.status || meta.status;

    if (!meta.enabled || effectiveStatus === 'DISABLED') {
      throw new ProviderConfigurationException(request.providerKey, 'Provider is disabled');
    }

    if (effectiveStatus === 'UNAVAILABLE') {
      return {
        providerKey: meta.providerKey,
        version: meta.version,
        status: 'UNAVAILABLE',
        contentType: 'DATA',
        warnings: [`Provider '${meta.name}' is currently unavailable due to repeated errors`],
        generatedAt: new Date().toISOString(),
      };
    }

    // Check isolated cache
    const cacheKey = this.buildCacheKey(request, meta.version, context);
    const cached = this.resultCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const start = Date.now();
    try {
      const result = provider.resolve(request, context);
      const latency = Date.now() - start;

      // Handle async if returned promise
      if (result instanceof Promise) {
        throw new Error('Async resolve in synchronous rendering pipeline is unsupported');
      }

      this.healthService?.recordSuccess(request.providerKey, latency);

      // Cache successful or partial results
      if (result.status === 'SUCCESS' || result.status === 'PARTIAL') {
        this.resultCache.set(cacheKey, {
          result,
          expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
      }

      return result;
    } catch (err: any) {
      this.healthService?.recordFailure(request.providerKey, 'RESOLVE_ERROR', err?.message);
      throw err;
    }
  }

  /**
   * Resilient resolution with configured fallback policies.
   */
  resolveWithFallback(
    request: ProviderRequest,
    context?: RenderContext,
    fallbackPolicy: ProviderFallbackPolicy = 'FALLBACK_TO_INTERNAL',
    fallbackProviderKey?: string,
  ): ProviderResult {
    try {
      const primary = this.resolve(request, context);
      if (primary.status === 'SUCCESS' || primary.status === 'PARTIAL') {
        return primary;
      }
      // If primary returned UNAVAILABLE, trigger fallback
      return this.handleFallback(request, context, fallbackPolicy, fallbackProviderKey, primary);
    } catch (err: any) {
      this.logger.warn(
        `Primary provider [${request.providerKey}] resolution failed: ${err?.message}. Triggering fallback policy: ${fallbackPolicy}`,
      );
      return this.handleFallback(request, context, fallbackPolicy, fallbackProviderKey, undefined, err?.message);
    }
  }

  private handleFallback(
    request: ProviderRequest,
    context?: RenderContext,
    fallbackPolicy: ProviderFallbackPolicy = 'FALLBACK_TO_INTERNAL',
    fallbackProviderKey?: string,
    initialResult?: ProviderResult,
    errorMessage?: string,
  ): ProviderResult {
    const warnings = initialResult?.warnings || [];
    if (errorMessage) warnings.push(errorMessage);

    switch (fallbackPolicy) {
      case 'FALLBACK_TO_INTERNAL': {
        const targetFallback = fallbackProviderKey || this.getInternalFallbackKey(request.providerKey);
        if (targetFallback && this.providers.has(targetFallback) && targetFallback !== request.providerKey) {
          try {
            const fallbackResult = this.resolve({ ...request, providerKey: targetFallback }, context);
            return {
              ...fallbackResult,
              warnings: [
                ...warnings,
                `Fell back from '${request.providerKey}' to authoritative internal provider '${targetFallback}'`,
              ],
            };
          } catch (fbErr: any) {
            this.logger.error(`Fallback provider [${targetFallback}] also failed: ${fbErr?.message}`);
          }
        }
        return {
          providerKey: request.providerKey,
          version: '1.0.0',
          status: 'UNAVAILABLE',
          contentType: 'DATA',
          warnings: [...warnings, 'Fallback provider unavailable'],
          generatedAt: new Date().toISOString(),
        };
      }

      case 'SHOW_UNAVAILABLE':
        return {
          providerKey: request.providerKey,
          version: '1.0.0',
          status: 'UNAVAILABLE',
          contentType: 'DATA',
          warnings: [...warnings, 'Provider unavailable'],
          generatedAt: new Date().toISOString(),
        };

      case 'HIDE':
      case 'USE_STATIC_FALLBACK':
      default:
        return {
          providerKey: request.providerKey,
          version: '1.0.0',
          status: 'UNAVAILABLE',
          contentType: 'DATA',
          warnings: [...warnings, 'Provider suppressed by fallback policy'],
          generatedAt: new Date().toISOString(),
        };
    }
  }

  private getInternalFallbackKey(providerKey: string): string | undefined {
    const mappings: Record<string, string> = {
      'github-stats-readme': 'internal-github-stats',
      'github-streak-stats': 'internal-contributions',
      'github-top-langs': 'internal-languages',
      'github-profile-trophy': 'internal-trophies',
      'shields-badge': 'internal-achievements',
      'visitor-counter': 'internal-github-stats',
    };
    return mappings[providerKey];
  }

  // -------------------------------------------------------------------------
  // Provider Administration & State Mutation
  // -------------------------------------------------------------------------

  enableProvider(key: string): ProviderMetadata {
    const p = this.providers.get(key);
    if (!p) throw new ProviderConfigurationException(key, 'Provider not found');
    this.healthService?.setStatus(key, 'ENABLED');
    this.invalidateCacheForProvider(key);
    return this.getByKey(key)!;
  }

  disableProvider(key: string): ProviderMetadata {
    const p = this.providers.get(key);
    if (!p) throw new ProviderConfigurationException(key, 'Provider not found');
    this.healthService?.setStatus(key, 'DISABLED');
    this.invalidateCacheForProvider(key);
    return this.getByKey(key)!;
  }

  deprecateProvider(key: string): ProviderMetadata {
    const p = this.providers.get(key);
    if (!p) throw new ProviderConfigurationException(key, 'Provider not found');
    this.healthService?.setStatus(key, 'DEPRECATED');
    return this.getByKey(key)!;
  }

  getHealth(key: string): ProviderHealth {
    const p = this.providers.get(key);
    if (!p) throw new ProviderConfigurationException(key, 'Provider not found');
    return this.healthService!.getHealth(key, p);
  }

  async runHealthCheck(key: string, force = true): Promise<ProviderHealth> {
    const p = this.providers.get(key);
    if (!p) throw new ProviderConfigurationException(key, 'Provider not found');
    return this.healthService!.checkHealth(p, force);
  }

  invalidateCacheForProvider(key: string): void {
    for (const cacheKey of Array.from(this.resultCache.keys())) {
      if (cacheKey.startsWith(`${key}:`)) {
        this.resultCache.delete(cacheKey);
      }
    }
  }

  private buildCacheKey(request: ProviderRequest, version: string, context?: RenderContext): string {
    const user = context?.profile?.githubLogin || 'anonymous';
    const paramsStr = JSON.stringify(request.parameters || {});
    return `${request.providerKey}:${version}:${request.theme || 'default'}:${user}:${paramsStr}`;
  }
}
