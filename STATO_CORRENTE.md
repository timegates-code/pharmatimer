# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- ratifica della decisione 19, 2026-09-18

Nessuna riga di codice toccata: il commit porta il solo registro. `make check`
verde in apertura, HEAD `71ee14b`, TREE 0, AHEAD 0. Fonti dumpate per
contenuto: `rapporto.md` :496-505, `models/farmaco.py`, `models/orario.py`,
`orarioResolver.js`, `extendedStride.js`, `recalc.js`, `selectors.js`,
`notifications.js`, `OrarioRow.jsx`, `FarmaciTab.jsx`, `log_assunzioni.py` e
`v01_init.sql` :108.

**Decisione 19, DECISA A.** La terapia vera entra al posto dei dati di prova:
sette farmaci quotidiani a dieci dosi, tutti `fisso` con orari `assoluto`, piu
Dbase mensile in `fisso_date`. Il legame col pasto vive in `relazione_pasto` e
`dettaglio_pasto`, non nell ancora. Il Medrol e completato ed esce per
`data_fine` (`FarmaciTab.jsx` :1226 la ammette nel passato dietro
ConfirmModal). Il Movicol e AL BISOGNO e **non entra**: `TipoFrequenza`
conosce solo `intervallo`, `fisso` e `fisso_date`, e nessuna delle tre esprime
"al bisogno"; inserirlo come `fisso` farebbe asserire una dose programmata che
la prescrizione non programma, e ogni giorno non assunto produrrebbe una
`saltata` per una dose mai dovuta -- M3. Resta fuori modello, nominato.
FATTO dato da Roberto e non misura di sessione: i dati oggi in produzione sono
di prova, suoi, quindi M3 non si applica alla loro ripulitura.

- **Movente di `assoluto` contro le ancore-pasto.** La D1 della 20 dice che
  ri-risolvere un orario riscrive l ora di una presa gia avvenuta, perche
  `mergeLogIntoEntry` non rilegge il congelato. Con le ancore un solo cambio
  di `ora_colazione` ri-risolve INSIEME tutte le dosi ancorate: l esposizione
  a D1 e l intero piano. Con `assoluto` resta confinata al farmaco che si
  tocca, e nessuna informazione clinica si perde. Effetto misurato: con tutti
  gli orari assoluti nessuna riga di `orari_base` legge il profilo, quindi
  `ora_sveglia` 09:50 e `ora_sonno` 02:00 non entrano nel piano.
- **Dbase, forma `fisso_date`.** Prima dose 15 ottobre 2026, poi il 15 di ogni
  mese, ai pasti. `extendedStride.js` :12-26 dichiara che la cadenza estesa
  conosce due soli regimi, giorni civili (multipli di 24 ore) e stride in
  millisecondi: **non esiste uno stride a mesi**. 720 ore derivano di un
  giorno al mese (15 ott, 14 nov, 14 dic), 744 ore derivano in avanti (15 ott,
  15 nov, 16 dic). `fisso_date` esprime la cadenza esattamente, con ancora
  forzata `assoluto` e fino a 30 date distinte. **Limite dichiarato:**
  `data_fine` e l ultima data inserita, e quando le date si esauriscono il
  farmaco esce dal piano senza che alcuna sede lo annunci. Va rinnovato.
- **Guadagno misurato sulla coda di rimedio.** La voce 1 -- `/recupero` senza
  guardia sul minimo, M1 -- **non ha presa sulla terapia vera**. Servono
  insieme due condizioni: `tipo_frequenza='intervallo'`, perche la catena
  `ricalcolata` scatta solo li (`recalc.js` :269 e :437) e `/recupero` rifiuta
  una dose non ricalcolata (:481); e `intervallo_minimo_ore` valorizzata,
  perche con NULL sono NO-OP sia il client (`recalc.js` :192-205) sia il
  server (`log_assunzioni.py` :115, :131-142). Con `fisso` e `fisso_date` il
  validator di `models/farmaco.py` impone la colonna a NULL e la catena non
  scatta: la voce 1 morde oggi solo perche cinque dei sette farmaci di prova
  stanno nei rami `intervallo` e `fisso_date`.
