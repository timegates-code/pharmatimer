# web:android -- Web Push su Android e moto g06

Fase: Misura. Agente `a534fc6f1f270890d`, esito: completato. Resa leggibile generata meccanicamente da `06-web-android.json`, che e il risultato restituito dall'agente cosi come registrato nel journal del workflow: contenuto invariato, solo forma.

## Sintesi

Stato a settembre 2026 del Web Push per una PWA installata su Android, con mira sul Motorola moto g06. (1) Il g06 e un entry-level 4G del settembre 2025 (annuncio 5/9, rilascio 23/9/2025), Helio G81, 4 o 8 GB LPDDR4X, Android 15 standard: NON e Go edition (Motorola etichetta 'Go edition' esplicitamente, es. moto e15 'Android 14 (Go edition)' con 2 GB; Android Go esiste ufficialmente fino ad Android 13), quindi nessun limite Go su Chrome. Supporto: fonti secondarie concordano su patch di sicurezza fino ad agosto 2027 e nessun Android 16. (2) Chrome Android usa FCM come push service (endpoint fcm.googleapis.com/fcm/send/... o /wp/...); userVisibleOnly: true e obbligatorio e ogni push deve chiudere con una notifica visibile dentro event.waitUntil, altrimenti Chrome mostra 'This site has been updated in the background'. (3) FCM consegna 'high priority' anche in Doze e sveglia il device; normal priority e rinviata alla maintenance window; se i messaggi high non producono notifiche vengono deprioritizzati (finestra 7 giorni). L'header Urgency: high e l'unica leva Web Push, ma NON esiste una dichiarazione ufficiale della mappatura Urgency->priority FCM per Chrome, e le evidenze storiche (2017-2019, Android 7/8) dicono che Urgency: high non bastava a svegliare Chrome in Doze; su Android 15 e da misurare. Doze sospende rete e alarm; App Standby restricted dopo 8 giorni senza interazione; Motorola aggiunge 'Improve battery while inactive' (batterycare) che nel 2024 uccideva le app ogni ora a prescindere dal toggle. (4) Notification Triggers e morto: origin trial 80-83 e 86-88, poi 'No longer pursuing'; nessun revival verificato. Periodic Background Sync c'e (Chrome 80+) ma solo per PWA installata, cadenza minima 12 ore, governata dal site engagement, in Doze slitta alla maintenance window: inutile per orari di terapia. (5) TTL onorato da FCM (0..2419200 s, default 4 settimane, storage finche il device torna online); Topic e RFC 8030 5.4 e FCM dichiara di supportare gli header webpush ma non lo elenca: da provare. (6) Niente suono custom (mai implementato); il suono e del canale Android per sito/app (da Chrome 62 un canale per origine), silent: true lo azzera; requireInteraction persiste; max 2 azioni (Chrome 48+, icone azione non mostrate da Android 7); notificationclick con event.action e clients.matchAll/focus o openWindow, che su Chrome Android apre nella PWA standalone; le notifiche della WebAPK sono delegate al package dell'app. (7) Dal Chrome 108 mobile il SW con fetch non e piu richiesto per l'installazione da menu; WebAPK richiede GMS e viene coniata sul server Google, altrimenti scorciatoia con badge Chrome e senza capacita da installata; il manifest e ricontrollato ogni 24 h e l'update WebAPK avviene a finestre chiuse, in carica e su Wi-Fi. (8) Policy recenti: auto-revoca del permesso per siti a basso engagement (ott. 2025, esenti le PWA installate), rate limit Push API 1000/min con 429 per siti disruptive (gen. 2026), prompt non bloccante con timeout in Chrome 155 (lug. 2026); nessuno studio primario 2024-2026 sulla latenza reale sotto Doze/OEM: i tracker Chromium sono dietro login. Le incognite decisive (Doze reale con Urgency high, package da esentare dalla batteria, batterycare, force stop, Topic/TTL, canali e suono, azioni e click, voce di menu) vanno misurate sul g06 fisico.

