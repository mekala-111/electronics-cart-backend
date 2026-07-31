#!/usr/bin/env bash
# Shared helpers for Electronics Cart migration verification & deploy.
# Migrations are the 45 SQL files under database/sql/ (see MigrationStrategy.md).
# Schema is never modified by these scripts.
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_DIR="$(cd "${SCRIPTS_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${DATABASE_DIR}/.." && pwd)"
SQL_DIR="${DATABASE_DIR}/sql"
REFERENCE_SQL_DIR="${SQL_DIR}/reference"
REPORTS_DIR="${DATABASE_DIR}/reports"
ROOT_REPORTS_DIR="${REPO_ROOT}/reports"
LIB_DIR="${SCRIPTS_DIR}/lib"
CHECK_SQL_DIR="${SCRIPTS_DIR}/sql"
TS_DIR="${SCRIPTS_DIR}/ts"
DEMO_SEED_LIST="${LIB_DIR}/demo_seed_files.txt"

mkdir -p "${REPORTS_DIR}" "${ROOT_REPORTS_DIR}"

# Local verify defaults only when DATABASE_URL unset and not production.
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ "${NODE_ENV:-}" == "production" || "${APP_ENV:-}" == "production" ]]; then
    echo "[verify:FAIL] DATABASE_URL is required" >&2
    exit 1
  fi
  DATABASE_URL="postgresql://electronics:electronics@127.0.0.1:5433/electronics_cart"
fi
export DATABASE_URL
export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-electronics}"
export PGPASSWORD="${PGPASSWORD:-electronics}"
export PGDATABASE="${PGDATABASE:-electronics_cart}"

USE_DOCKER_PSQL="${USE_DOCKER_PSQL:-0}"
DOCKER_PG_CONTAINER="${DOCKER_PG_CONTAINER:-electronics_cart_verify_pg}"

# Demo seeds: opt-in only. Production never applies them by default.
APPLY_DEMO_DATA="${APPLY_DEMO_DATA:-0}"
ALLOW_DEMO_DATA="${ALLOW_DEMO_DATA:-0}"

log()  { printf '[verify] %s\n' "$*"; }
fail() { printf '[verify:FAIL] %s\n' "$*" >&2; exit 1; }
ok()   { printf '[verify:OK] %s\n' "$*"; }

require_psql() {
  if command -v psql >/dev/null 2>&1; then
    USE_DOCKER_PSQL=0
    return 0
  fi
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "${DOCKER_PG_CONTAINER}"; then
    if [[ "${USE_DOCKER_PSQL}" != "1" ]]; then
      log "psql host binary missing — using docker exec ${DOCKER_PG_CONTAINER}"
    fi
    USE_DOCKER_PSQL=1
    return 0
  fi
  fail "psql not found; start database/docker-compose.yml or install PostgreSQL client"
}

require_node() {
  command -v node >/dev/null 2>&1 || fail "node is required"
  command -v npx >/dev/null 2>&1 || fail "npx is required"
}

db_psql() {
  if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
    docker exec "${DOCKER_PG_CONTAINER}" \
      psql -U electronics -d electronics_cart -v ON_ERROR_STOP=1 "$@"
  else
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 "$@" </dev/null
  fi
}

db_psql_stdin() {
  if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
    docker exec -i "${DOCKER_PG_CONTAINER}" \
      psql -U electronics -d electronics_cart -v ON_ERROR_STOP=1
  else
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1
  fi
}

db_psql_file() {
  local file="$1"
  if [[ "${USE_DOCKER_PSQL}" == "1" ]]; then
    docker exec -i "${DOCKER_PG_CONTAINER}" \
      psql -U electronics -d electronics_cart -v ON_ERROR_STOP=1 < "${file}"
  else
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${file}"
  fi
}

