# Tracking Flow — Electronics Cart

## Current vs history

| Table | Role |
|-------|------|
| `shipment_tracking` | One row per shipment — latest status/location |
| `tracking_events` | Append-only history (webhooks + polls) |
| `shipments.status` | Denormalized for list filters |

## Status values

`created` → `packed` → `dispatched` → `in_transit` → `out_for_delivery` → `delivered`

Terminal / exception: `delivery_failed`, `returned`, `lost`, `damaged`, `cancelled`

## Ingest

```
1. shipping_webhooks row (received)
2. Verify signature → verified
3. Map partner status → shipment_status
4. INSERT tracking_events
5. UPDATE shipment_tracking + shipments.status
6. Mark webhook processed
```

## Delivery attempts

Each OFD failure / success writes `delivery_attempts`. Prefer `failure_reason_id` → `delivery_failure_reasons` (customer not available, OTP failed, etc.). After N failures, app may open `rto_shipments`.

## ETA history

Every change to `shipments.estimated_delivery_at` appends `shipment_eta_history` (`old_eta`, `new_eta`, `reason`).

## Delivery proof

On `delivered`, create `delivery_proofs`:

- `receiver_name`
- `signature_file_id` / `photo_file_id` → `media_files`
- `otp_verified` + `otp_reference`
- `latitude` / `longitude`
- `delivered_at`
