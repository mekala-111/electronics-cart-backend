# Shipping Architecture

Module: `backend/src/modules/shipping`

## Schema mapping (locked)

| Spec name | Actual table/model |
|---|---|
| shipping_carriers | `shipping_partners` |
| shipping_methods | `shipping_services` |
| shipment_events / status_history / audit_logs | `tracking_events` (+ `shipment_tracking`) |
| carrier_accounts | `shipping_partners.config_json` |
| carrier_api_logs | `shipping_webhooks` (inbound) |
| reverse_pickups / reverse_tracking | `reverse_shipments` |
| shipping_cost_calculations | `shipping_cost_breakdown` |

## Status mapping

Conceptual → locked `ShipmentStatus` via `shipmentStateMachine`:

| Conceptual | DB status |
|---|---|
| label_generated | `packed` |
| pickup_scheduled / picked_up | `dispatched` |
| in_transit…delivered | same |

All status changes go through `StateMachineEngine` — no custom validators.

## Provider

`ShippingProvider` → `ShiprocketProvider` (mock when `SHIPPING_MOCK` / missing credentials).

## Cross-cutting

Locks, `@Idempotent()`, BullMQ `shipping` queue, Redis cache, ALS context, domain events.

Order status: Shipping **does not** mutate `orders.status` (Orders module locked). Emits `shipment.*` events; updates `fulfillment_orders.status` when linked.
