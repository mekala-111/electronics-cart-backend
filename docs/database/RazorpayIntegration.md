# Razorpay Integration — Electronics Cart

## Config

`payment_gateways` row `code = razorpay`, `is_primary = true`.  
Secrets live in app env / vault — **not** in `config_json` (use that for non-secret flags only).

## IDs we store

| Field | Razorpay | Table |
|-------|----------|--------|
| `gateway_order_id` | `order_id` | `payments` |
| `gateway_payment_id` | `payment_id` | `payments` |
| `gateway_signature` | checkout signature | `payments` |
| `gateway_reference` | usually payment id | `payments` / txs |
| Webhook `event_id` | `event` id | `payment_webhooks` |

## Checkout steps (app)

```
1. POST /orders/:id/payments  → insert payments(pending)
2. Razorpay Orders API        → gateway_order_id
3. Client Checkout.js         → user pays
4. Verify signature server-side
5. Capture (auto or manual)   → status=captured
6. Consume stock reservations
```

## Signature verification

HMAC SHA256 of `order_id|payment_id` with webhook/checkout secret. On success set `verified` on webhooks and trust capture only after verify.

## Supported methods (seed)

UPI, credit/debit card, net banking, EMI (+ `emi_plans`). BNPL / PhonePe / Cashfree / Stripe / PayPal are gateway rows ready for later activation.

## Idempotency

- Webhooks: unique `(gateway_id, idempotency_key)` when key present
- Captures: unique live `gateway_payment_id` prevents double-post
