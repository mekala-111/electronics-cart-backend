#!/usr/bin/env bash
set -euo pipefail
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")" && pwd)/postgres}"
mkdir -p "$DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$DIR/electronics_cart_$STAMP.sql.gz"
: "${DATABASE_URL:?DATABASE_URL required}"
echo "[backup] dumping to $FILE"
pg_dump "$DATABASE_URL" | gzip -c > "$FILE"
find "$DIR" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[backup] done"
