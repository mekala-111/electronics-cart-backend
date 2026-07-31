-- Electronics Cart — Phase 9 Analytics extension seed
-- File: 045_analytics_extension_seed.sql

BEGIN;

INSERT INTO data_marts (id, code, name, description, target_platform, schema_name, status, created_by, updated_by)
VALUES (
  '99000000-0000-0000-0000-000000000001',
  'commerce_mart',
  'Commerce Data Mart',
  'Orders, payments, and product facts for BI warehouse',
  'bigquery',
  'electronics_cart_mart',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO etl_jobs (
  id, code, name, data_mart_id, schedule_cron, status, next_run_at, config_json, created_by, updated_by
) VALUES (
  '99100000-0000-0000-0000-000000000001',
  'etl_orders_daily',
  'Daily Orders Export',
  '99000000-0000-0000-0000-000000000001',
  '15 1 * * *',
  'scheduled',
  DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '1 hour 15 minutes',
  '{"format":"parquet"}'::jsonb,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO metric_streams (id, code, name, description, unit, status, created_by, updated_by)
VALUES (
  '99200000-0000-0000-0000-000000000001',
  'checkout_ops',
  'Checkout Operations',
  'Live checkout and payment counters',
  'count',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO live_metrics (id, stream_id, metric_key, metric_value, dimensions, observed_at)
VALUES (
  '99300000-0000-0000-0000-000000000001',
  '99200000-0000-0000-0000-000000000001',
  'active_checkouts',
  7,
  '{"channel":"web"}'::jsonb,
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO alert_rules (
  id, code, name, severity, condition_json, cooldown_minutes, is_enabled, status, created_by, updated_by
) VALUES (
  '99400000-0000-0000-0000-000000000001',
  'api_5xx_spike',
  'High API 5xx Rate',
  'critical',
  '{"metric":"api_request_logs","status_gte":500,"threshold_pct":5,"window_minutes":5}'::jsonb,
  15, TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO alert_notifications (id, rule_id, channel, target, status, created_by, updated_by)
VALUES (
  '99500000-0000-0000-0000-000000000001',
  '99400000-0000-0000-0000-000000000001',
  'email',
  'ops@electronicscart.local',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO experiment_metrics (
  id, test_id, variant_id, metric_date, impressions, conversions, revenue, engagement_rate, conversion_rate, currency, created_by, updated_by
) VALUES (
  '99600000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000001',
  '94100000-0000-0000-0000-000000000002',
  CURRENT_DATE - 1,
  5000, 210, 125000.00, 0.1800, 0.0420, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_ltv (
  id, customer_id, as_of_date, orders_count, gross_revenue, net_revenue, predicted_ltv, currency, created_by, updated_by
) VALUES (
  '99700000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  1, 82588.20, 82588.20, 120000.00, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO cohort_analysis (
  id, cohort_key, cohort_month, period_offset, customers_count, retained_count, retention_rate, revenue, currency, created_by, updated_by
) VALUES (
  '99800000-0000-0000-0000-000000000001',
  'signup_month',
  DATE '2026-07-01',
  0, 1, 1, 1.0000, 82588.20, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO fraud_metrics (
  id, metric_date, period, flagged_orders, blocked_orders, chargebacks, avg_risk_score, created_by, updated_by
) VALUES (
  '99900000-0000-0000-0000-000000000001',
  CURRENT_DATE - 1, 'daily', 0, 0, 0, NULL,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO retention_policies (
  id, code, name, entity_type, retain_days, archive_after_days, legal_hold, status, created_by, updated_by
) VALUES (
  '99a00000-0000-0000-0000-000000000001',
  'api_logs_90d',
  'API Request Logs 90 Days',
  'api_request_logs',
  90, 30, FALSE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
