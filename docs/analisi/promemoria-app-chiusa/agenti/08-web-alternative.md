# web:alternative -- canali alternativi o di riserva

Fase: Misura. Agente `a1b222c65b8656e3e`, esito: completato. Resa leggibile generata meccanicamente da `08-web-alternative.json`, che e il risultato restituito dall'agente cosi come registrato nel journal del workflow: contenuto invariato, solo forma.

## Sintesi

CANALI DI RISERVA PER IL PROMEMORIA DI DOSE (iPhone e Android, app chiusa), stato al 2026-09-03.

(1) APP NATIVA / WRAPPER CON NOTIFICHE LOCALI. Server: nessuno per suonare; il Mini serve solo a sincronizzare il piano quando l app e aperta. Telefono: app Capacitor (riusa il bundle React) con @capacitor/local-notifications; iOS UNUserNotificationCenter con limite 64 richieste pendenti (Apple DTS, gen 2026): N richieste ripetitive giornaliere per N dosi, ripianificazione a ogni apertura; suona offline; contenuto, tocco che apre l app e azioni (Presa/Salta) disponibili; 'sapere se gia presa' = cancellare la pendente al tocco locale, che funziona solo se il tocco avviene sullo stesso telefono o se l app riapre e risincronizza. Installazione iOS senza App Store: Personal Team gratis = ricompilare da Xcode ogni 7 giorni (3 dispositivi, 3 app); Developer Program 99 USD/anno = TestFlight (build 90 giorni, tester interno senza App Review) o ad hoc (un anno da fonti secondarie, check-in ppq.apple.com al primo avvio). Android: APK firmato via 'installa app sconosciute'; verifica sviluppatore Google solo BR/ID/SG/TH dal 30-09-2026, globale 2027, con 'limited distribution account' fino a 20 dispositivi e 'advanced flow'; USE_EXACT_ALARM concesso all installazione e fuori dalle policy Play per un APK sideloadato; setAlarmClock esce da Doze. AlarmKit (iOS 26, plugin Cap-go/capacitor-alarm) aggiunge sveglie che bucano Silenzioso e Focus senza entitlement; Critical Alerts richiedono approvazione Apple. PWABuilder iOS archiviato 2025-09-11: non e una via. Affidabilita: la piu alta di tutte (framework di sistema), costo 99 USD/anno + lavoro nativo medio.

(2) CALENDARIO IN ABBONAMENTO (webcal/ICS + VALARM dal Mini). Server: endpoint HTTPS statico sul Mini in tailnet. Telefono iOS: nessuna app; il dialogo Apple ha 'Remove: Alerts' (macOS guide) e l interruttore 'Event Alerts' per calendario, quindi i VALARM dovrebbero suonare (media confidenza, da misurare); refresh 'Automatically' = solo in carica e Wi-Fi (Apple 102578), oppure ogni 15/30/60 min; fuori tailnet il refresh fallisce in silenzio e resta la copia in cache: gli avvisi gia scaricati suonano, la rimozione per dose gia presa non arriva. Android/Google Calendar: 12-24 ore, nessun controllo, VALARM probabilmente ignorati (bassa confidenza). Perde: nessun tocco che apre l app (solo evento), nessuno stato presa, granularita ore. Costo zero. Affidabilita: media su iOS per terapie a orari fissi, insufficiente per variazioni giornaliere.

(3) PROMEMORIA APPLE / SHORTCUTS. Automazioni Time of Day senza conferma (guida Apple, iOS 14-26) possono chiamare 'Get Contents of URL' verso il Mini in tailnet (con Tailscale VPN On Demand attivo) e mostrare una notifica; ma community (forum Apple 2020-2024): non partono a telefono bloccato da ore e 'Get Contents of URL' non gira da bloccato. Costo zero, nessun server oltre al JSON. Affidabilita bassa per un uso clinico. Reminders via CalDAV/VTODO non praticabile (iOS 13+ non mostra liste CalDAV in modo affidabile).

