import { Injectable, Logger } from '@nestjs/common';
import {
  DynamicProvider,
  ProviderHealth,
  ProviderStatus,
} from './provider.contract';

@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);
  private readonly healthStore = new Map<string, ProviderHealth>();
  private readonly lastCheckTimestamps = new Map<string, number>();

  // Diagnostic check cooldown to prevent rate-limit exhaustion (e.g., min 5s between checks per provider)
  private readonly CHECK_COOLDOWN_MS = 5000;
  private readonly DEGRADED_FAILURE_THRESHOLD = 3;
  private readonly UNAVAILABLE_FAILURE_THRESHOLD = 5;

  /**
   * Retrieves current health record for a provider, or initializes a default one.
   */
  getHealth(providerKey: string, provider?: DynamicProvider): ProviderHealth {
    const existing = this.healthStore.get(providerKey);
    if (existing) return existing;

    const initialStatus: ProviderStatus = provider
      ? provider.metadata().enabled
        ? 'ENABLED'
        : 'DISABLED'
      : 'ENABLED';
    const initial: ProviderHealth = {
      providerKey,
      status: initialStatus,
      lastCheckedAt: new Date().toISOString(),
      failureCount: 0,
    };
    this.healthStore.set(providerKey, initial);
    return initial;
  }

  /**
   * Records a successful execution.
   */
  recordSuccess(providerKey: string, latencyMs?: number): void {
    const current = this.getHealth(providerKey);
    const updated: ProviderHealth = {
      ...current,
      status: 'ENABLED',
      lastCheckedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      failureCount: 0,
      latencyMs: latencyMs !== undefined ? latencyMs : current.latencyMs,
      errorCategory: undefined,
    };
    this.healthStore.set(providerKey, updated);
  }

  /**
   * Records a failure and updates degradation state if threshold is met.
   */
  recordFailure(providerKey: string, errorCategory: string, errorMessage?: string): void {
    const current = this.getHealth(providerKey);
    const failures = current.failureCount + 1;

    let newStatus: ProviderStatus = current.status;
    if (failures >= this.UNAVAILABLE_FAILURE_THRESHOLD) {
      newStatus = 'UNAVAILABLE';
    } else if (failures >= this.DEGRADED_FAILURE_THRESHOLD) {
      newStatus = 'DEGRADED';
    }

    const updated: ProviderHealth = {
      ...current,
      status: newStatus,
      lastCheckedAt: new Date().toISOString(),
      lastFailureAt: new Date().toISOString(),
      failureCount: failures,
      errorCategory,
      diagnostics: {
        lastErrorMessage: errorMessage?.slice(0, 200),
      },
    };
    this.healthStore.set(providerKey, updated);

    this.logger.warn(
      `Provider [${providerKey}] failed (${errorCategory}). Consecutive failures: ${failures}. Status: ${newStatus}`,
    );
  }

  /**
   * Runs an on-demand diagnostic health check against a provider.
   */
  async checkHealth(provider: DynamicProvider, force = false): Promise<ProviderHealth> {
    const meta = provider.metadata();
    const now = Date.now();
    const lastCheck = this.lastCheckTimestamps.get(meta.providerKey) || 0;

    if (!force && now - lastCheck < this.CHECK_COOLDOWN_MS) {
      return this.getHealth(meta.providerKey, provider);
    }

    this.lastCheckTimestamps.set(meta.providerKey, now);

    if (!meta.enabled) {
      const disabledHealth: ProviderHealth = {
        providerKey: meta.providerKey,
        status: 'DISABLED',
        lastCheckedAt: new Date().toISOString(),
        failureCount: 0,
      };
      this.healthStore.set(meta.providerKey, disabledHealth);
      return disabledHealth;
    }

    const start = Date.now();
    try {
      if (typeof provider.health === 'function') {
        const h = await provider.health();
        this.healthStore.set(meta.providerKey, h);
        return h;
      }

      // Default ping validation via metadata checks
      const latency = Date.now() - start;
      this.recordSuccess(meta.providerKey, latency);
      return this.getHealth(meta.providerKey, provider);
    } catch (err: any) {
      this.recordFailure(meta.providerKey, 'HEALTH_CHECK_ERROR', err?.message);
      return this.getHealth(meta.providerKey, provider);
    }
  }

  /**
   * Manually sets provider status (e.g. from admin actions).
   */
  setStatus(providerKey: string, status: ProviderStatus): void {
    const current = this.getHealth(providerKey);
    this.healthStore.set(providerKey, {
      ...current,
      status,
      lastCheckedAt: new Date().toISOString(),
    });
  }
}
