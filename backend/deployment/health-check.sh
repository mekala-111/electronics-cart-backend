#!/usr/bin/env bash
set -euo pipefail
BASE="${HEALTH_BASE_URL:-http://127.0.0.1:3000/api}"
for path in /health/live /health/ready; do
  echo "[health] GET $BASE$path"
  curl -fsS --max-time 10 "$BASE$path" >/dev/null
done
echo "[health] ok"
