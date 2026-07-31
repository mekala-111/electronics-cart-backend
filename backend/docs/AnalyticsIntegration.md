# Analytics Integration (Metrics)

Analytics module (future) should:

1. Subscribe to `metrics.emitted` / `telemetry.emitted`, **or**
2. Provide a `LiveMetricWriter` and register `LiveMetricExporterAdapter` into `METRICS_EXPORTER` composite.

```mermaid
sequenceDiagram
  participant Domain
  participant MetricsService
  participant Exporter
  participant Analytics

  Domain->>MetricsService: increment / event
  MetricsService->>Exporter: export (async)
  Exporter-->>Analytics: EventBus or LiveMetricWriter
  Note over Analytics: Persist LiveMetric / warehouse — not MetricsModule
```

Do **not** import Analytics into `shared/metrics`.
