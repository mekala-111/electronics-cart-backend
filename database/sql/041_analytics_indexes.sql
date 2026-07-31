-- Electronics Cart — Phase 9 Analytics indexes
-- File: 041_analytics_indexes.sql

BEGIN;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by
  ON audit_logs (performed_by, created_at DESC) WHERE performed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id
  ON audit_logs (request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON activity_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_event_type
  ON system_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at
  ON system_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id
  ON user_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_events_event_type
  ON user_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at
  ON user_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_user_id
  ON page_views (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_session_id
  ON page_views (session_id, created_at) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_created_at
  ON page_views (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_screen_views_user_id
  ON screen_views (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_screen_views_created_at
  ON screen_views (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_analytics_session_active
  ON session_analytics (session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id
  ON session_analytics (user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_search_logs_keyword
  ON search_logs (keyword, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id
  ON search_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_logs_zero_result
  ON search_logs (created_at DESC) WHERE is_zero_result = TRUE;
CREATE INDEX IF NOT EXISTS idx_search_clicks_search_log_id
  ON search_clicks (search_log_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id
  ON conversion_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversion_events_order_id
  ON conversion_events (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversion_events_funnel_step
  ON conversion_events (funnel_step, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cart_abandonment_events_user_id
  ON cart_abandonment_events (user_id, abandoned_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_events_cart_id
  ON cart_abandonment_events (cart_id) WHERE cart_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_analytics_date_product_active
  ON wishlist_analytics (metric_date, product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wishlist_analytics_metric_date
  ON wishlist_analytics (metric_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_views_product_id
  ON product_views (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id
  ON product_views (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_views_created_at
  ON product_views (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_performance_date_product_active
  ON product_performance (metric_date, product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_performance_metric_date
  ON product_performance (metric_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_metrics_date_period_active
  ON sales_metrics (metric_date, period) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_metrics_metric_date
  ON sales_metrics (metric_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_metrics_date_period_wh_active
  ON inventory_metrics (metric_date, period, warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_metrics_metric_date
  ON inventory_metrics (metric_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_metrics_date_period_active
  ON payment_metrics (metric_date, period) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_metrics_date_period_active
  ON shipping_metrics (metric_date, period) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_metrics_date_period_active
  ON service_metrics (metric_date, period) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_metrics_date_period_active
  ON marketing_metrics (metric_date, period) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_performance_date_key_active
  ON campaign_performance (metric_date, campaign_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_performance_metric_date
  ON campaign_performance (metric_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_statistics_date_campaign_active
  ON email_statistics (metric_date, campaign_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_statistics_date_campaign_active
  ON push_statistics (metric_date, campaign_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_statistics_date_campaign_active
  ON sms_statistics (metric_date, campaign_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kpi_snapshots_date_period_domain_active
  ON kpi_snapshots (metric_date, period, domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_metric_date
  ON kpi_snapshots (metric_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_widgets_code_active
  ON dashboard_widgets (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_layouts_code_active
  ON dashboard_layouts (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dashboard_widget_instances_layout_id
  ON dashboard_widget_instances (layout_id, sort_order) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_reports_code_active
  ON saved_reports (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_reports_report_type
  ON saved_reports (report_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run
  ON scheduled_reports (next_run_at) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_report_exports_status
  ON report_exports (export_status, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs (source, created_at DESC) WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_path ON api_request_logs (path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status_code ON api_request_logs (status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_id
  ON api_request_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_background_job_logs_job_name
  ON background_job_logs (job_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_job_logs_status
  ON background_job_logs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source
  ON webhook_logs (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at
  ON webhook_logs (created_at DESC);

COMMIT;
