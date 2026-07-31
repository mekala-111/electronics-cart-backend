-- Electronics Cart — Phase 9 Analytics seed
-- File: 042_analytics_seed.sql

BEGIN;

INSERT INTO audit_logs (
  id, entity_type, entity_id, action, previous_values, new_values,
  performed_by, role_code, ip_address, device, request_id, created_at
) VALUES (
  '96000000-0000-0000-0000-000000000001',
  'orders',
  '54000000-0000-0000-0000-000000000001',
  'status_changed',
  '{"status":"confirmed"}'::jsonb,
  '{"status":"processing"}'::jsonb,
  '00000000-0000-0000-0000-000000000010',
  'admin',
  '127.0.0.1',
  'seed-agent',
  'req_seed_order_001',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO user_events (
  id, user_id, session_id, event_type, entity_type, entity_id, properties, created_at
) VALUES
  (
    '96100000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'sess_seed_001',
    'product_view',
    'products',
    '36000000-0000-0000-0000-000000000001',
    '{"source":"plp"}'::jsonb,
    NOW() - INTERVAL '2 days'
  ),
  (
    '96100000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'sess_seed_001',
    'purchase',
    'orders',
    '54000000-0000-0000-0000-000000000001',
    '{"amount":82588.20}'::jsonb,
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO page_views (id, user_id, session_id, path, referrer, created_at)
VALUES (
  '96200000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'sess_seed_001',
  '/products/macbook-air-m2',
  '/collections/featured-laptops',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO session_analytics (
  id, session_id, user_id, started_at, ended_at, duration_seconds, page_view_count,
  entry_path, exit_path, created_by, updated_by
) VALUES (
  '96300000-0000-0000-0000-000000000001',
  'sess_seed_001',
  '50000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days' + INTERVAL '25 minutes',
  1500, 8,
  '/', '/checkout/success',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO search_logs (
  id, user_id, session_id, keyword, is_autocomplete, result_count, is_zero_result, created_at
) VALUES (
  '96400000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'sess_seed_001',
  'macbook air',
  TRUE, 12, FALSE,
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO search_clicks (id, search_log_id, product_id, click_position, created_at)
VALUES (
  '96500000-0000-0000-0000-000000000001',
  '96400000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  1,
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO conversion_events (
  id, user_id, session_id, funnel_step, order_id, amount, currency, created_at
) VALUES (
  '96600000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'sess_seed_001',
  'purchase',
  '54000000-0000-0000-0000-000000000001',
  82588.20, 'INR',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_views (id, product_id, user_id, session_id, created_at)
VALUES (
  '96700000-0000-0000-0000-000000000001',
  '36000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'sess_seed_001',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_performance (
  id, metric_date, product_id, views, add_to_carts, purchases, revenue, currency, created_by, updated_by
) VALUES (
  '96800000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2,
  '36000000-0000-0000-0000-000000000001',
  42, 5, 1, 82588.20, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_metrics (
  id, metric_date, period, orders_count, revenue, refunds_amount, aov, currency, created_by, updated_by
) VALUES (
  '96900000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2, 'daily', 1, 82588.20, 0, 82588.20, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_metrics (
  id, metric_date, period, warehouse_id, units_on_hand, units_reserved, low_stock_skus, stockout_skus, created_by, updated_by
) VALUES (
  '97000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 1, 'daily',
  '40000000-0000-0000-0000-000000000001',
  14, 1, 0, 0,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_metrics (
  id, metric_date, period, captured_amount, failed_count, refunded_amount, success_rate, currency, created_by, updated_by
) VALUES (
  '97100000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2, 'daily', 82588.20, 0, 0, 100.00, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_metrics (
  id, metric_date, period, shipments_count, delivered_count, rto_count, avg_delivery_days, created_by, updated_by
) VALUES (
  '97200000-0000-0000-0000-000000000001',
  CURRENT_DATE - 1, 'daily', 1, 0, 0, NULL,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO service_metrics (
  id, metric_date, period, tickets_opened, tickets_closed, avg_turnaround_hours, sla_breach_count, created_by, updated_by
) VALUES (
  '97300000-0000-0000-0000-000000000001',
  CURRENT_DATE - 1, 'daily', 1, 0, NULL, 0,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO marketing_metrics (
  id, metric_date, period, sessions, new_customers, email_sends, attributed_revenue, currency, created_by, updated_by
) VALUES (
  '97400000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2, 'daily', 120, 1, 0, 82588.20, 'INR',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO kpi_snapshots (
  id, metric_date, period, domain, metrics_json, created_by, updated_by
) VALUES (
  '97500000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2, 'daily', 'sales',
  '{"orders":1,"revenue":82588.20,"aov":82588.20}'::jsonb,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dashboard_widgets (id, code, name, widget_type, status, created_by, updated_by)
VALUES
  ('97600000-0000-0000-0000-000000000001', 'sales_today', 'Sales Today', 'kpi', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('97600000-0000-0000-0000-000000000002', 'orders_funnel', 'Orders Funnel', 'funnel', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dashboard_layouts (id, code, name, role_code, is_default, status, created_by, updated_by)
VALUES (
  '97700000-0000-0000-0000-000000000001',
  'admin_default',
  'Admin Default',
  'admin',
  TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dashboard_widget_instances (
  id, layout_id, widget_id, title, config_json, sort_order, grid_x, grid_y, grid_w, grid_h, status, created_by, updated_by
) VALUES (
  '97800000-0000-0000-0000-000000000001',
  '97700000-0000-0000-0000-000000000001',
  '97600000-0000-0000-0000-000000000001',
  'Sales Today',
  '{"metric":"sales_metrics.revenue"}'::jsonb,
  10, 0, 0, 3, 2, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO saved_reports (id, code, name, report_type, query_json, owner_id, status, created_by, updated_by)
VALUES (
  '97900000-0000-0000-0000-000000000001',
  'daily_sales',
  'Daily Sales',
  'sales',
  '{"source":"sales_metrics","period":"daily"}'::jsonb,
  '00000000-0000-0000-0000-000000000010',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO scheduled_reports (
  id, saved_report_id, cron_expression, timezone, recipients_json, next_run_at, status, created_by, updated_by
) VALUES (
  '98000000-0000-0000-0000-000000000001',
  '97900000-0000-0000-0000-000000000001',
  '0 7 * * *',
  'Asia/Kolkata',
  '["admin@electronicscart.in"]'::jsonb,
  DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '7 hours',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO api_request_logs (
  id, request_id, method, path, status_code, latency_ms, user_id, ip_address, created_at
) VALUES (
  '98100000-0000-0000-0000-000000000001',
  'req_seed_api_001',
  'GET', '/api/v1/products', 200, 42,
  '50000000-0000-0000-0000-000000000001',
  '127.0.0.1',
  NOW() - INTERVAL '1 hour'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO background_job_logs (
  id, job_name, job_id, status, attempt, started_at, finished_at, payload, created_at, updated_at
) VALUES (
  '98200000-0000-0000-0000-000000000001',
  'kpi.rollup.daily',
  'job_seed_kpi_001',
  'succeeded', 1,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours' + INTERVAL '12 seconds',
  '{"metric_date":"seed"}'::jsonb,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO webhook_logs (
  id, source, event_type, status_code, success, attempt, latency_ms, created_at
) VALUES (
  '98300000-0000-0000-0000-000000000001',
  'razorpay',
  'payment.captured',
  200, TRUE, 1, 85,
  NOW() - INTERVAL '2 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO error_logs (id, source, error_code, message, request_id, created_at)
VALUES (
  '98400000-0000-0000-0000-000000000001',
  'api',
  'SEED_SAMPLE',
  'Sample error log for monitoring dashboards',
  'req_seed_err_001',
  NOW() - INTERVAL '6 hours'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
