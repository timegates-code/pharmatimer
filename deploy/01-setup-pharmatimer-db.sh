#!/bin/bash
# deploy/01-setup-pharmatimer-db.sh
# SENTINEL_N5M_BETA2_01_SETUP_DB
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 CP3 deploy step 1/4
# Interactive setup: prompts MySQL root password to create DB + user + grants
# Writes ~/.my-pharmatimer.cnf 600 with generated password.
# Idempotent: CREATE IF NOT EXISTS + CREATE USER IF NOT EXISTS.

export PATH="/opt/homebrew/bin:$PATH"
set -euo pipefail

DB_NAME="pharmatimer"
DB_USER="pharmatimer_app"
DB_HOST="localhost"
CNF_PATH="${HOME}/.my-pharmatimer.cnf"

echo "PharmaTimer 01-setup-pharmatimer-db.sh"
echo ""

if [ -f "${CNF_PATH}" ]; then
  echo "WARN ${CNF_PATH} esiste gia. Skip creation per evitare overwrite password."
  echo "Per re-run pulito: rm ${CNF_PATH} + DROP USER + DROP DATABASE manuale, poi rilancia."
  exit 0
fi

DB_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

echo "Step 1/3: CREATE DATABASE + USER + GRANTS (password root MySQL richiesta)"
mysql -uroot -p <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME}
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}'
  IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'${DB_HOST}';
FLUSH PRIVILEGES;
EOF

echo "Step 2/3: write ${CNF_PATH} (mode 600)"
cat > "${CNF_PATH}" <<EOF
[client]
user=${DB_USER}
password=${DB_PASS}
host=${DB_HOST}

[mysql]
database=${DB_NAME}
EOF
chmod 600 "${CNF_PATH}"

echo "Step 3/3: verifica accesso DB con .cnf"
mysql --defaults-file="${CNF_PATH}" -e "SELECT 'OK pharmatimer_app connesso' AS status;"

echo ""
echo "DONE setup-db. Password salvata in ${CNF_PATH} (600 marketreader:staff)."
