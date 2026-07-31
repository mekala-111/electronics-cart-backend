-- Electronics Cart — Phase 6 Shipping & Logistics
-- PostgreSQL 16
-- File: 022_shipping.sql
-- Note: 019–021 are Phase 5 payment extensions (locked). Shipping continues at 022.

BEGIN;

DO $$ BEGIN
  CREATE TYPE shipping_partner_code AS ENUM (
    'shiprocket', 'delhivery', 'bluedart', 'dtdc', 'xpressbees',
    'india_post', 'dhl', 'fedex', 'ups', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipping_service_type AS ENUM (
    'surface', 'express', 'same_day', 'next_day', 'international', 'hyperlocal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM (
    'created', 'packed', 'dispatched', 'in_transit', 'out_for_delivery',
    'delivered', 'delivery_failed', 'returned', 'lost', 'damaged', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE awb_status AS ENUM (
    'available', 'assigned', 'used', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pickup_status AS ENUM (
    'requested', 'scheduled', 'picked_up', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_attempt_status AS ENUM (
    'success', 'failed', 'rescheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reverse_shipment_type AS ENUM (
    'customer_return', 'warranty_return', 'exchange_pickup'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reverse_shipment_status AS ENUM (
    'requested', 'scheduled', 'picked_up', 'in_transit',
    'received', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rto_status AS ENUM (
    'initiated', 'in_transit', 'received', 'closed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shipping_label_format AS ENUM ('pdf', 'zpl', 'png');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Partners & services ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        shipping_partner_code NOT NULL,
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

CREATE TABLE IF NOT EXISTS shipping_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  code             VARCHAR(64) NOT NULL,
  name             VARCHAR(120) NOT NULL,
  service_type     shipping_service_type NOT NULL DEFAULT 'surface',
  is_cod_supported BOOLEAN NOT NULL DEFAULT FALSE,
  is_international BOOLEAN NOT NULL DEFAULT FALSE,
  status           record_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Zones, rate cards, rates, rules ──────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_zones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  country       VARCHAR(100) NOT NULL DEFAULT 'India',
  pincode_from  VARCHAR(20),
  pincode_to    VARCHAR(20),
  conditions_json JSONB,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipping_rate_cards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  service_id     UUID REFERENCES shipping_services (id) ON DELETE SET NULL,
  name           VARCHAR(120) NOT NULL,
  currency       VARCHAR(3) NOT NULL DEFAULT 'INR',
  effective_from DATE NOT NULL,
  effective_to   DATE,
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id   UUID NOT NULL REFERENCES shipping_rate_cards (id) ON DELETE CASCADE,
  from_zone_id   UUID REFERENCES shipping_zones (id) ON DELETE SET NULL,
  to_zone_id     UUID REFERENCES shipping_zones (id) ON DELETE SET NULL,
  min_weight_kg  NUMERIC(10, 3) NOT NULL DEFAULT 0 CHECK (min_weight_kg >= 0),
  max_weight_kg  NUMERIC(10, 3) CHECK (max_weight_kg IS NULL OR max_weight_kg >= min_weight_kg),
  base_rate      NUMERIC(12, 2) NOT NULL CHECK (base_rate >= 0),
  per_kg_rate    NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (per_kg_rate >= 0),
  currency       VARCHAR(3) NOT NULL DEFAULT 'INR',
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(120) NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 100,
  warehouse_id    UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  partner_id      UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  service_id      UUID REFERENCES shipping_services (id) ON DELETE SET NULL,
  conditions_json JSONB,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Pickups ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickup_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  partner_id   UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  window_start TIME NOT NULL,
  window_end   TIME NOT NULL,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_pickup_schedule_window CHECK (window_end > window_start)
);

CREATE TABLE IF NOT EXISTS pickup_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id          UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  partner_id            UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  pickup_schedule_id    UUID REFERENCES pickup_schedules (id) ON DELETE SET NULL,
  partner_pickup_ref    VARCHAR(128),
  scheduled_at          TIMESTAMPTZ,
  picked_up_at          TIMESTAMPTZ,
  package_count         INTEGER NOT NULL DEFAULT 1 CHECK (package_count > 0),
  status                pickup_status NOT NULL DEFAULT 'requested',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Shipments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number       VARCHAR(64) NOT NULL,
  order_id              UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  fulfillment_order_id  UUID REFERENCES fulfillment_orders (id) ON DELETE SET NULL,
  warehouse_id          UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  partner_id            UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  service_id            UUID REFERENCES shipping_services (id) ON DELETE SET NULL,
  pickup_request_id     UUID REFERENCES pickup_requests (id) ON DELETE SET NULL,
  shipping_address_id   UUID REFERENCES order_addresses (id) ON DELETE SET NULL,
  tracking_number       VARCHAR(128),
  awb_number            VARCHAR(128),
  partner_shipment_ref  VARCHAR(128),
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  shipping_charge       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_charge >= 0),
  declared_value        NUMERIC(14, 2) CHECK (declared_value IS NULL OR declared_value >= 0),
  total_weight_kg       NUMERIC(10, 3) CHECK (total_weight_kg IS NULL OR total_weight_kg >= 0),
  volumetric_weight_kg  NUMERIC(10, 3) CHECK (volumetric_weight_kg IS NULL OR volumetric_weight_kg >= 0),
  status                shipment_status NOT NULL DEFAULT 'created',
  packed_at             TIMESTAMPTZ,
  dispatched_at         TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_packages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id          UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  package_number       VARCHAR(64) NOT NULL,
  length_cm            NUMERIC(10, 2) CHECK (length_cm IS NULL OR length_cm > 0),
  width_cm             NUMERIC(10, 2) CHECK (width_cm IS NULL OR width_cm > 0),
  height_cm            NUMERIC(10, 2) CHECK (height_cm IS NULL OR height_cm > 0),
  weight_kg            NUMERIC(10, 3) NOT NULL CHECK (weight_kg > 0),
  volumetric_weight_kg NUMERIC(10, 3) CHECK (volumetric_weight_kg IS NULL OR volumetric_weight_kg >= 0),
  declared_value       NUMERIC(14, 2) CHECK (declared_value IS NULL OR declared_value >= 0),
  status               record_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id         UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  order_item_id       UUID NOT NULL REFERENCES order_items (id) ON DELETE RESTRICT,
  package_id          UUID REFERENCES shipment_packages (id) ON DELETE SET NULL,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  status              record_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS awb_numbers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  awb_number   VARCHAR(128) NOT NULL,
  shipment_id  UUID REFERENCES shipments (id) ON DELETE SET NULL,
  assigned_at  TIMESTAMPTZ,
  status       awb_status NOT NULL DEFAULT 'available',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_labels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  package_id    UUID REFERENCES shipment_packages (id) ON DELETE SET NULL,
  media_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  label_url     VARCHAR(1024),
  label_format  shipping_label_format NOT NULL DEFAULT 'pdf',
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipment_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  current_status  shipment_status NOT NULL DEFAULT 'created',
  last_location   VARCHAR(255),
  last_event_at   TIMESTAMPTZ,
  exception_code  VARCHAR(64),
  exception_note  TEXT,
  raw_snapshot    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tracking_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  tracking_id     UUID REFERENCES shipment_tracking (id) ON DELETE SET NULL,
  event_status    shipment_status NOT NULL,
  event_code      VARCHAR(64),
  description     TEXT,
  location        VARCHAR(255),
  exception_code  VARCHAR(64),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  attempt_number  INTEGER NOT NULL CHECK (attempt_number > 0),
  status          delivery_attempt_status NOT NULL,
  failure_reason  VARCHAR(255),
  exception_code  VARCHAR(64),
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS delivery_proofs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id        UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  receiver_name      VARCHAR(160) NOT NULL,
  signature_file_id  UUID REFERENCES media_files (id) ON DELETE SET NULL,
  photo_file_id      UUID REFERENCES media_files (id) ON DELETE SET NULL,
  otp_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  otp_reference      VARCHAR(64),
  latitude           NUMERIC(10, 7),
  longitude          NUMERIC(10, 7),
  delivered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Reverse logistics ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reverse_shipments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reverse_number        VARCHAR(64) NOT NULL,
  reverse_type          reverse_shipment_type NOT NULL,
  order_id              UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  return_id             UUID REFERENCES returns (id) ON DELETE SET NULL,
  exchange_request_id   UUID REFERENCES exchange_requests (id) ON DELETE SET NULL,
  warehouse_id          UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  partner_id            UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  service_id            UUID REFERENCES shipping_services (id) ON DELETE SET NULL,
  shipment_id           UUID REFERENCES shipments (id) ON DELETE SET NULL,
  tracking_number       VARCHAR(128),
  awb_number            VARCHAR(128),
  status                reverse_shipment_status NOT NULL DEFAULT 'requested',
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_up_at          TIMESTAMPTZ,
  received_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rto_shipments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forward_shipment_id   UUID NOT NULL REFERENCES shipments (id) ON DELETE RESTRICT,
  reverse_shipment_id   UUID REFERENCES reverse_shipments (id) ON DELETE SET NULL,
  warehouse_id          UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  partner_id            UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  reason                VARCHAR(255),
  tracking_number       VARCHAR(128),
  awb_number            VARCHAR(128),
  status                rto_status NOT NULL DEFAULT 'initiated',
  initiated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipping_webhooks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES shipping_partners (id) ON DELETE RESTRICT,
  shipment_id       UUID REFERENCES shipments (id) ON DELETE SET NULL,
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

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shipping_partners', 'shipping_services',
    'shipping_zones', 'shipping_rate_cards', 'shipping_rates', 'shipping_rules',
    'pickup_schedules', 'pickup_requests',
    'shipments', 'shipment_packages', 'shipment_items',
    'awb_numbers', 'shipment_labels', 'shipment_tracking', 'tracking_events',
    'delivery_attempts', 'delivery_proofs',
    'reverse_shipments', 'rto_shipments', 'shipping_webhooks'
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