## Reperti

### 1. (1) moto g06: annunciato 5 settembre 2025, rilasciato 23 settembre 2025; OS 'Android 15' (edizione standard, NON Go); chipset MediaTek Helio G81 Ultra/Extreme (2xA75 2.0GHz + 6xA55 1.7GHz, 12 nm); varianti 64GB/4GB, 128GB/4GB, 256GB/4GB, 256GB/8GB LPDDR4X; batteria 5200 mAh, ricarica 10W; display 6.88" IPS HD+ 720x1640 120Hz; prezzo base 115 EUR.

- Confidenza: alta
- Fonte: https://m.gsmarena.com/motorola_moto_g06-14115.php (non datata (scheda GSMArena; annuncio 2025-09-05, rilascio 2025-09-23))
- Nota: Confermato dalla scheda ufficiale Motorola UK/US (a_id 189450 e 189449): 'Android 15', '4GB LPDDR4X RAM, expandable up to 12GB with RAM Boost | 8GB LPDDR4X RAM', 'MediaTek Helio G81 Extreme'. Nessuna delle due pagine porta una data.

### 2. (1) Motorola etichetta esplicitamente le edizioni Go nelle schede ufficiali: la scheda moto e15 riporta 'Android 14 (Go edition)' con '2 GB LPDDR4X RAM'; la scheda moto g06 riporta solo 'Android 15'. La documentazione Android Go elenca edizioni Go solo fino ad Android 13 (min RAM 2GB) e le descrive come 'built for entry-level smartphones with less RAM'. Conclusione: il g06 (4/8GB) non e Go; i limiti Android Go per Chrome NON si applicano.

- Confidenza: alta
- Fonte: https://developer.android.com/guide/topics/androidgo (2026-02-26 (ultimo aggiornamento pagina Android Go); scheda e15 non datata)
- Nota: Perimetro della sonda: scheda Motorola UK e15 (a_id 184469), scheda g06 (a_id 189450/189449), pagina androidgo. Nessuna fonte trovata che citi una variante Go del g06.

### 3. (1) Aggiornamenti: il g06 e nato con Android 15 e, secondo la recensione Tech Advisor, 'only has two years of security updates ahead of it' e non ricevera Android 16; androidupdatetracker lo da 'end of life ... no further (official) Android updates'; endoflife.date: security support fino al 31 Aug 2027; forum Android Central (feb 2026) cita il sito Motorola US: 'security patches until Aug 2027'.

- Confidenza: media
- Fonte: https://www.techadvisor.com/article/2940159/motorola-moto-g06-review.html (2025-12-04 (Tech Advisor); 2026-02-11/12 (thread Android Central); endoflife.date non datata)
- Nota: Fonti secondarie e fra loro non del tutto coerenti (nessun upgrade OS vs. 'almeno un upgrade' per la famiglia g06 power). La pagina ufficiale Motorola sulla policy del g06 non e stata raggiunta: fare fede a Impostazioni > Aggiornamenti sul telefono.

### 4. (2) Chrome usa FCM come push service: con VAPID l'endpoint e del tipo https://fcm.googleapis.com/fcm/send/<id> (formato storico); nel 2024 sono comparsi anche endpoint https://fcm.googleapis.com/wp/<SubscriberID>. Peter Beverloo (Google) su firebase-talk: 'the Web Push endpoints will not be deprecated. This is about regular FCM use, and the FCM for Web API' (lo shutdown legacy del 21 giugno 2024 non tocca Web Push VAPID).

- Confidenza: alta
- Fonte: https://groups.google.com/g/firebase-talk/c/3C2Vq9pIWr4 (2024-05-23 / 2024-06-05 (thread); endpoint fcm/send da developer.chrome.com/blog/web-push-interop-wins, 2016-07-27)
- Nota: Incidente documentato: 'Many Chrome (FCM) endpoints started to return 404 errors starting from 26 Jun [2024]' (lists.w3.org public-webapps-github 2024Jun/0414, 2024-06-27). Il server deve gestire 404/410 come unsubscribe.

