import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ReportExportFormat } from '@prisma/client';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { BaseWorker } from '../../../shared/queue/worker.base';
import { ANALYTICS_JOBS } from '../constants/analytics.constants';
import { AlertService } from '../services/alert.service';
import { DashboardService } from '../services/dashboard.service';
import { InsightsService } from '../services/insights.service';
import { KpiService } from '../services/kpi.service';
import { ReportService } from '../services/report.service';
import { AnalyticsCacheService } from '../services/analytics-cache.service';

type AnalyticsJob = {
  code?: string;
  domain?: string;
  actorId?: string;
  exportId?: string;
  savedReportId?: string;
  format?: ReportExportFormat;
  correlationId?: string;
  requestId?: string;
  workflowId?: string;
  userId?: string;
  facts?: Record<string, unknown>;
};

@Injectable()
export class AnalyticsWorker
  extends BaseWorker<AnalyticsJob>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    queueService: QueueService,
    config: ConfigService,
    private readonly kpis: KpiService,
    private readonly reports: ReportService,
    private readonly dashboards: DashboardService,
    private readonly insights: InsightsService,
    private readonly alerts: AlertService,
    private readonly cache: AnalyticsCacheService,
  ) {
    super(
      QUEUE_NAMES.ANALYTICS,
      queueService,
      config.getOrThrow<string>('queue.redisUrl'),
    );
  }

  onModuleInit() {
    this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  protected async process(job: Job<AnalyticsJob>): Promise<void> {
    const data = job.data;

    switch (job.name) {
      case ANALYTICS_JOBS.KPI_REFRESH:
        await this.kpis.computeFromDomainTables(data.domain);
        break;
      case ANALYTICS_JOBS.EXPORT:
      case ANALYTICS_JOBS.REPORT_GENERATE:
        if (!data.exportId || !data.format) {
          this.logger.warn('export job missing exportId/format');
          break;
        }
        await this.reports.processExport({
          exportId: data.exportId,
          savedReportId: data.savedReportId,
          format: data.format,
          actorId: data.actorId,
        });
        break;
      case ANALYTICS_JOBS.DASHBOARD_REFRESH:
        await this.cache.invalidateDashboards(data.code);
        await this.dashboards.getDashboard(data.code ?? 'executive');
        break;
      case ANALYTICS_JOBS.TREND_CALC:
        await this.cache.invalidateTrends(data.domain ?? 'sales');
        await this.insights.trends(data.domain ?? 'sales');
        break;
      case ANALYTICS_JOBS.SNAPSHOT:
        await this.kpis.computeFromDomainTables();
        break;
      case ANALYTICS_JOBS.ALERT_EVAL: {
        const facts =
          (data.facts as never) ?? (await this.alerts.buildFactsFromMetrics());
        await this.alerts.evaluateAll(facts);
        break;
      }
      default:
        this.logger.warn(`unknown analytics job ${job.name}`);
    }
  }
}
