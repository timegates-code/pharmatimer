#!/bin/bash
# deploy/04-seed-owner.sh
# SENTINEL_N5M_BETA2_04_SEED_OWNER
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 CP3 deploy step 4/4
# Wrapper venv-activated to run backend/seed_owner.py (path drift-N73).
# Prints owner token stdout ONCE - capture manually.

export PATH="/opt/homebrew/bin:$PATH"
set -euo pipefail

VENV_PATH="${HOME}/PharmaTimer/.venv"
BACKEND_PATH="${HOME}/PharmaTimer/backend"
OWNER_NAME="${1:-Roberto}"

echo "PharmaTimer 04-seed-owner.sh"
echo ""

if [ ! -x "${VENV_PATH}/bin/python" ]; then
  echo "ERROR venv non trovato in ${VENV_PATH} (esegui 02-setup-pharmatimer-venv.sh prima)"
  exit 1
fi

if [ ! -f "${BACKEND_PATH}/seed_owner.py" ]; then
  echo "ERROR seed_owner.py non trovato in ${BACKEND_PATH}/seed_owner.py"
  exit 1
fi

echo "Running seed_owner.py per OWNER_NAME=${OWNER_NAME}"
echo "***TOKEN VERRA STAMPATO UNA SOLA VOLTA - SALVALO SUBITO***"
echo ""

cd "${BACKEND_PATH}"
OWNER_NAME="${OWNER_NAME}" "${VENV_PATH}/bin/python" seed_owner.py
