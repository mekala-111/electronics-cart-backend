# Performance Tuning

## Node
- `--max-old-space-size=1024` (PM2 / Docker)
- Compression middleware threshold 1KB
- Keep-alive via Nginx upstream

## Prisma
- `connection_limit` / `pool_timeout` appended via `database.config`
- Tune `PRISMA_CONNECTION_LIMIT` per instance count (avoid exhausting Postgres)

## Redis
- `maxmemory` + `allkeys-lru`
- AOF `everysec`
- Cache TTL validation in `CacheService`

## Postgres (ops recommendations — no schema changes)
- Nightly `VACUUM (ANALYZE)` on hot tables
- Verify indexes exist from locked migrations
- Connection pool ≈ `(api_instances * prisma_connection_limit) < max_connections`

## BullMQ
- Default attempts/backoff from env
- DLQ after max attempts (`BaseWorker`)
- Graceful `worker.close()` on shutdown
