import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-event';

/**
 * Captures handler / publish failures for later retry or ops alert.
 * # ponytail: log-only DLQ until a dead_letter_events store exists
 */
@Injectable()
export class DeadLetterHandler {
  private readonly logger = new Logger(DeadLetterHandler.name);
  private readonly recent: Array<{
    eventName: string;
    eventId: string;
    error: string;
    at: string;
  }> = [];

  async handle(event: DomainEvent, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `dead-letter ${event.eventName} (${event.eventId}): ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
    this.recent.push({
      eventName: event.eventName,
      eventId: event.eventId,
      error: message,
      at: new Date().toISOString(),
    });
    if (this.recent.length > 100) this.recent.shift();
  }

  /** Test / ops introspection — not a public API. */
  peek(limit = 20) {
    return this.recent.slice(-limit);
  }
}
