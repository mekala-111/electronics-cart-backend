# Shipment Flow

1. `POST /api/shipping/shipments` (or admin) — create `shipments` + packages (+ AWB if carrier returns)
2. `POST /api/admin/shipping/labels` — label URL; status → **packed**
3. `POST /api/admin/shipping/pickups` — pickup request; status → **dispatched**
4. Tracking sync / webhooks → in_transit → out_for_delivery → delivered
5. Failures → delivery_failed / returned / RTO

Locks on create, label, pickup, status, tracking.
