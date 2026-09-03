# web:ios -- Web Push su iPhone, stato 2026

Fase: Misura. Agente `a065af5f9a63ac143`, esito: completato. Resa leggibile generata meccanicamente da `05-web-ios.json`, che e il risultato restituito dall'agente cosi come registrato nel journal del workflow: contenuto invariato, solo forma.

## Sintesi

Stato del Web Push per una PWA installata su iPhone a settembre 2026, ricostruito da fonti primarie (WebKit blog, Apple Developer docs e release notes Safari 17-26.5, WWDC22/23/25, sorgenti WebKit, Bugzilla WebKit, MDN browser-compat-data, RFC 8030) e da thread di sviluppatori 2023-2026. Punti fermi: (1) Web Push solo per web app aggiunte alla Home Screen da iOS/iPadOS 16.4 (marzo 2023), con manifest display standalone o fullscreen, richiesta di permesso dentro un gesto utente, MAI in una scheda Safari su iOS (confermato da ingegnere Apple su Bugzilla 264074, nov 2023); (2) iOS 17 non cambia i requisiti, aggiunge suono di default ON su iOS e NotificationOptions.silent; iOS 17.5 corregge push non mostrati quando la web app non era in esecuzione; iOS 18.4 introduce Declarative Web Push (JSON con web_push: 8030, notification{title, navigate obbligatori, body, lang, dir, silent, app_badge}, mutable opzionale), senza service worker, disponibile solo per web app in Home Screen su iOS (Safari 18.5 lo estende alle schede solo su macOS); iOS 26 / Safari 26.0-26.5 non portano NESSUNA voce su push o notifiche nelle release notes: le novita sono che ogni sito aggiunto alla Home apre come web app anche senza manifest (toggle Open as Web App) e il Web Inspector puo mettere in pausa i service worker ai nuovi eventi; (3) Notification Triggers, Background Sync, Periodic Background Sync e Background Fetch sono assenti su Safari/iOS (BCD version_added false; Chrome stesso ha abbandonato Notification Triggers); silent push vietati: WebKit conta i push senza showNotification entro 30 secondi e alla terza occorrenza (maxSilentPushCount = 3 nel sorgente) rimuove TUTTE le sottoscrizioni dell'origine; per i messaggi dichiarativi il conteggio non parte; (4) APNs (web.push.apple.com e il servizio push di Apple) conserva un messaggio non consegnabile fino a 30 giorni o meno secondo TTL, onora Urgency e Topic, tiene un solo messaggio in coda per app; le sottoscrizioni vengono cancellate al riavvio di webpushd se la web app e stata rimossa dalla Home; pushsubscriptionchange NON viene mai emesso su iOS (ingegnere Apple, mag 2024) e expirationTime e null, quindi la perdita della sottoscrizione si scopre solo lato server (410) o con getSubscription() alla riapertura; segnalazioni ripetute 2023-2026 di sottoscrizioni che spariscono; (5) suono: default di sistema, ON per convenzione iOS, non personalizzabile (Apple in forum ago 2023), silent: true lo spegne; badge via setAppBadge o app_badge dichiarativo, visibile solo con permesso notifiche, toggle Badge in Impostazioni > Notifiche; (6) tocco: la web app si apre in standalone; con service worker classico serve notificationclick + clients.openWindow, con storia di bug (Bugzilla 252544 fixed 2023, 268797 ancora NEW ad ago 2026 con notificationclick che non spara a web app chiusa su iOS 16.4-18.7, forum su openWindow che apre la root); con Declarative il browser naviga a navigate senza service worker; stato pagina non garantito; (7) affidabilita: reportistica costante di notifiche che arrivano 1-2 volte e poi smettono, tipicamente per silent push penalty (FCM senza waitUntil) o per revoca lato Web.app corretta in 17.5; nessuna fonte Apple descrive ritardi sistematici, ma il doc APNs avverte che priorita 5/1 possono essere raggruppate o non consegnate secondo lo stato energetico; (8) permesso: voce per web app in Impostazioni > Notifiche come qualsiasi app (con Suoni e Badge da iOS 16.6/17 secondo utenti), revoca da li o rimuovendo la web app.

