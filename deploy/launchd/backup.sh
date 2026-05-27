#!/bin/bash
# deploy/launchd/backup.sh
# SENTINEL_N5M_BETA2_08_BACKUP
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 mysqldump daily 03:00 + gzip + retention 7gg.

export PATH="/opt/homebrew/bin:$PATH"
set -euo pipefail

CNF_PATH="${HOME}/.my-pharmatimer.cnf"
BACKUP_DIR="${HOME}/PharmaTimer/backups"
LOG_DIR="${HOME}/PharmaTimer/logs"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}" "${LOG_DIR}"

if [ ! -f "${CNF_PATH}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FATAL ${CNF_PATH} not found"
  exit 1
fi

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/pharmatimer_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup pharmatimer -> ${BACKUP_FILE}"

mysqldump \
  --defaults-file="${CNF_PATH}" \
  --no-tablespaces \
  --set-gtid-purged=OFF \
  --routines \
  --triggers \
  --events \
  pharmatimer \
  | gzip > "${BACKUP_FILE}"

SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup OK size=${SIZE}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pruning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name 'pharmatimer_*.sql.gz' -mtime +${RETENTION_DAYS} -delete -print

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup done"
