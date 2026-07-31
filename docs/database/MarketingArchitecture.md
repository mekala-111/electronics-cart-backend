# Marketing Architecture — Electronics Cart

Phase 8 covers CMS, campaigns, loyalty, referrals, segments, recommendations, SEO, and search analytics.

## Domains

| Domain | Tables |
|--------|--------|
| CMS / homepage | `cms_pages`, `cms_sections`, `homepage_layouts`, `homepage_section_items` |
| Merchandising | `banners`, `banner_groups`, `collections`, `collection_products`, `product_badges` |
| Content | `blogs`, categories/tags/comments, `buying_guides`, `faqs` |
| Outreach | newsletter, email/push/SMS + notification templates/campaigns |
| Loyalty / referral | accounts, transactions, reward rules, referral programs/rewards |
| Personalization | segments, recommendations, recently viewed |
| Discovery | SEO metadata/redirects, search keywords/synonyms/popular/zero-result |

## Coupons vs campaigns

Phase 4 `coupons` remain checkout discount source of truth. Phase 8 campaigns drive traffic and messaging; they may *promote* a coupon code in template content without duplicating discount math.

## Featured products

Phase 2 `featured_products` still works for simple merchandising slots. Prefer `collections` + homepage section config for homepage builder composition.

## Experimentation & ops

| Area | Tables |
|------|--------|
| A/B tests | `ab_tests`, `ab_test_variants`, `ab_test_results` |
| Feature flags | `feature_flags`, `feature_flag_rules` |
| Rec feedback | impressions / clicks / feedback |
| Attribution | `marketing_channels`, `utm_campaigns`, `campaign_attribution` |
| Landing templates | `landing_templates`, `landing_template_sections` |
| SEO health | `seo_health_reports`, `broken_links`, `missing_metadata` |
| Versioning | `content_versions`, `page_revisions` |