- **La Lyrica delle 01:00, sonda sul `planBuilder` vero.** Esiti dichiarati
  prima: E1 la dose si materializza sul giorno di calendario in cui l orologio
  segna 01:00; E2 si attacca al giorno precedente, o wrappa, o sparisce.
  **Misurato E1:** entry `(dateStr, '01:00')`, prima dose del giorno, ordinata
  prima delle 23:30. `computeOraPrevista` fa `minutesToTime(0 + 60)`: nessuna
  aritmetica attraversa la mezzanotte. **La decisione 4 NON e toccata** e non
  va presa prima dell inserimento: AMB-9.D riguarda l ancora che wrappa, e con
  `assoluto` non c e wrap. Controllo nella stessa sonda: ancora `sonno` 02:00
  con offset -60 e +60 da 01:00 e 03:00, nessun wrap.
- **Due conseguenze dell 01:00, dichiarate.** (i) Le due dosi della stessa
  notte cadono su due giorni di calendario, 23:30 di un giorno e 01:00 del
  successivo; alle 01:00 la scheda Oggi e gia quella del giorno nuovo, quindi
  il TAP trova la dose dove deve. (ii) Il promemoria dell 01:00 dipende dal
  rollover di mezzanotte: `selectors.js` :110-116 aggiunge alla finestra le
  sole ricalcolate dentro il giorno, e una `fisso` di domani resta fuori;
  `notifications.js` :190-201 arma la sola finestra di `selectToday`. Il timer
  non e armato la sera prima, si arma al rollover, cioe solo se l app e aperta
  fra le 00:00 e l 01:00. Non e un difetto nuovo -- e la VOCE 17 dell
  inventario, "SOLO TIMER DI PAGINA: ad app chiusa la notifica NON parte" --
  ma e la prima dose della terapia vera che ci cade dentro. **Misurato sul
  percorso di codice, NON esercitato con un timer in esecuzione.**
- **La notte.** Nessuna dose cade nella finestra di sonno: l 01:00 precede
  `ora_sonno` 02:00. D non si apre nella 2. Regola scritta per il futuro: un
  notturno che arrivi **ENTRA** nel DB come ogni altro farmaco, e cio che
  aspetta la verifica del Focus Sonno e la sua NOTIFICA sul canale nuovo,
  passo nominato della settimana di accettazione della 17. Tenerlo fuori dal
  DB sarebbe M2 -- una presa notturna avvenuta non sarebbe registrabile --
  senza sopprimere alcun avviso, perche il canale non esiste ancora. Se la
  verifica esce no, D si apre come decisione nuova con la sua sonda.
- **Giorni senza aprire l app: NO, non requisito.** Roberto apre l app a ogni
  presa, S10 misura tre giorni coperti, la 12 fissa l orizzonte. Non riapre la
  8 ne la 12.
- **Nessuno dei sette quotidiani cambia nel tempo**, e Dbase e a cadenza fissa
  mensile: **la 20 non tocca la ripartenza**.
- **Scartate, a verbale.** Ripulire senza dump verificato prima, anche su dati
  di prova: costa zero e il ripristino altrimenti non esiste. Inserire un
  farmaco che cambia nel tempo prima di aver scelto la forma. Ancore-pasto per
  gli orari: tecnicamente pronta -- offset negativo digitabile
  (`OrarioRow.jsx` :125-160) su colonna `offset_minuti INT` signed
  (`v01_init.sql` :108), `minutesToTime` normalizza modulo 1440 -- scartata
  per il movente sopra. Misto ancore e assoluto: due regole di lettura in una
  terapia sola. Dbase come `intervallo`: M3 sulla data, per il drift misurato.
  Dbase come `fisso` giornaliero: M1 e M3. Dbase fuori dal record. Movicol
  come `fisso`: M3, sopra. Tenere fuori dal DB un farmaco notturno: M2.

**Decisione 18, DECISA A, per la SOLA parte record.** Fotografia verificata
prima -- restore in uno schema di servizio e conteggio righe per tabella, non
il solo peso del file -- poi ripulitura totale dei dati di prova dell utente 2.
Le due righe orfane `id=6` e `id=11` spariscono con la sorgente: essendo dati
di prova non sono M3, e la scelta fra (a), (b) e (c) non si pone piu sul
record. **La parte MECCANISMO non chiude e diventa la 22.** Scartate: chiudere
la 18 per intero sul wipe -- la causa resta, e dopo la ripartenza una orfana
nuova sarebbe M3 vero; realizzare (b) o (c) prima della ripartenza -- fuori
perimetro.

**Collisione di numero, sciolta.** Il numero 19 era usato in due sensi: le
decisioni 2 e 8, ratificate il 2026-09-17, citavano "la 19" come la terapia
vera, che non aveva voce; la voce 19 portava invece la riga di `CLAUDE.md`.
Sciolta cosi: 19 = la terapia vera, la riga di `CLAUDE.md:5` prende il 21, il
meccanismo della 18 prende il 22. Nessun rinvio si rompe: sonda sullo STATO,
la vecchia voce 19 non era citata per numero da alcuna riga. Seconda
occorrenza della numerazione che collide, dopo `dc00f61`, `f5b7e88` e
`012e34a`: la numerazione delle decisioni non ha un portatore, segnato per la
sessione 8.3 del documento sul gate.

