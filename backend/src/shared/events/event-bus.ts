import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './domain-event';
import { DeadLetterHandler } from './dead-letter.handler';

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * In-process domain event bus (Nest EventEmitter2 today).
 * Swap transport later without changing module publishers/subscribers.
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);

  constructor(
    private readonly emitter: EventEmitter2,
    private readonly deadLetter: DeadLetterHandler,
  ) {}

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const name = event.eventName;
    this.logger.debug(`publish ${name} (${event.eventId})`);
    try {
      await this.emitter.emitAsync(name, event);
    } catch (err) {
      await this.deadLetter.handle(event, err);
      throw err;
    }
  }

  publishSync<T extends DomainEvent>(event: T): boolean {
    return this.emitter.emit(event.eventName, event);
  }

  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): void {
    this.emitter.on(eventName, (event: T) => {
      void Promise.resolve()
        .then(() => handler(event))
        .catch((err) => this.deadLetter.handle(event, err));
    });
  }

  unsubscribe(eventName: string, handler: EventHandler): void {
    this.emitter.off(eventName, handler);
  }
}
