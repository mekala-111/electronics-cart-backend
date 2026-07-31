import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ReportExportFormat } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { StorageService } from '../../../shared/storage/storage.service';
import {
  ANALYTICS_CACHE,
  ANALYTICS_JOBS,
} from '../constants/analytics.constants';
import {
  AnalyticsExportCompletedEvent,
  AnalyticsReportGeneratedEvent,
} from '../events/analytics.events';
import { AnalyticsEventPublisher } from '../events/analytics-event.publisher';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsCacheService } from './analytics-cache.service';
import { InsightsService } from './insights.service';
import { KpiService } from './kpi.service';
import { rowsToCsv, rowsToPdfText, rowsToXlsxXml } from '../utils/export.util';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly cache: AnalyticsCacheService,
    private readonly locks: LockService,
    private readonly queues: QueueService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly events: AnalyticsEventPublisher,
    private readonly insights: InsightsService,
    private readonly kpis: KpiService,
  ) {}

  listSaved() {
    return this.cache.getOrSet(ANALYTICS_CACHE.reports(), () =>
      this.repo.client.savedReport.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
    );
  }

  async createSaved(
    actorId: string,
    input: {
      code: string;
      name: string;
      reportType: string;
      query?: Record<string, unknown>;
    },
  ) {
    const existing = await this.repo.client.savedReport.findFirst({
      where: { code: input.code, deleted_at: null },
    });
    if (existing) {
      throw new AppException(ErrorCodes.CONFLICT, 'Report code exists', 409);
    }
    const report = await this.repo.client.savedReport.create({
      data: {
        code: input.code,
        name: input.name,
        report_type: input.reportType,
        query_json: (input.query ?? undefined) as Prisma.InputJsonValue,
        owner_id: actorId,
        created_by: actorId,
      },
    });
    await this.cache.invalidateReports();
    await this.repo.audit({
      entityType: 'saved_report',
      entityId: report.id,
      action: 'create',
      actorId,
      next: { code: report.code },
    });
    return { id: report.id, code: report.code };
  }

  async createSchedule(
    actorId: string,
    input: {
      savedReportId: string;
      cronExpression: string;
      timezone?: string;
      recipients?: string[];
    },
  ) {
    const report = await this.repo.client.savedReport.findFirst({
      where: { id: input.savedReportId, deleted_at: null },
    });
    if (!report) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Saved report not found', 404);
    }
    const schedule = await this.repo.client.scheduledReport.create({
      data: {
        saved_report_id: report.id,
        cron_expression: input.cronExpression,
        timezone: input.timezone ?? 'Asia/Kolkata',
        recipients_json: (input.recipients ?? undefined) as Prisma.InputJsonValue,
        next_run_at: new Date(),
        created_by: actorId,
      },
    });
    await this.repo.audit({
      entityType: 'scheduled_report',
      entityId: schedule.id,
      action: 'create',
      actorId,
    });
    return { id: schedule.id, savedReportId: report.id };
  }

  async enqueueGenerate(
    actorId: string | undefined,
    input: {
      savedReportId?: string;
      format?: 'csv' | 'xlsx' | 'pdf' | 'json';
    },
  ) {
    if (input.format === 'json') {
      const data = await this.resolveReportData(input.savedReportId);
      return { format: 'json', status: 'completed', data };
    }

    const format = (input.format ?? 'csv') as ReportExportFormat;
    const exportRow = await this.repo.client.reportExport.create({
      data: {
        saved_report_id: input.savedReportId,
        export_format: format,
        export_status: 'queued',
        requested_by: actorId,
        created_by: actorId,
      },
    });

    await this.queues.enqueue(
      QUEUE_NAMES.ANALYTICS,
      ANALYTICS_JOBS.EXPORT,
      {
        exportId: exportRow.id,
        savedReportId: input.savedReportId,
        format,
        actorId,
        correlationId: TransactionContext.get()?.correlationId,
        requestId: TransactionContext.get()?.requestId,
        workflowId: TransactionContext.get()?.workflowId,
        userId: TransactionContext.get()?.userId ?? actorId,
      },
    );

    return {
      exportId: exportRow.id,
      status: 'queued',
      format,
    };
  }

  async processExport(job: {
    exportId: string;
    savedReportId?: string;
    format: ReportExportFormat;
    actorId?: string;
  }) {
    const key = LockService.resourceKey('analytics', 'export', job.exportId);
    return this.locks.withLock(key, async () => {
      await this.repo.client.reportExport.update({
        where: { id: job.exportId },
        data: { export_status: 'processing' },
      });

      try {
        const rows = await this.resolveReportData(job.savedReportId);
        const body = this.render(job.format, rows);
        const mime =
          job.format === 'csv'
            ? 'text/csv'
            : job.format === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/pdf';
        const objectKey = `analytics/exports/${job.exportId}.${job.format === 'xlsx' ? 'xml' : job.format === 'pdf' ? 'txt' : 'csv'}`;
        const bucket =
          this.config.get<string>('storage.bucket') ?? 'local';
        await this.storage.put(objectKey, body, { contentType: mime });

        const media = await this.repo.client.mediaFile.create({
          data: {
            bucket,
            object_key: objectKey,
            mime_type: mime,
            byte_size: BigInt(Buffer.byteLength(body)),
            kind: 'document',
            original_name: `export-${job.exportId}.${job.format}`,
            created_by: job.actorId,
          },
        });

        await this.repo.client.reportExport.update({
          where: { id: job.exportId },
          data: {
            export_status: 'completed',
            media_file_id: media.id,
            row_count: Array.isArray(rows) ? rows.length : 1,
            completed_at: new Date(),
          },
        });

        this.events.exportCompleted(
          new AnalyticsExportCompletedEvent({
            exportId: job.exportId,
            format: job.format,
            status: 'completed',
          }),
        );
        if (job.savedReportId) {
          this.events.reportGenerated(
            new AnalyticsReportGeneratedEvent({
              reportId: job.savedReportId,
              exportId: job.exportId,
            }),
          );
        }
        await this.repo.audit({
          entityType: 'report_export',
          entityId: job.exportId,
          action: 'export_completed',
          actorId: job.actorId,
        });
        this.logger.log({
          msg: 'export completed',
          exportId: job.exportId,
          correlationId: TransactionContext.get()?.correlationId,
        });
        return { exportId: job.exportId, status: 'completed' };
      } catch (err) {
        await this.repo.client.reportExport.update({
          where: { id: job.exportId },
          data: {
            export_status: 'failed',
            error_message: err instanceof Error ? err.message : String(err),
          },
        });
        this.events.exportCompleted(
          new AnalyticsExportCompletedEvent({
            exportId: job.exportId,
            format: job.format,
            status: 'failed',
          }),
        );
        throw err;
      }
    }, { ttlMs: 120_000 });
  }

  async resolveReportData(savedReportId?: string): Promise<unknown[]> {
    if (!savedReportId) {
      const kpis = await this.kpis.list('daily');
      return kpis as unknown[];
    }
    const report = await this.repo.client.savedReport.findFirst({
      where: { id: savedReportId, deleted_at: null },
    });
    if (!report) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Saved report not found', 404);
    }
    const q = (report.query_json ?? {}) as { domain?: string; type?: string };
    switch (report.report_type) {
      case 'funnel':
        return [await this.insights.funnels()];
      case 'cohort':
        return this.insights.cohorts();
      case 'ltv':
        return this.insights.ltv();
      case 'rfm':
        return this.insights.rfm();
      case 'trends':
        return this.insights.trends(q.domain ?? 'sales');
      case 'kpi':
        return this.kpis.list('daily');
      case 'audit':
        return this.repo.client.auditLog.findMany({
          orderBy: { created_at: 'desc' },
          take: 500,
        });
      default:
        return this.insights.trends(q.domain ?? report.report_type);
    }
  }

  private render(format: ReportExportFormat, rows: unknown[]): string {
    const flat = flattenRows(rows);
    if (format === 'csv') return rowsToCsv(flat);
    if (format === 'xlsx') return rowsToXlsxXml(flat);
    return rowsToPdfText(flat);
  }
}

function flattenRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      return r as Record<string, unknown>;
    }
    return { value: r };
  });
}