### 5. (2) Chrome accetta pushManager.subscribe solo con userVisibleOnly: true: 'Chrome currently only supports the Push API for subscriptions that will result in user-visible messages'. Se il push event termina senza notifica visibile (o senza event.waitUntil che attende showNotification), Chrome mostra la notifica generica 'This site has been updated in the background'.

- Confidenza: alta
- Fonte: https://web.dev/articles/push-notifications-subscribing-a-user (2016-06-30 (web.dev); 2022-04-11 (pushpad.xyz/blog/chrome-push-notifications-this-site-has-been-updated-in-the-background))
- Nota: Riconfermato da issue firebase-js-sdk #9069, #6478, #3868 (comportamento tuttora vivo). Conseguenza per PharmaTimer: ogni push DEVE produrre una notifica, anche quando il client decide che la dose non va piu mostrata (mostrare comunque qualcosa, es. notifica silenziosa/tag).

### 6. (3) FCM priorita: 'FCM attempts to deliver high priority messages immediately, allowing FCM to wake a sleeping device when necessary and to run some limited processing'; normal priority: 'When the device is in Doze mode, delivery may be delayed to conserve battery until the device exits doze'. Deprioritizzazione: 'If FCM detects a pattern in which messages don't result in user-facing notifications, your messages may be deprioritized to normal priority'; finestra di 7 giorni per istanza.

- Confidenza: alta
- Fonte: https://firebase.google.com/docs/cloud-messaging/android-message-priority (2026-09-01 (Last updated))
- Nota: Il documento non lega esplicitamente l'header Urgency di Web Push alla priority FCM.

### 7. (3) Mappatura Urgency -> priorita FCM: la doc FCM 'setting-message-priority' mostra per il web solo webpush.headers {'Urgency':'high'} e rimanda a RFC 8030 sez. 5.3; WebpushConfig.headers e definito come 'HTTP headers defined in webpush protocol. Refer to Webpush protocol for supported headers, e.g. TTL: 15'. Non esiste, nel perimetro sondato, una dichiarazione ufficiale Google che dica 'Urgency: high = FCM high priority' per Chrome Android.

- Confidenza: media
- Fonte: https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority (2026-09-01 (Last updated))
- Nota: RFC 8030 sez. 5.3 (dic. 2016): valori very-low/low/normal/high, 'high: Low battery (Incoming phone call or time-sensitive alert)'. Per PharmaTimer inviare sempre Urgency: high e TTL corto: e l'unica leva disponibile lato server.

### 8. (3) Evidenza storica che Urgency: high NON bastava a svegliare Chrome in Doze: Beverloo (chromium-dev, 2017-11-28): 'We're aware of message delivery being subject to Doze mode even for high priority messages in Android N and O, in all other versions it should be fine'; thread push-notifications-dev (2017-10) 'high priority notifications are unable to wake up chrome browser or the service worker'; issue web-push-php #204 (2019-01-24, Android 8, PWA) risolta da alcuni aggiungendo header legacy android.priority=high. Bug Chromium 777106 / 41351071 non leggibile (login).

- Confidenza: media
- Fonte: https://groups.google.com/a/chromium.org/g/chromium-dev/c/9aY1Nal5YMc/m/5OmIKM-gBAAJ (2017-11-28)
- Nota: Fonti vecchie (Android 7/8). Nessuna fonte 2024-2026 trovata che confermi o smentisca su Android 15: e una incognita da misurare sul telefono.

### 9. (3) Doze (doc Android): 'Suspends network access', 'Defers standard AlarmManager alarms ... to the next maintenance window', 'Doesn't let JobScheduler run'; maintenance window sempre piu rade; 'FCM high priority messages let you wake your app ... In Doze or App Standby mode, the system delivers the message and gives the app temporary access to network services and partial wakelocks'. App Standby buckets: restricted = 1 job/giorno in sessione 10 min e 1 alarm/giorno; ingresso in restricted dopo 8 giorni senza interazione da Android 13; 'If the app doesn't show a notification upon receiving a high-priority FCM message, the user can't interact with the app and thus promote it to the active bucket'.

