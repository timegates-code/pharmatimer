# PharmaTimer -- gate unico di sessione. Sostituisce cp0.sh, cp0.expected,
# session_state.env, impegni.tsv e close_step.sh (sessione di smontaggio).
#
#   make check       GATE DI SESSIONE. Apertura e chiusura si fanno su questo.
#                    lint + test frontend + controllo DST + test backend +
#                    mutazioni + inventario + contatore dello STATO + albero.
#   make check-prepush  Lo stesso gate, lanciato dallo hook di pre-push:
#                    asserisce TREE e non AHEAD, che prima del push non e zero.
#   make check-ci    Lo stesso gate, lanciato da GitHub Actions su ogni push.
#   make prod-check  SOLO QUANDO SI DEPLOYA. Tocca il Mini via rete: stato del
#                    servizio, bundle, openapi, censimento, e G-21.
#   make lint        ruff (backend) + eslint (frontend) + tipografia.
#   make openapi     esporta lo schema OpenAPI dal backend vivo in
#                    backend/openapi.json (ignorato da git); lo legge il test
#                    del contratto dei tipi, e test-frontend lo rigenera prima.
#   make controllo-dst  i file *.dst.test.js lanciati SENZA ora legale devono
#                    arrossare tutti: un pin mai visto rosso non e una guardia.
#   make mutazioni   la tabella di scripts/audit/mutazioni.py: ogni riga muta
#                    il prodotto su una copia fuori dall albero e pretende il
#                    rosso dei test che nomina.
#   make inventario  le diciannove voci, rigenerate dal disco.
#   make contatore-stato  conta le voci [aperta] e [chiusa] di STATO_CORRENTE.md
#                    per sezione e appende a docs/serie-stato.tsv SOLO a
#                    conteggio cambiato. Non giudica: registra.
#
# PRINCIPIO: nessun atteso e pinnato in un file a parte. Cio che si puo derivare
# dal vivo si deriva; cio che non si puo asserire si STAMPA come INFO e si dice
# che e INFO. Un numero pinnato a mano invecchia; una derivazione no.

SHELL := /bin/bash
LINT_BASELINE := scripts/audit/lint-baseline.txt
BASE := https://marketreader-server.taila127de.ts.net
MINI_MYSQL := /opt/homebrew/bin/mysql --defaults-file=/Users/marketreader/.my-pharmatimer.cnf

# L interprete del gate e UNO, backend/venv, allineato al .venv del Mini: stessa
# versione minore di Python e, per le dipendenze di esercizio, le versioni del
# suo freeze. Nessun ripiego sul Python di sistema: i blocchi che lo usano
# dipendono da `venv`, che senza interprete arrossa e dice come ricostruirlo.
PY := backend/venv/bin/python

.PHONY: check check-prepush check-ci _gate prod-check lint lint-backend lint-frontend \
        test test-frontend test-frontend-compatto controllo-dst test-backend mutazioni \
        mutazioni-compatto inventario inventario-compatto contatore-stato albero g21 openapi \
        venv help

help:
	@echo "gate di sessione : make check"
	@echo "prima di deployare: make prod-check"
	@echo "singoli          : lint | test-frontend | controllo-dst | test-backend | mutazioni | inventario | contatore-stato | albero | openapi"

# ----------------------------------------------------------------- VENV
venv:
	@if [ ! -x $(PY) ]; then \
	  echo "ROSSO  $(PY) assente: il gate non ripiega sul Python di sistema."; \
	  echo "       Ricostruirlo con la versione minore del .venv del Mini e il suo"; \
	  echo "       freeze come vincolo: python3.13 -m venv backend/venv;"; \
	  echo "       backend/venv/bin/pip install -c <freeze del Mini> -e 'backend[dev]'"; \
	  exit 1; \
	fi

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
lint: venv
	@rc=0; \
	if [ ! -x backend/venv/bin/ruff ]; then \
	  echo "ROSSO  ruff non installato: backend/venv/bin/pip install ruff"; exit 1; \
	fi; \
	if [ ! -x node_modules/.bin/eslint ]; then \
	  echo "ROSSO  eslint non installato: npm i -D eslint"; exit 1; \
	fi; \
	nb=$$(cd backend && venv/bin/ruff check --quiet --output-format=concise . 2>/dev/null | grep -c . || true); \
	nf=$$(npx eslint . --format json 2>/dev/null | $(PY) -c 'import json,sys; print(sum(len(f["messages"]) for f in json.load(sys.stdin)))' 2>/dev/null || echo ERR); \
	nt=$$($(PY) scripts/audit/tipografia.py --conteggio 2>/dev/null || true); \
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

# ----------------------------------------------------------------- OPENAPI
# Il contratto dei tipi (decisione 3). Lo schema OpenAPI e ESPORTATO dal codice
# vivo del backend in backend/openapi.json, ignorato da git e mai pinnato. Lo
# legge src/data/repository/ApiRepository.contratto.test.js, che arrossa
# nominando questo target se il file manca. I due target di test frontend lo
# rigenerano PRIMA di vitest, cosi il gate confronta il ponte con lo schema di
# adesso e non con una copia invecchiata; `npx vitest run` da solo legge il
# file che trova sul disco, e lo si dichiara.
openapi:
	@echo "== OPENAPI: export dal backend vivo =="
	@if [ -x backend/venv/bin/python ]; then \
	  cd backend && venv/bin/python export_openapi.py openapi.json; \
	else \
	  echo "ROSSO  backend/venv/bin/python assente: python -m venv backend/venv; backend/venv/bin/pip install -e 'backend[dev]'"; exit 1; \
	fi

