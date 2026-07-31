# Metric Types

| Kind | API | Notes |
|---|---|---|
| Counter | `increment` | Additive |
| Gauge | `gauge` | Point-in-time |
| Timing | `timing` | Duration ms (+ histogram sample) |
| Histogram | `histogram` | In-memory samples only |
| KPI | `kpi` | Business value (revenue, discount, …) |
| Telemetry | `event` | Structured business event |

Use `record(MetricRecord)` for fully formed payloads.
