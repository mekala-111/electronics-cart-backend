import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../context/transaction-context';
import { DomainEvent } from './domain-event';
import { EventBus } from './event-bus';
import { OutboxPublisher } from './outbox.publisher';

/**
 * Preferred write API for domain modules.
 * Persists to outbox when enabled; always fans out via EventBus in-process.
 */
@Injectable()
export class EventPublisher {
  constructor(
    private readonly bus: EventBus,
    private readonly outbox: OutboxPublisher,
  ) {}

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    Object.assign(event.metadata, TransactionContext.snapshot());
    await this.outbox.enqueue(event);
    await this.bus.publish(event);
  }

  /** Fire-and-forget for non-critical signals (logging, analytics hooks). */
  publishFireAndForget<T extends DomainEvent>(event: T): void {
    void this.publish(event).catch(() => undefined);
  }
}
