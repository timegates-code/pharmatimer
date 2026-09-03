# web:click_e_rete -- dopo la consegna: tocco, tailnet, SW

Fase: Misura. Agente `a7ab0bc0ac94b01eb`, esito: completato. Resa leggibile generata meccanicamente da `09-web-click-e-rete.json`, che e il risultato restituito dall'agente cosi come registrato nel journal del workflow: contenuto invariato, solo forma.

## Sintesi

Ricerca su cosa accade dopo la consegna del push e su come il client decide cosa mostrare, per PWA servita da https://marketreader-server.taila127de.ts.net (Mini raggiungibile solo in tailnet). Contesto repo misurato (sola lettura): il SW e generato da vite-plugin-pwa in strategia generateSW (vite.config.js: "Service worker is auto-generated (generateSW strategy)", LOCKED), nessuna sede in src/ o backend/ contiene pushManager, showNotification, notificationclick o VAPID (sonda grep su src, backend/pharmatimer_api, public, scripts, deploy, docs; unici hit: src/pwa/registerSW.js e scripts/audit/inventario.py, nessuno dei due e codice push); le notifiche odierne sono di pagina, in src/services/notifications.js: setTimeout -> new globalThis.Notification(title, { body, tag: entryKey }) con onclick che fa window.focus() e window.location.href = '/oggi'. Il Mini serve TLS con tailscale serve --bg --https=443 (commit 3845cf1, Changelog archiviato: "tailscale serve --bg --https=443 Mini-side persistente Let-s Encrypt cert valid 27-May-2026 -> 25-Aug-2026"), uvicorn su 0.0.0.0:8000 dietro (deploy/launchd/api-wrapper.sh). Sintesi per punto. (1) Tailscale iOS: il client installa da solo una policy VPN On Demand "ampia" finche Tailscale e abilitato, pensata per tenere su il tunnel dopo riavvio, auto-update o crash; la policy sparisce se l'utente disattiva Tailscale; regole personalizzate la sostituiscono; il tunnel resta su in background e non esiste auto-disconnect su inattivita (issue aperta 2025), ma la network extension puo essere uccisa da iOS per memoria e ci sono segnalazioni storiche di cadute quotidiane; riattivazione: aprire l'app o il toggle VPN in Impostazioni. Il push NON dipende dal VPN: APNs parla con il telefono su 17.0.0.0/8 porta 5223 e Tailscale senza exit node non tocca il traffico Internet pubblico; e il Mini che deve raggiungere https://web.push.apple.com (Internet pubblica, non tailnet) per inviare. (2) SW nell'evento push: si DEVE mostrare una notifica dentro waitUntil (Chrome mostra "This site has been updated in the background" se manca, WebKit revoca la subscription per violazione di userVisibleOnly); IndexedDB nel SW e nello standard, ma su iOS 18.1.1 e riportato indexedDB undefined quando il SW e svegliato da push (thread Apple aperto, nessuna risposta); fetch verso il Mini nel push e lecito ma con VPN giu fallisce: usare AbortSignal.timeout e mostrare COMUNQUE la notifica (Promise.race: testo arricchito se lo specchio/il Mini rispondono entro N secondi, testo base altrimenti; mai nessuna notifica). Limiti di tempo: Chrome termina un evento oltre 5 minuti di waitUntil e 30 s di JS sincrono; WebKit non documenta, un thread Apple misura circa 70 s su FetchEvent. Alternativa nativa Apple: Declarative Web Push (iOS 18.4+): payload JSON con notification + navigate + app_badge, mostrato dal sistema anche se il SW e morto, con campo mutable per farlo riscrivere da un handler pushnotification a tempo limitato; niente penalita silent-push; non supportato da Chromium. (3) notificationclick: pattern standard clients.matchAll({type:'window', includeUncontrolled:true}) -> client.focus() altrimenti clients.openWindow(url); i parametri passano con notification.data (Chrome) o con URL; su Chrome Android openWindow apre nella finestra standalone della PWA installata; su iOS BCD dichiara notificationclick_event NON supportato su safari_ios, il bug WebKit 268797 (aperto, NEW, testato fino a iOS 18.7) documenta che dal 18.0 il tap apre la PWA installata alla start_url senza passare per il handler custom e che openWindow/postMessage dal SW sono inaffidabili; il tap apre la web app installata, non Safari. (4) Azioni: su iOS le actions non sono supportate (BCD safari/safari_ios false; forum Apple: compare solo "View"); su Chrome Android si (dal 48/53). Un bottone "Presa" che scrive nella coda IndexedDB dal SW e fattibile solo su Android: il SW resta vivo finche waitUntil non si risolve; l'orario del tocco va congelato da Date.now() nel handler (M3) e la scrittura Dexie va completata dentro waitUntil prima di chiudere la notifica (M2); su iOS non esiste. (5) Origine: la subscription e legata alla registrazione SW, quindi a origine+scope; cambiare hostname (rinomina nodo o tailnet) cambia origine: nuova SW registration, nuova subscription, permessi, IndexedDB e icona Home da rifare; il cert Let's Encrypt via tailscale serve viene provisionato e rinnovato in automatico dal daemon (90 giorni; Let's Encrypt scende a 45 giorni entro feb 2028); con tailscale cert manuale il rinnovo e a carico dell'utente; a cert scaduto il SW installato non viene disinstallato, l'update fallisce come errore di rete e le navigazioni di rete falliscono; lo stato reale del rinnovo sul Mini (finestra 27-May -> 25-Aug-2026 gia passata) non e misurabile da qui. (6) Dedup: lo standard sostituisce le notifiche con stesso tag e stessa ORIGINE (non stessa registrazione), quindi una notifica di pagina e una del SW con lo stesso tag collidono su Chrome; renotify richiede tag; registration.getNotifications({tag}) + close() chiude le notifiche del SW; ma BCD dichiara tag senza effetto su Safari e non supportato su safari_ios, e renotify assente: su iPhone il dedup per tag non e affidabile. (7) Doppia notifica: su Chrome Android new Notification lancia sempre TypeError (BCD), quindi il timer di pagina odierno non produce notifiche li e il push sarebbe l'unica; su iOS home-screen il costruttore funziona ma il tag non fonde: coesistono due notifiche; via corretta e non emettere dalla pagina quando esiste una subscription push e decidere nel SW con matchAll se una finestra e focused (postMessage alla pagina invece di showNotification e comunque lecito SOLO su Chrome: su WebKit non mostrare = revoca).