- Confidenza: alta
- Fonte: https://developer.android.com/training/monitoring-device-state/doze-standby (2026-08-18 (doze-standby); 2026-08-14 (topic/performance/appstandby))
- Nota: Per una PWA l'app soggetta ai bucket e Chrome (e/o la WebAPK shell): usare la PWA ogni giorno tiene Chrome in active/working set.

### 10. (3) Motorola/Lenovo: dontkillmyapp classifica Motorola 3 su 5; segnala 'Improve battery while inactive' (pacchetto com.motorola.batterycare), Adaptive Battery e 'Background restriction'. Issue #1142 (Moto G64, Android 14, 2024-08-04): 'apps are killed every hh:00' con motivo 'SleepMode', 'It doesn't matter if this switch is on or off'; workaround: 'adb shell pm uninstall -k --user 0 com.motorola.batterycare'.

- Confidenza: media
- Fonte: https://github.com/urbandroid-team/dont-kill-my-app/issues/1142 (2024-08-04 (issue); pagina dontkillmyapp.com/motorola non datata)
- Nota: Nessuna fonte specifica per g06/Android 15. Le recensioni g06 (Tech Advisor 2025-12-04, TechRadar g06 power) non citano ritardi di notifica. Da verificare sul telefono se Batteria > 'Migliora la batteria quando inattivo' esiste e se Chrome e in 'Senza limitazioni'.

### 11. (3) Blog Firebase (2025-04-17): 'Doze mode only happens when the screen is off'; normal priority 'delivered opportunistically when the device is in Doze mode'; raccomanda 'high priority for most user visible notifications'; high priority throttled se non produce notifiche visibili. Blog Firebase delivery (2024-07-18): messaggi 'dropped due to the application being force-stopped', 'dropped due to time-to-live expiration', consegnati al riconnettersi se il device era offline.

- Confidenza: alta
- Fonte: https://firebase.blog/posts/2025/04/fcm-on-android/ (2025-04-17)
- Nota: Force-stop di Chrome (o della WebAPK?) = push scartato fino alla riapertura: da misurare quale dei due package conta.

### 12. (4) Notification Triggers (showTrigger/TimestampTrigger): origin trial Chrome 80-83 e 86-88 ('Intent to Extend', 2020-09-23); pagina ufficiale: 'The development of Notification Triggers API ... has ended. It wasn't clear that we could provide consistent and reliable experiences across platforms', sezione 'No longer pursuing'; chromestatus: 'In developer trial (Behind a flag)', desktop_first 86, android null, ultimo aggiornamento 2022-09-13. Nessuna evidenza di revival 2025-2026 nel perimetro sondato (blink-dev, chromestatus).

- Confidenza: alta
- Fonte: https://developer.chrome.com/docs/web-platform/notification-triggers/ (2019-10-24 (pagina, aggiornata con avviso di chiusura; data avviso non mostrata); chromestatus 2022-09-13)
- Nota: Un riassunto di ricerca ha citato un 'origin trial in Chrome 147': NON trovato riscontro in nessuna fonte primaria; trattarlo come falso finche non provato. Non e disponibile: la notifica a orario deve venire da un push server-side.

### 13. (4) Periodic Background Sync: spedito in Chrome 80 (I2S 2019-12-03); solo PWA installata e lanciata come app ('not available in the context of a regular tab'); Chrome 'ensures a gap of at least 12 hours (configurable through experiments) between periodicsync events'; frequenza governata dal site engagement (about://site-engagement), 'if at any point, the site engagement falls to zero, we stop scheduling'; su Android 'will not fire periodicsync events in doze mode ... but rather will fire in the recurring maintenance window'. Solo Chromium (MDN: 'Limited availability').

