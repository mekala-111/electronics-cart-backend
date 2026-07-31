# Reverse Logistics

`POST /api/admin/shipping/reverse` → `reverse_shipments`

Types: `customer_return` | `warranty_return` | `exchange_pickup`

Lifecycle via `reverseShipmentStateMachine` + `StateMachineEngine`:
`requested → scheduled → picked_up → in_transit → received`