## Reperti

### 1. Il client Tailscale per iOS configura da solo una policy VPN On Demand ampia finche Tailscale e abilitato, per tenere la VPN attiva dopo riavvio di sistema, auto-update, crash o altro evento che la disabiliti; la policy generata viene rimossa quando l'utente disattiva Tailscale; regole On Demand personalizzate dell'utente sostituiscono quella automatica. Opzioni Wi-Fi: Always, Only On, Except On, Never, Do Nothing; Cellular/Ethernet: Always, Never, Do Nothing. Si raggiunge da app -> profilo -> VPN On Demand. Supporto da Tailscale 1.48 su iOS.

- Confidenza: alta
- Fonte: https://tailscale.com/docs/features/client/ios-vpn-on-demand (Last validated Jan 5, 2026)
- Nota: Fonte primaria. Riattivazione manuale: aprire l'app Tailscale e usare il toggle, oppure Impostazioni iOS -> VPN. 'Do Nothing' e la scelta che lascia il tunnel come lo ha lasciato l'utente.

### 2. Con VPN On Demand attivo il tunnel iOS resta su in modo persistente in background (le query DNS continue soddisfano il trigger), con keepalive e cifratura continui; non esiste alcun auto-disconnect su inattivita (feature request aperta, etichette Feature Request / vpn-on-demand).

- Confidenza: media
- Fonte: https://github.com/tailscale/tailscale/issues/17157 (2025-09-16 (issue aperta))
- Nota: Fonte secondaria (issue utente, senza risposta del team nella pagina). Conferma pero che il tunnel non si spegne da solo per risparmio energetico lato Tailscale.

### 3. Segnalazioni storiche di disconnessioni quotidiane dell'app iOS dopo periodi di inattivita (notte), risolte solo riaprendo l'app; issue classificata P2/L3 e chiusa.

- Confidenza: bassa
- Fonte: https://github.com/tailscale/tailscale/issues/8183 (2023-05-21 (aperta; chiusa, data chiusura non visibile))
- Nota: Vecchia (iOS 16.4.1, Tailscale 1.40). Va trattata come rischio residuo, non come stato attuale.

