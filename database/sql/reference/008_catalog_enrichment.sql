-- Production reference enrichment: specs, media, review, flash-sale product.
-- Requires 005_catalog_storefront.sql + 001_auth_reference.sql.

BEGIN;

-- Specs for MacBook Air
INSERT INTO product_specifications (
  id, product_id, group_id, name, value, sort_order, status, created_by, updated_by
) VALUES
  (
    '36100000-0000-0000-0000-000000000001',
    '36000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000003',
    'Chip', 'Apple M2', 10, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '36100000-0000-0000-0000-000000000002',
    '36000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000002',
    'Display', '13.6-inch Liquid Retina', 20, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '36100000-0000-0000-0000-000000000003',
    '36000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    'Memory', '8 GB unified memory', 30, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Placeholder media (CDN path; no binary upload required)
INSERT INTO media_files (
  id, bucket, object_key, mime_type, byte_size, kind, original_name, status, created_by, updated_by
) VALUES (
  '36200000-0000-0000-0000-000000000001',
  'electronics-cart-public',
  'products/macbook-air-m2-13/primary.jpg',
  'image/jpeg',
  0,
  'image',
  'macbook-air-m2-primary.jpg',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_media (
  id, product_id, media_file_id, sort_order, alt_text, is_primary, status, created_by, updated_by
) VALUES (
  '36300000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  '36200000-0000-0000-0000-000000000001',
  1,
  'MacBook Air M2 13 inch Midnight',
  TRUE,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (
  id, product_id, media_file_id, sort_order, alt_text, is_primary, status, created_by, updated_by
) VALUES (
  '36400000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  '36200000-0000-0000-0000-000000000001',
  1,
  'MacBook Air M2 13 inch Midnight',
  TRUE,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Approved review (status active)
INSERT INTO product_reviews (
  id, product_id, user_id, rating, title, body, is_verified_purchase, helpful_count, status, created_by, updated_by
) VALUES (
  '36500000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  5,
  'Excellent refurbished unit',
  'Battery health solid, screen perfect, great value.',
  TRUE,
  3,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

UPDATE products
SET rating_avg = 5.00, review_count = 1
WHERE id = '36000000-0000-0000-0000-000000000001';

-- Flash-sale Dell laptop (new arrival)
INSERT INTO products (
  id, brand_id, category_id, product_type_id, name, slug,
  short_description, seo_title, seo_description, meta_keywords,
  is_featured, is_refurbished, is_new_arrival, status, created_by, updated_by
) VALUES (
  '36000000-0000-0000-0000-000000000002',
  '31000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000011',
  '30000000-0000-0000-0000-000000000001',
  'Dell G15 Gaming Flash Deal',
  'dell-g15-flash-deal',
  'Limited-time flash sale gaming laptop',
  'Dell G15 Flash Deal | Electronics Cart',
  'Flash sale on Dell G15 gaming laptop with RTX graphics.',
  'dell,gaming,flash,laptop',
  TRUE, FALSE, TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (
  id, product_id, sku, barcode, ram, storage, processor, gpu,
  display_size, display_resolution, operating_system, color,
  condition, grade, cost_price, mrp, sale_price, discount_percent,
  currency, stock_status, status, created_by, updated_by
) VALUES (
  '37000000-0000-0000-0000-000000000002',
  '36000000-0000-0000-0000-000000000002',
  'DLL-G15-16-512-RTX',
  '8901000000002',
  '16GB', '512GB', 'Intel i7', 'RTX 4050',
  '15.6"', '1920x1080', 'Windows 11', 'Dark Shadow Grey',
  'new_sealed', 'a', 55000, 89990, 69990, 22.00,
  'INR', 'in_stock', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO featured_products (id, product_id, slot, sort_order, status, created_by, updated_by)
VALUES (
  '38000000-0000-0000-0000-000000000002',
  '36000000-0000-0000-0000-000000000002',
  'flash_sale', 1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO collections (id, slug, name, description, is_automatic, status, created_by, updated_by)
VALUES (
  '90600000-0000-0000-0000-000000000002',
  'flash-sale',
  'Flash Sale',
  'Limited-time flash deals',
  FALSE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO collection_products (id, collection_id, product_id, sort_order, status, created_by, updated_by)
VALUES (
  '90700000-0000-0000-0000-000000000002',
  '90600000-0000-0000-0000-000000000002',
  '36000000-0000-0000-0000-000000000002',
  1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
