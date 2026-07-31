import { AnalyticsLiveMetricWriter } from './live-metric.writer';

describe('AnalyticsLiveMetricWriter metrics integration', () => {
  it('persists LiveMetricWrite batches', async () => {
    const create = jest.fn(async () => ({ id: 'lm1' }));
    const ensureMetricStream = jest.fn(async () => ({ id: 's1' }));
    const writer = new AnalyticsLiveMetricWriter({
      client: { liveMetric: { create } },
      ensureMetricStream,
    } as never);
    await writer.write([
      {
        metricKey: 'orders.created',
        metricValue: 1,
        observedAt: new Date(),
        dimensions: { kind: 'counter' },
      },
    ]);
    expect(ensureMetricStream).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });
});
