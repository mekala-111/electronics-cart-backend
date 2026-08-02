import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

/**
 * Redis-backed throttler storage (shared across PM2/cluster workers).
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('redis.url');
    this.prefix = `${config.get<string>('redis.keyPrefix', 'ec:')}throttle:`;
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`throttle redis: ${err.message}`);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await this.incrementRedis(key, ttl, limit, blockDuration);
    } catch (err) {
      // Fail-open: never 500 / hard-block traffic when Redis throttle backend is down
      this.logger.warn(
        `throttle fail-open: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        totalHits: 1,
        timeToExpire: Math.max(1, Math.ceil(ttl / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  private async incrementRedis(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `${this.prefix}${key}`;
    const blockKey = `${redisKey}:block`;
    const ttlSec = Math.max(1, Math.ceil(ttl / 1000));
    const blockSec = Math.max(1, Math.ceil(blockDuration / 1000));

    const blockedTtl = await this.redis.ttl(blockKey);
    if (blockedTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: ttlSec,
        isBlocked: true,
        timeToBlockExpire: blockedTtl,
      };
    }

    const hits = await this.redis.incr(redisKey);
    if (hits === 1) {
      await this.redis.expire(redisKey, ttlSec);
    }
    const timeToExpire = await this.redis.ttl(redisKey);

    if (hits > limit) {
      await this.redis.set(blockKey, '1', 'EX', blockSec);
      return {
        totalHits: hits,
        timeToExpire: Math.max(timeToExpire, 0),
        isBlocked: true,
        timeToBlockExpire: blockSec,
      };
    }

    return {
      totalHits: hits,
      timeToExpire: Math.max(timeToExpire, 0),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
