# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- le tre decisioni di dominio, in codice e test

Un commit per decisione, ratifica esplicita prima di ogni modifica al
percorso della presa, collaudo per mutazione su ogni cancello: diciannove
mutazioni, diciannove rossi attesi, ripristini verificati per impronta.
Nessun deploy: il Mini gira ancora `0.7.6`, il repo porta `0.7.7`.

1. **DST, ibrido dichiarato** (`dc00f61`). Il piano vive in ora di parete, le
   guardie in minuti reali. `wallToInstant` in `src/utils/time.js` e la porta
   unica fra i due mondi: la ora inesistente di marzo scivola al primo istante
   esistente (02:30 del 29 marzo diventa 03:00; prima collassava su 03:30), la
   ora doppia di ottobre conta la prima occorrenza. `computeOraPrevistaOnDay`
   risolve la etichetta sul giorno nelle cinque sedi che la materializzano.
   `DomainError('ORARIO_NON_RISOLVIBILE')` al posto di TypeError e `'NaN:NaN'`,
   con contenimento PER DOSE: la voce resta nel piano come "orario non
   risolvibile", inerte, e le altre dosi restano. `make controllo-dst` e nel
   gate: i file `*.dst.test.js` girano senza ora legale e devono arrossare
   tutti (24 su 24). Il ricalcolo resta aritmetica di parete: 7 ore reali il
   29 marzo e 9 il 25 ottobre, dichiarato in `recalc.dst.test.js`.
2. **Intervallo minimo lato server** (`f5b7e88`). La presa si registra
   sempre; se e sotto `intervallo_minimo_ore` dalla presa piu vicina dello
   stesso farmaco, nei due versi, qualunque dose e qualunque data, il 201
   porta `avviso` in minuti reali (`backend/pharmatimer_api/tempo.py`, via
   UTC: 420 nella notte del 29 marzo, non 480) e il client mostra la scheda
   "Due dosi molto vicine", che resta finche letta. Il ricalcolo nested sotto
   il minimo dalla presa non scrive D+1 e risponde
   `ricalcolo: rifiutato_intervallo_minimo`; `applicato` e
   `omesso_stato_destinazione` nominano gli altri esiti, il secondo era muto
   dal s.6.269. Minimo NULL = nessuna guardia. Nessuna migrazione.
3. **Contratto dei tipi** (`012e34a`). `make openapi` esporta lo schema dal
   backend vivo in `backend/openapi.json` (ignorato da git, rigenerato prima
   dei test frontend). `src/data/repository/ApiRepository.contratto.test.js`
   confronta campo per campo pydantic, i due typedef `LogAssunzione` e il
   ponte vero: i sei campi di una copia sola della voce 16 sono dichiarati per
   scelta con il motivo, `ora_effettiva` e pinnata nei due versi, scavalco
   della mezzanotte compreso. Il typedef di `IRepository.js` diceva HH:MM:
   rettificato a ISO con secondi, come il produttore.

**Divergenza vera, fatta vedere e non sanata.** Il ponte manda `client_op_id`
dentro `ricalcolo_dose_successiva` e il server non lo dichiara (commento in
`ApiRepository.js` :399-404). Misurato con una sonda transitoria: 201,
ricalcolo applicato, la riga della presa porta la targa di primo livello, la
riga D+1 ha `client_op_id` NULL, pydantic scarta il campo in silenzio. Il test
R4 e in forma `it.fails`, lo xfail stretto di vitest: passa finche la
divergenza esiste e arrossa il giorno in cui un lato la chiude, cosi chiusura
e rimozione del marcatore viaggiano insieme. Quale lato muovere e in coda.

Il venv dello Studio e stato reinstallato in modo editable, senza dipendenze,
perche lo export dello schema legga `0.7.7`; il Mini non e stato toccato.

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

