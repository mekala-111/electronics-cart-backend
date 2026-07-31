# Operations Runbook

## Symptoms → actions

| Symptom | Check | Action |
| --- | --- | --- |
| 502 from Nginx | `curl :3000/api/health/live` | `pm2 status`; restart API |
| Ready failing | `/api/health/ready` | Postgres/Redis connectivity |
| Queue lag | `/api/health/queues`, Redis | Scale worker; inspect DLQ |
| Auth spikes 429 | Nginx/auth zones | Expected under abuse; review logs |
| Disk full | `df -h` | Rotate logs; prune backups |

## Deploy
`./deployment/deploy.sh`

## On-call
Correlate using `x-correlation-id` / Pino JSON fields.
