# Deployment Report — RecordStatus / Prisma Enum Naming Fix

**Date:** 2026-08-01  
**Severity:** Production blocker (bootstrap failures)  
**Status:** Fixed

## Root cause

PostgreSQL (via `database/sql/001_initial.sql`) creates the enum as:

```sql
CREATE TYPE record_status AS ENUM (...);
```

Prisma declared:

```prisma
enum RecordStatus { ... }  // no @@map
```

Without `@@map`, Prisma Client emits SQL against type `"RecordStatus"` (PascalCase). That type never existed in the database.  
`expected_enums.txt` and live `pg_type` correctly list **`record_status`**.

This is **naming drift**, not a missing SQL enum. Creating `CREATE TYPE "RecordStatus"` would have duplicated the domain and broken existing columns typed as `record_status`.

## Resolution

1. **Prisma:** add `@@map("record_status")` on `RecordStatus`, and the same snake_case `@@map` on **all 79** previously unmapped enums (19 marketing/analytics enums already had maps). Client code still uses `RecordStatus.active`; only the PostgreSQL type name changes.
2. **SQL 046:** assertion-only guard (`046_record_status_enum.sql`) — requires `record_status`, rejects PascalCase `"RecordStatus"`. Does **not** create a second enum.
3. **Verification:** `verifyEnums.ts` asserts `record_status` labels and forbids PascalCase ghosts.

## Affected modules

Any service reading/writing `status RecordStatus` columns (auth bootstrap, roles, catalog, orders, payments, shipping, warranty, marketing, analytics). No TypeScript business logic changes required.

## Files changed

| File | Change |
|------|--------|
| `database/schema.prisma` | `@@map` on all enums → SQL snake_case |
| `database/sql/046_record_status_enum.sql` | **New** assertion migration |
| `database/scripts/lib/expected_migrations.txt` | Add 046 |
| `database/scripts/deploy-migrations.sh` | Default through `046` |
| `database/scripts/ts/verifyEnums.ts` | record_status + forbidden PascalCase checks |
| `database/scripts/verify-*.sh` | Apply through 046 |
| `backend/deployment/pre-deploy.sh` | Deploy through 046 |

## Migration added

`046_record_status_enum.sql` — idempotent DO block, append-only ledger compatible, no DDL that alters tables.

## Deployment impact

1. Deploy **updated Prisma schema** + regenerate client (`prisma generate`).
2. Run `npm run db:deploy` / `deploy-migrations.sh 046` (checksum-safe; skips already-applied 001–045).
3. Restart NestJS — queries use `record_status`.

Existing production DBs with only `record_status` need **no data migration**.

## Rollback impact

- Revert Prisma schema / client → symptoms return (`RecordStatus` missing).
- Dropping 046 ledger row alone is harmless (assertion only).
- Do **not** create `"RecordStatus"` as a “fix.”

## Verification results

| Check | Result |
|-------|--------|
| `prisma validate` | **PASS** |
| `prisma generate` | **PASS** |
| `verify-production` / `db:deploy` / drift | **Not run** — Docker daemon unavailable in this environment |
| Decision: no duplicate `"RecordStatus"` type | **Confirmed** — SQL already has `record_status` |

### Operator follow-up (when Postgres is up)

```bash
cd database
docker compose up -d
export DATABASE_URL=postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart
APPLY_DEMO_DATA=0 bash scripts/deploy-migrations.sh 046   # run twice → second should skip
bash scripts/verify-enums.sh
bash scripts/verify-schema-drift.sh
APPLY_DEMO_DATA=0 NODE_ENV=production bash scripts/verify-production.sh
cd ../backend && pnpm prisma:generate && pnpm run build
```
