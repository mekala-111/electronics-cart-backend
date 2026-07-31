import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import {
  ANALYTICS_CACHE,
  ANALYTICS_JOBS,
} from '../constants/analytics.constants';
import {
  AnalyticsDashboardRefreshedEvent,
} from '../events/analytics.events';
import { AnalyticsEventPublisher } from '../events/analytics-event.publisher';
import type { DashboardPayload } from '../interfaces/analytics.interfaces';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly cache: AnalyticsCacheService,
    private readonly locks: LockService,
    private readonly queues: QueueService,
    private readonly events: AnalyticsEventPublisher,
  ) {}

  getDashboard(code = 'executive'): Promise<DashboardPayload> {
    return this.cache.getOrSet(ANALYTICS_CACHE.dashboard(code), () =>
      this.buildDashboard(code),
    );
  }

  async refresh(actorId: string | undefined, code = 'executive') {
    const key = LockService.resourceKey('analytics', 'dashboard', code);
    return this.locks.withLock(key, async () => {
      await this.cache.invalidateDashboards(code);
      const payload = await this.buildDashboard(code);
      this.events.dashboardRefreshed(
        new AnalyticsDashboardRefreshedEvent({ layoutCode: code }),
      );
      await this.repo.audit({
        entityType: 'dashboard_layout',
        action: 'refresh',
        actorId,
        next: { code, correlationId: TransactionContext.get()?.correlationId },
      });
      await this.queues.enqueue(
        QUEUE_NAMES.ANALYTICS,
        ANALYTICS_JOBS.DASHBOARD_REFRESH,
        { code, actorId },
      );
      this.logger.log({
        msg: 'dashboard refreshed',
        dashboardId: code,
        correlationId: TransactionContext.get()?.correlationId,
      });
      return payload;
    }, { ttlMs: 30_000 });
  }

  async patchLayout(
    actorId: string,
    input: {
      code: string;
      name?: string;
      isDefault?: boolean;
      widgets?: Array<{
        widgetCode: string;
        title?: string;
        gridX?: number;
        gridY?: number;
        gridW?: number;
        gridH?: number;
        config?: Record<string, unknown>;
      }>;
    },
  ) {
    let layout = await this.repo.client.dashboardLayout.findFirst({
      where: { code: input.code, deleted_at: null },
    });
    if (!layout) {
      layout = await this.repo.client.dashboardLayout.create({
        data: {
          code: input.code,
          name: input.name ?? input.code,
          is_default: input.isDefault ?? false,
          created_by: actorId,
        },
      });
    } else {
      layout = await this.repo.client.dashboardLayout.update({
        where: { id: layout.id },
        data: {
          name: input.name ?? layout.name,
          is_default: input.isDefault ?? layout.is_default,
          updated_by: actorId,
        },
      });
    }

    if (input.widgets?.length) {
      for (const w of input.widgets) {
        let widget = await this.repo.client.dashboardWidget.findFirst({
          where: { code: w.widgetCode, deleted_at: null },
        });
        if (!widget) {
          widget = await this.repo.client.dashboardWidget.create({
            data: {
              code: w.widgetCode,
              name: w.title ?? w.widgetCode,
              widget_type: 'metric',
              created_by: actorId,
            },
          });
        }
        const existing =
          await this.repo.client.dashboardWidgetInstance.findFirst({
            where: {
              layout_id: layout.id,
              widget_id: widget.id,
              deleted_at: null,
            },
          });
        const data = {
          title: w.title,
          grid_x: w.gridX ?? 0,
          grid_y: w.gridY ?? 0,
          grid_w: w.gridW ?? 4,
          grid_h: w.gridH ?? 2,
          config_json: (w.config ?? undefined) as Prisma.InputJsonValue,
          updated_by: actorId,
        };
        if (existing) {
          await this.repo.client.dashboardWidgetInstance.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await this.repo.client.dashboardWidgetInstance.create({
            data: {
              layout_id: layout.id,
              widget_id: widget.id,
              ...data,
              created_by: actorId,
            },
          });
        }
      }
    }

    await this.cache.invalidateDashboards(input.code);
    await this.repo.audit({
      entityType: 'dashboard_layout',
      entityId: layout.id,
      action: 'patch',
      actorId,
      next: { code: input.code },
    });
    return this.getDashboard(input.code);
  }

  private async buildDashboard(code: string): Promise<DashboardPayload> {
    const since = daysAgo(30);
    const [
      sales,
      payments,
      inventory,
      shipping,
      service,
      marketing,
      live,
      layout,
    ] = await Promise.all([
      this.repo.client.salesMetrics.findMany({
        where: { deleted_at: null, metric_date: { gte: since } },
        orderBy: { metric_date: 'desc' },
        take: 30,
      }),
      this.repo.client.paymentMetrics.findMany({
        where: { deleted_at: null, metric_date: { gte: since } },
        orderBy: { metric_date: 'desc' },
        take: 30,
      }),
      this.repo.client.inventoryMetrics.findMany({
        where: { deleted_at: null, metric_date: { gte: since } },
        orderBy: { metric_date: 'desc' },
        take: 30,
      }),
      this.repo.client.shippingMetrics.findMany({
        where: { deleted_at: null, metric_date: { gte: since } },
        orderBy: { metric_date: 'desc' },
        take: 30,
      }),
      this.repo.client.serviceMetrics.findMany({
        where: { deleted_at: null, metric_date: { gte: since } },
        orderBy: { metric_date: 'desc' },
        take: 30,
      }),
      this.repo.client.marketingMetrics.findMany({
        where: { deleted_at: null, metric_date: { gte: since } },
        orderBy: { metric_date: 'desc' },
        take: 30,
      }),
      this.repo.client.liveMetric.findMany({
        orderBy: { observed_at: 'desc' },
        take: 50,
      }),
      this.repo.client.dashboardLayout.findFirst({
        where: { code, deleted_at: null },
        include: {
          instances: {
            where: { deleted_at: null },
            include: { widget: true },
            orderBy: { sort_order: 'asc' },
          },
        },
      }),
    ]);

    const sum = (rows: { revenue?: Prisma.Decimal | null; orders_count?: number }[]) => ({
      revenue: rows.reduce((a, r) => a + Number(r.revenue ?? 0), 0),
      orders: rows.reduce((a, r) => a + (r.orders_count ?? 0), 0),
    });
    const salesAgg = sum(sales);
    const widgets = this.widgetsFor(code, {
      sales,
      salesAgg,
      payments,
      inventory,
      shipping,
      service,
      marketing,
      live,
    });

    if (layout?.instances?.length) {
      for (const inst of layout.instances) {
        widgets.push({
          code: inst.widget.code,
          title: inst.title ?? inst.widget.name,
          type: inst.widget.widget_type,
          data: inst.config_json ?? {},
        });
      }
    }

    return {
      code,
      name: layout?.name ?? code,
      refreshedAt: new Date().toISOString(),
      widgets,
    };
  }

  private widgetsFor(
    code: string,
    ctx: {
      sales: unknown[];
      salesAgg: { revenue: number; orders: number };
      payments: Array<{
        captured_amount: Prisma.Decimal;
        failed_count: number;
        success_rate: Prisma.Decimal | null;
      }>;
      inventory: Array<{
        low_stock_skus: number;
        stockout_skus: number;
        units_on_hand: number;
      }>;
      shipping: Array<{
        shipments_count: number;
        delivered_count: number;
        rto_count: number;
      }>;
      service: Array<{
        tickets_opened: number;
        tickets_closed: number;
        sla_breach_count: number;
      }>;
      marketing: Array<{
        sessions: number;
        new_customers: number;
        attributed_revenue: Prisma.Decimal;
      }>;
      live: unknown[];
    },
  ): DashboardPayload['widgets'] {
    const aov =
      ctx.salesAgg.orders > 0
        ? ctx.salesAgg.revenue / ctx.salesAgg.orders
        : 0;
    const base: DashboardPayload['widgets'] = [];

    const salesW = {
      code: 'sales_summary',
      title: 'Sales',
      type: 'kpi',
      data: { ...ctx.salesAgg, aov, series: ctx.sales },
    };
    const payW = {
      code: 'payments_summary',
      title: 'Payments',
      type: 'kpi',
      data: {
        captured: ctx.payments.reduce(
          (a, p) => a + Number(p.captured_amount),
          0,
        ),
        failed: ctx.payments.reduce((a, p) => a + p.failed_count, 0),
        series: ctx.payments,
      },
    };
    const invW = {
      code: 'inventory_summary',
      title: 'Inventory',
      type: 'kpi',
      data: {
        onHand: ctx.inventory.reduce((a, i) => a + i.units_on_hand, 0),
        lowStock: ctx.inventory.reduce((a, i) => a + i.low_stock_skus, 0),
        stockout: ctx.inventory.reduce((a, i) => a + i.stockout_skus, 0),
        series: ctx.inventory,
      },
    };
    const shipW = {
      code: 'shipping_summary',
      title: 'Shipping',
      type: 'kpi',
      data: {
        shipments: ctx.shipping.reduce((a, s) => a + s.shipments_count, 0),
        delivered: ctx.shipping.reduce((a, s) => a + s.delivered_count, 0),
        rto: ctx.shipping.reduce((a, s) => a + s.rto_count, 0),
        series: ctx.shipping,
      },
    };
    const svcW = {
      code: 'service_summary',
      title: 'Service / Warranty',
      type: 'kpi',
      data: {
        opened: ctx.service.reduce((a, s) => a + s.tickets_opened, 0),
        closed: ctx.service.reduce((a, s) => a + s.tickets_closed, 0),
        slaBreaches: ctx.service.reduce((a, s) => a + s.sla_breach_count, 0),
        series: ctx.service,
      },
    };
    const mktW = {
      code: 'marketing_summary',
      title: 'Marketing',
      type: 'kpi',
      data: {
        sessions: ctx.marketing.reduce((a, m) => a + m.sessions, 0),
        newCustomers: ctx.marketing.reduce((a, m) => a + m.new_customers, 0),
        attributedRevenue: ctx.marketing.reduce(
          (a, m) => a + Number(m.attributed_revenue),
          0,
        ),
        series: ctx.marketing,
      },
    };
    const liveW = {
      code: 'live_metrics',
      title: 'Live metrics',
      type: 'stream',
      data: ctx.live,
    };

    switch (code) {
      case 'sales':
      case 'revenue':
      case 'orders':
        return [salesW, liveW];
      case 'payments':
        return [payW, liveW];
      case 'inventory':
        return [invW, liveW];
      case 'shipping':
        return [shipW, liveW];
      case 'warranty':
      case 'service':
        return [svcW, liveW];
      case 'marketing':
      case 'search':
      case 'recommendation':
        return [mktW, liveW];
      case 'system':
        return [liveW, payW, shipW];
      case 'executive':
      default:
        return [salesW, payW, invW, shipW, svcW, mktW, liveW];
    }
  }
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
