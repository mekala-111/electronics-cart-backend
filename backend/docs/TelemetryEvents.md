# Telemetry Events

```ts
metrics.event({
  name: 'cart.checkout.started',
  category: 'funnel',
  action: 'start',
  subject: 'checkout',
  outcome: 'ok',
  funnel: 'checkout',
  step: 'started',
  sequence: 3,
  campaignId: '...',
  abVariant: 'B',
  metadata: { cartId: '...' },
});
```

Funnel fields are **emitted only** — no conversion math here.

Published as `telemetry.emitted` via EventPublisher when flushed/immediate.
