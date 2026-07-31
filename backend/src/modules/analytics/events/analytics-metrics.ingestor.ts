import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEvent } from '../../../shared/events/domain-event';
import { EventSubscriber, OnDomainEvent } from '../../../shared/events/event-subscriber';
import { EventBus } from '../../../shared/events/event-bus';
import {
  MetricEmittedEvent,
  TelemetryEmittedEvent,
} from '../../../shared/metrics/exporters/event-publisher.exporter';
import type { MetricRecord, TelemetryEvent } from '../../../shared/metrics';
import { DEFAULT_METRIC_STREAM } from '../constants/analytics.constants';
import { AnalyticsLiveMetricWriter } from '../services/live-metric.writer';
import { AnalyticsRepository } from '../repositories/analytics.repository';

/**
 * Consumes Metrics Framework emissions — does not invent a second metrics API.
 */
@Injectable()
export class AnalyticsMetricsIngestor extends EventSubscriber {
  constructor(
    bus: EventBus,
    private readonly writer: AnalyticsLiveMetricWriter,
    private readonly repo: AnalyticsRepository,
  ) {
    super(bus);
  }

  @OnDomainEvent(MetricEmittedEvent.eventName)
  async onMetric(event: DomainEvent<{ record: MetricRecord }>): Promise<void> {
    const record = event.payload.record;
    await this.writer.write([
      {
        streamCode: DEFAULT_METRIC_STREAM,
        metricKey: record.name,
        metricValue: record.value,
        dimensions: {
          kind: record.kind,
          ...(record.tags ?? {}),
          funnel: record.funnel,
          step: record.step,
          correlationId: record.context.correlationId,
        },
        observedAt: record.timestamp,
      },
    ]);

    if (record.funnel && record.step) {
      await this.repo.client.conversionEvent.create({
        data: {
          user_id: record.context.userId,
          session_id: record.context.sessionId,
          funnel_step: String(record.step).slice(0, 64),
          amount: record.kind === 'kpi' ? record.value : undefined,
          properties: {
            funnel: record.funnel,
            metric: record.name,
            conversion: record.conversion ?? false,
            campaignId: record.campaignId,
            correlationId: record.context.correlationId,
          },
        },
      }).catch(() => undefined);
    }
  }

  @OnDomainEvent(TelemetryEmittedEvent.eventName)
  async onTelemetry(
    event: DomainEvent<{ event: TelemetryEvent }>,
  ): Promise<void> {
    const te = event.payload.event;
    await this.writer.write([
      {
        streamCode: 'telemetry',
        metricKey: te.name.slice(0, 120),
        metricValue: 1,
        dimensions: {
          category: te.category,
          action: te.action,
          subject: te.subject,
          outcome: te.outcome,
          ...(te.tags ?? {}),
        },
        observedAt: te.timestamp,
      },
    ]);

    await this.repo.client.systemEvent
      .create({
        data: {
          event_type: te.name.slice(0, 64),
          severity: 'info',
          message: te.action ?? te.name,
          payload: {
            category: te.category,
            subject: te.subject,
            outcome: te.outcome,
            metadata: te.metadata ?? {},
            correlationId: te.context.correlationId,
            requestId: te.context.requestId,
          } as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);
  }
}
