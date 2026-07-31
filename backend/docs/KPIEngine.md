# KPI Engine

There is no separate `kpi_definitions` table in schema v1.0. Definitions and values are stored on `kpi_snapshots.metrics_json` with `domain` + `period` (`daily|weekly|monthly`).

## APIs

- `GET /analytics/kpis`
- `POST /admin/analytics/kpis` — upsert snapshot; optional `threshold` evaluated by **RuleEngine**
- `POST /admin/analytics/kpis?refresh=true` — recompute from domain metric tables under lock

## Refresh job

BullMQ `analytics.kpi.refresh` / `analytics.snapshot`.
