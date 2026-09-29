#!/bin/bash
# deploy/installa-dal-lock.sh -- installa un venv del backend da backend/requirements.lock.
#
# Uso:  bash deploy/installa-dal-lock.sh <venv> <backend> [--dev]
#   Studio: bash deploy/installa-dal-lock.sh backend/venv backend
#   Mini:   lo chiama deploy/02-setup-pharmatimer-venv.sh
#   --dev:  in piu gli strumenti di sviluppo del pyproject, con le versioni
#           del lock come vincolo (solo lo Studio li vuole).
#
# Il lock e la sola fonte delle versioni di esercizio, transitive comprese: lo
# genera scripts/genera-lock.py e lo misura scripts/audit/dipendenze.py. Qui
# nessuna risoluzione e nessun download non verificato:
#   1. setuptools e wheel dal lock, in modalita hash;
#   2. tutto il lock in modalita hash, --no-deps, --no-build-isolation: un
#      sorgente (http-ece) si costruisce con il setuptools del passo 1, non con
#      uno scaricato dall isolamento di build;
#   3. il backend editable, --no-deps --no-build-isolation;
#   4. pip check: con --no-deps, una dipendenza che il lock non porta si vede qui.
# Un artefatto il cui sha256 non e nel lock fa fallire il passo 2: e voluto.
#
# SENZA CACHE, ogni pip: Studio e Mini devono fare la stessa strada. Misurato
# alla prima installazione sullo Studio, il 2026-09-29: con la cache, pip ha
# preso http-ece da una wheel costruita in passato, in isolamento, con
# setuptools 84.0.0 (lo dice il suo WHEEL), e il passo 2 non ha costruito
# nulla. Sul Mini, a cache vuota, lo stesso sorgente si costruiva con il
# setuptools 82.0.1 del lock. Senza cache ogni artefatto si scarica e si
# verifica, e il sorgente si costruisce qui su entrambe le macchine.
#
# Misurato con pip 26.1.1: un hash dentro un file di vincoli accende la modalita
# hash per tutta l installazione, e l editable la fa fallire. Per questo il
# vincolo di --dev e la vista del lock SENZA hash, ricavata qui.

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "uso: bash deploy/installa-dal-lock.sh <venv> <backend> [--dev]"
  exit 1
fi
VENV="$1"
BACKEND="$2"
DEV="${3:-}"
LOCK="${BACKEND}/requirements.lock"
PIP="${VENV}/bin/pip"

if [ ! -x "${PIP}" ]; then echo "ERRORE pip assente in ${VENV}"; exit 1; fi
if [ ! -f "${LOCK}" ]; then echo "ERRORE lock assente: ${LOCK}"; exit 1; fi

umask 022
tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT

grep -E '^(setuptools|wheel)==' "${LOCK}" > "${tmp}/build.txt" || true
if [ "$(wc -l < "${tmp}/build.txt" | tr -d ' ')" != "2" ]; then
  echo "ERRORE il lock non porta setuptools e wheel: i sorgenti non si costruirebbero"
  exit 1
fi

echo "1/4 strumenti di build dal lock, in modalita hash"
"${PIP}" install --no-cache-dir --require-hashes --no-deps -r "${tmp}/build.txt"
echo "2/4 il lock, in modalita hash, senza risoluzione e senza isolamento di build"
"${PIP}" install --no-cache-dir --require-hashes --no-deps --no-build-isolation -r "${LOCK}"
echo "3/4 il backend editable"
"${PIP}" install --no-cache-dir --no-deps --no-build-isolation -e "${BACKEND}"
if [ "${DEV}" = "--dev" ]; then
  echo "3b  strumenti di sviluppo, con le versioni del lock come vincolo"
  sed -E 's/[[:space:]]+--hash=.*$//' "${LOCK}" | grep -E '^[A-Za-z0-9._-]+==' > "${tmp}/vincoli.txt"
  "${PIP}" install --no-cache-dir -c "${tmp}/vincoli.txt" --no-build-isolation -e "${BACKEND}[dev]"
fi
echo "4/4 pip check"
"${VENV}/bin/python" -m pip check
