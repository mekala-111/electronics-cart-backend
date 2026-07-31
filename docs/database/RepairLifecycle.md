# Repair Lifecycle — Electronics Cart

## Repair job

`repair_jobs` tracks:

- `technician_id`
- `labor_cost` / `repair_minutes`
- `outcome` (`pending` → `repaired` | `irreparable` | `replaced` | `customer_declined`)
- `repair_notes`

## Spare parts

| Table | Role |
|-------|------|
| `repair_parts` | Part catalog (SKU); optional `variant_id` / `warehouse_id` |
| `repair_part_usage` | Consumption on a job |

Every usage may link:

- `inventory_id` — stock row
- `warehouse_id` — source warehouse
- `serial_number_id` — serialized spare (optional)
- `warranty_claim_id` — warranty-covered part

App decrements inventory / posts `inventory_movements` (Phase 3) on issue.

## Procurement

`spare_part_suppliers` (optional link to Phase 3 `suppliers`) + `supplier_part_catalog` (supplier SKU, unit_cost, MOQ, lead time → `repair_parts`).

## Documents & audit

`service_documents` for ticket/claim files; `service_audit_logs` for actions (`repair_job_opened`, part issued, outcome set).
