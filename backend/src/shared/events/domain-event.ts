import { randomUUID } from 'node:crypto';

/**
 * Base envelope for all domain events.
 * Modules emit typed subclasses; subscribers depend on the event name, not the producer module.
 */
export abstract class DomainEvent<TPayload = unknown> {
  abstract readonly eventName: string;

  readonly eventId: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
  readonly metadata: Record<string, unknown>;

  constructor(
    payload: TPayload,
    options?: {
      eventId?: string;
      occurredAt?: Date;
      metadata?: Record<string, unknown>;
    },
  ) {
    this.payload = payload;
    this.eventId = options?.eventId ?? randomUUID();
    this.occurredAt = options?.occurredAt ?? new Date();
    this.metadata = options?.metadata ?? {};
  }
}

export type DomainEventClass<T extends DomainEvent = DomainEvent> = {
  new (...args: never[]): T;
  readonly eventName?: string;
};