### 4. La network extension di Tailscale su iOS lavora con un budget di memoria molto ridotto e puo essere terminata da iOS per memoria; il team ha dovuto ottimizzare il binario per starci.

- Confidenza: media
- Fonte: https://tailscale.com/blog/go-linker (non datata nella pagina (blog Tailscale, epoca 2023))
- Nota: Fonte primaria Tailscale ma vecchia. Conseguenza operativa: il tunnel puo cadere senza azione del paziente; la policy On Demand automatica e il meccanismo che lo rialza.

### 5. Di default Tailscale e una rete overlay: instrada solo il traffico fra dispositivi Tailscale e non tocca il traffico Internet pubblico; solo con un exit node si usano le default route 0.0.0.0/0 e ::/0 come in una VPN classica.

- Confidenza: alta
- Fonte: https://tailscale.com/kb/1103/exit-nodes (Last validated Dec 15, 2025)
- Nota: Implica che il canale APNs del telefono NON passa dal tunnel Tailscale (salvo exit node configurato sul telefono): il push arriva con VPN giu.

### 6. Per ricevere push i dispositivi Apple devono raggiungere APNs sul blocco 17.0.0.0/8 in TCP 5223 (fallback 443); i server che inviano usano TCP 443 o 2197; la 443 puo passare da proxy purche non decifri.

- Confidenza: alta
- Fonte: https://support.apple.com/en-us/102266 (2023-08-22)
- Nota: APNs e infrastruttura Apple su Internet pubblica: il Mini per INVIARE deve raggiungere https://web.push.apple.com (uscita Internet del Mini, non tailnet). Il telefono per RICEVERE deve raggiungere 17.0.0.0/8 fuori dal tunnel.

### 7. L'endpoint di subscription per Safari/iOS ha la forma https://web.push.apple.com/<token>; ogni vendor gestisce il proprio push service e il protocollo Web Push con VAPID e standard.

- Confidenza: media
- Fonte: https://github.com/andreinwald/webpush-ios-example (non datata)
- Nota: Fonte secondaria (repo demo). Coerente con la separazione push service (Internet) / app server (Mini).

### 8. WebKit: la Web Push API non e un invito al runtime silenzioso in background; bisogna impostare userVisibleOnly a true e mantenere la promessa mostrando sempre una notifica in risposta al push; le violazioni comportano la revoca della push subscription.

- Confidenza: alta
- Fonte: https://webkit.org/blog/12945/meet-web-push/ (2022-06-07)
- Nota: Fonte primaria WebKit (macOS Safari 16, stessa regola ereditata da iOS 16.4). Non e indicato il numero di violazioni tollerate. Conseguenza: nel push event su WebKit non si puo 'decidere di non mostrare' (es. dose gia presa): al massimo si cambia il testo.

### 9. Web Push su iOS/iPadOS 16.4 vale solo per web app aggiunte alla Home (display standalone o fullscreen); requestPermission richiede un gesto utente; le notifiche appaiono su Lock Screen, Notification Center e Apple Watch, rispettano i Focus; e disponibile il badge con setAppBadge; al tocco dell'icona la web app si apre come app, non nel browser.

- Confidenza: alta
- Fonte: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (2023-02-16)
- Nota: Fonte primaria. Il post non parla di actions, tag, silent push ne notificationclick.

### 10. Nel push event bisogna passare una promise a event.waitUntil e mostrare una notifica prima che si risolva; se la promise si risolve senza notifica visibile Chrome mostra la notifica generica 'This site has been updated in the background'.

- Confidenza: media
- Fonte: https://web.dev/articles/push-notifications-handling-messages (2016-06-30 (fonte vecchia, regola ancora in vigore))
- Nota: Dichiaro la fonte vecchia. Regola confermata da MDN PushManager.subscribe (userVisibleOnly obbligatorio in Chrome/Edge, aggiornato 2025-06-23).

### 11. Una PushSubscription si crea da serviceWorkerRegistration.pushManager.subscribe ed e legata alla registrazione del service worker e all'origine; userVisibleOnly: true e obbligatorio in Chrome/Edge e impegna a una notifica visibile per ogni messaggio.

