# Migration Strategy

## Principles
1. **Forward-only** SQL files under `database/sql/`
2. **Approve phase-by-phase** before writing the next module
3. **Prisma `schema.prisma`** stays in sync with approved phases
4. Soft deletes + partial unique indexes from day one
5. Seed data is idempotent (`ON CONFLICT` / fixed UUIDs)

## Phase checklist

| Phase | Module | Status | SQL |
|-------|--------|--------|-----|
| 1 | Authentication | **Approved / Locked** | `001`–`003` |
| 2 | Catalog | **Approved / Locked** | `004`–`006` |
| 3 | Inventory | **Approved / Locked** | `007`–`009` |
| 4 | Orders & Sales | **Approved / Locked** | `010`–`015` |
| 5 | Payments | **Approved / Locked** | `016`–`021` |
| 6 | Shipping | **Approved / Locked** | `022`–`027` |
| 7 | Warranty & Service | **Approved / Locked** | `028`–`033` |
| 8 | Marketing / CMS | **Approved / Locked** | `034`–`039` |
| 9 | Analytics | **Approved / Locked** | `040`–`045` |

> **Database v1.0** — Phases 1–9 locked. Verification + CI gates required before tag (see `ReleaseChecklist.md`).

## Apply Phase 1–9 locally

```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/electronics_cart
for f in \
  database/sql/001_initial.sql \
  database/sql/002_indexes.sql \
  database/sql/003_seed.sql \
  database/sql/004_catalog.sql \
  database/sql/005_catalog_indexes.sql \
  database/sql/006_catalog_seed.sql \
  database/sql/007_inventory.sql \
  database/sql/008_inventory_indexes.sql \
  database/sql/009_inventory_seed.sql \
  database/sql/010_orders.sql \
  database/sql/011_order_indexes.sql \
  database/sql/012_order_seed.sql \
  database/sql/013_order_extensions.sql \
  database/sql/014_order_extension_indexes.sql \
  database/sql/015_order_extension_seed.sql \
  database/sql/016_payments.sql \
  database/sql/017_payment_indexes.sql \
  database/sql/018_payment_seed.sql \
  database/sql/019_payment_extensions.sql \
  database/sql/020_payment_extension_indexes.sql \
  database/sql/021_payment_extension_seed.sql \
  database/sql/022_shipping.sql \
  database/sql/023_shipping_indexes.sql \
  database/sql/024_shipping_seed.sql \
  database/sql/025_shipping_extensions.sql \
  database/sql/026_shipping_extension_indexes.sql \
  database/sql/027_shipping_extension_seed.sql \
  database/sql/028_warranty.sql \
  database/sql/029_warranty_indexes.sql \
  database/sql/030_warranty_seed.sql \
  database/sql/031_warranty_extensions.sql \
  database/sql/032_warranty_extension_indexes.sql \
  database/sql/033_warranty_extension_seed.sql \
  database/sql/034_marketing.sql \
  database/sql/035_marketing_indexes.sql \
  database/sql/036_marketing_seed.sql \
  database/sql/037_marketing_extensions.sql \
  database/sql/038_marketing_extension_indexes.sql \
  database/sql/039_marketing_extension_seed.sql \
  database/sql/040_analytics.sql \
  database/sql/041_analytics_indexes.sql \
  database/sql/042_analytics_seed.sql \
  database/sql/043_analytics_extensions.sql \
  database/sql/044_analytics_extension_indexes.sql \
  database/sql/045_analytics_extension_seed.sql
do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Rollback Phase 4 only (dev)

```sql
ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS fk_stock_reservations_cart;
ALTER TABLE stock_reservations DROP CONSTRAINT IF EXISTS fk_stock_reservations_order;
ALTER TABLE orders DROP COLUMN IF EXISTS cancellation_reason_id;

DROP TABLE IF EXISTS
  invoice_documents, risk_events, order_risk_scores,
  packing_lists, pick_lists, fulfillment_items, fulfillment_orders,
  gift_card_transactions, gift_cards,
  wallet_transactions, store_credits, wallets,
  cancellation_reasons,
  exchange_requests, return_items, returns,
  invoice_items, invoices,
  order_events, order_notes, order_status_history, order_addresses, order_items,
  coupon_usage, orders,
  coupon_rules, coupons,
  saved_for_later, wishlist_items, wishlists, cart_items, carts
CASCADE;

DROP TYPE IF EXISTS
  cart_status, coupon_discount_type, coupon_rule_type, order_status,
  address_type, order_note_visibility, invoice_status, return_status,
  exchange_type, exchange_status, order_event_type,
  wallet_tx_type, store_credit_source, gift_card_status,
  fulfillment_status, pick_list_status, packing_list_status, risk_level
CASCADE;
```

Do **not** drop Auth, Catalog, or Inventory tables when rolling back Orders.


## Rollback Phase 5 only (dev)

```sql
ALTER TABLE payments DROP COLUMN IF EXISTS saved_payment_method_id;
ALTER TABLE payment_settlements DROP COLUMN IF EXISTS settlement_batch_id;

DROP TABLE IF EXISTS
  exchange_rates, payment_events, merchant_accounts,
  settlement_batches, saved_payment_methods,
  payment_audit_logs, payment_disputes,
  gift_card_redemptions, wallet_redemptions,
  refund_items, refunds,
  payment_reconciliation, payment_settlements,
  payment_webhooks, payment_transactions, payment_attempts,
  payments, emi_plans, payment_methods, payment_gateways
CASCADE;

