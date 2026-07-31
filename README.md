# Electronics Cart

Enterprise electronics e-commerce platform: NestJS 11 API, PostgreSQL 16 (SQL-first locked schema v1.0), Redis/BullMQ workers, storefront clients.

## Architecture

| Layer | Path | Notes |
|-------|------|--------|
| API + workers | `backend/` | NestJS modules: auth, catalog, inventory, orders, payments, shipping, warranty, marketing, analytics |
| Database | `database/` | SQL migrations `001`–`045` + Prisma datamodel (locked). Deploy via `scripts/deploy-migrations.sh` |
| Storefront | `storefront/` | Next.js storefront (separate deploy) |
| Mobile/web | `web/`, Flutter clients | Client apps |

**Database is SQL-first.** The API never runs Prisma Migrate. Schema changes require numbered SQL + drift gate.

## Quick start (local)

```bash
# Database
cd database && docker compose up -d
export DATABASE_URL=postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart
APPLY_DEMO_DATA=1 bash scripts/deploy-migrations.sh   # includes demo fixtures

# Backend
cd ../backend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm start:dev
```

Health: `http://localhost:3000/api/health`  
Swagger (dev only): `http://localhost:3000/docs`

## Production deploy order

1. Git pull  
2. `pnpm install --frozen-lockfile`  
3. Build  
4. Migrate (`APPLY_DEMO_DATA=0`) + reference seeds  
5. PM2 reload  
6. Health check  
7. Automatic rollback of app revision on failure  

See `backend/docs/DeploymentSafety.md` and `backend/deployment/deploy.sh`.

**Demo seeds never run in production.** Use `APPLY_DEMO_DATA=1` or `--demo-data` only in development.

## Documentation

- `backend/docs/ProductionFixes.md` — Phase K.1 blockers fixed  
- `backend/docs/MigrationSafety.md` — checksum-safe migrations  
- `backend/docs/DeploymentSafety.md` — deploy + backup rollback  
- `backend/docs/SecretManagement.md` — env / secrets  
- `backend/docs/GitPreparation.md` — first commit checklist  
- `backend/docs/ReleaseCandidateChecklist.md`  
- `docs/database/` — schema strategy & release gates  

## License

Proprietary — see `LICENSE`.
