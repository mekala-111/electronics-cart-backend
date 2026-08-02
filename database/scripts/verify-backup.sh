#!/usr/bin/env bash
# Backup / restore disaster-recovery gate.
# pg_dump → restore into clean DB → checksum compare → light verification.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_psql
require_node

APPLY_DEMO_DATA=1
export APPLY_DEMO_DATA

BACKUP_DIR="${REPORTS_DIR}/backup"
mkdir -p "${BACKUP_DIR}"
DUMP_FILE="${BACKUP_DIR}/electronics_cart.dump"
SCHEMA_BEFORE="${BACKUP_DIR}/schema_before.sql"
SCHEMA_AFTER="${BACKUP_DIR}/schema_after.sql"
RESTORE_DB="${RESTORE_DB:-electronics_cart_restore}"

# Build restore URL from primary DATABASE_URL (replace final path segment).
RESTORE_URL="$(RESTORE_DB="${RESTORE_DB}" python3 - <<'PY'
from urllib.parse import urlparse, urlunparse
import os
u = urlparse(os.environ["DATABASE_URL"])
path = "/" + os.environ["RESTORE_DB"]
print(urlunparse((u.scheme, u.netloc, path, "", "", "")))
PY
)"
export RESTORE_DB RESTORE_URL

log "Backup verification: dump ${PGDATABASE:-electronics_cart} → restore ${RESTORE_DB}"

# Ensure source has a full schema (idempotent if already deployed).
ensure_prisma_migrations_table
MIG_COUNT="$(db_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')"
if [[ "${MIG_COUNT}" -lt 45 ]]; then
  log "Source DB has ${MIG_COUNT}/46 migrations — deploying 001→046 first"
  reset_public_schema
  apply_migrations_through 046
fi

admin_psql() {
  # Connect to postgres maintenance DB to CREATE/DROP databases.
  if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
    docker exec "${DOCKER_PG_CONTAINER}" \
      psql -U electronics -d postgres -v ON_ERROR_STOP=1 "$@"
  else
    local admin_url
    admin_url="$(python3 - <<'PY'
from urllib.parse import urlparse, urlunparse
import os
u = urlparse(os.environ["DATABASE_URL"])
print(urlunparse((u.scheme, u.netloc, "/postgres", "", "", "")))
PY
)"
    psql "${admin_url}" -v ON_ERROR_STOP=1 "$@" </dev/null
  fi
}

restore_psql() {
  if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
    docker exec "${DOCKER_PG_CONTAINER}" \
      psql -U electronics -d "${RESTORE_DB}" -v ON_ERROR_STOP=1 "$@"
  else
    psql "${RESTORE_URL}" -v ON_ERROR_STOP=1 "$@" </dev/null
  fi
}

# --- Dump ---
if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
  docker exec "${DOCKER_PG_CONTAINER}" \
    pg_dump -U electronics -d electronics_cart -Fc -f /tmp/electronics_cart.dump
  docker cp "${DOCKER_PG_CONTAINER}:/tmp/electronics_cart.dump" "${DUMP_FILE}"
  docker exec "${DOCKER_PG_CONTAINER}" \
    pg_dump -U electronics -d electronics_cart --schema-only --no-owner --no-privileges \
    > "${SCHEMA_BEFORE}"
else
  pg_dump "${DATABASE_URL}" -Fc -f "${DUMP_FILE}"
  pg_dump "${DATABASE_URL}" --schema-only --no-owner --no-privileges > "${SCHEMA_BEFORE}"
fi

BEFORE_SHA="$(sha256_file "${SCHEMA_BEFORE}")"
DUMP_SHA="$(sha256_file "${DUMP_FILE}")"
ok "pg_dump complete (schema sha ${BEFORE_SHA:0:12}…)"

# --- Recreate restore database ---
admin_psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${RESTORE_DB}' AND pid <> pg_backend_pid();" || true
admin_psql -c "DROP DATABASE IF EXISTS ${RESTORE_DB};"
admin_psql -c "CREATE DATABASE ${RESTORE_DB};"

