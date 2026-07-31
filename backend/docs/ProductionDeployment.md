# Production Deployment

Target: Ubuntu VPS + Nginx + PM2 (or Docker Compose prod).

## Quick path (PM2)

1. Install Node 22, pnpm, Postgres 16, Redis 7, Nginx, PM2.
2. Apply locked DB migrations 001–045.
3. Copy `.env.example` → `.env` and set production secrets.
4. `pnpm install && pnpm run build`
5. `pm2 start deployment/ecosystem.config.js --env production`
6. Point Nginx to `nginx/conf.d/api.conf` (+ TLS certs).
7. `./deployment/health-check.sh`

## Docker path

```bash
docker compose -f backend/docker/docker-compose.prod.yml --env-file backend/.env up -d --build
```

API listens on `127.0.0.1:3000`; Nginx terminates TLS.

## Process roles

| Role | Env | Purpose |
| --- | --- | --- |
| API | `PROCESS_ROLE=api` `DISABLE_WORKERS=true` | HTTP only (PM2 cluster) |
| Worker | `PROCESS_ROLE=worker` | BullMQ consumers, no HTTP |

## Scripts

`deployment/pre-deploy.sh` → `deploy.sh` → `post-deploy.sh`  
`restart.sh` (reload), `rollback.sh`, `health-check.sh`, `verify.sh`
