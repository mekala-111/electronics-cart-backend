# Electronics Cart — Backend

NestJS 11 enterprise API for Electronics Cart. Database v1.0 is **locked** in `../database` — this package does not create Prisma migrations.

## Quick start

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm prisma:generate
# optional infra:
docker compose up -d postgres redis mailhog
pnpm start:dev
```

Production template: `.env.production.example`  
Ops docs: `docs/` (ProductionFixes, DeploymentSafety, MigrationSafety, …)

Swagger: http://localhost:3051/docs (disabled in production by default)  
Health: http://localhost:3051/api/health

## Process roles

- `PROCESS_ROLE=api` — HTTP API (workers disabled when `DISABLE_WORKERS=true`)
- `PROCESS_ROLE=worker` — BullMQ consumers only

## Deploy

```bash
export NODE_ENV=production
# …set secrets from .env.production.example…
pnpm run deploy   # pre-deploy (migrate+build) → PM2 → health
```
