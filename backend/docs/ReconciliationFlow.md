# Reconciliation Flow

Admin `POST /api/admin/payments/reconciliation`:

- Computes `variance_amount = expected - received`
- Status: `matched` | `variance` | `missing_gateway` | `missing_internal`
- Optional link to `settlement_id` / `payment_id`
- Failed transaction report: `GET /api/admin/payments/reports/failed`