DROP TYPE IF EXISTS
  payment_gateway_code, payment_method_code, payment_status, payment_tx_type,
  webhook_processing_status, refund_status, refund_type,
  settlement_status, reconciliation_status, dispute_status, emi_type
CASCADE;
```

Do **not** drop Orders or earlier phases when rolling back Payments.

## Rollback Phase 6 only (dev)

```sql
ALTER TABLE delivery_attempts DROP COLUMN IF EXISTS failure_reason_id;
ALTER TABLE shipments DROP COLUMN IF EXISTS pickup_point_id;

DROP TABLE IF EXISTS
  shipment_eta_history, delivery_failure_reasons, shipping_cost_breakdown,
  pickup_points, delivery_slots, shipment_insurance, carrier_sla,
  shipping_webhooks, rto_shipments, reverse_shipments,
  delivery_proofs, delivery_attempts,
  tracking_events, shipment_tracking, shipment_labels, awb_numbers,
  shipment_items, shipment_packages, shipments,
  pickup_requests, pickup_schedules,
  shipping_rules, shipping_rates, shipping_rate_cards, shipping_zones,
  shipping_services, shipping_partners
CASCADE;

DROP TYPE IF EXISTS
  insurance_claim_status,
  shipping_partner_code, shipping_service_type, shipment_status,
  awb_status, pickup_status, delivery_attempt_status,
  reverse_shipment_type, reverse_shipment_status, rto_status,
  shipping_label_format
CASCADE;
```

Do **not** drop Payments or earlier phases when rolling back Shipping.

## Rollback Phase 7 only (dev)

```sql
ALTER TABLE service_tickets DROP COLUMN IF EXISTS service_sla_id;

DROP TABLE IF EXISTS
  loan_allocations, loan_devices, service_sla,
  device_health_reports, repair_metrics, technician_certifications,
  supplier_part_catalog, spare_part_suppliers,
  contract_renewals, contract_items, service_contracts,
  service_audit_logs, service_documents, service_feedback,
  trade_in_evaluations, trade_in_requests,
  rma_requests, replacement_items, replacement_requests,
  repair_part_usage, repair_parts, repair_jobs,
  diagnostic_reports, ticket_status_history, service_tickets,
  technician_skills, technicians, service_center_locations, service_centers,
  warranty_status_history, claim_documents, warranty_claims,
  warranty_extensions, warranty_registrations, warranty_plans, warranty_providers
CASCADE;

DROP TYPE IF EXISTS
  service_contract_status, loan_device_status, loan_allocation_status, device_component_status,
  warranty_plan_type, warranty_registration_status, warranty_claim_status,
  service_ticket_status, repair_outcome, rma_type, rma_status,
  replacement_type, trade_in_status
CASCADE;
```

Do **not** drop Shipping or earlier phases when rolling back Warranty & Service.

## Rollback Phase 8 only (dev)

```sql
DROP TABLE IF EXISTS
  page_revisions, content_versions,
  missing_metadata, broken_links, seo_health_reports,
  landing_template_sections, landing_templates,
  campaign_attribution, utm_campaigns, marketing_channels,
  recommendation_feedback, recommendation_clicks, recommendation_impressions,
  feature_flag_rules, feature_flags,
  ab_test_results, ab_test_variants, ab_tests,
  zero_result_searches, popular_searches, search_synonyms, search_keywords,
  seo_redirects, seo_metadata,
  recently_viewed_products, product_recommendations,
  customer_segment_members, customer_segments,
  reward_rules, loyalty_transactions, loyalty_accounts,
  referral_rewards, referral_programs,
  sms_campaigns, push_campaigns, notification_campaigns, notification_templates,
  email_campaigns, email_templates, newsletter_subscribers,
  faqs, faq_categories, buying_guides,
  blog_comments, blog_tag_map, blogs, blog_tags, blog_categories,
  product_badge_assignments, product_badges,
  collection_products, collections, banners, banner_groups,
  homepage_section_items, homepage_layouts, cms_sections, cms_pages
CASCADE;

DROP TYPE IF EXISTS
  ab_test_status, feature_flag_status, seo_health_severity, content_version_status,
  cms_page_status, campaign_status, notification_channel,
  loyalty_tx_type, loyalty_tier, recommendation_source, seo_entity_type
CASCADE;
```

Do **not** drop Warranty or earlier phases when rolling back Marketing.

## Rollback Phase 9 only (dev)

```sql
DROP TABLE IF EXISTS
  archive_jobs, retention_policies,
  fraud_alerts, fraud_metrics,
  cohort_analysis, customer_ltv, experiment_metrics,
  alert_history, alert_notifications, alert_rules,
  live_metrics, metric_streams,
  warehouse_exports, etl_jobs, data_marts,
  webhook_logs, background_job_logs, api_request_logs, error_logs,
  report_exports, scheduled_reports, saved_reports,
  dashboard_widget_instances, dashboard_layouts, dashboard_widgets,
  kpi_snapshots,
  sms_statistics, push_statistics, email_statistics, campaign_performance,
  marketing_metrics, service_metrics, shipping_metrics, payment_metrics,
  inventory_metrics, sales_metrics, product_performance, product_views,
  wishlist_analytics, cart_abandonment_events, conversion_events,
  search_clicks, search_logs, session_analytics, screen_views, page_views,
  user_events, system_events, activity_logs, audit_logs
CASCADE;

DROP TYPE IF EXISTS
  etl_job_status, alert_severity, archive_job_status,
  analytics_period, user_event_type, report_export_format,
  report_export_status, job_run_status
CASCADE;
```

Do **not** drop Marketing or earlier phases when rolling back Analytics.
