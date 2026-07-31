-- Electronics Cart — Phase 2 Catalog indexes
-- File: 005_catalog_indexes.sql

BEGIN;

-- media_files
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_files_bucket_key_active
  ON media_files (bucket, object_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_files_kind ON media_files (kind) WHERE deleted_at IS NULL;

-- brands
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_slug_active
  ON brands (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brands_sort_order ON brands (sort_order);

-- categories
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_slug_active
  ON categories (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);

-- product_types
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_types_code_active
  ON product_types (code) WHERE deleted_at IS NULL;

-- products
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug_active
  ON products (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_product_type_id ON products (product_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured) WHERE deleted_at IS NULL AND is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_is_refurbished ON products (is_refurbished) WHERE deleted_at IS NULL AND is_refurbished = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_is_open_box ON products (is_open_box) WHERE deleted_at IS NULL AND is_open_box = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_is_new_arrival ON products (is_new_arrival) WHERE deleted_at IS NULL AND is_new_arrival = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_rating_avg ON products (rating_avg DESC) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC) WHERE deleted_at IS NULL;

-- Faceted listing composite (brand + category + status)
CREATE INDEX IF NOT EXISTS idx_products_facet_brand_cat
  ON products (brand_id, category_id, status)
  WHERE deleted_at IS NULL;

-- Full-text search on product name + short description
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(short_description, ''))
  )
  WHERE deleted_at IS NULL AND status = 'active';

-- product_variants
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku_active
  ON product_variants (sku) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_barcode_active
  ON product_variants (barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_sale_price ON product_variants (sale_price) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_product_variants_condition ON product_variants (condition) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_battery_health ON product_variants (battery_health) WHERE deleted_at IS NULL AND battery_health IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_processor ON product_variants (processor) WHERE deleted_at IS NULL AND processor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_gpu ON product_variants (gpu) WHERE deleted_at IS NULL AND gpu IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_ram ON product_variants (ram) WHERE deleted_at IS NULL AND ram IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_storage ON product_variants (storage) WHERE deleted_at IS NULL AND storage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_stock_status ON product_variants (stock_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_status ON product_variants (status) WHERE deleted_at IS NULL;

-- Filter join helper: active variant facets
CREATE INDEX IF NOT EXISTS idx_product_variants_filter_bundle
  ON product_variants (product_id, condition, ram, storage, sale_price)
  WHERE deleted_at IS NULL AND status = 'active';

-- images / media / docs
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort
  ON product_images (product_id, sort_order) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_one_primary
  ON product_images (product_id) WHERE is_primary = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON product_media (product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_documents_product_id ON product_documents (product_id) WHERE deleted_at IS NULL;

-- attributes
CREATE UNIQUE INDEX IF NOT EXISTS uq_attributes_code_active
  ON attributes (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_attribute_values_attr_slug_active
  ON attribute_values (attribute_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute_id ON attribute_values (attribute_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_attribute_values_active
  ON variant_attribute_values (variant_id, attribute_value_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variant_attribute_values_attr_val
  ON variant_attribute_values (attribute_value_id) WHERE deleted_at IS NULL;

-- specs
CREATE UNIQUE INDEX IF NOT EXISTS uq_specification_groups_code_active
  ON specification_groups (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id
  ON product_specifications (product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_specifications_group_id
  ON product_specifications (group_id) WHERE deleted_at IS NULL;

-- tags
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_tags_slug_active
  ON product_tags (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tag_map_active
  ON tag_map (product_id, tag_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tag_map_tag_id ON tag_map (tag_id) WHERE deleted_at IS NULL;

-- reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status
  ON product_reviews (product_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews (rating) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images (review_id) WHERE deleted_at IS NULL;

-- compare / related / featured
CREATE INDEX IF NOT EXISTS idx_compare_products_user_id ON compare_products (user_id) WHERE deleted_at IS NULL AND user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compare_products_session_key ON compare_products (session_key) WHERE deleted_at IS NULL AND session_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compare_products_product_id ON compare_products (product_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_related_products_active
  ON related_products (product_id, related_product_id, relation_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_related_products_related_id ON related_products (related_product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_featured_products_slot_sort
  ON featured_products (slot, sort_order) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_featured_products_product_id ON featured_products (product_id) WHERE deleted_at IS NULL;

COMMIT;
