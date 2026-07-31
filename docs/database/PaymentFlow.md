# Payment Flow — Electronics Cart

Phase 5 payment lifecycle. Primary gateway: **Razorpay**. Orders remain source of truth for amounts.

## Partial payments

An order may have **multiple** `payments` rows (UPI + store credit, gift card + card, failed then retry as new payment, etc.).

Order is paid when `SUM(captured amounts − refunded)` ≥ `orders.grand_total` (app rule).

## Status machine

```
pending → authorized → captured
       ↘ failed | cancelled | expired
captured → partially_refunded → refunded
captured → chargeback
```

Every transition appends `payment_audit_logs` and usually a `payment_transactions` row.

## Happy path (Razorpay)

1. Create `payments` (`pending`) + `payment_attempts` #1
2. Create Razorpay Order → store `gateway_order_id`
3. Customer pays → attempt completes
4. Verify signature → `authorized` / `captured`
5. Persist `gateway_payment_id`, `gateway_signature`
6. Insert transactions (`authorize`, `capture`)
7. Confirm order (`orders.status = confirmed`) — app

## Retries

Each retry = new `payment_attempts` row (`attempt_number++`) on the same `payments` row, or a new `payments` row if the prior payment is terminal (`failed` / `expired`).

## Store credit / gift card

- Create `payments` with method `store_credit` / `gift_card` (gateway `internal`)
- Insert `wallet_redemptions` / `gift_card_redemptions`
- Debit wallet / gift card balances (Phase 4 tables)
- Mark payment `captured` immediately (no gateway)

## Saved instruments

`saved_payment_methods` stores **gateway tokens only** (never PAN/CVV). Display fields: `brand`, `last_four`, expiry. One default per customer (partial unique).

## Settlement batches

Finance reconciles via `settlement_batches` → many `payment_settlements` → `payment_reconciliation` lines.

## Payment events vs audit logs

- `payment_events` — replayable gateway/domain events (`event` + `payload`)
- `payment_audit_logs` — human/system status transitions

## Merchant accounts

`merchant_accounts.vendor_id` → `users` (vendor) until a Vendor master lands in marketplace phase.

## FX

`exchange_rates` for future multi-currency checkout (pair + `effective_date`).
