#!/usr/bin/env bash
# Full production deploy:
# load .env → pull → install → build → migrate → reference seed → PM2 reload → health
# Rollback only if build/migrate fails — not after a healthy PM2 start.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load secrets from backend/.env (PM2 may already have them; deploy CLI does not)
if [[ -f "$ROOT/.env" ]]; then
  set +u
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  set -u
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
    echo "[deploy] FAILED during build/migrate (exit $code) — attempting rollback" >&2
    if [[ -n "${PREV_REV}" && "${PREV_REV}" != "$(git rev-parse HEAD 2>/dev/null || true)" ]]; then
      ./deployment/rollback.sh "${PREV_REV}" || true
    fi
    if git rev-parse --abbrev-ref origin/main >/dev/null 2>&1; then
      git checkout -B main origin/main || true
    fi
  fi
  exit "$code"
}
trap cleanup_on_fail EXIT

./deployment/pre-deploy.sh

# Build + migrate succeeded — do not roll code back if PM2/health fails
trap - EXIT

echo "[deploy] reloading PM2..."
pm2 startOrReload deployment/ecosystem.config.js --env production --update-env
./deployment/post-deploy.sh

echo "[deploy] success"
