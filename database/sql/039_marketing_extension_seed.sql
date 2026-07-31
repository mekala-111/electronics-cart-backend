-- Electronics Cart — Phase 8 Marketing extension seed
-- File: 039_marketing_extension_seed.sql

BEGIN;

INSERT INTO ab_tests (
  id, code, name, hypothesis, target_type, target_key, status, starts_at, created_by, updated_by
) VALUES (
  '94000000-0000-0000-0000-000000000001',
  'home_hero_v1',
  'Homepage Hero Copy Test',
  'Stronger deal CTA increases CTR',
  'homepage_layout',
  'default_v1',
  'running',
  NOW() - INTERVAL '2 days',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ab_test_variants (
  id, test_id, code, name, is_control, weight_percent, config_json, status, created_by, updated_by
) VALUES
  (
    '94100000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000001',
    'control', 'Control', TRUE, 50,
    '{"banner_title":"Monsoon Laptop Deals"}'::jsonb, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '94100000-0000-0000-0000-000000000002',
    '94000000-0000-0000-0000-000000000001',
    'variant_a', 'Deal CTA', FALSE, 50,
    '{"banner_title":"Save up to ₹5,000 on MacBooks"}'::jsonb, 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO ab_test_results (
  id, test_id, variant_id, metric_key, metric_value, sample_size, measured_at, status, created_by, updated_by
) VALUES (
  '94200000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000001',
  '94100000-0000-0000-0000-000000000002',
  'ctr', 0.0420, 5000, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO feature_flags (id, code, name, description, status, default_value, created_by, updated_by)
VALUES (
  '94300000-0000-0000-0000-000000000001',
  'new_checkout_v2',
  'New Checkout V2',
  'Gradual rollout of checkout redesign',
  'conditional', FALSE,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO feature_flag_rules (
  id, flag_id, priority, conditions_json, rollout_percent, enabled_value, status, created_by, updated_by
) VALUES (
  '94400000-0000-0000-0000-000000000001',
  '94300000-0000-0000-0000-000000000001',
  10,
  '{"segment":"laptop_buyers"}'::jsonb,
  25, TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO marketing_channels (id, code, name, status, created_by, updated_by)
VALUES
  ('94500000-0000-0000-0000-000000000001', 'email', 'Email', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('94500000-0000-0000-0000-000000000002', 'paid_search', 'Paid Search', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO utm_campaigns (
  id, channel_id, utm_source, utm_medium, utm_campaign, email_campaign_id, status, created_by, updated_by
) VALUES (
  '94600000-0000-0000-0000-000000000001',
  '94500000-0000-0000-0000-000000000001',
  'electronicscart', 'email', 'monsoon_laptop_flash',
  '92100000-0000-0000-0000-000000000001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO campaign_attribution (
  id, utm_campaign_id, channel_id, customer_id, order_id, attributed_at, revenue_amount, currency, attribution_model, status, created_by, updated_by
) VALUES (
  '94700000-0000-0000-0000-000000000001',
  '94600000-0000-0000-0000-000000000001',
  '94500000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '2 days',
  82588.20, 'INR', 'last_click', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO landing_templates (id, code, name, description, status, created_by, updated_by)
VALUES (
  '94800000-0000-0000-0000-000000000001',
  'flash_sale_v1',
  'Flash Sale Landing',
  'Reusable campaign landing for seasonal flash sales',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO landing_template_sections (
  id, template_id, section_key, section_type, title, config_json, sort_order, status, created_by, updated_by
) VALUES (
  '94900000-0000-0000-0000-000000000001',
  '94800000-0000-0000-0000-000000000001',
  'hero', 'banner', 'Hero',
  '{"cta":"Shop now"}'::jsonb, 10, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO seo_health_reports (
  id, report_date, severity, pages_scanned, issues_found, summary, status, created_by, updated_by
) VALUES (
  '95000000-0000-0000-0000-000000000001',
  CURRENT_DATE, 'warning', 120, 3,
  '3 pages missing meta description',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO missing_metadata (
  id, report_id, entity_type, entity_id, path, missing_fields, detected_at, status, created_by, updated_by
) VALUES (
  '95100000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  'collection',
  '90600000-0000-0000-0000-000000000001',
  '/collections/featured-laptops',
  '["meta_description"]'::jsonb,
  NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO broken_links (
  id, report_id, source_url, target_url, http_status, detected_at, status, created_by, updated_by
) VALUES (
  '95200000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  '/blog/how-to-choose-a-laptop-2026',
  '/collections/old-laptops',
  404, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO content_versions (
  id, entity_type, entity_id, version_number, snapshot_json, status, published_at, created_by, updated_by
) VALUES (
  '95300000-0000-0000-0000-000000000001',
  'cms_page',
  '90200000-0000-0000-0000-000000000001',
  1,
  '{"title":"Electronics Cart Home","sections":["hero"]}'::jsonb,
  'published', NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO page_revisions (
  id, page_id, version_id, revision_number, title, snapshot_json, change_summary, status, published_at, created_by, updated_by
) VALUES (
  '95400000-0000-0000-0000-000000000001',
  '90200000-0000-0000-0000-000000000001',
  '95300000-0000-0000-0000-000000000001',
  1,
  'Electronics Cart Home',
  '{"title":"Electronics Cart Home","sections":["hero"]}'::jsonb,
  'Initial publish',
  'published', NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