**Rilievo di misura, mio.** La voce 2 riporta la condizione del ramo A come
"la 18 in forma (b) o (c)", mentre la fonte `rapporto.md` :503 dice "rimedio
alle ricalcolate orfane" e la voce 18 attribuiva (b) e (c) all opzione B, che
e scartata: la stretta non e nella fonte. La fonte dice inoltre "ricalcolate",
e delle due righe solo `id=6` lo e, mentre `id=11` e `prevista`. Le voci
passate restano come sono, perche sono il verbale di ratifiche gia emesse, e
la 22 eredita la formulazione della fonte e non la stretta.

**Esecuzione della 19: sessione propria, non questa.**
- Ordine vincolante: fotografia verificata, POI ripulitura, POI inserimento.
- `FarmaciTab.jsx` :202 e :697: il default di `data_inizio` in creazione e
  `tomorrowIso()`, DOMANI. Va forzato a oggi, o le dosi di oggi non si
  materializzano. Il cancello :1327 ammette oggi, non il passato in creazione.
- Ingressi ancora mancanti: i dosaggi di Jalorest, Assonal, Ezevast e Duoresp
  Spiromax -- la dose vive in `farmaci.nome` -- e se anche la seconda Lyrica
  sia da 75 mg.
- La terapia, orari assoluti: 10:00 Jalorest (stomaco vuoto, `prima`); 10:30
  Duoresp Spiromax 1 puff, Giant 20/5, Olevia 1000 dose 1 (`durante`); 12:30
  Assonal dose 1 (`lontano`); 19:00 Assonal dose 2; 20:30 Ezevast e Olevia
  1000 dose 2 (`durante`); 23:30 Lyrica dose 1 e 01:00 Lyrica dose 2. Pasti
  del profilo: colazione 10:30, pranzo 14:30, cena 20:30. Dbase: il 15 di ogni
  mese, ai pasti, `fisso_date`.

**Cosa resta.** Le decisioni 9-17 sono vive e vanno in sessione propria, nell
ordine della 17. Il g06 ha il suo criterio, A3, non eseguito. La coda di
rimedio non cambia. Il verbale della campagna iPhone, S11 compreso, sta in
`sonda-iphone-esiti.md` e in git (`c4a6c1d`).

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

---

## Coda di rimedio

Si esegue, non si rimisura. Ordinata per rischio clinico.

| # | mancante | invariante | stato |
|---|---|---|---|
| 1 | **`/recupero` senza guardia sul minimo** | **M1** | Spec 4.7 :431 tiene il TODO su `intervallo_minimo_ore`; la decisione 2 ha guardato la sola presa. Il server accetta un recupero che anticipa sotto il minimo: oggi lo ferma solo lo slider del client (`calcolaRecuperoMax`). Stessa sede e stesso `tempo.minuti_reali`. Misurato il 2026-09-18: **non ha presa sulla terapia vera**, tutta `fisso` e `fisso_date` -- servono insieme `tipo_frequenza='intervallo'` e `intervallo_minimo_ore` valorizzata. |
| 2 | **targa annidata nel batch, forma (a) decisa** | **M3** | Meccanico: il modello pydantic del ricalcolo dichiara `client_op_id` opzionale e ignorato, con il motivo nel docstring; R4 in `ApiRepository.contratto.test.js` arrossa e il marcatore `it.fails` si toglie nello stesso commit. Nessuna sede VIETATA, nessuna migrazione, wire-neutro. |
| 3 | **estrarre il SQL dai router** in `repository/` | -- | Refactor, sessione propria, se ancora voluto. Norma dichiarata: SQL nel router (`CLAUDE.md` 13). |
| 4 | **`deploy-mini.sh` non fotografa il bundle** prima del `rsync --delete` | -- | Fatto a mano per la seconda volta (`web.bak.*` e `backend.predeploy.*.tgz`). Lo script deve farlo da se, come passo fra le guardie e il rsync. |

### Rilievi chiusi, e cio che resta aperto sotto di loro

I due rilievi di misura della sessione precedente sono stati pinnati rossi e
chiusi (`ccce837`, `3d098a6`). Restano aperte due cose che quei commit NON
toccano:

