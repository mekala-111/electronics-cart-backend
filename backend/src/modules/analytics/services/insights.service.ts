import { Injectable } from '@nestjs/common';
import { ANALYTICS_CACHE } from '../constants/analytics.constants';
import { FUNNEL_STEPS } from '../interfaces/analytics.interfaces';
import type {
  FunnelStepStats,
  RfmSegment,
} from '../interfaces/analytics.interfaces';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class InsightsService {
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly cache: AnalyticsCacheService,
  ) {}

  funnels() {
    return this.cache.getOrSet(ANALYTICS_CACHE.funnels(), () =>
      this.computeFunnels(),
    );
  }

  async trends(
    domain = 'sales',
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days = 30,
  ) {
    return this.cache.getOrSet(
      `${ANALYTICS_CACHE.trends(domain)}:${period}:${days}`,
      () => this.computeTrends(domain, period, days),
    );
  }

  cohorts() {
    return this.repo.client.cohortAnalysis.findMany({
      where: { deleted_at: null },
      orderBy: [{ cohort_month: 'desc' }, { period_offset: 'asc' }],
      take: 500,
    });
  }

  ltv(limit = 100) {
    return this.repo.client.customerLtv.findMany({
      where: { deleted_at: null },
      orderBy: { net_revenue: 'desc' },
      take: limit,
    });
  }

  async rfm(limit = 200): Promise<RfmSegment[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 365);
    const orders = await this.repo.client.order.findMany({
      where: {
        deleted_at: null,
        customer_id: { not: null },
        created_at: { gte: since },
      },
      select: {
        customer_id: true,
        created_at: true,
        grand_total: true,
      },
      take: 10_000,
    });

    const byCustomer = new Map<
      string,
      { last: Date; count: number; monetary: number }
    >();
    for (const o of orders) {
      if (!o.customer_id) continue;
      const cur = byCustomer.get(o.customer_id) ?? {
        last: o.created_at,
        count: 0,
        monetary: 0,
      };
      cur.count += 1;
      cur.monetary += Number(o.grand_total ?? 0);
      if (o.created_at > cur.last) cur.last = o.created_at;
      byCustomer.set(o.customer_id, cur);
    }

    const now = Date.now();
    const rows: RfmSegment[] = [];
    for (const [customerId, v] of byCustomer) {
      const recencyDays = Math.floor(
        (now - v.last.getTime()) / (24 * 60 * 60 * 1000),
      );
      rows.push({
        customerId,
        recencyDays,
        frequency: v.count,
        monetary: v.monetary,
        r: 0,
        f: 0,
        m: 0,
        segment: 'unscored',
      });
    }

    scoreQuintile(rows, 'recencyDays', 'r', true);
    scoreQuintile(rows, 'frequency', 'f', false);
    scoreQuintile(rows, 'monetary', 'm', false);
    for (const r of rows) {
      r.segment = rfmLabel(r.r, r.f, r.m);
    }
    return rows
      .sort((a, b) => b.monetary - a.monetary)
      .slice(0, limit);
  }

  private async computeFunnels() {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const grouped = await this.repo.client.conversionEvent.groupBy({
      by: ['funnel_step'],
      where: { created_at: { gte: since } },
      _count: { _all: true },
    });
    const counts = new Map(
      grouped.map((g) => [g.funnel_step, g._count._all]),
    );
    const steps: FunnelStepStats[] = [];
    let prev: number | null = null;
    for (const step of FUNNEL_STEPS) {
      const count = counts.get(step) ?? 0;
      const conversionFromPrevPct =
        prev && prev > 0 ? Number(((count / prev) * 100).toFixed(2)) : null;
      const dropOffPct =
        prev && prev > 0
          ? Number((((prev - count) / prev) * 100).toFixed(2))
          : null;
      steps.push({ step, count, dropOffPct, conversionFromPrevPct });
      prev = count || prev;
    }

    const landing = steps[0]?.count ?? 0;
    const complete = steps[steps.length - 1]?.count ?? 0;
    const overallConversion =
      landing > 0
        ? Number(((complete / landing) * 100).toFixed(2))
        : 0;

    const recent = await this.repo.client.conversionEvent.findMany({
      where: { created_at: { gte: since } },
      take: 1000,
      select: { properties: true },
    });
    const attribution: Record<string, number> = {};
    for (const row of recent) {
      const props = row.properties as { campaignId?: string } | null;
      if (!props?.campaignId) continue;
      attribution[props.campaignId] = (attribution[props.campaignId] ?? 0) + 1;
    }

    return {
      steps,
      overallConversionPct: overallConversion,
      campaignAttribution: attribution,
      support: {
        dropOff: steps.filter((s) => (s.dropOffPct ?? 0) > 0),
      },
    };
  }

  private async computeTrends(
    domain: string,
    period: 'daily' | 'weekly' | 'monthly',
    days: number,
  ) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);
    const where = { deleted_at: null, metric_date: { gte: since }, period };

    switch (domain) {
      case 'payments':
        return this.repo.client.paymentMetrics.findMany({
          where,
          orderBy: { metric_date: 'asc' },
        });
      case 'inventory':
        return this.repo.client.inventoryMetrics.findMany({
          where,
          orderBy: { metric_date: 'asc' },
        });
      case 'shipping':
        return this.repo.client.shippingMetrics.findMany({
          where,
          orderBy: { metric_date: 'asc' },
        });
      case 'service':
      case 'warranty':
        return this.repo.client.serviceMetrics.findMany({
          where,
          orderBy: { metric_date: 'asc' },
        });
      case 'marketing':
        return this.repo.client.marketingMetrics.findMany({
          where,
          orderBy: { metric_date: 'asc' },
        });
      case 'sales':
      case 'revenue':
      case 'orders':
      default:
        return this.repo.client.salesMetrics.findMany({
          where,
          orderBy: { metric_date: 'asc' },
        });
    }
  }
}

function scoreQuintile(
  rows: RfmSegment[],
  field: 'recencyDays' | 'frequency' | 'monetary',
  scoreField: 'r' | 'f' | 'm',
  invert: boolean,
) {
  const sorted = [...rows].sort((a, b) => a[field] - b[field]);
  const n = sorted.length || 1;
  sorted.forEach((row, i) => {
    const q = Math.min(5, Math.floor((i / n) * 5) + 1);
    row[scoreField] = invert ? 6 - q : q;
  });
}

function rfmLabel(r: number, f: number, m: number): string {
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';
  if (r >= 3 && f >= 3) return 'loyal';
  if (r >= 4 && f <= 2) return 'promising';
  if (r <= 2 && f >= 3) return 'at_risk';
  if (r <= 2 && f <= 2) return 'hibernating';
  return 'regular';
}
