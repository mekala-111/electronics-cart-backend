-- Electronics Cart — Phase 4 extension indexes
-- File: 014_order_extension_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cancellation_reasons_code_active
  ON cancellation_reasons (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_cancellation_reason_id
  ON orders (cancellation_reason_id) WHERE cancellation_reason_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_credits_user_id ON store_credits (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_credits_order_id ON store_credits (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_time
  ON wallet_transactions (wallet_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id
  ON wallet_transactions (order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gift_cards_code_active
  ON gift_cards (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_id
  ON gift_card_transactions (gift_card_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_order_id
  ON gift_card_transactions (order_id) WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fulfillment_orders_number_active
  ON fulfillment_orders (fulfillment_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_order_id
  ON fulfillment_orders (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_warehouse_id
  ON fulfillment_orders (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fulfillment_orders_status
  ON fulfillment_orders (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_fulfillment_id
  ON fulfillment_items (fulfillment_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_order_item_id
  ON fulfillment_items (order_item_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pick_lists_number_active
  ON pick_lists (pick_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pick_lists_fulfillment_id
  ON pick_lists (fulfillment_order_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_packing_lists_number_active
  ON packing_lists (pack_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_packing_lists_fulfillment_id
  ON packing_lists (fulfillment_order_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_risk_events_order_time
  ON risk_events (order_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_events_event_code
  ON risk_events (event_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_documents_invoice_id
  ON invoice_documents (invoice_id) WHERE deleted_at IS NULL;

COMMIT;
