# Checkout Flow

1. Customer builds cart (`POST /api/cart/items`)
2. `POST /api/checkout` + `Idempotency-Key` + shipping address + `warehouseId`
3. User lock acquired
4. Saga `order.placement`:
   - **create_draft_order** → `orders` pending + items + addresses
   - **reserve_inventory** → `InventoryService.reserve` per line (compensate: release)
   - **create_payment** → `PaymentsService.createForCheckout`
   - **authorize_payment** → authorize via provider
   - **capture_payment** → capture via provider
   - **confirm_order** → status `confirmed`, cart `converted`, risk score
5. On any failure: compensate reverse (cancel draft, release stock, void/cancel payment)

Wallet/gift-card balances validated before saga when provided.
