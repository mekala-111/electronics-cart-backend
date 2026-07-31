# Shipping State Machine

Uses shared `shipmentStateMachine` + `StateMachineEngine` only.

```
created → packed → dispatched → in_transit → out_for_delivery → delivered
                ↘ cancelled
dispatched/in_transit → lost|damaged|returned|delivery_failed
delivery_failed → out_for_delivery|returned|cancelled
```

Also: `reverseShipmentStateMachine`, `rtoStateMachine` in the shipping module.
