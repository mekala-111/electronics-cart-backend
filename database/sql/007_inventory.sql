-- Electronics Cart — Phase 3 Inventory
-- PostgreSQL 16
-- File: 007_inventory.sql
-- Does NOT alter Auth/Catalog tables (FK targets only).

BEGIN;

-- ── Enums ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft', 'approved', 'ordered', 'partially_received', 'received', 'closed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE goods_receipt_status AS ENUM ('draft', 'posted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM (
    'purchase', 'sale', 'transfer_out', 'transfer_in', 'adjustment',
    'return_in', 'return_out', 'repair', 'replacement',
    'reservation', 'reservation_release', 'damage', 'refurbish'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM (
    'active', 'consumed', 'expired', 'released', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE serial_number_status AS ENUM (
    'in_stock', 'reserved', 'sold', 'in_transit', 'under_repair',
    'refurbished_ready', 'damaged', 'scrapped', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE warranty_track_status AS ENUM (
    'not_applicable', 'not_registered', 'active', 'expired', 'claimed', 'voided'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refurbishment_status AS ENUM (
    'received', 'inspection', 'repair', 'testing', 'ready_for_sale', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_transfer_status AS ENUM (
    'draft', 'in_transit', 'received', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_reason AS ENUM (
    'cycle_count', 'damage', 'theft', 'write_off', 'found', 'correction', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cycle_count_status AS ENUM (
    'planned', 'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE low_stock_alert_status AS ENUM (
    'open', 'acknowledged', 'resolved', 'dismissed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_to_stock_source AS ENUM (
    'customer_return', 'warranty_replacement', 'service_center', 'open_box_inspection'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_to_stock_status AS ENUM (
    'received', 'inspection', 'restocked', 'rejected', 'quarantined'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── warehouses + location hierarchy ──────────
-- warehouse → zone → rack → bin → inventory
CREATE TABLE IF NOT EXISTS warehouses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(160) NOT NULL,
  code            VARCHAR(32) NOT NULL,
  address         VARCHAR(512),
  city            VARCHAR(100),
  state           VARCHAR(100),
  country         VARCHAR(100),
  postal_code     VARCHAR(20),
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  manager_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warehouse_zones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  code         VARCHAR(32) NOT NULL,
  name         VARCHAR(120),
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warehouse_racks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id    UUID NOT NULL REFERENCES warehouse_zones (id) ON DELETE CASCADE,
  code       VARCHAR(32) NOT NULL,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warehouse_bins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id    UUID NOT NULL REFERENCES warehouse_racks (id) ON DELETE CASCADE,
  code       VARCHAR(32) NOT NULL,
  barcode    VARCHAR(64),
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── suppliers ────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name   VARCHAR(200) NOT NULL,
  slug           VARCHAR(220) NOT NULL,
  gst_number     VARCHAR(32),
  contact_person VARCHAR(120),
  email          VARCHAR(320),
  mobile         VARCHAR(20),
  website        VARCHAR(255),
  payment_terms  VARCHAR(120),
  rating         NUMERIC(3, 2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(320),
  mobile      VARCHAR(20),
  role_title  VARCHAR(80),
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── inventory (bin × variant; warehouse denormalized) ──
CREATE TABLE IF NOT EXISTS inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id        UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  bin_id              UUID NOT NULL REFERENCES warehouse_bins (id) ON DELETE RESTRICT,
  variant_id          UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  available_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  reserved_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  damaged_quantity    INTEGER NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  in_transit_quantity INTEGER NOT NULL DEFAULT 0 CHECK (in_transit_quantity >= 0),
  reorder_level       INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  maximum_stock       INTEGER CHECK (maximum_stock IS NULL OR maximum_stock >= 0),
  last_stock_update   TIMESTAMPTZ,
  status              record_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── purchase orders (before serials FK) ──────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number     VARCHAR(64) NOT NULL,
  supplier_id   UUID NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  warehouse_id  UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  order_date    DATE,
  expected_date DATE,
  currency      VARCHAR(3) NOT NULL DEFAULT 'INR',
  subtotal      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_total     NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  grand_total   NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  notes         TEXT,
  status        purchase_order_status NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
  variant_id        UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity_ordered  INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost         NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  tax_percent       NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0),
  line_total        NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_po_item_received_lte_ordered CHECK (quantity_received <= quantity_ordered)
);

-- ── serial numbers ───────────────────────────
CREATE TABLE IF NOT EXISTS serial_numbers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number          VARCHAR(120) NOT NULL,
  barcode                VARCHAR(64),
  imei                   VARCHAR(32),
  warehouse_id           UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  bin_id                 UUID REFERENCES warehouse_bins (id) ON DELETE SET NULL,
  batch_id               UUID, -- FK added after inventory_batches
  variant_id             UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  purchase_order_item_id UUID REFERENCES purchase_order_items (id) ON DELETE SET NULL,
  status                 serial_number_status NOT NULL DEFAULT 'in_stock',
  warranty_status        warranty_track_status NOT NULL DEFAULT 'not_registered',
  refurbishment_status   refurbishment_status,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── inventory movements ──────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id     UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  variant_id       UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  movement_type    stock_movement_type NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity <> 0),
  reference_type   VARCHAR(64),
  reference_id     UUID,
  serial_number_id UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  notes            TEXT,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           record_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── stock reservations ───────────────────────
CREATE TABLE IF NOT EXISTS stock_reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  variant_id   UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  cart_id      UUID,
  order_id     UUID,
  session_key  VARCHAR(64),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  status       reservation_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── goods receipts ───────────────────────────
CREATE TABLE IF NOT EXISTS goods_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number        VARCHAR(64) NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders (id) ON DELETE SET NULL,
  supplier_id       UUID NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  warehouse_id      UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT,
  status            goods_receipt_status NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id       UUID NOT NULL REFERENCES goods_receipts (id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES purchase_order_items (id) ON DELETE SET NULL,
  variant_id             UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  serial_number_id       UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  quantity_received      INTEGER NOT NULL CHECK (quantity_received > 0),
  unit_cost              NUMERIC(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  status                 record_status NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── stock transfers ──────────────────────────
CREATE TABLE IF NOT EXISTS stock_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number   VARCHAR(64) NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  shipped_at        TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  notes             TEXT,
  status            stock_transfer_status NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_transfer_different_wh CHECK (from_warehouse_id <> to_warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_transfer_id UUID NOT NULL REFERENCES stock_transfers (id) ON DELETE CASCADE,
  variant_id        UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  serial_number_id  UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── adjustments / audits / alerts ────────────
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id   UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  variant_id     UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta <> 0),
  reason         adjustment_reason NOT NULL DEFAULT 'correction',
  notes          TEXT,
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── batches / cost / returns / forecast / scorecards / capacity / cycle counts
CREATE TABLE IF NOT EXISTS inventory_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id      UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  bin_id            UUID NOT NULL REFERENCES warehouse_bins (id) ON DELETE RESTRICT,
  variant_id        UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  supplier_id       UUID REFERENCES suppliers (id) ON DELETE SET NULL,
  batch_number      VARCHAR(64) NOT NULL,
  supplier_batch    VARCHAR(64),
  manufactured_date DATE,
  expiry_date       DATE,
  quantity          INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE serial_numbers
  DROP CONSTRAINT IF EXISTS serial_numbers_batch_id_fkey;
ALTER TABLE serial_numbers
  ADD CONSTRAINT serial_numbers_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES inventory_batches (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS purchase_cost_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id     UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  supplier_id    UUID NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  cost_price     NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
  currency       VARCHAR(3) NOT NULL DEFAULT 'INR',
  effective_from DATE NOT NULL,
  effective_to   DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_purchase_cost_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS return_to_stock (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           return_to_stock_source NOT NULL,
  warehouse_id     UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  bin_id           UUID REFERENCES warehouse_bins (id) ON DELETE SET NULL,
  variant_id       UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  serial_number_id UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reference_type   VARCHAR(64),
  reference_id     UUID,
  notes            TEXT,
  status           return_to_stock_status NOT NULL DEFAULT 'received',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_forecast (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id           UUID NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  expected_sales       INTEGER NOT NULL DEFAULT 0 CHECK (expected_sales >= 0),
  recommended_purchase INTEGER NOT NULL DEFAULT 0 CHECK (recommended_purchase >= 0),
  forecast_date        DATE NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id       UUID NOT NULL REFERENCES suppliers (id) ON DELETE CASCADE,
  on_time_delivery  NUMERIC(5, 2) NOT NULL CHECK (on_time_delivery >= 0 AND on_time_delivery <= 100),
  quality_score     NUMERIC(5, 2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  return_rate       NUMERIC(5, 2) NOT NULL CHECK (return_rate >= 0 AND return_rate <= 100),
  average_lead_time INTEGER NOT NULL CHECK (average_lead_time >= 0),
  scored_on         DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warehouse_capacity (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id   UUID NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  maximum_units  INTEGER NOT NULL CHECK (maximum_units > 0),
  occupied_units INTEGER NOT NULL DEFAULT 0 CHECK (occupied_units >= 0),
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_warehouse_capacity_occ CHECK (occupied_units <= maximum_units)
);

CREATE TABLE IF NOT EXISTS cycle_count_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE RESTRICT,
  job_number   VARCHAR(64) NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  status       cycle_count_status NOT NULL DEFAULT 'planned',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cycle_count_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_job_id UUID NOT NULL REFERENCES cycle_count_jobs (id) ON DELETE CASCADE,
  bin_id             UUID NOT NULL REFERENCES warehouse_bins (id) ON DELETE RESTRICT,
  variant_id         UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  expected_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (expected_quantity >= 0),
  counted_quantity   INTEGER CHECK (counted_quantity IS NULL OR counted_quantity >= 0),
  variance           INTEGER,
  status             record_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id       UUID NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  variant_id         UUID NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  reorder_level      INTEGER NOT NULL CHECK (reorder_level >= 0),
  status             low_stock_alert_status NOT NULL DEFAULT 'open',
  acknowledged_at    TIMESTAMPTZ,
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

-- triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'warehouses', 'warehouse_zones', 'warehouse_racks', 'warehouse_bins',
    'suppliers', 'supplier_contacts',
    'inventory', 'inventory_movements', 'stock_reservations', 'serial_numbers',
    'purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items',
    'stock_transfers', 'stock_transfer_items', 'inventory_adjustments',
    'inventory_batches', 'purchase_cost_history', 'return_to_stock',
    'inventory_forecast', 'supplier_scorecards', 'warehouse_capacity',
    'cycle_count_jobs', 'cycle_count_items', 'low_stock_alerts'
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
