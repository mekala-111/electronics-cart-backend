import { SetMetadata } from '@nestjs/common';
import { IDEMPOTENCY_META_KEY } from './idempotency.constants';

export interface IdempotentOptions {
  /** Require Idempotency-Key header (default true). */
  required?: boolean;
  /** Redis TTL for cached responses in seconds (default 24h). */
  ttlSeconds?: number;
}

export const Idempotent = (options: IdempotentOptions = {}): MethodDecorator =>
  SetMetadata(IDEMPOTENCY_META_KEY, {
    required: options.required ?? true,
    ttlSeconds: options.ttlSeconds,
  } satisfies IdempotentOptions);