- Confidenza: alta
- Fonte: https://developer.chrome.com/docs/capabilities/periodic-background-sync (2025-08-19 (doc Chrome); 2019-08-01 (I2E con il vincolo 12 ore); 2019-12-03 (I2S))
- Nota: Inutilizzabile per orari di terapia: cadenza minima 12h, non puntuale, dipendente dall'engagement. Al piu per rinfrescare lo specchio locale.

### 14. (5) TTL con FCM: header webpush TTL onorato; 'The value must be a duration from 0 to 2,419,200 seconds (28 days)'; default 4 settimane; 'If the device isn't connected to FCM, the message is stored until a connection is established'; TTL=0 = consegna solo se online ora. Topic: RFC 8030 sez. 5.4 (max 32 caratteri, sostituisce i messaggi in coda con lo stesso topic); FCM dichiara di supportare gli header del protocollo webpush (rif. RFC 8030 sez. 5) ma non elenca Topic esplicitamente.

- Confidenza: alta
- Fonte: https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan (2026-09-01 (Last updated))
- Nota: Segnalazione storica 'TTL is not honored' (web-push issue #284, 2017-06-23, GCM legacy) senza risoluzione. Onoramento di Topic su FCM: da provare (due push stesso Topic a telefono offline, verificare che arrivi solo l'ultimo).

### 15. (6) Suono/vibrazione: da Android O le notifiche web usano i canali di notifica; Chromium README: 'From M62 ... sites with notification permission each get a dedicated channel, within the Sites channel group', l'utente controlla 'whether they vibrate or make a sound'. Suono custom: 'custom sound was never implemented in any browser', l'opzione sound e stata rimossa dallo standard nel 2018; resta solo silent: true (MDN: 'no sounds or vibrations issued, regardless of the device settings'; se true, vibrate non deve esserci). renotify richiede tag; un replace via tag senza renotify avviene 'without a sound or vibration'.

- Confidenza: alta
- Fonte: https://chromium.googlesource.com/chromium/src/+/66.0.3359.158/chrome/android/java/src/org/chromium/chrome/browser/notifications/channels/README.md (non datata (README Chromium a M66, 2018); pushpad sound 2022-03-08; MDN showNotification non datata)
- Nota: Il suono e quello del canale Android del sito/app: si cambia dalle Impostazioni Android, non dal codice. Android 15 QPR2 (marzo 2025) ha introdotto 'Notification cooldown' che abbassa il volume di notifiche successive dalla stessa app per fino a 2 minuti (9to5google 2025-03-04): presenza su Motorola Android 15 da verificare.

### 16. (6) Persistenza e azioni: requireInteraction ('show the notification until the user dismisses or clicks'); Chrome Android non auto-chiude le notifiche ('Chrome on Android doesn't have this behavior' di timeout desktop). Azioni: 'Currently Chrome only supports two actions on each notification' (Chrome 48, desktop e Android), Notification.maxActions; 'On Android 7 and later, the action icons aren't shown at all'; in notificationclick si legge event.action. Click: pattern clients.matchAll({type:'window'}) + windowClient.focus(), altrimenti clients.openWindow(); MDN: 'In Chrome for Android, the method may instead open the URL in an existing browsing context provided by a standalone web app previously added to the user's home screen'.

- Confidenza: alta
- Fonte: https://developer.chrome.com/blog/notification-actions (2016-01-29 (blog azioni); web.dev notification-behaviour 2016-06-30; MDN openWindow non datata)
- Nota: Due bottoni 'Presa' e 'Posticipa' sono nel limite. Vincoli M2/M3: l'orario di presa registrato dal bottone deve essere l'istante del tap (event.timeStamp/Date.now nel SW), e il tap va scritto nel taccuino locale prima di qualunque rete. Fonti vecchie ma comportamento riconfermato (Web Almanac 2025 e doc Chrome non segnalano cambi).

### 17. (6) Notifiche di una PWA installata come WebAPK vengono consegnate al package della WebAPK (IWebApkApi notifyNotification / notifyNotificationWithChannel), quindi in Android appaiono come provenienti dall'app e non da Chrome, con canale proprio; web.dev: 'apps installed via WebAPKs are not granted this at install time; you must request it at runtime within your app'.

- Confidenza: media
- Fonte: https://github.com/chromium/chromium/blob/main/chrome/android/webapk/libs/runtime_library/src/org/chromium/webapk/lib/runtime_library/IWebApkApi.aidl (non datata (sorgente Chromium main); web.dev/articles/webapks 2017-05-21)
- Nota: Il meccanismo esatto e desunto dall'AIDL e da riassunti di ricerca, non da una pagina di documentazione: verificare sul telefono dove compaiono le impostazioni di notifica (Impostazioni > App > PharmaTimer vs Chrome > Notifiche > Siti).

### 18. (7) Installazione: dal Chrome 108 mobile 'we have removed the requirement to have a service worker that implements the fetch() method for installation from the menu'; il prompt automatico richiedeva ancora il fetch handler; consigliati name/short_name, icons (maskable), start_url, display. WebAPK: 'created by a trusted provider of the user's device, typically in the cloud, on a WebAPK minting server' (Chrome con GMS); se non si puo creare una WebAPK il browser crea una scorciatoia: 'browser-badged icon on the home screen ... Don't have an icon in the Launcher or on Settings, Apps ... Can't use any capabilities that require installation'. Voce menu: 'Variations in the wording of the menu item for install such as Install or Add to Home Screen'.

- Confidenza: alta
- Fonte: https://developer.chrome.com/blog/update-install-criteria (2023-12-05 (blog criteri); web.dev/learn/pwa/installation 2024-09-20)
- Nota: Web Almanac PWA 2025 (2026-01-16) riconferma: 'Service workers are no longer required for browsers like Edge and Chrome to display the installation prompt'. In pratica: se la voce e 'Installa app' e l'icona finisce nel drawer senza badge Chrome, e WebAPK; se compare 'Aggiungi a schermata Home' con badge Chrome, e scorciatoia e periodic sync/Play-like non ci sono.

### 19. (7) Aggiornamento WebAPK: Chrome ricontrolla il manifest ogni 24 ore ('may increase the time between checks to 30 days' se il server non risponde); campi che scatenano l'update: name, short_name, icons, background_color, display, orientation, scope, shortcuts, start_url, theme_color, web_share_target; l'update avviene 'after all windows of the PWA have been closed, the device is plugged in, and connected to WiFi'.

- Confidenza: alta
- Fonte: https://web.dev/articles/manifest-updates (2024-09-19)
- Nota: Rilevante per il build:mini con base '/' e per lo scope: un cambio di start_url/scope non e immediato sul telefono.

### 20. (8) Affidabilita e policy 2024-2026: Chrome revoca automaticamente il permesso notifiche ai siti con 'very low user engagement and a high volume of notifications' ('This feature does not revoke notifications for any installed web apps', blog 2025-10-10); dal gennaio 2026 rate limit Push API per siti 'disruptive' (1000 msg/min, HTTP 429, criteri calcolati giornalmente su push per tempo speso, prompt per tempo speso, engagement); Chrome 155 (blog 2026-07-22): il prompt notifiche su Android e non bloccante e 'will time out ... even if the user did not take any decision' con permission='default'; blog Google Security 2026-08-11: riduzione di 'over 7 billion a day' notifiche su Android nel Q1.

- Confidenza: alta
- Fonte: https://developer.chrome.com/blog/web-push-rate-limits (2026-01-06 (rate limits); 2025-10-10 (auto-revoca, blog.google/chromium); 2026-07-22 (Chrome 155 prompt); 2026-08-11 (blog security))
- Nota: Un pilota singolo con pochi push al giorno e engagement quotidiano e lontano da queste soglie; l'installazione come WebAPK esenta dalla revoca automatica. Attenzione al prompt a timeout: gestire permission='default' e navigator.permissions onchange.

### 21. (8) Dati di adozione/affidabilita: Web Almanac 2025 (2026-01-16): ~7% delle PWA registra pushManager, 2% usa sync.register, su mobile il 48% ignora il prompt e il 16% accetta. Fonti secondarie 2024 riconfermano che in Doze 'the phone only wakes up every 15-28 minutes' (nelsonslog, 2024-07-19, app native, non Chrome). Nessuno studio primario 2024-2026 trovato sulla latenza di Web Push su Chrome Android sotto Doze/OEM.

- Confidenza: media
- Fonte: https://almanac.httparchive.org/en/2025/pwa (2026-01-16)
- Nota: Perimetro: issue tracker Google/Chromium (296891218, 328432356, 41351071) non leggibili senza login; HN 38402368 in 429. L'affidabilita reale sul g06 va misurata, non dedotta.

## Incognite

- Sul g06 vero: il push con Urgency: high arriva a schermo spento in Doze profondo (>1h inattivo, non in carica) e con quale latenza? Misura: 10 push a intervalli noti, log dell'istante di showNotification vs istante di invio, con telefono fermo su tavolo per 2-3 ore.
- Quale package governa l'ottimizzazione batteria che conta: 'Chrome' o la WebAPK 'PharmaTimer'? Misura: Impostazioni > App > [Chrome | PharmaTimer] > Batteria; provare 'Senza limitazioni' su uno solo alla volta e ripetere la prova Doze.
- Esiste su Android 15 del g06 la voce Batteria > 'Migliora la batteria quando inattivo' (com.motorola.batterycare)? Se si: prova con voce ON e OFF; il pacchetto e presente (adb shell pm list packages | grep batterycare)?
- Force stop di Chrome: dopo 'Termina' su Chrome (e separatamente sulla WebAPK) i push inviati arrivano alla riapertura o vengono scartati (FCM dice scartati con retry falliti)? Misura con TTL lungo (86400) e riapertura dopo 10 minuti.
- Header Topic con FCM: due push stesso Topic a telefono in modalita aereo; al ritorno online arriva solo l'ultimo? Header TTL corto (60 s) a telefono offline per 5 minuti: il push viene scartato (atteso) o consegnato?
- Dove compaiono le impostazioni di notifica della PWA installata: Impostazioni > App > PharmaTimer > Notifiche (canale proprio con suono/vibrazione modificabili) oppure sotto Chrome > Notifiche > Siti? Il suono di default e udibile e la vibrazione attiva?
- Notification cooldown: la voce Impostazioni > Notifiche > 'Notification cooldown' esiste sul g06 e, se attiva, abbassa il volume di due notifiche ravvicinate di PharmaTimer?
- Bottoni azione 'Presa'/'Posticipa': su Android 15 compaiono solo espandendo la notifica o anche compatti? Il tap su 'Presa' con la PWA chiusa esegue notificationclick nel SW e scrive nel taccuino senza aprire la finestra? Il tap sul corpo apre la WebAPK in standalone (focus) o una tab Chrome?
- Voce di menu Chrome sul g06: 'Installa app' (WebAPK, icona nel drawer, presente in Impostazioni > App) oppure 'Aggiungi a schermata Home' (scorciatoia con badge Chrome)? Dipende da manifest + GMS: verificare con il build:mini a base '/' e con il proxy tailnet.
- Prompt permesso notifiche non bloccante (Chrome 155+): sul g06 con Chrome corrente la richiesta scade da sola? Verificare che il flusso gestisca permission='default' e riproponga da un gesto utente.
- Stato del bug Chromium 41351071 (ex 777106) 'push messages not waking Android from deep sleep': aperto, fixed o wontfix? Non leggibile senza login; da aprire dal Terminale con account Google.
- Versione Chrome effettiva sul g06 (chrome://version) e se Chrome e aggiornato dal Play Store: le policy 2025-2026 (auto-revoca, rate limit, prompt) valgono solo dalle rispettive milestone.