- **La sonda sul moto g06.** Il `TypeError` del costruttore resta dedotto da
  MDN browser-compat-data. Da esercitare sul telefono, senza codice nel repo.
- **Righe di log aperte e irraggiungibili sul Mini: sono DUE, non una.**
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
  causa, che e la 22.

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
- Validatore data_specifica contro tipo_frequenza: OrariBulkPayload._validate_bulk
  (backend/pharmatimer_api/models/orario.py:106) impone che data_specifica sia
  tutta valorizzata o tutta nulla, ma NON verifica che tipo_frequenza sia
  'fisso_date' quando e valorizzata. La coerenza fra i due campi non e misurata
  da alcun validatore backend.
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
2. **Le notifiche ad app chiusa: DECISA il 2026-09-17, lettera W.** Si
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

Le dieci che seguono vengono dalla sezione 10 del rapporto. La decisione 2 e
decisa W, quindi valgono.

8. **Il bivio DESIGN-B: DECISO il 2026-09-17, lettera A.** Calendario
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
9. **Q9=A da riaprire per lettera.** APScheduler dentro FastAPI (ratifica di
   maggio 2026, mai eseguita) contro un LaunchAgent separato; i tre
   concordano sul LaunchAgent, divergono fra passata a intervallo e processo
   residente (irrilevante finche il Mini non dorme).
10. **Emettitore unico o due sorgenti.** Tenere i timer di pagina accanto al
    push accettando su iPhone un doppio simultaneo ad app aperta; tacerli con
    subscription attiva; o decidere dopo la sonda con un gate sull'ultima
    pubblicazione riuscita. I tre progettisti divergono. **S9, misurato il 15
    settembre:** ad app in primo piano l avviso del worker compare e suona,
    quindi il doppio simultaneo della prima via e possibile, non ipotetico.
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

L'ultima NON dipende dalla decisione 2: vale in qualunque caso, anche se le
notifiche ad app chiusa non si fanno.

18. **Le due righe di log aperte e irraggiungibili sul Mini: DECISA il
    2026-09-18, lettera A, per la sola parte RECORD.** Fotografia verificata
    prima -- restore in uno schema di servizio e conteggio righe per tabella,
    non il solo peso del file -- poi ripulitura totale dei dati di prova dell
    utente 2: `id=6` e `id=11` spariscono con la sorgente. Sono dati di prova,
    quindi cancellarle non e M3, e la scelta fra (a), (b) e (c) non si pone
    piu sul record. **La parte MECCANISMO non chiude ed e la 22.**

19. **La terapia vera al posto dei dati di prova: DECISA il 2026-09-18,
    lettera A.** Sette farmaci quotidiani a dieci dosi, tutti `fisso` con
    orari `assoluto`, piu Dbase mensile in `fisso_date`. Movicol al bisogno:
    fuori modello e fuori dal DB. Medrol completato: esce per `data_fine`.
    Rationale, sonde, limiti dichiarati e scartate stanno nella voce di
    sessione in testa a questo file. Non riapre la 8 ne la 12, non tocca la 4,
    non apre D nella 2. L esecuzione e sessione propria.

20. **Posologia variabile nel tempo per uno stesso farmaco -- vitamina D.**
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

21. **La riga di `CLAUDE.md:5` "Non esiste produzione con utenti terzi".**
    Ereditata dalla vecchia voce 19. In produzione ci sono `id=3` e `id=4`,
    pazienti attivi con self-permesso e zero farmaci, piu l owner `id=1`
    distinto dal pilota; i loro token sono validi. **Segnata da correggere nel
    commit che esegue la 19**, dove cambia anche il presupposto: finita la
    ripulitura i dati dell utente 2 non sono piu di prova e M3 si applica loro
    per intero. E documento normativo: la modifica spetta a te.

22. **Rimedio alle orfane -- condizione viva del ramo A.** Dalla parte
    meccanismo della 18. La fonte `rapporto.md` :503 chiede "rimedio alle
    ricalcolate orfane" come condizione della variante A, e non prescrive una
    forma: (b) portare al server la cancellazione che oggi il cambio profilo
    fa solo in locale, (c) trattare come stantia ogni riga aperta piu vecchia
    della finestra del piano, o altra forma che regga la stessa misura. Serve
    perche la giunzione `(farmaco_id, dose_numero)` fra `log_assunzioni` e
    `orari_base` non e una FK: ridurre `dosi_giornaliere` su un farmaco vero
    rigenera un orfana identica, ed e la D2 della 20. Dopo la ripartenza quel
    record e clinico.
