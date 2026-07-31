# Domain Event Bus

Location: `backend/src/shared/events/`

In-process pub/sub shared by all modules. Today: Nest `EventEmitter2`. Later: outbox → queue / broker without changing emitters.

## Components

| Type | Role |
| --- | --- |
| `DomainEvent` | Envelope: `eventName`, `eventId`, `occurredAt`, `payload`, `metadata` |
| `EventBus` | Publish / subscribe |
| `EventPublisher` | Module write API (outbox hook + bus) |
| `EventSubscriber` / `@OnDomainEvent` | Handler registration |
| `OutboxPublisher` | Stub (no-op until outbox store approved) |
| `DeadLetterHandler` | Log + ring-buffer failed handlers |

## Usage

```ts
// emit
await this.publisher.publish(new ProductCreatedEvent(id, slug));

// subscribe (another module)
@OnDomainEvent(ProductCreatedEvent.eventName)
async onProductCreated(event: ProductCreatedEvent) { ... }
```

## Event name conventions

`{domain}.{entity}.{action}` — e.g. `catalog.product.created`, `auth.user.registered`.

Reserved for upcoming modules: `inventory.reserved`, `order.placed`, `payment.succeeded`, `shipping.delivered`, `warranty.registered`.

## Rules

- Do not import sibling domain services from subscribers — only event contracts.
- Prefer `EventPublisher` over raw `EventEmitter2`.
- Auth + Catalog publishers already route through this bus.
