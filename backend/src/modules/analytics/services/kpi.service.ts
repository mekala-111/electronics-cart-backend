import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { RuleEngine } from '../../../shared/rules';
import type { ConditionNode, Facts, FactValue } from '../../../shared/rules';
import {
  ANALYTICS_CACHE,
  ANALYTICS_JOBS,
} from '../constants/analytics.constants';
import { AnalyticsKpiUpdatedEvent } from '../events/analytics.events';
import { AnalyticsEventPublisher } from '../events/analytics-event.publisher';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);

  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly cache: AnalyticsCacheService,
    private readonly rules: RuleEngine,
    private readonly locks: LockService,
    private readonly queues: QueueService,
    private readonly events: AnalyticsEventPublisher,
  ) {}

  list(period = 'daily') {
    return this.cache.getOrSet(ANALYTICS_CACHE.kpis(period), async () => {
      const rows = await this.repo.client.kpiSnapshot.findMany({
        where: {
          deleted_at: null,
          period: period as 'daily' | 'weekly' | 'monthly',
        },
        orderBy: { metric_date: 'desc' },
        take: 100,
      });
      return rows.map((r) => ({
        id: r.id,
        domain: r.domain,
        period: r.period,
        metricDate: r.metric_date,
        metrics: r.metrics_json,
      }));
    });
  }

  async upsert(
    actorId: string,
    input: {
      domain: string;
      period: 'daily' | 'weekly' | 'monthly';
      metrics: Record<string, unknown>;
      threshold?: Record<string, unknown>;
    },
  ) {
    const today = startOfUtcDay(new Date());
    const metrics = { ...input.metrics };
    if (input.threshold) {
      const facts = flattenFacts(metrics);
      const evaluated = this.rules.evaluate(
        input.threshold as ConditionNode,
        facts,
      );
      metrics.__threshold = {
        matched: evaluated.matched,
        reasons: evaluated.reasons,
        errors: evaluated.errors,
      };
    }

    const snapshot = await this.repo.client.kpiSnapshot.create({
      data: {
        metric_date: today,
        period: input.period,
        domain: input.domain.slice(0, 64),
        metrics_json: metrics as Prisma.InputJsonValue,
        created_by: actorId,
      },
    });

    await this.cache.invalidateKpis(input.period);
    this.events.kpiUpdated(
      new AnalyticsKpiUpdatedEvent({
        domain: input.domain,
        period: input.period,
        snapshotId: snapshot.id,
      }),
    );
    await this.repo.audit({
      entityType: 'kpi_snapshot',
      entityId: snapshot.id,
      action: 'upsert',
      actorId,
      next: { domain: input.domain },
    });
    this.logger.log({
      msg: 'kpi updated',
      kpiId: snapshot.id,
      correlationId: TransactionContext.get()?.correlationId,
    });
    return { id: snapshot.id, domain: snapshot.domain, metrics };
  }

  async refresh(domain?: string) {
    const key = LockService.resourceKey(
      'analytics',
      'kpi-refresh',
      domain ?? 'all',
    );
    return this.locks.withLock(key, async () => {
      await this.queues.enqueue(
        QUEUE_NAMES.ANALYTICS,
        ANALYTICS_JOBS.KPI_REFRESH,
        {
          domain,
          correlationId: TransactionContext.get()?.correlationId,
        },
      );
      const computed = await this.computeFromDomainTables(domain);
      await this.cache.invalidateKpis('daily');
      return computed;
    }, { ttlMs: 60_000 });
  }

  async computeFromDomainTables(domain?: string) {
    const today = startOfUtcDay(new Date());
    const sales = await this.repo.client.salesMetrics.findFirst({
      where: { metric_date: today, deleted_at: null },
      orderBy: { updated_at: 'desc' },
    });
    const payments = await this.repo.client.paymentMetrics.findFirst({
      where: { metric_date: today, deleted_at: null },
      orderBy: { updated_at: 'desc' },
    });
    const inventory = await this.repo.client.inventoryMetrics.findFirst({
      where: { metric_date: today, deleted_at: null },
      orderBy: { updated_at: 'desc' },
    });
    const shipping = await this.repo.client.shippingMetrics.findFirst({
      where: { metric_date: today, deleted_at: null },
      orderBy: { updated_at: 'desc' },
    });
    const service = await this.repo.client.serviceMetrics.findFirst({
      where: { metric_date: today, deleted_at: null },
      orderBy: { updated_at: 'desc' },
    });
    const marketing = await this.repo.client.marketingMetrics.findFirst({
      where: { metric_date: today, deleted_at: null },
      orderBy: { updated_at: 'desc' },
    });

    const scorecards: Record<string, Record<string, unknown>> = {
      sales: {
        revenue: Number(sales?.revenue ?? 0),
        orders: sales?.orders_count ?? 0,
        refunds: Number(sales?.refunds_amount ?? 0),
        aov: Number(sales?.aov ?? 0),
      },
      payments: {
        captured: Number(payments?.captured_amount ?? 0),
        failed: payments?.failed_count ?? 0,
        successRate: Number(payments?.success_rate ?? 0),
      },
      inventory: {
        onHand: inventory?.units_on_hand ?? 0,
        lowStock: inventory?.low_stock_skus ?? 0,
        stockout: inventory?.stockout_skus ?? 0,
      },
      shipping: {
        shipments: shipping?.shipments_count ?? 0,
        delivered: shipping?.delivered_count ?? 0,
        rto: shipping?.rto_count ?? 0,
      },
      service: {
        opened: service?.tickets_opened ?? 0,
        closed: service?.tickets_closed ?? 0,
        slaBreaches: service?.sla_breach_count ?? 0,
      },
      warranty: {
        opened: service?.tickets_opened ?? 0,
        slaBreaches: service?.sla_breach_count ?? 0,
      },
      marketing: {
        sessions: marketing?.sessions ?? 0,
        newCustomers: marketing?.new_customers ?? 0,
        attributedRevenue: Number(marketing?.attributed_revenue ?? 0),
      },
    };

    const domains = domain ? [domain] : Object.keys(scorecards);
    const out = [];
    for (const d of domains) {
      const metrics = scorecards[d];
      if (!metrics) {
        throw new AppException(
          ErrorCodes.VALIDATION_ERROR,
          `Unknown KPI domain: ${d}`,
          400,
        );
      }
      const snap = await this.repo.client.kpiSnapshot.create({
        data: {
          metric_date: today,
          period: 'daily',
          domain: d,
          metrics_json: metrics as Prisma.InputJsonValue,
        },
      });
      this.events.kpiUpdated(
        new AnalyticsKpiUpdatedEvent({
          domain: d,
          period: 'daily',
          snapshotId: snap.id,
        }),
      );
      out.push({ id: snap.id, domain: d, metrics });
    }
    return out;
  }

  evaluateThreshold(
    metrics: Record<string, unknown>,
    threshold: ConditionNode,
  ) {
    return this.rules.evaluate(threshold, flattenFacts(metrics));
  }
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function flattenFacts(metrics: Record<string, unknown>): Facts {
  const out: Record<string, FactValue> = {};
  for (const [k, v] of Object.entries(metrics)) {
    out[k] = v as FactValue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        out[`${k}.${sk}`] = sv as FactValue;
      }
    }
  }
  return out;
}
