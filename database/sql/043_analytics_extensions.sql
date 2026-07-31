-- Electronics Cart — Phase 9 Analytics extensions (pre-lock / optional)
-- PostgreSQL 16
-- File: 043_analytics_extensions.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE etl_job_status AS ENUM (
    'draft', 'scheduled', 'running', 'succeeded', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE archive_job_status AS ENUM (
    'queued', 'running', 'succeeded', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Data warehouse / ETL ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_marts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  description   TEXT,
  target_platform VARCHAR(64),
  schema_name   VARCHAR(120),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS etl_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  data_mart_id  UUID REFERENCES data_marts (id) ON DELETE SET NULL,
  source_query  TEXT,
  schedule_cron VARCHAR(120),
  status        etl_job_status NOT NULL DEFAULT 'draft',
  last_run_at   TIMESTAMPTZ,
  next_run_at   TIMESTAMPTZ,
  config_json   JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warehouse_exports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etl_job_id    UUID REFERENCES etl_jobs (id) ON DELETE SET NULL,
  data_mart_id  UUID REFERENCES data_marts (id) ON DELETE SET NULL,
  export_format VARCHAR(32) NOT NULL DEFAULT 'parquet',
  row_count     BIGINT CHECK (row_count IS NULL OR row_count >= 0),
  destination   VARCHAR(512),
  media_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  status        etl_job_status NOT NULL DEFAULT 'running',
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Real-time metrics ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metric_streams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  description   TEXT,
  unit          VARCHAR(32),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS live_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id     UUID NOT NULL REFERENCES metric_streams (id) ON DELETE CASCADE,
  metric_key    VARCHAR(120) NOT NULL,
  metric_value  NUMERIC(18, 4) NOT NULL,
  dimensions    JSONB,
  observed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Alerting ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alert_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(160) NOT NULL,
  severity        alert_severity NOT NULL DEFAULT 'warning',
  condition_json  JSONB NOT NULL,
  cooldown_minutes INTEGER NOT NULL DEFAULT 15 CHECK (cooldown_minutes >= 0),
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alert_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES alert_rules (id) ON DELETE CASCADE,
  channel       VARCHAR(32) NOT NULL,
  target        VARCHAR(320) NOT NULL,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alert_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES alert_rules (id) ON DELETE CASCADE,
  severity      alert_severity NOT NULL,
  message       TEXT NOT NULL,
  payload       JSONB,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Experiment analytics ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS experiment_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID NOT NULL REFERENCES ab_tests (id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES ab_test_variants (id) ON DELETE SET NULL,
  metric_date     DATE NOT NULL,
  impressions     BIGINT NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  conversions     BIGINT NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  engagement_rate NUMERIC(8, 4),
  conversion_rate NUMERIC(8, 4),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Customer LTV / cohorts ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_ltv (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  as_of_date      DATE NOT NULL,
  orders_count    INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  gross_revenue   NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (gross_revenue >= 0),
  net_revenue     NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (net_revenue >= 0),
  predicted_ltv   NUMERIC(14, 2),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cohort_analysis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_key      VARCHAR(64) NOT NULL,
  cohort_month    DATE NOT NULL,
  period_offset   INTEGER NOT NULL CHECK (period_offset >= 0),
  customers_count INTEGER NOT NULL DEFAULT 0 CHECK (customers_count >= 0),
  retained_count  INTEGER NOT NULL DEFAULT 0 CHECK (retained_count >= 0),
  retention_rate  NUMERIC(8, 4),
  revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Fraud analytics ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fraud_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  flagged_orders  INTEGER NOT NULL DEFAULT 0 CHECK (flagged_orders >= 0),
  blocked_orders  INTEGER NOT NULL DEFAULT 0 CHECK (blocked_orders >= 0),
  chargebacks     INTEGER NOT NULL DEFAULT 0 CHECK (chargebacks >= 0),
  avg_risk_score  NUMERIC(8, 4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders (id) ON DELETE SET NULL,
  payment_id      UUID REFERENCES payments (id) ON DELETE SET NULL,
  risk_score_id   UUID REFERENCES order_risk_scores (id) ON DELETE SET NULL,
  severity        alert_severity NOT NULL DEFAULT 'warning',
  reason          VARCHAR(255) NOT NULL,
  payload         JSONB,
  status          record_status NOT NULL DEFAULT 'active',
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Retention / archive ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(160) NOT NULL,
  entity_type     VARCHAR(64) NOT NULL,
  retain_days     INTEGER NOT NULL CHECK (retain_days > 0),
  archive_after_days INTEGER CHECK (archive_after_days IS NULL OR archive_after_days > 0),
  legal_hold      BOOLEAN NOT NULL DEFAULT FALSE,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS archive_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID NOT NULL REFERENCES retention_policies (id) ON DELETE RESTRICT,
  entity_type     VARCHAR(64) NOT NULL,
  status          archive_job_status NOT NULL DEFAULT 'queued',
  rows_archived   BIGINT NOT NULL DEFAULT 0 CHECK (rows_archived >= 0),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  error_message   TEXT,
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
    'data_marts', 'etl_jobs', 'warehouse_exports',
    'metric_streams',
    'alert_rules', 'alert_notifications',
    'experiment_metrics', 'customer_ltv', 'cohort_analysis',
    'fraud_metrics', 'fraud_alerts',
    'retention_policies', 'archive_jobs'
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
