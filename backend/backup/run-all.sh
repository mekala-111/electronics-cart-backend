#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
"$DIR/backup-postgres.sh"
"$DIR/backup-redis.sh"
"$DIR/backup-uploads.sh"
"$DIR/backup-env.sh"
"$DIR/verify-backup.sh"
