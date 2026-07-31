# Docker Guide

Canonical files live in `backend/docker/`.

| File | Use |
| --- | --- |
| `Dockerfile` | Production API (non-root, healthcheck, workers disabled) |
| `Dockerfile.worker` | Worker process (HTTP off) |
| `docker-compose.dev.yml` | Postgres/Redis/MinIO/Mailhog/Adminer |
| `docker-compose.prod.yml` | Full prod stack |

Build from monorepo root:

```bash
docker build -f backend/docker/Dockerfile -t ec-api:prod .
docker build -f backend/docker/Dockerfile.worker -t ec-worker:prod .
```

Legacy `backend/Dockerfile` remains for older compose; prefer `docker/` paths.
