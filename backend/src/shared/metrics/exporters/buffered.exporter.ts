import type { MetricRecord, TelemetryEvent } from '../types/metric.types';
import type { MetricsExporter } from '../interfaces/metrics-exporter.interface';

/** Drops everything — useful in tests / when metrics disabled. */
export class NoOpExporter implements MetricsExporter {
  readonly name = 'noop';
  exportMetric(): void {}
  exportEvent(): void {}
  flush(): void {}
}

/**
 * In-memory ring buffer with batch flush.
 * Never persists; Analytics attaches a real sink later.
 */
export class BufferedExporter implements MetricsExporter {
  readonly name = 'buffered';
  private metrics: MetricRecord[] = [];
  private events: TelemetryEvent[] = [];
  private readonly maxSize: number;
  private readonly sink?: MetricsExporter;

  constructor(opts?: { maxSize?: number; sink?: MetricsExporter }) {
    this.maxSize = opts?.maxSize ?? 10_000;
    this.sink = opts?.sink;
  }

  exportMetric(record: MetricRecord): void {
    this.metrics.push(record);
    this.trim();
  }

  exportEvent(event: TelemetryEvent): void {
    this.events.push(event);
    this.trim();
  }

  async flush(): Promise<void> {
    if (!this.sink) {
      this.metrics = [];
      this.events = [];
      return;
    }
    const metrics = this.metrics;
    const events = this.events;
    this.metrics = [];
    this.events = [];
    for (const m of metrics) await this.sink.exportMetric(m);
    for (const e of events) await this.sink.exportEvent(e);
    await this.sink.flush?.();
  }

  /** Test/introspection helpers */
  peekMetrics(): readonly MetricRecord[] {
    return this.metrics;
  }
  peekEvents(): readonly TelemetryEvent[] {
    return this.events;
  }
  size(): number {
    return this.metrics.length + this.events.length;
  }

  private trim() {
    const overflow = this.size() - this.maxSize;
    if (overflow <= 0) return;
    // Drop oldest metrics first
    const dropM = Math.min(this.metrics.length, overflow);
    if (dropM > 0) this.metrics.splice(0, dropM);
    const still = this.size() - this.maxSize;
    if (still > 0) this.events.splice(0, Math.min(this.events.length, still));
  }
}
