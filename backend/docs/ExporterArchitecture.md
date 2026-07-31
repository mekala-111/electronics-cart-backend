# Exporter Architecture

```mermaid
flowchart LR
  MS[MetricsService] -->|buffered| BUF[BufferedExporter]
  MS -->|immediate| EXP[MetricsExporter]
  BUF -->|flush| EXP
  EXP --> EP[DefaultEventPublisherExporter]
  EXP -.->|optional| LM[LiveMetricExporterAdapter]
  LM -.->|Analytics provides| W[LiveMetricWriter]
  EP --> Bus[EventBus / Outbox]
```

## Built-ins

- `NoOpExporter`
- `BufferedExporter`
- `DefaultEventPublisherExporter`
- `CompositeExporter`
- `LiveMetricExporterAdapter` (no Prisma)

Analytics binds `LIVE_METRIC_WRITER` / adapter later — not in this module.
