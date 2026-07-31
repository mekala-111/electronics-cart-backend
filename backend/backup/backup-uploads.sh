#!/usr/bin/env bash
set -euo pipefail
SRC="${STORAGE_LOCAL_PATH:-./storage}"
DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")" && pwd)/uploads}"
mkdir -p "$DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
tar -czf "$DIR/uploads_$STAMP.tar.gz" -C "$(dirname "$SRC")" "$(basename "$SRC")" 2>/dev/null || true
find "$DIR" -name 'uploads_*.tar.gz' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
echo "[backup] uploads ok"
