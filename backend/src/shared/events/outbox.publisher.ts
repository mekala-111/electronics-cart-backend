import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-event';

/**
 * Transactional outbox — stub for Inventory+.
 * Today: no-op. Later: write to outbox table / Redis stream, relay async.
 * # ponytail: in-process only until outbox table is approved (schema locked)
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  async enqueue(event: DomainEvent): Promise<void> {
    this.logger.debug(
      `outbox skip (not configured): ${event.eventName} ${event.eventId}`,
    );
  }
}
