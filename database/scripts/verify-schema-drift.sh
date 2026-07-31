#!/usr/bin/env bash
# Schema drift gate: locked SQL catalogs + Prisma datamodel vs live DB.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

DIFF_OUT="${REPORTS_DIR}/schema_drift.diff"
TMP_SCHEMA="${REPORTS_DIR}/.tmp_pulled.prisma"
mkdir -p "${REPORTS_DIR}"
rm -f "${DIFF_OUT}" "${TMP_SCHEMA}"

log "Schema drift detection (Prisma datamodel ↔ live database)"

# Build SQL array literals from expected catalogs (quoted identifiers as text).
build_sql_list() {
  local file="$1"
  local first=1
  printf "ARRAY["
  while IFS= read -r name; do
    [[ -n "${name}" ]] || continue
    if [[ "${first}" -eq 1 ]]; then first=0; else printf ","; fi
    printf "'%s'" "${name//\'/\'\'}"
  done < "${file}"
  printf "]"
}

TABLE_ARRAY="$(build_sql_list "${LIB_DIR}/expected_tables.txt")"
ENUM_ARRAY="$(build_sql_list "${LIB_DIR}/expected_enums.txt")"

MISSING_TABLES="$(db_psql -Atc "
  SELECT expected
  FROM unnest(${TABLE_ARRAY}) AS expected
  WHERE to_regclass('public.' || expected) IS NULL
  ORDER BY 1;
")"

MISSING_ENUMS="$(db_psql -Atc "
  SELECT expected
  FROM unnest(${ENUM_ARRAY}) AS expected
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = expected AND t.typtype = 'e'
  )
  ORDER BY 1;
")"

CATALOG_FAIL=0
[[ -z "${MISSING_TABLES}" ]] || CATALOG_FAIL=1
[[ -z "${MISSING_ENUMS}" ]] || CATALOG_FAIL=1

set +e
(
  cd "${DATABASE_DIR}"
  npx --yes prisma@6.19.0 migrate diff \
    --from-schema-datamodel schema.prisma \
    --to-url "${DATABASE_URL}" \
    --script \
    > "${DIFF_OUT}" 2>"${REPORTS_DIR}/schema_drift.stderr.txt"
)
DIFF_RC=$?
set -e

DIFF_BYTES=0
[[ -f "${DIFF_OUT}" ]] && DIFF_BYTES="$(wc -c < "${DIFF_OUT}" | tr -d ' ')"

PRISMA_DRIFT=0
if [[ -f "${DIFF_OUT}" ]] && grep -Eq '^(CREATE|ALTER|DROP)[[:space:]]' "${DIFF_OUT}"; then
  PRISMA_DRIFT=1
fi

set +e
(
  cd "${DATABASE_DIR}"
  npx --yes prisma@6.19.0 db pull --print > "${TMP_SCHEMA}" 2>/dev/null
)
set -e

STATUS="PASS"
[[ "${CATALOG_FAIL}" -eq 0 && "${PRISMA_DRIFT}" -eq 0 ]] || STATUS="FAIL"

BODY=$(cat <<EOF
# Schema Drift Report

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

| Check | Result |
|-------|--------|
| Expected tables present | $([[ -z "${MISSING_TABLES}" ]] && echo PASS || echo FAIL) |
| Expected enums present | $([[ -z "${MISSING_ENUMS}" ]] && echo PASS || echo FAIL) |
| prisma migrate diff (DDL) | $([[ "${PRISMA_DRIFT}" -eq 0 ]] && echo PASS || echo FAIL) |
| prisma migrate diff exit | ${DIFF_RC} |
| Diff bytes | ${DIFF_BYTES} |
| Overall | **${STATUS}** |

## Missing tables

$([[ -z "${MISSING_TABLES}" ]] && echo "_None._" || printf '%s\n' "${MISSING_TABLES}" | sed 's/^/- /')

## Missing enums

$([[ -z "${MISSING_ENUMS}" ]] && echo "_None._" || printf '%s\n' "${MISSING_ENUMS}" | sed 's/^/- /')

## migrate diff output

\`\`\`sql
$([[ -f "${DIFF_OUT}" ]] && cat "${DIFF_OUT}" || echo "(no output)")
\`\`\`

Pulled schema snapshot (reference only): \`database/reports/.tmp_pulled.prisma\`
EOF
)
write_report "SchemaDriftReport.md" "${BODY}"

if [[ "${STATUS}" != "PASS" ]]; then
  fail "schema drift detected — see SchemaDriftReport.md"
fi
ok "schema drift check passed"
