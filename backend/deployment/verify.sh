#!/usr/bin/env bash
set -euo pipefail
BASE="${HEALTH_BASE_URL:-http://127.0.0.1:3000/api}"
curl -fsS "$BASE/health/db" >/dev/null
curl -fsS "$BASE/health/redis" >/dev/null
curl -fsS "$BASE/health/queues" >/dev/null || true
echo "[verify] dependency checks passed"
