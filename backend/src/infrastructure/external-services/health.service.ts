import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly prisma = new PrismaClient();
  private readonly redis: Redis | null = null;
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
          connectTimeout: 1000,
          enableOfflineQueue: false,
        });
        this.redis.on('error', () => {
          // Suppress unhandled ECONNREFUSED in local non-Docker development
        });
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Redis client for health check: ${err.message}`);
      }
    }
  }

  async check(): Promise<HealthCheckResult> {
    let dbStatus: 'up' | 'down' = 'up';
    let dbLatency: number | undefined;
    let dbError: string | undefined;

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (err: any) {
      dbStatus = 'down';
      dbError = err.message;
      this.logger.error(`Database health check failed: ${err.message}`);
    }

    let redisStatus: 'up' | 'down' = 'up';
    let redisLatency: number | undefined;
    let redisError: string | undefined;

    if (this.redis) {
      const redisStart = Date.now();
      try {
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 500)),
        ]);
        redisLatency = Date.now() - redisStart;
      } catch (err: any) {
        redisStatus = 'down';
        redisError = err.message;
      }
    } else {
      redisStatus = 'down';
      redisError = 'Not configured';
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';
    const isDegraded = dbStatus === 'up' && redisStatus === 'down';

    return {
      status: isHealthy ? 'ok' : isDegraded ? 'degraded' : 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatency,
          ...(redisError ? { error: redisError } : {}),
        },
      },
    };
  }
}
