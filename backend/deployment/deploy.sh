#!/usr/bin/env bash
# Full production deploy:
# load .env → pull → install → build → migrate → reference seed → PM2 reload → health → rollback on failure
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load secrets from backend/.env (PM2 may already have them; deploy CLI does not)
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  echo "[deploy] loaded $ROOT/.env"
else
  echo "[deploy] warning: $ROOT/.env not found — relying on exported shell env" >&2
fi

PREV_REV=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  PREV_REV="$(git rev-parse HEAD)"
  # Prefer branch tip so we are not stuck in detached HEAD after a failed rollback
  if git rev-parse --abbrev-ref origin/main >/dev/null 2>&1; then
    git checkout -B main origin/main
  fi
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
    # Always return to main so the next deploy is not stuck in detached HEAD
    if git rev-parse --abbrev-ref origin/main >/dev/null 2>&1; then
      git checkout -B main origin/main || true
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