(4) PUSH GENERICI. ntfy self-hosted sul Mini: CONFERMATO che l app iOS si appoggia a ntfy.sh per APNs (upstream-base-url, passa solo message ID e SHA256 del topic); senza upstream 'delivery can take hours'; se l iPhone non raggiunge il Mini (fuori tailnet) mostra solo 'New message'; background iOS dichiarato inaffidabile dall autore; gratis. Alternativa: pubblicare direttamente su ntfy.sh (contenuto fuori tailnet, nessuna dipendenza dal tunnel). Pushover: 4,99 USD una tantum per piattaforma, 10k msg/mese, emergency priority con retry fino a 3 ore e ricevuta di acknowledgment (utile a M2), Mini solo HTTPS in uscita, contenuto sui server Pushover; affidabilita APNs/FCM nativa. Gotify: solo Android ufficiale, WebSocket persistente verso il Mini (tunnel sempre su), iOS solo terze parti instabili. Telegram bot: gratis, contenuto su Telegram, ritardi iOS legati a background refresh, nessun ack. Home Assistant companion: 500 push/giorno, critical alerts iOS che bucano DND, ma richiede un istanza HA sul Mini. Tutti: il tocco apre l app del canale, non PharmaTimer (salvo URL nel messaggio, non verificato); nessuno sa se la dose e presa salvo ack Pushover.

(5) SMS/VOCE Twilio Italia: 0,0927 USD/SMS, sender alfanumerico gratuito (registrazione AGCOM: fonti in contraddizione), voce 0,3473 USD/min verso mobili; Mini solo HTTPS in uscita; contenuto in chiaro sull operatore; suona sempre, anche senza dati; nessun tocco che apre l app, nessuno stato. Costo per 4 dosi/giorno circa 11 USD/mese in SMS.

(6) SALUTE / HEALTH CONNECT / SAMSUNG. HealthKit Medications (iOS 26) e SOLO LETTURA per le app terze (DTS ott 2025): non si puo alimentare la terapia da PharmaTimer, ma un app nativa puo leggere le dosi 'Taken/Skipped' registrate in Salute. Salute come riserva umana: promemoria, follow-up a 30 min, Critical Alerts per farmaco, log dalla notifica; doppia immissione manuale. Health Connect: nessun tipo medication fitness, solo record FHIR (archivio, non promemoria). Samsung Health Medications: promemoria propri, nessuna API terza trovata, data non verificata.

(7) SVEGLIA DI SISTEMA. iOS: sveglie manuali in Orologio o create da Shortcut (azione Crea sveglia), oppure AlarmKit da app nativa (iOS 26); Android: AlarmClock intent. Suonano sempre, zero server, zero contenuto, zero stato: riserva di ultima istanza.

(8) APP MEDICALI: Medisafe a pagamento da gen 2026 (4,99 USD/mese, free 2 farmaci), MyTherapy gratuita; nessuna integrazione con PharmaTimer, doppia immissione e rischio M1 di doppio promemoria.

TABELLA (canale | server sul Mini | telefono | costo | cosa perde | affidabilita documentata)
- Wrapper Capacitor + notifiche locali (+AlarmKit iOS 26) | solo sync piano | app nativa: TestFlight/ad hoc iOS (99 USD/anno) o APK Android | 99 USD/anno + lavoro nativo | limite 64 pendenti, stato presa solo se app riapre/sync, distribuzione | alta (framework di sistema; DTS gen 2026; Android docs 2026-08)
- ICS/webcal + VALARM | endpoint HTTPS in tailnet | nessuna app | zero | tocco non apre app, nessuno stato, refresh in ore, VALARM iOS da misurare, Google 12-24 h | media iOS / bassa Android
- Shortcuts Time of Day + JSON dal Mini | JSON in tailnet | Shortcuts + Tailscale | zero | tutto se il telefono e bloccato; niente deep link affidabile | bassa (community 2020-2024)
- ntfy self-hosted | ntfy + upstream ntfy.sh | app ntfy (gratis) | zero | 'New message' fuori tailnet, background iOS debole, tocco apre ntfy | media (docs; issue 2024 aperta)
- Pushover | solo HTTPS out | app Pushover | 4,99 USD una tantum/piattaforma | contenuto su server terzi, tocco apre Pushover | alta (APNs/FCM; ack emergency)
- Gotify | server + tunnel sempre su | solo Android | zero | niente iOS | media Android
- Telegram bot | solo HTTPS out | Telegram | zero | contenuto su Telegram, nessun ack, ritardi iOS | media
- Home Assistant | istanza HA | app companion | zero + molto lavoro | dipende da HA; 500/giorno | alta (critical alerts)
- SMS/voce Twilio | solo HTTPS out | nessuna app | ~0,09 USD/SMS, 0,35 USD/min | contenuto in chiaro, nessun tocco/stato | alta (rete cellulare)
- Salute Farmaci / Samsung Health | nessuno | nativo | zero | doppia immissione, HealthKit read-only per terze | alta (Apple 2025-11)
- Sveglia di sistema | nessuno | nativo | zero | contenuto, tocco, stato | alta
- App medicali (MyTherapy/Medisafe) | nessuno | app store | 0-4,99 USD/mese | doppia immissione, rischio M1 | media

