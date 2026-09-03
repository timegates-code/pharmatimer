# Promemoria ad app chiusa -- indice dell'analisi

Analisi in sola lettura del 3 settembre 2026, a HEAD e966859, sulla domanda:
come far arrivare al paziente il promemoria della dose ad app chiusa e
telefono in tasca, su iPhone (pilota) e su Android (moto g06), con
l'architettura attuale. Nessun codice e stato scritto ne modificato; nessuna
decisione e stata presa: le decisioni che spettano a Roberto sono nella
sezione 10 del rapporto e nello STATO.

## Cosa c'e in questa cartella

| Percorso | Cosa e |
|---|---|
| `INDICE.md` | Questo file: struttura della cartella, fasi del workflow eseguite e non, mappa degli agenti. |
| `rapporto.md` | Il rapporto in Markdown: misure, capacita dei telefoni con fonti datate, cosa serve sul server, vincolo di dominio, quattro opzioni, scartate, piano di prova, criterio di accettazione, decisioni, limiti. |
| `rapporto.html` | Lo stesso rapporto nella forma pubblicata come artefatto nella sessione. E il sorgente dell'artefatto: senza `doctype` ne `head`, perche il contenitore li aggiunge alla pubblicazione. Stesso contenuto del Markdown. |
| `agenti/NN-<fase>-<nome>.json` | Il risultato restituito da ciascun agente, cosi come registrato nel journal del workflow: l'oggetto validato dallo schema richiesto, riserializzato in JSON con indentazione 2 e UTF-8. Contenuto invariato. |
| `agenti/NN-<fase>-<nome>.md` | Resa leggibile dello stesso JSON, generata meccanicamente: titoli, elenchi e campi nell'ordine dello schema. Nessuna riga aggiunta o tolta rispetto al JSON. In caso di dubbio fa fede il JSON. |
| `workflow/journal.jsonl` | Copia byte per byte del journal del workflow: una riga per evento (`started`, `result`, `failed`), 32 righe. E la fonte da cui sono estratti i JSON in `agenti/`. |

Non e salvato lo script del workflow: e codice JavaScript, fuori dal mandato
"solo documenti". Vive nella cartella della sessione di Claude Code
(`workflows/scripts/pharmatimer-push-analisi-wf_22cd31d9-7e0.js`), non nel
repo. La sua struttura e descritta sotto.

## Il workflow: cosa era previsto e cosa e stato eseguito

Identificativo del run: `wf_22cd31d9-7e0`. Sedici agenti avviati, dodici
completati, quattro falliti. Totali riportati dal motore del workflow: 722
chiamate di strumenti, 2.736.527 token dei subagenti, durata 1.888.895 ms
(circa 31 minuti). I quattro fallimenti portano tutti lo stesso messaggio:
limite di spesa mensile raggiunto ("You've hit your monthly spend limit").

