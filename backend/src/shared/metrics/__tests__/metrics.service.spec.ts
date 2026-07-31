import { TransactionContext } from '../../context/transaction-context';
import { MetricsService } from '../MetricsService';
import { BufferedExporter, NoOpExporter } from '../exporters/buffered.exporter';
import { CompositeExporter } from '../exporters/composite.exporter';
import { LiveMetricExporterAdapter } from '../exporters/live-metric.adapter';
import { sanitizeMetadata } from '../utils/sanitize.util';
import type { MetricsExporter } from '../interfaces/metrics-exporter.interface';
import type { MetricRecord, TelemetryEvent } from '../types/metric.types';

class CapturingExporter implements MetricsExporter {
  readonly name = 'capture';
  metrics: MetricRecord[] = [];
  events: TelemetryEvent[] = [];
  exportMetric(r: MetricRecord) {
    this.metrics.push(r);
  }
  exportEvent(e: TelemetryEvent) {
    this.events.push(e);
  }
  flush() {}
}

class FailingExporter implements MetricsExporter {
  readonly name = 'fail';
  exportMetric(): void {
    throw new Error('boom');
  }
  exportEvent(): void {
    throw new Error('boom');
  }
}

describe('MetricsService', () => {
  function build(immediateSink?: MetricsExporter) {
    const capture = immediateSink ?? new CapturingExporter();
    const buffer = new BufferedExporter({
      maxSize: 1000,
      sink: capture,
    });
    const service = new MetricsService(capture, buffer);
    return { service, capture: capture as CapturingExporter, buffer };
  }

  it('increments counters with context', () => {
    const { service, buffer } = build();
    TransactionContext.run(
      { correlationId: 'c1', requestId: 'r1', userId: 'u1' },
      () => {
        service.increment('orders.created', 1, { channel: 'web' });
      },
    );
    const rows = buffer.peekMetrics();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('counter');
    expect(rows[0]?.context.correlationId).toBe('c1');
    expect(rows[0]?.context.userId).toBe('u1');
  });

  it('records gauges and timings', () => {
    const { service, buffer } = build();
    service.gauge('queue.depth', 42);
    service.timing('payments.latency', 15.5);
    expect(buffer.peekMetrics().map((m) => m.kind)).toEqual([
      'gauge',
      'timing',
    ]);
    expect(service.getHistogramSamples('payments.latency')).toEqual([15.5]);
  });

  it('records KPI and telemetry events', () => {
    const { service, buffer } = build();
    service.kpi('revenue', 1999, { currency: 'INR' });
    service.event({
      name: 'cart.checkout.completed',
      category: 'funnel',
      action: 'complete',
      funnel: 'checkout',
      step: 'completed',
      sequence: 5,
      conversion: true,
      outcome: 'success',
    });
    expect(buffer.peekMetrics().some((m) => m.kind === 'kpi')).toBe(true);
    expect(buffer.peekEvents()[0]?.name).toBe('cart.checkout.completed');
    expect(buffer.peekEvents()[0]?.funnel).toBe('checkout');
  });

  it('flushes buffer to sink', async () => {
    const capture = new CapturingExporter();
    const buffer = new BufferedExporter({ sink: capture });
    const service = new MetricsService(capture, buffer);
    service.increment('x');
    expect(capture.metrics).toHaveLength(0);
    await service.flush();
    expect(capture.metrics).toHaveLength(1);
  });

  it('immediate bypasses buffer', () => {
    const capture = new CapturingExporter();
    const buffer = new BufferedExporter({ sink: capture });
    const service = new MetricsService(capture, buffer);
    service.increment('y', 1, undefined, { immediate: true });
    expect(capture.metrics).toHaveLength(1);
    expect(buffer.size()).toBe(0);
  });

  it('never throws when exporter fails', () => {
    const service = new MetricsService(new FailingExporter());
    expect(() => service.increment('z')).not.toThrow();
    expect(() =>
      service.event({ name: 'login.failed', outcome: 'fail' }),
    ).not.toThrow();
  });

  it('supports record() API', () => {
    const { service, buffer } = build();
    service.record({
      kind: 'counter',
      name: 'shipments.delivered',
      value: 1,
      timestamp: new Date(),
      context: {},
    });
    expect(buffer.peekMetrics()[0]?.name).toBe('shipments.delivered');
  });

  it('handles 1000+ emissions', () => {
    const capture = new CapturingExporter();
    const buffer = new BufferedExporter({ maxSize: 20_000, sink: capture });
    const service = new MetricsService(capture, buffer);
    const start = Date.now();
    for (let i = 0; i < 1500; i++) {
      service.increment('perf.tick', 1);
    }
    expect(buffer.peekMetrics().length).toBe(1500);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe('exporters', () => {
  it('NoOpExporter is safe', () => {
    const n = new NoOpExporter();
    n.exportMetric({
      kind: 'counter',
      name: 'a',
      value: 1,
      timestamp: new Date(),
      context: {},
    });
    n.exportEvent({ name: 'e', timestamp: new Date(), context: {} });
  });

  it('CompositeExporter isolates failures', async () => {
    const capture = new CapturingExporter();
    const composite = new CompositeExporter([
      new FailingExporter(),
      capture,
    ]);
    await composite.exportMetric({
      kind: 'counter',
      name: 'ok',
      value: 1,
      timestamp: new Date(),
      context: {},
    });
    expect(capture.metrics).toHaveLength(1);
  });

  it('LiveMetricExporterAdapter batches writes', async () => {
    const writes: unknown[] = [];
    const adapter = new LiveMetricExporterAdapter(
      {
        write: async (batch) => {
          writes.push(...batch);
        },
      },
      2,
    );
    adapter.exportMetric({
      kind: 'counter',
      name: 'a',
      value: 1,
      timestamp: new Date(),
      context: {},
    });
    adapter.exportMetric({
      kind: 'counter',
      name: 'b',
      value: 2,
      timestamp: new Date(),
      context: {},
    });
    await Promise.resolve();
    expect(writes.length).toBeGreaterThanOrEqual(2);
  });
});

describe('sanitizeMetadata', () => {
  it('strips secrets', () => {
    const clean = sanitizeMetadata({
      orderId: '1',
      password: 'x',
      token: 'y',
      nested: { jwt: 'z', ok: true },
    });
    expect(clean?.password).toBeUndefined();
    expect(clean?.token).toBeUndefined();
    expect((clean?.nested as { ok: boolean }).ok).toBe(true);
    expect((clean?.nested as { jwt?: string }).jwt).toBeUndefined();
  });
});

describe('concurrency', () => {
  it('is safe under parallel increments', async () => {
    const capture = new CapturingExporter();
    const buffer = new BufferedExporter({ maxSize: 50_000, sink: capture });
    const service = new MetricsService(capture, buffer);
    await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        Promise.resolve(service.increment('parallel', 1, { i: String(i) })),
      ),
    );
    expect(buffer.size()).toBe(200);
  });
});