Si esegue, non si rimisura. Ordinata per rischio clinico. Uscite in questa
sessione le righe DST, salto di primavera, `computeOraPrevista` ai confini e
contratto di campo.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **`/recupero` senza guardia sul minimo** | **M1** | Spec 4.7 :431 tiene il TODO su `intervallo_minimo_ore`; la decisione 2 ha guardato la sola presa. Il server accetta un recupero che anticipa sotto il minimo: oggi lo ferma solo lo slider del client (`calcolaRecuperoMax`). Stessa sede e stesso `tempo.minuti_reali`. |
| 2 | **targa annidata nel batch** | **M3** | Divergenza vera fra ponte e server, misurata sopra e guardata da R4. Aspetta la decisione 5 sotto, poi un commit che chiude un lato e toglie `it.fails` insieme. |
| 3 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata: SQL nel router (`CLAUDE.md` 13). |
| 4 | **`deploy-mini.sh` non fotografa il bundle** prima del `rsync --delete` | -- | Il rollback richiede `web.bak.*` e `backend.predeploy.*.tgz`, fatti a mano allo ultimo deploy. Lo script deve farlo da se, come passo fra le guardie e il rsync. |

### Impegni ereditati ancora vivi

- **`durabilita-outbox` -- M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti. Rilievo di
  MISURA: serve accertare se la coda di uscita eredita quella fragilita.
- **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251` nomina sedi
  diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti

- `/api/health` risponde `"version":"0.1.0"` anche a `0.7.7`: il campo e
  cablato nel router e non legge la versione del pacchetto.
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
- Fuori dal repo, da rifare su una macchina nuova: `.claude/settings.local.json`
  con `sandbox.network`, e `git config core.hooksPath scripts/githooks`.

---

## Decisioni che spettano a Roberto

1. **`ricostruzione-mini`: chiuderla o no.** Il mandato diceva installazione
   completa e non incrementale, verificata per misura. Lo ultimo deploy ha
   rifatto per intero `backend/`, `deploy/` e `web/` con `rsync --delete` e ha
   reinstallato il pacchetto; il **venv** e stato aggiornato, non ricostruito.
   Se per FATTO basta il codice, e chiusa; se serve anche il venv da zero,
   resta aperta con quel solo perimetro.
2. **Le notifiche ad app chiusa: realizzarle o no.** Il README non le promette
   piu; la funzione non esiste. Il meccanismo e `setTimeout` in pagina piu
   `new Notification`, e `push_subscriptions` sta nel DB con zero riferimenti.
3. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
4. **Schierare `0.7.7`.** Porta la guardia dello intervallo minimo e gli
   esiti del ricalcolo sul 201, il contratto dei tipi e il DST. Nessuna
   migrazione: `make g21` resta su v06. Ordine: `make prod-check` dal
   Terminale, poi `bash deploy/deploy-mini.sh`. Il bundle nuovo serve anche
   al telefono: la scheda "Due dosi molto vicine" e lo scivolamento DST
   vivono nel client.
5. **La targa annidata nel batch: quale lato muovere.** (a) Il server la
   dichiara come campo opzionale ignorato, formalizzando cio che gia fa;
   (b) il ponte smette di mandarla, coerente con Spec 14.6 p.1 (UNA targa per
   elemento, sulla presa), ma tocca `ApiRepository.js`, che e VIETATO e
   richiede ratifica; (c) il server la scrive sulla riga D+1, che cambia il
   dedupe della coppia (14.6 p.4: "o tutta o niente") e va progettato.
   In ogni caso R4 arrossa e il marcatore `it.fails` si toglie nello stesso
   commit.
6. **"sonno + 60 = 00:30 dello stesso giorno."** Spec 3.6 :258: `ora_prevista`
   e HH:MM e "mai cross-midnight, AMB-9.D". Pinnato come DICHIARATO in
   `src/domain/orarioResolver.test.js`. Tenere il wrap, o portare la dose al
   giorno dopo (cambia Spec, `planBuilder`, e le chiavi delle voci).
7. **Trascrivere la regola DST in Spec**, sezione 4: oggi vive nel commento in
   testa alla sezione di `src/utils/time.js` e nei test `*.dst`.
8. **Spec 3.1 :175, default 50% di `intervallo_minimo_ore`.** Nessuna sede lo
   realizza, ne il server ne `calcolaRecuperoMax`. Realizzarlo, nei due lati,
   o togliere la riga.
9. **Fuso fisso del server** (`tempo.FUSO_PARETE = Europe/Rome`) contro fuso
   del telefono sul client: se il paziente viaggia i due divergono. Limite
   dichiarato, non da risolvere ora.
