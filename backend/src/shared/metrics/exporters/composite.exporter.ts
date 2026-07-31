import type { MetricsExporter } from '../interfaces/metrics-exporter.interface';
import type { MetricRecord, TelemetryEvent } from '../types/metric.types';

/** Fan-out to multiple exporters safely. */
export class CompositeExporter implements MetricsExporter {
  readonly name = 'composite';

  constructor(private readonly exporters: MetricsExporter[]) {}

  async exportMetric(record: MetricRecord): Promise<void> {
    for (const e of this.exporters) {
      try {
        await e.exportMetric(record);
      } catch {
        // isolate failures
      }
    }
  }

  async exportEvent(event: TelemetryEvent): Promise<void> {
    for (const e of this.exporters) {
      try {
        await e.exportEvent(event);
      } catch {
        // isolate failures
      }
    }
  }

  async flush(): Promise<void> {
    for (const e of this.exporters) {
      try {
        await e.flush?.();
      } catch {
        // isolate
      }
    }
  }
}
