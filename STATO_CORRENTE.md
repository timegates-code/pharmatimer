# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- gate obbligatorio e convenzione tipografica

Cinque commit, ognuno con lint, frontend, backend e inventario verdi prima,
`make check` verde per intero dopo, e ognuno spinto attraverso lo hook.

- **Hook di pre-push**, `scripts/githooks/pre-push`, tracciato. Lancia
  `make check-prepush`: stesso corpo di `make check` (`_gate`), TREE asserito,
  AHEAD stampato come INFO perche prima del push non e zero per costruzione.
  Si attiva **una volta per clone**: `git config core.hooksPath scripts/githooks`.
  Visto rosso: un test mutato ha bloccato il push, remoto fermo.
- **GitHub Actions**, `.github/workflows/gate.yml`, su ogni push: `make check-ci`,
  con MySQL come servizio e la catena delle migrazioni applicata **da zero**.
  Misurato in locale prima: la catena rende 76 colonne e 25 indici identici a
  `pharmatimer_test`, e la suite passa 130 su 130. Il solo rosso era
  `test_seed_owner.py`, che cablava il nome del DB: ora lo deriva da settings.
  La prima corsa remota e verde. `ruff` entra fra le dipendenze dev di pyproject.
- **`deploy/deploy-mini.sh`**: `make prod-check` e `make g21` **prima di
  qualunque atto**, poi TREE 0 e AHEAD 0, build:mini, rsync, pip install -e e
  riavvio del LaunchAgent. Collaudato nel verso rosso contro il Mini di oggi:
  si e fermato al passo 1 per `g21: v06 ASSENTE`, impronta del Mini identica.
  Il verso verde e irraggiungibile finche il Mini non e migrato. **Nessun
  deploy in questa sessione.**
- **Convenzione tipografica**, in testa a `CLAUDE.md`: identificatori, path e
  comandi ASCII; prosa UTF-8; vietati invisibili, virgolette tipografiche e
  fine riga misti. La misura `scripts/audit/tipografia.py` dentro `make lint`,
  piu `ruff` PLC2401/PLC2403 ed `eslint` id-match. Misurate due violazioni in
  tutto il repo: una chiusa, una in un Changelog archiviato che non si riscrive.
  Modo stretto, nessuna baseline.

**Misurato sul Mini, di passaggio:** il venv gira python **3.13.12**, quindi
`UP042` puo uscire dallo ignore e i due enum passare a `StrEnum` (vedi minori).

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **guardia di schieramento**: livello richiesto contro applicato | **M2** | `make g21` arrossa e `deploy-mini.sh` si rifiuta. Resta da decidere QUANDO applicare `apply_v06_prod.py` sul Mini: e la sola cosa che separa il codice da un deploy. |
| 2 | **nessun test misura il DST** | **M1** | Fuso pinnato; sotto `UTC` arrossa solo il pin. `extendedStride.test.js` sta LONTANO dal DST per scelta. Lavoro di dominio. |
| 3 | due dosi nella **finestra del salto di primavera** | **M1** | `2026-03-29T02:30` collassa su `03:30` in Node. Stessa materia della riga 2. |
| 4 | **semantica `0.7.5` del parcheggio** | **M3** | A `0.7.5` una presa ripetuta rende `CONSTRAINT_VIOLATION` e non `CONFLICT`: parcheggiata come `RICHIESTA_ROTTA` senza avviso. Deriva verso il sicuro, ma il motivo che il pilota legge e falso. |
| 5 | **`computeOraPrevista` ai confini** | **M1** | Zero test dedicati. Mancano mezzanotte, offset negativi, ancora assente. |
| 6 | **contratto di campo** fra le due copie dei tipi | **M3** | Sei campi in una copia sola; `openapi.json` esiste e zero file frontend lo usano. |
| 7 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata oggi: SQL nel router (`CLAUDE.md` 13). |

### Impegni ereditati ancora vivi

- **`ricostruzione-mini` -- M1+M2.** Il Mini gira `0.7.5` e il suo DB non ha
  `v06` (14 colonne contro 15, rimisurato oggi). FATTO = installazione completa
  e non incrementale, verificata per misura. `deploy-mini.sh` e lo strumento,
  e si rifiuta finche `v06` non e applicato.
- **`durabilita-outbox` -- M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti. Rilievo di
  MISURA: serve accertare se la coda di uscita eredita quella fragilita.
- **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251` nomina sedi
  diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti

- `UP042` in ignore in `backend/pyproject.toml`: **il Mini gira python 3.13.12**,
  misurato; si puo togliere e passare a `StrEnum`, wire-neutro (il handler
  serializza con `.value`).
- `src/main.jsx`: il commento di bootstrap promette un passo di seed che il CP4
  ha disabilitato, e il blocco `try` ha `result.seeded` sempre falso.
- Otto documenti non sono referenziati ne da `CLAUDE.md` ne da `README`.
- Sette endpoint backend non sono mai chiamati dal frontend.
- npm: due dipendenze non usate e venti non fissate.
- Fuori dal repo, da rifare su una macchina nuova: `.claude/settings.local.json`
  con `sandbox.network`, e `git config core.hooksPath scripts/githooks`.

---

## Decisioni che spettano a Roberto

1. **Quando applicare `v06` in produzione.** Il codice (`0.7.6`) nomina
   `client_op_id` in 27 sedi; il Mini gira `0.7.5` e il DB non ha la colonna.
   Oggi sono coerenti e le prese si registrano. `apply_v06_prod.py` esiste ed e
   idempotente. **Ordine vincolante: migrazione PRIMA, codice DOPO.** Dopo la
   migrazione, `bash deploy/deploy-mini.sh` schiera il codice e si verifica da se.
2. **Le notifiche ad app chiusa: realizzarle o no.** Il README non le promette
   piu; la funzione non esiste. Il meccanismo e `setTimeout` in pagina piu
   `new Notification`, e `push_subscriptions` sta nel DB con zero riferimenti.
3. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
