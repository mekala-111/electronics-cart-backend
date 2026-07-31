-- Electronics Cart — Phase 8 Marketing extension indexes
-- File: 038_marketing_extension_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ab_tests_code_active
  ON ab_tests (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests (status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ab_test_variants_test_code_active
  ON ab_test_variants (test_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_variant
  ON ab_test_results (test_id, variant_id, measured_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_code_active
  ON feature_flags (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_flag_rules_flag_id
  ON feature_flag_rules (flag_id, priority) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_product
  ON recommendation_impressions (product_id, impressed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_customer
  ON recommendation_impressions (customer_id, impressed_at DESC)
  WHERE customer_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recommendation_clicks_impression
  ON recommendation_clicks (impression_id) WHERE impression_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_product
  ON recommendation_feedback (product_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_channels_code_active
  ON marketing_channels (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_utm_campaign
  ON utm_campaigns (utm_campaign) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_channel_id
  ON utm_campaigns (channel_id) WHERE channel_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_order_id
  ON campaign_attribution (order_id) WHERE order_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_utm
  ON campaign_attribution (utm_campaign_id) WHERE utm_campaign_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_landing_templates_code_active
  ON landing_templates (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_landing_template_sections_template
  ON landing_template_sections (template_id, sort_order) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_health_reports_date_active
  ON seo_health_reports (report_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_broken_links_report_id
  ON broken_links (report_id) WHERE report_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_missing_metadata_report_id
  ON missing_metadata (report_id) WHERE report_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_versions_entity_version_active
  ON content_versions (entity_type, entity_id, version_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_page_revisions_page_revision_active
  ON page_revisions (page_id, revision_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_page_revisions_page_id
  ON page_revisions (page_id, created_at DESC) WHERE deleted_at IS NULL;

COMMIT;
