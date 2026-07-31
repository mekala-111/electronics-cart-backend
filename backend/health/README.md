# Health probes

Implemented in `src/modules/health` (not a separate runtime service):

| Path | Purpose |
| --- | --- |
| `GET /api/health` | Liveness |
| `GET /api/health/live` | Liveness |
| `GET /api/health/ready` | Readiness (DB + Redis) |
| `GET /api/health/db` | Database |
| `GET /api/health/redis` | Redis |
| `GET /api/health/storage` | Object storage |
| `GET /api/health/queues` | BullMQ |

Use `/live` for orchestrator liveness and `/ready` for load balancer readiness.
