#!/bin/bash
# deploy/launchd/api-wrapper.sh
# SENTINEL_N5M_BETA2_07_API_WRAPPER
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 LaunchAgent watchdog wrapper.
# Replica pattern StockFusion 1:1: while-loop + venv activate + uvicorn + sleep on crash.

export PATH="/opt/homebrew/bin:$PATH"

VENV_PATH="${HOME}/PharmaTimer/.venv"
BACKEND_PATH="${HOME}/PharmaTimer/backend"
LOG_DIR="${HOME}/PharmaTimer/logs"

mkdir -p "${LOG_DIR}"

if [ ! -d "${BACKEND_PATH}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FATAL backend not found at ${BACKEND_PATH}"
  exit 1
fi

if [ ! -x "${VENV_PATH}/bin/uvicorn" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FATAL uvicorn not found at ${VENV_PATH}/bin/uvicorn"
  exit 1
fi

cd "${BACKEND_PATH}"

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting uvicorn pharmatimer-api on 0.0.0.0:8000"
  "${VENV_PATH}/bin/uvicorn" \
    pharmatimer_api.app:app \
    --host 0.0.0.0 \
    --port 8000 \
    --log-level info
  exit_code=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] uvicorn exited code=${exit_code}, sleep 5 then restart"
  sleep 5
done
