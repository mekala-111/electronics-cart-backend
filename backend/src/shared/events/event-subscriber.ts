import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { DomainEvent } from './domain-event';
import { EventBus, EventHandler } from './event-bus';

export const EVENT_SUBSCRIBER_META = 'domain-events:subscriber';

export interface EventSubscriptionMeta {
  eventName: string;
  method: string;
}

/** Mark a method as a domain-event handler (registered on module init). */
export function OnDomainEvent(eventName: string): MethodDecorator {
  return (target, propertyKey) => {
    const ctor = target.constructor;
    const existing: EventSubscriptionMeta[] =
      Reflect.getMetadata(EVENT_SUBSCRIBER_META, ctor) ?? [];
    existing.push({ eventName, method: String(propertyKey) });
    Reflect.defineMetadata(EVENT_SUBSCRIBER_META, existing, ctor);
  };
}

/**
 * Optional base for feature subscribers.
 * Prefer `@OnDomainEvent` methods; handlers must not import sibling domains.
 */
@Injectable()
export abstract class EventSubscriber implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly bus: EventBus) {}

  onModuleInit(): void {
    const metas: EventSubscriptionMeta[] =
      Reflect.getMetadata(EVENT_SUBSCRIBER_META, this.constructor) ?? [];
    for (const meta of metas) {
      const instance = this as unknown as Record<string, EventHandler>;
      const handler = instance[meta.method];
      if (typeof handler !== 'function') continue;
      this.bus.subscribe(meta.eventName, handler.bind(this));
      this.logger.debug(`subscribed ${meta.eventName} → ${meta.method}`);
    }
  }

  protected subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): void {
    this.bus.subscribe(eventName, handler);
  }
}

export function getSubscriberMetas(type: Type): EventSubscriptionMeta[] {
  return Reflect.getMetadata(EVENT_SUBSCRIBER_META, type) ?? [];
}
