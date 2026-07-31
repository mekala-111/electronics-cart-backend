-- Electronics Cart — Phase 7 Warranty & Service Center
-- PostgreSQL 16
-- File: 028_warranty.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE warranty_plan_type AS ENUM (
    'manufacturer', 'extended', 'adp', 'amc'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE warranty_registration_status AS ENUM (
    'pending', 'active', 'expired', 'void', 'transferred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE warranty_claim_status AS ENUM (
    'submitted', 'under_review', 'approved', 'rejected',
    'in_service', 'closed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_ticket_status AS ENUM (
    'created', 'assigned', 'diagnosis', 'waiting_for_parts',
    'repair_in_progress', 'testing', 'quality_check',
    'ready_for_pickup', 'delivered', 'closed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE repair_outcome AS ENUM (
    'pending', 'repaired', 'irreparable', 'replaced', 'customer_declined'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rma_type AS ENUM (
    'doa', 'warranty_repair', 'replacement', 'refund'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rma_status AS ENUM (
    'requested', 'approved', 'in_transit', 'received',
    'completed', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE replacement_type AS ENUM (
    'same_variant', 'different_variant', 'upgrade', 'store_credit'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trade_in_status AS ENUM (
    'requested', 'evaluating', 'offered', 'accepted',
    'rejected', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Warranty masters ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warranty_providers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  contact_email VARCHAR(320),
  contact_phone VARCHAR(20),
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warranty_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES warranty_providers (id) ON DELETE RESTRICT,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(160) NOT NULL,
  plan_type       warranty_plan_type NOT NULL,
  coverage        TEXT,
  coverage_terms  TEXT,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  claim_limit     NUMERIC(14, 2) CHECK (claim_limit IS NULL OR claim_limit >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warranty_registrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number  VARCHAR(64) NOT NULL,
  plan_id              UUID NOT NULL REFERENCES warranty_plans (id) ON DELETE RESTRICT,
  customer_id          UUID REFERENCES users (id) ON DELETE SET NULL,
  order_id             UUID REFERENCES orders (id) ON DELETE SET NULL,
  order_item_id        UUID REFERENCES order_items (id) ON DELETE SET NULL,
  serial_number_id     UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  variant_id           UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  purchase_date        DATE,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  status               warranty_registration_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_warranty_registration_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS warranty_extensions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  UUID NOT NULL REFERENCES warranty_registrations (id) ON DELETE CASCADE,
  plan_id          UUID NOT NULL REFERENCES warranty_plans (id) ON DELETE RESTRICT,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  purchase_amount  NUMERIC(12, 2) CHECK (purchase_amount IS NULL OR purchase_amount >= 0),
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  status           record_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_warranty_extension_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number      VARCHAR(64) NOT NULL,
  registration_id   UUID NOT NULL REFERENCES warranty_registrations (id) ON DELETE RESTRICT,
  customer_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  serial_number_id  UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  issue_summary     VARCHAR(255) NOT NULL,
  issue_detail      TEXT,
  claim_amount      NUMERIC(14, 2) CHECK (claim_amount IS NULL OR claim_amount >= 0),
  currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
  status            warranty_claim_status NOT NULL DEFAULT 'submitted',
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS claim_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id      UUID NOT NULL REFERENCES warranty_claims (id) ON DELETE CASCADE,
  media_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  doc_type      VARCHAR(64) NOT NULL DEFAULT 'other',
  label         VARCHAR(160),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warranty_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  UUID REFERENCES warranty_registrations (id) ON DELETE CASCADE,
  claim_id         UUID REFERENCES warranty_claims (id) ON DELETE CASCADE,
  from_status      VARCHAR(64),
  to_status        VARCHAR(64) NOT NULL,
  notes            TEXT,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id         UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_warranty_status_history_target CHECK (
    registration_id IS NOT NULL OR claim_id IS NOT NULL
  )
);

-- ── Service centers & technicians ────────────────────────────────

CREATE TABLE IF NOT EXISTS service_centers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  is_authorized BOOLEAN NOT NULL DEFAULT TRUE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_center_locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_center_id UUID NOT NULL REFERENCES service_centers (id) ON DELETE CASCADE,
  label             VARCHAR(120),
  line1             VARCHAR(255) NOT NULL,
  line2             VARCHAR(255),
  city              VARCHAR(100) NOT NULL,
  state             VARCHAR(100) NOT NULL,
  country           VARCHAR(100) NOT NULL DEFAULT 'India',
  postal_code       VARCHAR(20) NOT NULL,
  phone             VARCHAR(20),
  latitude          NUMERIC(10, 7),
  longitude         NUMERIC(10, 7),
  warehouse_id      UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS technicians (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  service_center_id UUID NOT NULL REFERENCES service_centers (id) ON DELETE RESTRICT,
  employee_code     VARCHAR(64) NOT NULL,
  display_name      VARCHAR(160) NOT NULL,
  is_available      BOOLEAN NOT NULL DEFAULT TRUE,
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS technician_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES technicians (id) ON DELETE CASCADE,
  skill_code    VARCHAR(64) NOT NULL,
  skill_name    VARCHAR(120) NOT NULL,
  proficiency   SMALLINT CHECK (proficiency IS NULL OR proficiency BETWEEN 1 AND 5),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Tickets, diagnostics, repairs ────────────────────────────────

CREATE TABLE IF NOT EXISTS service_tickets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number        VARCHAR(64) NOT NULL,
  customer_id          UUID REFERENCES users (id) ON DELETE SET NULL,
  registration_id      UUID REFERENCES warranty_registrations (id) ON DELETE SET NULL,
  claim_id             UUID REFERENCES warranty_claims (id) ON DELETE SET NULL,
  service_center_id    UUID NOT NULL REFERENCES service_centers (id) ON DELETE RESTRICT,
  location_id          UUID REFERENCES service_center_locations (id) ON DELETE SET NULL,
  technician_id        UUID REFERENCES technicians (id) ON DELETE SET NULL,
  serial_number_id     UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  order_id             UUID REFERENCES orders (id) ON DELETE SET NULL,
  order_item_id        UUID REFERENCES order_items (id) ON DELETE SET NULL,
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  status               service_ticket_status NOT NULL DEFAULT 'created',
  priority             SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  opened_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES service_tickets (id) ON DELETE CASCADE,
  from_status service_ticket_status,
  to_status   service_ticket_status NOT NULL,
  notes       TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id    UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES service_tickets (id) ON DELETE CASCADE,
  technician_id   UUID REFERENCES technicians (id) ON DELETE SET NULL,
  findings        TEXT NOT NULL,
  root_cause      TEXT,
  recommended_action VARCHAR(255),
  is_warranty_covered BOOLEAN NOT NULL DEFAULT TRUE,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS repair_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number   VARCHAR(64) NOT NULL,
  ticket_id       UUID NOT NULL REFERENCES service_tickets (id) ON DELETE RESTRICT,
  technician_id   UUID REFERENCES technicians (id) ON DELETE SET NULL,
  labor_cost      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  repair_minutes  INTEGER CHECK (repair_minutes IS NULL OR repair_minutes >= 0),
  outcome         repair_outcome NOT NULL DEFAULT 'pending',
  repair_notes    TEXT,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS repair_parts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku           VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  variant_id    UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  warehouse_id  UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  unit_cost     NUMERIC(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  currency      VARCHAR(3) NOT NULL DEFAULT 'INR',
  is_serialized BOOLEAN NOT NULL DEFAULT FALSE,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS repair_part_usage (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_job_id      UUID NOT NULL REFERENCES repair_jobs (id) ON DELETE CASCADE,
  repair_part_id     UUID NOT NULL REFERENCES repair_parts (id) ON DELETE RESTRICT,
  inventory_id       UUID REFERENCES inventory (id) ON DELETE SET NULL,
  warehouse_id       UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  serial_number_id   UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  warranty_claim_id  UUID REFERENCES warranty_claims (id) ON DELETE SET NULL,
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost          NUMERIC(12, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  is_warranty_covered BOOLEAN NOT NULL DEFAULT FALSE,
  status             record_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Replacement, RMA, trade-in ───────────────────────────────────

CREATE TABLE IF NOT EXISTS replacement_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number  VARCHAR(64) NOT NULL,
  ticket_id       UUID REFERENCES service_tickets (id) ON DELETE SET NULL,
  claim_id        UUID REFERENCES warranty_claims (id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  replacement_type replacement_type NOT NULL,
  store_credit_amount NUMERIC(12, 2) CHECK (store_credit_amount IS NULL OR store_credit_amount >= 0),
  status          record_status NOT NULL DEFAULT 'active',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS replacement_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replacement_request_id UUID NOT NULL REFERENCES replacement_requests (id) ON DELETE CASCADE,
  from_variant_id       UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  to_variant_id         UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  from_serial_number_id UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  to_serial_number_id   UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status                record_status NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rma_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_number      VARCHAR(64) NOT NULL,
  rma_type        rma_type NOT NULL,
  customer_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders (id) ON DELETE SET NULL,
  order_item_id   UUID REFERENCES order_items (id) ON DELETE SET NULL,
  claim_id        UUID REFERENCES warranty_claims (id) ON DELETE SET NULL,
  ticket_id       UUID REFERENCES service_tickets (id) ON DELETE SET NULL,
  serial_number_id UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  reason          VARCHAR(255),
  status          rma_status NOT NULL DEFAULT 'requested',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS trade_in_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number  VARCHAR(64) NOT NULL,
  customer_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  variant_id      UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  serial_number_id UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  device_label    VARCHAR(255),
  status          trade_in_status NOT NULL DEFAULT 'requested',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS trade_in_evaluations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_in_request_id  UUID NOT NULL REFERENCES trade_in_requests (id) ON DELETE CASCADE,
  cosmetic_grade       product_grade,
  battery_health       INTEGER CHECK (battery_health IS NULL OR (battery_health BETWEEN 0 AND 100)),
  functional_test_pass BOOLEAN,
  functional_notes     TEXT,
  estimated_value      NUMERIC(12, 2) CHECK (estimated_value IS NULL OR estimated_value >= 0),
  approved_value       NUMERIC(12, 2) CHECK (approved_value IS NULL OR approved_value >= 0),
  currency             VARCHAR(3) NOT NULL DEFAULT 'INR',
  evaluated_by         UUID REFERENCES technicians (id) ON DELETE SET NULL,
  evaluated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status               record_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES service_tickets (id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users (id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID REFERENCES service_tickets (id) ON DELETE CASCADE,
  claim_id      UUID REFERENCES warranty_claims (id) ON DELETE CASCADE,
  media_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  doc_type      VARCHAR(64) NOT NULL DEFAULT 'other',
  label         VARCHAR(160),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_service_documents_target CHECK (
    ticket_id IS NOT NULL OR claim_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS service_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID REFERENCES service_tickets (id) ON DELETE SET NULL,
  claim_id    UUID REFERENCES warranty_claims (id) ON DELETE SET NULL,
  repair_job_id UUID REFERENCES repair_jobs (id) ON DELETE SET NULL,
  action      VARCHAR(120) NOT NULL,
  actor_id    UUID,
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
    'warranty_providers', 'warranty_plans', 'warranty_registrations',
    'warranty_extensions', 'warranty_claims', 'claim_documents', 'warranty_status_history',
    'service_centers', 'service_center_locations', 'technicians', 'technician_skills',
    'service_tickets', 'ticket_status_history', 'diagnostic_reports',
    'repair_jobs', 'repair_parts', 'repair_part_usage',
    'replacement_requests', 'replacement_items', 'rma_requests',
    'trade_in_requests', 'trade_in_evaluations',
    'service_feedback', 'service_documents', 'service_audit_logs'
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
