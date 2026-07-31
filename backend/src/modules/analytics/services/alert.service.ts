import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { RuleEngine } from '../../../shared/rules';
import type { ConditionNode, Facts } from '../../../shared/rules';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { ANALYTICS_JOBS } from '../constants/analytics.constants';
import { AnalyticsAlertTriggeredEvent } from '../events/analytics.events';
import { AnalyticsEventPublisher } from '../events/analytics-event.publisher';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { validateConditionTree } from '../../../shared/rules/dsl/condition.dsl';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly rules: RuleEngine,
    private readonly queues: QueueService,
    private readonly events: AnalyticsEventPublisher,
  ) {}

  async create(
    actorId: string,
    input: {
      code: string;
      name: string;
      severity?: 'info' | 'warning' | 'critical';
      condition: Record<string, unknown>;
      cooldownMinutes?: number;
      isEnabled?: boolean;
    },
  ) {
    const errors = validateConditionTree(input.condition);
    if (errors.length) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        errors.join('; '),
        400,
      );
    }
    const existing = await this.repo.client.alertRule.findFirst({
      where: { code: input.code, deleted_at: null },
    });
    if (existing) {
      throw new AppException(ErrorCodes.CONFLICT, 'Alert rule code exists', 409);
    }
    const rule = await this.repo.client.alertRule.create({
      data: {
        code: input.code,
        name: input.name,
        severity: input.severity ?? 'warning',
        condition_json: input.condition as Prisma.InputJsonValue,
        cooldown_minutes: input.cooldownMinutes ?? 15,
        is_enabled: input.isEnabled ?? true,
        created_by: actorId,
      },
    });
    await this.repo.audit({
      entityType: 'alert_rule',
      entityId: rule.id,
      action: 'create',
      actorId,
      next: { code: rule.code },
    });
    return { id: rule.id, code: rule.code };
  }

  list() {
    return this.repo.client.alertRule.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  enqueueEvaluation(facts?: Facts) {
    return this.queues.enqueue(
      QUEUE_NAMES.ANALYTICS,
      ANALYTICS_JOBS.ALERT_EVAL,
      {
        facts,
        correlationId: TransactionContext.get()?.correlationId,
      },
    );
  }

  /** Evaluate all enabled AlertRules via shared RuleEngine only. */
  async evaluateAll(facts: Facts) {
    const rules = await this.repo.client.alertRule.findMany({
      where: { deleted_at: null, is_enabled: true, status: 'active' },
    });
    const triggered = [];
    for (const rule of rules) {
      const result = this.rules.evaluate(
        rule.condition_json as ConditionNode,
        facts,
      );
      if (!result.matched) continue;

      const last = await this.repo.client.alertHistory.findFirst({
        where: { rule_id: rule.id },
        orderBy: { triggered_at: 'desc' },
      });
      if (last) {
        const coolMs = rule.cooldown_minutes * 60_000;
        if (Date.now() - last.triggered_at.getTime() < coolMs) continue;
      }

      const history = await this.repo.client.alertHistory.create({
        data: {
          rule_id: rule.id,
          severity: rule.severity,
          message: `Alert ${rule.code} triggered`,
          payload: {
            reasons: result.reasons,
            facts,
            correlationId: TransactionContext.get()?.correlationId,
          } as Prisma.InputJsonValue,
        },
      });
      this.events.alertTriggered(
        new AnalyticsAlertTriggeredEvent({
          ruleId: rule.id,
          code: rule.code,
          severity: rule.severity,
          historyId: history.id,
        }),
      );
      this.logger.warn({
        msg: 'alert triggered',
        code: rule.code,
        historyId: history.id,
        correlationId: TransactionContext.get()?.correlationId,
      });
      triggered.push({ ruleId: rule.id, code: rule.code, historyId: history.id });
    }
    return triggered;
  }

  async buildFactsFromMetrics(): Promise<Facts> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [sales, payments, inventory, shipping, service] = await Promise.all([
      this.repo.client.salesMetrics.findFirst({
        where: { metric_date: today, deleted_at: null },
        orderBy: { updated_at: 'desc' },
      }),
      this.repo.client.paymentMetrics.findFirst({
        where: { metric_date: today, deleted_at: null },
        orderBy: { updated_at: 'desc' },
      }),
      this.repo.client.inventoryMetrics.findFirst({
        where: { metric_date: today, deleted_at: null },
        orderBy: { updated_at: 'desc' },
      }),
      this.repo.client.shippingMetrics.findFirst({
        where: { metric_date: today, deleted_at: null },
        orderBy: { updated_at: 'desc' },
      }),
      this.repo.client.serviceMetrics.findFirst({
        where: { metric_date: today, deleted_at: null },
        orderBy: { updated_at: 'desc' },
      }),
    ]);

    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const prevSales = await this.repo.client.salesMetrics.findFirst({
      where: { metric_date: yesterday, deleted_at: null },
    });
    const revenue = Number(sales?.revenue ?? 0);
    const prevRevenue = Number(prevSales?.revenue ?? 0);
    const deltaPct =
      prevRevenue === 0 ? 0 : ((revenue - prevRevenue) / prevRevenue) * 100;

    return {
      revenue: { value: revenue, deltaPct },
      'revenue.deltaPct': deltaPct,
      'revenue.value': revenue,
      payments: {
        failed: payments?.failed_count ?? 0,
        successRate: Number(payments?.success_rate ?? 100),
      },
      'payments.failed': payments?.failed_count ?? 0,
      inventory: {
        lowStock: inventory?.low_stock_skus ?? 0,
        stockout: inventory?.stockout_skus ?? 0,
      },
      'inventory.lowStock': inventory?.low_stock_skus ?? 0,
      shipping: {
        rto: shipping?.rto_count ?? 0,
        delivered: shipping?.delivered_count ?? 0,
      },
      'shipping.rto': shipping?.rto_count ?? 0,
      warranty: { slaBreaches: service?.sla_breach_count ?? 0 },
      'warranty.slaBreaches': service?.sla_breach_count ?? 0,
      service: { slaBreaches: service?.sla_breach_count ?? 0 },
    };
  }
}
