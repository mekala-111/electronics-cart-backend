# Webhook Flow

`POST /api/payments/webhooks/razorpay`

1. Read raw body + `X-Razorpay-Signature`
2. `PaymentProvider.verifyWebhookSignature` (HMAC SHA-256)
3. Lock on idempotency key
4. Reject if already `processed`
5. Persist `payment_webhooks` (`verified`)
6. Emit `payment.webhook.received`
7. Enqueue `payment.webhook.process` (+ inline process)
8. Map gateway status → payment row + audit
9. Mark `processed`, emit `payment.webhook.processed`

Duplicates never re-apply business effects.
