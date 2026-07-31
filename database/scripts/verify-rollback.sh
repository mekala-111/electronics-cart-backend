#!/usr/bin/env bash
# Rollback checkpoints: 001→N→clean→001 for N in 010 020 030 045.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

APPLY_DEMO_DATA=1
export APPLY_DEMO_DATA

CHECKPOINT="${1:-all}"
RESULTS=()
FAILED=0

restore_full() {
  log "Restoring full 001→045 after rollback tests"
  reset_public_schema
  apply_migrations_through 045
}

trap restore_full EXIT

run_checkpoint() {
  local through="$1"
  log "Rollback checkpoint 001→${through}→001"
  reset_public_schema
  apply_migrations_through "${through}"
  local before after enums
  before="$(db_psql -Atc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> '_prisma_migrations';")"
  reset_public_schema
  apply_migrations_through 001
  if run_ts "${TS_DIR}/verifyRollback.ts" --expect-max-tables=50; then
    after="$(db_psql -Atc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> '_prisma_migrations';")"
    enums="$(db_psql -Atc "SELECT COUNT(DISTINCT t.oid) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public';")"
    RESULTS+=("| 001→${through}→001 | ${before} tables at peak | ${after} tables after 001 | ${enums} enums | PASS |")
  else
    FAILED=1
    RESULTS+=("| 001→${through}→001 | ${before} tables at peak | — | — | FAIL |")
  fi
}

if [[ "${CHECKPOINT}" == "all" ]]; then
  for n in 010 020 030 045; do
    run_checkpoint "${n}"
  done
else
  run_checkpoint "${CHECKPOINT}"
fi

trap - EXIT
restore_full

BODY=$(cat <<EOF
# Rollback Report

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

Rollback strategy: drop public schema (full clean), re-apply \`001_initial.sql\` only, then verify no higher-phase objects remain. Full schema restored at end.

| Scenario | Peak tables | After 001 | Enums | Status |
|----------|-------------|-----------|-------|--------|
$(printf '%s\n' "${RESULTS[@]}")

## Orphan checks

See latest \`verifyRollback.ts\` output sections for type/table ceilings.
EOF
)
write_report "RollbackReport.md" "${BODY}"

if [[ "${FAILED}" -ne 0 ]]; then
  fail "verify-rollback had checkpoint failures"
fi
ok "verify-rollback complete"
