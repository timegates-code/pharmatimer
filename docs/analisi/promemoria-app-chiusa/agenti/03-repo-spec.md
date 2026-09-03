# repo:spec -- cosa promettono e hanno deciso i documenti

Fase: Misura. Agente `aece193b3ff9ef006`, esito: completato. Resa leggibile generata meccanicamente da `03-repo-spec.json`, che e il risultato restituito dall'agente cosi come registrato nel journal del workflow: contenuto invariato, solo forma.

## Sintesi

MISURA DOCUMENTALE SULLE NOTIFICHE (sola lettura; sonde: grep/sed su Spec v1_18, README, LESSONS, STATO, i due Changelog congelati, git log --all).

(1) PROMESSE DELLA SPEC E LORO STATO. Sez. 6.1: consenso al primo avvio -> PARZIALE (esiste un toggle in Config/Impostazioni con 4 stati e gating standalone, AMB-9.F', non un prompt al primo avvio). Una notifica per dose all'ora prevista o ricalcolata -> PARZIALE (solo con pagina viva: setTimeout in pagina, riprogrammazione ai trigger, no-op silenzioso su fireAt passato Q-CP2.3=A; ad app chiusa NULLA). Contenuto nome farmaco + dosaggio + relazione pasto -> PARZIALE (title=farmaco.nome, body=formatRelazionePastoCopy con fallback "Promemoria farmaco", AMB-9.I; il dosaggio non e nominato nelle ratifiche). Suono beep di sistema -> PARZIALE/best-effort (beep via services/audio.js solo in foreground, catch silenzioso). Sez. 6.2 iOS 16.4+ / home screen / SW attivo -> il vincolo standalone e realizzato lato UI (AMB-9.F), ma il SW non emette notifiche: NON REALIZZATA la consegna ad app chiusa. Sez. 6.3 Android nativo con SW -> NON REALIZZATA (TimestampTrigger scartato per uniformita iOS, AMB-9 par.22.20). Sez. 4.2 punto 4c e 4.3 punto 3c "Riprogramma la notifica" e 4.5 "La notifica suona alle 17:00" -> PARZIALE (riprogrammazione client-side solo a pagina viva). Sez. 2.1 riga 140 "Push notifications via PWA" e 8.1 "Service Worker per notifiche push" -> NON REALIZZATE (nessun handler push nel SW). Sez. 3.11 push_subscriptions -> schema REALIZZATO (v01_init.sql), uso NON REALIZZATO (zero righe sul Mini, nessun router). Sez. 11.5.2 dichiara esplicitamente Web Push out-of-scope v3.1.0 ("le notifiche v3.1.0 sono solo locali in-app"). README 0fa3dcc: la riga "anche con app chiusa" era falsa ed e stata rimossa; oggi README dichiara il limite di meccanismo. STATO decisione 2: "Le notifiche ad app chiusa: realizzarle o no" spetta a Roberto.

(2) DECISIONI GIA PRESE (non riaprire) / DOMANDE APERTE. Prese: Opzione 1 foreground-only per v3.1.0 con Web Push rinviato a fase backend (F2 par.22.20, AMB-9.E, s.6.122); AMB-9.A/D ora_prevista HH:MM mai cross-midnight e ora_ricalcolata ISO datetime; AMB-9.F/F' standalone-only + chiave impostazioni_app.notifiche_attive locale; AMB-9.G' 8 trigger nominati; AMB-9.H singleton + tag dose-{farmaco_id}-{dose_numero}-{dateStr}; Q-CP2.3=A no-op silenzioso su fireAt passato; Q9=A APScheduler intra-FastAPI e Q10=A VAPID via pywebpush --gen-keys (par.11.D-rev F2, ratificate ma MAI eseguite: F3-S8-pre/S8/S9 mai aperte); Q16=B push-to-all-subscribed con opt-in permessi.notifiche_caregiver_attive default FALSE; Q17=A dropdown switcher, Q17-sub=b owner-default; Q-IMPORT.4 push_subscriptions escluse da import/export; Q-SYNC refresh on-open, no polling background, no WS/SSE (F2 par.4816, Spec 11.6.3); s.6.245 sync bidirezionale al ritorno online riclassificata aspirazionale poi SUPERATA da Spec 14 (s.6.257); F3 par.22.198-duovicies R4 "W-full a roadmap con collocazione APERTA (decisione a DESIGN-B)", R1-R3-R5 scenario 3 offline; DESIGN-A par.198-tervicies ratifica (b) "buffer occorrenze server-side -> input DESIGN-B, NON in scenario 3"; s.6.258 CANDIDATA a DESIGN-B per Spec W-full, mai consumata; s.6.271 nessun listener offline, navigator.onLine solo dentro la passata. Aperte: DESIGN-B (par.198-quattuorvicies prenotato a W-full, mai tenuto; il numero fu poi usato per CS-2, Changelog :12712); bivio "motore occorrenze server vs calendario pubblicato dal client"; W-full stimato 12-14 sessioni (infrastruttura push 7-9, ciclo chiuso a 4 punti 2-3, escalation caregiver 2, collaudo multi-device 1); sonda iPhone push mai eseguita; alternative citate come rationale e non ratificate: Capacitor (solo su evidenza post sonda iPhone), SMS/chiamata fuori perimetro, TimestampTrigger scartato; CS-6 "notifiche a server giu" mai eseguita (CS-5.7 sospesa, CS-6.1/6.2 residue).

(3) CAREGIVER E CROSS-UTENTE. Spec 3.10: permessi.notifiche_caregiver_attive BOOLEAN DEFAULT FALSE = "Q16=B opt-in dispatch push cross-utente"; owner-permission automatica nasce con notifiche FALSE; Spec 9 espone POST/PUT /api/permessi con il campo; Spec 11.6.1 livello 2 prescrive il toggle "Ricevi anche notifiche di {nome_visualizzato}" e il dropdown Q17 <option>{nome_visualizzato}</option>; F2 par.4801: "push-to-all-subscribed" con opt-in esplicito privacy-first, l'owner attiva manualmente per ogni paziente. Sul Mini tutti i flag sono 0 (fatto del coordinatore). Il toggle UI Q16 e il dropdown Q17 NON esistono (Scope-B deferito, F3 :10070 e seguenti). Il ciclo chiuso a 4 punti (T0 push, T0+N re-push se log assente, terzo push + escalation caregiver in M5, spegnimento alla registrazione) e a verbale in duovicies come idea, non ratificato in Spec.

(4) SERVER GIU. Spec 14.0 racconto (B): "le notifiche locali restano vive" a server assente; Spec 14.4 punto 3: rinfresco fedele incluse le assenze perche "un farmaco eliminato dal medico deve sparire anche dallo specchio -- altrimenti offline continuerebbe a suonare"; 14.4 punto 6 mezzanotte offline per costruzione con prova empirica a CS-6; 14.7 CS-6 elenca "notifiche a server giu" fra le righe della matrice di collaudo; DESIGN-A tervicies "caso 12 notifiche+mezzanotte offline = per costruzione (stessi thunk che rischedulano), prova empirica a CS-6". CS-6 non risulta eseguita (STATO: CS-5.7 sospesa; Changelog :14761 CS-6.1/6.2 ancora residue). Corollario: ogni notifica documentata e client-side, quindi il server giu non la tocca ma l'app chiusa la annulla; un pianificatore server-side introdurrebbe il caso opposto (server giu = nessun avviso) che la Spec oggi non norma.

(5) VINCOLI PER UN PIANIFICATORE SERVER-SIDE. Q-SYNC: "no polling periodico background, no WebSocket/SSE" (F2 :4816, Spec 11.6.3) vincola il client, non l'egress push del server; ma Spec 14.2 punto 6 e F3 :14644 "nessun traffico periodico" sono la lettera vigente sul client. Fuso: Spec 14.6 e tempo.py fisso Europe/Rome (STATO decisione 7: divergenza in viaggio e limite dichiarato); un motore server calcolerebbe in fuso parete mentre il piano client usa il fuso del telefono. Cross-midnight: Spec 3.6 "ora_prevista resta TIME (HH:MM per costruzione, mai cross-midnight, AMB-9.D)", ora_ricalcolata DATETIME per i ricalcoli oltre mezzanotte (s.6.247); STATO decisione 4 "sonno + 60 = 00:30 dello stesso giorno" pinnato come DICHIARATO; un motore server dovrebbe replicare planBuilder/orarioResolver/recalc/extendedStride (Spec 4.8 e s.6.255 canone cadenza estesa a giorni civili) che oggi esistono SOLO in JS -> doppia verita gia dichiarata come rischio in Spec 14.1(b). Confine inizio terapia Spec 4.8: T_inizio da DATE(created_at) mai CURDATE(), filtro opzione G "alla generazione delle occorrenze, non alla presentazione", elencando esplicitamente "notifiche push (par.6)" fra le superfici che devono restare coerenti da un solo punto di applicazione: un secondo generatore server violerebbe la lettera di G salvo condividere il motore. Regola di protezione 14.4 punto 4 e M1: il server non conosce le prese in coda offline, quindi un push "dose non registrata" potrebbe indurre doppia assunzione; fail-safe sez. 1 CLAUDE.md: assenza di informazione = PROCEDERE, mai sopprimere. Dedup tocco 14.6 e ortogonale. Il flag notifiche_attive e locale per costruzione (Spec 14.4 punto 2, AMB-9.F): il server non sa se il paziente ha acceso le notifiche. Spec 4.2 4c / 4.3 3c: la riprogrammazione segue presa e recupero, quindi il pianificatore dovrebbe reagire a ogni verbo dei 5, inclusi undo e recupero. Ordine di schieramento: migrazione PRIMA, codice DOPO (CLAUDE.md 8); dipendenza nuova (pywebpush/cryptography) tocca il venv del Mini (Lesson #31, #47).

(6) LEZIONI DA RISPETTARE. #27 doc-not-empirical (dump reale prima di progettare, la sonda iPhone push non e mai stata fatta); #30 deferred decisions immutabili (Q9/Q10/Q16/Q17 e R4 non si sovrascrivono con default); #31 assunzioni nascoste + stato venv (pip list sul Mini prima di aggiungere pywebpush); #33 audit consumer su refactor; #35 CLI symlink su host headless; #37 tailscale serve persiste; #39 deploy frontend = rsync, e un SW nuovo cambia il precache; #47 editable PEP660 su Mini; #54 migrazione additiva prima del backend; #57 dati prod non si inferiscono da dev; #58 memoria vs file; #65 identita PWA via hash SHA-256 e non UI, token in localStorage + cache SW, Safari finestra privata condivisa; #66 umask 022; #67-#68 perimetro sonde, riga non e misura; #71 collaudo per mutazione nei due versi; #73 un design chiuso ha scadenza; #74 invariante su tutti i percorsi (5 verbi, tutte le superfici); #82 path risolti nelle allowlist. Fatti WebKit a verbale: iOS-N1 storage isolato tab/standalone, iOS-N2 SW orfano post-rimozione, Finding #10 IndexedDB non persiste al reload su WebKit mobile (db.js commento s.6.251), Spec 14.2 s.6.271 evento online non garantito al ritorno da sospensione in standalone, F2 6.140 init non riarma i timer, 6.141 setTimeout legato al wall clock.

## Fatti

### 1. Spec sez. 6 promette consenso al primo avvio, una notifica per dose all'ora prevista o ricalcolata, contenuto nome+dosaggio+relazione pasto, beep di sistema; iOS 16.4+ con Home e SW attivo; Android Chrome/Edge con SW attivo.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: ## 6. Notifiche Push / 6.1: 'La PWA deve richiedere il consenso alle notifiche al primo avvio' / 'Ogni dose programmata genera una notifica all'ora prevista (o ricalcolata)' / 'La notifica mostra: nome farmaco, dosaggio, relazione pasto' / 'Suono: beep standard del sistema' / 6.2: 'Il service worker deve essere registrato e attivo' / 6.3: 'Supporto notifiche PWA nativo su Chrome/Edge con service worker attivo'

### 2. Spec 4.2 e 4.3 prescrivono la riprogrammazione della notifica dopo presa (dose D+1) e dopo recupero; 4.5 esemplifica 'La notifica suona alle 17:00'.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 4.2 punto 4: 'c. Riprogramma la notifica push per nuova_ora_D+1'; 4.3 punto 3: 'c. Riprogramma la notifica'; 4.5: 'Dose 2 anticipata: 18:00 - 60 min = 17:00 ... La notifica suona alle 17:00'

### 3. Spec 4.8 opzione G impone che il filtro T_inizio agisca alla generazione delle occorrenze con un solo punto di applicazione, elencando le notifiche push fra le superfici coerenti; T_inizio si calcola su DATE(created_at) mai CURDATE().

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'Livello di applicazione (opzione G ratificata). Il filtro agisce alla generazione delle occorrenze (a monte), non alla presentazione. Conseguenza: coerenza automatica e simultanea su tutte le superfici -- Oggi (par.5.2), Export CSV/JSON (par.7), Log/Storico, notifiche push (par.6) -- con un solo punto di applicazione.' e 'confrontando data_inizio con DATE(created_at) (il giorno di inserimento del record, mai CURDATE())'

### 4. Spec 3.6 fissa ora_prevista come TIME HH:MM mai cross-midnight (AMB-9.D) e ora_ricalcolata DATETIME per i ricalcoli oltre mezzanotte.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'ora_prevista resta TIME (HH:MM per costruzione, mai cross-midnight, AMB-9.D)' e 'ora_ricalcolata | DATETIME NULL | ... DATETIME (non TIME) per rappresentare senza ambiguita i ricalcoli che attraversano la mezzanotte (es. 23:30 + 8h -> giorno successivo)'

### 5. Spec 3.10: permessi.notifiche_caregiver_attive e il flag Q16=B di opt-in al dispatch push cross-utente, default FALSE anche per la owner-permission automatica.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'notifiche_caregiver_attive | BOOLEAN DEFAULT FALSE | Q16=B opt-in dispatch push cross-utente (ratificata par.11.D-rev v3.1)' e 'Owner-permission automatica: ... (OWNER.id, NEW.id, admin) con notifiche_caregiver_attive=FALSE'

### 6. Spec 3.11 descrive push_subscriptions (endpoint FCM/Apple, p256dh, auth, device_label, attiva con hard delete deferred a cron) e la esclude dall'import/export perche device-bound (Q-IMPORT.4).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'endpoint | VARCHAR(500) | URL Web Push provider (FCM Chrome/Android, Apple Push Apple iOS 16.4+)' / 'attiva | BOOLEAN DEFAULT TRUE | Disattiva su unsubscribe, hard delete deferred cron' / 'Nota: device-bound, NON included in workflow Import/Export (Q-IMPORT.4 ratificato par.11.D-rev v3.1).'

### 7. Spec 11.6.1 livello 2 prescrive le stringhe UI di Q16 e Q17 con interpolazione di nome_visualizzato.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'toggle Q16 "Ricevi anche notifiche di {nome_visualizzato}", dropdown Q17 <option>{nome_visualizzato}</option>'

### 8. Spec 11.6.3 cementa Q-SYNC: refresh on-open, nessun polling in background, nessun WebSocket/SSE.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: '| Frequenza sync cross-device | Refresh on-open (Q-SYNC ratificata) | no polling background, no WebSocket/SSE |'

### 9. Spec 11.5.2 dichiara Web Push server-side fuori scope v3.1.0; 11.5.1 e 11 punto 9 dichiarano le notifiche locali realizzate; 11.5.3 registra iOS-N1 e iOS-N2.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'Web Push notifications persistenti server-side (richiede Fase 1 backend; le notifiche v3.1.0 sono solo locali in-app via Notification API)' / '9. Notifiche locali (Notification API + scheduling) -- anticipato rispetto alla pianificazione originale' / 'iOS-specifici (iOS-N1, iOS-N2): isolamento storage IndexedDB tra browser tab e PWA standalone Safari ...; persistenza Service Worker post-rimozione PWA standalone (no cleanup automatico Apple)'

### 10. Spec 2.1 e 8.1 promettono ancora push via PWA e SW per notifiche push: non realizzate.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: riga 140: '- Notifiche: Push notifications via PWA (iOS 16.4+, Android supportato) per i promemoria orari'; riga 583: '- Service Worker per notifiche push e cache offline'

### 11. Spec 14.0 racconto (B): a server assente le notifiche locali restano vive; 14.4 punto 3 motiva il rinfresco fedele con il rischio che offline 'continuerebbe a suonare'; 14.7 CS-6 include 'notifiche a server giu' nella matrice di collaudo.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: '(B) Server assente: le letture arrivano dallo specchio -- il piano resta visibile, le notifiche locali restano vive' / 'un farmaco eliminato dal medico deve sparire anche dallo specchio -- altrimenti offline continuerebbe a suonare, errore clinico opposto ai TRE MAI' / 'CS-6 | Collaudo della matrice offline su Mini ...: ... mezzanotte offline, notifiche a server giu, risposta persa simulata sul recupero (prova regina)'

### 12. Spec 14.1(b) registra il buffer occorrenze server-side come input del bivio push DESIGN-B e lo esclude dallo scenario 3 perche richiederebbe lo scheduler di W-full e creerebbe doppia verita.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: '(b) Buffer occorrenze server-side. Idea registrata come input forte per il bivio push di DESIGN-B (motore occorrenze server vs calendario pubblicato dal client); NON fa parte dello scenario 3: anticiparla richiederebbe lo scheduler (gia preventivato in W-full) e introdurrebbe una doppia verita senza migliorare la consegna.'

### 13. Spec 14.2 punto 3 (s.6.271) vieta listener offline e fermi persistenti perche su iOS standalone l'evento online non e garantito al ritorno dalla sospensione; punto 6 vieta health-check preliminari.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'Nessun listener offline e nessun fermo persistente (deviazione s.6.271, PERMANENTE e non reversibile) ... Movente M2: su iOS in standalone lo evento online non e garantito al ritorno dalla sospensione' / '6. Nessun health-check preliminare: la prima POST della coda E il probe.'

### 14. Spec 14.4 punto 2: profili e impostazioni (quindi notifiche_attive) sono locali per costruzione; punto 4: regola di protezione M1 sulle prese in coda.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Project_Spec_v1_18.md`
- Evidenza: 'Profili e Impostazioni sono gia locali per costruzione (delegate a LocalRepository dentro ApiRepository).' / 'una lettura dal server PRIMA del drain sovrascriverebbe nello specchio la presa ancora in coda -> la dose ricomparirebbe da prendere (M1)'

### 15. README dichiara il limite di meccanismo: timer di pagina, nessun SW, nessun Web Push, tabella push_subscriptions inutilizzata.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/README.md`
- Evidenza: 'Gli avvisi sono programmati con un timer dentro la pagina: setTimeout piu new Notification. Vivono quanto vive la pagina. Se chiudi l app, o il sistema sospende il dispositivo, quel timer non esiste piu e l avviso non parte.' / 'ne notifiche dal service worker, ne schedulazione affidata al sistema operativo, ne Web Push. La tabella push_subscriptions esiste nello schema ma il codice non la usa.'

### 16. Commit 0fa3dcc ha rimosso dal README la promessa di notifiche ad app chiusa perche non vera, misurata su notifications.js.

- Sede: `/Users/roberto/Sviluppo/pharmatimer`
- Evidenza: git show -s 0fa3dcc: 'La riga "Notifiche locali sul telefono (anche con app chiusa)" non era vera. Misurato su src/services/notifications.js: gli avvisi sono un setTimeout dentro la pagina piu new Notification, e nientaltro -- niente service worker, niente TimestampTrigger, niente Web Push'

### 17. Commit 02ae535: il pilota ha usato la modalita server dal 27 giugno al 19 luglio e poi si e fermato; la ragione dichiarata da Roberto e che le notifiche non partono ad app chiusa.

- Sede: `/Users/roberto/Sviluppo/pharmatimer`
- Evidenza: git show -s 02ae535: 'pilota in modalita server dal 27 giugno al 19 luglio da un client sulla tailnet che non e lo Studio, poi fermo. La ragione del fermo e DICHIARATA da Roberto e non misurata: le notifiche non partono ad app chiusa.'

### 18. STATO_CORRENTE: la decisione 2 su notifiche ad app chiusa spetta a Roberto; decisione 4 cross-midnight 'sonno + 60 = 00:30 stesso giorno' dichiarata; decisione 7 fuso fisso server vs telefono; CS-5.7 sospesa.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/STATO_CORRENTE.md`
- Evidenza: '2. Le notifiche ad app chiusa: realizzarle o no. Il README non le promette piu; la funzione non esiste. Il meccanismo e setTimeout in pagina piu new Notification, e push_subscriptions sta nel DB con zero riferimenti.' / '4. sonno + 60 = 00:30 dello stesso giorno. Spec 3.6 :258: ora_prevista e HH:MM e mai cross-midnight, AMB-9.D.' / '7. Fuso fisso del server (tempo.FUSO_PARETE = Europe/Rome) contro fuso del telefono sul client' / '3. CS-5.7, il blocco Centro invii, resta SOSPESA e non abbandonata.'

### 19. STATO: impegno ereditato durabilita-outbox (M2): su WebKit mobile il flag IndexedDB non sopravvive ai ricaricamenti; db.js documenta lo stesso fatto (Finding #10, s.6.251) e il ripiego su localStorage.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/src/data/db.js`
- Evidenza: 'On mobile WebKit the IndexedDB flag does not survive reloads (Finding #10) ... localStorage DOES persist there (same store as pharmatimer.userToken, proven par.182-192).'

### 20. Changelog F2 par.22.20 (AMB-9): decisione strategica Opzione 1 foreground-only, Web Push differito a Fase 3 estesa, TimestampTrigger scartato per uniformita, stima 9-15 sessioni.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: 'Vincolo iOS PWA installata: setTimeout foreground-only, TimestampTrigger non disponibile (Chromium-only), Web Push richiede backend persistente.' / 'Decisione: Opzione 1 foreground-only per consegna Step 9 senza server, Web Push backend differito a Fase 3 estesa post-Step 11 come scope autonomo.' / 'TimestampTrigger Android non implementato. Coverage Android pieno (notifiche app chiusa) sacrificata per uniformita iOS+Android Opzione 1.'

### 21. Changelog F2 AMB-9.E/F/G/H/I e emendamenti E'/F'/G'/I': setTimeout main thread, toggle standalone-only con chiave notifiche_attive, 8 trigger nominati, singleton con tag dose-{farmaco_id}-{dose_numero}-{dateStr}, title farmaco.nome e body formatRelazionePastoCopy con fallback.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: 'AMB-9.E -- setTimeout main thread, riuso services/audio.js ... limitazioni note documentate (no app chiusa, no recovery post-suspend ...)' / 'AMB-9.F -- ... vincolo display-mode: standalone uniforme iOS+Android (no notifiche da browser, sempre PWA installata)' / 'AMB-9.G' -- 8 trigger nominati: init / commitApplyResult / rollover mezzanotte / cambiaProfilo / 7 thunks rilevanti / toggle on / toggle off / visibilitychange+focus' / 'AMB-9.H -- singleton ... payload tag-based dose-{farmaco_id}-{dose_numero}-{dateStr} per OS replacement' / 'AMB-9.I -- title farmaco.nome, body via nuovo helper formatRelazionePastoCopy(farmaco) ... con fallback "Promemoria farmaco"'

### 22. Changelog F2 CP2 9-B: Q-CP2.3=A no-op silenzioso su fireAt passato; 6.141 il singleton e legato al wall clock OS; 6.140 init non riarma i timer al boot (deferred Wave-C).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: 'Q-CP2.3=A (no-op silenzioso fireAt passato)' / '## 6.141 ... Il filtro if (delay <= 0) return (Q-CP2.3=A no-op silenzioso) rifiuta ogni dose con fireAt <= wall clock now' / '## 6.140 -- actions.init() non re-arma rescheduleAllNotifications al boot (deferred Wave-C)'

### 23. Changelog F2 6.141 anticipa la risoluzione: Web Push server-side elimina la dipendenza dal setTimeout client.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: 'Risoluzione completa Wave-C / Fase 3: Opzione 2 server-side (Web Push backend Mac Mini ...) elimina il problema alla radice -- il backend programma push notification a fireAt assoluto, senza dipendere da setTimeout client-side.'

### 24. Changelog F2 par.11.D-rev: Q9=A APScheduler intra-FastAPI, Q10=A VAPID via pywebpush --gen-keys, sessioni F3-S8-pre/F3-S8/F3-S9 pianificate per Web Push (mai aperte: nessun commit le nomina).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: '| Q9 | Web Push scheduler | (A) APScheduler intra-FastAPI process ... | (A) zero dipendenze extra, single-process' / '| Q10 | VAPID key generation | (A) pywebpush CLI pywebpush --gen-keys in F3-S8 CP0' / '| F3-S8 | Web Push impl: backend (VAPID + subscription scoped utente + scheduler APScheduler caregiver dispatch UNION query) + frontend (SW push handler + permission flow + toggle Impostazioni caregiver)' / '| F3-S9 | Web Push smoke + Closing v3.3.0: test iOS device paziente A app chiusa + Android device paziente B app chiusa'

### 25. Changelog F2 Q16=B e Q17=A/Q17-sub=b: dispatch push-to-all-subscribed con opt-in per paziente; dropdown switcher; PWA riparte sempre dall'owner del device.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: '| Q16 | Dispatch Web Push cross-utente | (B) push-to-all-subscribed con flag permessi.notifiche_caregiver_attive BOOLEAN DEFAULT FALSE (caregiver opt-in esplicito, privacy-first). Owner caregiver attiva manualmente per ogni paziente' / '| Q17 | UI switcher utente attivo | (A) dropdown selector in header ... visibile condizionalmente se utente corrente ha permessi su >1 utente' / '| Q17-sub | ... (b) owner-default: PWA riparte SEMPRE dall'utente owner del device ... (1) sicurezza accidentale tap Presa su utente sbagliato'

### 26. Changelog F2 Q-SYNC: refresh on-open, nessun polling periodico, upgrade a polling 30-60s solo se emerge esigenza.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: '| Q-SYNC | Sync cross-device | Refresh on-open. PWA fa nuova GET su switch vista, no polling periodico background, no WebSocket/SSE. ... Eventuale upgrade polling 30-60s in patch v3.2.x se emerge esigenza.'

### 27. Changelog F2 iOS-N1 e iOS-N2: storage isolato fra tab Safari e PWA standalone; SW orfano resta registrato dopo rimozione della PWA.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: 'iOS-N1 ... Safari iOS isola IndexedDB+LocalStorage+cookies tra browser tab (/pharmatimer) e PWA standalone ... PWA standalone parte sempre con DB vuoto al primo lancio' / 'iOS-N2 ... dopo rimozione PWA standalone dalla Home, il Service Worker /pharmatimer resta registrato in Safari iOS'

### 28. Changelog F3 par.22.198-duovicies: finding strategico sull'asse app-chiusa (nulla in piu della prima versione), unico canale = Web Push, ratifica R4 W-full a roadmap con collocazione aperta a DESIGN-B, stima 12-14 sessioni, ciclo chiuso a 4 punti, Capacitor e SMS citati come gradini successivi.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: 'FINDING STRATEGICO: sull asse app-chiusa NULLA in piu della prima versione; push_subscriptions provisionata ma ZERO router push nel backend (S2); Wave C iPhone mai eseguita; iOS nega alle PWA le notifiche locali programmate -> unico canale ad app chiusa = Web Push' / 'CICLO CHIUSO a 4 punti (T0 push nominativo; T0+N re-push se log assente; terzo push + escalation caregiver in M5; spegnimento automatico alla registrazione)' / 'Stima W-full richiesta: ~12-14 sessioni (infrastruttura push 7-9; ciclo chiuso 2-3; escalation caregiver 2; collaudo multi-device 1)' / '(R4) W-full a roadmap con collocazione APERTA (decisione a DESIGN-B)' / 's.6.258 CANDIDATA a DESIGN-B (Spec W-full)'

### 29. Changelog F3 par.22.198-tervicies (DESIGN-A): ratifica (b) buffer occorrenze server come input DESIGN-B, il bivio 'motore occorrenze server vs calendario pubblicato dal client' resta aperto; caso notifiche+mezzanotte offline rimandato a prova empirica CS-6; sonda iPhone push non eseguita.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: '(3) buffer occorrenze server = idea giusta per i PUSH: registrata come input forte per il bivio di DESIGN-B (motore occorrenze server vs calendario pubblicato dal client); anticiparla in OFFLINE-3 richiederebbe lo scheduler (gia preventivato in W-full) e introdurrebbe doppia verita' / 'caso 12 notifiche+mezzanotte offline = per costruzione (stessi thunk che rischedulano), prova empirica a CS-6' / 'Sonda iPhone PUSH non eseguita (propedeutica a DESIGN-B, anticipabile su richiesta)'

### 30. Changelog F3: il paragrafo par.198-quattuorvicies prenotato per DESIGN-B e stato poi usato per CS-2; DESIGN-B non risulta mai tenuto e s.6.258 resta candidata (sonda: grep 'DESIGN-B|s.6.258' sull'intero file, ultima riga :12813).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: ':12712 GAMMA: STATO full-overwrite (sentinel SENTINEL_STATO_PAR_22_198_QUATTUORVICIES; OFFLINE-3 CS-2 IN CORSO 1/2 ...)' e ':12813 s.6.258 CANDIDATA (DESIGN-B). Prossima libera: s.6.259.'

### 31. Changelog F3 F6 (s.6.245): outbox offline giudicato in contraddizione con Q-SYNC e sync bidirezionale riclassificata aspirazionale; superata poi da Spec 14 (s.6.257).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: 'B2 = outbox offline + sync-on-reconnect: NON esiste in sorgente ... MA contraddice Q-SYNC (refresh-on-open) + sync multi-device out-of-scope' / 'Deviazione s.6.245 ... la sincronizzazione bidirezionale al ritorno online NON e implementata in Fase 3'

### 32. Changelog F3 ultimo avanzamento: CS-5.7 non consegnata, CS-6.1 e CS-6.2 residue: la riga 'notifiche a server giu' della matrice CS-6 non e mai stata collaudata (sonda: grep CS-6.1, ultima :14761).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: ':14761 questa sessione consuma uno slot senza consegnare CS-5.7 ... CS-5.7 chiude a 155, CS-5.8 156, CS-6.1 157, CS-6.2 158'

### 33. Changelog F3: la scelta di copiare copy.js e i toggle Q16/Q17 restano deferiti a Scope-B perche toccano VIETATI; il toggle caregiver e il dropdown non esistono in UI.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: ':10070 Scope-B (UX): Decisione 5 (strategia build/token), Q17 user-switcher, UI owner-create -- tocca aree VIETATE (LoginGate/apiClient/ApiRepository) -> sessione dedicata, fuori da questa.' / ':10072 Q4 Q17 switcher = deferito a sessione UX dedicata.'

### 34. Changelog F3 P15-B: il rischio non misurato sul layer notifiche per cadenze sotto l'ora e stato reso irraggiungibile riducendo il dominio di n a 24.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: ':11542 (a) x = 0.5 -> n = 48 diventa irraggiungibile: il rischio non misurato sul layer notifiche non va misurato. (b) n massimo scende a 24.'

### 35. Changelog F3 :14644: lo spegnimento del latch _unreachable non aggiunge traffico periodico ne endpoint nuovi (lettera vigente sul client contro il polling).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase3.md`
- Evidenza: 'nessun endpoint nuovo, nessun traffico periodico, nessuna superficie di errore in piu'

### 36. git log: i commit sulle notifiche sono tutti di Fase 2 (9-A/9-B/9-D, aprile 2026: fd2ab9a, c158496, 93c3d21, 35fed4d, 376c610, 959dc40 SW prompt) piu i tre documentali del 2 settembre 2026 (0fa3dcc, 02ae535, e966859); d8c44c9 del 19/05 pre-froze la revisione Fase 3 con Web Push. Nessun commit nomina vapid, push_subscriptions o showNotification (sonda: git log --all -i -E --grep su quei termini).

- Sede: `/Users/roberto/Sviluppo/pharmatimer`
- Evidenza: git log --all --oneline -i -E --grep='notific|service worker|sw\.js|vapid|web push|webpush|push_subscription' -> 12 righe, fra cui 'fd2ab9a 9-B CP2 -- services/notifications.js singleton 7+1 metodi (AMB-9.H)', '959dc40 Step 10-B closing -- SW autoUpdate+prompt + bump v2.6.0', 'd8c44c9 par.11.D-rev pre-frozen Sessione F3-S0 revisione Fase 3 con setup Mini headless + SSH + Web Push'

### 37. LESSONS #65: la PWA persiste il token in localStorage piu cache SW; la finestra privata Safari non e pulita; identita si prova con hash SHA-256 e non con la UI.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/LESSONS.md`
- Evidenza: 'la PWA persiste il token in localStorage (pharmatimer.userToken) + cache service-worker -> una sessione preesistente entra diretta senza LoginGate; ... in Safari la finestra privata non e pulita se altre tab private sono aperte (storage condiviso)' / 'la prova autoritativa di identita e l'hash-match SHA-256, non l'UI'

### 38. LESSONS #27, #30, #31, #57, #58, #73: dump reale prima di progettare, decisioni ratificate immutabili, stato del venv da misurare, dati prod non da dev, memoria contro file, design chiuso con scadenza.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/LESSONS.md`
- Evidenza: '#27 ... dump fisico dei source obbligatorio, mai assumere esistenza/path/contenuto da design draft' / '#30 ... Le decisioni architetturali ratificate sono immutabili: Claude non le sovrascrive con default' / '#31 ... CP0-ext Parte D = dump stato venv runtime (pip list/pip show) se il codice dipende dallo stato di installazione' / '#57 ... lo stato dei dati prod NON si inferisce dallo stato dev' / '#73 ... un design dichiarato chiuso ha una scadenza, perche il codice scritto fra design-close e code-step puo invalidarlo'

### 39. LESSONS #71 e #74: pin visti rossi per mutazione nei due versi; invariante verificato su tutte le superfici e spazi di chiavi.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/LESSONS.md`
- Evidenza: '#71 ... un pin o un gate verde non e efficace finche una mutazione non lo ha visto ROSSO NOMINANDOLO' / '#74 ... un invariante ratificato su UNA superficie ... si enumera e si verifica su TUTTE le superfici che espongono lo stesso dato e in OGNI spazio di chiavi'

### 40. LESSONS #39, #47, #54, #35, #37, #82: deploy frontend = solo rsync; editable PEP660 sul Mini; migrazione additiva prima del backend; CLI symlink su host headless; tailscale serve persiste; path risolti nelle allowlist sandbox.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/LESSONS.md`
- Evidenza: '#39 il redeploy frontend su Mini e SOLO rsync della build ... NESSUN restart del backend' / '#47 con editable PEP 660 limport risolve alla sorgente in-repo; rsync della sorgente aggiorna il runtime' / '#54 migration additiva applicata PRIMA del backend; layer di rollback indipendenti' / '#35 App GUI/.pkg ... NON espongono il symlink CLI su host headless' / '#82 un path scritto in una allowlist di sandbox va dato RISOLTO'

### 41. LESSONS #66: umask diversa da 022 rompe vitest e pytest in $TMPDIR; va imposta nella stessa invocazione della suite.

- Sede: `/Users/roberto/Sviluppo/pharmatimer/LESSONS.md`
- Evidenza: 'Se vitest riporta N unhandled errors con 0 test eseguiti, o pytest da PermissionError/EACCES su path in /var/folders/.../T/, sospettare subito la umask'

### 42. Nessuna sede in docs/, deploy/ o DESIGN_multiutente_attivazione.md norma le notifiche oltre lo schema permessi (sonda: grep -rn -i 'notific|push|service worker' su docs deploy con *.md/*.sh/*.txt e sul DESIGN, esclusi i 'git push').

- Sede: `/Users/roberto/Sviluppo/pharmatimer/DESIGN_multiutente_attivazione.md`
- Evidenza: unica riga: 'permessi: ... notifiche_caregiver_attive tinyint(1) def 0 ... UNIQUE uq_permessi_pair(caregiver_id,paziente_id).' ; docs/ e deploy/ zero righe

### 43. La deviazione s.6.122 (limitazioni Opzione 1 foreground-only + roadmap Web Push) non ha una sezione propria nel Changelog F2: vive solo nelle tabelle di 22.20 e nel commit CP4 (sonda: grep '^#.*6\.122' zero esiti; grep '6\.122' 6 righe di tabella).

- Sede: `/Users/roberto/Sviluppo/pharmatimer/PharmaTimer_Changelog_Fase2.md`
- Evidenza: '| §6.122 | B | Wave B globale | Opzione 1 foreground-only limitazioni note + roadmap Web Push Fase 3 estesa |' e commit message '9-B CP4 §6.121+§6.122 -- 8 trigger reschedule + foreground-only limits (AMB-9.E'/G')'

## Domande aperte

- DESIGN-B (W-full) non e mai stato tenuto: il bivio 'motore occorrenze server vs calendario pubblicato dal client' resta aperto in Spec 14.1(b) e Changelog F3 tervicies; s.6.258 e candidata e mai consumata. Va deciso prima di ogni riga di codice push.
- La sonda iPhone push (Web Push su PWA standalone iOS dall'origine ts.net) e dichiarata propedeutica a DESIGN-B e non e mai stata eseguita; ogni stima su iOS resta inferenza.
- Q9=A (APScheduler intra-FastAPI) e Q10=A (pywebpush) sono ratificate nel 2026-05 ma mai realizzate: vanno confermate o riaperte con ratifica esplicita (Lesson #30), anche alla luce del LaunchAgent con KeepAlive gia esistente e dell'assenza di pywebpush nel pyproject.
- Il flag notifiche_attive e locale per costruzione (Spec 14.4 punto 2, AMB-9.F): un pianificatore server non sa se il paziente ha acceso le notifiche; serve decidere se la subscription push stessa vale come consenso o se il flag va portato sul server.
- Fuso: Spec e tempo.py fissano Europe/Rome sul server mentre il piano client usa il fuso del telefono (STATO decisione 7): un motore occorrenze server dovrebbe dichiarare quale fuso governa il push.
- Cross-midnight: STATO decisione 4 tiene il wrap 'sonno + 60 = 00:30 stesso giorno' come DICHIARATO; ogni replica server del piano erediterebbe o divergerebbe da quel comportamento.
- Il motore del piano (planBuilder, orarioResolver, recalc, extendedStride s.6.255, confine T_inizio 4.8 opzione G) vive solo in JS: un pianificatore server o lo replica (doppia verita, vietata dallo spirito di 14.1(a)) o riceve un calendario pubblicato dal client; la Spec non lo ha ancora scelto.
- Prese offline in coda (Spec 14.4 punto 4, M1): il server non le conosce finche la coda non si consegna; un push 'dose non registrata' o un re-push T0+N potrebbe indurre doppia assunzione. Il ciclo chiuso a 4 punti e a verbale come idea, non e ratificato ne normato.
- CS-6 'notifiche a server giu' e 'mezzanotte offline' non sono mai state collaudate (CS-5.7 sospesa, CS-6.1/6.2 residue): il comportamento delle notifiche locali a server giu e per costruzione, non misurato.
- Il consenso al primo avvio promesso da Spec 6.1 non corrisponde al toggle in Impostazioni (AMB-9.F'): la Spec va allineata o la promessa riaperta; il dosaggio promesso in 6.1 non compare nelle ratifiche di AMB-9.I.
- Spec 2.1 riga 140 e 8.1 riga 583 promettono ancora push via PWA e SW per notifiche: incongruenza documentale con 11.5.2 e con il README, da rettificare (regola critica 3, nessuna riscrittura del Changelog congelato).
- Q16 toggle caregiver e Q17 dropdown restano deferiti a Scope-B perche toccano VIETATI: un dispatch push cross-utente non ha oggi una superficie UI per l'opt-in.
- Durabilita su WebKit mobile: Finding #10 (IndexedDB non persiste al reload) e iOS-N1/N2 (storage isolato, SW orfano) non sono stati rimisurati sul bundle corrente: una subscription push salvata lato client dovrebbe vivere in una sede di cui e stata misurata la persistenza.
