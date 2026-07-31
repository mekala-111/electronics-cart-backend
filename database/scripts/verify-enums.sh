#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
require_psql
require_node
db_psql_file "${CHECK_SQL_DIR}/check_enums.sql" > "${REPORTS_DIR}/check_enums.raw.txt" || true
run_ts "${TS_DIR}/verifyEnums.ts"
ok "verify-enums complete"
