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
for path in /health/live /health/ready; do
  echo "[health] GET $BASE$path"
  curl -fsS --max-time 10 "$BASE$path" >/dev/null
done
echo "[health] ok"
