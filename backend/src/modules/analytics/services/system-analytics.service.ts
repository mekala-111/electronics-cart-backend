import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from '../repositories/analytics.repository';

@Injectable()
export class SystemAnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  async snapshot() {
    const [apiUsage, jobs, events, liveCount, alerts] = await Promise.all([
      this.repo.client.apiRequestLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.repo.client.backgroundJobLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.repo.client.systemEvent.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.repo.client.liveMetric.count(),
      this.repo.client.alertHistory.findMany({
        orderBy: { triggered_at: 'desc' },
        take: 20,
      }),
    ]);

    return {
      liveMetricCount: liveCount,
      apiUsage,
      backgroundJobs: jobs,
      systemEvents: events,
      recentAlerts: alerts,
      generatedAt: new Date().toISOString(),
    };
  }
}
