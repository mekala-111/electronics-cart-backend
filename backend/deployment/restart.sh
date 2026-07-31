#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pm2 reload ecosystem.config.js --update-env 2>/dev/null || pm2 reload deployment/ecosystem.config.js --update-env
echo "[restart] zero-downtime reload requested"
