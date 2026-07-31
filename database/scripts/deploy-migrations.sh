#!/usr/bin/env bash
# Deploy SQL migrations 001→045 (checksum-safe) + production reference seeds.
# Demo seeds are excluded unless --demo-data / APPLY_DEMO_DATA=1.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

THROUGH="045"
for arg in "$@"; do
  case "${arg}" in
    --demo-data)
      APPLY_DEMO_DATA=1
      export APPLY_DEMO_DATA
      ;;
    [0-9][0-9][0-9])
      THROUGH="${arg}"
      ;;
    *)
      THROUGH="${arg}"
      ;;
  esac
done

if [[ -z "${DATABASE_URL:-}" ]]; then
  fail "DATABASE_URL is required for deploy"
fi

require_psql
log "Deploying migrations through ${THROUGH} (demo_data=$(demo_data_enabled && echo on || echo off))"
apply_migrations_through "${THROUGH}"
# When demo data is on, numbered seeds already ran; still apply reference for idempotency.
if demo_data_enabled; then
  apply_reference_seeds
fi
COUNT="$(db_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;')"
ok "Deploy complete — ${COUNT} recorded migration(s)"
