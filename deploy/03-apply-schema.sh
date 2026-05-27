#!/bin/bash
# deploy/03-apply-schema.sh
# SENTINEL_N5M_BETA2_03_APPLY_SCHEMA
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 CP3 deploy step 3/4
# Applies migration chain v01 -> v02 -> v03 from backend/db/migrations/
# Idempotent: CREATE TABLE IF NOT EXISTS + ALTER TABLE IGNORE patterns assumed.

export PATH="/opt/homebrew/bin:$PATH"
set -euo pipefail

CNF_PATH="${HOME}/.my-pharmatimer.cnf"
MIGRATIONS_PATH="${HOME}/PharmaTimer/backend/db/migrations"

echo "PharmaTimer 03-apply-schema.sh"
echo ""

if [ ! -f "${CNF_PATH}" ]; then
  echo "ERROR ${CNF_PATH} non trovato (esegui 01-setup-pharmatimer-db.sh prima)"
  exit 1
fi

if [ ! -d "${MIGRATIONS_PATH}" ]; then
  echo "ERROR ${MIGRATIONS_PATH} non trovato (esegui rsync backend prima)"
  exit 1
fi

for sql_file in v01_init.sql v02_unique_log.sql v03_utenti_enum_caregiver.sql; do
  full_path="${MIGRATIONS_PATH}/${sql_file}"
  if [ ! -f "${full_path}" ]; then
    echo "WARN ${full_path} mancante - skip (non bloccante se sub-chain)"
    continue
  fi
  echo "Applying ${sql_file}"
  mysql --defaults-file="${CNF_PATH}" < "${full_path}"
done

echo ""
echo "DONE apply-schema. Tabelle in pharmatimer:"
mysql --defaults-file="${CNF_PATH}" -e "SHOW TABLES;"
