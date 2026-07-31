import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { StorageModule } from '../../shared/storage/storage.module';
import { LIVE_METRIC_WRITER } from '../../shared/metrics';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsEventPublisher } from './events/analytics-event.publisher';
import { AnalyticsMetricsIngestor } from './events/analytics-metrics.ingestor';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AlertService } from './services/alert.service';
import { AnalyticsBootstrapService } from './services/analytics-bootstrap.service';
import { AnalyticsCacheService } from './services/analytics-cache.service';
import { DashboardService } from './services/dashboard.service';
import { InsightsService } from './services/insights.service';
import { KpiService } from './services/kpi.service';
import { AnalyticsLiveMetricWriter } from './services/live-metric.writer';
import { ReportService } from './services/report.service';
import { SystemAnalyticsService } from './services/system-analytics.service';
import { AnalyticsWorker } from './workers/analytics.worker';

@Module({
  imports: [PrismaModule, CacheModule, LockModule, StorageModule],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [
    AnalyticsRepository,
    AnalyticsCacheService,
    AnalyticsEventPublisher,
    AnalyticsLiveMetricWriter,
    {
      provide: LIVE_METRIC_WRITER,
      useExisting: AnalyticsLiveMetricWriter,
    },
    AnalyticsMetricsIngestor,
    DashboardService,
    KpiService,
    AlertService,
    InsightsService,
    ReportService,
    SystemAnalyticsService,
    AnalyticsBootstrapService,
    AnalyticsWorker,
  ],
  exports: [
    DashboardService,
    KpiService,
    AlertService,
    ReportService,
    LIVE_METRIC_WRITER,
  ],
})
export class AnalyticsModule {}
