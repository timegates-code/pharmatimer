# PharmaTimer -- gate unico di sessione. Sostituisce cp0.sh, cp0.expected,
# session_state.env, impegni.tsv e close_step.sh (sessione di smontaggio).
#
#   make check       GATE DI SESSIONE. Apertura e chiusura si fanno su questo.
#                    lint + test frontend + test backend + inventario + albero.
#   make prod-check  SOLO QUANDO SI DEPLOYA. Tocca il Mini via rete: stato del
#                    servizio, bundle, openapi, censimento, e G-21.
#   make lint        ruff (backend) + eslint (frontend).
#   make inventario  le diciannove voci, rigenerate dal disco.
#
# PRINCIPIO: nessun atteso e pinnato in un file a parte. Cio che si puo derivare
# dal vivo si deriva; cio che non si puo asserire si STAMPA come INFO e si dice
# che e INFO. Un numero pinnato a mano invecchia; una derivazione no.

SHELL := /bin/bash
LINT_BASELINE := scripts/audit/lint-baseline.txt
BASE := https://marketreader-server.taila127de.ts.net
MINI_MYSQL := /opt/homebrew/bin/mysql --defaults-file=/Users/marketreader/.my-pharmatimer.cnf

.PHONY: check prod-check lint lint-backend lint-frontend test test-frontend test-backend \
        inventario albero g21 help

help:
	@echo "gate di sessione : make check"
	@echo "prima di deployare: make prod-check"
	@echo "singoli          : lint | test-frontend | test-backend | inventario | albero"

# ----------------------------------------------------------------- LINT
lint-backend:
	@echo "-- ruff (backend) --"
	@if [ -x backend/venv/bin/ruff ]; then \
	  cd backend && venv/bin/ruff check . ; \
	else \
	  echo "ROSSO  ruff non installato: backend/venv/bin/pip install ruff"; exit 1; \
	fi

lint-frontend:
	@echo "-- eslint (frontend) --"
	@if [ -x node_modules/.bin/eslint ]; then \
	  npx eslint . ; \
	else \
	  echo "ROSSO  eslint non installato: npm i -D eslint"; exit 1; \
	fi

lint:
	@rc=0; \
	if [ -f "$(LINT_BASELINE)" ]; then \
	  echo "== LINT (modo BASELINE: rosso solo se i reperti CRESCONO) =="; \
	  echo "   conteggio da --format json: il formato unix non esiste in eslint 10 e rendeva 0"; \
	  bb=$$(grep '^backend=' "$(LINT_BASELINE)" | cut -d= -f2); \
	  bf=$$(grep '^frontend=' "$(LINT_BASELINE)" | cut -d= -f2); \
	  nb=$$(cd backend && venv/bin/ruff check --quiet --output-format=concise . 2>/dev/null | grep -c . || true); \
	  nf=$$(npx eslint . --format json 2>/dev/null | python3 -c 'import json,sys; print(sum(len(f["messages"]) for f in json.load(sys.stdin)))' 2>/dev/null || echo 0); \
	  echo "   backend  baseline=$$bb  ora=$$nb"; \
	  echo "   frontend baseline=$$bf  ora=$$nf"; \
	  if [ "$$nb" -gt "$$bb" ] || [ "$$nf" -gt "$$bf" ]; then \
	    echo "ROSSO  i reperti sono CRESCIUTI rispetto alla baseline"; rc=1; \
	  elif [ "$$nb" -lt "$$bb" ] || [ "$$nf" -lt "$$bf" ]; then \
	    echo "VERDE  reperti in calo: aggiornare $(LINT_BASELINE) (puo solo SCENDERE)"; \
	  else \
	    echo "VERDE  reperti invariati"; \
	  fi; \
	else \
	  echo "== LINT (modo STRETTO: nessuna baseline, ogni reperto e rosso) =="; \
	  $(MAKE) --no-print-directory lint-backend || rc=1; \
	  $(MAKE) --no-print-directory lint-frontend || rc=1; \
	fi; \
	exit $$rc

# ----------------------------------------------------------------- TEST
test-frontend:
	@echo "== TEST FRONTEND (vitest) =="
	@umask 022 && npx vitest run

test-backend:
	@echo "== TEST BACKEND (pytest) =="
	@echo "-- precondizione: MySQL di dev raggiungibile (ex sonda DEV_UUID) --"
	@if uuid=$$(mysql -N -B -e 'SELECT LEFT(@@server_uuid,9)' 2>/dev/null) && [ -n "$$uuid" ]; then \
	  echo "   OK  server_uuid = $$uuid"; \
	  umask 022 && cd backend && venv/bin/python -m pytest -q ; \
	else \
	  echo "ROSSO  MySQL di dev NON raggiungibile: la suite backend non puo girare."; \
	  echo "       Sotto il sandbox di Claude Code il loopback e negato con EPERM su"; \
	  echo "       socket e su TCP: e ambiente, non mondo. Eseguire dal Terminale."; \
	  exit 1; \
	fi

test: test-frontend test-backend

# ----------------------------------------------------------------- INVENTARIO
inventario:
	@python3 scripts/audit/inventario.py

