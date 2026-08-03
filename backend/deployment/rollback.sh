#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REV="${1:-}"
if [[ -z "$REV" ]]; then
  echo "Usage: rollback.sh <git-sha|release-dir>"
  exit 1
fi
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set +u
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  set -u
fi

ensure_pnpm() {
  add_npm_global_bin() {
    local prefix
    prefix="$(npm prefix -g 2>/dev/null || true)"
    if [[ -n "$prefix" && -d "$prefix/bin" ]]; then
      export PATH="$prefix/bin:$PATH"
    fi
  }

  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack enable || true
    corepack prepare pnpm@9.15.9 --activate || true
  fi
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi
  if command -v npm >/dev/null 2>&1; then
    add_npm_global_bin
    if ! command -v pnpm >/dev/null 2>&1; then
      npm install -g pnpm@9.15.9
      add_npm_global_bin
    fi
  fi
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "[rollback] pnpm not found" >&2
    exit 1
  fi
}

ensure_pnpm

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git checkout "$REV"
  export HUSKY=0
  if [[ -f pnpm-lock.yaml ]]; then
    pnpm install --frozen-lockfile
    pnpm exec nest build
  elif [[ -f package-lock.json ]]; then
    NPM_CONFIG_PRODUCTION=false npm ci --include=dev --ignore-scripts=false
    npx nest build
  else
    pnpm install
    pnpm exec nest build
  fi
fi
pm2 startOrReload deployment/ecosystem.config.js --env production --update-env
./deployment/health-check.sh
echo "[rollback] restored $REV"
echo "[rollback] NOTE: database rollback is restore-from-backup only — see backend/docs/DeploymentSafety.md"
