# Service Workflow — Electronics Cart

## Ticket status machine

```
created
  → assigned
  → diagnosis
  → waiting_for_parts
  → repair_in_progress
  → testing
  → quality_check
  → ready_for_pickup
  → delivered
  → closed
```

Any non-terminal state may → `cancelled`.

Every transition appends `ticket_status_history` and usually `service_audit_logs`.

## Happy path

1. Warranty claim approved (or walk-in) → `service_tickets`
2. Route to `service_centers` / `service_center_locations` (optional linked `warehouse_id` for parts)
3. Assign `technicians` (skills via `technician_skills`)
4. `diagnostic_reports` → coverage decision
5. `repair_jobs` + `repair_part_usage`
6. Testing / QC → ready for pickup → delivered → closed
7. Optional `service_feedback`

## Centers

- `service_centers` — authorized bench network
- `service_center_locations` — address + optional warehouse for spare stock
- `technicians.user_id` → `users` (`user_type = technician`)

## SLA

`service_sla` defines priority → response/resolution minutes. Tickets may set `service_sla_id` (seed maps P2 for the sample ticket).

## Enterprise contracts

`service_contracts` + `contract_items` + `contract_renewals` for annual support agreements covering devices/plans.

## Loaners

`loan_devices` pool + `loan_allocations` while a ticket is in repair.

## Metrics & health

- `repair_metrics` — diagnosis/repair/testing/turnaround minutes per ticket
- `device_health_reports` — CPU/battery/display/keyboard/thermal for repair or trade-in
- `technician_certifications` — provider + `expiry_date`
