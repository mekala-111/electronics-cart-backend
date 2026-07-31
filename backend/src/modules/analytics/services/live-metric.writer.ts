import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { LiveMetricWriter } from '../../../shared/metrics';
import type { LiveMetricWrite } from '../../../shared/metrics';
import { DEFAULT_METRIC_STREAM } from '../constants/analytics.constants';
import { AnalyticsRepository } from '../repositories/analytics.repository';

/**
 * Persists Metrics Framework LiveMetricWrite batches into locked live_metrics.
 * Registered as LIVE_METRIC_WRITER from AnalyticsModule (does not modify MetricsModule).
 */
@Injectable()
export class AnalyticsLiveMetricWriter implements LiveMetricWriter {
  private readonly logger = new Logger(AnalyticsLiveMetricWriter.name);
  private streamCache = new Map<string, string>();

  constructor(private readonly repo: AnalyticsRepository) {}

  async write(batch: LiveMetricWrite[]): Promise<void> {
    if (!batch.length) return;
    try {
      for (const row of batch) {
        const streamCode = row.streamCode?.trim() || DEFAULT_METRIC_STREAM;
        const streamId = await this.resolveStream(streamCode);
        await this.repo.client.liveMetric.create({
          data: {
            stream_id: streamId,
            metric_key: row.metricKey.slice(0, 120),
            metric_value: new Prisma.Decimal(row.metricValue),
            dimensions: (row.dimensions ?? undefined) as Prisma.InputJsonValue,
            observed_at: row.observedAt,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`live metric write failed: ${String(err)}`);
    }
  }

  private async resolveStream(code: string): Promise<string> {
    const hit = this.streamCache.get(code);
    if (hit) return hit;
    const stream = await this.repo.ensureMetricStream(code);
    this.streamCache.set(code, stream.id);
    return stream.id;
  }
}