- Confidenza: alta
- Fonte: https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe (2025-06-23)
- Nota: Cambiare hostname (nuovo FQDN ts.net) = nuova origine = nuova registrazione SW, nuova subscription da inviare al Mini, nuovo prompt permessi, IndexedDB/specchio vuoti, icona Home da reinstallare.

### 12. Chrome termina un service worker se un evento impiega piu di 5 minuti a risolversi (waitUntil) o se esegue JS sincrono senza rispondere a un ping entro 30 secondi.

- Confidenza: media
- Fonte: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/L3EbiNMjIGI/m/PkozVk-JBgAJ (non datata nella sintesi (thread chromium-extensions))
- Nota: Fonte secondaria (thread Chromium). Per il push event il budget pratico e ampio: un fetch verso il Mini con timeout di pochi secondi ci sta.

### 13. Su WebKit un FetchEvent.respondWith nel service worker viene terminato dopo circa 70 secondi (iPadOS 17.6.1 e 16.3), senza risposta Apple nel thread.

- Confidenza: bassa
- Fonte: https://developer.apple.com/forums/thread/764482 (2024-09 (thread))
- Nota: Misura di un utente su FetchEvent, non su PushEvent; WebKit non documenta il limite per il push. Tenere il lavoro nel push event sotto pochi secondi.

### 14. AbortSignal.timeout(ms) produce un segnale che abortisce con DOMException TimeoutError; disponibile nei worker; Baseline 2024; il timeout conta il tempo attivo e si sospende se il worker e sospeso.

- Confidenza: alta
- Fonte: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static (2026-09-01)
- Nota: Strumento per il fetch verso il Mini dentro il push event: fetch(url, { signal: AbortSignal.timeout(3000) }) dentro un Promise.race con la notifica base; con VPN giu il fetch fallisce (TypeError/TimeoutError) e si mostra il testo base. Mai far dipendere showNotification dall'esito del fetch.

### 15. Su iOS 18.1.1 il global indexedDB risulta undefined quando il service worker viene svegliato da un push (rompe la logica che legge lo storage nel push event); inoltre pushManager.getSubscription() torna null dopo riavvio dell'app con generazione di nuove subscription e duplicati; notifiche con 201 dal push service ma non mostrate; nessuna risposta Apple; thread aperto (post novembre 2024, risposte febbraio 2025).

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/769794 (2024-11 / 2025-02)
- Nota: Fonte secondaria ma specifica. Non ho trovato una fonte che dichiari il bug risolto in iOS 18.x o 26.x. Conseguenza: su iOS la lettura dello specchio Dexie dentro il push event va trattata come opportunistica (try/catch, fallback al testo base), mai come precondizione.

### 16. Declarative Web Push e disponibile su iOS/iPadOS 18.4 per web app in Home: payload JSON con 'web_push': 8030, oggetto notification (title, body, lang, dir, silent), 'navigate' obbligatorio (URL aperto all'attivazione), 'app_badge' opzionale; esiste window.pushManager senza service worker; con SW installato il browser dispatcha un PushEvent e se il handler mostra una notifica sostitutiva vince quella, se fallisce o va in timeout si usa il fallback; la notifica non modificata si mostra anche se il SW e stato rimosso; poiche c'e sempre una notifica visibile non si applicano le penalita silent-push.

- Confidenza: alta
- Fonte: https://webkit.org/blog/16535/meet-declarative-web-push/ (2025-03-27)
- Nota: Fonte primaria. Per PharmaTimer: il Mini puo inviare sia il payload dichiarativo (fail-safe: mostrato comunque) sia lasciare che il SW lo arricchisca se vivo. 'navigate' e la via ufficiale per passare parametri (URL con query) al tap su iOS.

### 17. Nell'explainer WebKit di Declarative Web Push il campo 'mutable' (default false) rende la notifica trasformabile da un handler 'pushnotification' del SW, che ha 'a small amount of runtime' per chiamare showNotification; se non ce la fa entro il timeout la piattaforma mostra la notifica JSON com'e; app_badge intero (0 cancella); 'actions' previste con action, title e url; i browser che non aggiornano ricevono comunque il push legacy.

- Confidenza: media
- Fonte: https://github.com/WebKit/explainers/tree/main/DeclarativeWebPush (non datata)
- Nota: Explainer, non doc di rilascio: se le actions dichiarative siano davvero rese su iOS non e verificato da alcuna fonte trovata.

