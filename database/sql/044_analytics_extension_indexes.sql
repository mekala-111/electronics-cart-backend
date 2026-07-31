-- Electronics Cart — Phase 9 Analytics extension indexes
-- File: 044_analytics_extension_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_data_marts_code_active
  ON data_marts (code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_etl_jobs_code_active
  ON etl_jobs (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_etl_jobs_status ON etl_jobs (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_etl_jobs_next_run ON etl_jobs (next_run_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_exports_etl_job_id
  ON warehouse_exports (etl_job_id) WHERE etl_job_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_exports_status
  ON warehouse_exports (status, created_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_metric_streams_code_active
  ON metric_streams (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_live_metrics_stream_time
  ON live_metrics (stream_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_metrics_key_time
  ON live_metrics (metric_key, observed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_rules_code_active
  ON alert_rules (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_notifications_rule_id
  ON alert_notifications (rule_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_history_rule_time
  ON alert_history (rule_id, triggered_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_experiment_metrics_test_variant_date_active
  ON experiment_metrics (test_id, variant_id, metric_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_experiment_metrics_metric_date
  ON experiment_metrics (metric_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_ltv_customer_date_active
  ON customer_ltv (customer_id, as_of_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_ltv_as_of_date
  ON customer_ltv (as_of_date DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cohort_analysis_key_month_offset_active
  ON cohort_analysis (cohort_key, cohort_month, period_offset) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fraud_metrics_date_period_active
  ON fraud_metrics (metric_date, period) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_order_id
  ON fraud_alerts (order_id) WHERE order_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_triggered_at
  ON fraud_alerts (triggered_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_retention_policies_code_active
  ON retention_policies (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_retention_policies_entity_type
  ON retention_policies (entity_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_archive_jobs_policy_id
  ON archive_jobs (policy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_archive_jobs_status
  ON archive_jobs (status, created_at DESC) WHERE deleted_at IS NULL;

COMMIT;
