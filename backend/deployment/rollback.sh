#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REV="${1:-}"
if [[ -z "$REV" ]]; then
  echo "Usage: rollback.sh <git-sha|release-dir>"
  exit 1
fi
cd "$ROOT"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git checkout "$REV"
  pnpm install --frozen-lockfile
  pnpm run build
fi
pm2 startOrReload deployment/ecosystem.config.js --env production --update-env
./deployment/health-check.sh
echo "[rollback] restored $REV"
echo "[rollback] NOTE: database rollback is restore-from-backup only — see backend/docs/DeploymentSafety.md"
