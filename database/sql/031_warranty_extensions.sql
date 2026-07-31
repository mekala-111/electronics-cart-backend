-- Electronics Cart — Phase 7 Warranty/Service extensions (pre-lock)
-- PostgreSQL 16
-- File: 031_warranty_extensions.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE service_contract_status AS ENUM (
    'draft', 'active', 'expired', 'cancelled', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_device_status AS ENUM (
    'available', 'allocated', 'maintenance', 'retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_allocation_status AS ENUM (
    'active', 'returned', 'overdue', 'lost', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE device_component_status AS ENUM (
    'excellent', 'good', 'fair', 'poor', 'failed', 'not_tested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Service contracts ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number  VARCHAR(64) NOT NULL,
  customer_id      UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  service_center_id UUID REFERENCES service_centers (id) ON DELETE SET NULL,
  title            VARCHAR(160) NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  annual_value     NUMERIC(14, 2) CHECK (annual_value IS NULL OR annual_value >= 0),
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  terms            TEXT,
  status           service_contract_status NOT NULL DEFAULT 'draft',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_service_contract_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS contract_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id          UUID NOT NULL REFERENCES service_contracts (id) ON DELETE CASCADE,
  variant_id           UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  serial_number_id     UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  warranty_plan_id     UUID REFERENCES warranty_plans (id) ON DELETE SET NULL,
  description          VARCHAR(255),
  quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_value           NUMERIC(12, 2) CHECK (unit_value IS NULL OR unit_value >= 0),
  status               record_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contract_renewals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL REFERENCES service_contracts (id) ON DELETE CASCADE,
  previous_end_date DATE NOT NULL,
  new_end_date     DATE NOT NULL,
  renewal_amount   NUMERIC(14, 2) CHECK (renewal_amount IS NULL OR renewal_amount >= 0),
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  renewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT,
  status           record_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_contract_renewal_dates CHECK (new_end_date >= previous_end_date)
);

-- ── Spare part suppliers ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS spare_part_suppliers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_supplier_id UUID REFERENCES suppliers (id) ON DELETE SET NULL,
  code                  VARCHAR(64) NOT NULL,
  name                  VARCHAR(160) NOT NULL,
  contact_email         VARCHAR(320),
  contact_phone         VARCHAR(20),
  lead_time_days        INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  status                record_status NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS supplier_part_catalog (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_supplier_id  UUID NOT NULL REFERENCES spare_part_suppliers (id) ON DELETE RESTRICT,
  repair_part_id          UUID REFERENCES repair_parts (id) ON DELETE SET NULL,
  supplier_sku            VARCHAR(64) NOT NULL,
  supplier_part_name      VARCHAR(160),
  unit_cost               NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  currency                VARCHAR(3) NOT NULL DEFAULT 'INR',
  moq                     INTEGER CHECK (moq IS NULL OR moq > 0),
  lead_time_days          INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  is_preferred            BOOLEAN NOT NULL DEFAULT FALSE,
  status                  record_status NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  created_by              UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by              UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Technician certifications ────────────────────────────────────

CREATE TABLE IF NOT EXISTS technician_certifications (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id          UUID NOT NULL REFERENCES technicians (id) ON DELETE CASCADE,
  certification_name     VARCHAR(160) NOT NULL,
  certification_provider VARCHAR(160) NOT NULL,
  certificate_number     VARCHAR(128),
  issued_at              DATE,
  expiry_date            DATE,
  status                 record_status NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Repair metrics & device health ───────────────────────────────

CREATE TABLE IF NOT EXISTS repair_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id               UUID NOT NULL REFERENCES service_tickets (id) ON DELETE CASCADE,
  diagnosis_time_minutes  INTEGER CHECK (diagnosis_time_minutes IS NULL OR diagnosis_time_minutes >= 0),
  repair_time_minutes     INTEGER CHECK (repair_time_minutes IS NULL OR repair_time_minutes >= 0),
  testing_time_minutes    INTEGER CHECK (testing_time_minutes IS NULL OR testing_time_minutes >= 0),
  total_turnaround_minutes INTEGER CHECK (total_turnaround_minutes IS NULL OR total_turnaround_minutes >= 0),
  measured_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                  record_status NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  created_by              UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by              UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS device_health_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number_id     UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  ticket_id            UUID REFERENCES service_tickets (id) ON DELETE SET NULL,
  trade_in_request_id  UUID REFERENCES trade_in_requests (id) ON DELETE SET NULL,
  cpu_health           device_component_status NOT NULL DEFAULT 'not_tested',
  battery_cycles       INTEGER CHECK (battery_cycles IS NULL OR battery_cycles >= 0),
  battery_health       INTEGER CHECK (battery_health IS NULL OR (battery_health BETWEEN 0 AND 100)),
  display_status       device_component_status NOT NULL DEFAULT 'not_tested',
  keyboard_status      device_component_status NOT NULL DEFAULT 'not_tested',
  thermal_status       device_component_status NOT NULL DEFAULT 'not_tested',
  notes                TEXT,
  reported_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status               record_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Service SLA ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_sla (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    VARCHAR(64) NOT NULL,
  name                    VARCHAR(120) NOT NULL,
  priority                SMALLINT NOT NULL CHECK (priority BETWEEN 1 AND 5),
  response_time_minutes   INTEGER NOT NULL CHECK (response_time_minutes > 0),
  resolution_time_minutes INTEGER NOT NULL CHECK (resolution_time_minutes > 0),
  status                  record_status NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  created_by              UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by              UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS service_sla_id UUID REFERENCES service_sla (id) ON DELETE SET NULL;

-- ── Loaner devices ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loan_devices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag        VARCHAR(64) NOT NULL,
  variant_id       UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  serial_number_id UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  warehouse_id     UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  service_center_id UUID REFERENCES service_centers (id) ON DELETE SET NULL,
  status           loan_device_status NOT NULL DEFAULT 'available',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS loan_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_device_id  UUID NOT NULL REFERENCES loan_devices (id) ON DELETE RESTRICT,
  ticket_id       UUID REFERENCES service_tickets (id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  allocated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_back_at     TIMESTAMPTZ,
  returned_at     TIMESTAMPTZ,
  status          loan_allocation_status NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'service_contracts', 'contract_items', 'contract_renewals',
    'spare_part_suppliers', 'supplier_part_catalog',
    'technician_certifications', 'repair_metrics', 'device_health_reports',
    'service_sla', 'loan_devices', 'loan_allocations'
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
