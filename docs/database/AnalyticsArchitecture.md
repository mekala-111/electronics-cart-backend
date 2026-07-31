# Analytics Architecture — Electronics Cart

Phase 9 separates **event streams**, **domain aggregates**, **dashboards/reports**, and **ops monitoring**.

## Layers

| Layer | Tables | Nature |
|-------|--------|--------|
| Audit / activity | `audit_logs`, `activity_logs`, `system_events` | Append-only / immutable |
| Behavioral | `user_events`, page/screen views, sessions | High-volume events |
| Funnel / search | search logs/clicks, conversions, cart abandonment, product views | Event + daily rollups |
| Domain KPIs | sales/inventory/payment/shipping/service/marketing metrics | Daily/weekly/monthly |
| Channel stats | campaign_performance, email/push/sms statistics | Campaign-scoped |
| Snapshots | `kpi_snapshots` | Cross-domain JSON packs |
| BI UI | dashboard widgets/layouts/instances | Role layouts |
| Reporting | saved/scheduled reports, exports | CSV/PDF/XLSX metadata |
| Monitoring | error/api/job/webhook logs | Ops observability |
| Warehouse / ETL *(optional)* | `data_marts`, `etl_jobs`, `warehouse_exports` | Future Snowflake/BigQuery/Redshift |
| Real-time *(optional)* | `metric_streams`, `live_metrics` | Live dashboards / flash sales |
| Alerting *(optional)* | `alert_rules`, `alert_notifications`, `alert_history` | SLA / ops alerts |
| Experiments *(optional)* | `experiment_metrics` | A/B + conversion join |
| LTV / cohorts *(optional)* | `customer_ltv`, `cohort_analysis` | Retention marketing |
| Fraud analytics *(optional)* | `fraud_metrics`, `fraud_alerts` | Builds on order risk scores |
| Retention / archive *(optional)* | `retention_policies`, `archive_jobs` | Governance / compliance |

## Domain audit vs global audit

Phase 5 `payment_audit_logs` and Phase 7 `service_audit_logs` stay domain-specific. Global `audit_logs` covers cross-cutting entity mutations (orders, catalog, CMS, etc.).

## Rollup jobs

Background job `kpi.rollup.daily` (see `background_job_logs`) should populate `*_metrics` and `kpi_snapshots` from orders, payments, inventory, shipping, service, and marketing events.

## Optional pre-lock extensions (`043`–`045`)

These tables do not change core event/KPI architecture. They reserve schema for later BI, streaming, and governance without requiring a Phase 10 module.

| Area | Purpose | Key FKs |
|------|---------|---------|
| Warehouse | Catalog marts, schedule ETL, track export artifacts | → `media_files` for export blobs |
| Live metrics | Named streams + append-only point samples | stream → samples |
| Alerts | Threshold rules, channel targets, append-only history | → `users` on ack |
| Experiments | Daily variant metrics | → Phase 8 `ab_tests` / `ab_test_variants` |
| LTV / cohorts | Per-customer LTV + cohort period aggregates | → `users` |
| Fraud | Aggregates + actionable alerts | → orders, payments, `order_risk_scores` |
| Retention | Policy windows + archive job runs | policy → jobs |
