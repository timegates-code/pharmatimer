# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- v06 sul Mini e schieramento di 0.7.6

Deploy sul pilota con dati veri. Ogni atto sul Mini lanciato da Roberto dal
Terminale, un comando per volta, con lo esito riportato prima del successivo.
Nessun codice nuovo.

1. **Backup.** `mysqldump --single-transaction` piu i flag del backup notturno:
   `pharmatimer_pre-v06_20260902_111412.sql.gz`, 3114 byte, md5
   `2943802a2a5a95a819dc1e04da142c52` identico su Mini (`~/PharmaTimer/backups/`)
   e Studio (`backups_dev/`, ignorato da git). `Dump completed` presente.
2. **v06.** `apply_v06_prod.py` non ha dry-run: il surrogato e stata la sonda
   `P0b` prima e dopo. Identita `75170e5c-` verificata, `client_op_id:applied,
   uq_index:applied`, `rc=0`. Sonda dopo: `P0b` due `APPLICATA`, `P2a` con
   `idx_log_client_op_unique`, `P1b` 15 colonne, `P0` identico
   (`utenti 4, farmaci 7, log_assunzioni 9`). Il backend `0.7.5` ha continuato
   a girare sopra la colonna nuova: `/api/health` 200.
3. **Guardie.** `make g21` verde (`v06 PRESENTE`), `make prod-check` verde.
4. **Deploy.** Bundle corrente fotografato a mano sul Mini
   (`web.bak.20260902_112714`, `backend.predeploy.20260902_112714.tgz`), poi
   `bash deploy/deploy-mini.sh`: sette passi verdi, `rc=0`. Servito `0.7.6`,
   bundle `index-D0r-90Wl`, LaunchAgent pid 54121. Sonda dopo il deploy:
   `P0` identico, sonda intera identica a quella post-v06 salvo il blocco
   dello orologio. **Il Mini gira `0.7.6` con `v06`, misurato.**
5. **Targa.** `9` righe di log, `0` con targa: coerente, sono tutte pre-v06.
   Nessun utente di prova sul pilota (`Roberto` owner e paziente, `Silvana`,
   `Franco`): la verifica e **PENDENTE** sulla prima presa vera, vedi sotto.

Le sonde sono in `backups_dev/probe_prima.txt`, `probe_dopo_v06.txt`,
`probe_dopo_deploy.txt`; lo output del deploy in `deploy_0.7.6_20260902.txt`.

---

## Lettura misurata -- uso del percorso server (2 settembre 2026)

Sonde in sola lettura sul Mini: le 9 righe di `log_assunzioni`, il bundle
servito prima del deploy, la storia di `.env.mini`, la serie dei backup
notturni da `backup.out.log`, e il log di accesso di uvicorn (senza timestamp
per riga: attribuzione allo intervallo fra due riavvii datati del wrapper).

- Il pilota ha usato il percorso server **dal 27 giugno al 19 luglio**, da un
  client sulla tailnet (`100.95.100.6`, che non e lo Studio): 9 presa,
  5 saltata, 1 sospesa, 7 undo, piu farmaci e orari. Ogni bundle mai
  fotografato sul Mini porta `VITE_USE_API:"1"`, e `.env.mini` nasce cosi il
  30 maggio. Dopo il 19 luglio nessuna scrittura; il dump notturno e piatto a
  3.0K dallo 8 luglio al 2 settembre, con risoluzione di circa 100 byte.
- **Poi fermo.** Ragione DICHIARATA da Roberto, non misurata: le notifiche
  non partono ad app chiusa.
- Verifica della targa: PENDENTE sulla prima presa, sezione sotto.

Nessuna interpretazione oltre questa.

---

## Verifica pendente -- la targa in produzione

La prima presa registrata dopo il deploy deve avere `client_op_id` non nullo.
Condizione: la PWA sul telefono deve avere gia il bundle nuovo (accettare lo
aggiornamento proposto allo avvio; in Impostazioni la versione deve leggere
`3.2.0-rc.1`), perche la targa la genera il client. Una presa col bundle
vecchio arriverebbe senza targa e la sonda direbbe il falso.

