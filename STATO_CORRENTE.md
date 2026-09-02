# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- schieramento di 0.7.7 sul Mini

Deploy sul pilota con dati veri, nessun codice nuovo. Ogni atto sul Mini
lanciato da Roberto dal Terminale, un comando per volta, esito riportato prima
del successivo. **Il Mini gira `0.7.7` con `v06`, bundle `index-AqLOZx4F`,
misurato; il telefono ha il bundle corrente, misurato dal log.**

1. **Backup.** `mysqldump --single-transaction` piu i flag del backup
   notturno, in bash sul Mini per `PIPESTATUS`: `pipe rc 0 0`, `gzip -t` ok,
   `Dump completed` presente. `pharmatimer_pre-0.7.7_20260902_191125.sql.gz`,
   3214 byte, md5 `4897801853af0a241b03d92366bce096` identico su Mini
   (`~/PharmaTimer/backups/`) e Studio (`backups_dev/`, ignorato da git).
2. **Guardie.** `make prod-check` e `make g21` verdi: bundle `index-D0r-90Wl`,
   openapi `0.7.6`, `v06 PRESENTE`. Il censimento diceva `LOG 11` contro un
   atteso "almeno 13" dichiarato da me leggendo un id come un conteggio:
   sonda `COUNT 11, MAX(id) 13`, le due righe mancanti sono sotto il 10,
   cancellazioni vecchie. Atteso mio sbagliato, dati coerenti.
3. **Fotografia a mano** prima del `rsync --delete`, perche lo script ancora
   non la fa (rimedio 4): `web.bak.20260902_191529` con `index-D0r-90Wl` e
   `backend.predeploy.20260902_191529.tgz`, 112 voci, in `~/PharmaTimer/backups/`.
4. **Deploy.** `bash deploy/deploy-mini.sh` da `820e1ed`: sette passi verdi,
   `rc 0`, `Version: 0.7.7` dal pip del Mini, LaunchAgent pid 90772,
   prod-check finale con openapi `0.7.7` da 40685 byte. Curl esplicito di
   `openapi.json`: `0.7.7`.
5. **Sonda.** `db_probe.sql` dopo il deploy contro quella dopo 0.7.6: differiscono
   solo i denominatori (`log_assunzioni` 9 -> 11, prese 4 -> 6), la targa
   `10 1 11` in P3g, e lo orologio. Ogni contatore di anomalia resta 0.
6. **Il telefono.** L'access log di uvicorn sta in
   `~/PharmaTimer/logs/api.out.log` (handler `access` su stdout), vivo riga per
   riga: verificato con un curl dallo Studio. Tre riaperture della PWA non
   hanno prodotto alcuna richiesta al Mini, neanche da Safari; causa non
   misurata. Alla quarta, "chiusa, riaperta e ricaricata al toast", il log
   porta da `100.95.100.6`: `GET /`, `GET /sw.js`,
   `GET /assets/index-AqLOZx4F.js 200`, `GET /sw.js`. Bundle corrente sul
   telefono.

Gli output stanno in `backups_dev/`: `prodcheck_pre_0.7.7_20260902.txt`,
`log_pre_0.7.7.txt`, `deploy_0.7.7_20260902.txt`, `probe_dopo_0.7.7.txt`.

**Verifica della targa in produzione: CHIUSA.** La riga 13 di
`log_assunzioni`, presa del 2 settembre alle 14:32, porta `client_op_id`
`858c8837-`; la riga 12, delle 14:09, e senza targa perche fatta col bundle di
luglio prima dell'aggiornamento. Una con targa su undici, coerente.

**Decisione 5 presa, targa annidata nel batch: forma (a).** Il server dichiara
`client_op_id` dentro `ricalcolo_dose_successiva` come campo accettato e
ignorato; il dedup resta sulla targa di primo livello; la riga D+1 resta senza
targa. E' codice e non e entrato in questo deploy: rimedio 2 sotto.

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **`/recupero` senza guardia sul minimo** | **M1** | Spec 4.7 :431 tiene il TODO su `intervallo_minimo_ore`; la decisione 2 ha guardato la sola presa. Il server accetta un recupero che anticipa sotto il minimo: oggi lo ferma solo lo slider del client (`calcolaRecuperoMax`). Stessa sede e stesso `tempo.minuti_reali`. |
| 2 | **targa annidata nel batch, forma (a) decisa** | **M3** | Meccanico: il modello pydantic del ricalcolo dichiara `client_op_id` opzionale e ignorato, con il motivo nel docstring; R4 in `ApiRepository.contratto.test.js` arrossa e il marcatore `it.fails` si toglie nello stesso commit. Nessuna sede VIETATA, nessuna migrazione, wire-neutro. |
| 3 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata: SQL nel router (`CLAUDE.md` 13). |
| 4 | **`deploy-mini.sh` non fotografa il bundle** prima del `rsync --delete` | -- | Fatto a mano per la seconda volta (`web.bak.*` e `backend.predeploy.*.tgz`). Lo script deve farlo da se, come passo fra le guardie e il rsync. |

