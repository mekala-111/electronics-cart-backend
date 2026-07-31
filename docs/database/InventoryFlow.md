# Inventory Flow — Electronics Cart

Phase 3 operational flows. Auth and Catalog remain locked; inventory references `users.id` and `product_variants.id` only.

## Quantity model

Per `(bin_id, variant_id)` row in `inventory` (`warehouse_id` denormalized):

| Bucket | Meaning |
|--------|---------|
| `available_quantity` | Sellable now in that bin |
| `reserved_quantity` | Held by active checkout reservations |
| `damaged_quantity` | Not sellable |
| `in_transit_quantity` | Transfer not yet received |

Warehouse / channel availability = `SUM(available_quantity)` across bins (and warehouses).

**Invariant (application-enforced):** reservations never exceed available at reserve time. On reserve: `available -= n`, `reserved += n`. On expire/release: reverse. On sale consume: `reserved -= n` (no available change).

Every mutating event also inserts `inventory_movements` (append-only ledger).

---

## Procurement

```
Draft PO
  → Approved
  → Ordered (sent to supplier)
  → Partially Received / Received (via GRN)
  → Closed
  (or Cancelled from draft/approved/ordered)
```

### Steps

1. Create `purchase_orders` + `purchase_order_items` (`status = draft`).
2. Approve → `approved`, then mark `ordered`.
3. On goods arrival, create `goods_receipts` (`draft`) + `goods_receipt_items`.
4. Register `serial_numbers` for unit-tracked SKUs (laptops); link `purchase_order_item_id`.
5. Post GRN (`posted`):
   - Putaway to a `warehouse_bins` row; upsert `inventory` for that bin × variant
   - Increment `available_quantity` (and `last_stock_update`)
   - Bump `purchase_order_items.quantity_received`
   - Set PO to `partially_received` or `received`
   - Write movement `purchase`
   - Set `serial_numbers.bin_id` for unit-tracked SKUs
6. Close PO when complete.

---

## Checkout reservation

```
1. SELECT inventory FOR UPDATE WHERE warehouse + variant
2. IF available_quantity < qty → reject
3. INSERT stock_reservations (expires_at = now + timeout, status=active)
4. available -= qty; reserved += qty
5. Movement: reservation
```

**Expiry job** (cron / worker):

```
UPDATE stock_reservations
SET status = 'expired'
WHERE status = 'active' AND expires_at < NOW();
-- for each: available += qty; reserved -= qty; movement reservation_release
```

On order payment: `status = consumed`, `consumed_at = now`, then sale movement reduces `reserved` (Phase 4 Orders will own order FKs; `cart_id` / `order_id` are UUID placeholders).

---

## Stock transfer

```
Draft transfer (from ≠ to)
  → In transit: available −= qty at source; in_transit += qty at dest (or source out)
  → Received: in_transit −= qty; available += qty at dest
  → Cancelled from draft only (or reverse if policy allows)
```

Serial-tracked lines move `serial_numbers.warehouse_id` and set status `in_transit` → `in_stock`.

Movements: `transfer_out` / `transfer_in`.

---

## Adjustments & audits

- `inventory_adjustments`: signed `quantity_delta` with `adjustment_reason`; apply to `available` or `damaged` per reason; movement `adjustment` / `damage`.
- `cycle_count_jobs` / `cycle_count_items`: physical count; variances become `inventory_adjustments`.
- `return_to_stock`: inbound from customer return, warranty replacement, service center, or open-box inspection (`received` → `inspection` → `restocked` | `rejected` | `quarantined`).
- `inventory_batches`: lot tracking (batch_number, supplier_batch, manufacture/expiry).
- `purchase_cost_history`: supplier cost effective dating.
- `inventory_forecast` / `supplier_scorecards`: planning + vendor KPIs.

---

## Refurbishment pipeline

Tracked on `serial_numbers.refurbishment_status`:

`received` → `inspection` → `repair` → `testing` → `ready_for_sale` | `rejected`

Unit `status` typically `under_repair` until `refurbished_ready` / `in_stock`. Movements use `repair` / `refurbish`.

IMEI/asset IDs live on `serial_numbers.imei` (nullable) for future mobile/asset tracking.

---

## Low stock alerts

When `available_quantity <= reorder_level` after any stock change:

1. Upsert / open `low_stock_alerts` (`status = open`)
2. Ops acknowledges → `acknowledged`
3. After replenishment → `resolved` (or `dismissed`)

Partial index `idx_inventory_low_stock` supports scanning at-risk rows.