## Reperti

### 1. (1) Web Push per web app in Home Screen arriva con iOS/iPadOS 16.4: il sito deve avere un manifest con display standalone o fullscreen; la richiesta di permesso deve avvenire in risposta a un gesto diretto dell'utente (es. tap su un bottone subscribe); le notifiche appaiono su Lock Screen, Notification Center e Apple Watch abbinato, si integrano con Focus e si gestiscono per web app in Impostazioni > Notifiche.

- Confidenza: alta
- Fonte: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (2023-02-16)
- Nota: Fonte primaria WebKit. Citazioni: 'manifest file (with its display member set to standalone or fullscreen)'; 'request is in response to direct user interaction'; 'Users can then manage those permissions per web app in Notifications Settings — just like any other app.' Il post non parla di HTTPS: il requisito HTTPS discende dal contesto sicuro richiesto da Service Worker e Push API (W3C).

### 2. (1) Apple Developer docs: 'Add web push to Home Screen web apps in iOS 16.4 or later and Webpages in Safari 16 for macOS 13 or later'; il permesso va chiesto dentro il gesto: 'call the push subscription method immediately from the gesture's event handler code'; non serve il Developer Program; 'Safari doesn't support invisible push notifications. Present push notifications to the user immediately after your service worker receives them. If you don't, Safari revokes the push notification permission for your site.'

- Confidenza: alta
- Fonte: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers (non datata)
- Nota: Pagina Apple senza data visibile. Riporta anche: 'Users can configure badging permissions for your Home Screen web app in Notifications settings in iOS 16.4 or later.'

### 3. (1)(2) Web Push e Notification API NON sono disponibili in Safari su iOS (scheda browser), solo nella web app in Home Screen: ingegnere Apple su Bugzilla: 'As far as I can tell, neither is expected to be enabled in iOS Safari' (6 nov 2023), bug chiuso INVALID perche il comportamento e atteso.

- Confidenza: alta
- Fonte: https://bugs.webkit.org/show_bug.cgi?id=264074 (2023-11-01)
- Nota: Conferma primaria, valida per iOS 17; nessuna release note fino a Safari 26.5 (mag 2026) dichiara un cambiamento. MDN BCD: Notification su safari_ios 16.4 con nota 'The Notification interface is undefined, unless the page is a web app saved to the home screen. The app's manifest must have a non-default display value.'

### 4. (2) iOS 17 / WWDC23: 'If you want your site to be able to use Web Push and badging on iOS, then you should use the standalone display mode'; Add to Home Screen disponibile anche da Safari View Controller e browser terzi; suono: 'sound is on by default on iOS and iPadOS, and sound is off by default on macOS. To override the platform default, explicitly specify a silent value'; il permesso notifiche include il badging.

