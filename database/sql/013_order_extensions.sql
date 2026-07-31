-- Electronics Cart — Phase 4 extensions
-- File: 013_order_extensions.sql
-- Wallets, gift cards, multi-WH fulfillment, risk, invoice PDFs, cancellation reasons

BEGIN;

DO $$ BEGIN
  CREATE TYPE wallet_tx_type AS ENUM ('credit', 'debit', 'hold', 'release', 'adjust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE store_credit_source AS ENUM (
    'refund', 'promotional', 'exchange_balance', 'goodwill', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gift_card_status AS ENUM ('active', 'redeemed', 'expired', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fulfillment_status AS ENUM (
    'pending', 'picking', 'packed', 'shipped', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pick_list_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE packing_list_status AS ENUM ('open', 'packed', 'shipped', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  label       VARCHAR(160) NOT NULL,
  description TEXT,
  is_customer BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_reason_id UUID REFERENCES cancellation_reasons (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  currency   VARCHAR(3) NOT NULL DEFAULT 'INR',
  balance    NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store_credits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  order_id         UUID REFERENCES orders (id) ON DELETE SET NULL,
  source           store_credit_source NOT NULL,
  amount           NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  remaining_amount NUMERIC(14, 2) NOT NULL CHECK (remaining_amount >= 0),
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  expires_at       TIMESTAMPTZ,
  status           record_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_store_credit_remaining CHECK (remaining_amount <= amount)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES wallets (id) ON DELETE RESTRICT,
  tx_type         wallet_tx_type NOT NULL,
  amount          NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  balance_after   NUMERIC(14, 2) NOT NULL CHECK (balance_after >= 0),
  order_id        UUID REFERENCES orders (id) ON DELETE SET NULL,
  store_credit_id UUID REFERENCES store_credits (id) ON DELETE SET NULL,
  reference_type  VARCHAR(64),
  reference_id    UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(64) NOT NULL,
  initial_balance   NUMERIC(14, 2) NOT NULL CHECK (initial_balance >= 0),
  remaining_balance NUMERIC(14, 2) NOT NULL CHECK (remaining_balance >= 0),
  currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
  purchased_by_id   UUID REFERENCES users (id) ON DELETE SET NULL,
  expires_at        TIMESTAMPTZ,
  status            gift_card_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_gift_card_remaining CHECK (remaining_balance <= initial_balance)
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id  UUID NOT NULL REFERENCES gift_cards (id) ON DELETE RESTRICT,
  order_id      UUID REFERENCES orders (id) ON DELETE SET NULL,
  amount        NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  balance_after NUMERIC(14, 2) NOT NULL CHECK (balance_after >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- Split shipments: one order → many fulfillment_orders (per warehouse)
CREATE TABLE IF NOT EXISTS fulfillment_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_number VARCHAR(64) NOT NULL,
  order_id           UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  warehouse_id       UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  shipped_at         TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  status             fulfillment_status NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_order_id UUID NOT NULL REFERENCES fulfillment_orders (id) ON DELETE CASCADE,
  order_item_id        UUID NOT NULL REFERENCES order_items (id) ON DELETE RESTRICT,
  quantity             INTEGER NOT NULL CHECK (quantity > 0),
  status               record_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pick_lists (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_order_id UUID NOT NULL REFERENCES fulfillment_orders (id) ON DELETE CASCADE,
  pick_number          VARCHAR(64) NOT NULL,
  status               pick_list_status NOT NULL DEFAULT 'open',
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS packing_lists (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_order_id UUID NOT NULL REFERENCES fulfillment_orders (id) ON DELETE CASCADE,
  pack_number          VARCHAR(64) NOT NULL,
  status               packing_list_status NOT NULL DEFAULT 'open',
  packed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_risk_scores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  risk_level risk_level NOT NULL DEFAULT 'low',
  scored_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS risk_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  event_code  VARCHAR(64) NOT NULL,
  severity    risk_level NOT NULL DEFAULT 'medium',
  message     VARCHAR(512),
  metadata    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  invoice_pdf_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE RESTRICT,
  label               VARCHAR(120),
  status              record_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cancellation_reasons', 'wallets', 'store_credits', 'wallet_transactions',
    'gift_cards', 'gift_card_transactions',
    'fulfillment_orders', 'fulfillment_items', 'pick_lists', 'packing_lists',
    'order_risk_scores', 'risk_events', 'invoice_documents'
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
