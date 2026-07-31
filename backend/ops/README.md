# Ops notes

- Cron backups: see `docs/BackupStrategy.md`
- PM2: `deployment/ecosystem.config.js`
- Queue DLQ: Redis queue `dlq`
- Mail: SMTP env + BullMQ `email` queue with retry/backoff
