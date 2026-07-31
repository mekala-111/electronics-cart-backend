# Scaling Guide

Vertical: increase PM2 `max_memory_restart` / Node heap (`--max-old-space-size`).

Horizontal (single VPS first):
1. PM2 cluster for API (`instances: max`) with `DISABLE_WORKERS=true`
2. Dedicated worker processes (scale `ec-worker` instances cautiously — prefer queue concurrency)
3. Redis + Postgres on dedicated instances when CPU bound
4. Nginx keepalive to upstream

Do **not** split the monolith into microservices in this phase.
