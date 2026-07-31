#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
require_psql
require_node
db_psql_file "${CHECK_SQL_DIR}/check_indexes.sql" > "${REPORTS_DIR}/check_indexes.raw.txt" || true
db_psql_file "${CHECK_SQL_DIR}/check_constraints.sql" > "${REPORTS_DIR}/check_constraints.raw.txt" || true
run_ts "${TS_DIR}/verifyIndexes.ts"
ok "verify-indexes complete"
