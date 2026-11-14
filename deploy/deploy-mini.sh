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
# migrazione e un atto a parte -- lo apply_vNN_prod.py del suo livello, in
# backend/db/migrations/ -- e si ratifica. Un deploy di codice su un DB sotto
# livello fa fallire ogni insert di presa, che e M2: lo script esiste per
# rendere quel deploy impossibile per distrazione.
#
# Sequenza. Le guardie vengono PRIMA di tutto, anche delle precondizioni
# locali, e nessun atto sul Mini avviene prima del passo 5:
#   1. make prod-check  (servizio, bundle, openapi, censimento, e g21)
#   2. make g21         (ripetuto da solo: e LA guardia, e si nomina)
#   3. precondizioni locali: root del repo, TREE 0 e AHEAD 0 (make albero).
#      Si schiera cio che git ha e che e su origin, non cio che sta sul disco.
#   4. npm run build:mini                       -> dist-mini/
#   5. rsync backend/ deploy/ dist-mini/        -> mini:~/PharmaTimer/{backend,deploy,web}
#   6. ssh mini: pip install -e backend; poi deploy/riavvia_agenti.py installa
#      i plist di AGENTI da git in ~/Library/LaunchAgents, riavvia ciascuno nel
#      dominio gui senza lasciarlo scaricato, lo verifica e ne fa il rapporto
#   7. make prod-check di nuovo: INFO sulla versione servita, e g21 verde
#
# Cosa NON viaggia mai verso il Mini: .env* (il Mini ha il suo, e i plist
# passano i percorsi dei segreti, fuori da ~/PharmaTimer), venv, __pycache__,
# egg-info, .bak. Le esclusioni valgono anche per --delete: rsync non cancella
# cio che esclude.
#
# Derivato dalla procedura eseguita a mano e verbalizzata nel Changelog di
# Fase 3 (CP3 e CP6 delle sessioni N+5.M e N+5.Q): rsync di deploy/ e
# backend/, pip install -e sul Mini, copia dei plist in ~/Library/LaunchAgents
# (CP3), bootout + bootstrap. Dalla parte 1 del fermo visibile il riavvio sta
# in deploy/riavvia_agenti.py: prima era un bootout seguito subito dal
# bootstrap, nella stringa ssh, senza attese, tentativi ne verifica.

set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

MINI="${MINI:-mini}"                 # alias ssh, tailnet
DEST="${DEST:-PharmaTimer}"          # relativo alla home di marketreader sul Mini
# I LaunchAgent che il passo 6 installa e riavvia, in quest ordine: prima l API,
# poi la passata. Il backup resta fuori: il deploy non lo tocca. La riga resta
# in questa forma: make prod-check la legge di qui
# (scripts/audit/servizi_mini.py), e il passo 6 la passa a
# deploy/riavvia_agenti.py.
AGENTI="com.pharmatimer.api-wrapper com.pharmatimer.pianificatore"

# Cio che lo script ha compiuto sul Mini, e l atto avviato e non ancora
# concluso. Prima del passo 5 sono vuoti e un rosso dice "nessun atto"; dopo,
# un rosso dice questi, perche e da li che si interviene.
ATTI=""
IN_CORSO=""

rosso() {
  echo; echo "ROSSO  $*"
  if [ -z "$ATTI$IN_CORSO" ]; then
    echo "       Nessun atto e stato compiuto sul Mini."
  else
    if [ -n "$ATTI" ]; then echo "       Compiuto sul Mini: $ATTI."; fi
    if [ -n "$IN_CORSO" ]; then echo "       Interrotto sul Mini durante: $IN_CORSO."; fi
  fi
  exit 1
}
# Un comando che cade senza il suo rosso, sotto set -e, passa di qui e dice lo
# stesso.
trap 'rosso "interrotto alla riga $LINENO: il comando qui sopra e caduto"' ERR
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
IN_CORSO="passo 5, rsync con --delete di backend/, deploy/ e dist-mini/ verso $MINI:$DEST"
rsync -a --delete "${ESCL[@]}" backend/   "$MINI:$DEST/backend/"
rsync -a --delete "${ESCL[@]}" deploy/    "$MINI:$DEST/deploy/"
rsync -a --delete "${ESCL[@]}" dist-mini/ "$MINI:$DEST/web/"
ATTI="passo 5, rsync con --delete di backend/, deploy/ e web/ in $MINI:$DEST"
IN_CORSO=""
echo "   rsync completato"

# ---------------------------------------------------------------- 6
passo "6. sul Mini: pip install -e backend, poi deploy/riavvia_agenti.py per i LaunchAgent di AGENTI"
# Due ssh. Il primo e il pip install -e di sempre. Il secondo lancia
# deploy/riavvia_agenti.py col python del .venv, con AGENTI nel suo ordine
# (scelte 1 A e 2 A della F1 del fermo visibile, 2026-11-13). Lo script legge
# i plist da git prima di toccare qualsiasi cosa; li installa col modo 644 in
# ~/Library/LaunchAgents, perche al login automatico launchd carica solo
# quelli (ratifica A del 2026-10-01), con la copia degli installati in
# backups/; poi riavvia senza lasciare un servizio scaricato: a plist
# invariato kickstart -k per l API e nessun comando per la passata, che legge
# gia il codice nuovo; a plist cambiato, o ad agente scaricato, bootout a
# passata finita e bootstrap fino a 10 tentativi. Verifica l API con un pid
# nuovo e una passata partita dopo il riavvio e uscita con 0, e chiude
# sempre col rapporto, dove uno SCARICATO porta il comando per ricaricarlo.
# Ignora SIGHUP e SIGINT: una connessione che cade non lo ferma a meta.
IN_CORSO="passo 6, pip install -e di backend: dove si e fermato lo dice l uscita qui sopra"
ssh "$MINI" "export PATH=/opt/homebrew/bin:\$PATH; set -e; \
  ~/$DEST/.venv/bin/pip install --quiet -e ~/$DEST/backend; \
  ~/$DEST/.venv/bin/pip show pharmatimer-api | grep -E '^Version'"
ATTI="$ATTI; passo 6, pip install -e backend"
IN_CORSO="passo 6, deploy/riavvia_agenti.py per $AGENTI: lo stato di ciascuno e nel rapporto qui sopra, e senza rapporto lo dice make prod-check"
ssh "$MINI" "export PATH=/opt/homebrew/bin:\$PATH; ~/$DEST/.venv/bin/python ~/$DEST/deploy/riavvia_agenti.py $AGENTI" \
  || rosso "passo 6: il riavvio dei LaunchAgent e ROSSO. Il rapporto qui sopra dice ogni agente, e uno SCARICATO porta il comando per ricaricarlo"
ATTI="$ATTI; plist di $AGENTI installati (i sostituiti in ~/$DEST/backups/), LaunchAgent riavviati e verificati"
IN_CORSO=""

# ---------------------------------------------------------------- 7
passo "7. make prod-check dopo lo schieramento"
make --no-print-directory prod-check || rosso "prod-check ROSSO DOPO lo schieramento: intervenire subito"

echo
echo "###############################################"
echo "# DEPLOY MINI: COMPLETATO -- $(git rev-parse --short HEAD)"
echo "###############################################"
