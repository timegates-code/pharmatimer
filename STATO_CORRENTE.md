# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- analisi in sola lettura: promemoria ad app chiusa

Nessun codice, nessuna modifica di prodotto, nessun deploy. Un workflow a
sedici agenti (nove di misura sul repo e sul web, tre progettisti
indipendenti, tre giudici, una sintesi) piu misure mie sul repo e sul Mini in
sola lettura. **Dodici agenti completati, quattro falliti per limite di
spesa: i tre giudici e la sintesi; mai partite la confutazione a tre lenti e
il critico di completezza.** Il rapporto e composto dai dodici risultati letti
per intero.

Tutto sta in **`docs/analisi/promemoria-app-chiusa/`**: `INDICE.md` (quale
fase e stata eseguita e quale no), `rapporto.md` e `rapporto.html`, i dodici
risultati in `agenti/` (JSON come restituito piu resa in Markdown), il journal
grezzo del workflow in `workflow/`.

Esito: i tre progettisti, con angoli diversi, hanno prodotto lo stesso ordine
di opzioni. **A** calendario pubblicato dal telefono e Web Push dal Mini
(dichiarativo su iOS 18.4+, service worker su Android; 6-10 sessioni, zero
euro). **B** motore delle occorrenze sul Mini (10-15 sessioni, doppia verita
del piano; sicura solo con profilo sul server, purge delle ricalcolate orfane
e vettori d'oro in entrambe le suite). **C** Pushover come trasporto di
riserva (1-3 sessioni sopra A, circa dieci dollari). **D** involucro Capacitor
con notifiche locali di sistema (la piu forte sui TRE MAI, 99 USD/anno, tocca
un VIETATO). La finestra M1 di una presa fatta offline non e eliminabile da
nessun canale server-side; la chiude solo D.

Misurato sul Mini: non dorme (`sleep 0`, zero eventi a log, uptime 28
giorni); certificato ts.net rinnovato da solo, valido fino al 24 ottobre 2026;
`profilo_utente` a zero righe; `push_subscriptions` a zero righe; egress verso
Apple, Google e Mozilla push raggiungibile; venv in `~/PharmaTimer/.venv`
senza cryptography ne pywebpush. Utente 2: 7 farmaci attivi, 5 nel ramo esteso
o `fisso_date`, una riga `ricalcolata` orfana, 2 righe di log negli ultimi 7
giorni.

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **`/recupero` senza guardia sul minimo** | **M1** | Spec 4.7 :431 tiene il TODO su `intervallo_minimo_ore`; la decisione 2 ha guardato la sola presa. Il server accetta un recupero che anticipa sotto il minimo: oggi lo ferma solo lo slider del client (`calcolaRecuperoMax`). Stessa sede e stesso `tempo.minuti_reali`. |
| 2 | **targa annidata nel batch, forma (a) decisa** | **M3** | Meccanico: il modello pydantic del ricalcolo dichiara `client_op_id` opzionale e ignorato, con il motivo nel docstring; R4 in `ApiRepository.contratto.test.js` arrossa e il marcatore `it.fails` si toglie nello stesso commit. Nessuna sede VIETATA, nessuna migrazione, wire-neutro. |
| 3 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata: SQL nel router (`CLAUDE.md` 13). |
| 4 | **`deploy-mini.sh` non fotografa il bundle** prima del `rsync --delete` | -- | Fatto a mano per la seconda volta (`web.bak.*` e `backend.predeploy.*.tgz`). Lo script deve farlo da se, come passo fra le guardie e il rsync. |

### Rilievi di misura di questa sessione, da pinnare rossi prima di contarli difetti

- **Dose oltre la mezzanotte persa al rollover -- M2 sul promemoria.**
  `rescheduleAllNotifications` fa `cancelAll` e riprogramma solo
  `selectEntriesForDay(oggi)`: la dose di ieri con `ora_ricalcolata` a oggi
  ha `dateStr` di ieri e non viene riprogrammata; il primo `visibilitychange`
  dopo mezzanotte cancella il timer armato la sera prima. Sondato sui
  selettori, non esercitato con vitest. Sede del fix da decidere (selettore
  su data effettiva o finestra con ieri incluso). Qualunque canale nuovo
  erediterebbe lo stesso selettore.
- **`new Notification()` su Chrome Android.** Secondo MDN browser-compat-data
  il costruttore lancia sempre `TypeError` e `notifications.js` lo chiama
  senza `try/catch`: i timer di pagina non suonerebbero sul moto g06. Dedotto,
  da esercitare sul telefono.

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
- Il click della notifica naviga a `/oggi` assoluto ignorando `BASE_URL`
  (corretto sulla build del Mini, rotto su GitHub Pages); la copy "Avviso poco
  prima di ogni dose" contro un fuoco all'istante; Spec 2.1 :140 e 8.1 :583
  promettono ancora push via PWA mentre 11.5.2 le rimanda. Da allineare nel
  commit che introduce il canale, mai nel Changelog congelato.
- Otto documenti non sono referenziati ne da `CLAUDE.md` ne da `README`.
- Sette endpoint backend non sono mai chiamati dal frontend.
- npm: due dipendenze non usate e venti non fissate.
- Il pip del venv del Mini e `26.1.1`, disponibile `26.2.1`: avviso, non errore.
- Sul Mini restano le fotografie del 2 settembre in `~/PharmaTimer/backups/`
  (`web.bak.20260902_112714`, `web.bak.20260902_191529` e i due
  `backend.predeploy.*.tgz`): la prima e rimovibile, la seconda e il
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
2. **Le notifiche ad app chiusa: realizzarle o no, e per quale via.** Il
   README non le promette piu; la funzione non esiste. Il rapporto in
   `docs/analisi/promemoria-app-chiusa/` porta quattro opzioni e le scartate;
   le sue dieci decisioni sono le voci 8-17 qui sotto. Il primo passo
   proposto da tutti e tre i progettisti e una sessione di sola sonda sul
   telefono vero, senza codice nel repo.
3. **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
4. **"sonno + 60 = 00:30 dello stesso giorno."** Spec 3.6 :258: `ora_prevista`
   e HH:MM e "mai cross-midnight, AMB-9.D". Pinnato come DICHIARATO in
   `src/domain/orarioResolver.test.js`. Tenere il wrap, o portare la dose al
   giorno dopo (cambia Spec, `planBuilder`, e le chiavi delle voci). Qualunque
   canale di promemoria eredita la scelta.
5. **Trascrivere la regola DST in Spec**, sezione 4: oggi vive nel commento in
   testa alla sezione di `src/utils/time.js` e nei test `*.dst`.
6. **Spec 3.1 :175, default 50% di `intervallo_minimo_ore`.** Nessuna sede lo
   realizza, ne il server ne `calcolaRecuperoMax`. Realizzarlo, nei due lati,
   o togliere la riga.
7. **Fuso fisso del server** (`tempo.FUSO_PARETE = Europe/Rome`) contro fuso
   del telefono sul client: se il paziente viaggia i due divergono. Limite
   dichiarato, non da risolvere ora. Entra nell'opzione B del rapporto, non
   nelle altre.

Le dieci che seguono vengono dalla sezione 10 del rapporto e valgono solo se
la decisione 2 e "realizzarle".

8. **Il bivio DESIGN-B.** Calendario pubblicato dal telefono (A) contro
   motore sul Mini (B). I tre progettisti concordano su A per la verita unica
   del piano; B solo se "avvisi anche dopo giorni senza aprire l'app" viene
   ratificato come requisito clinico, non misurato per il pilota.
9. **Q9=A da riaprire per lettera.** APScheduler dentro FastAPI (ratifica di
   maggio 2026, mai eseguita) contro un LaunchAgent separato; i tre
   concordano sul LaunchAgent, divergono fra passata a intervallo e processo
   residente (irrilevante finche il Mini non dorme).
10. **Emettitore unico o due sorgenti.** Tenere i timer di pagina accanto al
    push accettando su iPhone un doppio simultaneo ad app aperta; tacerli con
    subscription attiva; o decidere dopo la sonda con un gate sull'ultima
    pubblicazione riuscita. I tre progettisti divergono.
11. **Ricalcolo D+1 rifiutato dal server:** il push segue il valore del
    server (passato dalla guardia del minimo) o l'ora pubblicata dal telefono
    finche la rilettura non riallinea.
12. **Orizzonte pubblicato** (tre giorni, ieri-domani, sette giorni) **e fine
    orizzonte** (avviso "apri PharmaTimer per aggiornare i promemoria" o solo
    dichiarazione).
13. **Testo verso terzi**, solo per C: nome del farmaco sui server di Pushover
    o testo neutro.
14. **Sblocco di `vite.config.js` per una riga** `workbox.importScripts`, e
    sede del modulo di rete additivo che importa `apiClient` senza
    modificarlo.
15. **Custodia VAPID:** PEM 0600 nella home del Mini con backup fuori
    macchina, o altra sede.
16. **Tolleranza e TTL:** 20 o 30 minuti dopo l'ora; TTL fino a 30 minuti,
    un'ora o sei ore.
17. **Ordine dei lavori:** sonda sul telefono senza codice, poi ratifica con
    la scheda a quattro campi, poi migrazione prima del codice, backend con
    passata vista rossa, client con SW, settimana di accettazione con C
    pronta come riserva.
