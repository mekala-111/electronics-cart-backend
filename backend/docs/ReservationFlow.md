# Reservation Flow

1. `POST /api/admin/inventory/reserve` with warehouse + variant + qty
2. Acquire Redis lock `inventory:{warehouseId}:{variantId}`
3. Sum `available_quantity` across bins; reject if insufficient
4. Decrement available / increment reserved per bin (greedy)
5. Insert `stock_reservations` (`active`, `expires_at`)
6. Write `inventory_movements` type `reservation`
7. Emit `inventory.reserved`; bust stock cache
8. If available ≤ reorder_level → open `low_stock_alerts` + `inventory.low_stock_detected`

Release: `POST .../reservations/:id/release` reverses qty and sets status `released`.
