#!/usr/bin/env bash
# Production dry-run: scan SQL for destructive DDL; deploy on clean DB.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

# Production path: no demo seeds — reference seeds only after DDL/indexes.
APPLY_DEMO_DATA=0
export APPLY_DEMO_DATA
NODE_ENV=production
export NODE_ENV

log "Production dry-run"
run_ts "${TS_DIR}/verifyProduction.ts"

reset_public_schema
apply_migrations_through 045
prisma_validate
prisma_generate

BODY_EXTRA=$(cat <<EOF

## Deploy dry-run

| Check | Result |
|-------|--------|
| Clean schema deploy 001→045 | PASS |
| prisma validate | PASS |
| prisma generate | PASS |

No schema.prisma or locked SQL files were modified by the verification framework.
EOF
)
if [[ -f "${REPORTS_DIR}/ProductionDryRun.md" ]]; then
  printf '%s\n' "${BODY_EXTRA}" >> "${REPORTS_DIR}/ProductionDryRun.md"
  cp "${REPORTS_DIR}/ProductionDryRun.md" "${ROOT_REPORTS_DIR}/ProductionDryRun.md"
fi

ok "verify-production complete"