### Impegni ereditati ancora vivi

- **`durabilita-outbox` -- M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti. Rilievo di
  MISURA: serve accertare se la coda di uscita eredita quella fragilita.
- **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251` nomina sedi
  diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti

- `/api/health` risponde `"version":"0.1.0"` anche a `0.7.7`: il campo e
  cablato nel router e non legge la versione del pacchetto.
- Le prime tre riaperture della PWA non hanno raggiunto il Mini, neanche da
  Safari, e la quarta si. Causa non misurata (tailnet del telefono, o PWA non
  davvero chiusa): se ricapita, il testimone e `api.out.log` e la sonda e un
  curl dallo Studio per distinguere log muto da rete assente.
- I due typedef `LogAssunzione` concordano su nomi e tipi ma non sulle
  parentesi di opzionalita (`IRepository.js` marca opzionali i campi nullable,
  `types.js` no): non e sul filo, dichiarato nel test S3.
- `UP042` in ignore in `backend/pyproject.toml`: il Mini gira python 3.13.12,
  misurato; si puo togliere e passare a `StrEnum`, wire-neutro.
- `src/main.jsx`: il commento di bootstrap promette un passo di seed che il CP4
  ha disabilitato, e il blocco `try` ha `result.seeded` sempre falso.
- Otto documenti non sono referenziati ne da `CLAUDE.md` ne da `README`.
- Sette endpoint backend non sono mai chiamati dal frontend.
- npm: due dipendenze non usate e venti non fissate.
- Il pip del venv del Mini e `26.1.1`, disponibile `26.2.1`: avviso, non errore.
- Sul Mini restano le fotografie di stamattina e di stasera in
  `~/PharmaTimer/backups/` (`web.bak.20260902_112714`, `web.bak.20260902_191529`
  e i due `backend.predeploy.*.tgz`): la prima e rimovibile, la seconda e il
  rollback di `0.7.7`.
- Fuori dal repo, da rifare su una macchina nuova: `.claude/settings.local.json`
  con `sandbox.network`, e `git config core.hooksPath scripts/githooks`.

---

## Decisioni che spettano a Roberto

1. **`ricostruzione-mini`: chiuderla o no.** Il mandato diceva installazione
   completa e non incrementale, verificata per misura. Due deploy hanno
   rifatto per intero `backend/`, `deploy/` e `web/` con `rsync --delete` e
   reinstallato il pacchetto; il **venv** e stato aggiornato, non ricostruito.
   Se per FATTO basta il codice, e chiusa; se serve anche il venv da zero,
   resta aperta con quel solo perimetro.
2. **Le notifiche ad app chiusa: realizzarle o no.** Il README non le promette
   piu; la funzione non esiste. Il meccanismo e `setTimeout` in pagina piu
   `new Notification`, e `push_subscriptions` sta nel DB con zero riferimenti.
3. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
4. **"sonno + 60 = 00:30 dello stesso giorno."** Spec 3.6 :258: `ora_prevista`
   e HH:MM e "mai cross-midnight, AMB-9.D". Pinnato come DICHIARATO in
   `src/domain/orarioResolver.test.js`. Tenere il wrap, o portare la dose al
   giorno dopo (cambia Spec, `planBuilder`, e le chiavi delle voci).
5. **Trascrivere la regola DST in Spec**, sezione 4: oggi vive nel commento in
   testa alla sezione di `src/utils/time.js` e nei test `*.dst`.
6. **Spec 3.1 :175, default 50% di `intervallo_minimo_ore`.** Nessuna sede lo
   realizza, ne il server ne `calcolaRecuperoMax`. Realizzarlo, nei due lati,
   o togliere la riga.
7. **Fuso fisso del server** (`tempo.FUSO_PARETE = Europe/Rome`) contro fuso
   del telefono sul client: se il paziente viaggia i due divergono. Limite
   dichiarato, non da risolvere ora.
