export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_META_KEY = 'idempotency:options';

export const IDEMPOTENCY_DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24h

export type IdempotencyRecordStatus = 'processing' | 'completed';

export interface IdempotencyRecord {
  status: IdempotencyRecordStatus;
  fingerprint: string;
  statusCode: number;
  body: unknown;
  createdAt: string;
}
