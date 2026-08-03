#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set +u
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  set -u
fi
PORT="${PORT:-3051}"
BASE="${HEALTH_BASE_URL:-http://127.0.0.1:${PORT}/api}"
echo "[verify] probing $BASE"
curl -fsS --max-time 10 "$BASE/health/db" >/dev/null
curl -fsS --max-time 10 "$BASE/health/redis" >/dev/null
curl -fsS --max-time 10 "$BASE/health/queues" >/dev/null || true
echo "[verify] dependency checks passed"
