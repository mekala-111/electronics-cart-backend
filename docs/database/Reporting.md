# Reporting — Electronics Cart

## Saved reports

`saved_reports`: named report definitions (`report_type` + `query_json`) owned by a user.

## Scheduling

`scheduled_reports`: cron + timezone + recipients → next/last run. On fire, create `report_exports`.

## Exports

`report_exports`:

- `export_format`: csv | pdf | xlsx
- `export_status`: queued → processing → completed | failed
- Optional `media_file_id` for stored artifact

## Dashboards

1. Catalog widgets in `dashboard_widgets`
2. Role layouts in `dashboard_layouts` (`role_code`, `is_default`)
3. Placed instances in `dashboard_widget_instances` (grid + `config_json`)
