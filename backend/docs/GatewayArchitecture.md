# Gateway Architecture

```
Controllers / Services
        │
        ▼
  PaymentProvider (interface)
        │
        ▼
  RazorpayProvider
        │
   ┌────┴────┐
 mock mode   live HTTPS api.razorpay.com
```

Future providers (`StripeProvider`, `CashfreeProvider`, …) bind the same token `PAYMENT_PROVIDER`.

## Config

| Env | Purpose |
|---|---|
| `PAYMENTS_MOCK` | Force mock (default true when keys empty) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Live API |
| `RAZORPAY_WEBHOOK_SECRET` | HMAC webhook verify |

Never log key secret, CVV, PAN, or UPI PIN.
