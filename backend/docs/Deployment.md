# Deployment

1. Ensure PostgreSQL has locked migrations `001`–`045` applied (see `docs/database/MigrationStrategy.md`).
2. Set production secrets: `JWT_*`, `DATABASE_URL`, `REDIS_URL`, S3, SMTP (`backend/.env.example`).
3. Prefer Phase K guides: [ProductionDeployment.md](./ProductionDeployment.md), [DockerGuide.md](./DockerGuide.md), [NginxGuide.md](./NginxGuide.md).
4. PM2: `pm2 start deployment/ecosystem.config.js --env production`
5. Or `docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build`

Health probes:

- `/api/health` · `/api/health/live` · `/api/health/ready`
- `/api/health/db` · `/api/health/redis` · `/api/health/storage` · `/api/health/queues`

CI/CD: `.github/workflows/backend-ci.yml` (lint, test, build, Docker, optional deploy).
