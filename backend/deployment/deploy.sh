#!/usr/bin/env bash
# Full production deploy:
# pull → install → build → migrate → reference seed → PM2 reload → health → rollback on failure
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PREV_REV=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  PREV_REV="$(git rev-parse HEAD)"
  echo "[deploy] pulling..."
  git pull --ff-only
fi

cleanup_on_fail() {
  local code=$?
  if [[ $code -ne 0 ]]; then
    echo "[deploy] FAILED (exit $code) — attempting rollback" >&2
    if [[ -n "${PREV_REV}" ]]; then
      ./deployment/rollback.sh "${PREV_REV}" || true
    fi
  fi
  exit "$code"
}
trap cleanup_on_fail EXIT

./deployment/pre-deploy.sh
echo "[deploy] reloading PM2..."
pm2 startOrReload deployment/ecosystem.config.js --env production --update-env
./deployment/post-deploy.sh

trap - EXIT
echo "[deploy] success"
