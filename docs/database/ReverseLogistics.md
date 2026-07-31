# Reverse Logistics — Electronics Cart

## Types

| Flow | Table | Trigger |
|------|-------|---------|
| Customer return | `reverse_shipments` (`customer_return`) | Phase 4 `returns` |
| Warranty return | `reverse_shipments` (`warranty_return`) | Warranty phase / return reason |
| Exchange pickup | `reverse_shipments` (`exchange_pickup`) | `exchange_requests` |
| RTO | `rto_shipments` | Failed delivery / undeliverable forward |

## Reverse shipment

Creates (or links) a reverse leg: pickup from customer → warehouse.

- Optional `shipment_id` if modeled as a full `shipments` row
- Own `tracking_number` / `awb_number` when carrier issues reverse AWB
- Status: `requested` → `scheduled` → `picked_up` → `in_transit` → `received`

## RTO

`rto_shipments.forward_shipment_id` = original outbound shipment.

Optionally link `reverse_shipment_id` when RTO is also tracked as a reverse case. On warehouse receipt → inventory `return_to_stock` (Phase 3) via app.

## Inventory handoff

Schema stops at logistics receipt. Stock putaway uses existing Phase 3 `return_to_stock` / movements — no duplicate inventory tables here.
