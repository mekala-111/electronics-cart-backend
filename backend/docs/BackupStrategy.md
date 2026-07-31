# Backup Strategy

Scripts in `backend/backup/`.

| Script | Target |
| --- | --- |
| `backup-postgres.sh` | `pg_dump` gzip |
| `backup-redis.sh` | RDB via redis-cli |
| `backup-uploads.sh` | Local storage tarball |
| `backup-env.sh` | Encrypted `.env` via `age` |
| `run-all.sh` | Nightly suite |
| `verify-backup.sh` | Integrity check |

Retention: `BACKUP_RETENTION_DAYS` (default 14).

Cron example:

```
15 2 * * * cd /opt/electronics-cart/backend && ./backup/run-all.sh >> /var/log/ec-backup.log 2>&1
```

No schema migrations in backup path — restore onto same locked schema version.