NOTA SUL WEB PUSH DI BASE: iOS 16.4+ solo Home Screen (2023-02-16), Declarative Web Push iOS 18.4 con notifica visibile garantita (2025-03-27), iOS 26 apre ogni sito in Home come web app (2025-09-15); DND/Focus sopprime (forum dic 2024). Il Mini non ha bisogno di IP pubblico per nessun canale elencato: tutti richiedono solo HTTPS in uscita, tranne ICS/Shortcuts/ntfy-content/Gotify che richiedono che il TELEFONO raggiunga il Mini in tailnet.

## Reperti

### 1. iOS: limite di 64 richieste di notifica locale pendenti per app, confermato da un ingegnere Apple (DTS): 'there is a limit of 64 for how many simultaneous notification requests can be active/pending at one time per app. This is a system limit and there is no way around it'. Una richiesta con trigger ripetuto (UNCalendarNotificationTrigger repeats:true, es. ogni giorno alle 8:00) occupa UN solo slot per costruzione, quindi una terapia a orari fissi con N dosi/giorno usa N slot; le variazioni giorno per giorno richiedono ripianificazione ad ogni apertura dell app.

- Confidenza: alta
- Fonte: https://developer.apple.com/forums/thread/811171 (domanda dicembre 2025, risposta Apple gennaio 2026)
- Nota: Le notifiche locali suonano ad app chiusa e telefono offline senza server: e il contratto del framework (guida archivio Apple, aggiornata 2018-06-04, https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/SchedulingandHandlingLocalNotifications.html). Per bucare Silenzioso/Focus serve la entitlement Critical Alerts, concessa da Apple solo per casi health/safety (forum Apple 794822, risposta ingegnere Apple luglio 2025; blog kulman.sk 2023-03-29); interruptionLevel timeSensitive non richiede approvazione.

### 2. Plugin @capacitor/local-notifications v8: schedule con 'at', 'every' (year..second), 'on' (componenti data), 'repeats', 'count'; iOS supporta interruptionLevel (active, critical, passive, timeSensitive); Android 13+ POST_NOTIFICATIONS, Android 12+ SCHEDULE_EXACT_ALARM, Android 14 USE_EXACT_ALARM (nessun prompt), Android 15 Private Space.

- Confidenza: alta
- Fonte: https://capacitorjs.com/docs/apis/local-notifications (non datata (documentazione v8, con storico v2-v9))
- Nota: Il wrapper Capacitor riusa il codice React/Vite esistente dentro WKWebView; la parte nativa e solo la pianificazione.

### 3. Android: gli exact alarm sono negati di default per le app nuove che dichiarano SCHEDULE_EXACT_ALARM su Android 14+; le app tipo sveglia/calendario possono dichiarare USE_EXACT_ALARM (livello normal, concesso all installazione, non revocabile); setAlarmClock e la classe piu critica e fa uscire il dispositivo da Doze; gli alarm inesatti vengono differiti in Doze.

- Confidenza: alta
- Fonte: https://developer.android.com/develop/background-work/services/alarms (ultimo aggiornamento 2026-08-14)
- Nota: Il vincolo Play Store su USE_EXACT_ALARM (solo categorie ammesse) non si applica a un APK sideloadato. Cambio Android 14: https://developer.android.com/about/versions/14/changes/schedule-exact-alarms.

### 4. Account Apple gratuito (Personal Team): profili scadono dopo 7 giorni con obbligo di ricompilare e reinstallare da Xcode; massimo 10 App ID, 3 dispositivi, 3 app per dispositivo; TestFlight e profili ad hoc NON disponibili. Apple Developer Program: 99 USD/anno, include TestFlight.

