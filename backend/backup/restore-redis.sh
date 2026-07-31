#!/usr/bin/env bash
set -euo pipefail
FILE="${1:?usage: restore-redis.sh <dump.rdb>}"
echo "[restore] place $FILE as Redis dump.rdb and restart Redis (see RecoveryGuide.md)"
