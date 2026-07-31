# Electronics Cart — Database package

PostgreSQL 16 schema (Prisma) + SQL migrations `001`–`045` + migration verification framework.

## Verify migrations

```bash
docker compose up -d
npm install
export DATABASE_URL=postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart
bash scripts/verify-all.sh
```

See `scripts/README.md` and `../tests/database/README.md`.
