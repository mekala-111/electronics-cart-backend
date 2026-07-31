# Refund Flow — Electronics Cart

## Types

| `refund_type` | Meaning |
|---------------|---------|
| `full` | Entire remaining capturable amount |
| `partial` | Subset; may repeat until fully refunded |

## Status

```
requested → approved → processing → processed
         ↘ rejected
processing → failed
```

## Steps

1. Create `refunds` (+ optional `refund_items` for line allocation)
2. Ops `approved` (or auto-approve under threshold)
3. Call gateway refund API → store `gateway_refund_id` / `gateway_reference`
4. On success: `processed`; bump `payments.refunded_amount`
5. Set payment `partially_refunded` or `refunded`
6. Insert `payment_transactions` (`refund`)
7. If linked to RMA: set `return_id`; inventory restock via Phase 3 `return_to_stock`

## Wallet / gift card refunds

Prefer credit back to `wallets` / `store_credits` / `gift_cards` instead of gateway when original tender was internal. Still create a `refunds` row for audit with `gateway_reference` null and reason_code `wallet_credit` / `gift_card_credit`.
