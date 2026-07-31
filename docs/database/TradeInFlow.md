# Trade-In Flow — Electronics Cart

Buyback / trade-in preparation (no payment settlement tables here — use Phase 4/5 when paying out).

## Request

`trade_in_requests`: customer device (`variant_id`, optional `serial_number_id`), `status` from `requested` → `evaluating` → `offered` → `accepted` → `completed`.

## Evaluation

`trade_in_evaluations` stores:

- `cosmetic_grade` (reuses `product_grade`)
- `battery_health` (0–100)
- `functional_test_pass` + notes
- `estimated_value` → later `approved_value`
- `evaluated_by` → `technicians`

Multiple evaluations allowed historically; latest active evaluation drives the offer.

## Device health

For deeper diagnostics, attach `device_health_reports` (CPU, battery cycles/health, display, keyboard, thermal) to the trade-in request and/or serial.
