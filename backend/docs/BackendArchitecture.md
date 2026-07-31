# Backend Architecture — Electronics Cart

NestJS 11 foundation for the Electronics Cart platform. Database **v1.0 is locked** (`database/sql/001`–`045` + `database/schema.prisma`). This package does **not** own migrations.

## Stack

| Concern | Choice |
|---------|--------|
| Framework | NestJS 11 |
| Language | TypeScript |
| ORM | Prisma (schema path `../database/schema.prisma`) |
| Auth foundation | JWT guards (no login yet) |
| Cache / Queue | Redis + BullMQ |
| Idempotency / Locks | Redis (`Idempotency-Key`, `LockService`) — see [IdempotencyAndLocks.md](./IdempotencyAndLocks.md) |
| Domain events | In-process `EventBus` — see [DomainEventBus.md](./DomainEventBus.md) |
| Workflow / Saga | In-memory `SagaCoordinator` — see [WorkflowSaga.md](./WorkflowSaga.md) |
| Transaction context | ALS correlation — see [TransactionContext.md](./TransactionContext.md) |
| State machine | Lifecycle transitions — see [DeliveryStateMachine.md](./DeliveryStateMachine.md) |
| Case management | Service cases / SLA — see [CaseManagement.md](./CaseManagement.md) |
| Storage | Local + S3-compatible |
| Mail | Nodemailer |
| Realtime | Socket.IO |
| Logs | Pino |
| Docs | Swagger |
| Package manager | pnpm |

## Boot

```bash
cd backend
cp .env.example .env
pnpm install   # or npm install
pnpm prisma:generate
docker compose up -d postgres redis   # from backend/
pnpm start:dev
```

- API: `http://localhost:3051/api`
- Health: `http://localhost:3051/api/health`
- Swagger: `http://localhost:3051/docs`

## Layering

```
controllers → services → repositories → Prisma
                 ↓
            events / queues / cache / storage / mail
```

Cross-cutting: guards, filters, interceptors, pipes, middleware.

## Shared modules

`DatabaseModule` (Prisma), `CacheModule`, `QueueModule`, `StorageModule`, `MailModule`, `LoggerModule`, `AuthModule` (JWT only), `HealthModule`, `SocketsModule`.

## Domain modules (implemented)

Auth, Catalog, Inventory, Orders, Payments, **Shipping** — see [ShippingArchitecture.md](./ShippingArchitecture.md).

## Next phases (not started)

Warranty, Marketing, Analytics.
