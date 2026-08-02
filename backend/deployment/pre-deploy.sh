#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

required=(DATABASE_URL REDIS_URL JWT_SECRET JWT_REFRESH_SECRET NODE_ENV)
for k in "${required[@]}"; do
  if [[ -z "${!k:-}" ]]; then
    echo "[pre-deploy] missing required env: $k" >&2
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
