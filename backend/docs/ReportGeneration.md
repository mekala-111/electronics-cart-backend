# Report Generation

1. Create `saved_reports` via `POST /admin/analytics/reports`
2. Optionally schedule via `POST /admin/analytics/schedules`
3. Generate: same admin reports endpoint with `format` / `savedReportId`
4. Worker `analytics.export` renders rows from funnel/KPI/trends/cohort/ltv/rfm/audit resolvers
5. File stored; `report_exports.media_file_id` set; events published