# ----------------------------------------------------------------- TEST
test-frontend: openapi
	@echo "== TEST FRONTEND (vitest) =="
	@umask 022 && npx vitest run

# Forma usata da make check: stampa il solo riepilogo quando e verde, e
# l output integrale quando e rosso, perche un fallimento va potuto leggere.
test-frontend-compatto: openapi
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

# ----------------------------------------------------------------- CONTROLLO DST
# Un pin verde non e un pin efficace (CLAUDE.md sez. 6). I file *.dst.test.js
# misurano lo ora legale: lo script li fa girare con TZ=Etc/UTC e una config
# senza pin, e pretende che OGNI loro test arrossi. E lo unico blocco del gate
# che e verde quando la suite che lancia e rossa, ed e voluto: il rosso e la
# misura. Dettaglio degli esiti in testa a scripts/audit/controllo_dst.py.
controllo-dst: venv
	@$(PY) scripts/audit/controllo_dst.py

test-backend: venv
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

# ----------------------------------------------------------------- MUTAZIONI
# Collaudo per mutazione dei pin M1 e M3 (CLAUDE.md sez. 6). Ogni riga della
# tabella in scripts/audit/mutazioni.py muta il prodotto su una COPIA
# dell albero di lavoro in una cartella temporanea, mai sul posto, e pretende
# il rosso dei test che nomina. Sede per contenuto: se non si trova piu, ROSSO.
# Usa il DB di test di test-backend, e lo verifica prima di ogni pytest; per
# questo sta dopo test-backend, di cui condivide la precondizione MySQL.
# Esiti e autoprova in testa allo script.
mutazioni: venv
	@$(PY) scripts/audit/mutazioni.py

# Forma usata da make check: il solo esito quando e verde, il dettaglio quando
# e rosso.
mutazioni-compatto: venv
	@$(PY) scripts/audit/mutazioni.py --compatto
	@echo "   dettaglio: make mutazioni"

# ----------------------------------------------------------------- INVENTARIO
inventario: venv
	@$(PY) scripts/audit/inventario.py

# Forma usata da make check: il solo esito per voce, calcolato dalla voce stessa.
inventario-compatto: venv
	@$(PY) scripts/audit/inventario.py --compatto
	@echo "   dettaglio: make inventario"

# ----------------------------------------------------------------- CONTATORE
# Conta le voci dello STATO per sezione e le registra in docs/serie-stato.tsv,
# tracciato. NON GIUDICA: nessun conteggio fa arrossare; arrossa solo lo
# strumento (autoprova del riconoscitore) o uno STATO illeggibile.
# Sta PRIMA di albero, e scrive SOLO a conteggio cambiato: cosi una riga nuova
# e un TREE sporco atteso alla chiusura, che entra nel commit dello STATO, e
# all apertura l albero resta pulito per costruzione. La serie registra i
# CAMBIAMENTI dello STATO, non le esecuzioni del gate.
# SERIE_SCRIVI=no in prepush e ci: li scrivere sporcherebbe TREE dopo il
# commit, e il conteggio diverso si stampa come INFO.
SERIE_SCRIVI ?= si

contatore-stato: venv
	@echo "== CONTATORE STATO: voci [aperta] e [chiusa] per sezione (registra, non giudica) =="
	@$(PY) scripts/audit/contatore_stato.py --scrivi $(SERIE_SCRIVI)

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
	echo; $(MAKE) --no-print-directory controllo-dst || rc=1; \
	echo; $(MAKE) --no-print-directory test-backend || rc=1; \
	echo; $(MAKE) --no-print-directory mutazioni-compatto || rc=1; \
	echo; $(MAKE) --no-print-directory inventario-compatto || rc=1; \
	echo; $(MAKE) --no-print-directory contatore-stato || rc=1; \
	echo; $(MAKE) --no-print-directory albero || rc=1; \
	echo; echo "###############################################"; \
	if [ $$rc -eq 0 ]; then echo "# VERDETTO: VERDE"; else echo "# VERDETTO: ROSSO -- vedi i blocchi marcati sopra"; fi; \
	echo "###############################################"; \
	exit $$rc

check:
	@$(MAKE) --no-print-directory _gate ALBERO_AHEAD=si \
	  TITOLO="make check -- gate di sessione PharmaTimer"

# Lanciato dallo hook scripts/githooks/pre-push. Identico a check tranne che
# AHEAD non e asserito (vedi ALBERO) e la serie non si scrive (vedi CONTATORE).
check-prepush:
	@$(MAKE) --no-print-directory _gate ALBERO_AHEAD=no SERIE_SCRIVI=no \
	  TITOLO="make check-prepush -- gate di pre-push: TREE asserito, AHEAD no"

# Lanciato da .github/workflows/gate.yml su ogni push. Stesso corpo; AHEAD non
# e asserito perche un checkout di CI non ha upstream e il push e gia avvenuto,
# e la serie non si scrive (vedi CONTATORE).
check-ci:
	@$(MAKE) --no-print-directory _gate ALBERO_AHEAD=no SERIE_SCRIVI=no \
	  TITOLO="make check-ci -- gate di GitHub Actions: TREE asserito, AHEAD no"

# ----------------------------------------------------------------- G-21
g21: venv
	@echo "== G-21: livello di migrazione RICHIESTO dal codice contro APPLICATO sul Mini =="
	@req=$$($(PY) scripts/audit/inventario.py --voce 19 | grep 'LIVELLO MINIMO RICHIESTO' | sed 's/.*: //'); \
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
