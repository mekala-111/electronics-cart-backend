# Repair Workflow

1. Admin creates job: `POST /api/admin/service/jobs` → status case `open`, event `repair.started`
2. Assign technician (CaseManager.assign) → `assigned`
3. Progress via `PATCH /api/admin/service/jobs/:id` using support graph:
   `in_progress` / `on_hold` / `resolved` / `closed`
4. Diagnostics: `POST /api/admin/service/diagnostics` (may move ticket → `diagnosis`)
5. Spare parts: `POST /api/admin/service/spare-parts` → `repair_part_usage` + Inventory reserve
6. Complete → event `repair.completed`

Labor: `RepairJob.labor_cost` / `repair_minutes`. Parts: `RepairPartUsage`. Logs: `service_audit_logs`.