| Fase | Previsto | Eseguito | Esito |
|---|---|---|---|
| Misura | 4 lettori del repo (client, backend, spec, dominio) e 5 ricercatori web con fonti datate (iOS, Android, protocollo, alternative, tocco e rete), in parallelo | 9 su 9 | **completata** |
| Progetto: progettisti | 3 progettisti indipendenti con angoli diversi (sicurezza clinica prima; minimo cambiamento all'architettura; affidabilita di consegna prima), ciascuno con il dossier completo di misura | 3 su 3 | **completata** |
| Progetto: giudici | 3 giudici (occhio del clinico, dell'ingegnere, del paziente) con rubrica a cinque voci: sicurezza, fattibilita, onesta, collaudabilita, completezza; segnalazione di errori fattuali; scelta del vincitore e innesti dai perdenti | 0 su 3 | **fallita** per limite di spesa |
| Progetto: sintesi | 1 sintetizzatore: opzioni unificate dal vincitore piu innesti, analisi di dominio, 12-20 affermazioni chiave falsificabili, decisioni aperte | 0 su 1 | **fallita** per limite di spesa |
| Verifica | Confutazione di ogni affermazione chiave della sintesi con tre lenti indipendenti (fonti e date, architettura del repo, clinica sui TRE MAI); una affermazione cade se due lenti su tre la confutano | -- | **mai partita**: dipendeva dalla sintesi |
| Completezza | Critico contro le cinque domande numerate del mandato e la forma dell'output richiesta; riempimento delle lacune trovate (fino a otto) | -- | **mai partita**: dipendeva dalla sintesi |

Conseguenza dichiarata nel rapporto: le affermazioni sui telefoni portano
fonte e data cosi come le hanno raccolte i ricercatori, ma nessuna e passata
dalla confutazione indipendente prevista. La convergenza dei tre progetti
indipendenti sullo stesso ordine di opzioni e un segnale, non una verifica. Le
affermazioni che poggiano su una sola fonte secondaria sono marcate nel
rapporto (sezione 11).

Il rapporto e stato composto dal coordinatore leggendo per intero i dodici
risultati, piu le misure fatte direttamente sul repo e sul Mini in sola
lettura (`make check` verde in apertura; ssh sul Mini fuori dal sandbox per
sistema operativo, `pmset`, certificato, egress verso i servizi push, venv,
conteggi in sola lettura su `push_subscriptions`, `profilo_utente`,
`log_assunzioni` e `orari_base` dell'utente 2).

## Mappa degli agenti

L'ordine di avvio registrato nel journal non coincide con l'ordine dei compiti
nel programma del workflow: la corrispondenza fra identificativo dell'agente e
compito e stata verificata leggendo la prima riga del prompt nella trascrizione
di ciascun agente, non dedotta dal contenuto.

| File | Etichetta | Fase | Compito | Esito | Agente |
|---|---|---|---|---|---|
| `01-repo-client` | `repo:client` | Misura | catena client delle notifiche: servizio, hook, trigger, testo, click, service worker, persistenza WebKit, pin | completato | `ad822d84df527b668` |
| `02-repo-backend` | `repo:backend` | Misura | lato server e schieramento: router, DDL, migrazioni, LaunchAgent, CORS, dipendenze, endpoint mai chiamati | completato | `ac2a4ab6c67468b07` |
| `03-repo-spec` | `repo:spec` | Misura | cosa promettono e cosa hanno gia deciso Spec, README, LESSONS, STATO e i due Changelog congelati | completato | `aece193b3ff9ef006` |
| `04-repo-dominio` | `repo:dominio` | Misura | dominio puro e catena repository: formula dell'ora prevista, transizioni, mezzanotte, chiave della dose, finestra di cecita del server, costo del port | completato | `aba33f9ebd245b6ac` |
| `05-web-ios` | `web:ios` | Misura | Web Push per PWA in Home su iPhone, stato a settembre 2026, fonti datate | completato | `a065af5f9a63ac143` |
| `06-web-android` | `web:android` | Misura | Web Push su Android e Chrome, moto g06, Doze, WebAPK, policy 2025-2026 | completato | `a534fc6f1f270890d` |
| `07-web-protocollo` | `web:protocollo` | Misura | lato server: RFC 8030/8291/8292, VAPID, pywebpush, codici, egress, pianificazione, sonno del Mac | completato | `a15094c0b0c1ad06d` |
| `08-web-alternative` | `web:alternative` | Misura | canali alternativi o di riserva: nativo, calendario, Shortcuts, push generici, SMS, Salute, sveglie, app medicali | completato | `a1b222c65b8656e3e` |
| `09-web-click-e-rete` | `web:click_e_rete` | Misura | dopo la consegna: Tailscale iOS, service worker nel push, notificationclick, azioni, origine e certificato, dedup per tag | completato | `a7ab0bc0ac94b01eb` |
| `10-progetto-sicurezza` | `progetto:sicurezza` | Progetto | progettista con angolo "sicurezza clinica prima" | completato | `a7c755b4732db1bfc` |
| `11-progetto-minimo` | `progetto:minimo` | Progetto | progettista con angolo "minimo cambiamento all'architettura" | completato | `ae1d657dbf28567e4` |
| `12-progetto-affidabilita` | `progetto:affidabilita` | Progetto | progettista con angolo "affidabilita di consegna prima" | completato | `ae7f5d5151d82ff01` |
| -- | `giudice:1` | Progetto | giudice con l'occhio del clinico | fallito | `a0c921ba4a72871a0` |
| -- | `giudice:2` | Progetto | giudice con l'occhio dell'ingegnere | fallito | `ac224dec89fb6adae` |
| -- | `giudice:3` | Progetto | giudice con l'occhio del paziente | fallito | `a368d1285144643d4` |
| -- | `sintesi` | Progetto | sintetizzatore | fallito | `a9c7d9c4e310a42b2` |

Gli agenti falliti non hanno lasciato alcun risultato: per loro non esiste
file in `agenti/`, solo la riga `failed` nel journal.

## Schemi dei risultati

- I quattro lettori del repo restituiscono `{summary, facts[{claim, path,
  evidence}], open_questions[]}`: ogni fatto porta il percorso della sede e un
  estratto di contenuto, mai un solo numero di riga.
- I cinque ricercatori web restituiscono `{summary, findings[{claim,
  source_url, source_date, confidence, note}], unknowns[]}`: la data e quella
  che la pagina mostra, oppure "non datata".
- I tre progettisti restituiscono `{angle, options[...], discarded_unsafe[],
  cross_cutting, key_claims[]}`, dove ogni opzione ha: nome, una riga,
  cambiamenti sul server, sul client e nell'installazione sul telefono,
  rischi di dominio riferiti a M1, M2 e M3, costi, cosa perde, piano di prova
  prima del codice, criterio di accettazione a una settimana, sicura si o no
  e perche. Le `key_claims` erano destinate alla fase di verifica, che non e
  partita.

## Come leggere

Per la risposta: `rapporto.md`. Per le fonti di una affermazione: il dossier
di misura corrispondente in `agenti/`, dove ogni reperto porta URL e data. Per
sapere quale progettista ha proposto cosa: i tre file `agenti/1N-progetto-*`,
che il rapporto cita per angolo dove divergono. Per la fedelta dell'estrazione:
`workflow/journal.jsonl`.
