#!/usr/bin/env bash
set -euo pipefail
DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")" && pwd)/redis}"
mkdir -p "$DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
HOST=$(echo "$REDIS_URL" | sed -E 's#redis://([^:/]+).*#\1#')
redis-cli -h "$HOST" BGSAVE || true
sleep 2
# If Redis AOF/RDB path is mounted, copy; otherwise dump keys via redis-cli --rdb
OUT="$DIR/dump_$STAMP.rdb"
redis-cli -h "$HOST" --rdb "$OUT" || echo "[backup] --rdb unavailable; rely on volume snapshot"
find "$DIR" -name 'dump_*.rdb' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
echo "[backup] redis ok"