### 18. Declarative Web Push e supportato solo da WebKit/Safari 18.4+; per Chromium esiste un issue tracker (382298314) senza indicazione di implementazione al 2026.

- Confidenza: bassa
- Fonte: https://pushpad.xyz/blog/declarative-web-push (non datata)
- Nota: Fonte secondaria; l'issue Chromium richiede login e non era leggibile. Su Android resta il push classico con SW.

### 19. Declarative Web Push e disponibile su iOS e iPadOS 18.4 per web app aggiunte alla Home; WebKit motiva la scelta con la complessita del SW obbligatorio e il fatto che le web app iOS non lo hanno mai richiesto.

- Confidenza: alta
- Fonte: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ (2025-03-31)
- Nota: Fonte primaria di rilascio.

### 20. Le note di rilascio WebKit per Safari 26.0 (2025-09-15), 26.2 (2025-12-12), 26.4 (2026-03-24), 26.5 (2026-05-11) e 26.6 (2026-07-27) non contengono novita su Web Push, notification actions, tag o notificationclick; 26.0 aggiunge l'ispezione automatica dei service worker in Web Inspector, 26.4 corregge un problema di encoding metadata IndexedDB, 26.6 corregge registrazioni SW mancanti.

- Confidenza: alta
- Fonte: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ (2025-09-15 (piu 26.2 2025-12-12, 26.4 2026-03-24, 26.5 2026-05-11, 26.6 2026-07-27))
- Nota: Perimetro: i cinque post citati letti con prompt mirato. Nessuna evidenza che iOS 26 abbia aggiunto actions o notificationclick affidabile.

### 21. Pattern standard di notificationclick: clients.matchAll({ type: 'window', includeUncontrolled: true }), se una finestra ha lo URL atteso -> client.focus(), altrimenti clients.openWindow(url); i dati si allegano con notification.data; se una finestra e gia in primo piano si puo fare client.postMessage invece di mostrare la notifica; registration.getNotifications() consente di trovare e fondere notifiche esistenti.

- Confidenza: alta
- Fonte: https://web.dev/articles/push-notifications-common-notification-patterns (non datata nella pagina (articolo web.dev))
- Nota: Il ramo 'postMessage invece di notifica' e lecito su Chrome (userVisibleOnly con finestra visibile) ma su WebKit ogni push senza notifica conta come violazione.

### 22. clients.openWindow richiede transient activation (in Firefox solo dentro notificationclick), risolve con WindowClient per URL same-origin e null per origine diversa; su Chrome per Android (e ora Windows) apre lo URL nel contesto esistente della web app standalone installata sulla Home.

- Confidenza: alta
- Fonte: https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow (2026-05-29)
- Nota: Su Android il tap porta nella PWA installata con la query desiderata.

### 23. MDN BCD: api.ServiceWorkerGlobalScope.notificationclick_event e notificationclose_event hanno version_added false per safari_ios (safari desktop 16 con nota macOS Ventura); push_event safari_ios 16.4 con nota 'Notifications are supported in web apps saved to the home screen'.

- Confidenza: alta
- Fonte: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ServiceWorkerGlobalScope.json (non datata (ramo main, letto 2026-09-03))
- Nota: Dato BCD, non misura empirica: dichiara che il handler notificationclick su iPhone non e un contratto su cui contare.

### 24. Bug WebKit 268797 'notificationclick events in serviceworkers not firing', stato NEW, iOS 16.4+ testato fino a iOS 18.7: i SW svegliati da APNs partono 'activated' senza install/activate; con la PWA chiusa non c'e modo affidabile di passare dati dalla notifica alla PWA; da iOS 17.6 notificationclick scatta solo con setTimeout di 3+ s prima di postMessage; da iOS 18.0 il tap apre la PWA di default anche senza handler; su iOS 18.7 il callback torna in 4-5 ms senza dispatch al worker (analisi: web clip identifier null quando non c'e pagina viva).

