# PharmaTimer -- target di verifica. Sessione di audit par.22.198-unoctogies.
# ASCII puro. Nessun target scrive sul prodotto.
#
# make check      lint + test + inventario, con verdetto finale verde/rosso
# make lint       oggi ROSSO per ASSENZA: nessun linter e configurato (voce 11)
# make test       vitest (frontend) e pytest (backend, se il DB e raggiungibile)
# make inventario le dodici voci, rigenerate dal disco
# make cp0        il gate di sessione; NON gira sotto sandbox (13 sonde su 24)

SHELL := /bin/bash
.PHONY: check lint test test-frontend test-backend inventario cp0 help

help:
	@echo "target: check | lint | test | inventario | cp0"

lint:
	@echo "== LINT =="
	@if [ -n "$$(ls .eslintrc* eslint.config.* .prettierrc* biome.json 2>/dev/null)" ]; then \
	  npx eslint . ; \
	else \
	  echo "ROSSO  nessun linter configurato: zero config, zero pacchetti, zero script npm."; \
	  echo "       Non e un fallimento del codice: e una ASSENZA, ed e la voce 11"; \
	  echo "       dello inventario. Il target resta rosso finche non si ratifica un linter."; \
	  exit 1; \
	fi

test-frontend:
	@echo "== TEST FRONTEND (vitest) =="
	@umask 022 && npx vitest run

test-backend:
	@echo "== TEST BACKEND (pytest) =="
	@if backend/venv/bin/python -c "import mysql.connector,sys; \
	  from pharmatimer_api.config import settings; \
	  mysql.connector.connect(host=settings.DB_HOST,port=settings.DB_PORT, \
	  user=settings.DB_USER,password=settings.DB_PASSWORD).close()" 2>/dev/null; then \
	  umask 022 && cd backend && venv/bin/python -m pytest -q ; \
	else \
	  echo "SALTATO  MySQL non raggiungibile da questo processo."; \
	  echo "         Sotto il sandbox di Claude Code il loopback e negato con EPERM"; \
	  echo "         su socket e su TCP: e ambiente, non mondo. Eseguire dal Terminale."; \
	fi

test: test-frontend test-backend

inventario:
	@python3 scripts/audit/inventario.py

cp0:
	@echo "== CP0 =="
	@echo "Il CP0 e il gate di sessione e vive in scripts/cp0.sh, 24 sonde."
	@echo "Sotto Claude Code 13 sonde su 24 arrossano per causa di AMBIENTE:"
	@echo "  5 esigono /tmp scrivibile, 1 il MySQL locale, 7 la tailnet del Mini."
	@echo "Si esegue dal Terminale:  bash scripts/cp0.sh"

check:
	@echo "###############################################"
	@echo "# make check -- PharmaTimer"
	@echo "###############################################"
	@rc=0; \
	$(MAKE) --no-print-directory lint || rc=1; \
	echo; $(MAKE) --no-print-directory test-frontend || rc=1; \
	echo; $(MAKE) --no-print-directory test-backend || rc=1; \
	echo; $(MAKE) --no-print-directory inventario || rc=1; \
	echo; echo "###############################################"; \
	if [ $$rc -eq 0 ]; then echo "# VERDETTO: VERDE"; \
	else echo "# VERDETTO: ROSSO -- vedi i blocchi marcati sopra"; fi; \
	echo "###############################################"; \
	exit $$rc
