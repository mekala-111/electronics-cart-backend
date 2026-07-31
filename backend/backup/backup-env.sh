#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")" && pwd)/env}"
mkdir -p "$DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
# Store encrypted if AGE_RECIPIENT set; else refuse plaintext in prod
if [[ -f "$ROOT/.env" ]]; then
  if command -v age >/dev/null && [[ -n "${AGE_RECIPIENT:-}" ]]; then
    age -r "$AGE_RECIPIENT" -o "$DIR/env_$STAMP.age" "$ROOT/.env"
  else
    echo "[backup] skipping plaintext .env (set AGE_RECIPIENT for encrypted backup)"
  fi
fi
echo "[backup] env step done"
