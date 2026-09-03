# Come far arrivare il promemoria della dose ad app chiusa

PharmaTimer, analisi in sola lettura, 3 settembre 2026, HEAD e966859.

Opzioni con costi e rischi per iPhone (pilota) e moto g06, con l'architettura
attuale: PWA installata dall'origine ts.net, backend sul Mini raggiungibile
solo in tailnet, tabella `push_subscriptions` esistente e mai usata. Nessuna
decisione e presa qui: le decisioni sono elencate in fondo e spettano a
Roberto.

Questo file e la trascrizione in Markdown di `rapporto.html`, pubblicato come
artefatto nella stessa sessione. I contenuti coincidono; l'HTML porta in piu la
sola impaginazione.

## Stato del lavoro

- **Gate di apertura:** `make check` VERDE (lint, frontend, DST, backend,
  inventario, albero con TREE 0 e AHEAD 0).
- **Workflow:** 16 agenti; **12 completati** (9 di misura, 3 progettisti
  indipendenti), **4 falliti** per limite di spesa.
- **Fasi NON eseguite:** giudice 1, 2 e 3; sintesi; verifica a tre lenti
  delle affermazioni chiave; critico di completezza e riempimento lacune.
- **Convergenza:** i tre progettisti, con angoli diversi (sicurezza clinica,
  minimo cambiamento, affidabilita), sono arrivati allo stesso ordine di
  opzioni.

Il rapporto e composto dai dodici risultati letti per intero, piu le misure
fatte da me sul repo e sul Mini in sola lettura. Le affermazioni sui telefoni
portano fonte e data cosi come le hanno raccolte i ricercatori; **nessuna e
passata dalla confutazione indipendente** che il workflow prevedeva, perche
quella fase non e partita. Dove una affermazione poggia su una sola fonte
secondaria, lo dico.

## Il metro: i TRE MAI applicati a un canale di avviso

Un promemoria ad app chiusa e un canale di avviso, non una via di scrittura.
La sua unica funzione clinica e far aprire l'app all'ora giusta. Da qui i tre
invarianti che i tre progettisti hanno proposto indipendentemente e che ogni
opzione sotto rispetta.

