# Migration Safety

## Model

- Forward-only SQL: `database/sql/001`–`045`
- Ledger: `_prisma_migrations` (checksum + name)
- Runner: `database/scripts/lib/common.sh` → `deploy-migrations.sh`

## Checksum-safe flow

1. Compute SHA-256 of file  
2. If active ledger row exists with **same** checksum → **skip**  
3. If active row exists with **different** checksum → **fail**  
4. Else apply SQL → **append** ledger row (never DELETE)

## Demo vs reference

| Class | Location | Production |
|-------|----------|------------|
| DDL / indexes | `sql/0xx_*.sql` non-seed | Always |
| Demo seeds | listed in `scripts/lib/demo_seed_files.txt` | Never (unless `--demo-data`) |
| Reference | `sql/reference/*.sql` | Always after DDL when demo off |

Enable demo: `APPLY_DEMO_DATA=1`, `--demo-data`, or `NODE_ENV=development`.

## Commands

```bash
# Production
APPLY_DEMO_DATA=0 bash database/scripts/deploy-migrations.sh

# Local / CI verification
APPLY_DEMO_DATA=1 bash database/scripts/deploy-migrations.sh --demo-data
```
