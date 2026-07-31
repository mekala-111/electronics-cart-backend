# Database verification framework

Production-ready checks for locked Electronics Cart migrations (`database/sql/001`–`045`).

## Commands

| Script | Purpose |
|--------|---------|
| `scripts/verify-all.sh` | Full suite + summary |
| `scripts/verify-clean.sh` | Reset + 001→045 + Prisma |
| `scripts/verify-forward.sh` | 001→020 then 021→045 |
| `scripts/verify-rollback.sh` | Checkpoint rollbacks |
| `scripts/verify-seed.sh` | Seed anchors |
| `scripts/verify-enums.sh` | Enum catalog |
| `scripts/verify-indexes.sh` | Indexes / constraints |
| `scripts/verify-relations.sh` | FKs + relation graph |
| `scripts/verify-performance.sh` | EXPLAIN ANALYZE |
| `scripts/verify-transactions.sh` | Interrupt + resume |
| `scripts/verify-production.sh` | Destructive DDL scan + dry deploy |
| `scripts/verify-schema-drift.sh` | Prisma ↔ DB drift + catalog gate |
| `scripts/verify-backup.sh` | pg_dump → restore → checksum |
| `scripts/deploy-migrations.sh` | Apply SQL + `_prisma_migrations` ledger |

TypeScript verifiers live under `scripts/ts/`. SQL probes under `scripts/sql/`.

Release gates: `docs/database/ReleaseChecklist.md`.

## CI

`.github/workflows/database-verification.yml` runs the suite on Postgres 16 and uploads report artifacts.

## Constraint

**No schema changes.** Verification only.
