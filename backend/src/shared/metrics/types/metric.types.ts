export type MetricKind =
  | 'counter'
  | 'gauge'
  | 'timing'
  | 'histogram'
  | 'kpi'
  | 'telemetry';

export type MetricTags = Readonly<Record<string, string | number | boolean>>;

export interface MetricEmitOptions {
  /** Immediate export (default false → use buffer policy). */
  immediate?: boolean;
  /** Override transaction context fields. */
  context?: Partial<MetricContextFields>;
  unit?: string;
}

export interface MetricContextFields {
  correlationId?: string;
  workflowId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
}

export interface FunnelFields {
  funnel?: string;
  step?: string;
  sequence?: number;
  conversion?: boolean;
  abVariant?: string;
  campaignId?: string;
}

export type MetricRecord = {
  kind: MetricKind;
  name: string;
  value: number;
  tags?: MetricTags;
  unit?: string;
  timestamp: Date;
  context: MetricContextFields;
  metadata?: Record<string, unknown>;
} & FunnelFields;

export type TelemetryEventInput = {
  name: string;
  category?: string;
  action?: string;
  subject?: string;
  outcome?: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
  tags?: MetricTags;
} & FunnelFields &
  Partial<MetricContextFields>;

export type TelemetryEvent = Required<
  Pick<TelemetryEventInput, 'name' | 'timestamp'>
> &
  Omit<TelemetryEventInput, 'name' | 'timestamp'> & {
    context: MetricContextFields;
  };

export const METRICS_EXPORTER = Symbol('METRICS_EXPORTER');

/** Optional LiveMetric write hook — Analytics supplies implementation. */
export const LIVE_METRIC_WRITER = Symbol('LIVE_METRIC_WRITER');

export interface LiveMetricWrite {
  streamCode?: string;
  metricKey: string;
  metricValue: number;
  dimensions?: Record<string, unknown>;
  observedAt: Date;
}