- Confidenza: alta
- Fonte: https://bugs.webkit.org/show_bug.cgi?format=multiple&id=268797 (2024-02-05 (aperto; commenti fino a iOS 18.7))
- Nota: Fonte primaria del tracker WebKit. Su iOS il tap apre la web app installata (non Safari) alla start_url o all'ultima pagina; lo stato 'quale dose' va ricostruito dalla pagina (specchio/coda + fetch al Mini), non dal parametro del click. Con Declarative Web Push il campo navigate e l'unica via documentata per uno URL specifico.

### 25. Su iOS il tap su notifica push apre la PWA senza navigare allo URL passato a clients.openWindow: se la PWA e in background riapre l'ultima pagina, se era chiusa carica la root; openWindow su Safari iOS/macOS non fa nulla e non lancia errori (2023); su iOS 17/18 notificationclick non scatta se la PWA non e aperta (2024), nessuna risposta Apple.

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/768448 (2024-11 (thread 768448); 2023-07 (thread 733538))
- Nota: Fonti secondarie (forum Apple), coerenti con il bug WebKit 268797. Thread 733538: https://developer.apple.com/forums/thread/733538

### 26. MDN BCD: showNotification safari_ios 16.4 (home screen web apps) e safari 16, ma le sotto-feature actions, renotify, requireInteraction e data risultano non supportate su Safari e Safari iOS; su Chrome Android actions dal 48, renotify dal 50, requireInteraction dal 47, data dal 44; getNotifications e pushManager safari_ios 16.4.

- Confidenza: alta
- Fonte: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ServiceWorkerRegistration.json (non datata (ramo main, letto 2026-09-03))
- Nota: Il 'data non supportato' in showNotification confligge con Notification.data safari_ios 16.4 nel file Notification.json: incongruenza BCD, da verificare a mano. Le actions su iOS sono assenti in entrambe le tabelle.

### 27. MDN BCD Notification.json: costruttore Notification() safari_ios 16.4 partial ('throws a ReferenceError unless the page is a web app saved to the home screen'); chrome_android 42 partial ('always throws a TypeError'); actions safari/safari_ios false, chrome_android 53; renotify safari/safari_ios false; tag safari false con nota 'can be set, but has no effect', safari_ios false, chrome_android 42; requireInteraction safari/safari_ios false; data safari_ios 16.4; close safari_ios 16.4.

- Confidenza: alta
- Fonte: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Notification.json (non datata (ramo main, letto 2026-09-03))
- Nota: Incrocio col repo: src/services/notifications.js fa new globalThis.Notification(title, { body, tag: entryKey }) dentro un setTimeout senza try/catch: su Chrome Android lancia TypeError, il callback si interrompe e onFire non viene chiamato; su iOS home-screen il costruttore funziona ma il tag non produce sostituzione. Rilievo dedotto da BCD piu lettura del sorgente, non esercitato da una sonda su dispositivo.

### 28. Forum Apple: su iOS 16.4 le notification actions definite in showNotification vengono ignorate, compare solo 'View'; nel notificationclick arrivava un evento con solo isTrusted, senza action ne notification; workaround usato: mettere lo URL nel tag; ultimo commento 2024-11-03: 'iOS is not supported yet' per notificationclick; nessuna risposta Apple.

- Confidenza: media
- Fonte: https://developer.apple.com/forums/thread/726793 (2023-03 .. 2024-11-03)
- Nota: Un bottone 'Presa' su iOS non esiste come opzione: le vie sicure sono il tap che apre la PWA oppure Declarative Web Push.

### 29. Standard Notifications: la sostituzione avviene se nella lista delle notifiche ne esiste una con lo stesso tag non vuoto e la cui ORIGINE e same origin (non la stessa registrazione SW); renotify true con tag vuoto lancia TypeError; getNotifications filtra per origine, per registrazione SW corrente e opzionalmente per tag; le notifiche non persistenti (costruttore) non hanno SW e non dovrebbero restare nel notification center, quelle persistenti (showNotification) si.

- Confidenza: alta
- Fonte: https://notifications.spec.whatwg.org/ (living standard, non datata nella lettura)
- Nota: Su Chrome una notifica di pagina e una del SW con lo stesso tag (es. entryKey) si sostituiscono a vicenda; getNotifications pero vede solo quelle della propria registrazione, quindi non puo chiudere quella di pagina. Su iOS il tag non ha effetto (BCD).

