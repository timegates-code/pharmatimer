# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`.

---

## Ultima sessione -- rimedi meccanici, la prima col gate nuovo

Sette commit, ognuno con `make check` verde prima e dopo, ognuno spinto.

- **Sandbox.** `.claude/settings.local.json` porta ora `sandbox.network` con
  `allowLocalBinding` e `allowUnixSockets`. Da qui `make check` gira **per
  intero** sotto Claude Code, backend compreso. Il file **non e tracciato**: su
  una macchina nuova va rimesso a mano. Il Mini resta fuori, quindi
  `make prod-check` e `make g21` si eseguono dal Terminale.
- **Gate compatto.** `make check` stampa i conteggi del lint, il riepilogo di
  vitest e il solo esito per voce dello inventario. Il dettaglio resta su
  `make inventario`, `make test-frontend`, `make lint-backend`,
  `make lint-frontend`. Lo esito per voce lo calcola la voce stessa.
- **Lint a zero, modo STRETTO.** `scripts/audit/lint-baseline.txt` e eliminato:
  ogni reperto ora arrossa. Chiuso anche un falso verde della harness, per cui
  un eslint che crashava veniva contato come zero reperti.
- **Igiene.** Rimossi sette stub morti, sette `.bak`, `backend/requirements.txt`
  (fonte unica `pyproject.toml`), la riga `*.bak` duplicata in `.gitignore`, e
  le due impalcature vuote `repository/` e `services/`.
- **Fuso pinnato** a `Europe/Rome` in `vitest.config.js`, verificato da
  `src/test/timezone.test.js`.
- **Targa.** `defaultNewId` ripiega su `crypto.getRandomValues` in forma UUID v4
  quando `crypto.randomUUID` manca, che e il caso del Mini in http. Mai
  `Math.random`. Sette test nuovi, ramo di ripiego compreso.
- **Documenti.** README corretto sulle notifiche, clausola del gate riscritta in
  `CLAUDE.md` 4 e 11 e nel Makefile, lezione **#82** mintata, e nuova
  **sezione 13 di `CLAUDE.md`**, la convenzione di cartelle.

`backend/.gitignore` NON e stato unificato: misurato che e la sola sede che
tiene fuori dal repo `backend/venv/`, `backend/.env.dev` e `.pytest_cache/`.

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **guardia di schieramento**: livello richiesto contro applicato | **M2** | Esiste come `make g21` e arrossa. Resta da decidere QUANDO applicare `apply_v06_prod.py` sul Mini. |
| 2 | **nessun test misura il DST** | **M1** | Il fuso e ora pinnato, ma il controllo positivo dice che sotto `UTC` arrossa solo il pin: i 1047 test preesistenti passano identici. `extendedStride.test.js` dichiara da se di stare LONTANO dal DST. Serve lavoro di dominio. |
| 3 | due dosi nella **finestra del salto di primavera** | **M1** | Misurato in Node: `2026-03-29T02:30` collassa su `03:30`, e due orari di piano distinti diventano lo stesso istante. Stessa materia della riga 2. |
| 4 | **semantica `0.7.5` del parcheggio** | **M3** | A `0.7.5` una presa ripetuta rende `CONSTRAINT_VIOLATION` e non `CONFLICT`: lo elemento e parcheggiato come `RICHIESTA_ROTTA` senza avviso. Deriva verso il sicuro, ma il motivo che il pilota legge e falso. |
| 5 | **`computeOraPrevista` ai confini** | **M1** | Zero test dedicati sulla funzione che decide quando una dose e dovuta. Mancano mezzanotte, offset negativi, ancora assente. |
| 6 | **contratto di campo** fra le due copie dei tipi | **M3** | Sei campi vivono in una copia sola; `openapi.json` esiste e zero file frontend lo usano. |
| 7 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Oggi la norma dichiarata e SQL nel router (`CLAUDE.md` 13). |

### Impegni ereditati ancora vivi

- **`ricostruzione-mini` -- M1+M2.** Il Mini gira `0.7.5` e il suo DB non ha
  `v06` (14 colonne contro 15, misurato). Un CS-6 su Mini stantio produce GREEN
  FALSO. FATTO = installazione completa e non incrementale, verificata per
  misura.
- **`durabilita-outbox` -- M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti mentre
  `localStorage` persiste. Rilievo di MISURA, non di riparazione: serve
  accertare se la coda di uscita eredita quella fragilita.
- **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251` nomina sedi
  diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti

- `src/main.jsx`: il commento di bootstrap promette un passo di seed che il CP4
  ha disabilitato, e il blocco `try` ha `result.seeded` sempre falso.
- `README.md` e scritto con lettere accentate, contro la convenzione tipografica
  di `CLAUDE.md`. Normalizzarlo e un atto a se.
- `UP042` e in ignore in `backend/pyproject.toml`: si toglie il giorno in cui si
  misura python >= 3.11 sul Mini e si passa a `StrEnum`.
- Otto documenti non sono referenziati ne da `CLAUDE.md` ne da `README`.
- Sette endpoint backend non sono mai chiamati dal frontend.
- npm: due dipendenze non usate e venti non fissate.

---

## Decisioni che spettano a Roberto

1. **Quando applicare `v06` in produzione.** Il codice (`0.7.6`) nomina
   `client_op_id` in 27 sedi; il Mini gira `0.7.5` e il DB non ha la colonna.
   Oggi sono coerenti e le prese si registrano. Schierare senza migrare fa
   fallire OGNI insert di presa. `apply_v06_prod.py` esiste ed e idempotente.
   **Ordine vincolante: migrazione PRIMA, codice DOPO.** `make g21` lo sorveglia.
2. **Le notifiche ad app chiusa: realizzarle o no.** Il README non le promette
   piu, quindi non c e piu un documento che mente; ma la funzione non esiste. Il
   meccanismo e `setTimeout` in pagina piu `new Notification`, e
   `push_subscriptions` sta nel DB con zero riferimenti nel codice.
3. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
