# Reporting Architecture

Saved reports (`saved_reports`) store `report_type` + optional `query_json`. Schedules (`scheduled_reports`) attach cron + recipients. Exports (`report_exports`) are async BullMQ jobs writing files via `StorageService` and linking `media_files`.

## Formats

| Format | Behavior |
| --- | --- |
| `json` | Synchronous response (no `report_exports` row required) |
| `csv` | Async → text/csv in storage |
| `xlsx` | Async → SpreadsheetML XML (Excel-compatible, no exceljs) |
| `pdf` | Async → text report payload (mime application/pdf; no pdfkit) |

## Locks & idempotency

Export processing uses `LockService`. Admin create/generate endpoints use `@Idempotent()`.

## Events

- `analytics.report.generated`
- `analytics.export.completed`
