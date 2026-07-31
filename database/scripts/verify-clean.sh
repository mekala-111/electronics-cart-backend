#!/usr/bin/env bash
# Clean database: reset schema, apply 001→045, validate Prisma, generate client, check history.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

# Verification needs full numbered seeds (including demo fixtures).
APPLY_DEMO_DATA=1
export APPLY_DEMO_DATA

EXPECTED="$(count_expected_migrations)"
log "Clean install verification (expect ${EXPECTED} migrations)"

reset_public_schema
apply_migrations_through 045

prisma_validate
ok "prisma validate"
prisma_generate
ok "prisma generate"

run_ts "${TS_DIR}/verifyMigrationHistory.ts"
run_ts "${TS_DIR}/verifyEnums.ts"

TABLE_COUNT="$(db_psql -Atc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> '_prisma_migrations';")"
ENUM_COUNT="$(db_psql -Atc "SELECT COUNT(DISTINCT t.oid) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public';")"

BODY=$(cat <<EOF
# Migration Verification Report

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Clean installation

| Check | Result |
|-------|--------|
| Schema reset | PASS |
| Migrations applied | 001 → 045 |
| Recorded migrations | $(db_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations"') |
| Expected migrations | ${EXPECTED} |
| Tables (public) | ${TABLE_COUNT} |
| Enums (public) | ${ENUM_COUNT} |
| prisma validate | PASS |
| prisma generate | PASS |

## Notes

Deploy path is ordered \`database/sql/*.sql\` (MigrationStrategy). Each file is checksummed into \`_prisma_migrations\` for history verification.
EOF
)
write_report "MigrationVerificationReport.md" "${BODY}"
ok "verify-clean complete"
