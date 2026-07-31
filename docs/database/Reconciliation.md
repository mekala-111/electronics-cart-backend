# Reconciliation — Electronics Cart

## Entities

- `settlement_batches` — finance-level payout batch
- `payment_settlements` — lines within a batch (expected vs received, fees, tax)
- `payment_reconciliation` — line-level compare of internal payment ↔ settlement

## Fields

| Field | Meaning |
|-------|---------|
| `expected_amount` | What we captured (internal) |
| `received_amount` | What gateway settled to bank |
| `variance_amount` | `received − expected` (fees often explain negative) |
| `status` | `matched` / `variance` / `missing_gateway` / `missing_internal` / `unresolved` |

## Daily job (app)

```
1. Pull Razorpay settlements for date D
2. Upsert `settlement_batches` (batch_reference + date + total)
3. Upsert `payment_settlements` linked to batch
4. For each settlement line / payment:
   - match on gateway_payment_id / gateway_reference
   - write payment_reconciliation
5. Flag variance beyond fee tolerance → unresolved for finance
```

## Fraud review

High `order_risk_scores` or `payment_disputes` (`chargeback`) pause settlement matching and require manual `payment_audit_logs` notes before marking matched.
