#!/bin/bash
# deploy/deploy-mini.sh -- schieramento sul Mini, dal Terminale dello Studio.
#
# Si lancia dalla root del repo, sulla tailnet:  bash deploy/deploy-mini.sh
# Non gira dentro il sandbox di Claude Code: prod-check tocca il Mini via rete.
#
# ORDINE VINCOLANTE: migrazione PRIMA, codice DOPO (CLAUDE.md sezione 8).
# Questo script NON applica migrazioni. Si RIFIUTA, prima di qualunque atto,
# se make prod-check o make g21 sono rossi: cioe se il servizio non risponde
# o se il Mini e sotto il livello di migrazione che il codice richiede. La
# migrazione e un atto a parte -- backend/db/migrations/apply_v06_prod.py --
# e si ratifica. Un deploy di codice su un DB sotto livello fa fallire ogni
# insert di presa, che e M2: lo script esiste per rendere quel deploy
# impossibile per distrazione.
#
# Sequenza. Le guardie vengono PRIMA di tutto, anche delle precondizioni
# locali, e nessun atto sul Mini avviene prima del passo 5:
#   1. make prod-check  (servizio, bundle, openapi, censimento, e g21)
#   2. make g21         (ripetuto da solo: e LA guardia, e si nomina)
#   3. precondizioni locali: root del repo, TREE 0 e AHEAD 0 (make albero).
#      Si schiera cio che git ha e che e su origin, non cio che sta sul disco.
#   4. npm run build:mini                       -> dist-mini/
#   5. rsync backend/ deploy/ dist-mini/        -> mini:~/PharmaTimer/{backend,deploy,web}
#   6. ssh mini: pip install -e backend, riavvio del LaunchAgent api-wrapper
#   7. make prod-check di nuovo: INFO sulla versione servita, e g21 verde
#
# Cosa NON viaggia mai verso il Mini: .env* (il Mini ha il suo, e il
# LaunchAgent passa DB_DEFAULTS_FILE), venv, __pycache__, egg-info, .bak.
# Le esclusioni valgono anche per --delete: rsync non cancella cio che esclude.
#
# Derivato dalla procedura eseguita a mano e verbalizzata nel Changelog di
# Fase 3 (CP3 e CP6 delle sessioni N+5.M e N+5.Q): rsync di deploy/ e
# backend/, pip install -e sul Mini, bootout + bootstrap del LaunchAgent.

set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

MINI="${MINI:-mini}"                 # alias ssh, tailnet
DEST="${DEST:-PharmaTimer}"          # relativo alla home di marketreader sul Mini
PLIST='~/Library/LaunchAgents/com.pharmatimer.api-wrapper.plist'

rosso() { echo; echo "ROSSO  $*"; echo "       Nessun atto e stato compiuto sul Mini."; exit 1; }
passo() { echo; echo "== $* =="; }

radice="$(git rev-parse --show-toplevel 2>/dev/null)" || rosso "non sono in un repo git"
cd "$radice"
[ -f Makefile ] && [ -d backend ] && [ -d deploy ] || rosso "non e la root di PharmaTimer: $radice"
echo "repo = $radice   HEAD = $(git rev-parse --short HEAD)  $(git describe --tags 2>/dev/null || true)"

# ---------------------------------------------------------------- 1
passo "1. make prod-check (tocca il Mini in sola lettura; include g21)"
make --no-print-directory prod-check || rosso "prod-check e ROSSO: deploy NON ammesso"

# ---------------------------------------------------------------- 2
passo "2. make g21, la guardia di schieramento, da sola"
make --no-print-directory g21 || rosso "g21 e ROSSO: il Mini e SOTTO il livello richiesto. Migrazione PRIMA, codice DOPO."

# ---------------------------------------------------------------- 3
passo "3. precondizioni locali: TREE 0 e AHEAD 0"
make --no-print-directory albero || rosso "albero sporco o non spinto: si schiera solo cio che git ha e che e su origin"

# ---------------------------------------------------------------- 4
passo "4. build del frontend per il Mini (base /)"
umask 022
npm run build:mini
[ -f dist-mini/index.html ] || rosso "dist-mini/index.html assente dopo la build"

# ---------------------------------------------------------------- 5
passo "5. rsync verso $MINI:$DEST"
ESCL=(--exclude 'venv/' --exclude '.venv/' --exclude '__pycache__/' --exclude '*.pyc'
      --exclude '*.egg-info/' --exclude '.pytest_cache/' --exclude '.env*'
      --exclude '*.bak*' --exclude '.DS_Store')
rsync -a --delete "${ESCL[@]}" backend/   "$MINI:$DEST/backend/"
rsync -a --delete "${ESCL[@]}" deploy/    "$MINI:$DEST/deploy/"
rsync -a --delete "${ESCL[@]}" dist-mini/ "$MINI:$DEST/web/"
echo "   rsync completato"

# ---------------------------------------------------------------- 6
passo "6. sul Mini: pip install -e backend, riavvio del LaunchAgent"
ssh "$MINI" "export PATH=/opt/homebrew/bin:\$PATH; set -e; \
  ~/$DEST/.venv/bin/pip install --quiet -e ~/$DEST/backend; \
  ~/$DEST/.venv/bin/pip show pharmatimer-api | grep -E '^Version'; \
  launchctl bootout gui/\$(id -u) $PLIST || true; \
  launchctl bootstrap gui/\$(id -u) $PLIST; \
  sleep 3; launchctl list | grep -i pharmatimer"

# ---------------------------------------------------------------- 7
passo "7. make prod-check dopo lo schieramento"
make --no-print-directory prod-check || rosso "prod-check ROSSO DOPO lo schieramento: intervenire subito"

echo
echo "###############################################"
echo "# DEPLOY MINI: COMPLETATO -- $(git rev-parse --short HEAD)"
echo "###############################################"
