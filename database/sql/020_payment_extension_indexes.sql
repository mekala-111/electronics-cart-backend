-- Electronics Cart — Phase 5 extension indexes
-- File: 020_payment_extension_indexes.sql

BEGIN;

CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_customer_id
  ON saved_payment_methods (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_gateway_id
  ON saved_payment_methods (gateway_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_payment_methods_gateway_token_active
  ON saved_payment_methods (gateway_id, token) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_payment_methods_customer_default_active
  ON saved_payment_methods (customer_id) WHERE is_default = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_saved_payment_method_id
  ON payments (saved_payment_method_id) WHERE saved_payment_method_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_batches_ref_active
  ON settlement_batches (gateway_id, batch_reference) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_settlement_batches_gateway_date
  ON settlement_batches (gateway_id, settlement_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_settlement_batches_status
  ON settlement_batches (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_settlements_batch_id
  ON payment_settlements (settlement_batch_id) WHERE settlement_batch_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_accounts_gateway_ref_active
  ON merchant_accounts (gateway_id, merchant_reference) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_vendor_id
  ON merchant_accounts (vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_gateway_id
  ON merchant_accounts (gateway_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_time
  ON payment_events (payment_id, received_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_event
  ON payment_events (event) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_rates_pair_date_active
  ON exchange_rates (base_currency, target_currency, effective_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date
  ON exchange_rates (base_currency, target_currency, effective_date DESC) WHERE deleted_at IS NULL;

COMMIT;
