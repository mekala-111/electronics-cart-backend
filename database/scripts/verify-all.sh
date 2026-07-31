#!/usr/bin/env bash
# Run the full Electronics Cart migration verification suite.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FAILURES=0

run_step() {
  local name="$1"
  shift
  log "======== ${name} ========"
  if "$@"; then
    ok "${name}"
  else
    printf '[verify:FAIL] %s\n' "${name}" >&2
    FAILURES=$((FAILURES + 1))
  fi
}

# Ensure dependencies once
(cd "${DATABASE_DIR}" && npm install --no-fund --no-audit)

run_step "clean-install" bash "${SCRIPT_DIR}/verify-clean.sh"
run_step "forward-upgrade" bash "${SCRIPT_DIR}/verify-forward.sh"
run_step "rollback" bash "${SCRIPT_DIR}/verify-rollback.sh"
run_step "seed" bash "${SCRIPT_DIR}/verify-seed.sh"
run_step "enums" bash "${SCRIPT_DIR}/verify-enums.sh"
run_step "indexes" bash "${SCRIPT_DIR}/verify-indexes.sh"
run_step "relations" bash "${SCRIPT_DIR}/verify-relations.sh"
run_step "delete-rules" bash "${SCRIPT_DIR}/verify-delete-rules.sh"
run_step "performance" bash "${SCRIPT_DIR}/verify-performance.sh"
run_step "transactions" bash "${SCRIPT_DIR}/verify-transactions.sh"
run_step "schema-drift" bash "${SCRIPT_DIR}/verify-schema-drift.sh"
run_step "backup-restore" bash "${SCRIPT_DIR}/verify-backup.sh"
run_step "production" bash "${SCRIPT_DIR}/verify-production.sh"

# Delete-rule spot checks (CASCADE / SET NULL / RESTRICT) — non-destructive probes
log "======== delete-rules ========"
run_ts "${TS_DIR}/verifyForeignKeys.ts" || FAILURES=$((FAILURES + 1))

FINISHED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS="PASS"
[[ "${FAILURES}" -eq 0 ]] || STATUS="FAIL"

SUMMARY=$(cat <<EOF
# DATABASE VERIFICATION SUMMARY

Generated: ${FINISHED}
Suite started: ${STARTED}

**Database version:** v1.0 (SQL migrations 001–045, schema locked)

## Overall: **${STATUS}** (${FAILURES} failed step group(s))

| Area | Status | Report |
|------|--------|--------|
| Migration Status | see suite | MigrationVerificationReport.md |
| Schema / Enums | see suite | SchemaValidation.md / EnumValidation.md |
| Prisma validate + generate | included in clean/production | MigrationVerificationReport.md |
| Foreign Keys | see suite | ForeignKeyReport.md |
| Indexes | see suite | IndexReport.md |
| Seed Data | see suite | SeedReport.md |
| Relations | see suite | RelationsReport.md |
| Delete Rules | see suite | DeleteRuleReport.md |
| Performance | see suite | PerformanceReport.md |
| Rollback | see suite | RollbackReport.md |
| Forward Upgrade | see suite | ForwardMigrationReport.md |
| Transaction Safety | see suite | TransactionSafety.md |
| Schema Drift | see suite | SchemaDriftReport.md |
| Backup / Restore | see suite | BackupRestoreReport.md |
| Production Dry Run | see suite | ProductionDryRun.md |
| Release checklist | docs | docs/database/ReleaseChecklist.md |

## Production Ready

$([[ "${FAILURES}" -eq 0 ]] && echo "**YES** — all verification steps completed successfully. READY FOR BACKEND IMPLEMENTATION." || echo "**NO** — fix failing steps before tagging v1.0.")

## Deploy model

Locked phases ship as \`database/sql/001\`–\`045\` applied in order (see \`docs/database/MigrationStrategy.md\`).
Verification records checksums into \`_prisma_migrations\` for history audits. No schema changes were introduced by this framework.
EOF
)
write_report "DATABASE_VERIFICATION_SUMMARY.md" "${SUMMARY}"
cp "${REPORTS_DIR}/DATABASE_VERIFICATION_SUMMARY.md" "${REPO_ROOT}/DATABASE_VERIFICATION_SUMMARY.md"

if [[ "${FAILURES}" -ne 0 ]]; then
  fail "verify-all finished with ${FAILURES} failure(s) — see reports/"
fi
ok "verify-all complete — reports in database/reports/ and reports/"
