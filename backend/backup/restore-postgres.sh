#!/usr/bin/env bash
set -euo pipefail
FILE="${1:?usage: restore-postgres.sh <dump.sql.gz>}"
: "${DATABASE_URL:?DATABASE_URL required}"
echo "[restore] WARNING: overwrites database from $FILE"
gunzip -c "$FILE" | psql "$DATABASE_URL"
echo "[restore] complete"
