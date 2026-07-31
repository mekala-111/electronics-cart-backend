# Payments Architecture

Module: `backend/src/modules/payments`

## Scope

Create / authorize / capture / cancel / refund / retry, payment methods, saved tokens, webhooks, settlements, reconciliation, disputes. Uses locked Phase 5 tables only.

## Stack wiring

| Concern | Implementation |
|---|---|
| Provider | `PaymentProvider` → `RazorpayProvider` (mock when keys empty) |
| Saga | Checkout: draft → reserve → **create → authorize → capture** → confirm |
| Locks | capture, refund, settlement, webhook |
| Idempotency | `@Idempotent()` on create/capture/refund/cancel/webhook/retry |
| Events | `payment.*` via `EventPublisher` + `payment_events` / audit logs |
| Context | `TransactionContext` on gateway notes, queues, events, logs |
| Cache | status, methods, gateway, saved methods |
| Queues | BullMQ `payments` queue |

## Schema notes

- No DB `created` status — create writes `pending` (API “created” ≡ pending).
- No `gateway_credentials` — secrets in env + optional `payment_gateways.config_json`.
- No `refund_transactions` — use `payment_transactions` with `tx_type=refund`.

## Permissions

Bootstrapped at runtime (`payments.read` / `payments.write`) without SQL migration changes; granted to admin / super_admin.
