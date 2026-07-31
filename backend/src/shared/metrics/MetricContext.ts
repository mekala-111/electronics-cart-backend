import { TransactionContext } from '../context/transaction-context';
import type { MetricContextFields } from './types/metric.types';

/** Merge ALS transaction context with optional overrides. */
export function mergeMetricContext(
  override?: Partial<MetricContextFields>,
): MetricContextFields {
  const snap = TransactionContext.snapshot();
  return {
    correlationId: override?.correlationId ?? snap.correlationId,
    workflowId: override?.workflowId ?? snap.workflowId,
    requestId: override?.requestId ?? snap.requestId,
    userId: override?.userId ?? snap.userId,
    sessionId: override?.sessionId ?? snap.sessionId,
    tenantId: override?.tenantId ?? snap.tenantId,
  };
}
