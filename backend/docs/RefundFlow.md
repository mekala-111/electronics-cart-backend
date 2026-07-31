# Refund Flow

1. Lock `payments:refund:{paymentId}`
2. Require status `captured` | `partially_refunded`
3. Validate amount ≤ remaining (`amount - refunded_amount`)
4. Insert `refunds` (+ optional `refund_items`)
5. Gateway `refund()` via provider
6. Ledger `payment_transactions` (`tx_type=refund`)
7. Update `refunded_amount` + status `refunded` | `partially_refunded`
8. Events + audit; enqueue retry job on gateway failure

Supports full, partial, and multiple sequential refunds.
