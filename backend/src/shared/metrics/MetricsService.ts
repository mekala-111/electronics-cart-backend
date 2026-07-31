import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { mergeMetricContext } from './MetricContext';
import { createMetricRecord } from './MetricRecord';
import { createTelemetryEvent } from './TelemetryEvent';
import type { MetricsExporter } from './interfaces/metrics-exporter.interface';
import {
  METRICS_EXPORTER,
  type MetricEmitOptions,
  type MetricRecord,
  type MetricTags,
  type TelemetryEventInput,
} from './types/metric.types';
import { sanitizeMetadata } from './utils/sanitize.util';
import { BufferedExporter } from './exporters/buffered.exporter';

/**
 * Domain-agnostic metrics emission API.
 * Never throws into business flows; export errors are logged and dropped.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly histogramBuckets = new Map<string, number[]>();

  constructor(
    @Inject(METRICS_EXPORTER) private readonly exporter: MetricsExporter,
    @Optional() private readonly buffer?: BufferedExporter,
  ) {}

  increment(
    name: string,
    value = 1,
    tags?: MetricTags,
    options?: MetricEmitOptions,
  ): void {
    this.emit(
      createMetricRecord({
        kind: 'counter',
        name,
        value,
        tags,
        unit: options?.unit,
        context: mergeMetricContext(options?.context),
      }),
      options,
    );
  }

  gauge(
    name: string,
    value: number,
    tags?: MetricTags,
    options?: MetricEmitOptions,
  ): void {
    this.emit(
      createMetricRecord({
        kind: 'gauge',
        name,
        value,
        tags,
        unit: options?.unit,
        context: mergeMetricContext(options?.context),
      }),
      options,
    );
  }

  timing(
    name: string,
    durationMs: number,
    tags?: MetricTags,
    options?: MetricEmitOptions,
  ): void {
    this.emit(
      createMetricRecord({
        kind: 'timing',
        name,
        value: durationMs,
        tags,
        unit: options?.unit ?? 'ms',
        context: mergeMetricContext(options?.context),
      }),
      options,
    );
    this.observeHistogram(name, durationMs, tags);
  }

  /** In-memory histogram samples (not persisted). */
  histogram(
    name: string,
    value: number,
    tags?: MetricTags,
    options?: MetricEmitOptions,
  ): void {
    this.emit(
      createMetricRecord({
        kind: 'histogram',
        name,
        value,
        tags,
        unit: options?.unit,
        context: mergeMetricContext(options?.context),
      }),
      options,
    );
    this.observeHistogram(name, value, tags);
  }

  /** Business KPI — value only; Analytics aggregates later. */
  kpi(
    name: string,
    value: number,
    tags?: MetricTags,
    options?: MetricEmitOptions & { metadata?: Record<string, unknown> },
  ): void {
    this.emit(
      createMetricRecord({
        kind: 'kpi',
        name,
        value,
        tags,
        unit: options?.unit,
        context: mergeMetricContext(options?.context),
        metadata: sanitizeMetadata(options?.metadata),
      }),
      options,
    );
  }

  record(metricRecord: MetricRecord, options?: MetricEmitOptions): void {
    const enriched: MetricRecord = {
      ...metricRecord,
      context: {
        ...mergeMetricContext(options?.context),
        ...metricRecord.context,
      },
      metadata: sanitizeMetadata(metricRecord.metadata),
      timestamp: metricRecord.timestamp ?? new Date(),
    };
    this.emit(enriched, options);
  }

  event(input: TelemetryEventInput, options?: MetricEmitOptions): void {
    try {
      const context = mergeMetricContext({
        ...options?.context,
        correlationId: input.correlationId,
        workflowId: input.workflowId,
        requestId: input.requestId,
        userId: input.userId,
        sessionId: input.sessionId,
        tenantId: input.tenantId,
      });
      const evt = createTelemetryEvent(input, context);
      if (options?.immediate) {
        void Promise.resolve(this.exporter.exportEvent(evt)).catch((err) =>
          this.logger.warn(`telemetry export failed: ${String(err)}`),
        );
      } else if (this.buffer) {
        this.buffer.exportEvent(evt);
      } else {
        void Promise.resolve(this.exporter.exportEvent(evt)).catch((err) =>
          this.logger.warn(`telemetry export failed: ${String(err)}`),
        );
      }
    } catch (err) {
      this.logger.warn(`telemetry emit failed: ${String(err)}`);
    }
  }

  async flush(): Promise<void> {
    try {
      if (this.buffer) await this.buffer.flush();
      await this.exporter.flush?.();
    } catch (err) {
      this.logger.warn(`metrics flush failed: ${String(err)}`);
    }
  }

  /** Test helper: snapshot in-memory histogram samples. */
  getHistogramSamples(name: string): readonly number[] {
    return this.histogramBuckets.get(name) ?? [];
  }

  private emit(record: MetricRecord, options?: MetricEmitOptions): void {
    try {
      if (options?.immediate || !this.buffer) {
        void Promise.resolve(this.exporter.exportMetric(record)).catch((err) =>
          this.logger.warn(`metric export failed: ${String(err)}`),
        );
      } else {
        this.buffer.exportMetric(record);
      }
    } catch (err) {
      this.logger.warn(`metric emit failed: ${String(err)}`);
    }
  }

  private observeHistogram(name: string, value: number, _tags?: MetricTags) {
    let arr = this.histogramBuckets.get(name);
    if (!arr) {
      arr = [];
      this.histogramBuckets.set(name, arr);
    }
    arr.push(value);
    // # ponytail: cap samples to avoid unbounded memory
    if (arr.length > 2_000) arr.splice(0, arr.length - 1_000);
  }
}
