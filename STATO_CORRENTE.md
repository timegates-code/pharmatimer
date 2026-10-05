# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura: `make check`. Chiusura: `make check` prima del commit; dopo il
push `TREE` e `AHEAD` letti con git e l esito della CI, senza rilanciare il
gate (CLAUDE.md 4 e 8).** Prima di un deploy: `make prod-check`, poi `bash
deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- il deploy del canale, aperto un giorno prima, 2026-10-05

La sessione del deploy, preparata il 04/10 per la finestra di martedi 06/10, e
partita lunedi 05/10: misurato con `date` sullo Studio alle 10:58:58 e
confermato da Roberto. **Nessuna apertura di rito:** ne `make check` in
apertura, ne la lettura del giro di StockFusion; vale il gate prima del
commit. Decisione della consulenza, su delega di Roberto: oggi niente sul Mini
e nessun atto della sequenza; il deploy resta domani, con una sessione nuova e
un prompt rivisto.

**Fatto: le verifiche sul codice** che la sequenza chiede prima degli atti,
sole letture sullo Studio fra le 11:00 e le 11:03. I due plist del repo portano
per `DB_DEFAULTS_FILE`, `DB_NAME` e `VAPID_PEM_FILE` gli stessi valori della
riga della v07 e dell'atto della chiave, e nessuno dei due porta `VAPID_SUB`.
`canale.py` legge la chiave con tre controlli: file leggibile, PEM non cifrato,
EC P-256; nessuno su modo o proprietario. `VAPID_SUB` la leggono dal `.env.dev`
del Mini tutti e due i servizi, che partono in `backend/`, e il rsync del
deploy esclude `.env*`. L'import dell'app di `820e1ed` non apre connessioni e
non scrive: il pool nasce solo nel `lifespan`, che l'import non esegue.
**In testa a `CLAUDE.md`**, la riga sui dati dell'utente 2: di prova
realistici, senza uso reale, con M3 per intero.

**Permessi di Claude Code, misurati oggi alle 11:04.** Sono una fotografia,
non una norma: la fonte sono i file, che chi ne ha bisogno rilegge, e qui non
si aggiornano. `~/.claude/settings.json`: modo `default`, nessuna lista.
`.claude/settings.json`: deny su Edit e Write di `apiClient.js`,
`ApiRepository.js` e `vite.config.js`, i vietati della sezione 7.
`.claude/settings.local.json`: sandbox acceso con `autoAllowBashIfSandboxed`
falso, quindi ogni comando chiede il permesso; in rete il socket di MySQL e il
loopback (`allowLocalBinding`); qualche allow puntuale lasciato da sessioni
passate.

**Non fatto.** Nessun atto sul Mini. La sonda del loopback va alla sessione
del gate, con la voce 7 della coda. Nessuna riga di codice.

**Deviazioni.** Nessuna dalla Spec.

**Cosa resta: il deploy, domani 06/10.** Dal Terminale dello Studio girano
`make prod-check` e `bash deploy/deploy-mini.sh`. Dal Terminale sul Mini:
l'installazione dal lock, la chiave VAPID (15), `VAPID_SUB` nel `.env.dev` e
`apply_v07_prod.py`, perche g21 pretende la v07; prima di tutto si portano
dallo Studio i cinque file che quegli atti usano: `requirements.lock`,
`installa-dal-lock.sh`, `v07_push.sql`, `apply_v07_push.py` e
`apply_v07_prod.py`. Quest'ultimo vuole `DB_DEFAULTS_FILE` e
`DB_NAME=pharmatimer` sulla riga di comando, perche il `.env.dev` del Mini
porta `pharmatimer_dev`. Sequenza, punti d'arresto e attesi stanno nel prompt
di domani. **Gia in produzione dal 03/09,** nel client `80cf0f2`: `ccce837`
(la dose oltre la mezzanotte non si perde al rollover) e `3d098a6` (il
costruttore che lancia non porta giu la catena). **Con il canale vanno in
produzione** il riarmo dei timer all'apertura a freddo (35) e la correzione
del 404 del 02/10. **Sull'iPhone, dopo il deploy:** il caso della 31, presa
registrata offline e poi il push (la prova sullo Studio non misura iOS); e il
rinnovo all'apertura quando la subscription va ricreata senza gesto, oggi non
misurato.

---

### Accesso alla PWA: come funziona, misurato il 3 settembre 2026

La PWA reinstallata sull'iPhone chiedeva il token. Misura sul codice e lettura
del Mini, piu una scrittura sul DB di produzione il cui esito non e a verbale.

- **Il token e per UTENTE, non per dispositivo.** `apiClient` manda
  `X-User-Token` letto solo da `localStorage['pharmatimer.userToken']`; il
  server confronta lo SHA-256 con `utenti.token_hash`. Nessuna sessione,
  nessuna scadenza, nessun refresh. Una riga per utente, nessuna tabella che
  leghi un token a un device.
- **Un token emesso NON e recuperabile dal server:** SHA-256 a senso unico.
  Non e nel bundle (`VITE_USER_TOKEN` non compare in alcun file di codice o di
  build; `.env.mini` e 15 byte con la sola `VITE_USE_API=`). Vive solo dove e
  stato annotato e nel `localStorage` di un device autenticato. RICONFERMA:
  gia escluso empiricamente per l'owner di dev, Changelog Fase 3 :10025.
- **Non esiste una procedura di rotazione.** `seed_owner.py` rifiuta con exit 1
  se un owner esiste; `utenti.py` espone solo `POST /utenti` (owner-only, crea
  un utente NUOVO) e `DELETE /utenti/{id}`. Ruotare un token e un UPDATE
  diretto sul DB di produzione, cioe una scrittura da ratificare ogni volta.
- **Su `UNAUTHORIZED` la coda di uscita si FERMA e l'elemento RESTA**, mai
  parcheggiato e mai scartato (`SyncRepository.js` :576): una rotazione di
  token non perde prese. L'outbox vive in IndexedDB, e l'auto-clear del token
  tocca solo `localStorage`.
- **Gli utenti in produzione sono QUATTRO**, misurati: `id=1` Roberto **owner**
  (27 maggio), `id=2` Roberto **paziente** (30 giugno), `id=3` e `id=4`,
  pazienti. L'owner ha admin su tutti e quattro, ciascun paziente ha il
  self-permesso. **Tutti e 7 i farmaci attivi sono dell'utente 2**; 3 e 4 hanno
  zero farmaci. Il pilota e dunque `id=2` per i dati, ma l'owner e `id=1`: sono
  due segreti distinti, e quello dell'owner e l'unico che apre `POST /utenti`.
- **Esito:** l'accesso e stato ripristinato con un token il cui SHA-256
  coincide con `utenti.token_hash` di `id=2`, verificato contro il DB vivo.
  **Non e a verbale se l'UPDATE di rotazione abbia toccato una riga o zero:**
  la guardia proposta portava `ruolo = 'owner'` mentre l'utente 2 e `paziente`,
  quindi avrebbe bloccato, e l'esito non e stato riportato. Se ha toccato una
  riga, la fotografia del vecchio hash e in `~/pt-utente2-prima.txt` sullo
  Studio ed e l'unica via per tornare indietro.
- **Rilievo di metodo, mio.** La guardia dava per misurato che `id=2` fosse
  owner -- lo suggerisce `CLAUDE.md`, ma non era stato sondato, e la sonda che
  avevo dato filtrava su `id=2` senza mostrare gli altri: non poteva smentirmi.
- **Misurato il 2026-09-18:** il token che apre la PWA e quello del
  `localStorage` del telefono, leggibile da Safari sul Mac (Develop, l'iPhone,
  Home Screen Web Apps, scheda Storage, Local Storage, chiave
  `pharmatimer.userToken`); la voce Keychain `pharmatimer-token-2` non era
  stata aggiornata dalla rotazione del 3 settembre. Vedi decisione 23.

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | [aperta] **`/recupero` senza guardia sul minimo** | **M1** | Spec 4.7 :431 tiene il TODO su `intervallo_minimo_ore`; la decisione 2 ha guardato la sola presa. Il server accetta un recupero che anticipa sotto il minimo: oggi lo ferma solo lo slider del client (`calcolaRecuperoMax`). Stessa sede e stesso `tempo.minuti_reali`. Misurato il 2026-09-18: **non ha presa sulla terapia vera**, tutta `fisso` e `fisso_date` -- servono insieme `tipo_frequenza='intervallo'` e `intervallo_minimo_ore` valorizzata. |
| 2 | [aperta] **Ricalcolo D+1 rifiutato: il riallineamento riporta la D+1 all'ora prevista, sotto il minimo** | **M1** | Misurato il 2026-09-29 con una sonda sulle sedi vere (fuori dal repo): presa alle 23:30 nella notte del cambio d'ora di primavera, D+1 ricalcolata alle 07:30 rifiutata; lo specchio la cancella alla rilettura (`LocalRepository.js` :539), e il piano la riporta prevista alle 07:00, 390 minuti reali dopo la presa, contro un minimo di 450. Al tocco il server registra la presa con l'avviso "Due dosi molto vicine". **Con il canale acceso il rilievo arriva anche ad app chiusa:** per la A della 11, log e pubblicazione vuoti fanno partire un push di dose all'ora prevista. Oggi non è raggiungibile: la D+1 ricalcolata nasce solo per i farmaci a intervallo, e la terapia vera non ne ha. **Va chiuso prima che un farmaco a intervallo con un minimo entri in terapia.** La forma del rimedio non è decisa; la sonda va riscritta nel repo come pin, rosso prima del rimedio. |
| 3 | [aperta] **targa annidata nel batch, forma (a) decisa** | **M3** | Meccanico: il modello pydantic del ricalcolo dichiara `client_op_id` opzionale e ignorato, con il motivo nel docstring; R4 in `ApiRepository.contratto.test.js` arrossa e il marcatore `it.fails` si toglie nello stesso commit. Nessuna sede VIETATA, nessuna migrazione, wire-neutro. |
| 4 | [aperta] **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata: SQL nel router (`CLAUDE.md` 13). |
| 5 | [aperta] **`deploy-mini.sh` non fotografa il bundle** prima del `rsync --delete` | -- | Fatto a mano per la seconda volta (`web.bak.*` e `backend.predeploy.*.tgz`). Lo script deve farlo da se, come passo fra le guardie e il rsync. **Riconferma del 2026-10-04:** il 03/09 alle 20:03 e stato schierato il client `80cf0f2`, senza foto e senza verbale. Elemento nuovo: un deploy intero senza la foto fatta a mano e senza un commit che lo racconti. |
| 6 | [aperta] **Il meccanismo delle orfane** | M3 | Il cambio di profilo cancella le ricalcolate solo in locale (`ApiRepository.js` :66-69) e lo specchio le rimette alla lettura successiva; la giunzione `(farmaco_id, dose_numero)` non e una FK: e la D2 della 20. Materia di record, non condizione del canale (decisione 22 A). Forma del rimedio non decisa: portare la cancellazione al server tocca l invariante dello specchio (`mirrorLogWindow`) e la meccanica M1 della voce 2. |
| 7 | [aperta] **La suite di backend ha una sola difesa contro il server sbagliato** | **M2** | Rilievi della sonda sulla suite del 2026-10-04, riletti alle sedi il 2026-10-05; si risolvono nella sessione del gate, dopo l'accettazione del canale. (1) `CLAUDE.md` dice che col sandbox il Mini resta fuori: e dedotto falso, perche il loopback dello Studio comprende la 3307, il tunnel di StockFusion. Riletto oggi: la stessa affermazione sta nella sezione 4 ("il Mini resta fuori") e nella 11 ("Cio che resta fuori e la tailnet"). Si misura per analogia su una porta di loopback libera, senza toccare il tunnel, e le due righe si correggono sulla misura. (2) La difesa e un solo strato: i valori di `backend/.env.dev` dello Studio, ignorato da git, e l'assenza di `DB_*` nell'ambiente. `cleanup_test_data`, autouse in `backend/tests/conftest.py`, svuota con TRUNCATE le tabelle di `_TRUNCATE_ORDER` a chiavi esterne spente, prima di ogni test e sul server che quei valori nominano, senza verificarlo. Rimedio: prima del primo TRUNCATE la fixture verifica l'identita del server, non solo i nomi. La barriera di StockFusion, tutto in sola lettura, qui non si copia: i nostri test scrivono. (3) Il default della passata e l'invio vero (`invia=invio.invia` in `pianificatore.passata`) e ogni test lo sostituisce: non e voce, perche gli endpoint dei test sono inventati. |

### Rilievi chiusi, e cio che resta aperto sotto di loro

I due rilievi di misura della sessione precedente sono stati pinnati rossi e
chiusi (`ccce837`, `3d098a6`). Restano aperte due cose che quei commit NON
toccano:

- [aperta] **La sonda sul moto g06.** Il `TypeError` del costruttore resta dedotto da
  MDN browser-compat-data. Da esercitare sul telefono, senza codice nel repo.
- [chiusa] **Righe di log aperte e irraggiungibili sul Mini: sono DUE, non una.**
  Misurato oggi in sola lettura. La `ricalcolata` orfana e `id=6`: farmaco 10
  TEST-Intervallo8, 2026-07-04, dose 2, `ora_prevista` 13:00, `ora_ricalcolata`
  19:37, `gap_minuti` 247, nata nello stesso secondo della presa `id=5` come
  D+1 di quella presa, con un intervallo di 8 ore che oggi vale 48.0. Il suo
  slot NON esiste piu: `orari_base` per il farmaco 10 ha la sola dose 1
  (`assoluto` +480). La giunzione `(farmaco_id, dose_numero)` fra
  `log_assunzioni` e `orari_base` non e una FK, quindi nulla lo impedisce --
  elemento non censito altrove (sonda a due chiavi su Changelog, `git log` e
  STATO; la misura "zero orfani su tre giunzioni" del Changelog archiviato ha
  un perimetro che la voce non enumera). La seconda riga e `id=11`: farmaco 11
  TEST-Ext48, 2026-07-19, dose 1, stato **`prevista`**. Entrambe sono fuori
  dalla finestra del piano (`[ieri, oggi, domani]`) per sempre: nessun verbo le
  chiudera. Nessun effetto sul piano di oggi; si vedono solo in Cronologia.
  **CHIUSO dalla decisione 18 il 2026-09-18:** sono dati di prova, quindi
  cancellarle non e M3, e spariscono con la ripulitura dell utente 2. Resta la
  causa, che e la 22. **ESEGUITA il 2026-09-18:** le due righe sono cadute con
  la ripulitura dell'utente 2 (atto 2 della 19), zero residui misurati.

### Impegni ereditati ancora vivi

- [aperta] **`durabilita-outbox` -- M2.** `src/data/db.js` :245-250 dichiara che su
  WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti. Rilievo di
  MISURA: serve accertare se la coda di uscita eredita quella fragilita.
- [aperta] **`guardia-demo-apimode` -- M1+M3.** La deviazione `s.6.251` nomina sedi
  diverse da quelle della propria sorgente. Rilievo di MISURA.

### Minori, aperti e non urgenti

- [aperta] `/api/health` risponde `"version":"0.1.0"` anche a `0.7.7`: il campo e
  cablato nel router e non legge la versione del pacchetto.
- [aperta] Le prime tre riaperture della PWA non hanno raggiunto il Mini, neanche da
  Safari, e la quarta si. Causa non misurata (tailnet del telefono, o PWA non
  davvero chiusa): se ricapita, il testimone e `api.out.log` e la sonda e un
  curl dallo Studio per distinguere log muto da rete assente.
- [aperta] I due typedef `LogAssunzione` concordano su nomi e tipi ma non sulle
  parentesi di opzionalita (`IRepository.js` marca opzionali i campi nullable,
  `types.js` no): non e sul filo, dichiarato nel test S3.
- [aperta] Validatore data_specifica contro tipo_frequenza: OrariBulkPayload._validate_bulk
  (backend/pharmatimer_api/models/orario.py:106) impone che data_specifica sia
  tutta valorizzata o tutta nulla, ma NON verifica che tipo_frequenza sia
  'fisso_date' quando e valorizzata. La coerenza fra i due campi non e misurata
  da alcun validatore backend.
- [aperta] `UP042` in ignore in `backend/pyproject.toml`: il Mini gira python 3.13.12,
  misurato; si puo togliere e passare a `StrEnum`, wire-neutro.
- [aperta] `src/main.jsx`: il commento di bootstrap promette un passo di seed che il CP4
  ha disabilitato, e il blocco `try` ha `result.seeded` sempre falso.
- [chiusa] Il click della notifica naviga a `/oggi` assoluto ignorando `BASE_URL`
  (corretto sulla build del Mini, rotto su GitHub Pages); la copy "Avviso poco
  prima di ogni dose" contro un fuoco all'istante; Spec 2.1 :140 e 8.1 :583
  promettono ancora push via PWA mentre 11.5.2 le rimanda. Da allineare nel
  commit che introduce il canale, mai nel Changelog congelato. **Allineati nel
  commit B del client:** il tocco porta avanti la finestra senza navigarla
  (10 A), la copy dice l avviso all ora e ad app aperta, Spec 2.1, 6.1 e 8.1
  descrivono il codice. La 11.5.2 resta: e storica.
- [aperta] Otto documenti non sono referenziati ne da `CLAUDE.md` ne da `README`.
- [aperta] Sette endpoint backend non sono mai chiamati dal frontend: i sette
  storici. Quelli del canale li chiama `src/data/repository/canale.js` dal
  commit B del client.
- [chiusa] CLAUDE.md 13 portava "67 `cur.execute` nei cinque router": tolto il
  2026-10-01 invece di aggiornarlo, perche nessun controllo lo leggeva (sonda
  su `git grep` e sui file che leggono CLAUDE.md).
- [aperta] npm: due dipendenze non usate e venti non fissate.
- [aperta] Il pip dei venv di Studio e Mini e `26.1.1`, disponibile `26.2.1`: avviso, non
  errore. pip non e nel lock: si aggiorna sui due venv insieme, o su nessuno.
- [aperta] Sul Mini, in `~/PharmaTimer/backups/`, misurato il 2026-09-18: restano
  `web.bak.20260902_191529` e `backend.predeploy.20260902_191529.tgz`, il
  rollback di `0.7.7` (la fotografia delle 11:27 non c'e piu); i dump notturni
  degli ultimi 7 giorni; i pre-B, pre-bbis e predeploy-v05 di giugno; e
  `pharmatimer-pre-19-20260918-010223.sql.gz`, la fotografia pre-ripulitura.
- [aperta] **Osservazioni 3-6 della prova a mano del commit B, 2026-10-02.**
  (3) Un farmaco nuovo parte da domani per impostazione. (4) "Verifica ora"
  rilegge lo stato del canale ma non iscrive: iscrive solo la riga di Oggi.
  (5) Il toggle "Notifiche dosi" non mostra se e acceso o spento. (6)
  All accensione le iscrizioni nascono a coppie, una sostituita entro un
  secondo (30 e 31, 32 e 33, 35 e 36 in `pharmatimer_dev`), e la 71 e nata e
  stata revocata alle 12:13:11, dopo lo spegnimento. Forse clic ripetuti: da
  verificare che un accensione produca un iscrizione sola.
- [aperta] Fuori dal repo, da rifare su una macchina nuova: `.claude/settings.json`
  con la deny sui vietati della sezione 7, `.claude/settings.local.json` con
  `sandbox.network`, e `git config core.hooksPath scripts/githooks`. L'assetto
  stabile dei permessi e materia della sessione del gate.

---

## Decisioni che spettano a Roberto

1. [chiusa] **`ricostruzione-mini`: chiuderla o no.** Il mandato diceva installazione
   completa e non incrementale, verificata per misura. Due deploy hanno
   rifatto per intero `backend/`, `deploy/` e `web/` con `rsync --delete` e
   reinstallato il pacchetto; il **venv** e stato aggiornato, non ricostruito.
   Se per FATTO basta il codice, e chiusa; se serve anche il venv da zero,
   resta aperta con quel solo perimetro. Misurato il 2026-09-28: il `.venv`
   del Mini porta `setuptools` 82.0.1 e `wheel` 0.47.0, che `02-setup`
   installa e che il pacchetto non richiede a esercizio.
   **CHIUSA il 2026-09-29, lettera A**, su questa misura: per FATTO basta il
   codice, e il venv del Mini coincide con quello dello Studio sui 25 pacchetti
   di esercizio comuni.
2. [aperta] **Le notifiche ad app chiusa: DECISA il 2026-09-17, lettera W.** Si
   realizzano via Web Push, ramo A o B secondo la decisione 8. Il canale
   nasce come **PROMEMORIA DIURNO** e lo dichiara in README e in Spec 6 nel
   commit che lo introduce (regola critica 3). Fonti della ratifica:
   `rapporto.md` :380-733, `sonda-iphone-esiti.md` per intero (sotto,
   esiti), e la campagna in git da `ca2f581` a `c4a6c1d`.
   - **La notte.** Le dosi nella finestra di sonno NON sono un requisito
     oggi. Non e escluso che lo diventino con la terapia vera (decisione
     19). Se la 19 le porta, D si apre come decisione nuova con la sua
     sonda (D1-D3, `rapporto.md` :848-858). Il lavoro di A non la avvicina
     e lo si sa: il rapporto dichiara il riuso del calendario di A per la
     sola C (:571) e descrive D come un adapter in `notifications.js` sugli
     stessi otto punti di oggi (:616-633), con il server e il Web Push di A
     dichiarati inutili a D (:623, :660-661).
   - **La domanda clinica, a verbale.** Perche un paziente si svegli, un
     promemoria deve suonare sulla superficie in uso quella notte, suonare
     da sveglia e non da notifica, passare il Focus Sonno e arrivare
     davvero. Con le evidenze che ci sono nessuna via Web Push di iOS lo fa,
     per proprieta di iOS e del push service e non del nostro codice: il
     suono e quello standard e non lo scegliamo noi (S2-bis, esiti
     :450-460; `rapporto.md` :189; Spec 6.1 :550 prescrive proprio il beep
     standard); sotto Sonno l avviso arriva ma e muto, senza voce Notifiche
     urgenti (S8, esiti :1153-1195); a telefono offline il primo messaggio
     in coda si perde anche con Topic diversi (controllo di S6, esiti
     :973-1007, perimetro due invii a 6 s); un 201 non prova una consegna
     (S11, esiti :1398-1424). Solo D le regge, per costruzione e non per
     misura.
   - **Le quattro evidenze sotto W.** Suono: limite, di giorno. Focus:
     limite; il solo rimedio e lato telefono, la web app fra le app
     consentite dei Focus in uso, e che il suono torni non e misurato.
     Coda: limite con contenimento, TTL pari alla tolleranza (decisione
     16); una perdita e un invito mancato, mai un record, e il server non
     la vede. 201: limite con contenimento, mai un push senza notifica
     visibile (da pinnare nei due versi), `getSubscription()` a ogni
     apertura; il server non distingue consegnato da scartato.
   - **Vincoli che la lettera porta.** Il ramo dichiarativo e escluso per
     M3 (esiti :125-154). Il registro del canale chiama "accettato" un 201
     e "consegnato" solo un arrivo scritto dal worker. README dichiara che
     una subscription morta si scopre all apertura successiva. Le tre
     condizioni del rapporto :502-505: rollover chiuso (`ccce837`), la 18
     in forma (b) o (c), la riga in `vite.config.js` (decisione 14).
   - **Sicura sotto M1 e M3** come promemoria diurno, con i limiti sopra:
     nessuna via di scrittura nuova, record non toccato, testo che non
     asserisce lo stato (I1-I3, `rapporto.md` :34-50). Il g06 resta fuori:
     A3 non eseguita.
   - **Scartate, a verbale.** N, proposta per prima e non scelta: con la
     notte fuori dal requisito il suo movente cade, e il bisogno ad app
     chiusa del pilota e reale (`rapporto.md` :151-153). C e D: senza
     misura (C1-C2 e D1-D3 mai eseguite), restano riserve con sonda
     propria. Il dichiarativo come portatore (M3, misurato). Re-push,
     escalation, sveglia a ripetizione via push (M1; e sotto Sonno resta
     muto, in coda sopravvive solo l ultimo). Testo che asserisce lo stato
     (M1). Materializzare le previste (M3). Bottone Presa nella notifica
     (M2, M3). Push silenziosi (M2 sul canale: tre estinguono la
     subscription, S11). Contare sul 410, o scrivere "consegnato" su un 201
     (M2 sul canale, M3 sul registro del canale). Affidare al Topic la
     distinzione in coda di dosi diverse (S6). Sopprimere per dato mancante
     (fail-safe rovesciato). Motore server sulla sola etichetta di
     `orari_base` (M1). Pushover emergency o in parallelo (M1, M3).
     Calendario webcal con VALARM (M1). App terze in parallelo (M1).
     Spegnere i timer di pagina senza esclusione e materia della 10; B come
     emettitore prima di A e materia della 8.
3. [aperta] **CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.** Il suo
   mandato integrale vive nel Changelog archiviato e in `git log`.
4. [aperta] **"sonno + 60 = 00:30 dello stesso giorno."** Spec 3.6 :258: `ora_prevista`
   e HH:MM e "mai cross-midnight, AMB-9.D". Pinnato come DICHIARATO in
   `src/domain/orarioResolver.test.js`. Tenere il wrap, o portare la dose al
   giorno dopo (cambia Spec, `planBuilder`, e le chiavi delle voci). Qualunque
   canale di promemoria eredita la scelta.
5. [aperta] **Trascrivere la regola DST in Spec**, sezione 4: oggi vive nel commento in
   testa alla sezione di `src/utils/time.js` e nei test `*.dst`.
6. [aperta] **Spec 3.1 :175, default 50% di `intervallo_minimo_ore`.** Nessuna sede lo
   realizza, ne il server ne `calcolaRecuperoMax`. Realizzarlo, nei due lati,
   o togliere la riga.
7. [aperta] **Fuso fisso del server** (`tempo.FUSO_PARETE = Europe/Rome`) contro fuso
   del telefono sul client: se il paziente viaggia i due divergono. Limite
   dichiarato, non da risolvere ora. Entra nell'opzione B del rapporto, non
   nelle altre.

Le dieci che seguono vengono dalla sezione 10 del rapporto. La decisione 2 e
decisa W, quindi valgono.

8. [aperta] **Il bivio DESIGN-B: DECISO il 2026-09-17, lettera A.** Calendario
   pubblicato dal telefono. Il Mini non calcola mai un orario: glielo dice il
   telefono, che gia costruisce il piano e pubblica il calendario risolto
   (chiave dose, istante, titolo, corpo), e all istante del fuoco il
   pianificatore rilegge il log. Fonti: `rapporto.md` :386-565, :707-711 e
   :929-932; Spec :468, :1068 e :1070; esiti :671-775 (S10).
   - **Movente.** Una sola verita del piano: Spec 14.1(a) :1068 e 14.1(b)
     :1070 la vogliono alla lettera, e l opzione G di 4.8 :468 e rispettata
     per costruzione. Senza un secondo motore il server non puo anticipare
     un orario, e il rischio M1 proprio di B non esiste; resta il
     promemoria stantio, contenuto da TTL, testo I1 e rilettura del log al
     fuoco. Fuso e DST sono quelli del telefono, la 7 non entra. Cinque
     farmaci su sette del pilota stanno nei rami esteso e `fisso_date`
     (`rapporto.md` :119-121), i piu delicati di un port. I tre progettisti
     concordano (:929-932). Costo 6-10 sessioni contro 10-15 piu la
     manutenzione doppia perpetua. Le quattro evidenze della 2 sono
     identiche in A e in B: B non ne migliorava nessuna. Nessuna deviazione
     da Spec: il commit del canale chiude il bivio sul ramo che 14.1(b) gia
     preferisce, senza numero s.6.NN.
   - **Giorni senza aprire l app.** Non un requisito oggi: il pilota apre
     l app a ogni presa (`rapporto.md` :560) e S10 misura il canale su un
     digiuno di tre giorni. La 19 puo portarlo; allora si riapre prima la
     12, orizzonte piu lungo sotto A, e B solo dopo. Fino all orizzonte il
     digiuno e coperto; oltre, il server lo dice e non tace (:499-500).
   - **Vincoli del design, che le decisioni 9-17 ereditano.** Il
     pianificatore rilegge il log all istante del fuoco e non invia su
     presa, saltata o sospesa; nessuna riga = invia (fail-safe); il pin va
     visto rosso nei due versi (`rapporto.md` :916-919). Il calendario si
     costruisce per istante effettivo su tutto l orizzonte, mai per
     `dateStr === oggi`, cosi la dose di ieri ricalcolata a oggi entra
     (:428-431). Le tre condizioni della lettera W valgono anche qui.
   - **Scartate, a verbale.** B: sicura solo alle tre condizioni di
     :562-565 (profilo al server, purge delle orfane, vettori d oro rossi
     in entrambe le suite) e con un rischio M1 suo, l avviso anticipato dal
     motore divergente (:543-548); il suo unico movente, l orizzonte
     illimitato, oggi non e un requisito. Motore server sulla sola
     etichetta `orari_base.ora_prevista`, o B a profilo assente (M1,
     :707-711, :527-528). B senza purge delle orfane (M1, decisione 18),
     esclusa per costruzione dalla W. B senza vettori d oro (M1). Motore
     server che scrive le occorrenze in `log_assunzioni` (M3, Spec :1070,
     :682-685). A e B insieme come due emettitori, o B prima di A (M1: due
     orari per la stessa dose, :564-565). A senza rilettura del log al
     fuoco (M1) e A per `dateStr` invece che per istante effettivo (M2 sul
     canale): non scartate secche, restano come vincoli qui sopra.
9. [chiusa] **Q9=A da riaprire per lettera: DECISA il 2026-09-29, lettera A, con una
   condizione.** Il pianificatore e un LaunchAgent separato: una passata
   idempotente ogni 60 s, che riparte dal DB e scrive il suo battito in
   `push_pianificatore`. Q9=A di maggio (APScheduler dentro FastAPI, ratificata
   in blocco con Q8=A docker-compose, mai realizzato) e riaperta per lettera e
   sostituita. **Condizione, per la sessione del client:** il battito vecchio
   arriva al paziente nell app, non solo a `prod-check`.
10. [chiusa] **Emettitore unico o due sorgenti: DECISA il 2026-10-01, lettera A.**
    Due sorgenti: i timer di pagina restano accanto al push, e il loro tocco
    porta avanti la finestra senza navigarla. Su iPhone ad app aperta resta il
    doppio misurato da S9, ora con lo stesso testo (32); un riarmo non fa
    ripartire un avviso gia mostrato (condizione della 35). **Scartate:**
    tacerli con subscription attiva, o se l ultima pubblicazione e recente (un
    indizio non prova una consegna: M2); fondere col tag (su iOS non ha
    effetto).
11. [chiusa] **Ricalcolo D+1 rifiutato dal server: DECISA il 2026-09-29, lettera A.**
    Il push di dose parte solo se la `ora_ricalcolata` del log coincide con
    quella pubblicata dal telefono, vuote comprese; se no, all istante
    pubblicato parte un avviso neutro, senza farmaco ne ora, con la riga di
    motivo divergenza. Esclude il disaccordo nei due versi (Mini avanti per una
    pubblicazione mancata, telefono avanti per un gesto in coda o un orfana)
    senza conversioni: la 7 resta fuori. **Limite:** dopo un avviso neutro
    quella dose non riceve piu il push di dose, nemmeno dopo la
    ripubblicazione. Oggi irraggiungibile: nessun farmaco a intervallo. Il
    riallineamento dopo un rifiuto sta nella coda di rimedio.
12. [chiusa] **Orizzonte pubblicato e fine orizzonte: DECISA il 2026-09-29, lettera
    A, con una condizione.** Il telefono pubblica la finestra del piano che l
    app mostra (ieri, oggi, domani) per istante effettivo; a fine orizzonte un
    avviso separato, senza dati di dose, che parte solo se non e arrivata una
    pubblicazione piu recente. **Condizione, per il pubblicatore:** istante ed
    "entro" dell avviso li calcola sempre il telefono, oltre il TTL dell ultima
    dose e fuori dalla finestra di sonno; TTL e tolleranza gli arrivano dal
    server, da una sede sola. Scartata la sola dichiarazione (rapporto
    :697-701).
13. [aperta] **Testo verso terzi**, solo per C: nome del farmaco sui server di Pushover
    o testo neutro.
14. [chiusa] **Sblocco di `vite.config.js` per una riga e sede del modulo di
    rete: DECISA il 2026-10-01, lettera A.** Una riga `importScripts:
    ["sw-push.js"]` nel blocco `workbox`, per le due build: il percorso
    relativo si risolve accanto a `sw.js` in tutte e due le basi, e su GitHub
    Pages il gestore e inerte (nessuna API, nessuna iscrizione). Misurato su
    una copia fuori dall albero: con la sola riga il `sw.js` generato carica
    `sw-push.js`, che entra nel precache con la sua revisione. Il modulo di
    rete sta in `src/data/repository/canale.js`, accanto ad `apiClient` come
    `avvisiStore.js`, fuori dalla catena. **Scartate:** la riga per la sola
    build Mini (cambia la forma del file oltre una riga); il modulo in
    `src/data/` fuori dalla cartella della catena; `injectManifest`; correggere
    `sw.js` dopo la build (il gestore ci sarebbe solo dove gira lo script:
    push muti, S11); metodi su `ApiRepository` o `IRepository` (VIETATO); le
    chiamate dentro `SyncRepository`; un `fetch` diretto.
15. [chiusa] **Custodia VAPID: DECISA il 2026-09-29, lettera A.** PEM 0600 nella
    home del Mini, fuori da `~/PharmaTimer`, accanto a `~/.my-pharmatimer.cnf`:
    fuori dal `rsync --delete` e dall unica cartella servita. Il percorso nei
    plist, come `DB_DEFAULTS_FILE`; il `sub` nel `.env.dev` del Mini, fuori dal
    repo; la pubblica derivata dal PEM. Senza PEM il canale si spegne e lo dice
    (503, battito con motivo) e l app parte comunque: impostazioni facoltative,
    mai validate all avvio. Chiavi distinte per Studio e Mini. Backup nel
    Portachiavi di login dello Studio, PEM in base64, mai accanto ai dump.
    **Scartate:** il PEM con i dump (con endpoint e chiavi delle subscription
    permette notifiche a nome di PharmaTimer: M1); dentro `~/PharmaTimer`; la
    privata nei plist tracciati; il Portachiavi del Mini letto dal servizio;
    nessun backup; una chiave sola per Studio e Mini.
16. [chiusa] **Tolleranza e TTL: DECISA il 2026-09-29, lettera A.** Tolleranza 20
    minuti dopo l ora, mai prima. TTL di ogni invio = il tempo che resta alla
    fine della finestra, calcolato all invio: nessun promemoria arriva oltre l
    ora piu 20 minuti; a zero o meno non si invia, `non_inviato` con motivo.
    Tentativi solo dentro la finestra; stessa regola per l avviso di fine, con
    il suo `entro`. Una costante nel backend, sede unica, che il telefono
    riceve dal server (condizione della 12). `TOLLERANZA_MIN` = 15, la soglia
    del badge, non si tocca. **Scartate:** TTL fisso pari alla tolleranza
    (consegna fino all ora piu due tolleranze: finestra M1 piu larga); TTL di
    un ora o sei ore (contro la W e `rapporto.md` :295-297).
17. [chiusa] **Ordine dei lavori: DECISA il 2026-09-29, lettera A.** Sonda sul
    telefono senza codice, poi ratifica con la scheda a quattro campi, poi
    migrazione prima del codice, backend con passata vista rossa, client con
    SW, settimana di accettazione. C resta una riserva con la sua sonda, da
    preparare solo se l accettazione di A non regge. Sonda chiusa; migrazione
    scritta il 2026-09-29; restano le schede 10, 14, 15, 16 e 22. Il
    2026-09-29 decise la 16, la 15 e la 22, tutte A: restano la 10 e la 14,
    per la sessione del client.

L'ultima NON dipende dalla decisione 2: vale in qualunque caso, anche se le
notifiche ad app chiusa non si fanno.

18. [chiusa] **Le due righe di log aperte e irraggiungibili sul Mini: DECISA il
    2026-09-18, lettera A, per la sola parte RECORD.** Fotografia verificata
    prima -- restore in uno schema di servizio e conteggio righe per tabella,
    non il solo peso del file -- poi ripulitura totale dei dati di prova dell
    utente 2: `id=6` e `id=11` spariscono con la sorgente. Sono dati di prova,
    quindi cancellarle non e M3, e la scelta fra (a), (b) e (c) non si pone
    piu sul record. **La parte MECCANISMO non chiude ed e la 22.**
    **ESEGUITA sul record il 2026-09-18**, atti 1 e 2 della 19.

19. [chiusa] **La terapia vera al posto dei dati di prova: DECISA il 2026-09-18,
    lettera A, ed ESEGUITA lo stesso giorno.** Sette farmaci quotidiani a nove
    dosi al giorno, tutti `fisso` con orari `assoluto`, piu Dibase mensile in
    `fisso_date` a 25 date. Movicol al bisogno: fuori modello e fuori dal DB.
    Medrol completato: non inserito. Rationale, sonde, limiti dichiarati e
    scartate della ratifica stanno in git, commit `34f0e94`; il verbale
    dell'esecuzione sta in git, commit `e615916`. Non riapre la 8 ne la 12,
    non tocca la 4, non apre D nella 2.
    **Riga nuova del 2026-10-05:** in produzione nessun uso reale, solo dati
    di prova realistici; lo ha dichiarato Roberto il 04/10, con
    `log_assunzioni` a 0 sul Mini. Il testo qui sopra e storico e non si
    riscrive: la norma e la riga in testa a `CLAUDE.md`.

20. [aperta] **Posologia variabile nel tempo per uno stesso farmaco -- vitamina D.**
    La Spec 10.4 prescrive la modifica manuale di orari_base/dosi "nel tempo".
    La prescrizione e ATEMPORALE: orari_base non ha colonne di validita (DDL
    v01_init.sql piu v05_fisso_date.sql: solo data_specifica, data singola).
    Il piano pero copre [ieri, oggi, domani] (constants.js:9-11) e si ricostruisce
    per intero dallo stato corrente. Misurato con sonda sulle sedi vere:
    D1 -- cambiare l'ora riscrive l'ora di una presa gia avvenuta: l'entry di ieri
          espone la nuova. Spec 3.6 dichiara log_assunzioni.ora_prevista congelato
          ("orario che ERA programmato"), ma mergeLogIntoEntry (planBuilder.js:80)
          non lo rilegge. Il DB conserva il vero, la vista no.
    D2 -- cancellare una riga smaterializza le occorrenze passate: la presa di ieri
          esce dal piano; planBuilder.js:111 dichiara i log senza entry "silently
          ignored". Record in DB, presa invisibile.
    D3 -- sul ramo esteso, cambiare intervallo_ore ri-fasa da data_inizio
          (extendedFrequency.js:123-130): si spostano anche le occorrenze di ieri.
    D1, D2 e D3 toccano il record a valle del tocco: sono M3.
    D4 -- il workaround pulito esiste ed e misurato verde (due record disgiunti,
          data_fine sul vecchio e data_inizio sul nuovo: copre senza overlap ne
          buco), ma NON e normato da alcuna sezione di Spec ed e UNIDIREZIONALE:
          FarmaciTab.jsx:1327 impone data_inizio >= oggi in creazione, quindi un
          periodo gia trascorso non e ricostruibile a posteriori.
    Ne fisso_date (max 30 date, nessuna ricorrenza, farmaco mono-tipo per
    models/orario.py:106) ne la cadenza estesa (un solo intervallo_ore ancorato a
    data_inizio) coprono il caso. La dose in mg non e un campo: vive in farmaci.nome.
    DOMANDA A ROBERTO: la via prescritta da 10.4 va tenuta cosi, accettando che
    D1-D3 riscrivano il passato, o il perimetro della modifica va ridefinito?
    E il workaround D4 va normato, o resta fuori dalla Spec? Non decisa in sessione.
    CHIUSA IN PARTE il 2026-09-18: nessuno dei sette quotidiani cambia nel
    tempo e Dbase e a cadenza fissa mensile, quindi la 20 NON tocca la
    ripartenza della 19. Resta aperta per il futuro, da riaprire PRIMA del
    primo cambio e mai dopo: `FarmaciTab.jsx` :1327 chiude il passato in
    creazione ed e mode-gated, quindi la modifica lo accetta -- ed e D1/D3.

21. [chiusa] **La riga di `CLAUDE.md:5` "Non esiste produzione con utenti terzi".**
    Ereditata dalla vecchia voce 19. In produzione ci sono `id=3` e `id=4`,
    pazienti attivi con self-permesso e zero farmaci, piu l owner `id=1`
    distinto dal pilota; i loro token sono validi. **Segnata da correggere nel
    commit che esegue la 19**, dove cambia anche il presupposto: finita la
    ripulitura i dati dell utente 2 non sono piu di prova e M3 si applica loro
    per intero. E documento normativo: la modifica spetta a te.
    **ESEGUITA il 2026-09-18, lettera A:** la riga 5 e riscritta nel commit
    che esegue la 19.

22. [chiusa] **Rimedio alle orfane: DECISA il 2026-09-29, lettera A.** La
    condizione di `rapporto.md` :503 la regge la A della 11: un orfana non fa
    partire un push di dose a un ora che l app non mostra, e non lo sopprime
    in silenzio; il caso peggiore e un avviso neutro, registrato con cio che
    la passata ha letto. Pin nel backend: una ricalcolata nel log che la
    pubblicazione non porta da un avviso neutro; log uguale alla pubblicazione
    da il push di dose; una riga aperta fuori dal calendario non da alcun
    invio. Chiude come condizione del canale; il meccanismo e in coda, voce 6.
    **Scartate:** chiudere o cancellare lato server le righe vecchie (I2, M3);
    fidarsi del telefono quando la riga e piu vecchia della pubblicazione
    (colonna assente, riapre la 11: M1); la (a) della 18 senza pin.

23. [aperta] **Keychain e file del token dell'utente 2.** La voce `pharmatimer-token-2`
    del Keychain dello Studio e stantia dal 3 settembre (impronta
    `f33faf3ed991` contro `e93e6178dd6e` nel DB); il token corrente sta in
    `~/pt-token-utente2.txt` (600) sullo Studio. Aggiornare la voce con
    `security add-generic-password -U` e cancellare il file, oppure tenere il
    file: spetta a te. Finche non si decide, il runbook della lezione #65
    punta a un token morto.

24. [aperta] **Fine silenziosa di ogni `fisso_date`.** Misurato il 2026-09-28
    sulle sedi vere: dopo l'ultima data della lista il farmaco esce dal piano
    e nessuna sede lo dice. Dibase (`id` 22): la voce del 2028-10-15 c'e, dal
    2028-11-15 zero voci. La fine e del modello, non di `data_fine`: il
    predicato per data di `planBuilder` rende zero voci anche con `data_fine`
    nullo. La lista e finita per Spec 3.1 :173 e il tetto e 30 date nei due
    lati (`orario.py` :140, `FarmaciTab.jsx` :300), quindi una prescrizione
    mensile senza termine non e rappresentabile oltre i due anni e mezzo.
    Nessuna sede annuncia la fine: `selectProssimaDoseFuoriPlan` guarda solo
    `data_inizio` futura, la scheda di Config dice "Temporaneo" senza data, il
    farmaco resta attivo. Classificazione: non e M2 nella meccanica del piano,
    che non scarta nulla del record; lo e nell'effetto se la prescrizione
    continua, perche dopo l'ultima data l'assenza di data e ambigua fra
    "finita" ed "esaurita" e il sistema la risolve sopprimendo, in silenzio.
    Riconferma del limite dichiarato alla 19 (`34f0e94`). Forma e sede del
    rimedio non decise.

25. [chiusa] **Sede della passata e del suo SQL: DECISA il 2026-09-30, lettera
    A.** `backend/pharmatimer_api/pianificatore.py`, con le sue query: seconda
    e ultima sede del SQL, dichiarata in CLAUDE.md 13. Movente: il livello di
    g21 vede le tabelle che la passata nomina, stessi parametri di
    connessione, e la passata non carica FastAPI. **Scartata:** fuori da
    `pharmatimer_api`, dove g21 non vedrebbe la passata (M2 sul canale).

26. [chiusa] **Farmaco o utente disattivati dopo l'ultima pubblicazione:
    DECISA il 2026-10-01, lettera A.** A ogni tentativo la passata rilegge
    `farmaci.attivo` e `utenti.attivo`; se uno e falso, nessuna POST e una
    riga `non_inviato` col motivo; per l'avviso di fine, il solo utente.
    **Scartate:** nessuna rilettura (un farmaco sospeso che suona col suo
    nome, Spec 14.4.3); rileggere `data_fine` o `orari_base`, logica di piano
    sul server e seconda verita, esclusa dalla 8.

27. [chiusa] **Testi dell'avviso neutro e di fine orizzonte: DECISA il
    2026-10-01, lettera A.** Titolo "PharmaTimer"; neutro "Apri l'app per
    controllare i promemoria."; fine "Apri l'app per aggiornare i
    promemoria.". Sede unica `canale.py`. **Scartato:** nel neutro, dire
    cosa e cambiato: il server vede che log e pubblicazione differiscono, non
    perche (stato asserito, I1).

28. [chiusa] **D4: DECISA il 2026-10-01, lettera A, nel perimetro della
    scheda.** Nel commit del passo 3: Spec 3.0 senza gli elenchi che
    invecchiano, 3.11 con le colonne della v07, 3.13 nuova per le sue tabelle,
    6.4 nuova (il canale lato server, dichiarato promemoria diurno come vuole
    la 2), 9 con i cinque endpoint, 14.1(b) col bivio chiuso sul ramo A; il
    README col limite di nuovo vero. La Spec si modifica in posto, nome e
    numero 1.18. Nel commit del client: Spec 2.1, 6.1, 8.1, la copy "Avviso
    poco prima" e nel README le dichiarazioni del lato client. Il resto della
    Spec, fermo a luglio, non si allinea in questa sessione. **Scartata:**
    dichiarare il canale dopo il commit che lo rende usabile (contro la 2 e
    la regola critica 3).

29. [chiusa] **Ritentativi, due condizioni di Roberto del 2026-09-30.** (1)
    Ogni tentativo rifa i controlli al fuoco: log per chiave di slot, voce del
    calendario ancora quella letta, controlli della 26. (2) Si ritenta solo
    su cio che certifica il rifiuto, per lista bianca: 408, 429, 503,
    `ConnectTimeout`, `NewConnectionError`. Accettati solo 201 e 202; ogni
    altro 4xx, 501 e 505 respinti (404 e 410 spengono la subscription); tutto
    il resto e `esito_ignoto`, mai ritentato. Pin M1 nei due versi, con le
    loro righe nel banco.

30. [chiusa] **Confine delle righe `scaduto`, di Roberto del 2026-09-30.** E
    l'inizio dell'attivazione corrente per l'utente corrente: dopo una
    riattivazione, o se la subscription passa a un altro utente, nessuno
    `scaduto` per finestre chiuse prima. Lo porta `created_at`, riscritto
    dall'upsert solo in quei due casi, dall'orologio di MySQL, e letto con
    `UNIX_TIMESTAMP()`. Pin nei due versi, con le loro righe.

31. [chiusa] **Il worker legge il taccuino all arrivo: DECISA il 2026-10-01,
    lettera A.** A un push di dose il worker legge in sola lettura la riga del
    taccuino per la chiave del payload, con un tempo massimo. Se la dose e
    presa, saltata o sospesa il corpo lo dice ("Dose delle 08:00: già
    registrata come presa alle 07:55."); altrimenti resta il testo pubblicato.
    La notifica parte sempre; il worker non crea, non aggiorna e non scrive il
    database. Movente: e la ragione del ramo classico (esiti :149-153), e S4,
    finestra 3, ha misurato push consegnati a Tailscale spento, quando una
    presa resta in coda. **Limite:** su iOS la lettura non e misurata (esiti
    :98-103). La misura e il caso "presa registrata offline, poi arriva il
    push" della prova sull iPhone, alla sessione del deploy. **Scartate:**
    sopprimere la notifica di una dose chiusa (S11, mai sopprimere); chiedere
    lo stato al server dal worker (servono token e tailnet, cioe cio che
    manca nel caso che conta); una copia del taccuino nella Cache.

32. [chiusa] **Testo del push di dose: DECISA il 2026-10-01, lettera A.** Titolo
    il nome del farmaco, che porta il dosaggio; corpo "Dose delle HH:MM", la
    relazione col pasto se c e, "Apri l'app per controllare." Lo stesso testo
    per i timer di pagina, da una funzione sola (`src/domain/promemoria.js`).
    **Scartate:** testi che presumono la dose non presa (I1, M1), senza ora
    (I1), senza nome (Spec 6.1), il titolo "PharmaTimer" (si confonde con l
    avviso neutro della 27).

33. [chiusa] **Soglia del battito vecchio: DECISA il 2026-10-01, lettera B, 5
    minuti.** Due minuti guadagnati dentro una finestra di venti non valgono
    una riga che compare a ogni passata lenta e che si impara a ignorare. Con
    la regola di Roberto sulle parole: "non attivi" quando sappiamo che i
    promemoria non arriveranno, "non verificati" solo quando non sappiamo,
    "non aggiornati" per la pubblicazione fallita; pin nei due versi per
    ciascun testo. **Scartate:** 20 minuti e nessuna soglia (un OK vecchio,
    contro la 9); il solo orologio di parete; una rilettura periodica
    (Q-SYNC).

34. [chiusa] **Ordine dentro il tocco del toggle: DECISA il 2026-10-01, lettera
    A.** In modalita API, a preparazione completa, `subscribe()` e il primo
    atto del gesto e chiede lui il permesso: la via che S1 ha misurato. Senza
    preparazione il tocco fa cio che faceva e lo stato dice perche; la riga di
    Oggi e "Verifica ora" iscrivono dentro il gesto. **Scartata:** permesso,
    chiave e poi subscribe, la variante di S1 mai eseguita. Non misurato in
    nessuna delle due: il rinnovo che ricrea la subscription senza gesto, un
    passo della prova sull iPhone.

35. [chiusa] **Sede della pubblicazione: DECISA il 2026-10-01, lettera A, con
    una condizione.** Un effetto di `AppContext` sullo stato che React ha
    applicato riarma i timer di pagina e pubblica il calendario, all apertura
    e a ogni cambio di piano, farmaci, profilo o toggle; le sedi di
    `maybeReschedule` restano. **Condizione di Roberto:** un riarmo non fa
    ripartire l avviso di una dose gia mostrata, pin nei due versi. **Scartata:**
    pubblicare dalle sedi come sono (misurato: all apertura niente, dopo un
    farmaco aggiunto il piano senza di lui, M2 sul canale).

36. [aperta] **La dose di domani si registra oggi con un tocco.** Prova a mano
    del 2026-10-02, osservazione 2: un tocco, senza conferma, registra la
    presa della dose di domani, il server la accetta e l app mostra "Anticipo
    24h 03". E una domanda clinica e la decisione e di Roberto. Non misurato
    quali sedi la permettono, client, server o entrambi: la sonda viene prima
    della scheda.
