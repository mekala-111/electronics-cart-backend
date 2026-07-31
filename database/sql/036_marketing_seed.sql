-- Electronics Cart — Phase 8 Marketing seed
-- File: 036_marketing_seed.sql

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
    '90100000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000001',
    'featured_laptops', 'collection', 'Featured Laptops',
    '{"collection_slug":"featured-laptops"}'::jsonb, 20, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO cms_pages (id, slug, title, page_type, status, published_at, created_by, updated_by)
VALUES (
  '90200000-0000-0000-0000-000000000001',
  'home',
  'Electronics Cart Home',
  'homepage',
  'published',
  NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO cms_sections (
  id, page_id, section_key, section_type, title, config_json, sort_order, status, created_by, updated_by
) VALUES (
  '90300000-0000-0000-0000-000000000001',
  '90200000-0000-0000-0000-000000000001',
  'hero', 'banner_group', 'Hero',
  '{"group_code":"home_hero"}'::jsonb, 10, 'active',
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

INSERT INTO product_badges (id, code, label, color_hex, status, created_by, updated_by)
VALUES (
  '90800000-0000-0000-0000-000000000001',
  'bestseller',
  'Bestseller',
  '#E11D48',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_badge_assignments (id, badge_id, product_id, status, created_by, updated_by)
VALUES (
  '90900000-0000-0000-0000-000000000001',
  '90800000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_categories (id, slug, name, status, created_by, updated_by)
VALUES (
  '91000000-0000-0000-0000-000000000001',
  'buying-tips',
  'Buying Tips',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_tags (id, slug, name, status, created_by, updated_by)
VALUES (
  '91100000-0000-0000-0000-000000000001',
  'laptops',
  'Laptops',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO blogs (
  id, slug, title, excerpt, body, author_id, category_id, status, published_at, created_by, updated_by
) VALUES (
  '91200000-0000-0000-0000-000000000001',
  'how-to-choose-a-laptop-2026',
  'How to Choose a Laptop in 2026',
  'RAM, storage, and display tips for Indian buyers.',
  'Start with your workload, then pick CPU/RAM/storage...',
  '00000000-0000-0000-0000-000000000010',
  '91000000-0000-0000-0000-000000000001',
  'published', NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_tag_map (id, blog_id, tag_id, status, created_by, updated_by)
VALUES (
  '91300000-0000-0000-0000-000000000001',
  '91200000-0000-0000-0000-000000000001',
  '91100000-0000-0000-0000-000000000001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO buying_guides (
  id, slug, title, excerpt, body, author_id, status, published_at, created_by, updated_by
) VALUES (
  '91400000-0000-0000-0000-000000000001',
  'student-laptop-guide',
  'Student Laptop Buying Guide',
  'Best specs for college workloads.',
  'For most students, 16GB RAM and 512GB SSD is the sweet spot...',
  '00000000-0000-0000-0000-000000000010',
  'published', NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO faq_categories (id, slug, name, sort_order, status, created_by, updated_by)
VALUES (
  '91500000-0000-0000-0000-000000000001',
  'orders-shipping',
  'Orders & Shipping',
  10, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO faqs (id, category_id, question, answer, sort_order, status, created_by, updated_by)
VALUES (
  '91600000-0000-0000-0000-000000000001',
  '91500000-0000-0000-0000-000000000001',
  'How long does delivery take?',
  'Most metro deliveries arrive in 2–4 business days via Shiprocket partners.',
  1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO newsletter_subscribers (id, email, user_id, source, status, created_by, updated_by)
VALUES (
  '91700000-0000-0000-0000-000000000001',
  'demo.customer@electronicscart.local',
  '50000000-0000-0000-0000-000000000001',
  'homepage',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO email_templates (id, code, name, subject, body_html, body_text, status, created_by, updated_by)
VALUES (
  '91800000-0000-0000-0000-000000000001',
  'welcome',
  'Welcome Email',
  'Welcome to Electronics Cart',
  '<p>Thanks for joining Electronics Cart.</p>',
  'Thanks for joining Electronics Cart.',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_segments (id, code, name, rules_json, is_dynamic, status, created_by, updated_by)
VALUES (
  '91900000-0000-0000-0000-000000000001',
  'laptop_buyers',
  'Laptop Buyers',
  '{"purchased_category":"laptops"}'::jsonb,
  TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_segment_members (id, segment_id, customer_id, status, created_by, updated_by)
VALUES (
  '92000000-0000-0000-0000-000000000001',
  '91900000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO email_campaigns (
  id, name, template_id, segment_id, subject, status, created_by, updated_by
) VALUES (
  '92100000-0000-0000-0000-000000000001',
  'Monsoon Laptop Flash',
  '91800000-0000-0000-0000-000000000001',
  '91900000-0000-0000-0000-000000000001',
  'Flash deals on featured laptops',
  'draft',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_templates (id, code, name, channel, title, body, status, created_by, updated_by)
VALUES
  (
    '92200000-0000-0000-0000-000000000001',
    'order_shipped', 'Order Shipped Push', 'push',
    'Your order is on the way', 'Track your Electronics Cart shipment.',
    'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '92200000-0000-0000-0000-000000000002',
    'flash_sms', 'Flash SMS', 'sms',
    NULL, 'Electronics Cart: Monsoon deals live. Shop now.',
    'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO referral_programs (
  id, code, name, referrer_points, referee_points, status, created_by, updated_by
) VALUES (
  '92300000-0000-0000-0000-000000000001',
  'REF-2026',
  'Refer & Earn 2026',
  500, 250, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO loyalty_accounts (
  id, customer_id, points_balance, lifetime_points, tier, status, created_by, updated_by
) VALUES (
  '92400000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  825, 825, 'bronze', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO loyalty_transactions (
  id, account_id, tx_type, points, balance_after, reference_type, reference_id, expires_at, notes, created_by, updated_by
) VALUES (
  '92500000-0000-0000-0000-000000000001',
  '92400000-0000-0000-0000-000000000001',
  'earn', 825, 825, 'order',
  '54000000-0000-0000-0000-000000000001',
  NOW() + INTERVAL '365 days',
  'Points for order EC-2026-000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO reward_rules (
  id, code, name, points_per_rupee, expiry_days, status, created_by, updated_by
) VALUES (
  '92600000-0000-0000-0000-000000000001',
  'earn_1_per_100',
  '1 point per ₹100',
  0.01, 365, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO seo_metadata (
  id, entity_type, entity_id, slug, meta_title, meta_description, canonical_url, status, created_by, updated_by
) VALUES (
  '92700000-0000-0000-0000-000000000001',
  'blog',
  '91200000-0000-0000-0000-000000000001',
  'how-to-choose-a-laptop-2026',
  'How to Choose a Laptop in 2026 | Electronics Cart',
  'Practical buying tips for RAM, storage, and displays.',
  'https://electronicscart.example/blog/how-to-choose-a-laptop-2026',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO seo_redirects (id, from_path, to_path, http_status, status, created_by, updated_by)
VALUES (
  '92800000-0000-0000-0000-000000000001',
  '/blog/old-laptop-guide',
  '/blog/how-to-choose-a-laptop-2026',
  301, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO search_keywords (id, keyword, is_autocomplete, boost, status, created_by, updated_by)
VALUES (
  '92900000-0000-0000-0000-000000000001',
  'macbook air',
  TRUE, 10, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO search_synonyms (id, keyword_id, synonym, status, created_by, updated_by)
VALUES (
  '93000000-0000-0000-0000-000000000001',
  '92900000-0000-0000-0000-000000000001',
  'mba m2',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO popular_searches (id, keyword, search_count, last_searched_at, status, created_by, updated_by)
VALUES (
  '93100000-0000-0000-0000-000000000001',
  'macbook air',
  1280, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO zero_result_searches (id, keyword, search_count, last_searched_at, status, created_by, updated_by)
VALUES (
  '93200000-0000-0000-0000-000000000001',
  'macbook pro m5',
  14, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO recently_viewed_products (id, customer_id, product_id, viewed_at, created_by, updated_by)
VALUES (
  '93300000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '1 hour',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