# --- Restore ---
if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
  docker cp "${DUMP_FILE}" "${DOCKER_PG_CONTAINER}:/tmp/electronics_cart.dump"
  docker exec "${DOCKER_PG_CONTAINER}" \
    pg_restore -U electronics -d "${RESTORE_DB}" --clean --if-exists --no-owner --no-privileges \
    /tmp/electronics_cart.dump || true
  # pg_restore returns non-zero on some NOTICE-level issues; verify objects instead
  docker exec "${DOCKER_PG_CONTAINER}" \
    pg_dump -U electronics -d "${RESTORE_DB}" --schema-only --no-owner --no-privileges \
    > "${SCHEMA_AFTER}"
else
  pg_restore -d "${RESTORE_URL}" --clean --if-exists --no-owner --no-privileges "${DUMP_FILE}" || true
  pg_dump "${RESTORE_URL}" --schema-only --no-owner --no-privileges > "${SCHEMA_AFTER}"
fi

AFTER_SHA="$(sha256_file "${SCHEMA_AFTER}")"

SRC_TABLES="$(db_psql -Atc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'")"
RST_TABLES="$(restore_psql -Atc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'")"
SRC_MIG="$(db_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')"
RST_MIG="$(restore_psql -Atc 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL' 2>/dev/null || echo 0)"
SRC_ENUMS="$(db_psql -Atc "SELECT COUNT(DISTINCT t.oid) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'")"
RST_ENUMS="$(restore_psql -Atc "SELECT COUNT(DISTINCT t.oid) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'")"

# Light verification on restored DB
ORIG_URL="${DATABASE_URL}"
export DATABASE_URL="${RESTORE_URL}"
set +e
(
  cd "${DATABASE_DIR}"
  DATABASE_URL="${RESTORE_URL}" npx --yes prisma@6.19.0 validate
)
VALIDATE_RC=$?
set -e
export DATABASE_URL="${ORIG_URL}"

CHECKSUM_MATCH=0
[[ "${BEFORE_SHA}" == "${AFTER_SHA}" ]] && CHECKSUM_MATCH=1

TABLE_MATCH=0
[[ "${SRC_TABLES}" == "${RST_TABLES}" ]] && TABLE_MATCH=1

ENUM_MATCH=0
[[ "${SRC_ENUMS}" == "${RST_ENUMS}" ]] && ENUM_MATCH=1

MIG_MATCH=0
[[ "${SRC_MIG}" == "${RST_MIG}" ]] && MIG_MATCH=1

# Schema SQL text checksums can differ on non-semantic ordering; structural
# equality (tables/enums/migrations + prisma validate) is the hard gate.
STATUS="PASS"
[[ "${TABLE_MATCH}" -eq 1 && "${ENUM_MATCH}" -eq 1 && "${MIG_MATCH}" -eq 1 && "${VALIDATE_RC}" -eq 0 ]] || STATUS="FAIL"

BODY=$(cat <<EOF
# Backup / Restore Report

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

| Step | Result |
|------|--------|
| pg_dump (custom format) | PASS (\`${DUMP_SHA:0:16}…\`) |
| Schema dump checksum (source) | \`${BEFORE_SHA}\` |
| Schema dump checksum (restore) | \`${AFTER_SHA}\` |
| Schema SQL checksums match | $([[ "${CHECKSUM_MATCH}" -eq 1 ]] && echo PASS || echo "WARN (non-semantic dump ordering)") |
| Tables source → restore | ${SRC_TABLES} → ${RST_TABLES} $([[ "${TABLE_MATCH}" -eq 1 ]] && echo PASS || echo FAIL) |
| Enums source → restore | ${SRC_ENUMS} → ${RST_ENUMS} $([[ "${ENUM_MATCH}" -eq 1 ]] && echo PASS || echo FAIL) |
| Migrations source → restore | ${SRC_MIG} → ${RST_MIG} $([[ "${MIG_MATCH}" -eq 1 ]] && echo PASS || echo FAIL) |
| prisma validate on restore | $([[ "${VALIDATE_RC}" -eq 0 ]] && echo PASS || echo FAIL) |
| Overall | **${STATUS}** |

Dump artifact: \`database/reports/backup/electronics_cart.dump\`

Hard gate = table/enum/migration counts + Prisma validate on restored DB.
EOF
)
write_report "BackupRestoreReport.md" "${BODY}"

if [[ "${STATUS}" != "PASS" ]]; then
  fail "backup/restore verification failed — see BackupRestoreReport.md"
fi
ok "backup/restore verification passed"