### 30. showNotification: tag raggruppa notifiche con lo stesso identificatore; renotify (default false) richiede tag e fa suonare/vibrare alla sostituzione; requireInteraction tiene la notifica finche l'utente non agisce; data e structured-clonable; timestamp per eventi non consegnati subito; actions con action, title, icon e navigate.

- Confidenza: alta
- Fonte: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification (2026-05-25)
- Nota: Con il tag una nuova notifica sostituisce la vecchia SENZA suono (web.dev notification-behaviour, non datata): utile per sostituire 'Ora la dose X' con 'Dose X registrata' senza disturbare; per una dose in ritardo serve renotify true (solo Chrome).

### 31. Con tailscale serve il traffico HTTPS usa un certificato TLS provisionato automaticamente e il daemon termina TLS; con --bg la configurazione persiste e riprende da sola dopo riavvio o restart di Tailscale; senza --bg va rilanciata a mano.

- Confidenza: alta
- Fonte: https://tailscale.com/kb/1242/tailscale-serve (Last validated Jan 26, 2026)
- Nota: Il Mini usa proprio 'tailscale serve --bg --https=443' (Changelog archiviato in commit 3845cf1).

### 32. I certificati Tailscale sono Let's Encrypt da 90 giorni via DNS-01 su *.ts.net; con Serve o Caddy il rinnovo e automatico senza intervento; con tailscale cert (file su disco) il rinnovo e a carico dell'utente; serve MagicDNS e HTTPS abilitati nel tailnet; il nome finisce nei CT log; un cert per nodo, niente wildcard, solo FQDN completo; se il nodo viene rinominato l'entry MagicDNS cambia ma il cert resta legato al vecchio nome; richieste troppo frequenti possono sforare i rate limit di Let's Encrypt.

- Confidenza: alta
- Fonte: https://tailscale.com/docs/how-to/set-up-https-certificates (2025-12-10)
- Nota: Con la configurazione attuale (serve) il rinnovo dovrebbe essere automatico; la finestra di validita registrata a maggio (27-May-2026 -> 25-Aug-2026) e gia scaduta alla data odierna, quindi o e stato rinnovato dal daemon o il servizio e giu: e misurabile solo dal Terminale (make prod-check), non da questo agente.

### 33. Let's Encrypt: durata standard 90 giorni (piu profilo a 6 giorni); riduzione a massimo 45 giorni entro febbraio 2028; l'industria scende a 47 giorni da marzo 2029; l'automazione e dichiarata essenziale.

- Confidenza: alta
- Fonte: https://letsencrypt.org/docs/cert-lifetimes/ (2026-07-22)
- Nota: Rende ancora meno praticabile un rinnovo manuale via tailscale cert.

### 34. Proposta Chromium (issue W3C ServiceWorker 1523) sul cambio/scadenza del certificato di un SW installato: se il nuovo cert e invalido o scaduto l'update check fallisce come errore di rete e il SW NON viene disinstallato; se il cert e identico l'update si ferma; se diverso l'update procede e il nuovo SW porta il nuovo cert.

