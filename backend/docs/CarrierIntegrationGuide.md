# Carrier Integration Guide

1. Set `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` / `SHIPROCKET_WEBHOOK_SECRET`
2. Set `SHIPPING_MOCK=false` for live calls
3. Ensure seed partner `shiprocket` (`70000000-0000-0000-0000-000000000001`) is active
4. Point Shiprocket webhook to `POST /api/shipping/webhooks/shiprocket`
5. New carriers: implement `ShippingProvider`, bind `SHIPPING_PROVIDER`

Never log passwords, tokens, or webhook secrets.
