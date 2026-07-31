# Payment State Machine

DB enum `PaymentStatus` (locked):

```
pending ──► authorized ──► captured ──► partially_refunded ──► refunded
   │            │              │
   ├─► failed   ├─► cancelled  └─► chargeback
   ├─► cancelled
   └─► expired
```

API “created” maps to **`pending`** (no `created` in schema).

Transitions enforced in `validators/payment-state.validator.ts`.