list_migrations() {
  local f
  while IFS= read -r f; do
    printf '%s\n' "${f}"
  done < <(printf '%s\n' "${SQL_DIR}"/*.sql | LC_ALL=C sort)
}

migrations_through() {
  local through="$1"
  local f base num
  while IFS= read -r f; do
    [[ -n "${f}" ]] || continue
    base="$(basename "${f}")"
    num="${base%%_*}"
    if (( 10#${num} <= 10#${through} )); then
      printf '%s\n' "${f}"
    fi
  done < <(list_migrations)
}

migrations_from_to() {
  local from="$1" to="$2"
  local f base num
  while IFS= read -r f; do
    [[ -n "${f}" ]] || continue
    base="$(basename "${f}")"
    num="${base%%_*}"
    if (( 10#${num} >= 10#${from} && 10#${num} <= 10#${to} )); then
      printf '%s\n' "${f}"
    fi
  done < <(list_migrations)
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

demo_data_enabled() {
  if [[ "${APPLY_DEMO_DATA}" == "1" || "${ALLOW_DEMO_DATA}" == "1" ]]; then
    return 0
  fi
  if [[ "${NODE_ENV:-}" == "development" || "${APP_ENV:-}" == "development" ]]; then
    return 0
  fi
  return 1
}

is_demo_seed_file() {
  local base="$1"
  [[ -f "${DEMO_SEED_LIST}" ]] || return 1
  grep -qxF "${base}" "${DEMO_SEED_LIST}"
}

ensure_prisma_migrations_table() {
  db_psql_stdin <<'SQL'
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id                  VARCHAR(36)  PRIMARY KEY,
  checksum            VARCHAR(64)  NOT NULL,
  finished_at         TIMESTAMPTZ,
  migration_name      VARCHAR(255) NOT NULL,
  logs                TEXT,
  rolled_back_at      TIMESTAMPTZ,
  started_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  applied_steps_count INTEGER      NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_prisma_migrations_name_active
  ON "_prisma_migrations" (migration_name)
  WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;
SQL
}

# Returns stored checksum for an active migration, or empty.
active_migration_checksum() {
  local name="$1"
  db_psql -Atc "SELECT checksum FROM \"_prisma_migrations\"
    WHERE migration_name = '${name}'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
    ORDER BY finished_at DESC
    LIMIT 1;"
}

# Append-only record. Never DELETE existing rows.
record_migration() {
  local file="$1"
  local name checksum id
  name="$(basename "${file}" .sql)"
  if [[ "${file}" == *"/reference/"* ]]; then
    name="ref_$(basename "${file}" .sql)"
  fi
  checksum="$(sha256_file "${file}")"
  id="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())')"
  ensure_prisma_migrations_table
  db_psql -c "INSERT INTO \"_prisma_migrations\" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
    SELECT '${id}', '${checksum}', NOW(), '${name}', NOW(), 1
    WHERE NOT EXISTS (
      SELECT 1 FROM \"_prisma_migrations\"
      WHERE migration_name = '${name}'
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    );"
}

# Checksum-safe apply: skip if matching checksum already recorded; fail on mismatch.
apply_sql_file() {
  local file="$1"
  local base name checksum existing
  base="$(basename "${file}")"
  name="$(basename "${file}" .sql)"
  if [[ "${file}" == *"/reference/"* ]]; then
    name="ref_$(basename "${file}" .sql)"
  fi

  if is_demo_seed_file "${base}"; then
    if ! demo_data_enabled; then
      log "Skipping demo seed ${base} (set APPLY_DEMO_DATA=1 or --demo-data)"
      return 0
    fi
  fi

  checksum="$(sha256_file "${file}")"
  ensure_prisma_migrations_table
  existing="$(active_migration_checksum "${name}" || true)"
  if [[ -n "${existing}" ]]; then
    if [[ "${existing}" == "${checksum}" ]]; then
      log "Skipping ${base} (checksum match)"
      return 0
    fi
    fail "Migration ${name} checksum mismatch: ledger=${existing} file=${checksum}"
  fi

  log "Applying ${base}"
  db_psql_file "${file}"
  record_migration "${file}"
}

apply_reference_seeds() {
  local f
  require_psql
  ensure_prisma_migrations_table
  if [[ ! -d "${REFERENCE_SQL_DIR}" ]]; then
    log "No reference seed directory"
    return 0
  fi
  while IFS= read -r f; do
    [[ -n "${f}" ]] || continue
    apply_sql_file "${f}"
  done < <(printf '%s\n' "${REFERENCE_SQL_DIR}"/*.sql | LC_ALL=C sort)
}

apply_migrations_through() {
  local through="$1"
  require_psql
  ensure_prisma_migrations_table
  local files=() f
  while IFS= read -r f; do
    [[ -n "${f}" ]] || continue
    files+=("${f}")
  done < <(migrations_through "${through}")
  for f in "${files[@]}"; do
    apply_sql_file "${f}"
  done
  # Production path: always ensure reference seeds after DDL/indexes.
  if ! demo_data_enabled; then
    apply_reference_seeds
  fi
}

apply_migrations_range() {
  local from="$1" to="$2"
  require_psql
  ensure_prisma_migrations_table
  local files=() f
  while IFS= read -r f; do
    [[ -n "${f}" ]] || continue
    files+=("${f}")
  done < <(migrations_from_to "${from}" "${to}")
  for f in "${files[@]}"; do
    apply_sql_file "${f}"
  done
}

reset_public_schema() {
  require_psql
  log "Resetting public schema"
  db_psql_stdin <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL
}

write_report() {
  local name="$1"
  local body="$2"
  printf '%s\n' "${body}" > "${REPORTS_DIR}/${name}"
  cp "${REPORTS_DIR}/${name}" "${ROOT_REPORTS_DIR}/${name}"
  log "Wrote reports/${name}"
}

run_ts() {
  require_node
  (cd "${DATABASE_DIR}" && npx --yes tsx "$1" "${@:2}")
}

prisma_validate() {
  (cd "${DATABASE_DIR}" && DATABASE_URL="${DATABASE_URL}" npx --yes prisma@6.19.0 validate)
}

prisma_generate() {
  (cd "${DATABASE_DIR}" && DATABASE_URL="${DATABASE_URL}" npx --yes prisma@6.19.0 generate)
}

count_expected_migrations() {
  wc -l < "${LIB_DIR}/expected_migrations.txt" | tr -d ' '
}
