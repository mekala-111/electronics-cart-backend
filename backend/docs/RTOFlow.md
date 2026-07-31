# RTO Flow

`POST /api/admin/shipping/rto` with `forwardShipmentId`:

1. Create `rto_shipments` (`initiated`)
2. Transition forward shipment → `returned` (when legal)
3. Emit `shipment.rto` + `shipment.returned`

Further RTO steps use `rtoStateMachine`: initiated → in_transit → received → closed.
