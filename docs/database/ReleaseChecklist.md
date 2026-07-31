# Release Checklist — Electronics Cart Database v1.0

Before tagging **v1.0**, every item below must pass. Run locally:

```bash
cd database
docker compose up -d
export DATABASE_URL=postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart
bash scripts/verify-all.sh
```

Or rely on GitHub Actions: `.github/workflows/database-verification.yml`.

## Gates

| # | Gate | Script / command | Status |
|---|------|------------------|--------|
| 1 | Fresh install (001–045) | `verify-clean.sh` | ☐ |
| 2 | Forward upgrade | `verify-forward.sh` | ☐ |
| 3 | Rollback verification | `verify-rollback.sh` | ☐ |
| 4 | Seed validation | `verify-seed.sh` | ☐ |
| 5 | Foreign key validation | `verify-relations.sh` / `verifyForeignKeys.ts` | ☐ |
| 6 | Index validation | `verify-indexes.sh` | ☐ |
| 7 | Performance verification | `verify-performance.sh` | ☐ |
| 8 | Prisma validation | `npx prisma validate` | ☐ |
| 9 | Prisma client generation | `npx prisma generate` | ☐ |
| 10 | Schema drift detection | `verify-schema-drift.sh` | ☐ |
| 11 | Backup and restore test | `verify-backup.sh` | ☐ |
| 12 | Transaction safety | `verify-transactions.sh` | ☐ |
| 13 | Production dry run | `verify-production.sh` | ☐ |
| 14 | CI/CD verification | GitHub Actions green | ☐ |

`verify-all.sh` runs items 1–13 in sequence and writes `DATABASE_VERIFICATION_SUMMARY.md`.

## Platform stamp

```
Enterprise Electronics Cart Platform

Database Version : v1.0
Migration Files  : 001–045
Deployment Model : SQL-first
ORM              : Prisma
Database         : PostgreSQL 16+

Architecture            COMPLETE
Migration Framework     APPROVED
Verification Framework  APPROVED
CI/CD                   READY
Production Validation   READY
Schema Status           LOCKED

READY FOR BACKEND IMPLEMENTATION
```

## Rules after lock

- Do **not** edit locked `database/sql/001`–`045` in place.
- Do **not** change `schema.prisma` without a new numbered SQL migration and drift gate green.
- Additive future work uses `046+` only after a new phase approval.
