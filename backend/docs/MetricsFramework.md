# Metrics Framework

Shared emission layer: `backend/src/shared/metrics/`.

## Purpose

Every domain module emits business metrics the same way. **Analytics consumes; this module never queries.**

```ts
metrics.increment('orders.created');
metrics.timing('payments.latency', 42);
metrics.kpi('revenue', 1999, { currency: 'INR' });
metrics.event({ name: 'cart.checkout.completed', funnel: 'checkout', step: 'completed' });
await metrics.flush();
```

## Components

| Piece | Role |
|---|---|
| `MetricsService` | Public API |
| `MetricsExporter` | Pluggable sink |
| `BufferedExporter` | In-memory batch + flush |
| `DefaultEventPublisherExporter` | Fan-out via EventPublisher |
| `LiveMetricExporterAdapter` | Optional Analytics-owned writer hook |
| `NoOpExporter` | Tests / disable |

## Context

Transaction Context fields attach automatically (`correlationId`, `requestId`, `workflowId`, `userId`, `sessionId`, `tenantId`).

## Safety

Export failures are logged and swallowed — never fail the request. Metadata keys matching secrets/tokens are stripped.

## Non-goals

No Prisma, dashboards, reports, Prometheus/OTel SDKs, or controllers.
