# Transaction Context & Correlation

Location: `backend/src/shared/context/`

AsyncLocalStorage-backed context that follows a commerce flow across HTTP, sagas, domain events, queues, and logs — without changing domain business logic.

## Fields

| Field | Source |
| --- | --- |
| `correlationId` | `x-correlation-id` or equals `requestId` |
| `requestId` | `x-request-id` (generated if missing) |
| `workflowId` | Set by `SagaCoordinator.run` |
| `userId` / `sessionId` | JWT via `TransactionContextInterceptor` |
| `tenantId` | `x-tenant-id` (reserved) |

## Propagation

```
HTTP middleware → ALS context
      │
Guards + TransactionContextInterceptor (user/session)
      │
SagaCoordinator → patches workflowId
      │
EventPublisher → copies snapshot into event.metadata
      │
QueueService.enqueue → attaches __tx on job payload
      │
BaseWorker → restores ALS from __tx
      │
Logs / error responses include requestId + correlationId
```

## Usage

```ts
import { TransactionContext } from '@/shared/context';

const { correlationId, workflowId } = TransactionContext.snapshot();

// detached jobs / cron
await this.tx.runDetached(async () => { ... });

// restore in a subscriber
await this.tx.runWithSnapshot(event.metadata, async () => { ... });
```

Headers returned: `x-request-id`, `x-correlation-id`.