- Confidenza: media
- Fonte: https://github.com/w3c/ServiceWorker/issues/1523 (2020-07-09)
- Nota: Fonte vecchia e di proposta, senza i commenti successivi nella lettura. Conseguenza pratica a cert scaduto: la shell PWA precache puo ancora aprirsi dalla cache del SW, ma ogni fetch verso /api fallisce con errore TLS (per il SyncRepository e un errore di rete, non DB_UNAVAILABLE: PROPAGA, per Spec 14.4), le nuove navigazioni di rete mostrano interstitial e il push service non e coinvolto (la subscription resta valida: e legata all'origine, non al certificato).

### 35. Firebase issue 7309 (2023-05-18, iOS 16.4.1): i listener del SW non vengono chiamati al tap sulla notifica se la PWA era stata aperta dalla Home; funzionano solo se la PWA e stata avviata da una notifica; aperto.

- Confidenza: bassa
- Fonte: https://github.com/firebase/firebase-js-sdk/issues/7309 (2023-05-18)
- Nota: Vecchia; riconferma del quadro del bug WebKit 268797.

### 36. Bug Chromium: un service worker non si registra su certificato non valido ('An SSL certificate error occurred when fetching the script'); Chrome non usa SW su connessioni non sicure.

- Confidenza: bassa
- Fonte: https://issues.chromium.org/issues/40882068 (non datata nella sintesi)
- Nota: Riguarda la registrazione iniziale, non un SW gia installato; citato solo per il verso 'cert invalido = nessuna nuova registrazione'.

### 37. Repo PharmaTimer: nessuna sede push oggi. vite.config.js (LOCKED): VitePWA generateSW con registerType 'prompt', skipWaiting false, clientsClaim false. Sonda grep -iE 'pushManager|PushSubscription|notificationclick|showNotification|registration.getNotifications|serviceWorker|webpush|pywebpush|VAPID' su src, backend/pharmatimer_api, public, scripts, deploy, docs: hit solo in src/pwa/registerSW.js (registrazione via virtual:pwa-register) e scripts/audit/inventario.py. Notifiche di pagina in src/services/notifications.js: setTimeout -> new globalThis.Notification(title, { body, tag: entryKey }), onclick window.focus() + location.href '/oggi'. Il Mini: uvicorn 0.0.0.0:8000 (deploy/launchd/api-wrapper.sh) dietro 'tailscale serve --bg --https=443' (Changelog archiviato, commit 3845cf1 del 2026-05-28).

- Confidenza: alta
- Fonte: file:///Users/roberto/Sviluppo/pharmatimer/src/services/notifications.js (stato del repo al 2026-09-03, HEAD e966859)
- Nota: Con generateSW un push handler richiede o la strategia injectManifest (tocca vite.config.js, LOCKED: serve ratifica) o importScripts di un file push separato via opzione workbox.importScripts (anch'essa in vite.config.js). Fuori scope di questa ricerca decidere quale.

## Incognite

- Se il bug 'indexedDB undefined nel SW svegliato da push' (iOS 18.1.1, thread Apple 769794) sia stato risolto in iOS 18.x successivi o in iOS 26: nessuna fonte trovata in entrambi i versi; va misurato sul telefono di Roberto con un push di prova che tenti una lettura Dexie e la logghi nel testo della notifica.
- Il limite di tempo effettivo del push event su WebKit iOS (durata di waitUntil prima della terminazione): non documentato; l'unica misura trovata e 70 s su FetchEvent (iPadOS 17.6). Ipotesi di lavoro: restare sotto 5 s.
- Se su iOS il tag della notifica produca sostituzione o chiusura via getNotifications+close: BCD dice 'nessun effetto' per Safari desktop e 'non supportato' per safari_ios, ma non ho trovato una misura empirica su iOS 18/26 per notifiche del SW; da provare con due showNotification a stesso tag.
- Se Declarative Web Push su iOS 18.4+/26 renda davvero le 'actions' descritte nell'explainer WebKit e se l'handler 'pushnotification' (mutable) abbia accesso a IndexedDB: nessuna fonte di rilascio lo dice.
- Stato reale del certificato del Mini: la finestra registrata nel Changelog (27-May-2026 -> 25-Aug-2026) e scaduta alla data odierna; il rinnovo automatico di tailscale serve e atteso ma non e verificabile da questo agente (niente ssh, niente tailnet); misurarlo con make prod-check dal Terminale.
- Comportamento del tunnel Tailscale iOS in Low Power Mode e dopo riavvio prima del primo sblocco (before first unlock): la doc Tailscale promette il ripristino dopo restart, ma i thread Apple su VPN On Demand e first unlock sono vecchi (iOS 15) e non specifici di Tailscale; da misurare con un riavvio del telefono e una notifica subito dopo.
- Quale build di Tailscale iOS e quale iOS ha il telefono del paziente: le fonti 2023 (disconnessioni quotidiane, memoria della network extension) potrebbero non valere piu.
- Se su iOS notificationclick con la PWA gia aperta in background consegni event.notification.data in modo affidabile (BCD: data non supportato in showNotification su Safari, ma supportato su Notification.data safari_ios 16.4: incongruenza BCD).
- Se il Mini abbia uscita Internet verso https://web.push.apple.com:443 e https://fcm.googleapis.com (necessaria per INVIARE i push, indipendente dalla tailnet): non misurabile da qui.
- Se il timer di pagina con new Notification lanci davvero TypeError sul dispositivo Android in uso (BCD lo dichiara per chrome_android); il sorgente non ha try/catch attorno al costruttore: va esercitato con una sonda prima di chiamarlo difetto.
