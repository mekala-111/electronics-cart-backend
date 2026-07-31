# Settlement Flow

Admin `POST /api/admin/payments/settlements`:

1. Lock on settlement ref
2. Insert `payment_settlements`
3. Auto-mark `settled` when expected ≈ received
4. Emit `payment.settlement.completed` when settled
5. Enqueue `payment.settlement.sync`
6. Audit via related payment reconciliations
