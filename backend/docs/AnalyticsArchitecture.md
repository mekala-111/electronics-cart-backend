# Analytics Architecture

Analytics & Reporting consumes the locked Prisma analytics tables and the shared Metrics Framework. It does **not** introduce a second telemetry stack, Prometheus, or OpenTelemetry.

## Module

`backend/src/modules/analytics/`

## Data sources (locked schema)

| Concern | Tables |
| --- | --- |
| Live stream | `metric_streams`, `live_metrics` |
| Domain daily | `sales_metrics`, `payment_metrics`, `inventory_metrics`, `shipping_metrics`, `service_metrics`, `marketing_metrics` |
| KPI history | `kpi_snapshots` (definitions live in `metrics_json`) |
| Funnels | `conversion_events` |
| LTV / cohorts | `customer_ltv`, `cohort_analysis` |
| RFM | computed from `orders` |
| Dashboards | `dashboard_layouts`, `dashboard_widgets`, `dashboard_widget_instances` |
| Reports | `saved_reports`, `scheduled_reports`, `report_exports` |
| Alerts | `alert_rules`, `alert_history` (+ RuleEngine) |
| Audit | `audit_logs`, `activity_logs`, `system_events` |

## Integrations

- **Metrics Framework** — subscribe to `metrics.emitted` / `telemetry.emitted`; implement `LIVE_METRIC_WRITER`
- **RuleEngine** — AlertRule + KPI thresholds only
- **LockService** — dashboard refresh, KPI refresh, exports
- **BullMQ** queue `analytics`
- **Redis** — dashboard / KPI / funnel / trend caches
- **EventPublisher** — `analytics.*` domain events
- **TransactionContext** — propagated on queue jobs via `__tx`

## Permissions

`analytics.read`, `analytics.write`, `report.read`, `report.write` (bootstrapped for admin roles).
