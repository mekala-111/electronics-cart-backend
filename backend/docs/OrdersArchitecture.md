# Orders Architecture

Module: `backend/src/modules/orders`

## Tables used

`carts`, `cart_items`, `wishlists`, `wishlist_items`, `order_addresses` (no standalone `addresses` table), `orders`, `order_items`, `order_status_history`, `order_notes`, `fulfillment_orders`, `fulfillment_items`, `pick_lists`, `packing_lists`, `invoices` / `invoice_items` / `invoice_documents`, `returns`, `return_items`, `exchange_requests` (not `exchanges`/`exchange_items`), `wallets`, `wallet_transactions`, `store_credits`, `gift_cards`, `gift_card_transactions`, `order_risk_scores`, `risk_events`, `cancellation_reasons`

## Cross-cutting

- Checkout via `SagaCoordinator` (draft → reserve → create/authorize/capture payment → confirm)
- `LockService` on checkout, cancel, fulfillment
- `@Idempotent()` on checkout, cancel, returns, exchanges, fulfillment, invoices
- Domain events: `order.created|confirmed|cancelled|return_requested|exchange_requested|fulfillment_created`
- Redis cache for carts, order detail, recent orders

## Permissions

`orders.read` / `orders.write`
