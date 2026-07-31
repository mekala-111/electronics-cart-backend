# Dashboard Guide

`GET /analytics/dashboard?code=`

Codes: `executive`, `sales`, `revenue`, `orders`, `payments`, `inventory`, `shipping`, `warranty`, `service`, `marketing`, `search`, `recommendation`, `system`.

Widgets aggregate locked domain metric tables + recent `live_metrics`. Layout overrides come from `dashboard_layouts` / `dashboard_widget_instances`.

Admin:

- `PATCH /admin/analytics/dashboard` — configure layout/widgets
- `POST /admin/analytics/dashboard/refresh` — lock + invalidate cache + rebuild
