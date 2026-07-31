# Analytics API

Base prefix: `/api` (global). JWT required. Permissions: `analytics.*` / `report.*`.

## Public (read)

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/analytics/dashboard` | analytics.read |
| GET | `/analytics/kpis` | analytics.read |
| GET | `/analytics/reports` | report.read |
| GET | `/analytics/funnels` | analytics.read |
| GET | `/analytics/trends` | analytics.read |
| GET | `/analytics/cohorts` | analytics.read |
| GET | `/analytics/ltv` | analytics.read |
| GET | `/analytics/rfm` | analytics.read |

## Admin

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/admin/analytics/reports` | create or export (`Idempotency-Key`) |
| POST | `/admin/analytics/schedules` | cron schedule |
| POST | `/admin/analytics/alerts` | RuleEngine condition |
| POST | `/admin/analytics/kpis` | upsert / refresh |
| PATCH | `/admin/analytics/dashboard` | layout config |
| POST | `/admin/analytics/dashboard/refresh` | forced refresh |
| GET | `/admin/analytics/system` | system snapshot |
| POST | `/admin/analytics/alerts/evaluate` | enqueue eval |

Swagger tags: `analytics`, `admin-analytics`.
