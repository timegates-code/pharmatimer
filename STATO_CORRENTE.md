# STATO CORRENTE -- PharmaTimer

Tracciato e corto. La storia sta in `git log`; il Changelog di Fase 3 e
archiviato e congelato. Qui c e solo cio che serve per aprire la prossima
sessione: cosa e appena successo, cosa resta in coda, cosa deve decidere
Roberto.

**Apertura e chiusura: `make check`.** Prima di un deploy: `make prod-check`,
poi `bash deploy/deploy-mini.sh` dal Terminale.

---

## Ultima sessione -- S4 chiuso con esito A, piu un controllo non previsto

Nessuna riga di codice dell app toccata. Seconda sessione di sola sonda sul
telefono vero, ripresa dal verbale della prima senza colmare buchi a voce.

**S4 = A**, su quattro finestre distinte, ciascuna con dieci minuti di telefono
chiuso e fermo. La norma prescriveva il solo ramo dichiarativo; la ratifica lo
ha esteso a **entrambi i rami**, perche il dichiarativo non esegue una riga del
nostro codice e non e il ramo che portera il promemoria. Il risultato che serve
al design e proprio quello che la norma non chiedeva: **il service worker viene
svegliato in Low Power Mode e su sola rete cellulare fuori dalla tailnet**, con
`indexedDB` esposto in tutti e due i casi. Latenze 1,1 s e 2,3 s contro un
criterio di 60. La deduzione del rapporto :289-293 -- la consegna non passa dal
tunnel -- e ora esercitata sul telefono.

**S2-bis**, controllo non previsto dal rapporto, nato da un fatto emerso in
corsa: **l Apple Watch al polso si prende notifica e suono al posto dell
iPhone**. Il pin e nei due versi e isolato -- al polso suona il Watch, in carica
suona l iPhone -- e in piu il Low Power Mode non toglie il suono al telefono.
**Il suono e quello standard delle notifiche, su entrambi i rami**: risponde in
parte alla domanda aperta della decisione 2, e risponde male.

**S10 e stato ordinato per ratifica**, perche le sue due meta si ostacolavano:
digiuno il 5, 6 e 7 settembre con un push alle 14:32 e nessuna apertura,
riaperture giornaliere dall 8 al 12. Il cancello di S10 si chiude il **12** e
non il 9: e il prezzo di misurare un digiuno vero invece di uno di ventiquattro
ore. I tre comandi stanno nel file degli esiti, verificati a vuoto, e li lancia
Roberto dal Terminale nei giorni senza sessione.

Del criterio di passaggio al codice (`rapporto.md` :860-864) resta scoperto il
solo **S10**. Restano da eseguire S6 e S7 (modalita aereo, sessione propria),
S8, S9, S10 e S11. L infrastruttura resta viva fino al ritiro, che e dopo S11 e
mai prima; la lista di ritiro per esteso ora vive **anche** nel file degli
esiti, e non solo in `USA-E-GETTA.txt`, che il ritiro stesso cancella.

Tutto in `docs/analisi/promemoria-app-chiusa/sonda-iphone-esiti.md`, che porta
anche i quattro rilievi mossi al verbale precedente e i confini di ogni misura.

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
  (27 maggio), `id=2` Roberto **paziente** (30 giugno), `id=3` Silvana e `id=4`
  Franco, pazienti. L'owner ha admin su tutti e quattro, ciascun paziente ha il
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
| 1 | **`/recupero` senza guardia sul minimo** | **M1** | Spec 4.7 :431 tiene il TODO su `intervallo_minimo_ore`; la decisione 2 ha guardato la sola presa. Il server accetta un recupero che anticipa sotto il minimo: oggi lo ferma solo lo slider del client (`calcolaRecuperoMax`). Stessa sede e stesso `tempo.minuti_reali`. |
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
  Cancellarle e M3 applicato al record: serve una ratifica, vedi decisione 18.

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
2. **Le notifiche ad app chiusa: realizzarle o no, e per quale via.** Il
   README non le promette piu; la funzione non esiste. Il rapporto in
   `docs/analisi/promemoria-app-chiusa/` porta quattro opzioni e le scartate;
   le sue dieci decisioni sono le voci 8-17 qui sotto. Il primo passo
   proposto da tutti e tre i progettisti e una sessione di sola sonda sul
   telefono vero, senza codice nel repo.
   - **Suono e superficie.** Misurato il 4 settembre: il suono di default e
     quello **standard** delle notifiche su ENTRAMBI i rami, quindi non
     discrimina fra dichiarativo e classico come si temeva. Non e stata
     tentata alcuna opzione di suono, quindi resta non misurato se una via per
     cambiarlo esista. Per una sveglia notturna M1 resta scoperto: un avviso
     che suona come ogni altro non sveglia. Si aggiunge una dimensione nuova,
     la **superficie**: con l Apple Watch al polso suonano il Watch e non il
     telefono, e il Watch di notte puo essere al polso come in carica. Un
     promemoria notturno deve reggere in **entrambe** le configurazioni. Non
     sondato: se un tocco sul Watch svegli il service worker.
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

L'ultima NON dipende dalla decisione 2: vale in qualunque caso, anche se le
notifiche ad app chiusa non si fanno.

18. **Le due righe di log aperte e irraggiungibili sul Mini.** Sono un record
    di fatti realmente avvenuti, quindi cancellarle e M3 e non e un atto
    meccanico. Tre vie, dalla piu conservativa: **(a)** lasciarle e
    dichiararle, visto che non toccano il piano di oggi; **(b)** portare al
    server la cancellazione che oggi il cambio profilo fa solo in locale;
    **(c)** trattare come stantia ogni riga aperta piu vecchia della finestra
    del piano. Per l'opzione B del rapporto la (b) o la (c) sono un
    prerequisito: un motore sul Mini leggerebbe una dose aperta per uno slot
    che in `orari_base` non esiste piu, ed e M1.

19. **La riga di `CLAUDE.md` "Non esiste produzione con utenti terzi".** In
    produzione ci sono `id=3` Silvana e `id=4` Franco, pazienti attivi con
    self-permesso e zero farmaci, piu l'owner `id=1` distinto dal pilota. I
    loro token sono validi. Allineare la riga, o dichiarare che quelle tre
    righe sono di prova e restano senza dati clinici. E documento normativo:
    la modifica spetta a te.

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
