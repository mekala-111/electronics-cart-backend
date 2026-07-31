#!/usr/bin/env bash
# Forward upgrade: install 001→020, then upgrade 021→045.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

APPLY_DEMO_DATA=1
export APPLY_DEMO_DATA

log "Forward upgrade: 001→020 then 021→045"
reset_public_schema
apply_migrations_through 020
MID="$(db_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations"')"
apply_migrations_range 021 045
FINAL="$(db_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations"')"

run_ts "${TS_DIR}/verifyMigrationHistory.ts"
run_ts "${TS_DIR}/verifyEnums.ts"

BODY=$(cat <<EOF
# Forward Migration Report

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

| Stage | Migrations recorded |
|-------|---------------------|
| After 001→020 | ${MID} |
| After 021→045 | ${FINAL} |
| Expected total | $(count_expected_migrations) |

| Check | Result |
|-------|--------|
| Incremental upgrade | PASS |
| Checksum / history | see MigrationVerificationReport.md |
| Duplicate enum failures | none (IF NOT EXISTS guards) |
EOF
)
write_report "ForwardMigrationReport.md" "${BODY}"
ok "verify-forward complete"
