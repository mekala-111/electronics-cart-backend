# Goods Receipt Flow

1. `POST /api/admin/inventory/goods-receipts` + `Idempotency-Key`
2. Lock warehouse GRN scope
3. Create `goods_receipts` (`posted`) + items
4. Upsert `inventory` available qty at target bin
5. Optional serial create (unique active `serial_number`)
6. Movement type `purchase`; bump PO item `quantity_received` when linked
7. Emit `inventory.goods_received`
