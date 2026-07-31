-- Electronics Cart — Phase 4 Orders & Sales
-- PostgreSQL 16
-- File: 010_orders.sql
-- Does NOT alter Auth/Catalog/Inventory tables except additive FKs on stock_reservations.

BEGIN;

-- ── Enums ────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE cart_status AS ENUM ('active', 'merged', 'converted', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_discount_type AS ENUM ('flat', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_rule_type AS ENUM (
    'brand', 'category', 'min_cart_value', 'max_discount', 'usage_limit', 'per_user_limit'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'processing', 'packed', 'shipped',
    'delivered', 'completed', 'cancelled', 'returned', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE address_type AS ENUM ('shipping', 'billing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_note_visibility AS ENUM ('internal', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'cancelled', 'credited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_status AS ENUM (
    'requested', 'approved', 'rejected', 'picked_up',
    'received', 'inspection', 'refunded', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exchange_type AS ENUM ('same_variant', 'different_variant', 'store_credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exchange_status AS ENUM ('requested', 'approved', 'rejected', 'fulfilled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_event_type AS ENUM (
    'created', 'status_changed', 'payment_update', 'shipment_update', 'note_added',
    'coupon_applied', 'cancelled', 'return_requested', 'exchange_requested',
    'invoice_issued', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── carts ────────────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users (id) ON DELETE SET NULL,
  session_key    VARCHAR(64),
  currency       VARCHAR(3) NOT NULL DEFAULT 'INR',
  merged_into_id UUID REFERENCES carts (id) ON DELETE SET NULL,
  status         cart_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id    UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       VARCHAR(120) NOT NULL DEFAULT 'Default',
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists (id) ON DELETE CASCADE,
  variant_id  UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS saved_for_later (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id    UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status     record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

-- ── coupons ──────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(64) NOT NULL,
  name           VARCHAR(160) NOT NULL,
  description    TEXT,
  discount_type  coupon_discount_type NOT NULL,
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value >= 0),
  min_cart_value NUMERIC(12, 2) CHECK (min_cart_value IS NULL OR min_cart_value >= 0),
  max_discount   NUMERIC(12, 2) CHECK (max_discount IS NULL OR max_discount >= 0),
  usage_limit    INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_user_limit INTEGER CHECK (per_user_limit IS NULL OR per_user_limit > 0),
  starts_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  status         record_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_coupon_dates CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS coupon_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
  rule_type   coupon_rule_type NOT NULL,
  brand_id    UUID REFERENCES brands (id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories (id) ON DELETE SET NULL,
  rule_value  NUMERIC(12, 2),
  status      record_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

-- coupon_usage after orders (FK to orders)
-- ── orders ───────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number             VARCHAR(64) NOT NULL,
  customer_id              UUID REFERENCES users (id) ON DELETE SET NULL,
  cart_id                  UUID REFERENCES carts (id) ON DELETE SET NULL,
  coupon_id                UUID REFERENCES coupons (id) ON DELETE SET NULL,
  fulfillment_warehouse_id UUID REFERENCES warehouses (id) ON DELETE SET NULL,
  currency                 VARCHAR(3) NOT NULL DEFAULT 'INR',
  subtotal                 NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total           NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_total                NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  shipping_charge          NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (shipping_charge >= 0),
  grand_total              NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  gstin                    VARCHAR(32),
  placed_at                TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  status                   order_status NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ,
  created_by               UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by               UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons (id) ON DELETE RESTRICT,
  user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders (id) ON DELETE SET NULL,
  discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id            UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  serial_number_id      UUID REFERENCES serial_numbers (id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(255) NOT NULL,
  sku_snapshot          VARCHAR(64) NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  unit_price            NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  gst_rate              NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  gst_amount            NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
  line_total            NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
  warranty_months       INTEGER CHECK (warranty_months IS NULL OR warranty_months >= 0),
  warranty_snapshot     VARCHAR(255),
  hsn_code              VARCHAR(16),
  status                record_status NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  address_type address_type NOT NULL,
  full_name    VARCHAR(160) NOT NULL,
  phone        VARCHAR(20),
  line1        VARCHAR(255) NOT NULL,
  line2        VARCHAR(255),
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100) NOT NULL,
  country      VARCHAR(100) NOT NULL DEFAULT 'India',
  postal_code  VARCHAR(20) NOT NULL,
  gstin        VARCHAR(32),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  author_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  visibility order_note_visibility NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  event_type  order_event_type NOT NULL,
  message     VARCHAR(512),
  metadata    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(64) NOT NULL,
  order_id        UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  invoice_date    DATE NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'INR',
  subtotal        NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  cgst_total      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cgst_total >= 0),
  sgst_total      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (sgst_total >= 0),
  igst_total      NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (igst_total >= 0),
  shipping_charge NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (shipping_charge >= 0),
  grand_total     NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  seller_gstin    VARCHAR(32),
  buyer_gstin     VARCHAR(32),
  place_of_supply VARCHAR(100),
  status          invoice_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  order_item_id   UUID REFERENCES order_items (id) ON DELETE SET NULL,
  variant_id      UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  description     VARCHAR(255) NOT NULL,
  hsn_code        VARCHAR(16),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  gst_rate        NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  cgst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
  sgst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
  igst_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
  line_total      NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
  status          record_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS returns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(64) NOT NULL,
  order_id      UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  reason        VARCHAR(255),
  notes         TEXT,
  refund_amount NUMERIC(14, 2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  status        return_status NOT NULL DEFAULT 'requested',
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS return_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id     UUID NOT NULL REFERENCES returns (id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items (id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  reason        VARCHAR(255),
  status        record_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exchange_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_number     VARCHAR(64) NOT NULL,
  order_id            UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  order_item_id       UUID NOT NULL REFERENCES order_items (id) ON DELETE RESTRICT,
  exchange_type       exchange_type NOT NULL,
  from_variant_id     UUID NOT NULL REFERENCES product_variants (id) ON DELETE RESTRICT,
  to_variant_id       UUID REFERENCES product_variants (id) ON DELETE RESTRICT,
  store_credit_amount NUMERIC(12, 2) CHECK (store_credit_amount IS NULL OR store_credit_amount >= 0),
  reason              VARCHAR(255),
  status              exchange_status NOT NULL DEFAULT 'requested',
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users (id) ON DELETE SET NULL
);

-- Additive FKs on locked inventory stock_reservations
ALTER TABLE stock_reservations
  DROP CONSTRAINT IF EXISTS fk_stock_reservations_cart;
ALTER TABLE stock_reservations
  ADD CONSTRAINT fk_stock_reservations_cart
  FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE SET NULL;

ALTER TABLE stock_reservations
  DROP CONSTRAINT IF EXISTS fk_stock_reservations_order;
ALTER TABLE stock_reservations
  ADD CONSTRAINT fk_stock_reservations_order
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;

-- triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'carts', 'cart_items', 'wishlists', 'wishlist_items', 'saved_for_later',
    'coupons', 'coupon_rules', 'coupon_usage',
    'orders', 'order_items', 'order_addresses', 'order_status_history',
    'order_notes', 'order_events',
    'invoices', 'invoice_items',
    'returns', 'return_items', 'exchange_requests'
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
