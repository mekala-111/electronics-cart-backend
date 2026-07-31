import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductCreatedEvent } from '../../modules/catalog/events/catalog.events';
import { DeadLetterHandler } from './dead-letter.handler';
import { EventBus } from './event-bus';
import { EventPublisher } from './event-publisher';
import { OutboxPublisher } from './outbox.publisher';

describe('Domain event bus', () => {
  let emitter: EventEmitter2;
  let deadLetter: DeadLetterHandler;
  let bus: EventBus;
  let publisher: EventPublisher;

  beforeEach(() => {
    emitter = new EventEmitter2({ ignoreErrors: false });
    deadLetter = new DeadLetterHandler();
    bus = new EventBus(emitter, deadLetter);
    publisher = new EventPublisher(bus, new OutboxPublisher());
  });

  it('publishes DomainEvent by eventName', async () => {
    const seen: ProductCreatedEvent[] = [];
    bus.subscribe<ProductCreatedEvent>(
      ProductCreatedEvent.eventName,
      (e) => {
        seen.push(e);
      },
    );

    await publisher.publish(new ProductCreatedEvent('p1', 'mac'));
    expect(seen).toHaveLength(1);
    expect(seen[0].payload.productId).toBe('p1');
    expect(seen[0].eventId).toBeTruthy();
  });

  it('routes handler failures to dead letter', async () => {
    bus.subscribe(ProductCreatedEvent.eventName, () => {
      throw new Error('boom');
    });

    await publisher.publish(new ProductCreatedEvent('p2', 'dell'));
    // async handler errors are dead-lettered without rejecting publish await
    await new Promise((r) => setImmediate(r));
    expect(deadLetter.peek()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventName: ProductCreatedEvent.eventName,
          error: 'boom',
        }),
      ]),
    );
  });
});
