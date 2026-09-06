import { ProviderHealthService } from '../../src/application/readme/providers/provider-health.service';
import { ExternalGithubStatsProvider } from '../../src/application/readme/providers/external-providers';

describe('ProviderHealthService', () => {
  let healthService: ProviderHealthService;

  beforeEach(() => {
    healthService = new ProviderHealthService();
  });

  it('records successful calls and resets failure count', () => {
    healthService.recordFailure('github-stats-readme', 'NETWORK_TIMEOUT');
    expect(healthService.getHealth('github-stats-readme').failureCount).toBe(1);

    healthService.recordSuccess('github-stats-readme', 35);
    const health = healthService.getHealth('github-stats-readme');
    expect(health.failureCount).toBe(0);
    expect(health.status).toBe('ENABLED');
    expect(health.latencyMs).toBe(35);
  });

  it('transitions to DEGRADED and UNAVAILABLE upon reaching failure thresholds', () => {
    // 1 to 2 failures: status remains ENABLED
    healthService.recordFailure('github-stats-readme', '500_ERROR');
    healthService.recordFailure('github-stats-readme', '500_ERROR');
    expect(healthService.getHealth('github-stats-readme').status).toBe('ENABLED');

    // 3 failures: status becomes DEGRADED
    healthService.recordFailure('github-stats-readme', '500_ERROR');
    expect(healthService.getHealth('github-stats-readme').status).toBe('DEGRADED');

    // 5 failures: status becomes UNAVAILABLE
    healthService.recordFailure('github-stats-readme', '500_ERROR');
    healthService.recordFailure('github-stats-readme', '500_ERROR');
    expect(healthService.getHealth('github-stats-readme').status).toBe('UNAVAILABLE');
  });

  it('runs diagnostic health checks with rate limiting cooldown', async () => {
    const provider = new ExternalGithubStatsProvider();
    const h1 = await healthService.checkHealth(provider, true);
    expect(h1.status).toBe('ENABLED');

    // Immediate subsequent check without force uses cached timestamp
    const h2 = await healthService.checkHealth(provider, false);
    expect(h2.lastCheckedAt).toBe(h1.lastCheckedAt);
  });
});
