# Tracking Flow

- `ShipmentTracking` — current snapshot
- `TrackingEvent` — append-only history (also serves as audit stream)
- `ShipmentEtaHistory` — ETA changes
- `DeliveryAttempt` — failed OFD attempts (via status / webhook sync)

`GET /api/shipping/shipments/:id/tracking`  
Admin: `POST /api/admin/shipping/shipments/:id/sync-tracking`  
Worker job: `shipping.tracking.sync`
