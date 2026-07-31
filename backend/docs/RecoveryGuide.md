# Recovery Guide

## Server loss
1. Provision Ubuntu, install Node/Nginx/Redis/Postgres (or Docker).
2. Restore Postgres from latest `backup/postgres/*.sql.gz`.
3. Restore Redis RDB or accept cold cache.
4. Restore uploads / MinIO volume.
5. Decrypt `.env` (age) and place secrets.
6. `pnpm build` + `pm2 start deployment/ecosystem.config.js`.
7. `./deployment/health-check.sh`.

## Database restore
`./backup/restore-postgres.sh path/to/dump.sql.gz`

## Redis
Stop Redis, replace `dump.rdb`, start Redis. Or rebuild cache lazily.

## Workers / queues
Restart `ec-worker`. Failed jobs land in DLQ (`QUEUE_NAMES.DLQ`). Re-drive carefully.

## Rollback
`./deployment/rollback.sh <git-sha>` then health-check.
