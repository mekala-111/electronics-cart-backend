import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CacheService } from '../cache/cache.service';
import {
  IDEMPOTENCY_DEFAULT_TTL_SECONDS,
  IdempotencyRecord,
} from './idempotency.constants';

@Injectable()
export class IdempotencyService {
  private readonly prefix = 'idempotency:';

  constructor(private readonly cache: CacheService) {}

  buildKey(scope: string, key: string): string {
    return `${this.prefix}${scope}:${key}`;
  }

  fingerprint(method: string, path: string, body: unknown): string {
    const payload = JSON.stringify({ method, path, body: body ?? null });
    return createHash('sha256').update(payload).digest('hex');
  }

  async get(scope: string, key: string): Promise<IdempotencyRecord | null> {
    return this.cache.get<IdempotencyRecord>(this.buildKey(scope, key));
  }

  /**
   * Mark request as in-flight. Returns false if another worker already claimed the key.
   */
  async begin(
    scope: string,
    key: string,
    fingerprint: string,
    ttlSeconds: number = IDEMPOTENCY_DEFAULT_TTL_SECONDS,
  ): Promise<boolean> {
    const redisKey = this.buildKey(scope, key);
    const record: IdempotencyRecord = {
      status: 'processing',
      fingerprint,
      statusCode: 0,
      body: null,
      createdAt: new Date().toISOString(),
    };
    const result = await this.cache
      .getClient()
      .set(redisKey, JSON.stringify(record), 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async complete(
    scope: string,
    key: string,
    fingerprint: string,
    statusCode: number,
    body: unknown,
    ttlSeconds: number = IDEMPOTENCY_DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const record: IdempotencyRecord = {
      status: 'completed',
      fingerprint,
      statusCode,
      body,
      createdAt: new Date().toISOString(),
    };
    await this.cache.set(this.buildKey(scope, key), record, ttlSeconds);
  }

  async clear(scope: string, key: string): Promise<void> {
    await this.cache.del(this.buildKey(scope, key));
  }
}
