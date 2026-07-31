-- Electronics Cart — Phase 4 Orders indexes
-- File: 011_order_indexes.sql

BEGIN;

-- carts
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts (user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carts_session_key ON carts (session_key) WHERE session_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts (status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_variant_active
  ON cart_items (cart_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items (variant_id) WHERE deleted_at IS NULL;

-- wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists (user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_items_wishlist_variant_active
  ON wishlist_items (wishlist_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wishlist_items_variant_id ON wishlist_items (variant_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_for_later_cart_variant_active
  ON saved_for_later (cart_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_for_later_variant_id ON saved_for_later (variant_id) WHERE deleted_at IS NULL;

-- coupons
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code_active
  ON coupons (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons (expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_rules_coupon_id ON coupon_rules (coupon_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_rules_brand_id ON coupon_rules (brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_rules_category_id ON coupon_rules (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage (coupon_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage (order_id) WHERE order_id IS NOT NULL;

-- orders
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number_active
  ON orders (order_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders (coupon_id) WHERE coupon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items (variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_serial_number_id
  ON order_items (serial_number_id) WHERE serial_number_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_addresses_order_id ON order_addresses (order_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_addresses_order_type_active
  ON order_addresses (order_id, address_type) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_time
  ON order_status_history (order_id, changed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_events_order_time
  ON order_events (order_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_events_event_type ON order_events (event_type) WHERE deleted_at IS NULL;

-- invoices
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_invoice_number_active
  ON invoices (invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_variant_id ON invoice_items (variant_id) WHERE deleted_at IS NULL;

-- returns / exchanges
CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_return_number_active
  ON returns (return_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items (return_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_return_items_order_item_id ON return_items (order_item_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_requests_number_active
  ON exchange_requests (exchange_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exchange_requests_order_id ON exchange_requests (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON exchange_requests (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id
  ON stock_reservations (order_id) WHERE order_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
