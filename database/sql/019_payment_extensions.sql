-- Electronics Cart — Phase 5 extensions (pre-lock)
-- File: 019_payment_extensions.sql
-- Saved tokens, settlement batches, merchant accounts, payment events, FX rates

BEGIN;

CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  gateway_id   UUID NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  token        VARCHAR(255) NOT NULL,
  brand        VARCHAR(32),
  last_four    VARCHAR(4),
  expiry_month INTEGER CHECK (expiry_month IS NULL OR (expiry_month BETWEEN 1 AND 12)),
  expiry_year  INTEGER CHECK (expiry_year IS NULL OR expiry_year >= 2000),
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS saved_payment_method_id UUID REFERENCES saved_payment_methods (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS settlement_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id      UUID NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  batch_reference VARCHAR(128) NOT NULL,
  settlement_date DATE NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  total_amount    NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  status          settlement_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE payment_settlements
  ADD COLUMN IF NOT EXISTS settlement_batch_id UUID REFERENCES settlement_batches (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS merchant_accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id          UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  gateway_id         UUID NOT NULL REFERENCES payment_gateways (id) ON DELETE RESTRICT,
  merchant_reference VARCHAR(128) NOT NULL,
  status             record_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  event       VARCHAR(120) NOT NULL,
  payload     JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate            NUMERIC(18, 8) NOT NULL CHECK (rate > 0),
  effective_date  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_exchange_rates_pair CHECK (base_currency <> target_currency)
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'saved_payment_methods', 'settlement_batches', 'merchant_accounts',
    'payment_events', 'exchange_rates'
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
