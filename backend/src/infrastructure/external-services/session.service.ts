import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly redis: Redis | null = null;
  private readonly memoryStore = new Map<string, { data: string; expiresAt: number }>();
  private readonly sessionTtl = 60 * 60 * 24 * 7; // 7 days

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
          connectTimeout: 2000,
        });
        this.redis.on('error', (err) => {
          this.logger.warn(`Redis session store error (${err.message}). Using fallback.`);
        });
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Redis: ${err.message}`);
      }
    }
  }

  async createSession(userId: string, metadata: { ip: string; userAgent: string }): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionHash = this.hashToken(sessionToken);
    
    const sessionData = {
      userId,
      ...metadata,
      createdAt: new Date().toISOString(),
    };

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(
          `session:${sessionHash}`,
          JSON.stringify(sessionData),
          'EX',
          this.sessionTtl,
        );
        return sessionToken;
      } catch {
        // Fall back to memoryStore
      }
    }

    this.memoryStore.set(`session:${sessionHash}`, {
      data: JSON.stringify(sessionData),
      expiresAt: Date.now() + this.sessionTtl * 1000,
    });

    return sessionToken;
  }

  async getSession(token: string): Promise<{ userId: string; metadata: any } | null> {
    const sessionHash = this.hashToken(token);

    if (this.redis && this.redis.status === 'ready') {
      try {
        const data = await this.redis.get(`session:${sessionHash}`);
        if (data) {
          const parsed = JSON.parse(data);
          return {
            userId: parsed.userId,
            metadata: parsed,
          };
        }
      } catch {
        // Fall back to memoryStore
      }
    }

    const item = this.memoryStore.get(`session:${sessionHash}`);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryStore.delete(`session:${sessionHash}`);
      return null;
    }

    const parsed = JSON.parse(item.data);
    return {
      userId: parsed.userId,
      metadata: parsed,
    };
  }

  async deleteSession(token: string): Promise<void> {
    const sessionHash = this.hashToken(token);
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(`session:${sessionHash}`);
      } catch {
        // Fall back to memoryStore
      }
    }
    this.memoryStore.delete(`session:${sessionHash}`);
  }

  async setTemporary(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        // Fall back to memoryStore.
      }
    }

    this.memoryStore.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async getTemporary(key: string): Promise<string | null> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const value = await this.redis.get(key);
        if (value) return value;
      } catch {
        // Fall back to memoryStore.
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.data;
  }

  async deleteTemporary(key: string): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(key);
      } catch {
        // Fall back to memoryStore.
      }
    }
    this.memoryStore.delete(key);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
