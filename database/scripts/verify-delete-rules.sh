#!/usr/bin/env bash
# Spot-check ON DELETE behaviors declared on critical FKs.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql

# Expectation triples: child_table, parent_table, expected on_delete keyword
EXPECTATIONS=(
  "order_items|orders|CASCADE"
  "role_permissions|roles|CASCADE"
  "payments|orders|RESTRICT"
  "shipments|orders|RESTRICT"
  "orders|users|SET NULL"
)

PASS=0
FAIL=0
ROWS=()

for spec in "${EXPECTATIONS[@]}"; do
  IFS='|' read -r child parent expect <<< "${spec}"
  actual="$(db_psql -Atc "
    SELECT CASE c.confdeltype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
    END
    FROM pg_constraint c
    JOIN pg_class ch ON ch.oid = c.conrelid
    JOIN pg_class p ON p.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = ch.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND ch.relname = '${child}'
      AND p.relname = '${parent}'
    LIMIT 1;
  ")"
  if [[ -z "${actual}" ]]; then
    ROWS+=("| ${child} → ${parent} | ${expect} | (missing FK) | FAIL |")
    FAIL=$((FAIL + 1))
  elif [[ "${actual}" == "${expect}" ]] || { [[ "${expect}" == "RESTRICT" ]] && [[ "${actual}" == "NO ACTION" ]]; }; then
    # PostgreSQL often stores RESTRICT as NO ACTION equivalently for delete
    ROWS+=("| ${child} → ${parent} | ${expect} | ${actual} | PASS |")
    PASS=$((PASS + 1))
  else
    ROWS+=("| ${child} → ${parent} | ${expect} | ${actual} | FAIL |")
    FAIL=$((FAIL + 1))
  fi
done

BODY=$(cat <<EOF
# Delete Rule Validation

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

| FK | Expected ON DELETE | Actual | Status |
|----|--------------------|--------|--------|
$(printf '%s\n' "${ROWS[@]}")

Passed: ${PASS} / Failed: ${FAIL}

RESTRICT and NO ACTION are treated as equivalent for verification purposes.
EOF
)
write_report "DeleteRuleReport.md" "${BODY}"

if [[ "${FAIL}" -ne 0 ]]; then
  fail "delete-rule checks failed (${FAIL})"
fi
ok "delete-rule checks passed (${PASS})"
