import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Propagates across HTTP → sagas → events → queues → logs via AsyncLocalStorage.
 */
export interface TransactionContextData {
  correlationId: string;
  requestId: string;
  workflowId?: string;
  userId?: string;
  sessionId?: string;
  /** Reserved for future multi-tenancy — unused in v1.0. */
  tenantId?: string;
}

const storage = new AsyncLocalStorage<TransactionContextData>();

export const TRANSACTION_HEADERS = {
  correlationId: 'x-correlation-id',
  requestId: 'x-request-id',
  workflowId: 'x-workflow-id',
  tenantId: 'x-tenant-id',
} as const;

export class TransactionContext {
  static get(): TransactionContextData | undefined {
    return storage.getStore();
  }

  static require(): TransactionContextData {
    const ctx = storage.getStore();
    if (!ctx) {
      throw new Error('TransactionContext is not available in this async scope');
    }
    return ctx;
  }

  static run<T>(data: TransactionContextData, fn: () => T): T {
    return storage.run({ ...data }, fn);
  }

  static runAsync<T>(data: TransactionContextData, fn: () => Promise<T>): Promise<T> {
    return storage.run({ ...data }, fn);
  }

  /** Shallow-merge fields into the active context (no-op if none). */
  static patch(partial: Partial<TransactionContextData>): void {
    const current = storage.getStore();
    if (!current) return;
    Object.assign(current, partial);
  }

  /** Snapshot for job payloads / event metadata. */
  static snapshot(): Partial<TransactionContextData> {
    const ctx = storage.getStore();
    if (!ctx) return {};
    return {
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      workflowId: ctx.workflowId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      tenantId: ctx.tenantId,
    };
  }

  /**
   * Restore context from a snapshot (queue worker / event handler).
   * Generates ids if missing so nested work still traces.
   */
  static fromSnapshot(
    snapshot: Partial<TransactionContextData> | undefined,
    fallbackIds: { correlationId: string; requestId: string },
  ): TransactionContextData {
    return {
      correlationId: snapshot?.correlationId ?? fallbackIds.correlationId,
      requestId: snapshot?.requestId ?? fallbackIds.requestId,
      workflowId: snapshot?.workflowId,
      userId: snapshot?.userId,
      sessionId: snapshot?.sessionId,
      tenantId: snapshot?.tenantId,
    };
  }

  static bind<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
  ): (...args: TArgs) => TResult {
    const ctx = storage.getStore();
    if (!ctx) return fn;
    return (...args: TArgs) => storage.run({ ...ctx }, () => fn(...args));
  }
}
