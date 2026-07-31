# Warranty Flow — Electronics Cart

Phase 7 warranty coverage. Serial track status (`serial_numbers.warranty_status`) stays a cache; registrations/claims are source of truth.

## Plan types

| Type | Use |
|------|-----|
| `manufacturer` | OEM coverage (e.g. Apple 12M) |
| `extended` | Electronics Cart Care after OEM |
| `adp` | Accidental Damage Protection |
| `amc` | Annual Maintenance Contract |

Each `warranty_plans` row stores `coverage`, `coverage_terms`, `duration_months`, `claim_limit`, `provider_id`.

## Registration

1. Sale / delivery → create `warranty_registrations` (`registration_number`)
2. Link `order_item_id`, `serial_number_id`, `variant_id`, `customer_id`
3. Set `start_date` / `end_date` from plan duration
4. Append `warranty_status_history`; set serial `warranty_status = active`

## Extensions

`warranty_extensions` stacks additional plan coverage onto a registration (extended / ADP / AMC purchase).

## Claims

```
submitted → under_review → approved → in_service → closed
                        ↘ rejected | cancelled
```

Approved claims typically open a `service_tickets` row (+ optional `rma_requests`).

## Documents

`claim_documents` → `media_files` (photos, invoices, diagnosis attachments).
