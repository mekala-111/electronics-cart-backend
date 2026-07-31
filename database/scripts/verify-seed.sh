#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
require_psql
require_node
(cd "${DATABASE_DIR}" && DATABASE_URL="${DATABASE_URL}" npx --yes prisma@6.19.0 db seed)
run_ts "${TS_DIR}/verifySeedData.ts"
ok "verify-seed complete"
