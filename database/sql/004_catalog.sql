-- Electronics Cart — Phase 2 Catalog
-- PostgreSQL 16
-- File: 004_catalog.sql
-- Does NOT alter Phase 1 auth tables.

BEGIN;

-- ── Catalog enums ────────────────────────────
DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM (
    'in_stock', 'out_of_stock', 'preorder', 'discontinued', 'made_to_order'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_condition AS ENUM (
    'new_sealed', 'like_new', 'excellent', 'good', 'fair',
    'open_box', 'refurbished', 'certified_refurbished'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_grade AS ENUM ('a_plus', 'a', 'b', 'c', 'ungraded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_kind AS ENUM ('image', 'video', 'document', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE related_product_type AS ENUM (
    'cross_sell', 'upsell', 'frequently_bought_together', 'accessory', 'alternative'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attribute_data_type AS ENUM ('string', 'number', 'boolean', 'enum_value');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── media_files ──────────────────────────────
CREATE TABLE IF NOT EXISTS media_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket        VARCHAR(120) NOT NULL,
  object_key    VARCHAR(512) NOT NULL,
  mime_type     VARCHAR(120) NOT NULL,
  byte_size     BIGINT NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  checksum      VARCHAR(128),
  width         INTEGER,
  height        INTEGER,
  duration_ms   INTEGER,
  kind          media_kind NOT NULL DEFAULT 'image',
  original_name VARCHAR(255),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── brands ───────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  slug         VARCHAR(160) NOT NULL,
  logo_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  description  TEXT,
  country      VARCHAR(80),
  website      VARCHAR(255),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── categories (nested; subcategory = parent_id NOT NULL) ──
CREATE TABLE IF NOT EXISTS categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID REFERENCES categories (id) ON DELETE RESTRICT,
  name           VARCHAR(120) NOT NULL,
  slug           VARCHAR(160) NOT NULL,
  icon_file_id   UUID REFERENCES media_files (id) ON DELETE SET NULL,
  banner_file_id UUID REFERENCES media_files (id) ON DELETE SET NULL,
  description    TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_categories_not_self CHECK (parent_id IS DISTINCT FROM id)
);

COMMENT ON TABLE categories IS 'Unlimited nesting via parent_id; child rows are subcategories';

-- ── product_types ────────────────────────────
CREATE TABLE IF NOT EXISTS product_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(64) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── products ─────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES brands (id) ON DELETE RESTRICT,
  category_id       UUID NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  product_type_id   UUID NOT NULL REFERENCES product_types (id) ON DELETE RESTRICT,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(280) NOT NULL,
  short_description VARCHAR(512),
  description       TEXT,
  seo_title         VARCHAR(180),
  seo_description   VARCHAR(320),
  meta_keywords     VARCHAR(512),
  canonical_url     VARCHAR(512),
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  is_refurbished    BOOLEAN NOT NULL DEFAULT FALSE,
  is_open_box       BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_arrival    BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg        NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  review_count      INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  status            record_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── product_variants ─────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku                VARCHAR(64) NOT NULL,
  barcode            VARCHAR(64),
  ram                VARCHAR(32),
  storage            VARCHAR(64),
  processor          VARCHAR(120),
  gpu                VARCHAR(120),
  display_size       VARCHAR(32),
  display_resolution VARCHAR(64),
  refresh_rate       VARCHAR(32),
  operating_system   VARCHAR(80),
  keyboard_layout    VARCHAR(64),
  color              VARCHAR(64),
  weight             VARCHAR(32),
  battery_health     INTEGER CHECK (battery_health IS NULL OR (battery_health BETWEEN 0 AND 100)),
  condition          product_condition NOT NULL DEFAULT 'new_sealed',
  grade              product_grade NOT NULL DEFAULT 'ungraded',
  cost_price         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  mrp                NUMERIC(12, 2) NOT NULL CHECK (mrp >= 0),
  sale_price         NUMERIC(12, 2) NOT NULL CHECK (sale_price >= 0),
  discount_percent   NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  currency           CHAR(3) NOT NULL DEFAULT 'INR',
  stock_status       stock_status NOT NULL DEFAULT 'in_stock',
  status             record_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_variant_sale_lte_mrp CHECK (sale_price <= mrp)
);

-- ── product_images / media / documents ───────
CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE RESTRICT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  alt_text      VARCHAR(255),
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE RESTRICT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  alt_text      VARCHAR(255),
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE RESTRICT,
  title         VARCHAR(180) NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── attributes EAV ───────────────────────────
CREATE TABLE IF NOT EXISTS attributes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  data_type     attribute_data_type NOT NULL DEFAULT 'string',
  unit          VARCHAR(32),
  is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
  is_comparable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attribute_values (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES attributes (id) ON DELETE CASCADE,
  value        VARCHAR(180) NOT NULL,
  slug         VARCHAR(200) NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  status       record_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS variant_attribute_values (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id         UUID NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values (id) ON DELETE RESTRICT,
  status             record_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── specification groups ─────────────────────
CREATE TABLE IF NOT EXISTS specification_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       VARCHAR(64) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_specifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  group_id   UUID NOT NULL REFERENCES specification_groups (id) ON DELETE RESTRICT,
  name       VARCHAR(120) NOT NULL,
  value      VARCHAR(512) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── tags (table product_tags) + tag_map ──────
CREATE TABLE IF NOT EXISTS product_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(80) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tag_map (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES product_tags (id) ON DELETE CASCADE,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── reviews ──────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id              UUID REFERENCES users (id) ON DELETE SET NULL,
  rating               INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                VARCHAR(180),
  body                 TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count        INTEGER NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  admin_reply          TEXT,
  admin_replied_at     TIMESTAMPTZ,
  status               record_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS review_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES product_reviews (id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES media_files (id) ON DELETE RESTRICT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── compare / related / featured ─────────────
CREATE TABLE IF NOT EXISTS compare_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users (id) ON DELETE CASCADE,
  session_key VARCHAR(64),
  product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_compare_owner CHECK (user_id IS NOT NULL OR session_key IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS related_products (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  relation_type      related_product_type NOT NULL DEFAULT 'cross_sell',
  sort_order         INTEGER NOT NULL DEFAULT 0,
  status             record_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_related_not_self CHECK (product_id <> related_product_id)
);

CREATE TABLE IF NOT EXISTS featured_products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  slot       VARCHAR(64) NOT NULL DEFAULT 'homepage',
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_featured_window CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at
  )
);

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'media_files', 'brands', 'categories', 'product_types', 'products',
    'product_variants', 'product_images', 'product_media', 'product_documents',
    'attributes', 'attribute_values', 'variant_attribute_values',
    'specification_groups', 'product_specifications', 'product_tags', 'tag_map',
    'product_reviews', 'review_images', 'compare_products', 'related_products',
    'featured_products'
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
