#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
sleep 3
./deployment/health-check.sh
./deployment/verify.sh
echo "[post-deploy] complete"
