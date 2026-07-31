# Workflow / Saga Coordinator

Location: `backend/src/shared/workflow/`

Lightweight orchestration for multi-step commerce flows. Keeps domain services decoupled: Inventory does not call Payments; Orders (future) drives the saga.

## Components

| Type | Role |
| --- | --- |
| `SagaCoordinator` | Run steps, retry, timeout, compensate |
| `WorkflowStore` | In-memory instance tracking |
| `WorkflowDefinition` / `WorkflowStep` | Declarative step graph |
| `orderPlacementDefinition` | Template: reserve → pay → confirm |

## Behaviour

1. Execute steps in order; each may patch `context`
2. On step failure after retries → mark failed → run `compensate` on completed steps **in reverse**
3. Workflow or per-step `timeoutMs` aborts the step
4. Retry: `maxAttempts`, `delayMs`, `backoffFactor`

State is **process-local** today. Persistent `workflow_runs` can land in a future DB version without changing definition APIs.

## Usage (Orders will wire this)

```ts
const result = await this.sagas.run(
  orderPlacementDefinition({
    reserveInventory: (ctx) => this.inventory.reserve(...),
    releaseInventory: (ctx) => this.inventory.releaseReservation(ctx.reservationId!),
    initiatePayment: (ctx) => this.payments.charge(...),
    voidPayment: (ctx) => this.payments.void(ctx.paymentId!),
    confirmOrder: (ctx) => this.orders.confirm(...),
    cancelOrder: (ctx) => this.orders.cancel(ctx.orderId!),
  }),
  { userId, warehouseId, amount },
);

if (result.status !== 'completed') {
  // inspect result.error / result.steps
}
```

## Rules

- Put orchestration here, not inside Inventory/Catalog services
- Compensation must be idempotent where possible
- Do not invent DB tables for workflow state while schema is locked
