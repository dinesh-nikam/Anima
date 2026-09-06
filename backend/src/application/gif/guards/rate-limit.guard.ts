import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  ttlMs: number; // Time window in ms (e.g. 60000)
  limit: number; // Max allowed requests in window
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

interface RecordEntry {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly defaultTtlMs = 60000; // 1 minute
  private readonly defaultLimit = 60; // 60 requests / minute
  private readonly records = new Map<string, RecordEntry>();

  constructor(private readonly reflector: Reflector) {
    // Periodically clean stale keys every 2 minutes
    const timer = setInterval(() => this.cleanupStaleRecords(), 120000);
    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Retrieve handler-specific rate limit options or defaults
    const customOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    const ttlMs = customOptions?.ttlMs || this.defaultTtlMs;
    const limit = customOptions?.limit || this.defaultLimit;

    // Identify client by user ID or IP
    const clientId = (req as any).user?.id || req.ip || req.socket.remoteAddress || 'anonymous';
    const routeKey = `${req.method}:${req.route?.path || req.path}:${clientId}`;

    const now = Date.now();
    const windowStart = now - ttlMs;

    let entry = this.records.get(routeKey);
    if (!entry) {
      entry = { timestamps: [] };
      this.records.set(routeKey, entry);
    }

    // Filter out timestamps outside window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const currentCount = entry.timestamps.length;
    const remaining = Math.max(0, limit - currentCount - 1);
    const resetTimeSec = Math.ceil((windowStart + ttlMs - now) / 1000);

    // Set rate limit headers
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTimeSec.toString());
    }

    if (currentCount >= limit) {
      const retryAfterSec = Math.ceil((entry.timestamps[0] + ttlMs - now) / 1000);
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfterSec.toString());
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${limit} requests allowed per ${ttlMs / 1000}s window.`,
          retryAfterSeconds: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.timestamps.push(now);
    return true;
  }

  private cleanupStaleRecords(): void {
    const now = Date.now();
    for (const [key, entry] of this.records.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 300000);
      if (entry.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }
}
