# Metrics Consumption

Analytics does not call a private metrics API. It consumes the shared framework:

1. `DefaultEventPublisherExporter` emits `metrics.emitted` / `telemetry.emitted`
2. `AnalyticsMetricsIngestor` persists `live_metrics` (+ optional `conversion_events` / `system_events`)
3. `AnalyticsLiveMetricWriter` is bound to `LIVE_METRIC_WRITER` for optional adapter use

Do not add Prometheus/OTel exporters here.
