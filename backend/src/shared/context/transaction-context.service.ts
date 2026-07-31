import { Injectable } from '@nestjs/common';
import { generateUuid } from '../../common/utils/uuid.util';
import {
  TransactionContext,
  TransactionContextData,
} from './transaction-context';

@Injectable()
export class TransactionContextService {
  get(): TransactionContextData | undefined {
    return TransactionContext.get();
  }

  snapshot(): Partial<TransactionContextData> {
    return TransactionContext.snapshot();
  }

  patch(partial: Partial<TransactionContextData>): void {
    TransactionContext.patch(partial);
  }

  runAsync<T>(
    data: TransactionContextData,
    fn: () => Promise<T>,
  ): Promise<T> {
    return TransactionContext.runAsync(data, fn);
  }

  /** Start a fresh context (e.g. cron / CLI) with generated ids. */
  async runDetached<T>(
    fn: () => Promise<T>,
    partial?: Partial<TransactionContextData>,
  ): Promise<T> {
    const id = generateUuid();
    return TransactionContext.runAsync(
      {
        correlationId: partial?.correlationId ?? id,
        requestId: partial?.requestId ?? id,
        workflowId: partial?.workflowId,
        userId: partial?.userId,
        sessionId: partial?.sessionId,
        tenantId: partial?.tenantId,
      },
      fn,
    );
  }

  /** Wrap queue/event work with restored correlation. */
  async runWithSnapshot<T>(
    snapshot: Partial<TransactionContextData> | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    const id = generateUuid();
    const data = TransactionContext.fromSnapshot(snapshot, {
      correlationId: id,
      requestId: id,
    });
    return TransactionContext.runAsync(data, fn);
  }
}
