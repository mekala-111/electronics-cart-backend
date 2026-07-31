-- Electronics Cart — Phase 9 Analytics, Audit, Monitoring & BI
-- PostgreSQL 16
-- File: 040_analytics.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE analytics_period AS ENUM ('daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_event_type AS ENUM (
    'login', 'logout', 'registration',
    'product_view', 'search', 'wishlist', 'cart', 'checkout', 'purchase',
    'review', 'support_ticket', 'referral', 'loyalty_redemption'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_export_format AS ENUM ('csv', 'pdf', 'xlsx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_export_status AS ENUM (
    'queued', 'processing', 'completed', 'failed', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_run_status AS ENUM (
    'queued', 'running', 'succeeded', 'failed', 'retrying', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Audit (append-only: no updated_at / deleted_at) ───────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(64) NOT NULL,
  entity_id       UUID,
  action          VARCHAR(64) NOT NULL,
  previous_values JSONB,
  new_values      JSONB,
  performed_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  role_code       VARCHAR(64),
  ip_address      VARCHAR(45),
  device          VARCHAR(255),
  request_id      VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  activity     VARCHAR(120) NOT NULL,
  entity_type  VARCHAR(64),
  entity_id    UUID,
  metadata     JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  VARCHAR(120) NOT NULL,
  severity    VARCHAR(32) NOT NULL DEFAULT 'info',
  source      VARCHAR(120),
  message     TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User & session analytics ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id  VARCHAR(128),
  event_type  user_event_type NOT NULL,
  entity_type VARCHAR(64),
  entity_id   UUID,
  properties  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id  VARCHAR(128),
  path        VARCHAR(1024) NOT NULL,
  referrer    VARCHAR(1024),
  utm_campaign VARCHAR(160),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screen_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id  VARCHAR(128),
  screen_name VARCHAR(160) NOT NULL,
  app_platform VARCHAR(32),
  app_version VARCHAR(32),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      VARCHAR(128) NOT NULL,
  user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  page_view_count INTEGER NOT NULL DEFAULT 0 CHECK (page_view_count >= 0),
  device          VARCHAR(255),
  entry_path      VARCHAR(1024),
  exit_path       VARCHAR(1024),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Search & commerce funnel ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id      VARCHAR(128),
  keyword         VARCHAR(160) NOT NULL,
  is_autocomplete BOOLEAN NOT NULL DEFAULT FALSE,
  result_count    INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  is_zero_result  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_clicks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_log_id   UUID NOT NULL REFERENCES search_logs (id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products (id) ON DELETE SET NULL,
  click_position  INTEGER NOT NULL CHECK (click_position > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversion_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id    VARCHAR(128),
  funnel_step   VARCHAR(64) NOT NULL,
  order_id      UUID REFERENCES orders (id) ON DELETE SET NULL,
  amount        NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
  currency      VARCHAR(3) NOT NULL DEFAULT 'INR',
  properties    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_abandonment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  cart_id       UUID REFERENCES carts (id) ON DELETE SET NULL,
  session_id    VARCHAR(128),
  cart_value    NUMERIC(14, 2) CHECK (cart_value IS NULL OR cart_value >= 0),
  currency      VARCHAR(3) NOT NULL DEFAULT 'INR',
  item_count    INTEGER CHECK (item_count IS NULL OR item_count >= 0),
  abandoned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlist_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date   DATE NOT NULL,
  product_id    UUID REFERENCES products (id) ON DELETE SET NULL,
  add_count     INTEGER NOT NULL DEFAULT 0 CHECK (add_count >= 0),
  remove_count  INTEGER NOT NULL DEFAULT 0 CHECK (remove_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id  VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  product_id      UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  views           INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  add_to_carts    INTEGER NOT NULL DEFAULT 0 CHECK (add_to_carts >= 0),
  purchases       INTEGER NOT NULL DEFAULT 0 CHECK (purchases >= 0),
  revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Domain KPI aggregates ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  orders_count    INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  refunds_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refunds_amount >= 0),
  aov             NUMERIC(14, 2),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  warehouse_id    UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  units_on_hand   INTEGER NOT NULL DEFAULT 0,
  units_reserved  INTEGER NOT NULL DEFAULT 0,
  low_stock_skus  INTEGER NOT NULL DEFAULT 0,
  stockout_skus   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  captured_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (captured_amount >= 0),
  failed_count    INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  refunded_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  success_rate    NUMERIC(5, 2) CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shipping_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  shipments_count INTEGER NOT NULL DEFAULT 0 CHECK (shipments_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  rto_count       INTEGER NOT NULL DEFAULT 0 CHECK (rto_count >= 0),
  avg_delivery_days NUMERIC(8, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  tickets_opened  INTEGER NOT NULL DEFAULT 0 CHECK (tickets_opened >= 0),
  tickets_closed  INTEGER NOT NULL DEFAULT 0 CHECK (tickets_closed >= 0),
  avg_turnaround_hours NUMERIC(10, 2),
  sla_breach_count INTEGER NOT NULL DEFAULT 0 CHECK (sla_breach_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS marketing_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  period          analytics_period NOT NULL DEFAULT 'daily',
  sessions        INTEGER NOT NULL DEFAULT 0 CHECK (sessions >= 0),
  new_customers   INTEGER NOT NULL DEFAULT 0 CHECK (new_customers >= 0),
  email_sends     INTEGER NOT NULL DEFAULT 0 CHECK (email_sends >= 0),
  attributed_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (attributed_revenue >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS campaign_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  channel_code    VARCHAR(64),
  campaign_key    VARCHAR(160) NOT NULL,
  sends           INTEGER NOT NULL DEFAULT 0 CHECK (sends >= 0),
  opens           INTEGER NOT NULL DEFAULT 0 CHECK (opens >= 0),
  clicks          INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  conversions     INTEGER NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  revenue         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_statistics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  campaign_id     UUID REFERENCES email_campaigns (id) ON DELETE SET NULL,
  sent_count      INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  open_count      INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  click_count     INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  bounce_count    INTEGER NOT NULL DEFAULT 0 CHECK (bounce_count >= 0),
  unsubscribe_count INTEGER NOT NULL DEFAULT 0 CHECK (unsubscribe_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS push_statistics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  campaign_id     UUID REFERENCES push_campaigns (id) ON DELETE SET NULL,
  sent_count      INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  open_count      INTEGER NOT NULL DEFAULT 0 CHECK (open_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sms_statistics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     DATE NOT NULL,
  campaign_id     UUID REFERENCES sms_campaigns (id) ON DELETE SET NULL,
  sent_count      INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count    INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date   DATE NOT NULL,
  period        analytics_period NOT NULL,
  domain        VARCHAR(64) NOT NULL,
  metrics_json  JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Dashboards & reporting ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  widget_type VARCHAR(64) NOT NULL,
  config_schema JSONB,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  role_code   VARCHAR(64),
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dashboard_widget_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id   UUID NOT NULL REFERENCES dashboard_layouts (id) ON DELETE CASCADE,
  widget_id   UUID NOT NULL REFERENCES dashboard_widgets (id) ON DELETE RESTRICT,
  title       VARCHAR(160),
  config_json JSONB,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  grid_x      INTEGER NOT NULL DEFAULT 0,
  grid_y      INTEGER NOT NULL DEFAULT 0,
  grid_w      INTEGER NOT NULL DEFAULT 4,
  grid_h      INTEGER NOT NULL DEFAULT 2,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS saved_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  report_type   VARCHAR(64) NOT NULL,
  query_json    JSONB,
  owner_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_report_id UUID NOT NULL REFERENCES saved_reports (id) ON DELETE CASCADE,
  cron_expression VARCHAR(120) NOT NULL,
  timezone        VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  recipients_json JSONB,
  next_run_at     TIMESTAMPTZ,
  last_run_at     TIMESTAMPTZ,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS report_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_report_id UUID REFERENCES saved_reports (id) ON DELETE SET NULL,
  scheduled_report_id UUID REFERENCES scheduled_reports (id) ON DELETE SET NULL,
  export_format   report_export_format NOT NULL,
  export_status   report_export_status NOT NULL DEFAULT 'queued',
  media_file_id   UUID REFERENCES media_files (id) ON DELETE SET NULL,
  row_count       INTEGER CHECK (row_count IS NULL OR row_count >= 0),
  error_message   TEXT,
  requested_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Monitoring ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        VARCHAR(120),
  error_code    VARCHAR(64),
  message       TEXT NOT NULL,
  stack_trace   TEXT,
  request_id    VARCHAR(128),
  user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_request_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      VARCHAR(128),
  method          VARCHAR(16) NOT NULL,
  path            VARCHAR(1024) NOT NULL,
  status_code     SMALLINT NOT NULL,
  latency_ms      INTEGER NOT NULL CHECK (latency_ms >= 0),
  user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS background_job_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name      VARCHAR(160) NOT NULL,
  job_id        VARCHAR(128),
  status        job_run_status NOT NULL DEFAULT 'queued',
  attempt       INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  error_message TEXT,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        VARCHAR(120) NOT NULL,
  event_type    VARCHAR(120),
  status_code   SMALLINT,
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  attempt       INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
  latency_ms    INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  payload       JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'session_analytics', 'wishlist_analytics', 'product_performance',
    'sales_metrics', 'inventory_metrics', 'payment_metrics',
    'shipping_metrics', 'service_metrics', 'marketing_metrics',
    'campaign_performance', 'email_statistics', 'push_statistics', 'sms_statistics',
    'kpi_snapshots',
    'dashboard_widgets', 'dashboard_layouts', 'dashboard_widget_instances',
    'saved_reports', 'scheduled_reports', 'report_exports',
    'background_job_logs'
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
