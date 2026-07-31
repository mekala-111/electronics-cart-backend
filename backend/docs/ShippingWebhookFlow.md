# Shipping Webhook Flow

`POST /api/shipping/webhooks/shiprocket`

1. Verify HMAC (`X-Api-Hmac-Sha256` or mock)
2. Lock + idempotency key on `shipping_webhooks`
3. Persist verified payload
4. Enqueue `shipping.webhook.process`
5. Sync tracking / append `TrackingEvent`
6. Mark processed; emit `carrier.webhook.*`

Duplicates with `processed` are rejected.
