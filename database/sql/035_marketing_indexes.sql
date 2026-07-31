-- Electronics Cart — Phase 8 Marketing indexes
-- File: 035_marketing_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_pages_slug_active
  ON cms_pages (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cms_sections_page_id
  ON cms_sections (page_id, sort_order) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_homepage_layouts_code_active
  ON homepage_layouts (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_homepage_layouts_default_active
  ON homepage_layouts (is_default) WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_homepage_section_items_layout_id
  ON homepage_section_items (layout_id, sort_order) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_banner_groups_code_active
  ON banner_groups (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_banners_group_id ON banners (group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_banners_status ON banners (status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_collections_slug_active
  ON collections (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_products_active
  ON collection_products (collection_id, product_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_badges_code_active
  ON product_badges (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_badge_assignments_active
  ON product_badge_assignments (badge_id, product_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_categories_slug_active
  ON blog_categories (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_tags_slug_active
  ON blog_tags (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blogs_slug_active
  ON blogs (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs (author_id) WHERE author_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_tag_map_active
  ON blog_tag_map (blog_id, tag_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id
  ON blog_comments (blog_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_buying_guides_slug_active
  ON buying_guides (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_buying_guides_status ON buying_guides (status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faq_categories_slug_active
  ON faq_categories (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON faqs (category_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email_active
  ON newsletter_subscribers (email) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_templates_code_active
  ON email_templates (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
  ON email_campaigns (status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_templates_code_channel_active
  ON notification_templates (code, channel) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status
  ON notification_campaigns (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_push_campaigns_status
  ON push_campaigns (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status
  ON sms_campaigns (status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_programs_code_active
  ON referral_programs (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id
  ON referral_rewards (referrer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referee_id
  ON referral_rewards (referee_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_accounts_customer_active
  ON loyalty_accounts (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account_id
  ON loyalty_transactions (account_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reward_rules_code_active
  ON reward_rules (code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_segments_code_active
  ON customer_segments (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_segment_members_active
  ON customer_segment_members (segment_id, customer_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_recommendations_pair_source_active
  ON product_recommendations (product_id, recommended_product_id, source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recently_viewed_customer_id
  ON recently_viewed_products (customer_id, viewed_at DESC)
  WHERE customer_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recently_viewed_product_id
  ON recently_viewed_products (product_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_seo_metadata_entity
  ON seo_metadata (entity_type, entity_id) WHERE entity_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_seo_metadata_slug
  ON seo_metadata (slug) WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_redirects_from_active
  ON seo_redirects (from_path) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_search_keywords_keyword_active
  ON search_keywords (keyword) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_search_synonyms_keyword_synonym_active
  ON search_synonyms (keyword_id, synonym) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_popular_searches_keyword_active
  ON popular_searches (keyword) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_popular_searches_count
  ON popular_searches (search_count DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_zero_result_searches_keyword_active
  ON zero_result_searches (keyword) WHERE deleted_at IS NULL;

COMMIT;