- Confidenza: alta
- Fonte: https://developer.apple.com/support/compare-memberships/ (non datata)
- Nota: Costo 99 USD/anno da https://developer.apple.com/programs/ (non datata, copyright 2026). Con Personal Team serve un Mac con Xcode e reinstallazione settimanale: inaccettabile come canale di riserva clinico.

### 5. TestFlight: le build sono disponibili per 90 giorni; fino a 100 tester interni (utenti App Store Connect) e 10.000 esterni; la PRIMA build per un gruppo esterno passa da App Review. Un tester interno (lo stesso Roberto come utente ASC) evita la review.

- Confidenza: alta
- Fonte: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview (non datata (copyright 2026))
- Nota: Profili ad hoc e development durano un anno secondo fonti secondarie (bitrise, betadrop); la pagina Apple sui profili (https://developer.apple.com/help/account/provisioning-profiles/provisioning-profile-updates/) aggiunge che le app dev/ad hoc dei team creati dopo il 2021-06-06 devono verificare il certificato su ppq.apple.com al primo avvio, altrimenti possono non partire. Durata un anno: confidenza media (non letta su pagina Apple).

### 6. PWABuilder iOS e archiviato e in sola lettura dall 11 settembre 2025, supporto 'community driven'; genera un progetto Swift con WKWebView e non dichiara alcun supporto a notifiche push o locali.

- Confidenza: alta
- Fonte: https://github.com/pwa-builder/pwabuilder-ios/blob/main/README.md (archiviato 2025-09-11)
- Nota: Per il wrapper resta Capacitor.

### 7. Android sideload: verifica sviluppatore obbligatoria dal 30 settembre 2026 solo per Brasile, Indonesia, Singapore, Thailandia (store partecipanti); espansione globale nel 2027; da agosto 2026 'limited distribution accounts' (fino a 20 dispositivi, senza documento ne pagamento) e 'advanced flow' per installare app di sviluppatori non verificati; adb resta disponibile.

- Confidenza: alta
- Fonte: https://android-developers.googleblog.com/2026/06/android-developer-verification.html (2026-06-18)
- Nota: Advanced flow: Developer Mode, riavvio, attesa di un giorno (bleepingcomputer, agosto 2026; 9to5google 2026-03-19). Android 16 con Advanced Protection attivo blocca 'install unknown apps' (Android Authority). In Italia, oggi, un APK firmato si installa con 'Installa app sconosciute'.

### 8. iOS Calendar: sottoscrizione .ics con avvisi del feed. Nel dialogo di sottoscrizione Apple esiste la casella 'Remove: Alerts' ('To get the calendar's event attachments or alerts, deselect the appropriate Remove checkboxes'), quindi i VALARM del feed sono onorati se non rimossi; su iPhone esiste l interruttore per calendario 'Event Alerts'.

- Confidenza: media
- Fonte: https://support.apple.com/guide/calendar/subscribe-to-calendars-icl1022/mac (guida macOS Tahoe 26 (non datata))
- Nota: La guida iPhone (use-multiple-calendars-iph3d1110d4) non e stata letta: il fetch ha restituito solo l indice. Thread Apple Community 251549947 (moderatore: 'turn on Event Alerts'; utenti: gli avvisi aggiunti a mano vengono cancellati al refresh): riguarda avvisi locali, non i VALARM del feed. Il thread 4042500 sui calendari condivisi e del 2012: vecchio, non probante. Verificabile in 10 minuti con un feed di prova.

### 9. iOS: i calendari sottoscritti seguono 'Fetch New Data'; con 'Automatically' (default da iOS 11) il dispositivo scarica in background 'only when your device is charging and connected to Wi-Fi'. Le opzioni manuali sono ogni 15/30/60 minuti o manuale.

- Confidenza: alta
- Fonte: https://support.apple.com/en-us/102578 (non datata)
- Nota: Frequenza reale 'circa oraria di default, configurabile da 5 minuti a mai' secondo Calfeed (2026-05-15, fonte secondaria che cita Apple). Con il Mini fuori tailnet il refresh fallisce in silenzio e resta l ultima copia: gli avvisi gia scaricati suonano, le modifiche (dose gia presa) non arrivano.

### 10. Google Calendar 'From URL': aggiornamento ogni 12-24 ore, nessuna impostazione per utente o publisher per accelerarlo; la pagina di help Google non dichiara l intervallo.

- Confidenza: media
- Fonte: https://calfeed.ai/learn/ics-refresh-rate-apple-google (2026-05-15)
- Nota: Concordano usecarly, hetk.io, usemooncal, twocal (2025-2026). Help Google https://support.google.com/calendar/answer/37100 (non datata) non porta l intervallo. Thread community Google segnalano che i VALARM degli ICS importati vengono ignorati e valgono le notifiche di default del calendario (thread 9627602, 197942453: contenuto troncato, date non lette: confidenza bassa).

### 11. Shortcuts: le automazioni 'Time of Day' possono girare senza conferma ('turn off Ask Before Running'), ma 'You also may need to set individual actions to run automatically'; l automazione non notifica quando parte.

- Confidenza: alta
- Fonte: https://support.apple.com/en-au/guide/shortcuts/apd602971e63/ios (guida disponibile per iOS 14-26 (non datata))
- Nota: Fonte 'Run Immediately' iOS 17: matthewcassinelli.com. Regressione iOS 18.2 con richiesta di conferma limitata alle automazioni HomeKit (MacRumors forum, dicembre 2024).

### 12. Automazione Time of Day con telefono bloccato e inattivo da ore: utenti riportano che NON parte (es. 6:00 mentre si dorme) e che 'Get Contents of URL' non funziona a telefono bloccato; consiglio della community: cron su server esterno.

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/665845 (novembre 2020, conferme giugno 2023 e ottobre 2024)
- Nota: Fonte community, non Apple. Per leggere il JSON dal Mini in tailnet serve anche il tunnel Tailscale attivo: VPN On Demand lo mantiene (Tailscale docs 2026-01-05), con segnalazioni di consumo batteria (issue 17157).

### 13. ntfy self-hosted + app iOS: per notifiche istantanee il server proprio DEVE avere upstream-base-url: https://ntfy.sh; verso ntfy.sh viaggia 'only the message ID (in the X-Poll-ID header), and the SHA256 checksum of the topic URL'; l iPhone riceve il poll via Firebase->APNs e poi scarica il contenuto dal server proprio. Senza upstream 'delivery can take hours, depending on the state of the phone'.

- Confidenza: alta
- Fonte: https://docs.ntfy.sh/config/#ios-instant-notifications (non datata)
- Nota: Known issues (https://docs.ntfy.sh/known-issues/): se l iPhone non raggiunge il server self-hosted la notifica mostra solo 'New message': con il Mini solo in tailnet, fuori tunnel arriva un avviso vuoto. TECHNICAL_LIMITATIONS.md dell app iOS: i background task iOS sono inaffidabili (task ogni 15 min eseguito una volta in un giorno). Issue 1191 (settembre 2024) su push iOS persi con self-hosted, senza risoluzione nel thread. Costo zero; l alternativa e pubblicare direttamente su un topic di ntfy.sh, con il contenuto fuori dalla tailnet.

### 14. Pushover: 4,99 USD una tantum per piattaforma (iOS, Android, Desktop), prova 30 giorni, 10.000 messaggi/mese gratuiti; priorita emergency con retry >= 30 s, expire <= 10800 s, massimo 50 tentativi, ricevuta e callback all acknowledgment; il messaggio e cancellato dai server una volta verificata la consegna al dispositivo.

- Confidenza: alta
- Fonte: https://pushover.net/api (non datata (nota 2026 su deprecazione webhook GitHub))
- Nota: Prezzo da https://pushover.net/pricing. Il Mini ha bisogno solo di HTTPS in uscita. Il contenuto transita sui server Pushover (USA). Il tocco apre l app Pushover; il parametro url per aprire la PWA non e stato verificato in questa sonda.

### 15. Gotify: nessun client iOS ufficiale; l app Android usa una WebSocket persistente verso il server; su iOS esiste solo iGotify di terzi, con bug documentati nel mantenere la WebSocket in background (issue 202).

- Confidenza: media
- Fonte: https://github.com/androidseb25/iGotify-Notification-Assistent/issues/202 (non datata)
- Nota: Richiesta iOS aperta dal 2021-09-07 (gotify/server issue 431, corpo vuoto). Con il Mini in tailnet, il client Android deve avere il tunnel sempre attivo.

### 16. Home Assistant Companion: massimo 500 push al giorno per dispositivo (reset a mezzanotte UTC), via Firebase Cloud Messaging con contenuto non cifrato verso Google; le critical notifications iOS 'play a sound even if Do Not Disturb is enabled or the iPhone is muted' e bypassano il rate limit.

- Confidenza: alta
- Fonte: https://companion.home-assistant.io/docs/notifications/notification-details/ (non datata)
- Nota: Critical: https://companion.home-assistant.io/docs/notifications/critical-notifications/. Il relay push e gestito dal progetto HA; l istanza deve solo uscire in HTTPS (Nabu Casa non obbligatorio per il push, dev docs). Richiede un istanza Home Assistant sul Mini: il costo e tutto in lavoro e manutenzione.

### 17. Telegram Bot API: gratuito; limiti circa 1 messaggio/s per chat e 30/s complessivi; consegna in ordine non garantita; segnalazioni di ritardi di consegna su iOS legate a Background App Refresh e Low Power Mode.

- Confidenza: media
- Fonte: https://core.telegram.org/tdlib/notification-api/ (non datata)
- Nota: Ritardi iOS da fonti secondarie (guidingtech, thegeekpage). Nessun acknowledgment applicativo oltre la lettura. Contenuto sui server Telegram.

### 18. Twilio Italia: SMS in uscita 0,0927 USD/messaggio; sender ID alfanumerico gratuito e, secondo le linee guida Twilio, senza pre-registrazione (con codice di condotta AGCOM); marketing vietato 22-8 e la domenica. Voce: 0,3473 USD/min verso mobili italiani, 0,0168 verso fissi; numero toll-free 27 USD/mese.

- Confidenza: media
- Fonte: https://www.twilio.com/en-us/sms/pricing/it (non datata (copyright 2026))
- Nota: Voce: https://www.twilio.com/en-us/voice/pricing/it; guidelines: https://www.twilio.com/en-us/guidelines/it/sms. Contraddizione: sent.dm (2025) afferma che AGCOM richiede la registrazione del sender alfanumerico (5-10 giorni). Un numero italiano long code richiede KYC regolatorio non verificato in questa sonda. Il Mini ha bisogno solo di HTTPS in uscita. Il tocco non apre l app salvo URL nel testo.

### 19. HealthKit Medications API (WWDC25, iOS 26): le app terze possono solo LEGGERE farmaci (HKUserAnnotatedMedication) e dosi (HKMedicationDoseEvent con stato taken/skipped/snoozed, quantita e orario); risposta DTS Apple: 'No, that isn't allowed. Medication data is read-only in HealthKit.'

- Confidenza: alta
- Fonte: https://developer.apple.com/forums/thread/803954 (ottobre 2025)
- Nota: Video WWDC25 321: https://developer.apple.com/videos/play/wwdc2025/321/ (giugno 2025). Conseguenza: non si puo alimentare Salute con la terapia di PharmaTimer; si puo pero leggere da Salute una presa registrata dall utente (utile a M1/M2 se Salute e la riserva umana).

### 20. Apple Salute 'Farmaci' come riserva umana: Dose Reminders, Follow Up Reminders ('alert you if you haven't logged a medication 30 minutes after the initial notification'), registrazione dalla notifica con 'Skipped' o 'Taken'; alcune pianificazioni richiedono iOS 18+.

- Confidenza: alta
- Fonte: https://support.apple.com/en-us/105064 (2025-11-07)
- Nota: Critical Alerts per farmaco (suonano con Focus e silenzioso) dalla guida iPhone https://support.apple.com/guide/iphone/track-your-medications-iph811670c81/ios (testo letto via ricerca, pagina non aperta). Doppia immissione manuale della terapia: rischio M1 se PharmaTimer e Salute ricordano entrambi.

### 21. Android Health Connect: nessun tipo di dato 'medication' fra i data type fitness; i farmaci esistono solo nei Medical Records (FHIR R4/R4B: Medication, MedicationRequest, MedicationStatement, permesso READ_MEDICAL_DATA_MEDICATIONS), un archivio PHR e non un motore di promemoria.

- Confidenza: alta
- Fonte: https://developer.android.com/health-and-fitness/health-connect/medical-records/data-format (data-types aggiornato 2026-09-02; data-format non datata)
- Nota: Samsung Health ha una funzione Medications con promemoria (newsroom US, pagina non raggiunta: due timeout; data non verificata); nessuna API terza per i promemoria trovata nel perimetro delle pagine Samsung Developer emerse in ricerca.

### 22. AlarmKit (iOS 26): sveglie di terze parti 'prominent alerts that break through silent mode and current focus settings', autorizzazione utente per app, ricorrenza settimanale, nessun limite numerico dichiarato; interfaccia full screen, Lock Screen, Dynamic Island, Apple Watch.

- Confidenza: alta
- Fonte: https://developer.apple.com/videos/play/wwdc2025/230/ (WWDC25, giugno 2025)
- Nota: Le pagine di documentazione AlarmKit hanno restituito solo il titolo al fetch. MacRumors 2025-06-11 conferma iOS 26. Plugin Capacitor Cap-go/capacitor-alarm: AlarmKit su iOS 26+, AlarmClock intent su Android (sveglie visibili nell app Orologio), MPL-2.0, README non datato. Richiede comunque un app nativa: stesso problema di distribuzione del canale 1.

### 23. Medisafe e passata a abbonamento da gennaio 2026 (Premium 4,99 USD/mese, piano gratuito limitato a 2 farmaci); MyTherapy resta gratuita, iOS e Android, 4,5 stelle su decine di migliaia di recensioni.

- Confidenza: media
- Fonte: https://pillo.care/blog/medisafe-not-free-what-to-do (2026 (fonte secondaria, concorrente))
- Nota: MyTherapy: https://www.mytherapyapp.com/blog/medisafe-alternatives-free (non datata, concorrente). Nessuna API di integrazione con PharmaTimer: doppia immissione e rischio M1.

### 24. Web Push da PWA su iOS: disponibile dalla 16.4 solo per web app in Home Screen (WebKit 2023-02-16); Declarative Web Push da iOS 18.4 senza service worker, con fallback che garantisce 'there is always a user visible notification' (WebKit 2025-03-27); in iOS 26 ogni sito aggiunto alla Home Screen si apre come web app per default (WebKit 2025-09-15).

- Confidenza: alta
- Fonte: https://webkit.org/blog/16535/meet-declarative-web-push/ (2025-03-27)
- Nota: Caso forum Apple 770749 (dicembre 2024): push PWA non visualizzati su iOS 18.0 perche il dispositivo era in Non disturbare. Il Mini per il Web Push ha bisogno solo di HTTPS in uscita verso i push service: nessun IP pubblico.

## Incognite

- iOS Calendar: se i VALARM contenuti in un feed .ics sottoscritto suonano davvero su iPhone (la casella 'Remove Alerts' esiste su macOS e l interruttore 'Event Alerts' su iPhone, ma nessuna pagina Apple letta lo afferma esplicitamente per iOS): da misurare con un feed di prova servito dal Mini.
- iOS Calendar: se il fetch in background del calendario sottoscritto attraversa il tunnel Tailscale quando l app Calendario e chiusa e il telefono e bloccato, e con quale frequenza reale (Automatically = solo in carica e Wi-Fi).
- Google Calendar: se i VALARM di un feed sottoscritto via URL sono onorati o sostituiti dalle notifiche di default del calendario (thread community troncati, date non lette).
- Durata esatta dei profili ad hoc (un anno) e comportamento del check-in ppq.apple.com per un app installata su un solo iPhone: letto solo su fonti secondarie.
- Pushover: se il parametro url del messaggio apre la PWA in Home Screen al tocco (deep link) o solo Safari.
- Twilio Italia: registrazione del sender ID alfanumerico obbligatoria (sent.dm) o non richiesta (Twilio guidelines): fonti in contraddizione; requisiti KYC per un numero italiano long code non verificati.
- Samsung Health Medications: data della funzione, disponibilita in Italia e assenza di API terza (pagina newsroom non raggiunta per timeout).
- Documentazione AlarmKit (limiti numerici, requisiti di extension Live Activity): le pagine developer.apple.com hanno restituito solo il titolo; letto solo il video WWDC25.
- Shortcuts: se una automazione Time of Day su iOS 18/26 parte davvero a telefono bloccato da ore: solo testimonianze community 2020-2024, nessuna misura su iOS 26.
- ntfy iOS: stato attuale (2026) dei push persi con server self-hosted (issue 1191 aperta nel 2024); non verificato con l app corrente.
- Costo in lavoro del wrapper Capacitor: non stimato con sonda sul repo (compito di sola ricerca web).
