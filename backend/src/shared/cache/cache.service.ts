import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_TTL } from './cache.constants';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(this.config.getOrThrow<string>('redis.url'), {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      lazyConnect: false,
      connectTimeout: 2000,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    // Prevent process crash on transient Redis downtime
    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  /** Fail-open: Redis errors become cache miss. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (err) {
      this.logger.warn(
        `Redis get miss-open for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /** Fail-open: Redis write errors are logged; caller keeps the value. */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = CACHE_TTL.DEFAULT,
  ): Promise<void> {
    try {
      const ttl = this.assertTtl(ttlSeconds);
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.logger.warn(
        `Redis set fail-open for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Redis del fail-open for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async delByPrefix(prefix: string): Promise<number> {
    try {
      let cursor = '0';
      let deleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          deleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');

      return deleted;
    } catch (err) {
      this.logger.warn(
        `Redis delByPrefix fail-open for ${prefix}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.DEFAULT,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /** Validate TTL before write — rejects non-positive / non-finite values. */
  assertTtl(ttlSeconds: number): number {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(`Invalid cache TTL: ${ttlSeconds}`);
    }
    return Math.floor(ttlSeconds);
  }

  /** Namespaced key helper (uses REDIS_KEY_PREFIX from config via caller prefix). */
  ns(namespace: string, ...parts: Array<string | number>): string {
    return [namespace, ...parts].map(String).join(':');
  }

  async invalidateNamespace(namespace: string): Promise<number> {
    return this.delByPrefix(`${namespace}:`);
  }
}
