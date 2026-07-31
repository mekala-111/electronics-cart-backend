# Inventory Architecture

Module: `backend/src/modules/inventory`

## Tables (locked v1.0)

`warehouses`, `warehouse_zones` / `warehouse_racks` / `warehouse_bins` (locations), `inventory`, `inventory_batches`, `inventory_movements`, `stock_reservations`, `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `serial_numbers`, `inventory_adjustments`, `stock_transfers`, `low_stock_alerts`, `cycle_count_jobs` / `cycle_count_items`

## Schema gaps

| Requested | Reality |
| --- | --- |
| `warehouse_locations` | Zone → rack → bin hierarchy |
| `stock_movements` | `inventory_movements` |
| `stock_adjustments` | `inventory_adjustments` |
| `refurbishment_jobs` | **No jobs table** — `serial_numbers.refurbishment_status` only |

## Cross-cutting

- `LockService` on reserve / release / adjust / GRN / transfer
- `@Idempotent()` on GRN, transfer, adjust, PO, warehouse create
- Redis cache for warehouses, stock, availability, serial
- Domain events via shared `EventPublisher`

## Permissions

`inventory.read` / `inventory.write` (seeded). Admin roles: `admin`, `super_admin`.
