-- Electronics Cart — Phase 8 Marketing, CMS & Customer Engagement
-- PostgreSQL 16
-- File: 034_marketing.sql

BEGIN;

DO $$ BEGIN
  CREATE TYPE cms_page_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM (
    'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email', 'push', 'sms', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loyalty_tx_type AS ENUM (
    'earn', 'redeem', 'expire', 'adjust', 'referral_bonus', 'refund'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_source AS ENUM (
    'manual', 'collaborative', 'content', 'trending', 'bought_together', 'viewed_together'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seo_entity_type AS ENUM (
    'page', 'product', 'category', 'collection', 'blog', 'buying_guide', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CMS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(220) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  page_type   VARCHAR(64) NOT NULL DEFAULT 'page',
  status      cms_page_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cms_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES cms_pages (id) ON DELETE CASCADE,
  section_key VARCHAR(64) NOT NULL,
  section_type VARCHAR(64) NOT NULL,
  title       VARCHAR(255),
  config_json JSONB,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS homepage_layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS homepage_section_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id   UUID NOT NULL REFERENCES homepage_layouts (id) ON DELETE CASCADE,
  section_key VARCHAR(64) NOT NULL,
  section_type VARCHAR(64) NOT NULL,
  title       VARCHAR(255),
  config_json JSONB,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS banner_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  placement   VARCHAR(64) NOT NULL DEFAULT 'homepage',
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES banner_groups (id) ON DELETE SET NULL,
  title           VARCHAR(255) NOT NULL,
  subtitle        VARCHAR(255),
  media_file_id   UUID REFERENCES media_files (id) ON DELETE SET NULL,
  mobile_media_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  link_url        VARCHAR(1024),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(220) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  description TEXT,
  media_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
  rules_json  JSONB,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS collection_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  label       VARCHAR(80) NOT NULL,
  color_hex   VARCHAR(7),
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_badge_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id    UUID NOT NULL REFERENCES product_badges (id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Blog & content ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(220) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blog_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(220) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blogs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(220) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  excerpt       TEXT,
  body          TEXT NOT NULL,
  author_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  category_id   UUID REFERENCES blog_categories (id) ON DELETE SET NULL,
  cover_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  status        cms_page_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blog_tag_map (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     UUID NOT NULL REFERENCES blogs (id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES blog_tags (id) ON DELETE CASCADE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id     UUID NOT NULL REFERENCES blogs (id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  parent_id   UUID REFERENCES blog_comments (id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS buying_guides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(220) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  excerpt       TEXT,
  body          TEXT NOT NULL,
  author_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  cover_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  status        cms_page_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faq_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(220) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES faq_categories (id) ON DELETE SET NULL,
  question     VARCHAR(512) NOT NULL,
  answer       TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Campaigns & notifications ────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(320) NOT NULL,
  user_id        UUID REFERENCES users (id) ON DELETE SET NULL,
  source         VARCHAR(64),
  subscribed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  body_html   TEXT,
  body_text   TEXT,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(160) NOT NULL,
  template_id   UUID REFERENCES email_templates (id) ON DELETE SET NULL,
  segment_id    UUID,
  subject       VARCHAR(255),
  status        campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  channel     notification_channel NOT NULL,
  title       VARCHAR(255),
  body        TEXT NOT NULL,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notification_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(160) NOT NULL,
  template_id   UUID REFERENCES notification_templates (id) ON DELETE SET NULL,
  channel       notification_channel NOT NULL,
  segment_id    UUID,
  status        campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS push_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(160) NOT NULL,
  template_id   UUID REFERENCES notification_templates (id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  body          TEXT NOT NULL,
  deep_link     VARCHAR(1024),
  status        campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sms_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(160) NOT NULL,
  template_id   UUID REFERENCES notification_templates (id) ON DELETE SET NULL,
  message       VARCHAR(640) NOT NULL,
  status        campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Referral & loyalty ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(160) NOT NULL,
  referrer_points INTEGER NOT NULL DEFAULT 0 CHECK (referrer_points >= 0),
  referee_points  INTEGER NOT NULL DEFAULT 0 CHECK (referee_points >= 0),
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    UUID NOT NULL REFERENCES referral_programs (id) ON DELETE RESTRICT,
  referrer_id   UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  referee_id    UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  rewarded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  tier           loyalty_tier NOT NULL DEFAULT 'bronze',
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES loyalty_accounts (id) ON DELETE CASCADE,
  tx_type         loyalty_tx_type NOT NULL,
  points          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL CHECK (balance_after >= 0),
  reference_type  VARCHAR(64),
  reference_id    UUID,
  expires_at      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reward_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(160) NOT NULL,
  points_per_rupee NUMERIC(8, 4) CHECK (points_per_rupee IS NULL OR points_per_rupee >= 0),
  fixed_points    INTEGER CHECK (fixed_points IS NULL OR fixed_points >= 0),
  min_order_amount NUMERIC(14, 2) CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
  expiry_days     INTEGER CHECK (expiry_days IS NULL OR expiry_days > 0),
  tier_required   loyalty_tier,
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── Segments & recommendations ───────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  rules_json  JSONB,
  is_dynamic  BOOLEAN NOT NULL DEFAULT TRUE,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customer_segment_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  UUID NOT NULL REFERENCES customer_segments (id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

ALTER TABLE email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_segment_id_fkey;
ALTER TABLE email_campaigns
  ADD CONSTRAINT email_campaigns_segment_id_fkey
  FOREIGN KEY (segment_id) REFERENCES customer_segments (id) ON DELETE SET NULL;

ALTER TABLE notification_campaigns
  DROP CONSTRAINT IF EXISTS notification_campaigns_segment_id_fkey;
ALTER TABLE notification_campaigns
  ADD CONSTRAINT notification_campaigns_segment_id_fkey
  FOREIGN KEY (segment_id) REFERENCES customer_segments (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS product_recommendations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  source                 recommendation_source NOT NULL DEFAULT 'manual',
  score                  NUMERIC(8, 4) CHECK (score IS NULL OR score >= 0),
  sort_order             INTEGER NOT NULL DEFAULT 0,
  status                 record_status NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_product_recommendations_distinct CHECK (product_id <> recommended_product_id)
);

CREATE TABLE IF NOT EXISTS recently_viewed_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users (id) ON DELETE CASCADE,
  session_id  VARCHAR(128),
  product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_recently_viewed_identity CHECK (customer_id IS NOT NULL OR session_id IS NOT NULL)
);

-- ── SEO & search analytics ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS seo_metadata (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      seo_entity_type NOT NULL,
  entity_id        UUID,
  slug             VARCHAR(220),
  meta_title       VARCHAR(255),
  meta_description VARCHAR(512),
  canonical_url    VARCHAR(1024),
  og_title         VARCHAR(255),
  og_description   VARCHAR(512),
  og_image_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  structured_data  JSONB,
  status           record_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS seo_redirects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path    VARCHAR(1024) NOT NULL,
  to_path      VARCHAR(1024) NOT NULL,
  http_status  SMALLINT NOT NULL DEFAULT 301 CHECK (http_status IN (301, 302, 307, 308)),
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS search_keywords (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     VARCHAR(160) NOT NULL,
  is_autocomplete BOOLEAN NOT NULL DEFAULT TRUE,
  boost       INTEGER NOT NULL DEFAULT 0,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS search_synonyms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id  UUID NOT NULL REFERENCES search_keywords (id) ON DELETE CASCADE,
  synonym     VARCHAR(160) NOT NULL,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS popular_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword      VARCHAR(160) NOT NULL,
  search_count BIGINT NOT NULL DEFAULT 0 CHECK (search_count >= 0),
  last_searched_at TIMESTAMPTZ,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS zero_result_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword      VARCHAR(160) NOT NULL,
  search_count BIGINT NOT NULL DEFAULT 1 CHECK (search_count >= 0),
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_pages', 'cms_sections', 'homepage_layouts', 'homepage_section_items',
    'banner_groups', 'banners', 'collections', 'collection_products',
    'product_badges', 'product_badge_assignments',
    'blog_categories', 'blog_tags', 'blogs', 'blog_tag_map', 'blog_comments',
    'buying_guides', 'faq_categories', 'faqs',
    'newsletter_subscribers', 'email_templates', 'email_campaigns',
    'notification_templates', 'notification_campaigns', 'push_campaigns', 'sms_campaigns',
    'referral_programs', 'referral_rewards',
    'loyalty_accounts', 'loyalty_transactions', 'reward_rules',
    'customer_segments', 'customer_segment_members',
    'product_recommendations', 'recently_viewed_products',
    'seo_metadata', 'seo_redirects',
    'search_keywords', 'search_synonyms', 'popular_searches', 'zero_result_searches'
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
