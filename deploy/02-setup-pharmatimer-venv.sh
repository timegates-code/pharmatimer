#!/bin/bash
# deploy/02-setup-pharmatimer-venv.sh
# SENTINEL_N5M_BETA2_02_SETUP_VENV
# PharmaTimer F3-S6 N+5.M-pivot-exec-beta-2 CP3 deploy step 2/4
# Creates ~/PharmaTimer/.venv with Python 3.13 and installs it from
# backend/requirements.lock via deploy/installa-dal-lock.sh: hash mode, no
# resolution, the same versions and artifacts as the Studio's backend/venv.
# Until 2026-09-29 it ran `pip install -e backend/` against the pyproject
# ranges, which let the two venvs drift (394bec1 closed that gap by hand).
# pip itself is not upgraded here: it is not in the lock, and upgrading it on
# the Mini alone would open a gap of its own.
# Idempotent: skip creation if the venv exists; the lock install skips what is
# already at the locked version.

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
  echo "Step 1/2: creo venv in ${VENV_PATH}"
  "${PYTHON_BIN}" -m venv "${VENV_PATH}"
fi

echo "Step 2/2: installo dal lock (deploy/installa-dal-lock.sh), in modalita hash"
bash "$(dirname "$0")/installa-dal-lock.sh" "${VENV_PATH}" "${BACKEND_PATH}"

echo ""
echo "DONE setup-venv. Python version:"
"${VENV_PATH}/bin/python" --version
echo "Top installed packages:"
"${VENV_PATH}/bin/pip" list | head -15
