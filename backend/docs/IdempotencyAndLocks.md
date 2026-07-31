# Idempotency & Distributed Locks

Cross-cutting Redis utilities under `src/shared/`. No database schema changes.

## Idempotency (`Idempotency-Key`)

Use on write handlers that must survive client retries (checkout, payment initiation, etc.):

```ts
@Post('checkout')
@Idempotent() // required header by default
async checkout(@Body() dto: CheckoutDto) { ... }
```

| Behavior | Result |
| --- | --- |
| Missing key (when required) | `400 IDEMPOTENCY_KEY_REQUIRED` |
| Same key + same payload | Cached response replayed (24h TTL) |
| Same key + different payload | `409 IDEMPOTENCY_KEY_CONFLICT` |
| Same key while first request runs | `409 IDEMPOTENCY_IN_PROGRESS` |
| Handler throws | Processing marker cleared so the client can retry |

Scope is `userId:METHOD:route` (anonymous if unauthenticated). Storage is Redis only.

Demo: `POST /api/template/echo` with header `Idempotency-Key: <8–128 chars>`.

## Distributed locks (`LockService`)

```ts
await this.locks.withLock(
  LockService.resourceKey('inventory', skuId),
  async () => { /* reserve stock */ },
  { ttlMs: 10_000, waitMs: 2_000 },
);
```

- Acquire: Redis `SET NX PX` with a random token
- Release / extend: Lua compare-and-delete / `pexpire`
- Failure: `409 LOCK_NOT_ACQUIRED`

Inject `LockService` anywhere (global module). Prefer `withLock` over manual acquire/release.
