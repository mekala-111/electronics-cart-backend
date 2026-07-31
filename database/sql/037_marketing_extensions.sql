-- Electronics Cart — Phase 8 Marketing extensions (pre-lock)
-- PostgreSQL 16
-- File: 037_marketing_extensions.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE ab_test_status AS ENUM (
    'draft', 'running', 'paused', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feature_flag_status AS ENUM (
    'enabled', 'disabled', 'conditional'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seo_health_severity AS ENUM (
    'ok', 'warning', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_version_status AS ENUM (
    'draft', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── A/B testing ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ab_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  hypothesis    TEXT,
  target_type   VARCHAR(64) NOT NULL,
  target_key    VARCHAR(160),
  status        ab_test_status NOT NULL DEFAULT 'draft',
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID NOT NULL REFERENCES ab_tests (id) ON DELETE CASCADE,
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  is_control    BOOLEAN NOT NULL DEFAULT FALSE,
  weight_percent NUMERIC(5, 2) NOT NULL DEFAULT 50 CHECK (weight_percent > 0 AND weight_percent <= 100),
  config_json   JSONB,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ab_test_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID NOT NULL REFERENCES ab_tests (id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES ab_test_variants (id) ON DELETE CASCADE,
  metric_key      VARCHAR(64) NOT NULL,
  metric_value    NUMERIC(18, 4) NOT NULL DEFAULT 0,
  sample_size     BIGINT NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Feature flags ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(160) NOT NULL,
  description   TEXT,
  status        feature_flag_status NOT NULL DEFAULT 'disabled',
  default_value BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feature_flag_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id       UUID NOT NULL REFERENCES feature_flags (id) ON DELETE CASCADE,
  priority      INTEGER NOT NULL DEFAULT 100,
  conditions_json JSONB,
  rollout_percent NUMERIC(5, 2) CHECK (rollout_percent IS NULL OR (rollout_percent >= 0 AND rollout_percent <= 100)),
  enabled_value BOOLEAN NOT NULL DEFAULT TRUE,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Recommendation feedback ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   UUID REFERENCES product_recommendations (id) ON DELETE SET NULL,
  product_id          UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id          VARCHAR(128),
  placement           VARCHAR(64),
  impressed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendation_clicks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impression_id       UUID REFERENCES recommendation_impressions (id) ON DELETE SET NULL,
  recommendation_id   UUID REFERENCES product_recommendations (id) ON DELETE SET NULL,
  product_id          UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  session_id          VARCHAR(128),
  clicked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   UUID REFERENCES product_recommendations (id) ON DELETE SET NULL,
  product_id          UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  feedback            VARCHAR(32) NOT NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Campaign attribution ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketing_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS utm_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID REFERENCES marketing_channels (id) ON DELETE SET NULL,
  utm_source    VARCHAR(120),
  utm_medium    VARCHAR(120),
  utm_campaign  VARCHAR(160) NOT NULL,
  utm_term      VARCHAR(160),
  utm_content   VARCHAR(160),
  email_campaign_id UUID REFERENCES email_campaigns (id) ON DELETE SET NULL,
  push_campaign_id  UUID REFERENCES push_campaigns (id) ON DELETE SET NULL,
  sms_campaign_id   UUID REFERENCES sms_campaigns (id) ON DELETE SET NULL,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS campaign_attribution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_campaign_id UUID REFERENCES utm_campaigns (id) ON DELETE SET NULL,
  channel_id      UUID REFERENCES marketing_channels (id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders (id) ON DELETE SET NULL,
  session_id      VARCHAR(128),
  attributed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revenue_amount  NUMERIC(14, 2) CHECK (revenue_amount IS NULL OR revenue_amount >= 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  attribution_model VARCHAR(64) NOT NULL DEFAULT 'last_click',
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Landing templates ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landing_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  description TEXT,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS landing_template_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES landing_templates (id) ON DELETE CASCADE,
  section_key   VARCHAR(64) NOT NULL,
  section_type  VARCHAR(64) NOT NULL,
  title         VARCHAR(255),
  config_json   JSONB,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── SEO health ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seo_health_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date   DATE NOT NULL,
  severity      seo_health_severity NOT NULL DEFAULT 'ok',
  pages_scanned INTEGER NOT NULL DEFAULT 0 CHECK (pages_scanned >= 0),
  issues_found  INTEGER NOT NULL DEFAULT 0 CHECK (issues_found >= 0),
  summary       TEXT,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS broken_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID REFERENCES seo_health_reports (id) ON DELETE SET NULL,
  source_url    VARCHAR(1024) NOT NULL,
  target_url    VARCHAR(1024) NOT NULL,
  http_status   SMALLINT,
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS missing_metadata (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID REFERENCES seo_health_reports (id) ON DELETE SET NULL,
  entity_type   seo_entity_type NOT NULL,
  entity_id     UUID,
  path          VARCHAR(1024),
  missing_fields JSONB NOT NULL,
  detected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Content versioning ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(64) NOT NULL,
  entity_id     UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  snapshot_json JSONB NOT NULL,
  status        content_version_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS page_revisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       UUID NOT NULL REFERENCES cms_pages (id) ON DELETE CASCADE,
  version_id    UUID REFERENCES content_versions (id) ON DELETE SET NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  title         VARCHAR(255) NOT NULL,
  snapshot_json JSONB NOT NULL,
  change_summary VARCHAR(255),
  status        content_version_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ab_tests', 'ab_test_variants', 'ab_test_results',
    'feature_flags', 'feature_flag_rules',
    'recommendation_impressions', 'recommendation_clicks', 'recommendation_feedback',
    'marketing_channels', 'utm_campaigns', 'campaign_attribution',
    'landing_templates', 'landing_template_sections',
    'seo_health_reports', 'broken_links', 'missing_metadata',
    'content_versions', 'page_revisions'
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
