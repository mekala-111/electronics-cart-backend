# Delivery State Machine

Shared lifecycle engine: `backend/src/shared/state-machine/`

Reusable for **shipments**, **returns**, **RMAs**, **warranty claims**, and **service tickets** (and any future entity with a status graph).

## Capabilities

| Feature | API |
|---|---|
| Validate | `canTransition` / `assertTransition` |
| Allowed targets | `allowedTargets(definition, from)` |
| Transition | `transition(definition, options)` |
| Hooks | `before`, `after`, `audit` |
| Auto audit log | Structured pino/Nest log on every success |
| Events | `state.transitioned` via `EventPublisher` |

## Flow

```
assertTransition
      │
      ▼
   before()     ← throw aborts
      │
      ▼
   apply()      ← domain persists new status
      │
      ▼
 structured audit log (always)
      │
      ▼
   audit()      ← optional durable row (history / audit_logs)
      │
      ▼
 state.transitioned event
      │
      ▼
   after()
```

## Usage (Shipping later)

```ts
await this.stateMachine.transition(shipmentStateMachine, {
  entityId: shipment.id,
  from: shipment.status,
  to: 'dispatched',
  actorId: userId,
  reason: 'Carrier pickup confirmed',
  apply: async () =>
    this.repo.updateStatus(shipment.id, 'dispatched'),
  audit: async (ctx) =>
    this.repo.appendStatusHistory(ctx),
});
```

## Bundled definitions

Aligned to locked Prisma enums:

- `shipmentStateMachine` → `ShipmentStatus`
- `returnStateMachine` → `ReturnStatus`
- `rmaStateMachine` → `RmaStatus`
- `warrantyClaimStateMachine` → `WarrantyClaimStatus`
- `serviceTicketStateMachine` → `ServiceTicketStatus`

## Notes

- Same-state transitions are no-ops when `allowSameState: true` (default on bundled defs).
- Payments still use their local validator; can migrate later without API change.
- Does **not** start the Shipping module.
