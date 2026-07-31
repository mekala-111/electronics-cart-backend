import type {
  FunnelFields,
  MetricKind,
  MetricRecord,
  MetricTags,
} from './types/metric.types';
import type { MetricContextFields } from './types/metric.types';

export type { MetricRecord, MetricKind, MetricTags };

export function createMetricRecord(input: {
  kind: MetricKind;
  name: string;
  value: number;
  tags?: MetricTags;
  unit?: string;
  context: MetricContextFields;
  metadata?: Record<string, unknown>;
  funnel?: FunnelFields;
  timestamp?: Date;
}): MetricRecord {
  return {
    kind: input.kind,
    name: input.name,
    value: input.value,
    tags: input.tags,
    unit: input.unit,
    timestamp: input.timestamp ?? new Date(),
    context: input.context,
    metadata: input.metadata,
    ...input.funnel,
  };
}
