import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { CacheService } from '../cache/cache.service';
import { AppException } from '../../core/errors/app.exception';
import { ErrorCodes } from '../../core/errors/error-codes';

export interface LockOptions {
  /** Lock TTL in milliseconds (auto-expire safety). Default 10s. */
  ttlMs?: number;
  /** How long to wait for the lock before failing. Default 0 (no wait). */
  waitMs?: number;
  /** Poll interval while waiting. Default 50ms. */
  retryMs?: number;
}

const DEFAULT_TTL_MS = 10_000;
const DEFAULT_RETRY_MS = 50;

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly prefix: string;

  constructor(private readonly cache: CacheService) {
    this.prefix = 'lock:';
  }

  /**
   * Acquire a Redis lock (SET NX PX). Returns the lock token, or null if not acquired.
   */
  async acquire(resource: string, options: LockOptions = {}): Promise<string | null> {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const waitMs = options.waitMs ?? 0;
    const retryMs = options.retryMs ?? DEFAULT_RETRY_MS;
    const key = this.key(resource);
    const token = randomBytes(16).toString('hex');
    const deadline = Date.now() + waitMs;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await this.cache
        .getClient()
        .set(key, token, 'PX', ttlMs, 'NX');
      if (result === 'OK') {
        return token;
      }
      if (Date.now() >= deadline) {
        return null;
      }
      await this.sleep(retryMs);
    }
  }

  /**
   * Release only if we still own the lock (compare-and-delete via Lua).
   */
  async release(resource: string, token: string): Promise<boolean> {
    const key = this.key(resource);
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.cache.getClient().eval(script, 1, key, token);
    return Number(result) === 1;
  }

  /**
   * Extend lock TTL if still owned.
   */
  async extend(
    resource: string,
    token: string,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<boolean> {
    const key = this.key(resource);
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await this.cache
      .getClient()
      .eval(script, 1, key, token, String(ttlMs));
    return Number(result) === 1;
  }

  /**
   * Run `fn` while holding a lock. Throws LOCK_NOT_ACQUIRED if unavailable.
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    options: LockOptions = {},
  ): Promise<T> {
    const token = await this.acquire(resource, options);
    if (!token) {
      throw new AppException(
        ErrorCodes.LOCK_NOT_ACQUIRED,
        `Could not acquire lock for "${resource}"`,
        409,
      );
    }

    try {
      return await fn();
    } finally {
      const released = await this.release(resource, token);
      if (!released) {
        this.logger.warn(
          `Lock for "${resource}" was not released (expired or stolen)`,
        );
      }
    }
  }

  /** Stable lock key for inventory/order/payment use-cases. */
  static resourceKey(...parts: Array<string | number>): string {
    return parts.map(String).join(':');
  }

  private key(resource: string): string {
    const digest = createHash('sha256').update(resource).digest('hex').slice(0, 32);
    return `${this.prefix}${digest}:${resource}`.slice(0, 200);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