# ----------------------------------------------------------------- ALBERO
albero:
	@echo "== ALBERO (da git VIVO, nessun atteso pinnato) =="
	@rc=0; \
	tree=$$(git status --porcelain | wc -l | tr -d ' '); \
	ahead=$$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?"); \
	echo "   HEAD     = $$(git rev-parse --short HEAD)"; \
	echo "   DESCRIBE = $$(git describe --tags 2>/dev/null || echo '(nessun tag)')"; \
	if [ "$$tree" = "0" ]; then echo "   OK    TREE  = 0"; \
	else echo "   ROSSO TREE  = $$tree (voci non committate)"; git status --porcelain | sed 's/^/         /'; rc=1; fi; \
	if [ "$$ahead" = "0" ]; then echo "   OK    AHEAD = 0"; \
	else echo "   ROSSO AHEAD = $$ahead (commit non spinti)"; rc=1; fi; \
	exit $$rc

# ----------------------------------------------------------------- CHECK
check:
	@echo "###############################################"
	@echo "# make check -- gate di sessione PharmaTimer"
	@echo "###############################################"
	@rc=0; \
	$(MAKE) --no-print-directory lint || rc=1; \
	echo; $(MAKE) --no-print-directory test-frontend || rc=1; \
	echo; $(MAKE) --no-print-directory test-backend || rc=1; \
	echo; $(MAKE) --no-print-directory inventario || rc=1; \
	echo; $(MAKE) --no-print-directory albero || rc=1; \
	echo; echo "###############################################"; \
	if [ $$rc -eq 0 ]; then echo "# VERDETTO: VERDE"; else echo "# VERDETTO: ROSSO -- vedi i blocchi marcati sopra"; fi; \
	echo "###############################################"; \
	exit $$rc

# ----------------------------------------------------------------- G-21
g21:
	@echo "== G-21: livello di migrazione RICHIESTO dal codice contro APPLICATO sul Mini =="
	@req=$$(python3 scripts/audit/inventario.py --voce 19 | grep 'LIVELLO MINIMO RICHIESTO' | sed 's/.*: //'); \
	echo "   richiesto dal codice : $$req"; \
	app=$$(ssh mini '$(MINI_MYSQL) pharmatimer -N -B -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='"'"'log_assunzioni'"'"' AND COLUMN_NAME='"'"'client_op_id'"'"'"' 2>/dev/null); \
	if [ "$$app" = "1" ]; then \
	  echo "   applicato sul Mini   : v06 PRESENTE"; echo "   OK    livelli compatibili"; \
	elif [ "$$app" = "0" ]; then \
	  echo "   applicato sul Mini   : v06 ASSENTE"; \
	  echo "   ROSSO il Mini e SOTTO il livello richiesto dal codice."; \
	  echo "         Schierare senza migrare fa fallire OGNI insert di presa (M2)."; \
	  echo "         Ordine vincolante: backend/db/migrations/apply_v06_prod.py PRIMA, codice DOPO."; \
	  exit 1; \
	else \
	  echo "   applicato sul Mini   : NON MISURABILE (Mini irraggiungibile da qui)"; \
	  echo "   ROSSO senza la misura del bersaglio il confronto non esiste."; exit 1; \
	fi

# ----------------------------------------------------------------- PROD-CHECK
prod-check:
	@echo "###############################################"
	@echo "# make prod-check -- SOLO prima di un deploy"
	@echo "###############################################"
	@rc=0; tmp=$$(mktemp -d); \
	echo "== SERVIZIO =="; \
	code=$$(curl -s -o $$tmp/root.html -w '%{http_code}' "$(BASE)/" || echo 000); \
	if [ "$$code" = "200" ]; then echo "   OK    ROOT = 200"; \
	else echo "   ROSSO ROOT = $$code (atteso 200)"; rc=1; fi; \
	echo "   INFO  BUNDLE = $$(grep -oE 'index-[A-Za-z0-9_-]*\.js' $$tmp/root.html | sort -u | head -1 | sed 's/\.js$$//')"; \
	curl -s "$(BASE)/openapi.json" -o $$tmp/openapi.json; \
	echo "   INFO  OPENAPI_BYTES = $$(wc -c < $$tmp/openapi.json | tr -d ' ')"; \
	echo "   INFO  OPENAPI_VER   = $$(grep -oE '"version":"[^"]*"' $$tmp/openapi.json | cut -d'"' -f4)"; \
	echo; echo "== CENSIMENTO PRODUZIONE (INFO: mosso dal pilota, non e un atteso) =="; \
	ssh mini '$(MINI_MYSQL) pharmatimer -N -B -e "SELECT LEFT(@@server_uuid,9); SELECT COUNT(*) FROM utenti; SELECT COUNT(*) FROM permessi; SELECT COUNT(*) FROM farmaci WHERE attivo=1; SELECT COUNT(*) FROM log_assunzioni;"' > $$tmp/prod.txt 2>&1 || true; \
	echo "   INFO  PROD_UUID = $$(sed -n '1p' $$tmp/prod.txt)"; \
	echo "   INFO  UTENTI    = $$(sed -n '2p' $$tmp/prod.txt)"; \
	echo "   INFO  PERMESSI  = $$(sed -n '3p' $$tmp/prod.txt)"; \
	echo "   INFO  FARMACI   = $$(sed -n '4p' $$tmp/prod.txt)"; \
	echo "   INFO  LOG       = $$(sed -n '5p' $$tmp/prod.txt)"; \
	rm -rf $$tmp; \
	echo; $(MAKE) --no-print-directory g21 || rc=1; \
	echo; echo "###############################################"; \
	if [ $$rc -eq 0 ]; then echo "# PROD-CHECK: VERDE -- deploy ammesso"; \
	else echo "# PROD-CHECK: ROSSO -- NON deployare"; fi; \
	echo "###############################################"; \
	exit $$rc
