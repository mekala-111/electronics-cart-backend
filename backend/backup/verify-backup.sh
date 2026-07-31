#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ok=0
latest_pg=$(ls -1t "$DIR/postgres"/*.sql.gz 2>/dev/null | head -1 || true)
if [[ -n "$latest_pg" && -s "$latest_pg" ]]; then
  gzip -t "$latest_pg" && echo "[verify] postgres archive ok: $latest_pg" && ok=1
fi
[[ $ok -eq 1 ]] || { echo "[verify] no valid postgres backup"; exit 1; }
