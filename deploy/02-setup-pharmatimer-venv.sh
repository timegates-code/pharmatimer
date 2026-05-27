#!/bin/bash
# deploy/02-setup-pharmatimer-venv.sh
# SENTINEL_N5M_BETA2_02_SETUP_VENV
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 CP3 deploy step 2/4
# Creates ~/PharmaTimer/.venv with Python 3.13 + pip install -e backend/
# Skip requirements.txt (D-NEW#3/#4 rimedio ii: deps da pyproject range pinning).
# Idempotent: skip if venv exists with same Python version.

export PATH="/opt/homebrew/bin:$PATH"
set -euo pipefail

VENV_PATH="${HOME}/PharmaTimer/.venv"
BACKEND_PATH="${HOME}/PharmaTimer/backend"
PYTHON_BIN="/opt/homebrew/opt/python@3.13/bin/python3.13"

echo "PharmaTimer 02-setup-pharmatimer-venv.sh"
echo ""

if [ ! -x "${PYTHON_BIN}" ]; then
  echo "ERROR Python 3.13 non trovato in ${PYTHON_BIN}"
  echo "Esegui: brew install python@3.13"
  exit 1
fi

if [ ! -d "${BACKEND_PATH}" ]; then
  echo "ERROR backend non trovato in ${BACKEND_PATH} (esegui rsync prima)"
  exit 1
fi

if [ -d "${VENV_PATH}" ]; then
  echo "WARN venv esiste gia in ${VENV_PATH}. Skip creation."
  echo "Per re-create pulito: rm -rf ${VENV_PATH} poi rilancia."
else
  echo "Step 1/3: creo venv in ${VENV_PATH}"
  "${PYTHON_BIN}" -m venv "${VENV_PATH}"
fi

echo "Step 2/3: upgrade pip + setuptools + wheel"
"${VENV_PATH}/bin/pip" install --quiet --upgrade pip setuptools wheel

echo "Step 3/3: pip install -e backend/ (skip requirements.txt D-NEW#3/#4)"
"${VENV_PATH}/bin/pip" install --quiet -e "${BACKEND_PATH}"

echo ""
echo "DONE setup-venv. Python version:"
"${VENV_PATH}/bin/python" --version
echo "Top installed packages:"
"${VENV_PATH}/bin/pip" list | head -15
