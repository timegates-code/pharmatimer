# PharmaTimer -- gate unico di sessione. Sostituisce cp0.sh, cp0.expected,
# session_state.env, impegni.tsv e close_step.sh (sessione di smontaggio).
#
#   make check       GATE DI SESSIONE. Apertura e chiusura si fanno su questo.
#                    lint + test frontend + test backend + inventario + albero.
#   make check-prepush  Lo stesso gate, lanciato dallo hook di pre-push:
#                    asserisce TREE e non AHEAD, che prima del push non e zero.
#   make check-ci    Lo stesso gate, lanciato da GitHub Actions su ogni push.
#   make prod-check  SOLO QUANDO SI DEPLOYA. Tocca il Mini via rete: stato del
#                    servizio, bundle, openapi, censimento, e G-21.
#   make lint        ruff (backend) + eslint (frontend) + tipografia.
#   make inventario  le diciannove voci, rigenerate dal disco.
#
# PRINCIPIO: nessun atteso e pinnato in un file a parte. Cio che si puo derivare
# dal vivo si deriva; cio che non si puo asserire si STAMPA come INFO e si dice
# che e INFO. Un numero pinnato a mano invecchia; una derivazione no.

SHELL := /bin/bash
LINT_BASELINE := scripts/audit/lint-baseline.txt
BASE := https://marketreader-server.taila127de.ts.net
MINI_MYSQL := /opt/homebrew/bin/mysql --defaults-file=/Users/marketreader/.my-pharmatimer.cnf

.PHONY: check check-prepush check-ci _gate prod-check lint lint-backend lint-frontend \
        test test-frontend test-frontend-compatto test-backend inventario \
        inventario-compatto albero g21 help

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

# I conteggi: unica fonte per i due modi. --format json perche il formato unix
# non esiste in eslint 10 e rendeva 0, che e un falso verde.
lint:
	@rc=0; \
	if [ ! -x backend/venv/bin/ruff ]; then \
	  echo "ROSSO  ruff non installato: backend/venv/bin/pip install ruff"; exit 1; \
	fi; \
	if [ ! -x node_modules/.bin/eslint ]; then \
	  echo "ROSSO  eslint non installato: npm i -D eslint"; exit 1; \
	fi; \
	nb=$$(cd backend && venv/bin/ruff check --quiet --output-format=concise . 2>/dev/null | grep -c . || true); \
	nf=$$(npx eslint . --format json 2>/dev/null | python3 -c 'import json,sys; print(sum(len(f["messages"]) for f in json.load(sys.stdin)))' 2>/dev/null || echo ERR); \
	nt=$$(python3 scripts/audit/tipografia.py --conteggio 2>/dev/null || true); \
	case "$$nt" in ''|*[!0-9]*) echo "ROSSO  tipografia: scripts/audit/tipografia.py non ha reso un conteggio"; exit 1;; esac; \
	if [ "$$nf" = "ERR" ]; then \
	  echo "ROSSO  eslint non ha prodotto un rapporto leggibile: e la HARNESS a essere"; \
	  echo "       rotta, non il codice. Prima il conteggio ripiegava a 0, che in modo"; \
	  echo "       stretto e un FALSO VERDE. Dettaglio: make lint-frontend"; \
	  exit 1; \
	fi; \
	if [ -f "$(LINT_BASELINE)" ]; then \
	  echo "== LINT (modo BASELINE: rosso solo se i reperti CRESCONO) =="; \
	  bb=$$(grep '^backend=' "$(LINT_BASELINE)" | cut -d= -f2); \
	  bf=$$(grep '^frontend=' "$(LINT_BASELINE)" | cut -d= -f2); \
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
	  echo "   backend    reperti=$$nb"; \
	  echo "   frontend   reperti=$$nf"; \
	  echo "   tipografia reperti=$$nt   (invisibili, virgolette tipografiche, fine riga misti, path)"; \
	  echo "   dettaglio: make lint-backend | make lint-frontend | python3 scripts/audit/tipografia.py"; \
	  if [ "$$nb" -gt 0 ] || [ "$$nf" -gt 0 ] || [ "$$nt" -gt 0 ]; then \
	    echo "ROSSO  reperti presenti: il modo stretto non ne ammette"; rc=1; \
	  else \
	    echo "VERDE  zero reperti"; \
	  fi; \
	fi; \
	exit $$rc

# ----------------------------------------------------------------- TEST
test-frontend:
	@echo "== TEST FRONTEND (vitest) =="
	@umask 022 && npx vitest run

# Forma usata da make check: stampa il solo riepilogo quando e verde, e
# l output integrale quando e rosso, perche un fallimento va potuto leggere.
test-frontend-compatto:
	@echo "== TEST FRONTEND (vitest, riepilogo) =="
	@out=$$(umask 022 && npx vitest run 2>&1); rc=$$?; \
	if [ $$rc -eq 0 ]; then \
	  printf '%s\n' "$$out" | grep -E '^[[:space:]]*(Test Files|Tests|Duration)' \
	    | sed 's/^[[:space:]]*/   /'; \
	  echo "   dettaglio: make test-frontend"; \
	else \
	  echo "ROSSO  vitest: segue lo output integrale"; \
	  printf '%s\n' "$$out"; \
	fi; \
	exit $$rc