Dopo la prima presa, dal Terminale:

```
ssh mini '/opt/homebrew/bin/mysql --defaults-file=/Users/marketreader/.my-pharmatimer.cnf pharmatimer -e "SELECT id, utente_id, stato, created_at, client_op_id FROM log_assunzioni ORDER BY id DESC LIMIT 3; SELECT COUNT(*) AS righe, SUM(client_op_id IS NOT NULL) AS con_targa FROM log_assunzioni;"'
```

Atteso: la riga piu recente con `client_op_id` in forma UUID v4 e `con_targa`
salito di uno. Se e `NULL`, prima si controlla la versione del bundle sul
telefono, poi si apre un reperto.

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **nessun test misura il DST** | **M1** | Fuso pinnato; sotto `UTC` arrossa solo il pin. `extendedStride.test.js` sta LONTANO dal DST per scelta. Lavoro di dominio. |
| 2 | due dosi nella **finestra del salto di primavera** | **M1** | `2026-03-29T02:30` collassa su `03:30` in Node. Stessa materia della riga 1. |
| 3 | **`computeOraPrevista` ai confini** | **M1** | Zero test dedicati. Mancano mezzanotte, offset negativi, ancora assente. |
| 4 | **contratto di campo** fra le due copie dei tipi | **M3** | Sei campi in una copia sola; `openapi.json` esiste e zero file frontend lo usano. |
| 5 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata: SQL nel router (`CLAUDE.md` 13). |
| 6 | **`deploy-mini.sh` non fotografa il bundle** prima del `rsync --delete` | -- | Il rollback richiede `web.bak.*` e `backend.predeploy.*.tgz`, fatti a mano in questa sessione. Lo script deve farlo da se, come passo fra le guardie e il rsync. |

Uscite da questa sessione: la guardia di schieramento (v06 applicata, `g21`
verde) e la semantica `0.7.5` del parcheggio (il Mini gira `0.7.6`, non ha piu
oggetto).

### Impegni ereditati ancora vivi

- **`durabilita-outbox` -- M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti. Rilievo di
  MISURA: serve accertare se la coda di uscita eredita quella fragilita.
- **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251` nomina sedi
  diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti

- `/api/health` risponde `"version":"0.1.0"` anche a `0.7.6`: il campo e
  cablato nel router e non legge la versione del pacchetto.
- `UP042` in ignore in `backend/pyproject.toml`: il Mini gira python 3.13.12,
  misurato; si puo togliere e passare a `StrEnum`, wire-neutro.
- `src/main.jsx`: il commento di bootstrap promette un passo di seed che il CP4
  ha disabilitato, e il blocco `try` ha `result.seeded` sempre falso.
- Otto documenti non sono referenziati ne da `CLAUDE.md` ne da `README`.
- Sette endpoint backend non sono mai chiamati dal frontend.
- npm: due dipendenze non usate e venti non fissate.
- Il pip del venv del Mini e `26.1.1`, disponibile `26.2.1`: avviso, non errore.
- Fuori dal repo, da rifare su una macchina nuova: `.claude/settings.local.json`
  con `sandbox.network`, e `git config core.hooksPath scripts/githooks`.

---

## Decisioni che spettano a Roberto

1. **`ricostruzione-mini`: chiuderla o no.** Il mandato diceva installazione
   completa e non incrementale, verificata per misura. Questo deploy ha
   rifatto per intero `backend/`, `deploy/` e `web/` con `rsync --delete` e ha
   reinstallato il pacchetto; il **venv** e stato aggiornato, non ricostruito.
   Se per FATTO basta il codice, e chiusa; se serve anche il venv da zero,
   resta aperta con quel solo perimetro.
2. **Le notifiche ad app chiusa: realizzarle o no.** Il README non le promette
   piu; la funzione non esiste. Il meccanismo e `setTimeout` in pagina piu
   `new Notification`, e `push_subscriptions` sta nel DB con zero riferimenti.
3. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
