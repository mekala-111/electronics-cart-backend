-- Production reference: homepage banners, collections, navigation.
-- Requires catalog product 36000000-...-0001 from 005_catalog_storefront.sql.

BEGIN;

INSERT INTO homepage_layouts (id, code, name, is_default, status, created_by, updated_by)
VALUES (
  '90000000-0000-0000-0000-000000000001',
  'default_v1',
  'Default Homepage',
  TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO homepage_section_items (
  id, layout_id, section_key, section_type, title, config_json, sort_order, status, created_by, updated_by
) VALUES
  (
    '90100000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    'hero', 'banner_group', 'Hero Banners',
    '{"group_code":"home_hero"}'::jsonb, 10, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '90100000-0000-0000-0000-000000000010',
    '90000000-0000-0000-0000-000000000001',
    'primary_nav', 'navigation', 'Primary Nav',
    '{"links":[{"label":"Laptops","href":"/categories/laptops"},{"label":"Monitors","href":"/categories/monitor"},{"label":"Accessories","href":"/categories/accessories"},{"label":"Deals","href":"/collections/featured-laptops"}]}'::jsonb,
    5, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO cms_pages (id, slug, title, page_type, status, published_at, created_by, updated_by)
VALUES (
  '90200000-0000-0000-0000-000000000010',
  'main-menu',
  'Main Menu',
  'navigation',
  'published',
  NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO banner_groups (id, code, name, placement, status, created_by, updated_by)
VALUES (
  '90400000-0000-0000-0000-000000000001',
  'home_hero',
  'Homepage Hero',
  'homepage',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO banners (
  id, group_id, title, subtitle, link_url, sort_order, status, created_by, updated_by
) VALUES (
  '90500000-0000-0000-0000-000000000001',
  '90400000-0000-0000-0000-000000000001',
  'Monsoon Laptop Deals',
  'Up to ₹5,000 off select MacBooks',
  '/collections/featured-laptops',
  1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO collections (id, slug, name, description, is_automatic, status, created_by, updated_by)
VALUES (
  '90600000-0000-0000-0000-000000000001',
  'featured-laptops',
  'Featured Laptops',
  'Curated laptops for Electronics Cart homepage',
  FALSE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO collection_products (id, collection_id, product_id, sort_order, status, created_by, updated_by)
VALUES (
  '90700000-0000-0000-0000-000000000001',
  '90600000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
