#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

# Prefer pnpm; bootstrap via corepack/npm and resolve global bin onto PATH
ensure_pnpm() {
  add_npm_global_bin() {
    local prefix bin
    prefix="$(npm prefix -g 2>/dev/null || true)"
    bin="$(npm bin -g 2>/dev/null || true)"
    if [[ -n "$bin" && -d "$bin" ]]; then
      export PATH="$bin:$PATH"
    elif [[ -n "$prefix" && -d "$prefix/bin" ]]; then
      export PATH="$prefix/bin:$PATH"
    fi
  }

  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if command -v corepack >/dev/null 2>&1; then
    echo "[pre-deploy] enabling pnpm via corepack..."
    corepack enable || true
    corepack prepare pnpm@9.15.9 --activate || true
  fi

  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "[pre-deploy] neither pnpm nor npm found" >&2
    exit 1
  fi

  add_npm_global_bin
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  echo "[pre-deploy] installing pnpm@9 via npm -g..."
  npm install -g pnpm@9.15.9
  add_npm_global_bin

  if ! command -v pnpm >/dev/null 2>&1; then
    echo "[pre-deploy] pnpm still not on PATH after npm install -g" >&2
    echo "[pre-deploy] npm prefix -g: $(npm prefix -g 2>/dev/null || echo unknown)" >&2
    echo "[pre-deploy] npm bin -g: $(npm bin -g 2>/dev/null || echo unknown)" >&2
    echo "[pre-deploy] which npm: $(command -v npm)" >&2
    echo "[pre-deploy] try: export PATH=\"\$(npm prefix -g)/bin:\$PATH\"" >&2
    exit 1
  fi
}

ensure_pnpm
echo "[pre-deploy] using pnpm $(pnpm -v) at $(command -v pnpm)"

required=(DATABASE_URL REDIS_URL JWT_SECRET JWT_REFRESH_SECRET NODE_ENV)
for k in "${required[@]}"; do
  if [[ -z "${!k:-}" ]]; then
    echo "[pre-deploy] missing required env: $k" >&2
    echo "[pre-deploy] ensure $ROOT/.env exists and contains $k" >&2
    exit 1
  fi
done

if [[ "${NODE_ENV}" != "production" && "${APP_ENV:-}" != "production" ]]; then
  echo "[pre-deploy] warning: NODE_ENV/APP_ENV is not production" >&2
fi

echo "[pre-deploy] install..."
pnpm install --frozen-lockfile

echo "[pre-deploy] prisma generate..."
pnpm exec prisma generate --schema ../database/schema.prisma

echo "[pre-deploy] build..."
pnpm run build

echo "[pre-deploy] validating environment (compiled)..."
node -e "const { validateEnvironment } = require('./dist/config/env.validation'); validateEnvironment(process.env);"

echo "[pre-deploy] database migrate + reference seeds..."
(
  cd "${REPO}/database"
  export APPLY_DEMO_DATA=0
  bash scripts/deploy-migrations.sh 046
)

echo "[pre-deploy] ok"
