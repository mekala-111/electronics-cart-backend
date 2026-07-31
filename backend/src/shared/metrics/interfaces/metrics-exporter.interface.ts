import type {
  MetricContextFields,
  MetricRecord,
  TelemetryEvent,
} from '../types/metric.types';

export interface MetricsExporter {
  readonly name: string;
  exportMetric(record: MetricRecord): Promise<void> | void;
  exportEvent(event: TelemetryEvent): Promise<void> | void;
  flush?(): Promise<void> | void;
}

export interface LiveMetricWriter {
  write(batch: import('../types/metric.types').LiveMetricWrite[]): Promise<void>;
}
