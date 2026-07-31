-- Electronics Cart — Phase 6 Shipping extensions (pre-lock)
-- PostgreSQL 16
-- File: 025_shipping_extensions.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE insurance_claim_status AS ENUM (
    'none', 'open', 'under_review', 'approved', 'rejected', 'paid', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS carrier_sla (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  service_type  shipping_service_type NOT NULL,
  promised_days NUMERIC(5, 2) NOT NULL CHECK (promised_days >= 0),
  average_days  NUMERIC(5, 2) CHECK (average_days IS NULL OR average_days >= 0),
  success_rate  NUMERIC(5, 2) CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)),
  sample_size   INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  measured_from DATE,
  measured_to   DATE,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_insurance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  provider        VARCHAR(120) NOT NULL,
  insured_value   NUMERIC(14, 2) NOT NULL CHECK (insured_value >= 0),
  premium         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (premium >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  policy_number   VARCHAR(128),
  claim_status    insurance_claim_status NOT NULL DEFAULT 'none',
  claimed_at      TIMESTAMPTZ,
  settled_at      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS delivery_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  slot_start   TIMESTAMPTZ NOT NULL,
  slot_end     TIMESTAMPTZ NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_delivery_slot_window CHECK (slot_end > slot_start)
);

CREATE TABLE IF NOT EXISTS pickup_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  location      VARCHAR(512) NOT NULL,
  line1         VARCHAR(255),
  city          VARCHAR(100),
  state         VARCHAR(100),
  country       VARCHAR(100) NOT NULL DEFAULT 'India',
  postal_code   VARCHAR(20),
  latitude      NUMERIC(10, 7),
  longitude     NUMERIC(10, 7),
  working_hours JSONB,
  point_type    VARCHAR(64) NOT NULL DEFAULT 'store',
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipping_cost_breakdown (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  base_charge      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_charge >= 0),
  fuel_surcharge   NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (fuel_surcharge >= 0),
  handling_fee     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (handling_fee >= 0),
  insurance        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (insurance >= 0),
  cod_fee          NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
  tax              NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  other_charge     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (other_charge >= 0),
  total_charge     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_charge >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_shipping_cost_total CHECK (
    total_charge = base_charge + fuel_surcharge + handling_fee + insurance + cod_fee + tax + other_charge
  )
);

CREATE TABLE IF NOT EXISTS delivery_failure_reasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT TRUE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_eta_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  old_eta     TIMESTAMPTZ,
  new_eta     TIMESTAMPTZ NOT NULL,
  reason      VARCHAR(255),
  source      VARCHAR(64),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE delivery_attempts
  ADD COLUMN IF NOT EXISTS failure_reason_id UUID REFERENCES delivery_failure_reasons (id) ON DELETE SET NULL;

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS pickup_point_id UUID REFERENCES pickup_points (id) ON DELETE SET NULL;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'carrier_sla', 'shipment_insurance', 'delivery_slots', 'pickup_points',
    'shipping_cost_breakdown', 'delivery_failure_reasons'
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