- Confidenza: alta
- Fonte: https://developer.apple.com/videos/play/wwdc2023/10120/ (2023-06 (WWDC23))
- Nota: Safari 17 release notes (18 set 2023): 'Added support for Notification alert sounds. (107424158)', 'Fixed passing NotificationOptions.silent', 'Fixed Notifications API to default silent to the platform convention', 'Fixed Web Push notifications not working in some cases by running the service worker before firing the activate event' (https://developer.apple.com/documentation/safari-release-notes/safari-17-release-notes).

### 5. (2)(7) Safari/iOS 17.5 (13 mag 2024): 'Fixed several issues that caused Web Push to not show notifications when the web app or Safari was not already running. (124075358)'. Ingegnere Apple su Bugzilla 273063 (9 mag 2024): i bug erano in Web.app, che gestiva il push ma 'tell WebKit that the website didn't have permissions anymore, which would then result in the subscription being deleted'.

- Confidenza: alta
- Fonte: https://developer.apple.com/documentation/safari-release-notes/safari-17_5-release-notes (2024-05-13)
- Nota: Bugzilla 273063 'iOS service worker - webPush subscription becomes invalid for few users', aperto 22 apr 2024, stato NEW; un utente (30 lug 2024) ha dovuto risottoscrivere dopo 17.6.

### 6. (2) Safari 18.2 (11 dic 2024): 'Fixed pushManager.subscribe returning an empty endpoint. (138489579)'. Safari 18.0, 18.1, 18.3: nessuna voce su push o notifiche.

- Confidenza: alta
- Fonte: https://developer.apple.com/documentation/safari-release-notes/safari-18_2-release-notes (2024-12-11)

### 7. (2) Declarative Web Push: introdotto in Safari 18.4; 'now available on iOS and iPadOS 18.4 for web apps added to the Home Screen'. Release note 18.4 (31 mar 2025): 'Added support for Declarative Web Push. (141082392)'. Safari 18.5 (12 mag 2025): 'Added support for Declarative Web Push on macOS. (148109003)'.

- Confidenza: alta
- Fonte: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ (2025-03-31)
- Nota: Su iOS resta confinato alle web app in Home Screen; sul Mac vale anche nelle schede Safari (WWDC25: 'Give it a shot in Safari 18.5 and later on macOS, or web apps saved to the home screen on iOS 18.4 and iPadOS 18.4 and later').

### 8. (2) Formato Declarative Web Push: JSON con chiave obbligatoria web_push: 8030 e oggetto notification; in notification sono obbligatori title e navigate (URL aperto al tocco), opzionali lang, dir, body, silent, app_badge; esempio ufficiale: {"web_push": 8030, "notification": {"title": "...", "lang": "en-US", "dir": "ltr", "body": "...", "navigate": "https://...", "silent": false, "app_badge": "1"}}. Non richiede service worker: 'request a Web Push subscription and display user visible notifications without requiring an installed service worker'. Se un service worker e installato riceve comunque un push event; 'If the event handler fails to display a replacement notification in time, the fallback is used' e 'there is no penalty for service workers failing to display a notification; the declarative push message itself is used as a fallback'. Browser vecchi: 'it's handled imperatively by JavaScript as it always had been'.

- Confidenza: alta
- Fonte: https://webkit.org/blog/16535/meet-declarative-web-push/ (2025-03-27)
- Nota: WWDC25 sessione 235 aggiunge il membro mutable: true per far trasformare la notifica dal service worker prima della visualizzazione. La bozza W3C Push API (w3c.github.io/push-api) ha assorbito la sezione 'Declarative push message' con web_push=8030, title, navigate, mutable; il Working Draft del 1 dic 2025 e citato da fonte secondaria (aimtell.com, 2026).

### 9. (2)(3) Nel sorgente WebKit i messaggi dichiarativi sono esentati dal conteggio silent push: commit 'Don't do silent push tracking for declarative push messages' (7 feb 2025, bug 287296); in WebPushDaemon.mm: 'Declarative push messages can never result in a silent push timeout, so don't push them onto the m_potentialSilentPushes queue.'

- Confidenza: alta
- Fonte: https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg226060.html (2025-02-07)
- Nota: Sorgente: https://github.com/WebKit/WebKit/blob/main/Source/WebKit/webpushd/WebPushDaemon.mm (main, letto set 2026). Lo stesso file: platformShouldPlaySound() legge il campo silent; app_badge viene passato a setAppBadge().

### 10. (2) iOS 26 / Safari 26.0 (15 set 2025): 'By default, every website added to the Home Screen opens as a web app'; l'utente puo disattivare 'Open as Web App'; 'there are now zero requirements for installability in Safari'; release note: 'Added support for any website to become a web app on iOS or iPadOS. (113034903)'. Web Inspector: 'Automatically Inspect New Service Workers' e 'Automatically Pause New Service Workers'. NESSUNA voce su Web Push, Declarative Web Push, notifiche o badging in Safari 26.0.

- Confidenza: alta
- Fonte: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ (2025-09-15)
- Nota: Release notes ufficiali: https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes (15 set 2025).

### 11. (2) Safari 26.1 (3 nov 2025), 26.2 (12 dic 2025), 26.3 (11 feb 2026), 26.4 (24 mar 2026), 26.5 (11 mag 2026): nessuna voce che menzioni Web Push, Declarative Web Push, push, notifiche o badging. Uniche voci contigue in 26.2: 'Fixed an issue where an audio element failed to play when re-opening a Home Screen Web App. (155336513)' e 'Added asynchronous URL error handling for Service Workers. (157769176)'.

- Confidenza: alta
- Fonte: https://developer.apple.com/documentation/safari-release-notes/safari-26_5-release-notes (2026-05-11)
- Nota: Perimetro della sonda: i cinque documenti di release notes 26.1-26.5 letti per intero via il JSON di developer.apple.com. Non ho trovato release notes 26.6 o successive.

### 12. (3) Background Sync (SyncManager), Periodic Background Sync (PeriodicSyncManager) e Background Fetch (BackgroundFetchManager): MDN browser-compat-data riporta version_added: false per safari e safari_ios (Chrome rispettivamente 49, 80, 74).

- Confidenza: alta
- Fonte: https://github.com/mdn/browser-compat-data/blob/main/api/PeriodicSyncManager.json (non datata (ramo main, letto 2026-09-03))
- Nota: File gemelli api/SyncManager.json e api/BackgroundFetchManager.json. WebKit standards-positions: Background Sync (issue 14, giu 2022) e Background Fetch (issue 149, mar 2023) restano in 'Needs position' con etichette 'concerns: power' e 'concerns: privacy'; la frase 'oppose' su Periodic Background Sync circola in fonti secondarie ma non l'ho trovata in una issue WebKit: bassa confidenza su quella etichetta.

### 13. (3) Notification Triggers / TimestampTrigger (showTrigger) non esiste in Safari e nemmeno Chrome l'ha portato a regime: 'The development of Notification Triggers API, part of Google's capabilities project, has ended. It wasn't clear that we could provide consistent and reliable experiences across platforms.' Chrome Status: 'In developer trial (Behind a flag)', origin trial concluso, 'Safari: No signal'.

- Confidenza: alta
- Fonte: https://developer.chrome.com/docs/web-platform/notification-triggers (2019-10-24 (ultimo aggiornamento dichiarato; stato 'No longer pursuing'))
- Nota: Chrome Status feature 5133150283890688, aggiornato 13 set 2022. Nessuna voce showTrigger in api/Notification.json di BCD.

### 14. (3) Silent push: regola dei tre strike ESISTE e ha fonte Apple. WWDC22 'Meet Web Push for Safari': 'after three push events where you fail to post a notification in a timely manner, your site's push subscription will be revoked. You will need to go through the permission workflow again.' WebKit blog 'Meet Web Push' (7 giu 2022): 'Violations of the userVisibleOnly promise will result in a push subscription being revoked.'

- Confidenza: alta
- Fonte: https://developer.apple.com/videos/play/wwdc2022/10098/ (2022-06 (WWDC22))
- Nota: https://webkit.org/blog/12945/meet-web-push/ (2022-06-07). La frase nel video e riferita alla beta di macOS Ventura; il sorgente WebKit conferma che il meccanismo e vivo e vale anche su iOS (voce successiva).

### 15. (3) Sorgente WebKit (main, set 2026): 'constexpr unsigned maxSilentPushCount = 3;' con commento 'If an origin processes more than this many silent pushes, then it will be unsubscribed from push.' PushService.mm: 'Removing all subscriptions associated with %{public}s %{sensitive}s since it processed %u silent pushes'. Il timer che aspetta showNotification e di 30 secondi: commit 'Add getPendingPushMessage IPC to webpushd' (8 lug 2024): 'a 30 second timer waiting for the client to call showNotification', allo scadere si incrementa il silent push count. Changeset 290815 'Enforce silent push quota' (3 mar 2022): 'A push subscription can process up to three silent pushes. After three silent pushes, we remove the push subscription.'

- Confidenza: alta
- Fonte: https://github.com/WebKit/WebKit/blob/main/Source/WebKit/Shared/WebPushDaemonConstants.h (non datata (ramo main, letto 2026-09-03))
- Nota: Altre sedi: https://github.com/WebKit/WebKit/blob/main/Source/WebKit/webpushd/PushService.mm ; https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg216505.html ; https://trac.webkit.org/timeline?from=2022-03-04T22%3A48%3A28-08%3A00&precision=second . Un'origine ispezionata da Web Inspector non incrementa il contatore ('but not incrementing silent push count since it is being inspected'): il collaudo con inspector attaccato NON esercita la penalita.

### 16. (3)(7) Il caso tipico di perdita della sottoscrizione dopo pochi push e la mancanza di event.waitUntil(showNotification(...)) nel push handler (es. Firebase SDK): 'iOS push subscriptions appear to be automatically terminated after 3 push notifications'; fix: avvolgere showNotification in e.waitUntil.

- Confidenza: media
- Fonte: https://dev.to/progressier/how-to-fix-ios-push-subscriptions-being-terminated-after-3-notifications-39a7 (2023-06-30 (agg. 2024-01-18))
- Nota: Fonte secondaria coerente col sorgente WebKit. Issue firebase/firebase-js-sdk #8010 'iOS Web Push Device Unregisters Spontaneously' (5 feb 2024) aperta e senza risoluzione, con la stessa ipotesi.

### 17. (4) Store-and-forward e TTL: Apple docs Web Push: header TTL 'The number of seconds before your message expires. If the push service can't deliver a notification immediately, it may store the notification for 30 days or fewer, depending on the value you specify'; Urgency 'very-low, low, normal, high' con 'To attempt to deliver the notification immediately, specify high'; Topic 'Optional identifier that the push service uses to coalesce notifications' (max 32 caratteri); risposte 201 Success, 403 auth, 404 path, 410 'The device token has expired'; il JWT VAPID non va rinnovato piu di una volta l'ora e la scadenza non oltre un giorno; consentire https://*.push.apple.com.

- Confidenza: alta
- Fonte: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers (non datata)
- Nota: Il TTL del Web Push e quindi onorato come limite superiore, in linea con RFC 8030 sez. 5.2 (dic 2016): il servizio 'MAY retain a push message for a shorter duration than requested' e un TTL zero 'expires and is never delivered' se lo user agent e offline (https://www.rfc-editor.org/rfc/rfc8030).

### 18. (4) APNs nativo (stessa infrastruttura): 'If APNs can't deliver a notification immediately, it may store the notification for 30 days or less, depending on the date you specify in the apns-expiration header'; 'APNs stores only one notification per bundle ID ... In most cases, the latest notification is stored'; 'Notifications with apns-priority 5 and apns-priority 1 might get grouped and delivered in bursts ... Your notifications may also get throttled, saved in storage, and in some cases, not delivered. The way a person interacts with your app and the power state of the device determines the exact behavior.'

- Confidenza: media
- Fonte: https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns (non datata)
- Nota: Fonte primaria ma relativa ad APNs nativo: la mappatura esatta Urgency -> apns-priority e 'un solo messaggio conservato per web app' per il Web Push non e documentata da Apple. Telefono offline al momento del push: il messaggio resta in coda entro TTL, ma se ne arrivano piu di uno per la stessa app e plausibile ne sopravviva uno solo.

### 19. (4) pushsubscriptionchange NON viene emesso su iOS: ingegnere Apple (Ben Nham, 9 mag 2024): 'We don't fire PushSubscriptionChangeEvent, and the last time I checked (which was admittedly several years ago), no other browsers did either.' MDN BCD: pushsubscriptionchange_event safari_ios version_added false (safari desktop 16).

- Confidenza: alta
- Fonte: https://bugs.webkit.org/show_bug.cgi?format=multiple&id=273063 (2024-05-09)
- Nota: BCD: https://github.com/mdn/browser-compat-data/blob/main/api/ServiceWorkerGlobalScope.json . Conseguenza: la rotazione o perdita della sottoscrizione va scoperta con getSubscription() a ogni apertura della web app e con il 410 lato server. expirationTime: BCD la dichiara supportata su safari_ios 16.4 ma gli sviluppatori riportano valore null (forum Apple 727372, mar 2023: 'There is no expirationTime included on the subscription object').

### 20. (4) PWA rimossa dalla Home: WebKit cancella le sottoscrizioni orfane all'avvio del demone: commit 'Remove subscriptions associated with uninstalled web clips at webpushd startup time' (14 ago 2024): 'every web push subscription must be associated with a web clip'; PushService.mm: 'No web clip matching push subscription set identifier %{public}s; removing'. Il server ricevera poi 410.

- Confidenza: alta
- Fonte: https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg218006.html (2024-08-14)
- Nota: Il momento esatto (immediato o al prossimo avvio di webpushd) non e documentato per l'utente: la pulizia e 'at webpushd startup time'.

### 21. (4) Focus / Non disturbare: le notifiche delle web app 'integrate with Focus, allowing users to precisely configure when or where to receive them' (WebKit 16.4). Caso documentato: sviluppatore su iOS 18.0 vedeva il push event non scattare; 'turns out the testphone with iOS 18 was set to Do not disturb. Case closed.' (dic 2024).

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/770749 (2024-12)
- Nota: WebKit 16.4: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/ (27 mar 2023). Il thread e aneddotico e non distingue fra notifica silenziata e push non recapitato al service worker.

### 22. (4) Low Power Mode: la pagina Apple di supporto (3 dic 2025) elenca cio che viene ridotto o spento ('Background app refresh: turned off', 'Email fetch: turned off', 5G, refresh 60 Hz ecc.) e NON menziona le notifiche push. Nessuna fonte Apple documenta un effetto specifico su Web Push.

- Confidenza: media
- Fonte: https://support.apple.com/en-us/101604 (2025-12-03)
- Nota: Il doc APNs avverte solo che priorita bassa e stato energetico possono raggruppare o non consegnare; con Urgency high la consegna immediata e 'attempted', non garantita.

### 23. (5) Suono: la notifica di una web app riproduce il suono di sistema di default; non e personalizzabile. Risposta Apple (ago 2023): 'The web standards for Notification options don't include a way to specify a custom sound.' Suono ON per default su iOS (WWDC23); silent: true lo spegne; BCD: Notification.silent safari 16.6, safari_ios false (dato BCD in conflitto con Safari 17 release notes e WWDC23: bassa affidabilita della voce BCD).

- Confidenza: alta
- Fonte: https://developer.apple.com/forums/thread/736399 (2023-08)
- Nota: Apple Community 254759442: su iOS 16.4 la voce Suoni mancava e 'notifications do arrive, they are always silent' (2 apr 2023); 'Turns out that it works on iOS 16.6' (19 ago 2023); su iOS 17 dopo rimozione e re-aggiunta 'Sound + vibration now works perfectly fine!' (22 set 2023). Vibrate, actions, image, requireInteraction: BCD false su Safari/iOS; forum Apple 726793 (mar 2023 - nov 2024): i bottoni azione sono ignorati, appare solo 'View'.

### 24. (5) Badge: 'In iOS and iPadOS 16.4, the Badging API is available exclusively for web apps the user has added to their home screen'; 'the badge will only appear if the user has granted notifications permission'; setAppBadge/clearAppBadge funzionano anche nel push handler; cross-origin frames senza effetto. Il Declarative Web Push aggiorna il badge col campo app_badge.

- Confidenza: alta
- Fonte: https://webkit.org/blog/14112/badging-for-home-screen-web-apps/ (2023-04-25)

### 25. (6) Tocco della notifica, service worker classico: notificationclick nel service worker; clients.openWindow lancia la web app in standalone se chiusa; se la web app e in background 'it opens the page that the client was previously on as-is, without loading anything new', se chiusa 'the PWA root web URL loads' invece dell'URL richiesto (iOS 17.1-18.1); workaround riportato (mar 2024): event.preventDefault(), matchAll + client.navigate(url) + focus(), openWindow solo come fallback.

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/733604 (2023-07 / 2024-03 / 2024-11)
- Nota: Bugzilla 259212 'clients.openWindow() not opening PWA home screen on iOS and macOS' (lug 2023) chiuso CONFIGURATION CHANGED perche il reporter era su localhost: su https funzionava. Bugzilla 252544 (feb 2023, FIXED apr 2023): il WindowClient iniziale di una web app lanciata da notificationclick era inerte per un breve periodo (postMessage/focus/navigate fallivano).

### 26. (6)(7) Bugzilla 268797 'notificationclick events in serviceworkers not firing' (aperto 5 feb 2024, stato NEW, P2 Major): con la web app CHIUSA il push si mostra ma notificationclick e notificationclose non scattano su iOS 16.4-18.7; Ben Nham (10 set 2024) ha separato due race in matchAll() e openWindow() (bug 279181, 279263); commento di ago 2026 riporta il problema ancora presente su iOS 18.7 con ServiceWorkerThread::queueTaskToFireNotificationEvent mai eseguito senza pagina viva.

- Confidenza: alta
- Fonte: https://bugs.webkit.org/show_bug.cgi?format=multiple&id=268797 (2024-02-05 (ultimo commento 2026-08))
- Nota: Per il Declarative Web Push il tocco NON passa da notificationclick: 'a URL that will be navigated to by the browser upon activation' (WebKit 16535) e l'explainer WebKit dice che l'attivazione 'navigate the user agent to HTTP URLs', bypassando i handler (https://github.com/WebKit/explainers/blob/main/DeclarativeWebPush/README.md, non datato). Forum 742877 (dic 2023): dopo openWindow da notifica Notification.permission risulta 'default' anziche 'granted' su iOS 16.7.2/17.1.2.

### 27. (7) Segnalazioni ricorrenti di push persi: forum Apple 728796 'PWA PUSH NOTIFICATION ISSUES IOS 16.4+' (apr 2023, 18 risposte, 12k visite: 'work perfectly on Android but don't reach ios users'); 765585 (ott 2024): 'with latest webpush and ios 17.x or 18.x 1-2 notification arrived but if iphone will be standby or webapp closed the service worker not receive notification' (FCM, 0 risposte); 786360 (giu 2025): token che scadono 'seemingly almost daily in some cases' senza avviso al server (0 risposte); Discourse Meta 274806 (ago 2023 - nov 2025): 'they work for one day, only to find out the next day they're gone', reinstallare la PWA risolve temporaneamente; MacRumors (feb-giu 2025): utenti senza notifiche o costretti a reinstallare, staff dice che le 'idiosyncrasies' sono 'fixed in iOS 18' senza dettagliare.

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/765585 (2024-10)
- Nota: Altri URL: https://developer.apple.com/forums/thread/728796?page=2 ; https://developer.apple.com/forums/thread/786360 ; https://meta.discourse.org/t/not-getting-ios-pwa-push-notifications/274806 ; https://forums.macrumors.com/threads/macrumors-pwa-web-app-with-push-notifications.2448775/ . Nessuno di questi thread ha una risposta Apple; le cause plausibili documentate sono la silent push penalty (FCM senza waitUntil) e il bug Web.app corretto in 17.5. Non ho trovato bug WebKit 2025-2026 che documentino ritardi sistematici di consegna su iOS 18/26 per Web Push.

### 28. (7) Bugzilla 273063: sottoscrizione che diventa invalida per alcuni utenti (getSubscription() restituisce null subito dopo aver ricevuto un push); forum 727372 (feb 2024): 'sometimes it reports null, indicating that the push subscription which was just used to receive a message is now no longer active'.

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/727372 (2023-03 / 2024-02)

### 29. (8) Permesso notifiche: la web app compare come voce propria in Impostazioni > Notifiche 'just like any other app' (WebKit 16.4/13878); Apple support (6 apr 2026): 'Go to Settings. Tap Notifications. Under Notification Style, tap the app you want to edit notifications for', con toggle Suoni ('Tap Sounds to turn on audio alerts for a specific app') e Badge; su iOS 18 le app stanno anche sotto Impostazioni > App. La revoca si fa da li o rimuovendo la web app dalla Home (che cancella la sottoscrizione lato webpushd).

- Confidenza: alta
- Fonte: https://support.apple.com/en-us/108781 (2026-04-06)
- Nota: Il doc Apple e generico sulle app; che la voce della web app porti Suoni e Badge e confermato da utenti (Apple Community 254759442, 2023) e da Apple docs per il badge. Su iOS 16.4 esisteva un toggle sperimentale Impostazioni > Safari > Avanzate > Funzioni sperimentali > Notifications (fonte secondaria monogram.io, 1 mag 2024): non e piu citato da Apple per iOS 17+.

### 30. (1) UE: il 1 mar 2024 Apple ha annullato la rimozione delle web app in Home Screen per iOS 17.4 nell'UE: 'we will continue to offer the existing Home Screen web apps capability in the EU', 'built directly on WebKit and its security architecture'. Le web app UE restano su WebKit e possono inviare notifiche; fonti secondarie 2026 che dicono 'push notifications don't work (iOS 17.4, EU only)' sono superate.

- Confidenza: media
- Fonte: https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/ (2024-03-01)
- Nota: Secondaria che cita la dichiarazione Apple; la pagina Apple DMA (developer.apple.com/support/dma-and-apps-in-the-eu/) oggi non contiene piu una sezione sulle web app. Rilevante perche il pilota e in Italia.

### 31. (2) iOS 26 apre come web app anche siti senza manifest; se Push API e Notification siano disponibili in una web app SENZA manifest (o senza display standalone) non e documentato da Apple: la nota BCD dice ancora che serve un display non di default e fonti secondarie 2026 sostengono che senza display standalone registration.pushManager e undefined.

- Confidenza: bassa
- Fonte: https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/ (2025-06 (WWDC25))
- Nota: Da verificare sul telefono; PharmaTimer ha comunque un manifest con display standalone, quindi il caso non la tocca se il manifest resta.

## Incognite

- Timing reale del silent-push timer su iOS con schermo bloccato: i 30 secondi del sorgente decorrono da quando il push arriva al demone; se il service worker viene sospeso prima di showNotification, il push conta come silent? Solo una prova con 3+ push a telefono bloccato e app chiusa lo dice.
- Se un push classico (service worker) e uno dichiarativo si comportino allo stesso modo su iOS 26.x rispetto a consegna a schermo bloccato e a Focus attivo: nessuna fonte Apple lo confronta.
- Se la web app riceve il push quando e stata 'chiusa' dall'app switcher: le fonti dicono che il service worker viene avviato dal demone anche senza pagina viva (fix 17.5), ma i thread 2024-2026 riportano ancora casi in cui non arriva nulla. Da misurare con conteggio inviati/ricevuti su piu giorni.
- Se notificationclick scatta con la web app chiusa su iOS 18.7/26.x (Bugzilla 268797 ancora NEW ad ago 2026) e se clients.openWindow(url) apre l'URL richiesto o la root; se lo stato della pagina (IndexedDB si, ma stato React in memoria) sopravvive al riapertura.
- Con il Declarative Web Push, se il tocco su navigate riusa la finestra standalone esistente o ne apre una nuova, e se app_badge viene azzerato all'apertura.
- Quanti messaggi conserva il servizio push Apple per una web app offline: il doc APNs nativo dice uno per bundle ID, il doc Web Push parla solo di TTL fino a 30 giorni. Prova: telefono in modalita aereo, 3 push con TTL lungo, riaccensione, contare cosa arriva e in che ordine.
- Se Urgency: high cambia qualcosa nella latenza a telefono bloccato e in Low Power Mode rispetto a normal.
- Frequenza reale di rotazione/perdita della sottoscrizione su iOS 26.x per una web app aperta ogni giorno: senza pushsubscriptionchange serve un getSubscription() a ogni avvio e un confronto endpoint con il server, loggato per settimane.
- Se il suono di default e la vibrazione suonano davvero per la web app con iPhone in modalita silenziosa/suoneria e quale suono e (tri-tone di sistema); se la voce Suoni compare in Impostazioni > Notifiche > PharmaTimer su iOS 26.
- Se Focus e Riepilogo programmato (Scheduled Summary) offrono per la web app le stesse opzioni delle app native (Consegna immediata, Time Sensitive non disponibile al web) e cosa fa la notifica arrivata durante un Focus: sospesa o consegnata in silenzio.
- Se su iOS 26 una web app aggiunta senza manifest o con display browser espone Notification e PushManager (nessuna fonte primaria).
- Se Web Inspector attaccato altera il comportamento (il sorgente non incrementa il silent push count per origini ispezionate): il collaudo va ripetuto SENZA inspector.
- Se la rimozione della web app dalla Home produce il 410 subito o solo al successivo riavvio del demone/telefono.
