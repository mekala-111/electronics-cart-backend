import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventPublisher } from '../../events/event-publisher';
import { DomainEvent } from '../../events/domain-event';
import type { MetricsExporter } from '../interfaces/metrics-exporter.interface';
import type { MetricRecord, TelemetryEvent } from '../types/metric.types';

export class MetricEmittedEvent extends DomainEvent<{
  record: MetricRecord;
}> {
  static readonly eventName = 'metrics.emitted';
  readonly eventName = MetricEmittedEvent.eventName;
}

export class TelemetryEmittedEvent extends DomainEvent<{
  event: TelemetryEvent;
}> {
  static readonly eventName = 'telemetry.emitted';
  readonly eventName = TelemetryEmittedEvent.eventName;
}

/** Fan-out via existing EventPublisher (fire-and-forget). */
@Injectable()
export class DefaultEventPublisherExporter implements MetricsExporter {
  readonly name = 'event_publisher';
  private readonly logger = new Logger(DefaultEventPublisherExporter.name);

  constructor(@Optional() private readonly publisher?: EventPublisher) {}

  exportMetric(record: MetricRecord): void {
    if (!this.publisher) return;
    this.publisher.publishFireAndForget(new MetricEmittedEvent({ record }));
  }

  exportEvent(event: TelemetryEvent): void {
    if (!this.publisher) return;
    this.publisher.publishFireAndForget(new TelemetryEmittedEvent({ event }));
  }

  flush(): void {
    this.logger.debug('event publisher flush noop');
  }
}