- **I1, testo.** Il testo non asserisce mai uno stato ("non ancora presa",
  "in ritardo di N"): la conoscenza del server e stantia per costruzione. Il
  testo si auto-data (porta l'ora prevista) e invita ad aprire l'app.
- **I2, record.** Il canale non scrive mai `log_assunzioni` ne la coda di
  uscita: nessun bottone che registra, nessuna riga "prevista" materializzata
  dal server, nessuna seconda via di scrittura accanto al taccuino-prima.
- **I3, silenzi.** Ogni non-invio e registrato con un motivo e visibile in
  Impostazioni. La mancanza di un dato (consenso ignoto, calendario non
  pubblicato, profilo assente) non produce mai un silenzio non tracciato.
  Assenza di informazione = procedere.

## 1. Cosa fa oggi il codice, misurato

### Client

- **Meccanismo.** `src/services/notifications.js`: `setTimeout` in pagina piu
  `new globalThis.Notification(title, {body, tag})`. Un `fireAt` gia passato
  e scartato in silenzio (Q-CP2.3=A); il permesso e ricontrollato al momento
  del fuoco. Nessun `showNotification`, nessun `pushManager`, nessun
  `TimestampTrigger`.
- **Trigger.** Tick ogni 60 s che riprogramma solo su rollover di giornata o
  ogni 30 tick; `visibilitychange` e `focus` riprogrammano sempre; piu init,
  toggle e i thunk di configurazione. Ogni passata fa `cancelAll` e
  riprogramma le sole voci di *oggi* in stato prevista o ricalcolata. Il
  codice stesso dichiara il rischio: "iOS PWA risk of setTimeout killed
  during background suspend".
- **Testo.** Titolo = nome del farmaco; corpo = relazione pasto oppure
  "Promemoria farmaco". Nessun orario. Il dosaggio promesso da Spec 6.1 non
  esiste nel modello ne nella tabella `farmaci`: la Spec lo intende dentro il
  nome (5.2, "Medrol 16mg"). La UI dice "Avviso poco prima di ogni dose"
  mentre il codice suona all'istante.
- **Click.** `window.location.href = '/oggi'` con path assoluto: ignora
  `BASE_URL`. Corretto sulla build del Mini (base `/`), rotto su GitHub Pages
  (base `/pharmatimer/`). E un handler di pagina: vive quanto la pagina.
- **Consenso.** `notifiche_attive` vive solo in `impostazioni_app` di Dexie
  sul telefono: `ApiRepository` e `SyncRepository` delegano `setSetting` al
  locale, e il backend non ha alcun router impostazioni. Sul Mini
  `impostazioni_app` non ha righe con "notif". **Il server non sa se il
  paziente ha attivato le notifiche.**
- **Service worker.** `vite.config.js` (LOCKED) usa `generateSW` puro:
  `registerType "prompt"`, `skipWaiting false`, `clientsClaim false`, nessun
  `importScripts`, `injectManifest` o `strategies`. Lo `sw.js` servito dal
  Mini lo conferma: solo workbox e precache. Aggiungere un handler `push`
  richiede una riga `workbox.importScripts` nel file LOCKED (ratifica) oppure
  il passaggio a `injectManifest`.
- **Persistenza su WebKit.** `src/data/db.js` documenta che su WebKit mobile
  il flag IndexedDB dell'onboarding non sopravviveva ai ricaricamenti
  (Finding #10) mentre `localStorage` si. `notifiche_attive` non ha specchio
  in `localStorage`. Qualunque dato nuovo del canale (endpoint della
  subscription, device id) va in una sede la cui persistenza e provata.

### Server e schieramento

- **`push_subscriptions`** esiste da `v01_init.sql` (endpoint 500, p256dh
  200, auth 100, device_label, attiva, indice utente+attiva). Nel codice la
  nominano solo il TRUNCATE di `conftest.py` e `db_probe.sql`. Sul Mini:
  **zero righe**.
- **Nessun processo periodico.** Il lifespan di FastAPI fa solo `init_pool` e
  `close_pool`; pytest usa `TestClient` senza context manager, quindi il
  lifespan non gira nei test; uvicorn e a processo singolo dentro
  `api-wrapper.sh` con KeepAlive. Esiste gia un LaunchAgent a calendario
  (`com.pharmatimer.backup`, 03:00) come pattern.
- **Chiave della dose.** UNIQUE `(utente_id, farmaco_id, data, dose_numero)`
  da v02, usata in `SELECT ... FOR UPDATE` da tutti e cinque i verbi.
  Coincide, a meno di `utente_id`, con la chiave del piano
  (`dateStr-farmacoId-doseNumero`) e con il tag della notifica
  (`dose-farmacoId-doseNumero-dateStr`). Il server **non materializza le
  previste**: una riga nasce al primo verbo o come D+1 ricalcolata.
  `ora_ricalcolata` e DATETIME (v04); il ricalcolo tocca solo D+1;
  `client_op_id` UNIQUE (v06) deduplica il gesto.
- **Il profilo non arriva mai al server.** Nessun router legge o scrive
  `profilo_utente`; `ApiRepository` delega i sette metodi profilo al locale.
  **Misurato oggi sul Mini: `profilo_utente` ha zero righe.**
  `orari_base.ora_prevista` e uno snapshot calcolato dal client al
  salvataggio del farmaco (BUG-k, s.6.246) e non viene riscritto al cambio
  profilo, che e solo locale. Il cambio profilo cancella in locale le righe
  ricalcolate ma non lo dice al server: **sul Mini l'utente 2 ha una riga
  `ricalcolata` orfana** (data anteriore a ieri).
- **Dati reali del pilota** (utente 2, oggi): 7 farmaci attivi, 12 righe
  `orari_base`, **5 farmaci su 7 nel ramo esteso o `fisso_date`** (righe con
  `data_specifica`, una per domani), 2 righe di log negli ultimi 7 giorni.
- **Mini** (misurato oggi, sola lettura): macOS 26.6, Tailscale 1.94.2,
  `tailscale serve` su `https://marketreader-server.taila127de.ts.net` (solo
  tailnet) verso `localhost:8000`; certificato Let's Encrypt **valido dal 26
  luglio al 24 ottobre 2026** (il rinnovo automatico e avvenuto: la finestra
  registrata a maggio era scaduta e i progettisti la temevano); `pmset` con
  `sleep 0` e **zero eventi di sonno a log**, uptime 28 giorni; venv in
  `~/PharmaTimer/.venv`, Python 3.13.12, fastapi 0.136.3, httpx 0.28.1,
  uvicorn 0.48.0, **nessuna cryptography ne pywebpush**; egress verificata:
  `web.push.apple.com` 405, `fcm.googleapis.com` 404,
  `updates.push.services.mozilla.com` 406, tutti sotto 0,4 s.

### Cosa promettono e cosa hanno gia deciso i documenti

- Spec 6.1-6.3: consenso al primo avvio (oggi e un toggle in Impostazioni),
  una notifica per dose all'ora prevista o ricalcolata (solo a pagina viva),
  contenuto nome + dosaggio + relazione pasto (dosaggio assente), iOS 16.4+
  da Home con SW attivo, Android Chrome/Edge. Stato: parziale a pagina viva,
  non realizzata ad app chiusa. Spec 2.1 e 8.1 promettono ancora "push via
  PWA" e "SW per notifiche push": non realizzate; 11.5.2 le rimanda alla fase
  col backend.
- Ratifiche gia prese e mai eseguite (maggio 2026, par. 11.D-rev): **Q9=A**
  APScheduler dentro FastAPI, **Q10=A** chiavi VAPID via pywebpush;
  **Q16=B** dispatch cross-utente con opt-in `notifiche_caregiver_attive`
  (tutti a 0 sul Mini); Q-SYNC: refresh on-open, nessun polling in
  background. Per lezione #30 non si sovrascrivono con default: si riaprono
  per lettera.
- Il bivio **DESIGN-B** ("motore occorrenze server contro calendario
  pubblicato dal client", Spec 14.1(b)) non e mai stato tenuto; la sonda
  iPhone push, dichiarata propedeutica, non e mai stata eseguita; CS-6
  "notifiche a server giu" non e mai stata collaudata. Il commit 02ae535
  registra che il pilota ha smesso di usare la modalita server a luglio e che
  la ragione dichiarata e proprio l'assenza di notifiche ad app chiusa.
- Spec 4.8 opzione G: il filtro di inizio terapia agisce alla generazione
  delle occorrenze, con *un solo punto di applicazione*, e nomina le
  notifiche push fra le superfici che devono restare coerenti. Un secondo
  generatore server lo viola per lettera, salvo un gate di parita dichiarato.

**Due rilievi emersi dalla misura, non ancora pinnati.** Vanno visti rossi
con un test prima di essere contati come difetti, e vanno chiusi in qualunque
opzione perche il nuovo canale erediterebbe lo stesso selettore.

- (a) **Dose oltre la mezzanotte persa al rollover.** `rescheduleAllNotifications`
  riprogramma solo `selectEntriesForDay(oggi)` dopo `cancelAll`: la dose di
  ieri con `ora_ricalcolata` a oggi 07:00 ha `dateStr` di ieri, non viene
  riprogrammata, e il primo `visibilitychange` dopo mezzanotte cancella il
  timer armato la sera prima. Sondato sui selettori con node; sonda di
  duplicazione su Changelog, git log e STATO senza esito.
- (b) **Su Chrome Android il costruttore `new Notification()` lancia sempre
  `TypeError`** (MDN browser-compat-data) e `notifications.js` lo chiama
  senza `try/catch`: i timer di pagina odierni non produrrebbero alcun avviso
  sul moto g06. Dedotto da BCD piu lettura del sorgente, da esercitare sul
  telefono.

## 2. Cosa consente il telefono, con fonti datate

### iPhone: PWA installata dalla Home

| Punto | Stato a settembre 2026 | Fonte e data |
|---|---|---|
| Web Push | Solo per web app aggiunte alla Home, manifest `display: standalone` o `fullscreen`, permesso chiesto dentro un gesto utente. Mai in una scheda Safari su iOS. Il manifest di PharmaTimer e gia conforme. | WebKit blog 2023-02-16; Bugzilla 264074 (ingegnere Apple, nov 2023) |
| Account e certificati | Nessun Apple Developer Program, nessun certificato APNs: basta la coppia VAPID. | Apple docs "Sending web push notifications" (non datata); WWDC22 10098 |
| Declarative Web Push | Da iOS 18.4 per web app in Home: JSON con `web_push: 8030` e `notification{title, navigate}` obbligatori, `body`, `silent`, `app_badge` opzionali. Il sistema mostra la notifica **senza service worker**; se un SW e vivo puo sostituirla; e esente dalla penalita dei push silenziosi. Al tocco il browser naviga a `navigate` senza passare da `notificationclick`. Chromium non lo supporta. | WebKit blog 2025-03-27 e 2025-03-31; commit WebKit 2025-02-07 (bug 287296) |
| iOS 26 / Safari 26.0-26.6 | Nessuna voce su push, notifiche o badge nelle release notes. Novita: ogni sito aggiunto alla Home apre come web app. | WebKit blog 2025-09-15; release notes fino a 26.6 (2026-07-27) |
| Push silenziosi | Tre push che non producono una notifica entro 30 s revocano **tutte** le subscription dell'origine (`maxSilentPushCount = 3`). Un'origine ispezionata da Web Inspector non incrementa il contatore: il collaudo va fatto senza inspector. | WWDC22; sorgente WebKit `WebPushDaemonConstants.h` (main, letto 2026-09-03) |
| Non disponibili | Notification Triggers / `TimestampTrigger`, Background Sync, Periodic Background Sync, Background Fetch. Chrome stesso ha abbandonato i Notification Triggers. | MDN BCD (main); Chrome docs "No longer pursuing" |
| Vita della subscription | `pushsubscriptionchange` non viene mai emesso, `expirationTime` e null: la perdita si scopre solo con `getSubscription()` alla riapertura o con 404/410 all'invio. Web app rimossa dalla Home: subscription cancellate al riavvio di webpushd. | Bugzilla 273063 (ingegnere Apple, 2024-05-09); commit WebKit 2024-08-14 |
| Tocco | `notificationclick` nel SW non scatta in modo affidabile a web app chiusa (bug aperto, riprodotto fino a iOS 18.7, commento di agosto 2026). Dal 18.0 il tocco apre comunque la web app installata. | Bugzilla 268797, stato NEW |
| Azioni, tag, suono | Bottoni azione non resi (compare solo "View"); `tag` senza effetto di sostituzione; `renotify` e `requireInteraction` non supportati. Suono di sistema, ON per default, non personalizzabile; `silent: true` lo spegne. Badge via `app_badge` o `setAppBadge`. | MDN BCD; forum Apple 726793 (2023-2024) e 736399 (ago 2023); WWDC23 |
| Consegna | APNs conserva un messaggio non consegnabile fino a 30 giorni entro il TTL; `Urgency` e `Topic` documentati. Focus / Non disturbare sopprime. Low Power Mode: nessuna fonte Apple su Web Push. | Apple docs (non datata); forum Apple 770749 (dic 2024, aneddotico); Apple support 101604 (2025-12-03) |
| Affidabilita documentata | Thread ricorrenti 2023-2026 di push che arrivano una o due volte e poi smettono. Cause plausibili: penalita silent push (SDK senza `waitUntil`) e un bug di Web.app corretto in iOS 17.5. Nessun bug WebKit 2025-2026 su ritardi sistematici. | Safari 17.5 release notes 2024-05-13; forum Apple 765585 (ott 2024), 786360 (giu 2025); Discourse Meta 274806 |
| IndexedDB nel SW | Su iOS 18.1.1 `indexedDB` risultava `undefined` nel SW svegliato da un push. Nessuna fonte lo dichiara risolto. **Fonte secondaria unica.** | forum Apple 769794 (nov 2024 - feb 2025) |
| Unione Europea | Le web app in Home sono state mantenute in UE (marzo 2024): le fonti 2026 che dicono il contrario sono superate. | dichiarazione Apple riportata da TechCrunch 2024-03-01 |

### Android: moto g06 con Chrome

| Punto | Stato a settembre 2026 | Fonte e data |
|---|---|---|
| Il telefono | Annunciato 2025-09-05, **Android 15 standard, non Go** (Motorola etichetta le Go esplicitamente), Helio G81, 4 o 8 GB. Patch di sicurezza fino ad agosto 2027 e nessun Android 16 secondo fonti secondarie. | GSMArena e scheda Motorola; Tech Advisor 2025-12-04 |
| Push service | FCM, endpoint `fcm.googleapis.com/fcm/send/...` o `/wp/...`. `userVisibleOnly: true` obbligatorio; un push senza `showNotification` dentro `waitUntil` mostra "This site has been updated in the background". Subscription inattive da oltre 9 mesi rispondono 404. | web.dev 2016 (regola viva, riconfermata da issue firebase 2024-2026); Pushpad 2024-06-28 |
| Doze e priorita | FCM consegna i messaggi high priority anche in Doze e sveglia il dispositivo; i normal slittano alla finestra di manutenzione; se i messaggi high non producono notifiche vengono deprioritizzati. **La mappatura `Urgency: high` del Web Push sulla priorita FCM non e documentata da Google**; le evidenze 2017-2019 (Android 7/8) dicevano che non bastava a svegliare Chrome. Su Android 15: da misurare. | Firebase docs 2026-09-01; chromium-dev 2017-11-28 |
| Motorola | "Migliora la batteria quando inattivo" (`com.motorola.batterycare`) nel 2024 uccideva le app ogni ora a prescindere dal toggle (Moto G64, Android 14). Nessuna fonte specifica per il g06. **Fonte secondaria.** | dontkillmyapp issue 1142, 2024-08-04 |
| Pianificazione locale | Notification Triggers: origin trial concluso, "No longer pursuing". Periodic Background Sync: solo PWA installata, cadenza minima 12 h, governata dall'engagement, differita in Doze: inutile per orari di terapia. | Chrome docs (chromestatus 2022-09-13); Chrome docs 2025-08-19 |
| TTL e Topic | TTL onorato da 0 a 28 giorni, default 4 settimane; TTL 0 = scartato se non consegnabile subito. Topic: FCM dichiara di supportare gli header Web Push ma non lo elenca: da provare. | Firebase docs 2026-09-01 |
| Notifica | Suono e vibrazione dal canale Android del sito (un canale per origine da Chrome 62); suono custom mai esistito; `requireInteraction` persiste; massimo 2 azioni; `notificationclick` con `openWindow` apre nella PWA standalone. Con WebAPK le notifiche compaiono come dell'app. | README Chromium canali; Chrome blog 2016-01-29; MDN openWindow 2026-05-29 |
| Installazione | "Installa app" = WebAPK (icona nel drawer, voce in Impostazioni > App, richiede GMS); "Aggiungi a schermata Home" = scorciatoia con badge Chrome e capacita ridotte. Manifest ricontrollato ogni 24 h; l'update WebAPK avviene a finestre chiuse, in carica e su Wi-Fi. | Chrome blog 2023-12-05; web.dev 2024-09-19 |
| Policy 2025-2026 | Auto-revoca del permesso per siti a basso engagement (PWA installate esenti); rate limit Push API 1000/min con 429; Chrome 155: prompt permesso non bloccante che scade da solo con `permission = 'default'`. | Chromium blog 2025-10-10; Chrome blog 2026-01-06 e 2026-07-22 |
| Timer di pagina | `new Notification()` lancia sempre `TypeError`: il meccanismo odierno non suona su Android neanche a pagina viva. **Non esercitato.** | MDN BCD (chrome_android, partial) |

## 3. Cosa serve sul server

### Chiavi VAPID

- Una sola coppia P-256 per il Mini, generata una volta con `vapid --gen`
  (CLI di py-vapid 1.9.4, gennaio 2026). La ratifica Q10=A citava
  `pywebpush --gen-keys`: quel comando non esiste, l'intento e lo stesso.
- Privata in PEM con permessi 0600 fuori dal repo, nella home del Mini
  accanto a `~/.my-pharmatimer.cnf`; path e `sub` (mailto:) nel `.env.dev`
  del Mini, che il deploy esclude dal rsync; **backup fuori macchina** (oggi
  il backup notturno e solo mysqldump). La pubblica e servita al client e non
  e segreta.
- RFC 8292: JWT ES256 con `aud` = origine dell'endpoint, `exp` non oltre
  24 h, `sub` mailto: o https:. La subscription e legata alla chiave passata a
  `subscribe` (Apple risponde 403 `VapidPkHashMismatch`). **Perdere la
  privata = tutte le subscription da rifare** con unsubscribe piu subscribe:
  il browser rifiuta una subscribe con chiave diversa (`InvalidStateError`).

### Libreria e dipendenze

- **pywebpush 2.5.0** (PyPI 2026-08-30, puro Python, Python >= 3.10, un solo
  maintainer) porta cryptography 50.0.1 (wheel abi3 per macOS arm64 e Python
  3.13: nessuna compilazione attesa), py-vapid, http-ece 1.2.1 (solo sdist,
  2024-08-08, classifiers fino a 3.12: installazione su 3.13 attesa ma **non
  eseguita**) e requests (secondo client HTTP accanto a httpx).
- Trappole misurate nel sorgente: `ttl=0` di default (consegna solo se il
  telefono e online in quell'istante) va sempre sovrascritto; il dict
  `vapid_claims` viene mutato; `WebPushException` espone `status_code` e
  `retry_after`.
- Alternativa: `webpush` su PyPI (1.0.6, 2025-10-29) costruisce solo
  cifratura e header e lascia la POST a httpx. Implementazione minima con la
  sola cryptography: circa 100 righe, ma da collaudare contro Apple e FCM.
- La reinstallazione editable sul Mini va fatta dal Terminale (memoria di
  progetto: nel sandbox fallisce); `pip list` sul Mini prima di aggiungere
  dipendenze (lezione #31).

### Protocollo

| Elemento | Regola | Fonte |
|---|---|---|
| TTL | Obbligatorio, in secondi (400 se manca). 0 = solo se il dispositivo e online ora. Apple conserva fino a 30 giorni, FCM fino a 28. Se Apple accetti 0 non e documentato (`BadTtl` = "missing or not positive"): da misurare. | RFC 8030 5.2; Apple docs; Firebase 2026-09-01 |
| Urgency | `very-low`, `low`, `normal`, `high`. Apple: "high" per tentare la consegna immediata. FCM: mappatura non documentata. | RFC 8030 5.3; Apple docs |
| Topic | Massimo 32 caratteri base64url; un messaggio con lo stesso Topic **sostituisce** quello ancora in coda. Apple dice "coalesce": se sostituisce o solo raggruppa non e misurato. | RFC 8030 5.4; Apple docs |
| Corpo | Cifratura `aes128gcm` (RFC 8291); 4096 byte garantiti, plaintext massimo 3993. | RFC 8291; RFC 8030 7.2 |
| Risposte | 201 accettato; 404 e 410 subscription morta, da disattivare; 429 e 503 con Retry-After; 400 e 403 difetto di richiesta o VAPID (Apple restituisce `reason`: BadJwtToken, VapidPkHashMismatch, BadTtl, BadWebPushTopic). | RFC 8030; Apple docs; web.dev 2024-09-20 |
| Rete in uscita | Solo HTTPS 443 verso `https://*.push.apple.com` e `fcm.googleapis.com`. Nessuna connessione entrante, nessun IP pubblico, nessun progetto Firebase. **Misurato dal Mini: raggiungibili.** | Apple docs; Firebase network configuration 2026-09-01; misura odierna |

### Il pianificatore

I tre progettisti concordano su un punto: **fuori da uvicorn**. pytest non
esegue il lifespan, uvicorn e a processo singolo, e lo stato in RAM si perde a
ogni riavvio del wrapper. Il pianificatore va in un LaunchAgent separato che
legge solo il DB. Q9=A (APScheduler dentro FastAPI) va quindi **riaperta per
lettera**, non sovrascritta.

**Dove i tre divergono.** Passata idempotente con `StartInterval 60`
(progettisti sicurezza e minimo: launchd serializza da solo e ogni passata
riparte dal DB) contro processo residente KeepAlive con loop ogni 20-30 s e
`last_tick` persistito (progettista affidabilita). La differenza conta se il
Mini dorme: `StartInterval` salta le occorrenze nel sonno,
`StartCalendarInterval` le coalizza al risveglio, un processo residente e
congelato (launchd.plist(5)). **Misurato oggi: il Mini non dorme** (`sleep 0`,
zero eventi a log, uptime 28 giorni), quindi la precondizione e gia
soddisfatta e la scelta e di gusto ingegneristico, non di sicurezza.

### Idempotenza del push

- Tabella `push_dispatch` con UNIQUE su (subscription, chiave dose,
  eventualmente motivo); **INSERT prima della POST**; stati espliciti
  (pending, inviato, non inviato con motivo, scaduto, errore); al riavvio si
  riprende solo cio che non e inviato e sta dentro la finestra di tolleranza.
  Nessuna dedup in RAM.
- Seconda rete: `Topic` = chiave dose, che sostituisce in coda al push
  service. Terza rete: `tag` della notifica nel SW, uguale a quello dei timer
  di pagina, che fonde su Android e **non** su iOS.
- Una sola subscription attiva per telefono (su iOS `getSubscription()` puo
  tornare null e la nuova subscribe convivere con la vecchia lato server).

### Telefono offline o fuori tailnet al momento del push

- La consegna **non passa dal tunnel Tailscale**: APNs parla col telefono su
  17.0.0.0/8 porta 5223 (fallback 443) e Tailscale senza exit node non
  instrada il traffico Internet pubblico (Apple 102266, 2023-08-22; Tailscale
  kb/1103, 2025-12-15). Il push arriva anche a Tailscale spento. Il Mini deve
  solo uscire su Internet verso i push service.
- Telefono spento o senza rete: il push service trattiene entro il TTL. Per
  questo il TTL va corto e il Topic va usato: un "ora di Medrol" consegnato
  tre ore dopo e un invito alla seconda presa.
- Tailscale iOS installa da solo una policy VPN On Demand che rialza il
  tunnel dopo riavvio, aggiornamento o crash (docs 2026-01-05); segnalazioni
  storiche di cadute e una network extension che iOS puo terminare per
  memoria (fonti 2023).

### Il tocco e l'app che deve raggiungere il Mini

- Su iOS 18.4+ con payload dichiarativo il tocco naviga a `navigate` e apre
  la web app installata; con il SW classico passa da `notificationclick`,
  inaffidabile ad app chiusa, ma dal 18.0 la web app si apre comunque. Su
  Android `notificationclick` piu `openWindow` apre la WebAPK.
- Se il Mini non e raggiungibile, **la catena esistente basta**: `apiClient`
  mappa il rifiuto di rete a `DB_UNAVAILABLE`, la lettura cade sullo specchio
  (CS-3) senza alzare la freschezza, e la presa va in coda con l'orario vero
  del tocco (taccuino-prima, Spec 14.2). Lo specchio non sovrascrive mai le
  chiavi in coda o parcheggiate. Nessun cambiamento richiesto.
- Certificato del Mini: valido fino al 24 ottobre 2026, rinnovo automatico di
  `tailscale serve` avvenuto. A certificato scaduto la subscription resta
  valida (e legata all'origine, non al certificato) ma ogni fetch verso
  `/api` fallisce con errore TLS, che per Spec 14.4 PROPAGA.

## 4. Il rapporto col vincolo di dominio

### Come il server sa cosa e gia stato preso

Al momento di spingere: `SELECT stato, ora_ricalcolata FROM log_assunzioni
WHERE utente_id, farmaco_id, data, dose_numero` sull'indice UNIQUE di v02.
**presa, saltata o sospesa** = non si invia e si registra il motivo.
**ricalcolata** = l'istante vero e in `ora_ricalcolata` (DATETIME), gia
passato dalla guardia dell'intervallo minimo di `/presa`. **Nessuna riga** =
dose dovuta: si invia (fail-safe).

Cio che il server **non sa e non sapra mai a fire time**: la presa fatta
offline o fuori tailnet. Vive nella coda di uscita del telefono fino al primo
drain riuscito, senza tetto ne scadenza (irraggiungibile, 5xx e UNAUTHORIZED
lasciano l'elemento pending; ogni 4xx lo parcheggia fino a mano umana). Online
la finestra e sotto il secondo; offline e illimitata; per un elemento
parcheggiato non si chiude mai da sola. **Nessun disegno server-side puo
eliminare questa finestra.** Si contiene con I1 (testo che non asserisce lo
stato), con la lettura opportunistica del taccuino dal SW (certa su Android,
incerta su iOS), con il tocco che apre lo specchio protetto, con TTL corto e
Topic. La chiude solo un canale che programma e cancella sullo stesso telefono
(opzione D).

### I quattro casi della domanda

| Caso | Strato | Difesa | Residuo dichiarato |
|---|---|---|---|
| Arriva due volte | push service | `Topic` = chiave dose sostituisce il messaggio in coda | Apple: "coalesce", sostituzione non misurata |
| Arriva due volte | server | UNIQUE in `push_dispatch`, INSERT prima della POST, una subscription attiva per telefono, un solo motivo per dose, launchd serializza | nessuno se la UNIQUE e pinnata rossa |
| Arriva due volte | telefono | `tag` uguale fra SW e timer di pagina | fonde solo su Android; su iOS il tag non ha effetto |
| Arriva due volte | timer di pagina + push ad app aperta | decisione 3: i tre progettisti divergono | su iOS possibile doppio *simultaneo* con lo stesso testo: non un secondo avviso dopo la presa |
| Non arriva | subscription morta | 410 all'invio disattiva; `getSubscription()` a ogni apertura e `visibilitychange` risottoscrive e ricarica | iOS non emette alcun evento: si scopre alla prossima apertura |
| Non arriva | Focus, Low Power, Doze | impostazioni del telefono; `Urgency: high`; batteria senza limitazioni sul g06 | non eliminabile dal codice |
| Non arriva | Mini giu o addormentato | oggi non dorme; il pianificatore recupera al risveglio entro tolleranza e oltre registra "scaduto" | a Mini giu il canale push tace: restano i timer di pagina, se la pagina e viva |
| Non arriva | VAPID o config assente | 503 dichiarato dal router, il pianificatore esce senza inviare e lo scrive | si spegne un canale, non una consegna |
| Non arriva | penalita silent push | mai un push senza notifica visibile; il dichiarativo e esente | nessuno se il SW mostra sempre |
| Arriva per una dose gia presa | presa online | il pianificatore rilegge il log a fire time e non invia; il client ripubblica il calendario senza quella dose al commit | nessuno |
| Arriva per una dose gia presa | presa offline o in coda | I1, SW che riscrive il testo dal taccuino, tocco che apre lo specchio, TTL, tolleranza breve, mai un secondo push | **finestra M1 residua**, comune a ogni canale server-side; chiusa solo da D |
| Ricalcolo D+1 omesso o rifiutato dal server | divergenza dichiarata | il telefono mostra l'ora ricalcolata finche non rilegge; il server ha rifiutato per intervallo minimo | decisione 4: quale delle due suona |

### Altri vincoli

- **Consenso.** `notifiche_attive` resta locale (Spec 14.4 punto 2). La
  subscription *e* il consenso: nasce solo dal gesto sul toggle e dal prompt
  di sistema; la revoca sul telefono produce 410. Il server non deduce nulla e
  non sopprime per consenso ignoto.
- **Fuso e ora legale.** Se l'istante lo calcola il telefono (A, D) e viaggia
  come ISO con offset, il server confronta istanti e la decisione 7 (fuso
  fisso Europe/Rome) non entra. Se lo calcola il Mini (B), il paziente in
  viaggio riceve gli avvisi all'ora di Roma. La decisione 4 ("sonno + 60 =
  00:30 dello stesso giorno") viene ereditata tal quale da tutti, perche
  l'etichetta nasce dallo stesso resolver.
- **Ricalcolate orfane del cambio profilo.** Il caso e reale (una riga sul
  Mini). Per B e un prerequisito; per A e un rimedio da ratificare (portare la
  cancellazione al server, oppure trattare come stantia ogni ricalcolata piu
  vecchia dell'ultima pubblicazione).
- **Spec 4.8 opzione G.** Un solo punto di generazione delle occorrenze. A lo
  rispetta per costruzione (il piano resta in una lingua sola); B lo viola per
  lettera salvo un gate di parita JS/Python dichiarato come la forma in cui la
  lettera e rispettata.

## 5. Le opzioni

Ordine di sicurezza clinica e poi di costo, come e emerso da tutti e tre i
progettisti. Le lettere sono identita, non una sequenza. I timer di pagina
restano in ogni opzione salvo decisione contraria (decisione 3).

### A. Calendario pubblicato dal telefono, Web Push dal Mini

6-10 sessioni, 0 EUR. Tre progettisti su tre la mettono prima.

Il telefono, che gia calcola il piano e gia riarma i timer in otto punti,
pubblica al Mini il calendario risolto (chiave dose, istante in UTC, titolo,
corpo). Un pianificatore sul Mini rilegge il log a fire time e spinge una sola
volta per dose e dispositivo. Su iPhone con iOS 18.4+ il payload dichiarativo
viene mostrato dal sistema anche a service worker morto; su Android lo mostra
un `push-sw.js` di poche righe. Il Mini non rifa alcun dominio.

**Server.**

- Migrazione additiva v07 **prima del codice**: `push_calendario` (utente,
  farmaco, data, dose_numero, fire_at UTC, titolo, corpo, pubblicato_at;
  UNIQUE identica a quella del log) e `push_dispatch` (subscription, chiave
  dose, motivo, stato, http_status, sent_at; UNIQUE). `push_subscriptions`
  basta com'e, al piu colonne additive (hash dell'endpoint, device_id,
  formato, ultimo esito). Mai colonne su `log_assunzioni`.
- Router `push.py` con SQL nel router e `get_current_user`: chiave pubblica
  VAPID; upsert e disattivazione della subscription; `PUT` del calendario con
  sostituzione atomica della finestra; stato per Impostazioni (I3).
- Pianificatore in LaunchAgent separato (vedi divergenza sopra): seleziona le
  voci con `fire_at` nella finestra di tolleranza e senza dispatch inviato;
  rilegge il log per la chiave slot; INSERT del dispatch prima della POST;
  invia con pywebpush, `ttl` esplicito, `Urgency: high`, `Topic` = chiave
  dose; 404/410 disattiva, 429/503 rispetta Retry-After, 400/403 a verbale con
  la reason di Apple. Oltre la tolleranza: "scaduto" a verbale, mai in
  silenzio.
- Payload unico: `{web_push: 8030, notification: {title, body, navigate:
  origine + '/oggi', silent: false}, chiave, fire_at}`: dichiarativo su iOS,
  dati per il SW su Android.
- VAPID e dipendenze come in sezione 3. Sedi esistenti da aggiornare:
  `conftest` (TRUNCATE), g21 e inventario voce 19 (nuovo livello v07),
  `deploy-mini.sh` (bootstrap del nuovo LaunchAgent), `make openapi`.

**Client.**

- Nuovo modulo di rete in `src/data/repository/` che **importa** `apiClient`
  (oggetto congelato con `X-User-Token` gia iniettato) senza toccarlo:
  `apiClient.js` e `ApiRepository.js` restano intatti. La collocazione va
  ratificata.
- Funzione pura che costruisce il calendario dalle stesse formule dei timer
  (`parseIsoDateTime` su `ora_ricalcolata`, `wallToInstant` su
  `ora_prevista`), iterando **per istante effettivo su tutto l'orizzonte** e
  non per `dateStr === oggi`, cosi la dose di ieri ricalcolata a oggi entra.
  Chiamata dalle stesse sedi di `maybeReschedule` piu dopo un drain riuscito;
  hash del payload per non ripubblicare l'invariato (nessun traffico
  periodico: Q-SYNC rispettata).
- `useNotifications.requestEnable`: `pushManager.subscribe({userVisibleOnly:
  true, applicationServerKey})` dentro il gesto del toggle, poi upload; a
  ogni mount e `visibilitychange`: `getSubscription()`, risottoscrizione e
  ricarico se null o diverso; endpoint specchiato in `localStorage`, non in
  Dexie. Toggle off: unsubscribe piu DELETE.
- `public/push-sw.js`: `push` che mostra **sempre** una notifica dentro
  `waitUntil` (ignora il dichiarativo, che mostra il sistema), `tag` uguale
  ai timer di pagina, lettura opportunistica del taccuino con `try/catch` e
  timeout per riscrivere il testo in "gia registrata alle HH:MM", **mai
  sopprimere**; `notificationclick` con `matchAll`, `focus`, altrimenti
  `openWindow`. Incluso con **una riga** `workbox.importScripts` in
  `vite.config.js`: file LOCKED, **ratifica necessaria**. Su iOS 18.4+ il SW
  non serve al fuoco: la riga si puo differire all'arrivo dell'Android.
- Impostazioni: la copy "Avviso poco prima di ogni dose" allineata al vero;
  stato del canale (attivo dal, ultimo invio, ultimo errore, calendario
  pubblicato fino al). Il toggle esistente resta il consenso.

**Telefono.**

- **iPhone:** nulla da reinstallare, la PWA in Home dall'origine ts.net e
  quella che riceve. Verificare iOS >= 18.4 (sotto, resta il ramo SW con tocco
  degradato). Dopo il deploy accettare il prompt di aggiornamento (il SW nuovo
  si attiva solo cosi). Toggle in Impostazioni; in iOS Impostazioni >
  Notifiche > PharmaTimer: Consenti, Suoni, Badge; aggiungere PharmaTimer ai
  Focus in uso. Non rimuovere e riaggiungere la web clip (subscription
  cancellata, storage vuoto, LoginGate). Tailscale non serve alla ricezione,
  serve al tocco.
- **moto g06:** Tailscale Android e nodo ammesso; Chrome aggiornato; aprire
  l'origine e usare **"Installa app"**, non "Aggiungi a schermata Home";
  toggle e permesso (su Chrome 155+ il prompt scade da solo: ripetere dal
  gesto); Impostazioni > App > PharmaTimer e Chrome > Batteria: senza
  limitazioni; "Migliora la batteria quando inattivo" OFF se esiste; canale
  notifiche con suono e vibrazione; "Notification cooldown" OFF se esiste.
- **Mini** (dal Terminale): pip install nel venv, `vapid --gen`, PEM 0600 con
  backup, variabili in `.env.dev`, plist nuovo in `~/Library/LaunchAgents`,
  migrazione v07 prima del codice, `make prod-check` e g21 aggiornato dopo.

**Rischi di dominio.**

- **M1.** Presa offline in coda: finestra residua comune, contenuta come in
  sezione 4. Push in coda a telefono spento: Topic e TTL. Doppio simultaneo ad
  app aperta su iOS: decisione 3. Ricalcolo D+1 rifiutato dal server:
  decisione 4.
- **M2.** Nessuna via di scrittura nuova, SW in sola lettura, presa solo in
  app col tocco indivisibile; ogni non-invio ha una riga con motivo (I3). I
  timer di pagina restano come rete a server giu.
- **M3.** `log_assunzioni` non e toccata; il server non materializza
  previste; l'istante viene dal telefono. Verificabile: grep del pianificatore
  e del SW senza INSERT o UPDATE sul record, e conteggio settimanale delle
  righe di log contro i verbi nell'access log.
- **Orizzonte.** Il server conosce il piano solo fino alla fine
  dell'orizzonte pubblicato: ad app chiusa piu a lungo non ha dosi da
  spingere. Vedi decisione 5.

**Costi.** Sessioni: 6-8 (sicurezza), 6-7 (minimo), 8-10 (affidabilita, che
aggiunge hook nei cinque verbi e orizzonte a 7 giorni). Denaro: 0. Nessun
account Apple Developer, nessun certificato APNs, nessun Firebase. Ratifiche:
riga in `vite.config.js`; riapertura di Q9=A; pywebpush nel venv del Mini; v07
e nuovo livello g21; chiusura provvisoria del bivio DESIGN-B sul ramo
"calendario pubblicato" (s.6.258 candidata); sede del modulo di rete.

**Cosa perde.** Nessun re-push, nessuna escalation caregiver, nessun bottone
nella notifica. Su iOS niente dedup per tag, niente parametri nel tocco,
possibile doppio simultaneo ad app aperta. Server giu = solo timer di pagina,
come oggi. Il server dipende dal telefono per sapere *quando*: se il telefono
non pubblica, il server non inventa (I3: lo dice, non tace).

**Sicura:** si per tutti e tre i progettisti, a tre condizioni: pin rosso e
fix della dose oltre mezzanotte persa al rollover; rimedio alle ricalcolate
orfane; ratifica della riga in `vite.config.js`. E la sola variante che non
introduce una seconda verita del piano.

**Dove i tre divergono su A.** Orizzonte pubblicato: 3 giorni (sicurezza),
ieri-oggi-domani (minimo), 7 giorni con `buildMultiDayPlan(numDays: 7)`
(affidabilita). Tolleranza dopo l'ora: 20 minuti (minimo), 30 (affidabilita).
TTL: fino a 30 minuti (minimo), fino a 1 ora (sicurezza), fino a 6 ore
(affidabilita). Fine orizzonte: un avviso "apri PharmaTimer per aggiornare i
promemoria" alle 21:00 (sicurezza) o un nudge al giorno dopo 5 giorni
(affidabilita) contro nessun nudge, solo dichiarato (minimo). Hook nei cinque
verbi per chiudere le voci del calendario (affidabilita) contro la sola
rilettura del log a fire time (gli altri due).

### B. Motore delle occorrenze sul Mini, Web Push

10-15 sessioni, 0 EUR. Seconda per tutti, sotto condizioni.

Il ramo opposto del bivio DESIGN-B: il Mini riceve il profilo attivo, porta in
Python il dominio del "quando e dovuta" e genera da solo le dosi da farmaci,
orari, profilo e log, senza calendario pubblicato. Guadagna l'orizzonte
illimitato; paga con una doppia verita in due lingue.

- **Server.** Tutto di A tranne il calendario, piu: endpoint `PUT
  /api/profilo` (oggi inesistente; senza, il server non ha ancore: **zero
  righe in `profilo_utente` sul Mini**); port di circa 1070 righe JS e una
  quindicina di regole (ancore e "assoluto", wrap modulo 1440, scivolamento
  DST che `tempo.py` oggi dichiara di non implementare, T_inizio a tre rami su
  `DATE(created_at)`, ramo esteso a giorni civili o millisecondi,
  `fisso_date`, merge col log) con i 124 casi di test del dominio JS esportati
  come vettori d'oro consumati da **entrambe** le suite e visti rossi in
  entrambe; cancellazione delle ricalcolate al server nel cambio profilo
  (prerequisito, non rimedio); il motore calcola in `Europe/Rome`.
- **Client.** Solo la sottoscrizione di A (niente calendario), piu: ogni
  scrittura di profilo invia il profilo al server e il cambio profilo chiede
  la cancellazione delle ricalcolate. Il fix del rollover resta dovuto per i
  timer di pagina ma non e prerequisito del push.
- **Telefono.** Identico ad A. In piu: dopo il deploy aprire l'app una volta
  perche il profilo raggiunga il Mini; fino ad allora il pianificatore
  registra "profilo assente" visibile in Impostazioni, mai un silenzio.
- **Rischi di dominio.** Tutti quelli di A, piu il rischio proprio: **la
  divergenza fra due motori**. Un avviso a un'ora che l'app non mostra non
  induce da solo una doppia assunzione, ma un avviso *anticipato* puo indurre
  una presa sotto l'intervallo minimo. Sorgenti di divergenza note: profilo
  non ancora inviato, ricalcolate orfane, fuso Roma contro fuso telefono, wrap
  AMB-9.D, ogni regola futura mantenuta due volte (il difetto ricorrente
  numero uno). **Dato reale:** cinque farmaci su sette del pilota stanno nei
  rami esteso e `fisso_date`, cioe proprio i rami piu delicati del port. M3:
  il motore non deve mai scrivere le occorrenze generate in `log_assunzioni`
  (Spec 14.1(b) lo chiama gia doppia verita).
- **Costi.** Sessioni: 12-14 (sicurezza, in linea con la stima W-full a
  verbale), 10-12 (minimo), 12-15 (affidabilita). Denaro: 0. Manutenzione
  perpetua doppia. Ratifiche: tutte quelle di A piu il bivio DESIGN-B sul ramo
  "motore server" contro il testo vigente di Spec 14.1(b) e 4.8 opzione G, la
  decisione 7 sul fuso come regola del promemoria, la decisione 4 sul wrap.
- **Cosa perde.** La verita unica del piano e la coerenza automatica di
  opzione G; il fuso del telefono; 4-5 sessioni in piu. Non perde
  l'orizzonte: e l'unico motivo per sceglierla, e per il pilota, che apre
  l'app a ogni presa, il guadagno oggi non e misurato.
- **Sicura:** si, condizionata: profilo al server, purge delle ricalcolate
  orfane, vettori d'oro visti rossi in entrambe le suite. Senza una delle tre
  non e proponibile in ratifica. Un progettista la propone solo come "seconda
  opinione" di verifica, mai come emettitore prima di A.

### C. Pushover come trasporto di riserva, dallo stesso pianificatore

1-3 sessioni sopra A, 3-4 da zero. 4,99 USD per piattaforma una tantum.

Stesso calendario e stesso pianificatore di A, ma il trasporto e una POST
HTTPS all'API di Pushover, un'app nativa iOS e Android che consegna via APNs e
FCM nativi. Non risolve il "quando": risolve la consegna sul telefono in cui il
Web Push non regge. Non e un sostituto, e la rete sotto il trapezio.

- **Server.** Colonna `canale` in `push_dispatch` dentro la UNIQUE;
  credenziali (token applicazione e user key) in file 0600 sul Mini o in
  `.env.dev`; invio con httpx, gia in dipendenza: `title`, `message`,
  `timestamp` = fire_at (l'app mostra l'ora della dose), `priority 1` (alta,
  senza ripetizione). **Priorita 2 "emergency" vietata** (ripete ogni 30 s
  fino a conferma: un avviso ripetuto per una dose forse gia presa e M1 da
  manuale). Regola di esclusivita per telefono: mai Web Push e Pushover per la
  stessa dose. Egress verso `api.pushover.net` da misurare con curl come fatto
  per Apple. Nessuna VAPID, nessun SW, nessun tocco a `vite.config.js`.
- **Client.** Nessuna riga obbligatoria oltre la pubblicazione del calendario
  di A. Al piu una riga di stato in Impostazioni.
- **Telefono.** Installare Pushover (prova 30 giorni, poi 4,99 USD per
  piattaforma, licenze distinte iOS e Android), account, dispositivo
  registrato, notifiche consentite, Focus e batteria come per la PWA. **Il
  tocco apre Pushover, non PharmaTimer.** Non mettere l'URL ts.net nel
  messaggio: su iPhone aprirebbe Safari, che ha storage separato dalla web app
  (iOS-N1) e mostrerebbe il LoginGate.
- **Rischi di dominio.** M1: stessa finestra offline di A con difese ridotte
  (nessuna lettura del taccuino, nessun dedup per tag) piu un rischio
  comportamentale: il paziente potrebbe prendere la dose dal banner senza
  vedere lo stato in app. M2 e M3: nessuna scrittura; la conferma di Pushover
  non e e non deve mai diventare una presa (pin negativo). Riservatezza: nome
  del farmaco su server terzi negli USA, cancellato dopo la consegna secondo
  la loro documentazione; alternativa: testo senza nome, che rinuncia al
  contenuto di Spec 6.1 (decisione 6).
- **Costi.** 1-3 sessioni sopra A, 3-4 da zero. 9,98 USD una tantum per due
  piattaforme; ntfy.sh e il fratello a costo zero con topic segreto e
  contenuto leggibile da chi lo conosce.
- **Cosa perde.** L'identita di PharmaTimer nella notifica, il tocco che apre
  l'app, la riscrittura del testo dal taccuino, la riservatezza, la cifratura
  end-to-end che il Web Push ha per costruzione (RFC 8291). Resta limitata
  come A dall'orizzonte e dal Mini.
- **Sicura:** si, come trasporto esclusivo a priorita alta senza ripetizione.
  Diventa non sicura in parallelo al Web Push, con l'emergency che insiste
  dopo l'assunzione, o se la conferma venisse scritta nel log.

### D. Involucro nativo Capacitor con notifiche locali di sistema

5-12 sessioni, 99 USD/anno. Riserva strutturale.

Lo stesso bundle React gira in una WKWebView o WebView nativa;
`notifications.js` delega la programmazione al sistema operativo
(`UNUserNotificationCenter` su iOS, alarm esatti su Android) negli stessi otto
punti di oggi. Suona offline, in Low Power Mode, fuori tailnet, a Mini spento,
e la presa fatta sullo stesso telefono cancella subito il promemoria pendente.
Il Mini resta solo per la sincronizzazione.

- **Server.** Nessuno per suonare. Per il sync: `CORS_ORIGINS` del Mini deve
  includere l'origine dell'involucro (`capacitor://localhost`,
  `http://localhost`), perche il bundle non e piu servito same-origin.
- **Client.** Nuove cartelle di radice (`ios/`, `android/`) o repo gemello:
  la sezione 13 non le ammette senza ratifica. `apiClient.js` usa
  `fetch(path)` con path relativo: dentro l'involucro non raggiunge il Mini e
  serve una base assoluta configurabile, cioe una modifica a un **file
  VIETATO** (ratifica). Adapter dietro la stessa interfaccia del servizio
  notifiche (`schedule` con `allowWhileIdle`, `cancelAll`), orizzonte di 7
  giorni, guardia sul **limite iOS di 64 richieste pendenti per app** (Apple
  DTS, gennaio 2026) dichiarata e visibile. Tocco via
  `localNotificationActionPerformed`, affidabile su entrambe le piattaforme.
  La WebView e un terzo silo di storage: onboarding e token da rifare; la
  persistenza di IndexedDB e localStorage va **rimisurata**, non ereditata.
- **Telefono.** **iPhone:** Apple Developer Program (99 USD/anno) per
  TestFlight come tester interno senza App Review (build valide 90 giorni:
  ricompilazione trimestrale obbligatoria) o profilo ad hoc (un anno, fonte
  secondaria). Il Personal Team gratuito scade ogni 7 giorni: va bene solo per
  la sonda. Rimuovere la PWA dalla Home o spegnerne le notifiche (due sistemi
  = due promemoria). **g06:** APK firmato con "Installa app sconosciute" (in
  Italia oggi senza verifica sviluppatore; espansione globale nel 2027),
  permesso sveglie esatte concesso all'installazione fuori Play, batteria
  senza limitazioni.
- **Rischi di dominio.** **M1 al minimo:** l'unica opzione che cancella il
  promemoria anche per una presa fatta offline, perche programmazione e presa
  vivono sullo stesso dispositivo e negli stessi thunk. Motore unico, stesso
  fuso, stessa DST. Rischi propri, non clinici ma di esercizio: build
  TestFlight scaduta = app che non si apre e promemoria che smettono **in
  silenzio** (va reso visibile in Impostazioni con la data di scadenza);
  runtime diverso da rimisurare; force stop su Android puo cancellare gli
  alarm (da misurare). M2 e M3: nessuna via di scrittura nuova.
- **Costi.** Sessioni: 8-12 (sicurezza), 5-7 (minimo), 7-10 (affidabilita).
  99 USD/anno. Toolchain nativa sullo Studio (Xcode, SDK Android), keystore e
  certificati da custodire come la VAPID. Ogni modifica del frontend che deve
  arrivare al telefono passa da una build nativa: il deploy non e piu solo
  rsync (lezione #39).
- **Cosa perde.** La natura PWA su iOS, la singola catena di build, l'origine
  ts.net come identita dell'app, l'installazione in dieci secondi; nessun Web
  Push (Spec 2.1 e 8.1 restano non realizzate); nessun log di consegna sul
  Mini.
- **Sicura:** si, la piu forte sui TRE MAI. I costi sono architetturali ed
  economici. E la riserva da tenere pronta se A e C falliscono la settimana, o
  se Roberto vuole l'affidabilita offline totale.

## 6. Scartate, col perche

Citate come rationale a verbale, non sottoposte a ratifica. I tre progettisti
le hanno scartate indipendentemente con le stesse motivazioni.

- **Re-push a T0+N e escalation al caregiver (M1).** Il ciclo chiuso a 4
  punti a verbale nel Changelog. Il server non distingue "non presa" da "presa
  in coda offline o parcheggiata": un secondo avviso che dice o lascia
  intendere "non registrata" per una dose gia ingerita e l'induttore da
  manuale della doppia assunzione, e la ripetizione lo aggrava. Ammissibile
  solo quando il server sa la presa, cioe quando non servirebbe.
- **Testo che asserisce lo stato (M1).** "Non hai ancora preso X", "in
  ritardo di N minuti", conteggi di dosi mancate. La conoscenza del server e
  stantia per costruzione (Spec 14.4 punto 4); un'asserzione falsa sul lock
  screen si legge senza aprire l'app.
- **Materializzare le previste in `log_assunzioni` (M3).** Scrive righe di
  record senza alcun tocco e rompe la semantica "assenza di riga = prevista"
  su cui poggiano i cinque verbi, lo specchio e la protezione delle chiavi in
  coda. Spec 14.1(b) la registra gia come doppia verita.
- **Bottone "Presa" nella notifica (M2, M3).** Su iOS le azioni non sono
  rese. Su Android il SW dovrebbe scrivere fuori dalla transazione
  taccuino-prima: puo essere terminato prima del commit (presa persa),
  l'orario rischia di non essere quello del tocco, un tocco accidentale in
  tasca scrive un record. Riesaminabile dopo una sonda che veda la scrittura
  sopravvivere al kill del SW.
- **Push silenziosi o "di dati" (M2 sul canale).** Per riarmare i timer,
  drenare la coda o sondare il canale. Su WebKit tre push senza notifica
  revocano tutte le subscription dell'origine senza alcun evento: il canale
  clinico muore in silenzio. Su Chrome compare la notifica generica.
  Contraddice anche Q-SYNC.
- **Sopprimere per informazione mancante (fail-safe).** Consenso ignoto,
  calendario non pubblicato, profilo assente, telefono "non visto di recente",
  specchio non leggibile nel SW. E il fail-safe rovesciato. La forma sicura e
  un avviso con testo neutro o un nudge senza dati di dose, e comunque una
  riga a verbale.
- **Spegnere i timer di pagina senza esclusione (M2).** Fa del Mini un punto
  singolo di soppressione: a server giu, certificato scaduto o subscription
  persa senza evento, nessun avviso suona, contro Spec 14.0 racconto (B). Un
  progettista lo propone invece come "emettitore unico" con subscription
  attiva: e la decisione 3, non una scartata secca.
- **Motore server sulla sola etichetta `orari_base.ora_prevista` (M1).**
  L'etichetta e uno snapshot al salvataggio, non riscritto al cambio profilo;
  il server suonerebbe a orari che l'app non mostra, anche prima
  dell'intervallo minimo, e seguirebbe ricalcolate che il telefono ha
  azzerato. E la variante di B che non si sottopone.
- **Pushover in priorita emergency, o in parallelo al Web Push (M1, M3).**
  La ripetizione fino a conferma su una dose forse gia presa; due canali per
  la stessa dose; la conferma scritta come presa nel log.
- **Calendario in abbonamento, webcal/ICS con VALARM (M1).** Gli avvisi
  scaricati restano in cache e non si ritirano quando la dose e presa: su iOS
  il refresh automatico avviene solo in carica e Wi-Fi, su Google Calendar
  ogni 12-24 ore e i VALARM sono probabilmente ignorati. Nessuno stato, nessun
  tocco che apre l'app. Tollerabile solo come sveglia di ultima istanza a
  orari fissi, fuori da PharmaTimer.
- **App terze in parallelo, Salute > Farmaci, MyTherapy, Medisafe (M1).**
  Doppia immissione manuale e due motori che non si parlano. HealthKit
  Medications e in sola lettura per le app terze (DTS Apple, ottobre 2025);
  Health Connect non ha un tipo medication. Ammissibile solo come sostituzione
  totale, mai come affiancamento.
- **Non praticabili: Notification Triggers, Shortcuts "Time of Day", ntfy
  self-hosted senza upstream, Gotify su iPhone.** Triggers chiusa da Chrome e
  assente su Safari; le automazioni Shortcuts non partono a telefono bloccato
  da ore e "Get Contents of URL" non gira da bloccato (testimonianze
  2020-2024); ntfy senza upstream consegna "in ore" e fuori tailnet mostra
  solo "New message"; Gotify non ha client iOS ufficiale. SMS e voce via
  Twilio (circa 0,09 USD per SMS, contenuto in chiaro sull'operatore, nessun
  tocco ne stato) restano fuori perimetro come gia a verbale.

## 7. Piano di prova sul telefono vero, prima di qualunque riga di codice

Consolidato dai tre progettisti. Nessun file del repo viene scritto: materiale
usa e getta in `$TMPDIR` sullo Studio e, sul Mini, in una cartella fuori da
`~/PharmaTimer` servita da `tailscale serve` su una porta diversa (per esempio
8443), cosi l'origine di prova e distinta da quella della PWA e non ne tocca
SW, permessi ne storage. In alternativa, una pagina deposta in
`~/PharmaTimer/web/` viene servita dal catch-all e cancellata dal prossimo
`rsync --delete`. Invio da un venv usa e getta con pywebpush, prima dallo
Studio e poi **dal Mini**, che dimostra egress e libreria su Python 3.13
arm64. Ogni passo dichiara prima i due esiti. Tutto **senza Web Inspector
collegato**. Orari a verbale.

### Mini, dal Terminale

- **M1** pmset: gia misurato, `sleep 0`, zero eventi di sonno, uptime 28
  giorni. Resta da fare a fine settimana: `pmset -g log` per confermare nessun
  sonno nel periodo.
- **M2** Certificato: gia misurato, valido fino al 24 ottobre 2026. `make
  prod-check` resta il gate prima di ogni deploy.
- **M3** Egress: gia misurato, Apple 405, FCM 404, Mozilla 406. Da aggiungere
  per C: `curl` verso `api.pushover.net`. A: 4xx senza credenziali =
  raggiungibile. B: timeout = bloccato.
- **M4** `pip download pywebpush py-vapid cryptography` in `$TMPDIR` del
  Mini. A: wheel arm64 per cryptography e sdist puro per http-ece,
  installazione riuscita su 3.13. B: compilazione richiesta o fallimento:
  dipendenza da rivedere prima del pyproject.
- **M5** profilo_utente e ricalcolate: gia misurato, zero righe di profilo;
  una ricalcolata orfana; 5 farmaci su 7 in ramo esteso o `fisso_date`.

### iPhone del pilota

- **S0** Impostazioni > Generali > Info: versione iOS. A: >= 18.4, ramo
  dichiarativo disponibile. B: < 18.4, solo ramo SW, tocco degradato.
- **S1** Aggiungere la pagina di prova alla Home, toccare "Iscrivi"
  (subscribe direttamente dentro il gesto), copiare il JSON. A: endpoint
  `web.push.apple.com`. B: eccezione o endpoint vuoto: bloccante. Variante:
  `requestPermission` awaited e poi `subscribe`: riesce, o fallisce per
  attivazione consumata (decide l'ordine in `useNotifications`).
- **S2** Pagina chiusa dall'app switcher, telefono bloccato e fermo 10
  minuti; invio dichiarativo con TTL 600 e Urgency high. A: notifica sul lock
  screen entro 60 s con suono: canale utile. B: nulla entro 10 minuti: nessuna
  riga di codice finche non si spiega.
- **S3** Come S2 con payload classico e SW che mostra e scrive nel corpo
  istante di arrivo, `typeof indexedDB` e payload. A: il SW viene svegliato ad
  app chiusa e indexedDB e definito. B: indexedDB undefined (la lettura del
  taccuino su iOS resta opportunistica) o SW non svegliato.
- **S4** Come S2 in Low Power Mode; poi con Tailscale OFF e solo rete
  cellulare. A: arriva in entrambi i casi: la consegna non dipende dal tunnel.
  B: non arriva: da spiegare prima di procedere.
- **S5** Tocco sulla notifica dichiarativa e su quella classica. A: apre la
  web app all'URL di `navigate`. B: apre alla root o in Safari: il tocco vale
  solo "apri l'app".
- **S6** Modalita aereo 5 minuti, due invii con lo stesso Topic e TTL 3600,
  poi rete. A: arriva uno solo: Topic sostituisce. B: arrivano due: solo
  raggruppa, il dedup resta tutto sul Mini.
- **S7** Modalita aereo 5 minuti, invio con TTL 60, poi rete. Poi un invio
  con TTL 0. A: il TTL 60 non viene consegnato e TTL 0 risponde 201: TTL
  onorato. B: consegnato comunque, o 400 BadTtl su TTL 0: la difesa contro lo
  stantio deve stare tutta nel testo e nel Mini.
- **S8** Focus attivo, invio. Poi Impostazioni > Notifiche > pagina di prova.
  A: sospesa e consegnata alla fine del Focus, voci Suoni e Badge presenti. B:
  persa: PharmaTimer va aggiunta ai Focus in uso.
- **S9** App in primo piano, invio. A: banner mostrato. B: non mostrato.
  Decide il gate del doppio avviso (decisione 3).
- **S10** Riaprire la pagina di prova ogni giorno per 5 giorni e confrontare
  l'endpoint; un push al giorno alle 14:32 senza aprire nulla per 3 giorni.
  A: endpoint stabile e tre consegne su tre. B: endpoint cambiato o null, o
  consegne perse: C entra come riserva.
- **S11** Per ultimo, distrugge la subscription: tre invii classici con SW
  che non mostra nulla; poi `getSubscription()`. A: null e 410 al quarto
  invio: penalita confermata, "mostra sempre" e vincolante. B: sopravvive. Poi
  rimozione della web clip: 410 subito o dopo riavvio.

### moto g06

- **A1** Tailscale Android e nodo ammesso; aprire l'origine da Chrome
  aggiornato. A: voce "Installa app", icona nel drawer, voce in Impostazioni >
  App: WebAPK. B: "Aggiungi a schermata Home": scorciatoia con capacita
  ridotte.
- **A2** Iscrizione. A: endpoint `fcm.googleapis.com`. B: errore.
- **A3** Schermo spento da almeno 90 minuti, non in carica, dieci invii
  Urgency high a intervalli noti; il SW logga l'istante di
  `showNotification`. A: latenza entro 60 s in Doze. B: latenze di minuti o
  consegna alla finestra di manutenzione: Urgency high non basta su Android
  15.
- **A4** Ripetere A3 con Batteria "senza limitazioni" prima su Chrome, poi
  sulla WebAPK, uno alla volta; con "Migliora la batteria quando inattivo" ON
  e OFF se esiste. Decide quale package governa e quale impostazione va
  scritta nel README.
- **A5** "Termina" Chrome, invio con TTL 86400, riapertura dopo 10 minuti.
  A: arriva alla riapertura. B: scartato: il force stop e un caso da
  dichiarare.
- **A6** Bottone di prova che chiama `new Notification('x')` in un click; due
  `showNotification` con lo stesso tag. A: TypeError: i timer di pagina
  odierni non hanno mai suonato su Android (il rilievo diventa difetto). Una
  sola notifica per tag.
- **A7** Tocco: sul corpo e su un bottone azione ad app chiusa. A: apre la
  WebAPK in standalone; l'azione esegue `notificationclick`. B: apre una
  scheda Chrome.
- **A8** Dove stanno le impostazioni di notifica (Impostazioni > App >
  PharmaTimer o Chrome > Siti), suono e vibrazione udibili, "Notification
  cooldown" presente.
- **A9** Topic e TTL come S6 e S7.

### Solo se si valuta C o D

- **C1** Pushover installato in prova; dal Mini una `curl` con priority 1 e
  `timestamp` della prossima dose, telefono bloccato da un'ora. A: banner
  entro 60 s con l'ora della dose. B: errore o ritardo oltre 5 minuti.
- **C2** Ripetere in aereo poi rete; con Tailscale OFF; con Focus; tocco sul
  banner e sul link. Decide se tenere il link (atteso: apre Safari, non la web
  app) e la politica del Focus.
- **D1** Scheletro Capacitor in `$TMPDIR` firmato col Personal Team gratuito:
  tre notifiche locali a +2, +60 minuti e +24 ore; app chiusa, telefono
  bloccato; poi in aereo; poi con Focus. A: tutte puntuali. B: mancanti:
  misurare perche.
- **D2** Programmarne 70; cancellarne una prima dell'orario; scrivere un flag
  in IndexedDB e uno in localStorage, uccidere l'app, riavviare il telefono.
  Misura il limite 64, la cancellazione, e la sede durevole del taccuino
  nell'involucro.
- **D3** Sul g06: APK debug, schermo spento 2 ore, notifica a +90 minuti con
  e senza permesso sveglie esatte; force stop dell'app. Puntualita e
  sopravvivenza degli alarm.

**Criterio di passaggio al codice** (comune ai tre progettisti): S2, S4 e
S10 tutti con esito A e S5 A almeno sul dichiarativo, misurati senza
inspector, autorizzano la ratifica di A per l'iPhone; A3 con latenza entro
60 s in Doze la autorizza per il g06. Se un telefono fallisce, C entra per quel
telefono; se anche C non basta, D.

## 8. Criterio di accettazione in una settimana d'uso

Per A, su sette giorni di terapia reale con l'app chiusa fra una dose e
l'altra. Strumenti: `push_dispatch` sul Mini (SQL via redirect su file),
l'access log `~/PharmaTimer/logs/api.out.log` (la prima `GET /api/farmaci`
dopo un invio prova l'apertura dell'app) e un tally su carta di Roberto per
dose: arrivata, entro 2 minuti, app chiusa, doppia, per dose gia presa.

| # | Criterio | Come si misura | Soglia |
|---|---|---|---|
| 1 | **Copertura.** Ogni dose dovuta ha esattamente una riga di dispatch inviata entro 60 s dal suo istante, e la notifica e vista ad app chiusa. | SELECT su `push_dispatch`; tally | >= 95% entro 2 minuti (27 su 28 a quattro dosi al giorno); almeno 3 casi per telefono con telefono bloccato da oltre un'ora |
| 2 | **Nessuno stantio server-side.** Zero invii per dosi la cui riga presa, saltata o sospesa era sul Mini almeno 60 s prima dell'invio. | join `push_dispatch` con `log_assunzioni` | 0 righe: gate duro |
| 3 | **Stantio offline.** Ogni avviso ricevuto per una dose gia registrata sul telefono mostrava l'ora prevista, non asseriva stato, e corrisponde a un elemento di coda pendente in quel momento. | tally piu coda locale | dichiarazione di Roberto: nessuna doppia assunzione |
| 4 | **Doppi.** Zero notifiche doppie ad app chiusa; ad app aperta al piu il doppio simultaneo, contato a parte. | tally | 0 ad app chiusa |
| 5 | **Tocco.** Ogni tocco apre PharmaTimer su Oggi, anche fuori tailnet (dallo specchio); la presa compare nell'access log in tailnet o al primo rientro. | tally piu `api.out.log` | 28 su 28 |
| 6 | **Subscription.** Endpoint invariato per 7 giorni o riallineato in automatico senza toccare il toggle; ogni 410 seguito da una nuova subscription alla prima apertura. | `push_subscriptions` | al piu un buco di consegna nella settimana |
| 7 | **Record intatto (M3).** `log_assunzioni` cresce solo di righe con `client_op_id` o di ricalcolate scritte da `/presa`; il conteggio coincide con i verbi POST nell'access log; il pianificatore e il SW non contengono scritture sul record. | SQL, grep, access log | coincidenza esatta |
| 8 | **Nessun silenzio (I3).** Ogni dose dovuta senza invio ha una riga con motivo leggibile in Impostazioni. | `push_dispatch` | 0 slot senza riga |
| 9 | **Server giu.** In una finestra concordata di 30 minuti con uvicorn fermo attorno a una dose ad app aperta, il timer di pagina suona e il dispatch registra l'assenza al riavvio. | prova a mano il giorno 4 | suona |
| 10 | **Mini.** Nessun sonno nella settimana, certificato valido a fine settimana, `make check` verde, nessuna riga "scaduto" non spiegata. | `pmset -g log`, `make prod-check` | tutti verdi |

Per **C** valgono 1, 2, 3, 7, 8 sul canale Pushover, la soglia di 1 sale al
98% (canale nativo), e il criterio 5 diventa: entro 5 minuti dal promemoria
compare nell'access log una `GET /api/farmaci` dall'iPhone in almeno 25 casi
su 28. Per **D**: 100% delle dosi all'istante del piano inclusi un giorno in
aereo e uno in Low Power Mode, zero avvisi per prese fatte prima dell'ora anche
offline, pendenti mai oltre 64, data di scadenza della build TestFlight
annotata. Per **B** si aggiungono: zero divergenze fra istante del push e ora
mostrata dall'app per la stessa dose, vettori d'oro verdi in entrambe le suite
a ogni `make check`, e un weekend di 48 ore ad app chiusa con promemoria che
continuano.

## 9. Prerequisiti e rilievi collaterali

- **Da chiudere prima o insieme, in qualunque opzione:** pin rosso e fix
  della dose oltre mezzanotte persa al rollover (sede da decidere: selettore
  su data effettiva o finestra con ieri incluso); rimedio alle ricalcolate
  orfane del cambio profilo; sonda sul g06 del TypeError del costruttore.
- **Drift esistenti nello stesso perimetro:** click handler con `/oggi`
  assoluto (rompe su GitHub Pages); copy "Avviso poco prima di ogni dose"; il
  corpo della notifica senza orario; `/api/health` con versione cablata 0.1.0
  (non legato a questo lavoro: si segnala, non si tocca).
- **Spec da allineare nel commit che introduce il canale** (regola critica 3,
  mai il Changelog congelato): 2.1 riga 140 e 8.1 riga 583 contro 11.5.2; 6.1
  sul dosaggio e sul consenso al primo avvio; 14.1(b) col ramo scelto del
  bivio; 14.6 se B; il README che oggi dichiara il limite.
- **Ordine di schieramento:** migrazione v07 applicata sul Mini prima del
  codice, g21 esteso al nuovo livello, pip editable dal Terminale, plist
  nuovo, poi `make prod-check`. Il SW nuovo si attiva solo dopo il prompt
  "Aggiorna" sul telefono.
- **Collaudo per mutazione nei due versi:** il pin "non inviare se presa" va
  visto rosso togliendo la SELECT; il pin "inviare se nessuna riga" va visto
  rosso mettendo un filtro sempre chiuso. Un pianificatore sempre muto e M2
  travestito da prudenza.
- **Caregiver.** Q16 e Q17 restano deferiti a Scope-B perche toccano VIETATI;
  in ogni opzione si spinge solo alle subscription dell'utente proprietario.
  `notifiche_caregiver_attive` resta a 0.

## 10. Decisioni che spettano a Roberto

Nessuna e presa qui. Dove i tre progettisti concordano lo dico; dove
divergono, le due letture sono entrambe a verbale.

1. **Il bivio DESIGN-B.** Calendario pubblicato dal telefono (A) contro
   motore sul Mini (B). I tre concordano su A per la verita unica del piano; B
   solo se "avvisi anche dopo giorni senza aprire l'app" viene ratificato come
   requisito clinico, cosa che per il pilota non e misurata.
2. **Q9=A riaperta.** APScheduler dentro FastAPI (ratificata maggio 2026)
   contro un LaunchAgent separato. I tre concordano sul LaunchAgent; divergono
   fra passata a intervallo e processo residente (differenza irrilevante
   finche il Mini non dorme).
3. **Emettitore unico o due sorgenti.** Tenere i timer di pagina accanto al
   push, accettando su iPhone un doppio simultaneo ad app aperta (progettista
   sicurezza: spegnerli fa del Mini un punto singolo di soppressione), oppure
   tacerli quando esiste una subscription attiva (progettista affidabilita:
   due sollecitazioni per una dose sono M1), oppure decidere dopo la sonda S9
   con un gate del tipo "il timer tace solo se l'ultima pubblicazione e
   riuscita da meno di 30 minuti" (progettista minimo).
4. **Ricalcolo D+1 rifiutato dal server.** Il push segue il valore del
   server, l'unico passato dalla guardia dell'intervallo minimo (sicurezza),
   oppure segue l'ora pubblicata dal telefono finche la rilettura non
   riallinea (minimo).
5. **Orizzonte pubblicato e fine orizzonte.** Tre giorni, ieri-domani, o
   sette giorni; e se a fine orizzonte partire un avviso "apri PharmaTimer per
   aggiornare i promemoria" oppure solo dichiararlo.
6. **Testo verso terzi** (solo C): nome del farmaco sui server di Pushover,
   o testo neutro che rinuncia al contenuto di Spec 6.1.
7. **Sblocco di `vite.config.js` per una riga** `workbox.importScripts`, e
   sede del modulo di rete additivo che importa `apiClient` senza
   modificarlo.
8. **Custodia VAPID:** PEM 0600 nella home del Mini con backup fuori
   macchina, come proposto, o altra sede.
9. **Tolleranza e TTL:** 20 o 30 minuti dopo l'ora; TTL fino a 30 minuti,
   un'ora o sei ore.
10. **Ordine dei lavori:** i tre concordano: una sessione di sola sonda
    (sezione 7), poi la ratifica con la scheda a quattro campi, poi
    migrazione, backend con passata vista rossa, client con SW, settimana di
    accettazione con C pronta come riserva.

**Azioni tue:** eseguire dal Terminale e sul telefono le sonde M4, S0-S11 e,
quando c'e il g06, A1-A9; scegliere fra A e C dopo la sonda; decidere le dieci
voci sopra; tenere il tally della settimana di accettazione; se D, iscrizione
all'Apple Developer Program e calendario di ricompilazione.

**Azioni mie, dopo ratifica:** pagina e script di sonda fuori repo, con i due
esiti dichiarati per passo; pin rosso della dose oltre mezzanotte e del
TypeError su Android; migrazione additiva, router, pianificatore con test per
mutazione nei due versi, modulo client, SW, Impostazioni; riepilogo
strutturato a ogni step, Spec e README allineati nel commit, STATO riscritto.

## 11. Limiti di questo lavoro

- **Non eseguiti per limite di spesa:** i tre giudici (che dovevano segnare i
  tre progetti su sicurezza, fattibilita, onesta, collaudabilita e
  completezza, e segnalare errori fattuali), la sintesi, la confutazione a
  tre lenti (fonti e date, architettura, clinica) delle 15-20 affermazioni
  chiave, il critico di completezza e il riempimento delle lacune. La
  convergenza dei tre progetti indipendenti e un segnale, non una verifica.
- **Affermazioni che poggiano su una sola fonte secondaria o su dati di
  compatibilita non esercitati:** `indexedDB` undefined nel SW svegliato da
  push su iOS (un thread Apple senza risposta); il TypeError di `new
  Notification()` su Chrome Android (BCD); la batterycare Motorola (una issue
  del 2024 su un altro modello); Urgency high che non sveglia Chrome in Doze
  (evidenze 2017-2019); la durata di un anno dei profili ad hoc; i VALARM su
  iOS.
- **Incognite che solo il telefono scioglie:** se Apple accetta TTL 0; se
  Topic su Apple sostituisce o solo raggruppa; se il push arriva alla PWA
  "chiusa" dallo switcher su iOS 26; se il tocco dichiarativo riusa la
  finestra standalone; quanti messaggi conserva APNs per una web app offline;
  se Focus sospende o perde; la frequenza reale di perdita della subscription
  su iOS 26 per una web app aperta ogni giorno; su Android la latenza reale
  in Doze e quale package governa la batteria.
- **Non misurato:** la versione iOS dell'iPhone del pilota; la presenza
  fisica del moto g06; il valore corrente di `CORS_ORIGINS` nel `.env.dev`
  del Mini; l'installazione effettiva di pywebpush su Python 3.13 (M4).
- **Perimetro delle asserzioni negative del repo:** "nessun codice push" vale
  per grep su `src`, `backend`, `public`, `scripts`, `deploy`, `docs` e
  `vite.config.js`, esclusi `node_modules`, `venv`, `dist` e `*.bak*`;
  "nessun processo periodico" vale per grep su `backend/pharmatimer_api`,
  `pyproject.toml` e `deploy/`.

---

Fonti dei dossier: WebKit blog e Bugzilla, Apple Developer docs e release
notes Safari 17-26.6, WWDC22/23/25, sorgenti WebKit, MDN browser-compat-data,
RFC 8030/8291/8292, Firebase e Android docs, Chrome docs e blog, Tailscale
docs, PyPI, launchd.plist(5), forum Apple e issue tracker citati per numero.
Misure sul repo a HEAD e966859 e sul Mini in sola lettura il 3 settembre 2026.
