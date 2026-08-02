#!/usr/bin/env bash
# Interrupt a migration mid-transaction; restart deploy; verify consistency.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

APPLY_DEMO_DATA=1
export APPLY_DEMO_DATA

log "Transaction safety: interrupted migration then resume"
reset_public_schema
ensure_prisma_migrations_table

# Apply through 009 successfully
apply_migrations_through 009

# Simulate a failed transactional migration (rolled back — DB unchanged)
set +e
db_psql_stdin <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS __verify_tx_probe (id uuid PRIMARY KEY);
-- Force failure inside the same transaction
DO $$ BEGIN RAISE EXCEPTION 'simulated migration interrupt'; END $$;
COMMIT;
SQL
TX_RC=$?
set -e

if [[ "${TX_RC}" -eq 0 ]]; then
  fail "Expected simulated interrupt to fail"
fi

PROBE="$(db_psql -Atc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='__verify_tx_probe';")"
if [[ "${PROBE}" != "0" ]]; then
  fail "Interrupted transaction left partial objects (__verify_tx_probe exists)"
fi

# Resume remaining migrations
apply_migrations_range 010 046
run_ts "${TS_DIR}/verifyMigrationHistory.ts"

BODY=$(cat <<EOF
# Transaction Safety

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

| Step | Result |
|------|--------|
| Apply 001→009 | PASS |
| Simulated in-transaction failure | rolled back (exit ${TX_RC}) |
| Partial object leftover | none |
| Resume 010→046 | PASS |
| Migration history (45) | PASS |

PostgreSQL aborted the failed transaction; no partial DDL remained. Redeploy of remaining files succeeded.
EOF
)
write_report "TransactionSafety.md" "${BODY}"
ok "verify-transactions complete"
