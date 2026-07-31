-- Electronics Cart — Phase 5 Payments
-- PostgreSQL 16
-- File: 016_payments.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE payment_gateway_code AS ENUM (
    'razorpay', 'stripe', 'paypal', 'phonepe', 'cashfree', 'internal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_code AS ENUM (
    'upi', 'credit_card', 'debit_card', 'net_banking', 'wallet',
    'emi', 'bnpl', 'store_credit', 'gift_card', 'cod', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 'authorized', 'captured', 'failed', 'cancelled',
    'expired', 'refunded', 'partially_refunded', 'chargeback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_tx_type AS ENUM (
    'authorize', 'capture', 'void', 'refund', 'settlement', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE webhook_processing_status AS ENUM (
    'received', 'verified', 'processed', 'failed', 'ignored', 'retrying'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM (
    'requested', 'approved', 'rejected', 'processing', 'processed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_type AS ENUM ('full', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('pending', 'settled', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reconciliation_status AS ENUM (
    'matched', 'variance', 'missing_gateway', 'missing_internal', 'unresolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM (
    'opened', 'under_review', 'won', 'lost', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emi_type AS ENUM ('bank_emi', 'no_cost_emi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payment_gateways (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        payment_gateway_code NOT NULL,
  name        VARCHAR(120) NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  config_json JSONB,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id UUID REFERENCES payment_gateways (id) ON DELETE SET NULL,
  code       payment_method_code NOT NULL,
  name       VARCHAR(120) NOT NULL,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS emi_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id     UUID REFERENCES payment_gateways (id) ON DELETE SET NULL,
  bank_name      VARCHAR(120) NOT NULL,
  emi_type       emi_type NOT NULL DEFAULT 'bank_emi',
  tenure_months  INTEGER NOT NULL CHECK (tenure_months > 0),
  interest_rate  NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  processing_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (processing_fee >= 0),
  min_amount     NUMERIC(14, 2) CHECK (min_amount IS NULL OR min_amount >= 0),
  max_amount     NUMERIC(14, 2) CHECK (max_amount IS NULL OR max_amount >= 0),
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  customer_id        UUID REFERENCES users (id) ON DELETE SET NULL,
  gateway_id         UUID NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  payment_method_id  UUID REFERENCES payment_methods (id) ON DELETE SET NULL,
  emi_plan_id        UUID REFERENCES emi_plans (id) ON DELETE SET NULL,
  gateway_order_id   VARCHAR(128),
  gateway_payment_id VARCHAR(128),
  gateway_signature  VARCHAR(512),
  gateway_reference  VARCHAR(128),
  amount             NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency           VARCHAR(3) NOT NULL DEFAULT 'INR',
  refunded_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  status             payment_status NOT NULL DEFAULT 'pending',
  authorized_at      TIMESTAMPTZ,
  captured_at        TIMESTAMPTZ,
  failed_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_payment_refunded_lte_amount CHECK (refunded_amount <= amount)
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       UUID NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  attempt_number   INTEGER NOT NULL CHECK (attempt_number > 0),
  gateway_response JSONB,
  error_code       VARCHAR(64),
  error_message    TEXT,
  device           VARCHAR(255),
  ip_address       VARCHAR(45),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  status           payment_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  tx_type           payment_tx_type NOT NULL,
  amount            NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
  gateway_reference VARCHAR(128),
  raw_response      JSONB,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id        UUID NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  event_id          VARCHAR(128),
  event_type        VARCHAR(120) NOT NULL,
  idempotency_key   VARCHAR(128),
  signature         VARCHAR(512),
  payload           JSONB NOT NULL,
  verified          BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status webhook_processing_status NOT NULL DEFAULT 'received',
  retry_count       INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  processed_at      TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id      UUID NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  settlement_ref  VARCHAR(128) NOT NULL,
  settlement_date DATE NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  expected_amount NUMERIC(14, 2) NOT NULL CHECK (expected_amount >= 0),
  received_amount NUMERIC(14, 2) NOT NULL CHECK (received_amount >= 0),
  fee_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  tax_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  status          settlement_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id     UUID REFERENCES payment_settlements (id) ON DELETE SET NULL,
  payment_id        UUID REFERENCES payments (id) ON DELETE SET NULL,
  gateway_reference VARCHAR(128),
  expected_amount   NUMERIC(14, 2) NOT NULL,
  received_amount   NUMERIC(14, 2) NOT NULL,
  variance_amount   NUMERIC(14, 2) NOT NULL,
  status            reconciliation_status NOT NULL DEFAULT 'matched',
  notes             TEXT,
  reconciled_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number     VARCHAR(64) NOT NULL,
  payment_id        UUID NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  order_id          UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  return_id         UUID REFERENCES returns (id) ON DELETE SET NULL,
  requested_by_id   UUID REFERENCES users (id) ON DELETE SET NULL,
  refund_type       refund_type NOT NULL DEFAULT 'full',
  amount            NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
  reason_code       VARCHAR(64),
  reason            TEXT,
  gateway_refund_id VARCHAR(128),
  gateway_reference VARCHAR(128),
  status            refund_status NOT NULL DEFAULT 'requested',
  approved_at       TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refund_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id     UUID NOT NULL REFERENCES refunds (id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items (id) ON DELETE SET NULL,
  amount        NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  quantity      INTEGER CHECK (quantity IS NULL OR quantity > 0),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wallet_redemptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id  UUID NOT NULL REFERENCES wallets (id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  order_id   UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  amount     NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards (id) ON DELETE RESTRICT,
  payment_id   UUID NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  order_id     UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  amount       NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_disputes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id         UUID NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  order_id           UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  customer_id        UUID REFERENCES users (id) ON DELETE SET NULL,
  gateway_dispute_id VARCHAR(128),
  reason             VARCHAR(255),
  amount             NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency           VARCHAR(3) NOT NULL DEFAULT 'INR',
  status             dispute_status NOT NULL DEFAULT 'opened',
  opened_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  action      VARCHAR(120) NOT NULL,
  actor_id    UUID,
  from_status payment_status,
  to_status   payment_status,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_gateways', 'payment_methods', 'emi_plans', 'payments',
    'payment_attempts', 'payment_transactions', 'payment_webhooks',
    'payment_settlements', 'payment_reconciliation',
    'refunds', 'refund_items',
    'wallet_redemptions', 'gift_card_redemptions',
    'payment_disputes', 'payment_audit_logs'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
       CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

COMMIT;
