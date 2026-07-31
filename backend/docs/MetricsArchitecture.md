# Metrics & Telemetry Architecture

```mermaid
flowchart TB
  App[AppModule] --> MM[MetricsModule global]
  MM --> MS[MetricsService]
  MM --> BUF[BufferedExporter]
  MM --> EP[DefaultEventPublisherExporter]
  Domains[Orders Payments Shipping ...] -->|inject| MS
  MS --> CTX[TransactionContext merge]
  MS --> SAN[sanitize metadata]
```

## Best practices

- Prefer counters/timings over huge metadata blobs  
- Use funnel fields for step tracking; leave conversion to Analytics  
- Call `flush()` on worker shutdown if buffering  
- Never put JWTs/passwords in tags or metadata  

See [MetricsFramework.md](./MetricsFramework.md), [ExporterArchitecture.md](./ExporterArchitecture.md).
