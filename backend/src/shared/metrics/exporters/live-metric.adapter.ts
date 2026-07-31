import type { LiveMetricWriter } from '../interfaces/metrics-exporter.interface';
import type { MetricsExporter } from '../interfaces/metrics-exporter.interface';
import type { MetricRecord, TelemetryEvent } from '../types/metric.types';

/**
 * Optional adapter: maps metric records to LiveMetricWriter batches.
 * Analytics module provides the writer; this package never imports Prisma.
 */
export class LiveMetricExporterAdapter implements MetricsExporter {
  readonly name = 'live_metric_adapter';
  private buffer: import('../types/metric.types').LiveMetricWrite[] = [];

  constructor(
    private readonly writer: LiveMetricWriter,
    private readonly batchSize = 50,
  ) {}

  exportMetric(record: MetricRecord): void {
    this.buffer.push({
      metricKey: record.name,
      metricValue: record.value,
      dimensions: {
        kind: record.kind,
        tags: record.tags,
        ...record.context,
        funnel: record.funnel,
        step: record.step,
      },
      observedAt: record.timestamp,
    });
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  exportEvent(event: TelemetryEvent): void {
    this.buffer.push({
      metricKey: `event.${event.name}`,
      metricValue: 1,
      dimensions: {
        category: event.category,
        action: event.action,
        outcome: event.outcome,
        ...event.context,
        funnel: event.funnel,
        step: event.step,
      },
      observedAt: event.timestamp,
    });
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.buffer.length) return;
    const batch = this.buffer;
    this.buffer = [];
    try {
      await this.writer.write(batch);
    } catch {
      // drop — never fail callers
    }
  }
}
