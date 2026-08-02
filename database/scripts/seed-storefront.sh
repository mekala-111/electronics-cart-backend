#!/usr/bin/env bash
# Apply production storefront reference seeds (catalog, inventory, marketing).
# Usage:
#   DATABASE_URL=postgresql://... ./database/scripts/seed-storefront.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
require_psql

REF="${SQL_DIR}/reference"
for f in \
  "${REF}/001_auth_reference.sql" \
  "${REF}/002_payment_reference.sql" \
  "${REF}/003_shipping_reference.sql" \
  "${REF}/004_ops_reference.sql" \
  "${REF}/005_catalog_storefront.sql" \
  "${REF}/006_inventory_storefront.sql" \
  "${REF}/007_marketing_storefront.sql" \
  "${REF}/008_catalog_enrichment.sql"
do
  [[ -f "${f}" ]] || { echo "missing ${f}"; exit 1; }
  echo "[seed-storefront] applying $(basename "${f}")"
  db_psql_file "${f}"
done
ok "storefront reference seeds applied"
