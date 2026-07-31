-- Electronics Cart — Phase 5 Payment indexes
-- File: 017_payment_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateways_code_active
  ON payment_gateways (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateways_primary_active
  ON payment_gateways (is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_methods_gateway_code_active
  ON payment_methods (gateway_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_methods_gateway_id
  ON payment_methods (gateway_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_emi_plans_gateway_id ON emi_plans (gateway_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_emi_plans_bank_tenure
  ON emi_plans (bank_name, tenure_months) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id) WHERE customer_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments (gateway_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_payment_id_active
  ON payments (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id
  ON payments (gateway_order_id) WHERE gateway_order_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_gateway_reference
  ON payments (gateway_reference) WHERE gateway_reference IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_payment_number_active
  ON payment_attempts (payment_id, attempt_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_attempts_customer_id
  ON payment_attempts (customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_time
  ON payment_transactions (payment_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_reference
  ON payment_transactions (gateway_reference) WHERE gateway_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_webhooks_idempotency_active
  ON payment_webhooks (gateway_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_time
  ON payment_webhooks (gateway_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processing_status
  ON payment_webhooks (processing_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_id
  ON payment_webhooks (event_id) WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_settlements_ref_active
  ON payment_settlements (gateway_id, settlement_ref) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_settlements_gateway_date
  ON payment_settlements (gateway_id, settlement_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_settlements_status
  ON payment_settlements (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_settlement_id
  ON payment_reconciliation (settlement_id) WHERE settlement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_payment_id
  ON payment_reconciliation (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_status
  ON payment_reconciliation (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_gateway_reference
  ON payment_reconciliation (gateway_reference) WHERE gateway_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_refund_number_active
  ON refunds (refund_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds (payment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_gateway_reference
  ON refunds (gateway_reference) WHERE gateway_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refund_items_refund_id ON refund_items (refund_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_payment_id ON wallet_redemptions (payment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_wallet_id ON wallet_redemptions (wallet_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_payment_id ON gift_card_redemptions (payment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_gift_card_id ON gift_card_redemptions (gift_card_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_disputes_payment_id ON payment_disputes (payment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_disputes_order_id ON payment_disputes (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payment_time
  ON payment_audit_logs (payment_id, created_at DESC) WHERE deleted_at IS NULL;

COMMIT;