test-backend:
	@echo "== TEST BACKEND (pytest) =="
	@echo "-- precondizione: MySQL di dev raggiungibile (ex sonda DEV_UUID) --"
	@if uuid=$$(mysql -N -B -e 'SELECT LEFT(@@server_uuid,9)' 2>/dev/null) && [ -n "$$uuid" ]; then \
	  echo "   OK  server_uuid = $$uuid"; \
	  umask 022 && cd backend && venv/bin/python -m pytest -q ; \
	else \
	  echo "ROSSO  MySQL di dev NON raggiungibile: la suite backend non puo girare."; \
	  echo "       Se il messaggio e Operation not permitted, e il sandbox di Claude"; \
	  echo "       Code: serve sandbox.network in .claude/settings.local.json, con"; \
	  echo "       allowLocalBinding per il TCP e allowUnixSockets per il socket,"; \
	  echo "       scritto col path RISOLTO /private/tmp/mysql.sock. Altrimenti e"; \
	  echo "       MySQL che non gira: avviarlo, o eseguire dal Terminale."; \
	  exit 1; \
	fi

test: test-frontend test-backend

# ----------------------------------------------------------------- INVENTARIO
inventario:
	@python3 scripts/audit/inventario.py

# Forma usata da make check: il solo esito per voce, calcolato dalla voce stessa.
inventario-compatto:
	@python3 scripts/audit/inventario.py --compatto
	@echo "   dettaglio: make inventario"

# ----------------------------------------------------------------- ALBERO
# ALBERO_AHEAD=no asserisce il solo TREE. Serve allo hook di pre-push, dove
# AHEAD NON e zero PER COSTRUZIONE -- il push esiste appunto per portarlo a
# zero -- e asserirlo bloccherebbe ogni push, cioe sarebbe un gate sempre
# chiuso, che e la forma peggiore di guardia. Li AHEAD si STAMPA come INFO.
ALBERO_AHEAD ?= si

albero:
	@echo "== ALBERO (da git VIVO, nessun atteso pinnato) =="
	@rc=0; \
	tree=$$(git status --porcelain | wc -l | tr -d ' '); \
	ahead=$$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?"); \
	echo "   HEAD     = $$(git rev-parse --short HEAD)"; \
	echo "   DESCRIBE = $$(git describe --tags 2>/dev/null || echo '(nessun tag)')"; \
	if [ "$$tree" = "0" ]; then echo "   OK    TREE  = 0"; \
	else echo "   ROSSO TREE  = $$tree (voci non committate)"; git status --porcelain | sed 's/^/         /'; rc=1; fi; \
	if [ "$(ALBERO_AHEAD)" = "si" ]; then \
	  if [ "$$ahead" = "0" ]; then echo "   OK    AHEAD = 0"; \
	  else echo "   ROSSO AHEAD = $$ahead (commit non spinti)"; rc=1; fi; \
	else \
	  echo "   INFO  AHEAD = $$ahead -- NON asserito: prima del push non e zero per costruzione"; \
	fi; \
	exit $$rc

# ----------------------------------------------------------------- CHECK
# Un solo corpo per i due gate, cosi non possono divergere. TITOLO e
# ALBERO_AHEAD lo parametrizzano; le variabili da riga di comando scendono
# da sole ai sub-make.
_gate:
	@echo "###############################################"
	@echo "# $(TITOLO)"
	@echo "###############################################"
	@rc=0; \
	$(MAKE) --no-print-directory lint || rc=1; \
	echo; $(MAKE) --no-print-directory test-frontend-compatto || rc=1; \
	echo; $(MAKE) --no-print-directory test-backend || rc=1; \
	echo; $(MAKE) --no-print-directory inventario-compatto || rc=1; \
	echo; $(MAKE) --no-print-directory albero || rc=1; \
	echo; echo "###############################################"; \
	if [ $$rc -eq 0 ]; then echo "# VERDETTO: VERDE"; else echo "# VERDETTO: ROSSO -- vedi i blocchi marcati sopra"; fi; \
	echo "###############################################"; \
	exit $$rc

check:
	@$(MAKE) --no-print-directory _gate ALBERO_AHEAD=si \
	  TITOLO="make check -- gate di sessione PharmaTimer"

# Lanciato dallo hook scripts/githooks/pre-push. Identico a check tranne che
# AHEAD non e asserito (vedi ALBERO).
check-prepush:
	@$(MAKE) --no-print-directory _gate ALBERO_AHEAD=no \
	  TITOLO="make check-prepush -- gate di pre-push: TREE asserito, AHEAD no"

# Lanciato da .github/workflows/gate.yml su ogni push. Stesso corpo; AHEAD non
# e asserito perche un checkout di CI non ha upstream e il push e gia avvenuto.
check-ci:
	@$(MAKE) --no-print-directory _gate ALBERO_AHEAD=no \
	  TITOLO="make check-ci -- gate di GitHub Actions: TREE asserito, AHEAD no"

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
