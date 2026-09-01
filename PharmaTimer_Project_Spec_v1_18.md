# PharmaTimer — Specifica di Progetto
<!-- Spec v1.9 N+5.Q-bis ricostruzione catena (consolida arretrato fantasma 1.9+1.10+1.11) + drift-N44/N5P.12 Spec-only + drift-N86 schema 8 tabelle -->

**Versione:** 1.18
**Data:** 27 luglio 2026
**Autore:** Roberto Paolucci
**Contesto:** Progetto Claude dedicato allo sviluppo di una PWA per la gestione della terapia farmacologica quotidiana. La specifica originale prevedeva un backend persistente FastAPI + MariaDB; nel rilascio v3.1.0 l'app è chiusa come PWA standalone con persistenza locale IndexedDB. Il backend è formalmente fuori scope v3.1.0 ma resta architetturalmente riapribile (vedi par.11.5 + par.11.D Changelog Fase 2). Il backend è in sviluppo attivo Fase 3 a partire da v3.2.0-alpha.1 (branch `fase-3-backend` LOCALE, non merged in main, vedi Changelog Fase 3). A v3.2.0-alpha.7 LOCALE è chiuso cluster auth-layer drift-N44+N53 backend-side simmetricamente (N+5.K par.22.93): `get_current_user` raise `RepositoryError(UNAUTHORIZED)` con vocabolario errori uniforme cross-PWA/backend; 76 test pytest backend verde (575/575 vitest invariato).

<!-- SPEC_V1_14_BLOCCO2_FISSO_DATE -->
<!-- SPEC_V1_15_FISSO_DATE_OFFSET_FIX -->
<!-- SPEC_V1_16_FISSO_DATE_LISTA_PIATTA -->
<!-- SPEC_V1_17_OFFLINE_SCENARIO_3 -->
<!-- SPEC_V1_18_RECEPIMENTO_QUATTORDICI -->
**Changelog versione 1.18 (rispetto alla 1.17):**
- **Recepimento di quattordici materie arretrate (v1.18):** `s.6.253` e `s.6.260` (logWrite a stato invariato, sez. 4.7); `s.6.259` `s.6.261` `s.6.262` `s.6.265` `s.6.266` `s.6.267` `s.6.271` (sez. 14); `s.6.263` e `s.6.264` (sezz. 4.7 e 4.3); `s.6.268` (invariante di coppia, clausola NUOVA in 4.7: la Spec non lo nominava in alcuna sede); `s.6.269` (guardia dello stato di destinazione, sez. 4.2); piu la riscrittura di 4.2 punto 3, che ometteva un termine. **`s.6.270` non compare: e materia di processo, non di Spec.** Questa lista ENUMERA le materie recepite e NON dichiara che lo arretrato sia esaurito: altre sigle anteriori a `s.6.259` risultano nominate nel Changelog e assenti da questo documento, e sono sotto guardia con criterio di misura.

**Changelog versione 1.17 (rispetto alla 1.16):**
- **Funzionamento offline -- scenario 3 (NUOVA sez. 14, deviazione s.6.257, Changelog F3 par.22.198-tervicies):** trascrizione normativa del design conclusivo OFFLINE ratificato: racconto (premessa lessicale), impianto specchio-a-ingredienti + coda dei tocchi etichettati, ratifiche Q4-Q8, piano code-step CS-0..CS-6. Metro clinico sovraordinato: i TRE MAI (M1 mai indurre una doppia assunzione; M2 mai perdere una presa avvenuta; M3 mai falsificare il record). Guardiano `SyncRepository` COMPOSTO nella factory: `ApiRepository`/`LocalRepository` intatti (VIETATO (a) sciolto senza eccezioni; VIETATO (b) sciolto con eccezione chirurgica perimetrata, esercizio a CS-4).
- **Sez. 3.6 `log_assunzioni`: colonna `client_op_id CHAR(36) NULL` + UNIQUE (migration v06, schema-prima):** targa del tocco per il dedupe idempotente dei 5 verbi log. Righe esistenti NULL, zero backfill, retrocompatibile. Implementazione (sql + wrapper + dedupe in-transazione + pytest incluso replay recupero) al code-step CS-2.
- **Sez. 9: nota idempotenza `client_op_id`** sui 5 endpoint verbi log (campo opzionale; targa vista -> 200 `dedup: true` + stato attuale riga; targa nuova -> applica e scrive la targa sulla riga).

**Changelog versione 1.16 (rispetto alla 1.15):**
- **`fisso_date` — modello LISTA PIATTA (correzione del Pattern S, deviazione s.6.248, Changelog F3 par.22.152):** il modello "Pattern S" (stesse M ore su tutte le N date, M costante) della v1.14/v1.15 è **superato**. Il caso reale (integratore a date irregolari con pause variabili) richiede una **lista piatta** di coppie `(data, ora)` liberamente editabili: ogni `data_specifica` può avere un numero di dosi `k_D` **diverso** dalle altre. **Schema DB invariato** (la colonna `data_specifica DATE NULL` reggeva già la lista piatta). Corretta la sez. 3.5 (modello). Conseguenze: (a) il validatore backend non vincola più M costante tra date — solo `dose_numero` sequenziale `1..k_D` **per ciascuna data**; (b) **DEV-1 ridefinita**: per `fisso_date`, `dosi_giornaliere` è **informativo/derivato** = `max(k_D)` (la data più carica), non un'uguaglianza vincolata; per `fisso`/`intervallo` resta `== count(righe data_specifica IS NULL)`. Il dominio JS (par.22.151) era già **agnostico al modello** → nessun rework JS. Implementazione validatore + pytest in sessione dedicata (Regola #5).

**Changelog versione 1.15 (rispetto alla 1.14):**
- **Correzione `fisso_date` — `offset_minuti` (FIX, code-step Blocco 2, Changelog F3 par.22.148):** la v1.14 indicava `offset_minuti=0` con l'ora in `ora_prevista`. Errato: `planBuilder` riscrive sempre `ora_prevista = computeOraPrevista(orario, profilo)`, e per `ancora='assoluto'` quella funzione somma `offset_minuti` alla mezzanotte → con 0 tutte le righe `fisso_date` finirebbero alle 00:00. **Corretto (sez. 3.5):** `offset_minuti` = minuti-da-mezzanotte dell'ora scelta, `ancora='assoluto'`. Conseguenza: `computeOraPrevista` restituisce l'ora corretta e `ricalcolaPianoDaProfilo` resta inerte su `assoluto` (DEV-2 soddisfatta senza modificare `recalc.js`); `planBuilder` aggiunge solo il predicato data-filter.
- **Precisazione `recalc.js` / guard cross-data (sez. 4.1):** il claim "recalc.js INTATTO" era impreciso. Il motore di ricalcolo non agisce su `fisso_date` (gate `tipo='intervallo'`), ma serve un guard chirurgico in `findNextDose` per non attraversare il confine `data_specifica` (evita `dose_prec_saltata` fuorviante tra date indipendenti). Modifica minima e contenuta, non il motore di ricalcolo.
- **Conferma DEV-1 sul validator orari (per-gruppo-data):** il validator bulk di `orari_base` valida `dose_numero` 1..M sequenziale **per ciascuna `data_specifica`** (stesso M su tutte = invariante Pattern S) quando le righe hanno `data_specifica` valorizzata; comportamento globale 1..N invariato per le righe ricorrenti. E' l'applicazione di DEV-1, non una nuova deviazione.
- **Implementazione (migration v05 + backend + dominio + test) nel code-step;** form `FarmacoDrawer` in sessione dedicata (Regola #5).

**Changelog versione 1.14 (rispetto alla 1.13):**
- **`fisso_date` — orari fissi su date specifiche (NUOVO, BUG-i/j Blocco 2, Changelog F3 par.22.147):** terzo valore di `tipo_frequenza` per terapie su un insieme finito di date, senza ricorrenza giornaliera e senza recupero gap. Implementato via nuova colonna `orari_base.data_specifica DATE NULL` (NULL=riga ricorrente preesistente; valorizzata=occorrenza singola, `ancora_riferimento='assoluto'`). Modifiche sez. 3.1 (enum), 3.5 (colonna + Pattern S, max 30 date), 4.1 (principio no-recalc). Modello D1 ratificato: riusa l'endpoint `PUT /api/farmaci/{id}/orari` esistente; il mapper `_stripOrarioServerFields` è blacklist → `ApiRepository`/`apiClient` INTATTI, nessuna deroga VIETATO.
  - **DEV-1 (invariante §6.205 ridefinita):** per `fisso_date`, `dosi_giornaliere == count(orari_base WHERE data_specifica = D)` per ciascuna data D; per `fisso`/`intervallo` resta sulle righe `data_specifica IS NULL`.
  - **DEV-2 (no scaling profilo):** righe `fisso_date` con `ancora_riferimento='assoluto'` invarianti al cambio profilo, by-design.
  - **Implementazione codice (migration v05 + backend + domain + form + test) DEFERITA al code-step (sessione Claude Code).** Spec-first: questo bump documenta lo schema prima del codice.

**Changelog versione 1.13 (rispetto alla 1.12):**
- **`ora_ricalcolata` TIME → DATETIME (sez. 3.6 + 4.7, migration v04, Opzione 1, deviazione s.6.247, Changelog F3 par.22.137):** la colonna passa da `TIME NULL` a `DATETIME NULL` per allinearsi al modello PWA ISO `YYYY-MM-DDTHH:MM` (§6.115b) ed eliminare il troncamento silenzioso della parte data sui ricalcoli cross-midnight. Vincolo no-anticipation `/recupero` ricalibrato a confronto full-datetime (`nuova ora_ricalcolata >= TIMESTAMP(data, ora_prevista)`, sottrazione via `INTERVAL ... MINUTE`) in luogo del time-of-day (divergenza Q-C dal par.22.136). `ora_prevista` resta `TIME`.

**Changelog versione 1.12 (rispetto alla 1.9):**
- **Allineamento path orari (deviazione s.6.231, Changelog F3 par.22.115):** sez. 9 corretta da `/api/orari/{farmaco_id}` al path nested reale `/api/farmaci/{farmaco_id}/orari` (GET + PUT bulk-replace), gia implementato dal pattern par.22.81 (F3-S2.B-bis). Risolve drift spec-codice. Nessuna correzione retroattiva (par.6.71/85).
- **Salto numerazione 1.9 -> 1.12 (continuita drift-SPEC-VER):** evita di ri-spendere i numeri fantasma 1.10/1.11 gia consolidati in v1.9 (vedi sotto). Ogni numero usato una sola volta.
- **GAP-B/C/D copertura API ratificati DEFER intenzionale conforme** (PUT utenti / orari POST-DELETE / log PUT-DELETE): nessun endpoint mancante e una deviazione, le semantiche esistenti (PUT upsert orari, verbi state-machine + /undo per log, no edit utente in spec) coprono i casi. Dettaglio Changelog F3 par.22.115.

**Changelog versione 1.9 (rispetto alla 1.8):**
- **Nota catena versioni (drift-SPEC-VER, N+5.Q-bis):** le versioni 1.9 e 1.10 citate nel Changelog Fase 3 (par.22.94 -> par.22.103) e la 1.11 (intento par.22.104/22.105) NON sono mai state emesse come file. Questa v1.9 consolida in un salto unico da v1.8 l'intero arretrato 1.9+1.10+1.11. (sha v1.8 reale `bb5fed86176d9bad`; il valore `71a8b92da72233d4` annotato altrove era stale.)
- **Nota re-mapping sezioni:** i contenuti deployment che il Changelog Fase 3 cita come `sez. 12 / 12.4` sono qui collocati in **sez. 13** (la sez. 12 Riferimenti preesisteva in v1.8). Le citazioni `sez.12` del Changelog Fase 3 restano immutabili (par.6.71/85).
- Sez. 3.0 NUOVA: schema canonico riconciliazione drift-N86 (8 tabelle reali, fonte-di-verita DDL `v01_init.sql` + `v03`; nome canonico `orari_base`; `utenti.ruolo` 3-val; `log_assunzioni.stato` 5-val).
- Sez. 3.12 NUOVA: tabella `impostazioni_app` (era assente dalla Spec; key-value scoped multi-tenant, PK composita).
- Sez. 11.6.9 aggiornata: `apiClient` allineato a 2 body shape (rimosso 401 plain HTTPException, drift-N44) + nota edge-only token-assente (drift-N5P.12).
- Sez. 11.6.12-11.6.18 NUOVE: Lesson #29-#38 (stub + rimando Changelog Fase 3; corpo esteso demandato a sessione doc-only dedicata).
- Sez. 13 NUOVA: Deployment gamma nativo Mac Mini + Tailscale HTTPS (stub; corpo esteso demandato).

**Changelog versione 1.8 (rispetto alla 1.7):**
- Sez. 11.6.11 aggiornata: chiusura simmetrica cluster auth-layer drift-N44+N53 backend-side N+5.K — `UNAUTHORIZED` trigger backend ora `RepositoryError(UNAUTHORIZED)` da `get_current_user` middleware (no piu `HTTPException 401` plain detail); auth middleware body shape ora vocabulary uniforme `{error: {code: 'UNAUTHORIZED', severity: 'error', message: '<msg>'}}` allineato a `exceptions.py` global handler; `apiClient._normalizeErrorBody` PWA-side gestisce ora 2 body shape (vocabulary + Pydantic detail array) invece di 3 (rimosso HTTPException plain post-N+5.K)

**Changelog versione 1.7 (rispetto alla 1.6):**
- Sez. 11.6.9 NUOVA: Architettura ApiRepository PWA-side F3-S5-alpha (composition pattern `_local: LocalRepository`, 31 metodi dispatch — 10 delegate Profili+Setting + 1 inherently-local + 17 API-routed Farmaci+Orari+Log + 2 throw GENERIC + 1 orchestration `withTransaction` best-effort; mapper `_fromApiFarmaco`/`_toApiFarmaco`/`_stripOrarioServerFields`; dispatch 5 verbi `upsertLog` `/presa /saltata /sospesa /undo /recupero`; atomic detect `[presa@D, ricalcolata@D+1]` stesso `farmaco_id` → 1 POST con `ricalcolo_dose_successiva` nested; fan-out 1+N `getAllOrari` + `getLogByRange` cross-farmaci `Promise.all` fail-fast; HH:MM → ISO datetime coercion EMP-21)
- Sez. 11.6.10 NUOVA: Lesson #28 MANDATORY — Composition pattern over inheritance per ApiRepository (`this._local = new LocalRepository()`, `vi.spyOn(repo._local, X)` granulare in test, injection support `new ApiRepository(custom)`, evita class-extends Dexie mutation conflicts)
- Sez. 11.6.7 aggiornata: status F3-S5-alpha completato N+5.I-post + roadmap N+5.J push+deploy + F3-S5-beta auth-layer cluster (drift-doc-N44/N45/N53/N54)
- Sez. 9: aggiunta nota wrapper apiClient HTTP `X-User-Token` injection middleware + 8 codici errore body shape mapping (vocabulary `{error:{code,severity,message}}` su 403/404/409 + Pydantic `detail` array su 422 + 5xx override `DB_UNAVAILABLE` `critical` + token absent immediate UNAUTHORIZED pre-fetch)
- Sez. 11.6.11 NUOVA: Vocabolario errori cross-PWA/backend cementato F3-S5-alpha milestone (`RepositoryError` codes + severity table: UNAUTHORIZED→error, FORBIDDEN→warning, NOT_FOUND→warning, CONSTRAINT_VIOLATION→error, GENERIC→error, DB_UNAVAILABLE→critical, TRANSACTION_ABORT→critical; drift-doc-N54 ratifica formale UNAUTHORIZED severity error)

**Changelog versione 1.6 (rispetto alla 1.5):**
- Sez. 3.10 permessi: aggiunta nota UNIQUE constraint `(caregiver_id, paziente_id)` enforce + scope admin-on-paziente decentralizzato per POST/PUT/DELETE + self-permission protection su DELETE (Fase 3 v3.2.0-alpha.5, F3-S4-beta CP1)
- Sez. 9: espansa riga unica `/api/permessi/*` in 4 righe distinte (GET bidirezionale + POST admin-on-paziente + PUT idempotent + DELETE self-protected); aggiunte note status code 200/201/404/409/422 (Fase 3 v3.2.0-alpha.5, F3-S4-beta CP1)
- Sez. 11.6.6 NUOVA: Convenzioni codice backend Fase 3 (Lesson #25 autocommit pool transaction implicit + Lesson #26 pre-emit static analysis MANDATORY)
- Sez. 11.6.7 NUOVA: Roadmap aggiornata post-F3-S4 milestone (F3-S5 ApiRepository PWA-side integration vs F3-S6 deploy Mini)

**Changelog versione 1.5 (rispetto alla 1.4):**
- Sez. 3.1 farmaci: aggiunta colonna `demo BOOLEAN DEFAULT FALSE` (campo NOT NULL nel DDL reale Fase 3, chiusura drift-N38 par.22.83)
- Sez. 3.6 log_assunzioni: aggiunta nota su UNIQUE INDEX `idx_log_slot_unique (utente_id, farmaco_id, data, dose_numero)` (NEW migration v02 F3-S3-beta CP1, abilita upsert semantics per endpoint transitions)
- Sez. 4.7 NUOVA: Endpoint transitions state-machine — semantica `/saltata`, `/sospesa`, `/undo`, `/recupero` + matrice transitions + Q-RES-1/2/3 + Sub-Q-NEW.2 (sorgente `presa` rifiutata da `/sospesa`)
- Sez. 9: aggiunti 4 endpoint REST nested `/api/farmaci/{id}/log/{saltata|sospesa|undo|recupero}` (Fase 3 v3.2.0-alpha.4, F3-S3-beta CP1)

**Changelog versione 1.4 (rispetto alla 1.3):**
- Sez. 3.1/3.4/3.5/3.6: aggiunta colonna `utente_id INT NOT NULL FK → utenti.id` su 4 tabelle esistenti (Multi-tenant Fase 3 v3.2.0)
- Sez. 3.9/3.10/3.11 NUOVE: tabelle `utenti` + `permessi` + `push_subscriptions` (architettura multi-tenant Q13-Q17 ratificata par.11.D-rev v3.1 Changelog)
- Sez. 9: aggiunta nota header `X-User-Token` mandatory + 7 endpoint NEW (`/api/utenti`, `/api/permessi/*`, `/api/export/snapshot`, `/api/import/preview`, `/api/import/snapshot`)
- Sez. 11.6 NUOVA: Architettura multi-tenant Fase 3 (naming convention AMB-NAMING livelli 1+2+3 + dimensionamento target 6 utenti + 3 anni retention + onboarding invite-only caregiver admin)
- Sez. 11 Fase 4: rifrasi 2 righe per anonimato runtime (rimossa etichetta familiare specifica come esempio multi-utente)
- Aggiornato **Contesto** con cross-reference par.11.D-rev v3.1 + par.22.76 Changelog Fase 2

**Changelog versione 1.3 (rispetto alla 1.2):**
- Sez. 3.8: cross-reference Changelog Sessioni N+2 (s.6.215 vista Log) + N+3 (s.6.216 export CSV)
- Sez. 5.1: nota inline su Log + Export implementate in v3.1.0 standalone (Dexie locale, no backend)
- Sez. 11: roadmap riformulata con marker esplicito per Fase per rispecchiare il rilascio v3.1.0 — Fase 2 ✅ chiusa, Fase 1 backend + Fase 4 estensioni dichiarate ⏸ out-of-scope; Fase 3 originaria splittata (Log/Export riassorbiti in v3.1.0 standalone, swap ApiRepository out-of-scope)
- Sez. 11.5 NUOVA: stato rilascio finale v3.1.0 (funzionalità incluse + out-of-scope esplicito + known limitations)

**Changelog versione 1.2 (rispetto alla 1.1):**
- Sez. 3.6: ENUM `stato` ora al femminile (soggetto implicito "dose") e stato `sospesa` aggiunto
- Sez. 4.2: aggiornato pseudocodice con nuovo naming femminile
- Sez. 5.3: tabella stati card aggiornata con naming femminile e nuovo stato `sospesa`; aggiunto stato `in ritardo` con soglia `TOLLERANZA_MIN`
- Sez. 7.2: "Solo farmaci presi / solo saltati" → generico ("solo presi / solo saltati / solo sospesi")
- Sez. 11: Fase 2 ampliata per riflettere la roadmap reale del Changelog Fase 2 (notifiche spostate qui da Fase 3)

---

## 0. Istruzioni per il Progetto Claude

### 0.1 Descrizione progetto (per il campo "Description")
> PWA per la gestione della terapia farmacologica quotidiana con promemoria, ricalcolo dinamico degli orari e recupero graduale dei ritardi. Stack: React + FastAPI + MariaDB.

### 0.2 Project Instructions
```
Questo progetto sviluppa PharmaTimer, una PWA React + FastAPI + MariaDB per la gestione della terapia farmacologica quotidiana. La specifica completa è nel file PharmaTimer_Project_Spec.md nella knowledge base — leggila integralmente prima di rispondere a qualsiasi richiesta.

Regole di progetto:
- Backend: Python (FastAPI) + MariaDB. Usa mysql-connector-python, non SQLAlchemy.
- Frontend: React JSX + Tailwind CSS core utilities. Singolo file per componente.
- Codice e commenti in inglese. UI, messaggi utente e documentazione in italiano. Nomi tabelle e campi DB in italiano come da specifica. Nessun ORM: query SQL dirette con parametri.
- Segui la roadmap nelle 4 fasi definite nella specifica. Non anticipare fasi successive senza autorizzazione.
- Ogni output di codice deve essere testabile: fornisci sempre istruzioni per l'esecuzione.
- Lo schema DB è la fonte di verità: qualsiasi modifica al modello dati va aggiornata prima nella specifica, poi nel codice.
- L'algoritmo di ricalcolo e recupero gap è descritto nella sezione 4 della specifica — implementalo esattamente come documentato.
- Al termine di ogni fase, produci un riepilogo di ciò che è stato implementato, cosa manca, e eventuali deviazioni dalla specifica. Attendi approvazione prima di passare alla fase successiva. Se durante lo sviluppo emergono problemi di design o incongruenze nella specifica, segnalali prima di procedere con soluzioni autonome.
```

### 0.3 Primo messaggio suggerito
```
Leggi integralmente la specifica PharmaTimer nella knowledge base. Prima di scrivere codice, produci un riepilogo strutturato che confermi la tua comprensione di: (1) architettura e stack, (2) schema DB con relazioni tra tabelle, (3) logica di ricalcolo con gap recovery — includi un esempio numerico tuo per dimostrare che hai capito, (4) meccanismo dei profili giornalieri con offset/àncore. Dopo mia conferma, procedi con la Fase 1.
```

---

## 1. Obiettivo

PharmaTimer è una Progressive Web App (PWA) per smartphone (**iOS 16.4+ e Android**) che gestisce la somministrazione giornaliera di farmaci, con promemoria sonori, ricalcolo dinamico degli orari in caso di ritardi o anticipi, logging completo degli eventi e persistenza dei dati su backend domestico.

L'utente tipo è un paziente politrattato (10-15 farmaci/die) con terapie a intervallo fisso (ogni Xh), terapie a orario fisso (1/die), e vincoli di relazione con i pasti.

---

## 2. Architettura

### 2.1 Frontend — PWA React
- **Framework:** React (JSX)
- **Styling:** Tailwind CSS (core utility classes)
- **Installazione:** Salvabile come app da home screen su iOS e Android
- **Notifiche:** Push notifications via PWA (iOS 16.4+, Android supportato) per i promemoria orari
- **Offline:** Funzionamento base anche senza connessione (cache locale IndexedDB in modalita standalone). NOTA (s.6.245, F6 par.22.131): la sincronizzazione bidirezionale "al ritorno online" (outbox scritture offline) e ASPIRAZIONALE/Fase-4, NON implementata in Fase 3 -- coerente con Q-SYNC refresh-on-open (sez. 11.6.3) + sync multi-device out-of-scope (sez. 11). In API-mode le scritture sono sincrone verso il backend (fail-fast DB_UNAVAILABLE se offline); in standalone Dexie e locale senza backend.

### 2.2 Backend — Python + MariaDB
- **Server:** FastAPI (Python)
- **Database:** MariaDB
- **Host:** Mac Studio Ultra, macOS Tahoe 26.0.1
- **Comunicazione:** API REST (JSON)
- **Accesso:** Rete locale (con possibilità futura di VPN/Tailscale per accesso esterno)

---

## 3. Modello Dati

### 3.0 Schema canonico -- riconciliazione drift-N86 (NUOVO in v1.9)
<!-- SENTINEL_N5QBIS_SEC30 -->
Fonte-di-verita: DDL `backend/db/migrations/v01_init.sql` + `v03_utenti_enum_caregiver.sql` + `v02_unique_log.sql`. Lo schema reale Fase 3 e composto da **8 tabelle**: `utenti`, `permessi`, `push_subscriptions`, `profilo_utente`, `farmaci`, `orari_base`, `log_assunzioni`, `impostazioni_app`. Note canoniche:
- Nome canonico **`orari_base`** (sottosezioni 3.2/3.5 corrette).
- `utenti.ruolo` ENUM('owner','paziente','caregiver') (v03; chiude drift-doc-N46 lato DDL).
- `log_assunzioni.stato` ENUM 5 valori ('prevista','presa','saltata','sospesa','ricalcolata').
- UNIQUE `idx_log_slot_unique (utente_id, farmaco_id, data, dose_numero)` (v02).
- `profilo_utente` include `attivo` + `demo`; `impostazioni_app` ha PK composita `(utente_id, chiave)` senza `id`.
Le sottosezioni 3.1-3.11 restano la descrizione di dettaglio; questa nota ne fissa l'inventario autoritativo. Modalita alpha-lite: inventario e correzioni elencate verificate sul DDL, NON e stata rivalidata ogni colonna delle sottosezioni esistenti (audit colonnare integrale -> sessione DB dedicata).


### 3.1 Tabella `farmaci`
| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | Identificativo farmaco |
| utente_id | INT NOT NULL FK → utenti.id | Multi-tenant Fase 3 v3.2.0 (NUOVO in v1.4), scoping isolamento dati cross-utente |
| nome | VARCHAR(100) | Nome commerciale (es. "Medrol 16mg") |
| principio_attivo | VARCHAR(100) | Principio attivo (es. "metilprednisolone") |
| funzione | VARCHAR(200) | Descrizione breve (es. "Cortisone broncospasmo") |
| tipo_frequenza | ENUM('intervallo','fisso','fisso_date') | `intervallo`=regolata da intervallo minimo; `fisso`=orari fissi ripetuti ogni giorno; **`fisso_date`** (NUOVO v1.14)=orari fissi su un insieme **finito** di date specifiche, **senza ripetizione** e **senza recupero gap** |
| intervallo_ore | DECIMAL(4,1) NULL | Ore minime tra una dose e l'altra (es. 8.0, 6.0, 12.0) — solo se tipo_frequenza='intervallo' |
| intervallo_minimo_ore | DECIMAL(4,1) NULL | Intervallo minimo di sicurezza con recupero gap (default: 50% di intervallo_ore). L'utente non può impostare un recupero che riduca l'intervallo sotto questo valore |
| dosi_giornaliere | INT | Numero di somministrazioni/die |
| relazione_pasto | ENUM('prima','durante','dopo','stomaco_pieno','lontano','indifferente') | Vincolo con i pasti |
| dettaglio_pasto | VARCHAR(100) NULL | Dettaglio (es. "30 min prima colazione") |
| note | TEXT NULL | Note libere (es. "sciacquare bocca dopo", "rallenta i riflessi") |
| data_inizio | DATE | Data inizio somministrazione |
| data_fine | DATE NULL | Data fine (NULL = terapia cronica) |
| attivo | BOOLEAN DEFAULT TRUE | Se il farmaco è attualmente in terapia |
| demo | BOOLEAN DEFAULT FALSE | (NUOVO in v1.5) Se il farmaco è demo/seed (cleanup selettivo). Chiusura drift-N38 par.22.83. |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### 3.2 Tabella `orari_base` — vedi 3.5 (modificata con offset e àncora)

### 3.3 Tabella `log_assunzioni` — vedi 3.6 (modificata con gap e recupero)

### 3.4 Tabella `profilo_utente`

Configurazione del ritmo giornaliero. Gli orari base dei farmaci sono espressi come **offset** rispetto all'ora di sveglia, non come orari assoluti. Questo permette di adattare l'intero piano a stili di vita diversi senza riconfigurare ogni singolo farmaco.

| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| utente_id | INT NOT NULL FK → utenti.id | Multi-tenant Fase 3 v3.2.0 (NUOVO in v1.4), vincolo composito: 1 profilo attivo per `utente_id` |
| nome_profilo | VARCHAR(50) | Es. "Standard", "Turno notte", "Weekend" |
| ora_sveglia | TIME | Ora di sveglia (àncora per tutti gli orari) |
| ora_colazione | TIME | Ora colazione |
| ora_pranzo | TIME | Ora pranzo |
| ora_cena | TIME | Ora cena |
| ora_sonno | TIME | Ora di andare a dormire |
| attivo | BOOLEAN DEFAULT FALSE | Un solo profilo attivo alla volta |
| created_at | TIMESTAMP | |

**Meccanismo:** Nella tabella `orari_base`, il campo `ora_prevista` è calcolato come offset dalla sveglia. Se il profilo "Standard" ha sveglia=07:00 e il Pantorc ha offset=-30min (30 min prima di colazione), l'ora prevista è 07:00. Se l'utente attiva il profilo "Nottambulo" con sveglia=10:00, l'ora prevista del Pantorc diventa automaticamente 10:00, e tutti gli altri farmaci scalano di conseguenza.

### 3.5 Modifica alla tabella `orari_base`

| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| utente_id | INT NOT NULL FK → utenti.id | Multi-tenant Fase 3 v3.2.0 (NUOVO in v1.4), scoping orari per utente |
| farmaco_id | INT FK → farmaci.id | |
| dose_numero | INT | Numero progressivo della dose nel giorno (1, 2, 3...) |
| offset_minuti | INT | Offset in minuti rispetto all'àncora di riferimento (sveglia, colazione, pranzo, cena) |
| ancora_riferimento | ENUM('sveglia','colazione','pranzo','cena','sonno','assoluto') | A quale momento della giornata è ancorato l'orario |
| ora_prevista | TIME | **Calcolato** dal profilo attivo: àncora + offset. Aggiornato quando si cambia profilo |
| descrizione_momento | VARCHAR(100) NULL | Contesto (es. "colazione", "spuntino", "dopo cena") |
| data_specifica | DATE NULL | (NUOVO v1.14; corretto v1.15) `NULL` = riga **ricorrente**: vale ogni giorno attivo (comportamento `fisso`/`intervallo`). **Valorizzata** = occorrenza **singola** solo su quella data (`tipo_frequenza='fisso_date'`); per convenzione `ancora_riferimento='assoluto'` e `offset_minuti` = **minuti-da-mezzanotte dell'ora scelta** (NON 0: `computeOraPrevista` su `assoluto` somma l'offset alla mezzanotte, quindi `ora_prevista` = offset; con 0 darebbe 00:00). |

**Esempio:** Pantorc → ancora_riferimento='colazione', offset_minuti=-30 → colazione 07:30 - 30 = 07:00. Con profilo "Nottambulo" colazione 10:30 → Pantorc alle 10:00.

**Modello `fisso_date` — LISTA PIATTA (NUOVO v1.14, corretto v1.16; BUG-i/j Blocco 2).** Per un farmaco a date specifiche si materializzano righe `orari_base` esplicite con `data_specifica` valorizzata. **Lista piatta di coppie `(data, ora)`:** l'utente compone un elenco libero di occorrenze; ogni `data_specifica` può avere un numero di dosi `k_D` **indipendente** dalle altre date (NON il "Pattern S" stesse-M-ore-su-tutte, superato in v1.16). Per ciascuna data, `dose_numero` è sequenziale `1..k_D`. Il campo `dosi_giornaliere` è **informativo/derivato** = `max(k_D)` (la data più carica), non un vincolo di uguaglianza (DEV-1 v1.16). Le righe `fisso_date` sono assolute (`ancora_riferimento='assoluto'`): **non scalano** al cambio profilo (DEV-2). **Massimo 30 date distinte** per farmaco. Le righe con `data_specifica IS NULL` restano il modello ricorrente preesistente: nessuna riga esistente è modificata (retro-compatibile).

### 3.6 Tabella `log_assunzioni`
| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| utente_id | INT NOT NULL FK → utenti.id | Multi-tenant Fase 3 v3.2.0 (NUOVO in v1.4), scoping log per utente, FK enforce isolation |
| farmaco_id | INT FK → farmaci.id | |
| data | DATE | Giorno di riferimento |
| dose_numero | INT | Quale dose del giorno |
| ora_prevista | TIME | Orario che era programmato |
| ora_effettiva | DATETIME NULL | Quando è stato effettivamente preso (NULL = non ancora preso) |
| delta_minuti | INT NULL | Differenza in minuti (positivo = ritardo, negativo = anticipo) |
| ora_ricalcolata | DATETIME NULL | Nuovo orario (data+ora completi) se ricalcolato da ritardo/anticipo precedente. DATETIME (non TIME) per rappresentare senza ambiguità i ricalcoli che attraversano la mezzanotte (es. 23:30 + 8h → giorno successivo). Allineato al modello PWA che dal §6.115b scrive ISO `YYYY-MM-DDTHH:MM`. Migrazione v04 (Opzione 1, s.6.247) |
| gap_minuti | INT DEFAULT 0 | Gap accumulato: ritardo residuo non ancora recuperato (positivo = ritardo, negativo = anticipo residuo) |
| recupero_minuti | INT DEFAULT 0 | Minuti di recupero applicati a questa dose (impostato dall'utente) |
| stato | ENUM('prevista','presa','saltata','sospesa','ricalcolata') | Stato della dose. Soggetto implicito "dose" (femminile). `sospesa` = non assunzione intenzionale, nessuna propagazione di gap. |
| note | VARCHAR(200) NULL | Note evento (es. "anticipato per pranzo tardivo") |
| created_at | TIMESTAMP | |
| client_op_id | CHAR(36) NULL, UNIQUE | Targa del tocco (UUID v4 generato dal client all'istante del tocco) dell'ULTIMA operazione applicata alla riga. NULL = riga mai toccata con targa (storico pre-v06). Migrazione v06 (s.6.257, vedi sez. 14.6) |

**Nota sugli stati:**
- `prevista` — dose programmata, non ancora gestita
- `presa` — dose assunta (con o senza delta)
- `saltata` — dose dimenticata; su farmaci a intervallo il ritardo si propaga alla dose successiva
- `sospesa` — non assunzione intenzionale (decisione dell'utente, es. salto concordato col medico); nessuna propagazione, nessun warning
- `ricalcolata` — dose la cui `ora_prevista` originale è stata sostituita da `ora_ricalcolata` a seguito di un'assunzione precedente in ritardo/anticipo; resta in attesa di essere presa

**Vincolo di unicità slot (NUOVO in v1.5, migration v02 F3-S3-beta CP1):**
La tabella ha un UNIQUE INDEX `idx_log_slot_unique (utente_id, farmaco_id, data, dose_numero)` che garantisce identità univoca dello slot dose. Abilita upsert semantics deterministico per gli endpoint transitions `/saltata`, `/sospesa`, `/undo`, `/recupero` (vedi sez. 4.7) e identifica univocamente la riga `log_assunzioni` su cui applicare la transizione.

**Migrazione `ora_ricalcolata` TIME → DATETIME (NUOVO in v1.13, migration v04, Opzione 1, deviazione s.6.247):**
La colonna era `TIME NULL` ma il dominio PWA vi scrive un datetime ISO completo (`YYYY-MM-DDTHH:MM`, §6.115b): MariaDB troncava silenziosamente alla sola parte oraria, perdendo il giorno e corrompendo i ricalcoli cross-midnight. La v04 esegue `MODIFY ora_ricalcolata DATETIME NULL` + backfill difensivo `UPDATE ... SET ora_ricalcolata = TIMESTAMP(data, TIME(ora_ricalcolata)) WHERE ora_ricalcolata IS NOT NULL` (ricostruisce la data dalla colonna `data`; assume same-day — inerte se non esistono righe valorizzate). Wrapper idempotente: skip se gia DATETIME. `ora_prevista` resta `TIME` (HH:MM per costruzione, mai cross-midnight, AMB-9.D).

**Colonna `client_op_id` -- targa del tocco (NUOVO in v1.17, migration v06, deviazione s.6.257):**
`ALTER TABLE log_assunzioni ADD COLUMN client_op_id CHAR(36) NULL` + UNIQUE INDEX sulla colonna (`v06_client_op_id.sql` + wrapper idempotente `apply_v06_client_op_id.py`, pattern misurato su v05). La targa e un UUID v4 generato dal client all'istante del tocco (sez. 14.6) e consente al server di riconoscere una ritrasmissione della stessa operazione: dedupe primo-gesto DENTRO la transazione esistente -- targa gia vista -> 200 con `dedup: true` + stato attuale della riga (nessuna riapplicazione); targa nuova -> applica la transizione e SCRIVE la targa sulla riga. La riga porta sempre la targa dell'ULTIMA operazione applicata (sovrascrittura ad ogni verbo; sicura per FIFO in fila indiana + parcheggio-non-firma, sez. 14.3/14.6). Righe esistenti restano NULL (UNIQUE MySQL ammette piu NULL): zero backfill, pienamente retrocompatibile; i payload senza targa restano validi. Ortogonale a MOD-1.

### 3.7 Tabella `parametri_vitali` (estensione futura)
| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| data_ora | DATETIME | |
| tipo | ENUM('spo2','pressione','temperatura','fc') | |
| valore | VARCHAR(20) | Es. "94", "120/70", "36.5" |
| note | VARCHAR(200) NULL | |

### 3.8 Modello dati state-side (Fase 2)

`state.plan` è la proiezione client-side del piano terapeutico, costruita a partire da `farmaci` + `orari_base` + `log_assunzioni` per un orizzonte multi-day.

**Scope intentional dal Step 5b-2:** `[today − PLAN_DAYS_BEFORE, today + PLAN_DAYS_AFTER]` con `PLAN_DAYS_TOTAL = PLAN_DAYS_BEFORE + 1 + PLAN_DAYS_AFTER` (default `3`: ieri + oggi + domani).

Le projection day-scoped per UI (`OggiView`) e notifiche (`rescheduleAllNotifications`) avvengono via `selectEntriesForDay(state, dateStr)` su `state.plan`, non per re-fetch from DB.

Vedi `PharmaTimer_Changelog_Fase2.md` §6.147 (chiusura by-design Sessione 9-C) per il razionale architetturale.

**Estensione Sessioni N+2/N+3 (v3.1.0):** la stessa proiezione client-side alimenta in v3.1.0 anche la vista Log (selector `selectLogEntriesFiltered`, s.6.215 Sessione N+2 par.11.U) e l'export CSV (`exportCsv.js` con separatore `;` IT-Excel-friendly e BOM UTF-8, s.6.216 Sessione N+3 par.11.V). Nessun fetch backend è richiesto: il modello dati locale Dexie è sufficiente per Log/Export read-only.

---

### 3.9 Tabella `utenti` (NUOVO in v1.4 — Multi-tenant Fase 3 v3.2.0)

| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | Identificativo utente |
| nome_visualizzato | VARCHAR(50) | Stringa libera scelta dall'owner (nome battesimo, alias, soprannome). Naming convention AMB-NAMING livello 3 libero |
| ruolo | ENUM('owner','paziente') | Solo 1 record `ruolo='owner'` per DB (vincolo applicativo, no constraint SQL) |
| token_hash | CHAR(64) | SHA-256 del `VITE_USER_TOKEN` shared-secret-per-device (Q15=A ratificata). Plaintext mai persistito |
| attivo | BOOLEAN DEFAULT TRUE | Soft delete utente (cascade su dati pazienti opzionale, decisione F3-S4) |
| created_at | TIMESTAMP | |

**Vincolo applicativo**: esattamente 1 utente `ruolo='owner'` per DB istanza. Validato lato API (FastAPI middleware) + UI seed onboarding step 0.

### 3.10 Tabella `permessi` (NUOVO in v1.4 — Multi-tenant Fase 3 v3.2.0)

| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| caregiver_id | INT FK → utenti.id | Utente che esercita il permesso |
| paziente_id | INT FK → utenti.id | Utente target del permesso (può coincidere con `caregiver_id` per self-permission) |
| permesso | ENUM('read','write','admin') | Livello accesso |
| notifiche_caregiver_attive | BOOLEAN DEFAULT FALSE | Q16=B opt-in dispatch push cross-utente (ratificata par.11.D-rev v3.1) |
| created_at | TIMESTAMP | |

**Vincoli applicativi (espansi in v1.6, F3-S4-beta cementato):**
- **Self-permission automatica**: per ogni `paziente_id` esiste sempre 1 record self-permission `caregiver_id = paziente_id` con `permesso='admin'` (creato automaticamente al `POST /api/utenti` via doppio INSERT atomic transaction implicit). NO UI per cancellarlo + DELETE row `caregiver_id == paziente_id` vietato a livello router endpoint con `RepositoryError(CONSTRAINT_VIOLATION)` -> HTTP 409.
- **Owner-permission automatica**: per ogni utente NEW (sia paziente che caregiver) esiste sempre 1 record `(OWNER.id, NEW.id, 'admin')` con `notifiche_caregiver_attive=FALSE`. Owner mantiene admin globale su tutti gli utenti creati (vincolo sez. 11.6 "1 owner per DB").
- **UNIQUE constraint** `(caregiver_id, paziente_id)`: enforce database-level su MariaDB index `idx_permessi_caregiver_paziente_unique`. POST `/api/permessi` duplicato gestito via catch `IntegrityError errno 1062` -> `RepositoryError(CONSTRAINT_VIOLATION)` -> HTTP 409.
- **Scope admin-on-paziente decentralizzato**: POST/PUT/DELETE `/api/permessi/*` enforced via helper `assert_admin_on_paziente(current_user, paziente_id, conn)` (`pharmatimer_api/db/dependencies.py`). Helper bypass se `current_user.ruolo == 'owner'` (admin globale). Altrimenti SELECT `permessi WHERE caregiver_id=current AND paziente_id=target AND permesso='admin'` LIMIT 1; se vuoto -> `RepositoryError(FORBIDDEN)` -> HTTP 403.

### 3.11 Tabella `push_subscriptions` (NUOVO in v1.4 — Multi-tenant Fase 3 v3.3.0)

| Campo | Tipo | Descrizione |
|---|---|---|
| id | INT AUTO_INCREMENT PK | |
| utente_id | INT FK → utenti.id | Owner della subscription |
| endpoint | VARCHAR(500) | URL Web Push provider (FCM Chrome/Android, Apple Push Apple iOS 16.4+) |
| p256dh_key | VARCHAR(200) | Chiave pubblica subscription |
| auth_key | VARCHAR(100) | Auth secret subscription |
| device_label | VARCHAR(100) NULL | Etichetta device per UI gestione (es. "iPhone Mario", impostato dall'utente) |
| attiva | BOOLEAN DEFAULT TRUE | Disattiva su unsubscribe, hard delete deferred cron |
| created_at | TIMESTAMP | |

**Nota**: device-bound, NON included in workflow Import/Export (Q-IMPORT.4 ratificato par.11.D-rev v3.1).

---

### 3.12 Tabella `impostazioni_app` (NUOVO in v1.9 -- drift-N86, era assente dalla Spec)
<!-- SENTINEL_N5QBIS_SEC312 -->
Key-value scoped multi-tenant (Changelog Fase 2 sez. 6.1; scoped F3-S1.I=a, s.6.220). PK composita, nessuna colonna `id`.

| Campo | Tipo | Note |
|---|---|---|
| utente_id | INT NOT NULL | FK -> utenti.id, parte di PK |
| chiave | VARCHAR(100) NOT NULL | parte di PK |
| valore | TEXT NULL | |

FK `fk_impost_utente` -> `utenti(id)` ON DELETE RESTRICT ON UPDATE CASCADE.

## 4. Logica di Ricalcolo e Recupero Gap

### 4.1 Principi
- Ogni farmaco ha una **timeline indipendente**: il ritardo di un farmaco NON influenza gli orari degli altri farmaci.
- I farmaci a **orario fisso** (tipo_frequenza='fisso', es. Pantorc alle 7, Ezevast la sera) non vengono ricalcolati: se saltati, la dose passa al giorno dopo.
- I farmaci a **intervallo** (tipo_frequenza='intervallo', es. Prontinal ogni 8h) vengono ricalcolati: se la dose N viene presa in ritardo di X minuti, la dose N+1 si sposta di X minuti in avanti.
- **Gap recovery**: dopo il ricalcolo automatico, l'utente può decidere di recuperare parzialmente o totalmente il ritardo accumulato, accorciando l'intervallo della dose successiva.
- I farmaci a **date fisse** (`tipo_frequenza='fisso_date'`, NUOVO v1.14) si comportano come i `fisso` ma su un insieme finito di date: **nessun ricalcolo**, **nessun recupero gap** (il ricalcolo in sez.4.2 è gated su `tipo='intervallo'`, che li esclude). Una dose saltata non si ripropone automaticamente; restano valide solo le altre date pianificate. (v1.15) Precisazione: il motore di ricalcolo non agisce su `fisso_date` (gate `tipo='intervallo'`), ma `findNextDose` applica un guard per **non attraversare il confine `data_specifica`** tra date indipendenti — così una dose saltata su una data non marca `dose_prec_saltata` sulla data successiva.

### 4.2 Algoritmo — Ricalcolo base
```
Al tap su "presa" per farmaco F, dose D:
  1. Registra ora_effettiva = NOW()
  2. Calcola delta = ora_effettiva - ora_prevista (in minuti)
  3. Calcola gap = gap_D - recupero_D + delta
     (gap propagato alla dose successiva: gap e recupero gia presenti sulla dose D
      PRIMA della presa, piu il ritardo di questa presa. Allineato a 4.3 punto 4a
      e a recalc.js :422; la forma precedente ometteva il termine gap_D)
  4. Se F.tipo_frequenza == 'intervallo' E esiste dose D+1:
     a. nuova_ora_D+1 = ora_effettiva + F.intervallo_ore
     b. Aggiorna log_assunzioni per dose D+1: ora_ricalcolata = nuova_ora_D+1, stato = 'ricalcolata', gap_minuti = gap, recupero_minuti = 0
     c. Riprogramma la notifica push per nuova_ora_D+1
  5. Se F.tipo_frequenza == 'fisso':
     a. Nessun ricalcolo
```

**Guardia dello stato di destinazione (deviazione `s.6.269`).** Se la dose D+1 nominata dal gesto e gia in uno stato deciso dallo utente (`presa`, `saltata`, `sospesa`), il server **omette** lo `UPDATE` di ricalcolo e conferma la presa di D con 201, invece di rifiutare lo intero gesto. Movente clinico: il rifiuto difenderebbe D+1 **esponendo D**, perche il rollback della presa piu un 4xx la parcheggiano senza retry e una presa avvenuta non raggiungerebbe mai il server (M2).

**Sede duale dello invariante di coppia (`s.6.268`, vedi 4.7).** Il reset `recupero_minuti = 0` del punto 4b e la sola sede che scrive `recupero_minuti` fissando contestualmente `ora_ricalcolata`: le due colonne restano coerenti per costruzione, non per accidente.

### 4.3 Algoritmo — Recupero gap (interazione utente)
```
Dopo il ricalcolo della dose D+1, l'utente vede il gap accumulato e può impostare un recupero:

  1. La card della dose D+1 mostra: "gap: +120 min" (es. 2 ore di ritardo accumulato)
  2. L'utente tocca il gap e imposta un recupero (es. 60 min)
  3. Il sistema:
     a. Sottrae il recupero dall'ora ricalcolata: nuova_ora_D+1 = ora_ricalcolata - 60 min
     b. Salva recupero_minuti = 60 sulla dose D+1
     c. Riprogramma la notifica
  4. Quando la dose D+1 viene presa:
     a. Calcola il gap residuo: gap_residuo = gap_precedente - recupero_applicato + nuovo_delta
     b. Il gap residuo viene propagato alla dose D+2
  5. Quando gap_residuo raggiunge 0, la catena è riallineata all'orario base
```

**Dominio del totale di recupero (deviazione `s.6.264`).** Il dominio naturale e `0..gap_minuti`. **Lo zero e un valore legittimo e significa reset**: `ora_ricalcolata` torna alla ricalcolata originale. Un totale vero pari a zero deve essere rappresentabile, altrimenti il record non puo dire *nessun recupero applicato* dopo che uno ne era stato applicato (M3).

### 4.4 Esempio concreto — Ricalcolo semplice
- Prontinal aerosol: intervallo 8h, dosi alle 12:30, 20:30, 23:30 (3 dosi)
- Se dose 1 presa alle 13:00 (ritardo +30 min):
  - Dose 2 ricalcolata: 13:00 + 8h = 21:00 (era 20:30), gap = +30 min
  - Dose 3 resta invariata finché dose 2 non viene effettivamente presa
- Se dose 2 poi presa alle 21:15 (ritardo +15 min su 21:00 ricalcolata):
  - Dose 3 ricalcolata: 21:15 + 8h = 05:15 del giorno dopo

### 4.5 Esempio concreto — Recupero gap
- Farmaco A: intervallo 8h, dosi previste alle 08:00, 16:00, 00:00
- Dose 1 presa alle 10:00 → delta = +120 min, gap = +120 min
- Dose 2 ricalcolata: 10:00 + 8h = 18:00 (era 16:00), gap mostrato: +120 min
- L'utente imposta recupero = 60 min sulla dose 2:
  - Dose 2 anticipata: 18:00 - 60 min = **17:00**, recupero_minuti = 60
  - La notifica suona alle 17:00
- Dose 2 presa alle 17:00 (in orario rispetto al ricalcolo con recupero):
  - delta su ora_ricalcolata_con_recupero = 0
  - gap residuo = 120 - 60 + 0 = **+60 min** (ancora 1h da recuperare)
- Dose 3 ricalcolata: 17:00 + 8h = 01:00 (era 00:00), gap mostrato: +60 min
- L'utente imposta recupero = 60 min sulla dose 3:
  - Dose 3 anticipata: 01:00 - 60 min = **00:00** → riallineata all'orario base originale
  - gap residuo = 0 → catena riallineata

### 4.6 Vincoli di sicurezza sul recupero
- Il recupero non può superare il gap accumulato (non si può anticipare oltre l'orario base originale)
- Il recupero non può ridurre l'intervallo sotto un minimo di sicurezza (es. il 50% dell'intervallo nominale — per un farmaco ogni 8h, l'intervallo minimo con recupero è 4h). Questo parametro è configurabile per farmaco nella tabella `farmaci` come campo aggiuntivo `intervallo_minimo_ore`

### 4.7 Endpoint transitions state-machine (NUOVO in v1.5)

A partire da v3.2.0-alpha.4 (F3-S3-beta CP1) il backend espone 4 endpoint command-based dedicati che applicano transizioni atomiche sullo stato delle righe `log_assunzioni`. Tutti nested sotto `/api/farmaci/{farmaco_id}/log/` (coerenti con `/presa` esistente), scoped utente+farmaco via `_verify_farmaco_ownership` + `Depends(get_current_user)`. Range data ±31gg enforced (anti-unbound). `SELECT FOR UPDATE` su riga slot + transaction `commit`/`rollback`.

**Matrice transitions ammesse (Q1 ratificata par.11.G-S3):**

| Endpoint | Stato sorgente ammesso | Stato destinazione | Side effect |
|---|---|---|---|
| `POST /saltata` | `prevista` \| `ricalcolata` \| (no row) | `saltata` | NO propagazione gap (Q-RES-1). Azzera `recupero_minuti` restituendo lo spostamento a `ora_ricalcolata` nella stessa `UPDATE` (`s.6.268`). |
| `POST /sospesa` | `prevista` \| `ricalcolata` \| (no row) | `sospesa` | NO propagazione; sorgente `presa` rifiutata 409 (Sub-Q-NEW.2). Azzera `recupero_minuti` restituendo lo spostamento a `ora_ricalcolata` nella stessa `UPDATE` (`s.6.268`). |
| `POST /undo` | `presa` \| `saltata` \| `sospesa` | `prevista` o `ricalcolata` (se `ora_ricalcolata IS NOT NULL`) | Audit suffix `[undo TS]` appended a `note`. Rollback D+1 SOLO se `presa` su farmaco `intervallo` con D+1 `ricalcolata` (Q1). Azzera `recupero_minuti` restituendo lo spostamento a `ora_ricalcolata` nella stessa `UPDATE` (`s.6.268`). |
| `POST /recupero` | `ricalcolata` | `ricalcolata` (con `ora_ricalcolata` ridotta) | Vincoli: `recupero_minuti <= row.gap_minuti` (no overshoot) + `nuova ora_ricalcolata >= TIMESTAMP(data, ora_prevista)` (no anticipation, confronto full-datetime). Sottrazione con semantica **ASSOLUTA** (deviazione `s.6.263`): `recupero_minuti` e il **totale cumulato** applicato alla dose, non un incremento. Ogni chiamata ricalcola lo spostamento dal totale nuovo e da quello precedente nella stessa `UPDATE`, e non sottrae dallo orario corrente; la forma relativa era corretta per una applicazione sola, che e il caso normato da 4.3, e alla ripetizione falsificava il record (M3). Tipo DATETIME, non `SUBTIME`. Full-datetime perché `ora_ricalcolata` è DATETIME (v04, s.6.247) e può cadere oltre la mezzanotte: un confronto time-of-day rifiuterebbe erroneamente recuperi legittimi su ricalcoli cross-midnight. `intervallo_minimo_ore` deferred F3-S3-gamma+ (TODO) |

**Invariante di coppia `ora_ricalcolata` / `recupero_minuti` (deviazione `s.6.268`).** Ogni transizione che scrive `recupero_minuti` deve spostare `ora_ricalcolata` di `(rec_old - rec_new)` minuti **nella stessa `UPDATE`**, con `rec_old` letto sotto lo stesso `FOR UPDATE` e passato come parametro, mai letto inline a destra: MySQL valuta le assegnazioni da sinistra a destra su valori gia aggiornati. **Fail-safe non derogabile:** `NULL + INTERVAL` resta `NULL`, quindi una riga priva di tempo ricalcolato non ne acquista uno e la transizione **prosegue**; sopprimerla per mancanza di informazione sarebbe M2. La clausola vale su TUTTE le transizioni, comprese `/saltata`, `/sospesa` e `/undo`, che la tabella qui sopra non nominava.

**Ogni logWrite deve rappresentare una transizione intenzionale** (deviazioni `s.6.253` per `applySalto`, `s.6.260` per `applyRipristino`). In un dispatch per stato, una logWrite che porta uno stato **invariato** e semanticamente ambigua e viene instradata su `/undo`: le patch per soli campi accessori restano nel piano e non generano scrittura di registro.

**Transizioni laterali bloccate (Q-RES-3):** `saltata ↔ sospesa` richiedono `/undo` intermedio (HTTP 409). Idempotent block per stato sorgente == stato destinazione su `/saltata` e `/sospesa` (409).

**Status code uniformi:**
- 201 Created per `/saltata` + `/sospesa` (UPSERT semantica "transition registered")
- 200 OK per `/undo` + `/recupero` (modifica stato esistente)
- 404 NOT_FOUND per farmaco non-owned, riga slot mancante (`/undo`/`/recupero`)
- 409 CONSTRAINT_VIOLATION per: stato sorgente invalido, idempotent block, range data fuori ±31gg, vincoli `/recupero` (eccesso gap, anticipo oltre base, no_gap)

**Convenzione audit `/undo`:** suffix `[undo YYYY-MM-DDTHH:MM:SSZ]` UTC appended a `note`. Se `len(note + suffix) > 200` (DDL VARCHAR(200)), il contenuto user viene troncato preservando il suffix audit (Sub-Q-DRAFT-1 = A).

**Scope minimal `/recupero` (Q5):** 1 dose target, no cascata D+1..D+N. Propagazione gap_residuo a D+2 avviene quando D+1 viene `/presa` (algoritmo sez. 4.2 invariato).

<!-- SENTINEL_SPEC_S6254_P20 -->
### 4.8 Generazione occorrenze e confine di inizio terapia (NUOVO v1.16 -- deviazione s.6.254, P20)

**Motivazione (osservazione pilota par.198-quater).** Le dosi con orario antecedente l'inizio effettivo della terapia comparivano in Oggi/CSV marcate come arretrate, risultando fuorvianti (in particolare per utenti anziani). Questa sezione definisce il confine temporale che filtra le occorrenze generate.

**Confine `T_inizio` (per farmaco, immutabile).** Per ogni farmaco si calcola una soglia `T_inizio` **una sola volta**, confrontando `data_inizio` con `DATE(created_at)` (il *giorno di inserimento del record*, **mai** `CURDATE()`):

| Relazione | `T_inizio` |
|---|---|
| `data_inizio > DATE(created_at)` | mezzanotte (`00:00`) di `data_inizio` |
| `data_inizio = DATE(created_at)` | `created_at` (istante, con ora) |
| `data_inizio < DATE(created_at)` | mezzanotte (`00:00`) di `data_inizio` |

La valutazione su `DATE(created_at)` (non sulla data corrente) rende `T_inizio` **stabile nel tempo**: una dose esclusa resta esclusa a ogni riapertura, senza riaffiorare il giorno successivo.

**Regola di visibilita.** Un'occorrenza con timestamp `T_dose = (data, ora_prevista)` e generata/visibile **se e solo se** `T_dose >= T_inizio`.

**Riferimento dell'ora (opzione X ratificata).** Nel ramo inizio = giorno di inserimento l'ora del confine proviene da `created_at`. `data_inizio` resta di tipo `DATE` (par.3.1): **nessuna modifica di schema, nessuna migrazione**. Assunzione documentata: l'ora di inizio terapia coincide con l'ora di inserimento nel sistema (vero per l'inserimento contestuale all'avvio terapia, caso d'uso del pilota).

**Livello di applicazione (opzione G ratificata).** Il filtro agisce alla **generazione** delle occorrenze (a monte), non alla presentazione. Conseguenza: coerenza automatica e simultanea su tutte le superfici -- Oggi (par.5.2), Export CSV/JSON (par.7), Log/Storico, notifiche push (par.6) -- con **un solo punto di applicazione**. Si evita cosi la replica del filtro per-vista e il rischio di drift cross-path (cfr. pattern par.6.205: un'invariante applicata a un percorso e non agli altri).

**Ortogonalita al `tipo_frequenza`.** Il confine e un filtro sulla materializzazione delle occorrenze e si applica in modo uniforme a `intervallo`, `fisso` e `fisso_date`, indipendentemente dalla logica di ricalcolo (par.4.2-4.7), che resta invariata.

**Impatto su P14 (avviso dosi trascorse).** L'avviso opera solo su dosi con `T_dose >= T_inizio`: spariscono gli avvisi spuri sulle dosi antecedenti l'inizio; l'avviso resta valido per le dosi legittimamente dovute (terapia gia in corso, ramo `data_inizio < DATE(created_at)`). In fase di implementazione P14 va ridimensionata di conseguenza.

**Esempi.**
- *Inizio oggi, inserimento a meta giornata.* Inserimento 8 lug ore 12:00, `data_inizio = 8 lug` (= giorno di inserimento), dosi previste 08:00 e 20:00 -> `T_inizio = 8 lug 12:00`. La dose 08:00 e esclusa (`08:00 < 12:00`); la dose 20:00 compare (`20:00 >= 12:00`).
- *Terapia gia in corso (storico).* Inserimento 8 lug di un farmaco con `data_inizio = 6 lug` -> `T_inizio = 6 lug 00:00`. Tutte le dosi dal 6 lug compaiono e sono registrabili a posteriori (aggiornamento di uno storico mai registrato).
- *Inizio futuro.* `data_inizio = 10 lug`, inserimento 8 lug -> `T_inizio = 10 lug 00:00`. Nessuna occorrenza prima del 10 lug.

**Nota implementativa (fase codice, sessione successiva).** La generazione occorrenze (frontend `rebuildPlan` / logica di piano) va verificata empiricamente prima della modifica (dump sorgente, Lesson #27), in particolare che sappia materializzare occorrenze retroattive fino a `data_inizio` nel ramo storico.


<!-- SENTINEL_SPEC_S6255_P15B -->
**Canone della cadenza estesa (deviazione s.6.255, P15-B).** **Le cadenze multiple di 24 ore sono cadenze a giorni civili a orario fisso.** Un `intervallo_ore` multiplo esatto di 24 individua la dose per data di calendario, non per ore trascorse: "ogni 2 giorni alle 08:00" e la dose delle 08:00 di ogni secondo giorno civile, quali che siano le ore reali intercorse attraverso una transizione di ora legale (47 o 49). Le cadenze non multiple di 24 ore conservano l'aritmetica a stride in millisecondi (ramo storico, popolazione di produzione nulla). Sede unica del canone nel codice: `src/domain/extendedStride.js` (P15-A).

**DEV-2 -- ancore-pasto in intervallo esteso (deviazione s.6.255, P15-B).** Per `intervallo_ore > 24` la modalita "ai pasti" **e ammessa**: una riga di `orari_base` puo avere `ancora_riferimento` diverso da `assoluto`. In tal caso `offset_minuti` e **forzato a 0** e non e editabile: la UI sostituisce il campo di input con un testo statico e lo stato del form normalizza il valore a 0. La regola vale in modo uniforme su tutte le ancore-pasto (`sveglia`, `colazione`, `pranzo`, `cena`, `sonno`).

---

## 5. Interfaccia Utente

### 5.1 Viste principali (barra inferiore)
1. **Oggi** — Vista giornaliera con timeline farmaci (vista principale, cfr. mockup)
2. **Log** — Storico assunzioni con filtri per data e farmaco *(implementata in v3.1.0 standalone, vedi par.11)*
3. **Export** — Esportazione dati in CSV o JSON *(in v3.1.0 standalone: CSV con separatore `;` IT-Excel-friendly, BOM UTF-8; JSON deferred scope futuro; vedi par.11)*
4. **Config** — Gestione farmaci, orari base, intervalli, relazione pasti, **profili giornalieri**

### 5.2 Card farmaco (vista Oggi)
Ogni farmaco è rappresentato da una card con:
- **Nome** e **dosaggio** (es. "Medrol 16mg")
- **Funzione** sintetica (es. "Cortisone broncospasmo · 1ª dose · ogni 6h")
- **Badge relazione pasto** con codifica colore:
  - Corallo: "stomaco pieno"
  - Ambra: "30 min prima colazione", "lontano dai pasti"
  - Verde: "prima di colazione"
  - Grigio: "durante colazione", "durante pasto", "durante/dopo cena"
  - Viola: "indifferente"
- **Badge ricalcolo** (blu): visibile solo se l'orario è stato ricalcolato (es. "anticipata -50 min")
- **Badge gap** (rosso/arancio): visibile se c'è un gap accumulato non recuperato (es. "gap +120 min"). Tappabile per impostare il recupero.
- **Pulsante "presa"** — cerchio a destra, tap per registrare
- **Ora effettiva + delta** — visibili dopo il tap (es. "10:05 | +5 min" oppure "in orario")

> **Confine di inizio terapia (par.4.8).** Le occorrenze mostrate nella vista Oggi sono limitate al confine `T_inizio` del farmaco: non compaiono dosi con orario antecedente l'inizio effettivo della terapia. <!-- SENTINEL_SPEC_S6254_REF52 -->

### 5.3 Stati visivi delle card

La UI distingue tre livelli temporali e tre stati finali, per un totale di sei stati visivi:

| Stato | Condizione | Bordo sinistro | Sfondo | Indicatore |
|---|---|---|---|---|
| Presa | `stato = 'presa'` | Verde 3px | Verde chiaro | Check verde + ora + delta |
| Prossima | dose entro i prossimi 30 min | Ambra 3px | Ambra chiaro | Countdown "tra X min" + pulsante grande |
| In attesa | dose oltre i 30 min futuri | Grigio sottile | Bianco | Orologio grigio |
| In ritardo | dose passata da più di `TOLLERANZA_MIN` minuti, non presa | Arancio 3px, pulse | Arancio chiaro | Badge "⏰ in ritardo" |
| Saltata | `stato = 'saltata'` | Rosso 3px | Rosso chiaro | Label "SALTATA", opacità ridotta |
| Sospesa | `stato = 'sospesa'` | Grigio medio 3px | Grigio chiaro | Label "SOSPESA", opacità ridotta |

Le dosi con `stato = 'ricalcolata'` non sono uno stato visivo a sé: ereditano lo stato temporale (In attesa / Prossima / In ritardo) in base al loro `ora_ricalcolata`, e mostrano un badge blu aggiuntivo con l'indicazione del ricalcolo.

**`TOLLERANZA_MIN`** (valore: 15 minuti) è la finestra di tolleranza centrata sull'orario programmato: all'interno la dose si considera "in orario", oltre la soglia passata diventa "in ritardo". È la stessa soglia usata per colorare il delta come verde (dentro tolleranza) o rosso (oltre).

### 5.4 Raggruppamento orario
Le card sono raggruppate per fascia oraria con etichetta (es. "ORE 10:00 — COLAZIONE", "ORE 21:00 — DOPO CENA"). Il contesto pasto è derivato dal campo `descrizione_momento` della tabella `orari_base`.

### 5.5 Contatori in header
- Badge verde: "X presi"
- Badge rosso: "X saltati" (solo se > 0)
- Badge grigio medio: "X sospesi" (solo se > 0)
- Badge arancio: "X in ritardo" (solo se > 0)
- Badge ambra: "tra X min" (per la dose prossima)
- Badge grigio: "X restanti"

---

## 6. Notifiche Push

### 6.1 Requisiti
- La PWA deve richiedere il consenso alle notifiche al primo avvio
- Ogni dose programmata genera una notifica all'ora prevista (o ricalcolata)
- La notifica mostra: nome farmaco, dosaggio, relazione pasto
- Suono: beep standard del sistema

### 6.2 Limitazioni iOS
- Le notifiche push PWA funzionano da iOS 16.4+
- Richiedono che l'app sia installata sulla home screen (non basta il browser)
- Il service worker deve essere registrato e attivo

### 6.3 Android
- Supporto notifiche PWA nativo su Chrome/Edge con service worker attivo
- Installazione da home screen consigliata per promemoria affidabili

---

## 7. Export

### 7.1 Formati supportati
- **CSV** — una riga per ogni evento di assunzione, colonne: data, farmaco, dose_numero, ora_prevista, ora_effettiva, delta_minuti, stato, note
- **JSON** — struttura gerarchica: per data → per farmaco → array dosi

### 7.2 Filtri
- Range date (da/a)
- Singolo farmaco o tutti
- Per stato: solo presi / solo saltati / solo sospesi / tutti

> **Confine di inizio terapia (par.4.8).** L'export riflette le sole occorrenze con `T_dose >= T_inizio`, coerentemente con la vista Oggi: le dosi antecedenti l'inizio terapia non sono esportate. <!-- SENTINEL_SPEC_S6254_REF7 -->

---

## 8. Stack Tecnologico Dettagliato

### 8.1 Frontend
- React 18+ (JSX, hooks)
- Tailwind CSS (utility classes core, no compiler)
- Service Worker per notifiche push e cache offline
- Fetch API per comunicazione con backend

### 8.2 Backend
- Python 3.12+
- FastAPI
- mysql-connector-python per query SQL dirette (NO ORM)
- Uvicorn come server ASGI
- MariaDB 10.x o 11.x

### 8.3 Ambiente di sviluppo
- Mac Studio Ultra, macOS Tahoe 26.0.1
- Python e MariaDB già disponibili o facilmente installabili
- Editor: qualsiasi (il codice sarà generato nelle sessioni Claude)

---

## 9. API REST — Endpoint principali

**Nota auth multi-tenant Fase 3 v3.2.0 (NUOVO in v1.4):** tutti gli endpoint CRUD da v3.2.0 richiedono header `X-User-Token: <uuid>` validato middleware FastAPI `Depends(get_current_user)`. Permission check su tabella `permessi` enforced per ogni operazione che tocca dati cross-utente. Endpoint admin-only verificano `permessi.permesso='admin'` su `caregiver_id` corrente.

**Nota idempotenza offline `client_op_id` (NUOVO in v1.17, deviazione s.6.257):** i 5 endpoint verbi log (`/presa`, `/saltata`, `/sospesa`, `/undo`, `/recupero`) accettano il campo opzionale `client_op_id` (targa del tocco, UUID v4, sez. 14.6). Dedupe primo-gesto in-transazione: targa gia vista -> 200 con `dedup: true` + stato attuale della riga; targa nuova -> applica e scrive la targa sulla riga. Payload senza targa restano validi (retrocompatibilita totale). Perimetro: solo i 5 verbi del registro dosi; le terapie restano fuori (offline non si scrivono, ratifica (c) sez. 14.1; online i PUT full-replace sono gia rigiocabili senza danno).

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | /api/farmaci | Lista farmaci attivi |
| POST | /api/farmaci | Aggiungi farmaco |
| PUT | /api/farmaci/{id} | Modifica farmaco |
| DELETE | /api/farmaci/{id} | Disattiva farmaco (soft delete) |
| GET | /api/oggi | Piano giornaliero con stati aggiornati |
| POST | /api/assunzione | Registra "presa" (trigger ricalcolo) |
| POST | /api/assunzione/{id}/recupero | Imposta recupero gap per una dose futura |
| POST | /api/farmaci/{id}/log/presa | (NUOVO in v1.5, Fase 3 v3.2.0-alpha.3) Registra `presa` atomica + nested ricalcolo D+1 opzionale |
| POST | /api/farmaci/{id}/log/saltata | (NUOVO in v1.5, Fase 3 v3.2.0-alpha.4) Registra `saltata` (vedi sez. 4.7 transitions) |
| POST | /api/farmaci/{id}/log/sospesa | (NUOVO in v1.5, Fase 3 v3.2.0-alpha.4) Registra `sospesa` (sorgente `presa` rifiutata) |
| POST | /api/farmaci/{id}/log/undo | (NUOVO in v1.5, Fase 3 v3.2.0-alpha.4) Rollback transizione + audit `[undo TS]` |
| POST | /api/farmaci/{id}/log/recupero | (NUOVO in v1.5, Fase 3 v3.2.0-alpha.4) Riduce `ora_ricalcolata` di `recupero_minuti` |
| GET | /api/log?data_da=...&data_a=...&farmaco_id=... | Storico con filtri |
| GET | /api/export?formato=csv&data_da=...&data_a=... | Export dati |
| GET | /api/farmaci/{farmaco_id}/orari | Orari base di un farmaco (nested, scoped utente+farmaco) |
| PUT | /api/farmaci/{farmaco_id}/orari | Bulk-replace atomico orari base (DELETE+INSERT; array vuoto = azzera) |
| GET | /api/profili | Lista profili giornalieri |
| POST | /api/profili | Crea nuovo profilo |
| PUT | /api/profili/{id} | Modifica profilo |
| PUT | /api/profili/{id}/attiva | Attiva un profilo (disattiva gli altri, ricalcola tutti gli orari_base) |
| GET | /api/utenti | Lista utenti gestiti dall'auth-user (admin/caregiver, NUOVO in v1.4) |
| POST | /api/utenti | Crea utente paziente (invite-only, admin-only, NUOVO in v1.4) |
| DELETE | /api/utenti/{id} | Soft delete utente + cascade FK opzionale (admin-only, NUOVO in v1.4) |
| GET | /api/permessi | (ESPANSO in v1.6, Fase 3 v3.2.0-alpha.5, F3-S4-beta) Lista permessi visibile a `current_user` con scope bidirezionale (`caregiver_id=current OR paziente_id=current`), `ORDER BY created_at DESC` audit. 200 |
| POST | /api/permessi | (ESPANSO in v1.6) Grant nuovo permesso admin-on-paziente. Body: `{caregiver_id, paziente_id, permesso, notifiche_caregiver_attive?}`. 201 con response model + UNIQUE catch 409 + FK violation 404 + Pydantic Literal `'read'|'write'|'admin'` rejection 422 |
| PUT | /api/permessi/{id} | (ESPANSO in v1.6) Update permesso e/o `notifiche_caregiver_attive` admin-on-paziente. UPDATE dinamico per-field. Body vuoto -> 200 idempotent no-op. 200 success + 404 not found + 403 non-admin |
| DELETE | /api/permessi/{id} | (ESPANSO in v1.6) Revoke permesso admin-on-paziente HARD DELETE row (frees UNIQUE constraint per re-grant futuro). Self-permission protection (`caregiver_id == paziente_id`) -> 409. 200 success + 404 not found + 409 self-protection + 403 non-admin |
| POST | /api/export/snapshot | Export JSON snapshot completo per `utente_id` (Q-IMPORT.4, NUOVO in v1.4) |
| POST | /api/import/preview | Dry-run preview import diff (Q-SAFETY.1 obbligatoria, NUOVO in v1.4) |
| POST | /api/import/snapshot | Apply import Merge/Replace post-preview (Q-IMPORT.2, NUOVO in v1.4) |

---

## 10. Dati iniziali — Terapia attuale di Roberto

### 10.1 Profili giornalieri preconfigurati
| Profilo | Sveglia | Colazione | Pranzo | Cena | Sonno | Attivo |
|---|---|---|---|---|---|---|
| Standard | 07:00 | 07:30 | 13:00 | 20:30 | 23:30 | Sì |
| Nottambulo | 10:00 | 10:30 | 14:30 | 21:30 | 02:00 | No |

### 10.2 Farmaci cronici (senza data_fine)
| Nome | Funzione | Frequenza | Intervallo | Dosi/die | Rel. pasto | Àncora | Offset | Orari (profilo Standard) |
|---|---|---|---|---|---|---|---|---|
| Pantorc 40mg | Gastroprotezione | fisso | — | 1 | prima (30 min prima colazione) | colazione | -30min | 07:00 |
| Duoresp Spiromax 1 puff | Broncodilatatore + antinfiammatorio | fisso | — | 1 | prima di colazione | colazione | 0min | 07:30 |
| Giant 20/5mg | Antipertensivo | fisso | — | 1 | durante colazione | colazione | 0min | 07:30 |
| Olevia 1000mg | Omega-3 | intervallo | 12.0 | 2 | durante pasto | colazione, cena | 0min, 0min | 07:30, 20:30 |
| Normast 600mg | Neuroprotettore | fisso | — | 1 | durante colazione | colazione | 0min | 07:30 |
| Movicol | Regolarità intestinale | fisso | — | 1 | lontano dai pasti | colazione | +150min | 10:00 |
| Ezevast 10/20mg | Statina (colesterolo) | fisso | — | 1 | durante/dopo cena | cena | 0min | 20:30 |
| Lyrica 75mg | Dolore neuropatico | fisso | — | 1 | indifferente | cena | 0min | 20:30 |

### 10.3 Farmaci temporanei (con data_fine) — Bronchite acuta VRS, aprile 2026
| Nome | Funzione | Frequenza | Intervallo | Dosi/die | Rel. pasto | Àncora 1ª dose | Offset | Dose 1 | Dose 2 | Dose 3 | Inizio | Fine |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Medrol 16mg | Cortisone broncospasmo | intervallo | 6.0h | 2 | stomaco pieno | colazione | 0min | 07:30 | 13:30 | — | 15/04/2026 | 19/04/2026 |
| Prontinal aerosol 800mcg | Corticosteroide inalatorio | intervallo | 8.0h | 3 | indifferente | colazione | +30min | 08:00 | 16:00 | 00:00 | 14/04/2026 | 18/04/2026 |
| Levotuss 10ml | Sedativo tosse | intervallo | 8.0h | 3 | indifferente | colazione | +30min | 08:00 | 16:00 | 00:00 | 14/04/2026 | 16/04/2026 |

### 10.4 Nota sullo schema scalaggio Medrol
Lo scalaggio cortisonico (riduzione progressiva delle dosi) è gestito come modifica manuale degli orari_base/dosi nel tempo — la v1 non implementa automatismi di scalaggio. L'utente modifica il farmaco in Config quando cambia dose.

---

## 11. Roadmap di Sviluppo

> **Stato roadmap al rilascio v3.1.0 (17 maggio 2026):** la Fase 2 è completata e rappresenta il rilascio standalone v3.1.0. La Fase 1 backend e la Fase 4 estensioni sono formalmente fuori scope v3.1.0. La Fase 3 originaria è stata splittata: la vista Log e l'export sono stati riassorbiti nella Fase 2 v3.1.0 (implementazione standalone Dexie locale), mentre lo swap repository ApiRepository resta out-of-scope insieme al backend di Fase 1. Vedi par.11.5 sotto per il dettaglio.

### Fase 1 — Backend + DB (1 sessione) — ⏸ OUT-OF-SCOPE rilascio v3.1.0
Prerequisiti formalmente fuori scope rilascio v3.1.0. Riapribile in sessione futura via `PharmaTimer_Changelog_Fase2.md` par.11.D (prompt pre-frozen Sessione Fase 3 Step 1 esecutiva, scaffolding backend) + ratifica iniziale "stato corrente è v3.1.0 PWA standalone, riapro Fase 1 backend".

Contenuti originariamente pianificati (mantenuti per riferimento futuro):
1. Script SQL per creazione schema MariaDB (inclusa tabella `profilo_utente`)
2. Seed dei dati iniziali (profili + farmaci Roberto)
3. FastAPI con endpoint CRUD farmaci + orari + profili
4. Endpoint /api/oggi con logica di generazione piano giornaliero (calcolo orari da profilo attivo + offset)
5. Endpoint /api/assunzione con logica ricalcolo
6. Endpoint /api/profili/{id}/attiva con ricalcolo automatico di tutti gli orari_base

### Fase 2 — Frontend PWA (multi-sessione, vedi Changelog Fase 2) — ✅ COMPLETATA in v3.1.0
La Fase 2 sviluppa la PWA React **standalone** con persistenza locale su IndexedDB, preparata per swap futuro verso il backend FastAPI+MariaDB. Chiusa con rilascio v3.1.0 (17 maggio 2026, tag `v3.1.0`). Passi ad alto livello:
1. Scaffolding Vite + React + Tailwind + Router + PWA base ✅
2. Schema Dexie + seed idempotente ✅
3. Repository pattern (interfaccia + LocalRepository) ✅
4. Dominio puro: planBuilder + recalc + test Vitest ✅
5. Stato globale (Context + reducer) ✅
6. Hook `useNow` (tempo reale / simulato in dev) ✅
7. Vista Oggi completa ✅
8. Vista Config (profili + farmaci + orari + nome utente) ✅
9. Notifiche locali (Notification API + scheduling) — anticipato rispetto alla pianificazione originale ✅
10. Service worker + manifest definitivo + icone ✅
11. Polish, QA, accessibilità, gestione errori ✅
12. *(aggiunti v3.1.0)* Vista Log con filtri (s.6.215, Sessione N+2 par.11.U) + Export CSV con separatore `;` IT-Excel-friendly (s.6.216, Sessione N+3 par.11.V) ✅

Il dettaglio completo è in `PharmaTimer_Changelog_Fase2.md`.

### Fase 3 — Integrazione backend + viste aggiuntive — split tra v3.1.0 e out-of-scope
La Fase 3 originaria prevedeva 3 voci. Nel rilascio v3.1.0 sono state ridistribuite:

1. Swap LocalRepository → ApiRepository — ⏸ OUT-OF-SCOPE rilascio v3.1.0 (richiede Fase 1 backend, riapribile insieme via par.11.D Changelog Fase 2)
2. Vista "Log" con storico e filtri — ✅ riassorbita in Fase 2 v3.1.0 (Sessione N+2 par.11.U, implementazione standalone Dexie locale)
3. Vista "Export" (CSV/JSON) — ✅ riassorbita in Fase 2 v3.1.0 (Sessione N+3 par.11.V, solo CSV con separatore `;` IT; JSON deferred opportunistico v3.1.x)

### Fase 4 — Estensioni (future) — ⏸ OUT-OF-SCOPE rilascio v3.1.0
Scope futuro opportunistic non pianificato. Non c'è prompt pre-frozen di apertura: ogni voce richiederà sessione dedicata di analisi-first se riaperta.

- Parametri vitali (SpO2, pressione, temperatura, FC)
- Grafici andamento aderenza terapeutica
- Accesso remoto via Tailscale/VPN
- Multi-utente full N-utenti caregiver flow (gestione 1 owner caregiver + N-1 pazienti, Fase 3 v3.2.0 originalmente posizionato Fase 4, riapertura in Fase 3 vedi par.11.D-rev v3.1 Changelog)
- Integrazione con Apple Health (richiede app nativa)

---

## 11.5 Stato rilascio v3.1.0 (NUOVO in v1.3)

### 11.5.1 Funzionalità incluse v3.1.0

PharmaTimer v3.1.0 è una **PWA standalone** distribuita via GitHub Pages all'URL `https://timegates-code.github.io/pharmatimer/`, installabile su iPhone (iOS 16.4+ via Safari) e Android (Chrome). Persistenza tutta locale via Dexie/IndexedDB.

Funzionalità chiuse:
- Vista **Oggi** con timeline giornaliera + raggruppamento per momento + sticky header + scroll-to-now-anchor + hint piano futuro pre-data_inizio + 6 stati visivi card
- Vista **Config** completa con sub-tab Farmaci/Profili/Notifiche/Impostazioni + CRUD farmaci/profili + onboarding 2-step con guida HTML
- Vista **Log** read-only con filtri data + farmaco singolo/tutti (Sessione N+2 par.11.U, s.6.215)
- Export **CSV** scaricabile via Blob+download, separatore `;` IT-Excel-friendly, BOM UTF-8, riusa filtri Log (Sessione N+3 par.11.V, s.6.216)
- Notifiche locali in-app + service worker autoUpdate via vite-plugin-pwa con UpdatePrompt UI
- Tema chiaro/scuro/automatico
- Profili giornalieri multipli con offset rispetto ad àncore (sveglia, colazione, pranzo, cena, sonno)
- Algoritmo recalc + gap recovery come da sez. 4
- Guida utente HTML (`/pharmatimer/guide.html`) con 6 sezioni testuali + revisione copy v3.0.1-rc.4 (Sessione 18 s.6.214)

### 11.5.2 Out-of-scope esplicito v3.1.0

Le seguenti voci sono formalmente fuori scope rilascio v3.1.0 e non saranno implementate senza riapertura esplicita in sessione futura dedicata:

- **Fase 1 Backend** FastAPI + MariaDB self-hosted (riapribile via par.11.D Changelog Fase 2)
- **Swap LocalRepository → ApiRepository** (dipende da Fase 1, riapribile insieme)
- **Fase 4 Estensioni** complete: parametri vitali, grafici aderenza, Apple Health, multi-utente full N-utenti caregiver flow (assorbito Fase 3 v3.2.0), accesso remoto Tailscale
- **Sync multi-device** (conseguenza out-of-scope Fase 1)
- **Backup automatico cloud** (Export CSV manuale è l'unico meccanismo di portabilità in v3.1.0)
- **Import dati** (export-only in v3.1.0; import deferred scope futuro opportunistic)
- **Export JSON** (solo CSV in v3.1.0; JSON deferred scope futuro opportunistic)
- **Web Push notifications** persistenti server-side (richiede Fase 1 backend; le notifiche v3.1.0 sono solo locali in-app via Notification API)
- **Cattura screenshot reali in guide.html** (placeholder rimossi in s.6.214, screenshot reali sessione dedicata futura)
- **Rinominazione sub-tab "Impostazioni"** per evitare collisione naming (sub-AMB Q4-bis Sessione 18 deferred opportunistic)

### 11.5.3 Known limitations v3.1.0

A chiusura rilascio v3.1.0 sono residui circa **12 finding non bloccanti** identificati nel registry `PharmaTimer_Changelog_Fase2.md` par.22.52 + estensioni (par.22.62, par.22.66, par.22.67). Sono accettati come polish post-rilascio (scope futuro opportunistic v3.1.x) per applicazione del principio Q-CLEAN.5=a (registry chiuso "as-is"): i finding emergono naturalmente come il prodotto si evolve, non possono essere "tutti chiusi" senza diventare ricorsivo.

Tipologie rappresentative (lista esaustiva nel Changelog par.22.52 + carry-forward):

- **UX residui**: comportamenti minori (UX-N16 post-Salva farmaco resta su tab Farmaci senza auto-redirect Oggi — comportamento utile multi-add da documentare come scelta deliberata; UX-N18 sticky link "Torna all'app" footer guide.html mancante; affordance e copy minori)
- **iOS-specifici** (iOS-N1, iOS-N2): isolamento storage IndexedDB tra browser tab e PWA standalone Safari (comportamento Apple WebKit atteso); persistenza Service Worker post-rimozione PWA standalone (no cleanup automatico Apple)
- **Doc drift** (drift-doc-N4/N5/N12/N13): inconsistenze documentali non bloccanti (es. import duplicati `state/selectors.js` in `OggiView.jsx` funzionalmente innocui per ES module deduplication)
- **Discovery** (discovery-N6, discovery-N7): scoperte di comportamento da chiarire (es. `data_inizio` default `today` invece di `today+1` come da Q-S6 par.22.40)
- **Bug deferred runtime visivi**: `par.6.119` cross-midnight visual (dose ricalcolata cross-midnight resta sotto separator "Oggi" anziché migrare a "Domani" — chiuso codice-side step 11-B AMB-11.B.1 commit `ae33b1f`, ratifica empirica CP6-bis Sessione N+5); `par.6.120` `actions.presa()` ignora `simulated_now` in DevTimeSlider DEV (workaround override esplicito documentato)

### 11.5.4 Riapertura scope post-v3.1.0

Il rilascio v3.1.0 è formalmente chiuso ma il progetto resta architetturalmente riapribile:

- **Patch v3.1.x opportunistic**: sessione dedicata su singolo finding registry promosso da "polish" a "bloccante uso pratico". Pattern par.22.49 / par.22.60 branching-decisione registry-driven.
- **Riapertura Fase 1 backend**: one-liner `Esegui il prompt al par.11.D del Changelog (Sessione Fase 3 Step 1 esecutiva — backend scaffolding + schema + seed + smoke endpoint)` + ratifica iniziale "stato corrente è v3.1.0 PWA standalone, riapro Fase 1". Eventuale rivisitazione sub-AMB F3-S1.A÷H se contesto cambiato (es. stack DB diverso da MariaDB pianificata).
- **Riapertura Fase 4**: sessione di analisi-first dedicata per singola voce (no prompt pre-frozen disponibile).

## 11.6 Architettura multi-tenant Fase 3 (NUOVO in v1.4)

Architettura ratificata conversazione 20/05/2026 post-`PharmaTimer_Changelog_Fase2.md` par.22.75 chiusura. Estende il modello dati single-user Fase 2 a **N utenti** generico (target dimensionamento 6, no hard limit DB) supportando 1 owner caregiver + N-1 pazienti.

### 11.6.1 Naming convention multi-tenant (AMB-NAMING ratificato)

| Livello | Scope | Stato |
|---|---|---|
| **Livello 1** codice/test/spec | Zero etichette relazionali hardcoded. Solo identificatori semantici: `utente_id`, `nome_visualizzato`, `paziente_id`, `caregiver_id`, `utente_target`, `utente_eseguente`. Mai ruoli familiari / gradi di parentela nel codice runtime, test, schema DB, payload Pydantic, endpoint API | **Ratificato by-design Q13-Q17 v3** |
| **Livello 2** UI runtime strings | Zero stringhe hardcoded con etichette familiari. Tutte le label che fanno riferimento ad altri utenti interpolano `{nome_visualizzato}` dal DB. Esempi: toggle Q16 `"Ricevi anche notifiche di {nome_visualizzato}"`, dropdown Q17 `<option>{nome_visualizzato}</option>`, vista Importa `"Importa per: {nome_visualizzato}"` | **Ratificato F3-S4 implementazione** |
| **Livello 3** DB seed values | Campo `nome_visualizzato VARCHAR(50)` libero: l'owner caregiver sceglie la stringa di sua preferenza (nome di battesimo, alias, soprannome, ruolo familiare se vuole). Nessun ENUM ruoli, nessuna validazione anti-etichetta app-side | **Ratificato libero scelta utente** |

### 11.6.2 Scope N-utenti generico

Modello **1 owner caregiver + N-1 pazienti** (no hardcode numero utenti):

- **Owner caregiver**: chi installa il Mini e configura inizialmente l'app. Permesso `admin` su sé stesso + permesso `write` (configurabile) su pazienti gestiti.
- **Pazienti N-1**: utenti gestiti dal caregiver. Permesso `write` solo su `utente_id` proprio (self-permission automatica).
- **Seed F3-S1 minimal**: 1 utente `ruolo='owner'` (nome scelto a configurazione iniziale). Onboarding runtime caregiver-admin aggiunge N-1 pazienti via `POST /api/utenti` con distribuzione token manuale.

### 11.6.3 Dimensionamento target post-rilascio v3.2.0

| Parametro | Valore target | Note |
|---|---|---|
| **Utenti** target 1-2 anni | 6 | range tipico nucleo familiare/conoscenti/persone di cura, no hard limit architettura |
| **Backup retention** | 3 anni mysqldump giornalieri compressi gzip | ~1,6 GB storage stimato a 6 utenti × 3 anni full retention, trascurabile su Mac Mini SSD 256 GB+ |
| **Frequenza sync cross-device** | Refresh on-open (Q-SYNC ratificata) | no polling background, no WebSocket/SSE |
| **DB live size stimato** | ~6 MB/anno totale a 6 utenti | ~1 MB/anno/utente assumendo 5 farmaci × 3 dosi/giorno |

### 11.6.4 Onboarding model

- **Invite-only caregiver admin**: solo owner crea nuovi utenti via endpoint protetto `POST /api/utenti` + distribuisce token `VITE_USER_TOKEN` shared-secret-per-device manualmente (Q15=A ratificata)
- **No self-signup**: zero registration UI accessibile da rete Tailscale privata. Semplifica auth, riflette modello familiare-private, esclude spam/abuse da rete pubblica
- **Revoca utente**: deferred F3-S4 esecutiva (endpoint admin-only `DELETE /api/utenti/{id}` con cascade FK su dati paziente, audit log permanente)

### 11.6.5 Riferimenti cross

- **Schema DB**: sez. 3.1/3.4/3.5/3.6 (4 tabelle esistenti estese con `utente_id` FK) + sez. 3.9/3.10/3.11 (3 tabelle NEW `utenti`+`permessi`+`push_subscriptions`)
- **API endpoint**: sez. 9 (nota auth header `X-User-Token` + 7 endpoint NEW caregiver+import/export)
- **Changelog Fase 2**: par.11.D-rev v3.1 (Q13-Q17 + AMB-NAMING + Q-IMPORT/SAFETY/SYNC ratificate) + par.22.76 (closing sessione naming anonimo) + par.22.75 (closing sessione consolidamento par.11.D-rev v3 precedente)
- **Changelog Fase 3**: par.22.81 (F3-S2 CRUD farmaci) + par.22.82+83 (F3-S3-alpha CRUD orari + log_assunzioni `/presa`) + par.22.84 (F3-S3-beta state-machine `/saltata|/sospesa|/undo|/recupero`) + par.22.85 (N+5.D scope decision F3-S4 split alpha utenti/beta permessi) + par.22.86 (N+5.E-alpha+bis F3-S4-alpha utenti POST+DELETE end-to-end + Lesson #25) + par.22.87 (N+5.E-beta F3-S4-beta permessi end-to-end + Lesson #26)

### 11.6.6 Convenzioni codice backend Fase 3 (NUOVO in v1.6)

Pattern operativi cementati lungo Fase 3 da rispettare in ogni endpoint NEW e in ogni helper backend touch DB:

#### Lesson #25 MANDATORY -- Autocommit pool transaction implicit-then-commit

Il pool `mysql.connector.pooling.MySQLConnectionPool` configurato per backend Fase 3 opera in modalita **autocommit implicit** (verifica empirica par.22.86 N+5.E-alpha-bis CP2-FIX cycle). Conseguenze pratiche per ogni endpoint:

1. **NO `START TRANSACTION` esplicita** per singoli statement INSERT/UPDATE/DELETE. La transazione e implicit on-statement-execute.
2. **`conn.commit()` esplicito MANDATORY** dopo ogni statement INSERT/UPDATE/DELETE. Senza commit esplicito, la transazione resta open (lock row) e fallisce su tentativi successivi.
3. **`conn.rollback()` MANDATORY in `except IntegrityError`** prima di propagare `RepositoryError`. Senza rollback, la transazione resta in stato dirty.
4. **Multi-statement atomic transaction** (es. doppio INSERT auto-permesso self+owner di `POST /api/utenti` par.22.86): usare `START TRANSACTION;` + statement + `COMMIT;` esplicito, OR mantenere pattern implicit-then-commit per statement omogenei (con conn.commit() dopo ultimo statement della catena).
5. **Cursor `dictionary=True` MANDATORY** per response Pydantic model (es. `cursor.cursor(dictionary=True)`). Senza, fetchall ritorna tuple e Pydantic .**dict-unpacking fallisce con TypeError.

#### Lesson #26 MANDATORY -- Pre-emit static analysis su file MOD

Pre-emit (pattern par.22.58 + par.6.118) MANDATORY su file MOD include 3 verifiche aggiuntive (oltre alle baseline SHA-256 + assertion uniqueness count==1 + SENTINEL idempotency_marker):

1. **Import structure verification**: verificare `from MODULE import SYMBOL` come riga top-level esistente disponibile (NON solo grep substring `SYMBOL` nel file -- pattern troppo permissivo che intercetta docstring / local-import dentro function body / commento). Se symbol non disponibile top-level e helper appeso lo usa -> `NameError` runtime (es. cp2-err-N2 par.22.87 dependencies.py `RepositoryError`).
2. **Fixture introspection conftest.py**: verificare nomi fixture esatti pre-emit test (`grep "@pytest.fixture" + def NAME`) NON assumere nomi convenzionali (es. cp1-err-N1 par.22.87 fixture `owner_token` assunto vs reale `seed_owner_test` Tuple[str, int]).
3. **Scope semantics validation**: verificare scope GET/list endpoint pre-design helper test (bidirezionale vs out-going vs admin-only vs scoped current_user). Implementare helper test con il token utente che ha visibilita richiesta dal scope (es. cp2-err-N3 par.22.87 helper `_find_self_permesso_id` ha usato `owner_token` ma scope owner NON include self-permessi altri utenti -> fix `caregiver["token_plain"]`).

#### RepositoryError vocabulary cross-PWA/backend (cementato F3-S4 milestone)

`pharmatimer_api/exceptions.py` espone enum `RepositoryErrorCode` + mapping `_HTTP_STATUS`:

| RepositoryErrorCode | HTTP status | Tipico trigger |
|---|---|---|
| `FORBIDDEN` | 403 | Non-owner su endpoint owner-only (`get_current_owner` assertion) OR non-admin su endpoint admin-on-paziente (`assert_admin_on_paziente` else-branch) |
| `NOT_FOUND` | 404 | SELECT lookup empty + IntegrityError errno 1452 FK violation |
| `CONSTRAINT_VIOLATION` | 409 | IntegrityError errno 1062 UNIQUE violation + business-rule protezioni (DELETE owner-attempt + DELETE self-attempt + DELETE self-permesso) |

Auth-layer middleware `get_current_user` (in `dependencies.py`) ritorna 401 per token invalido/mancante (drift-N44 par.22.86 scope ristretto: auth-layer 401 only, business logic 403/404/409 RepositoryError).

### 11.6.7 Roadmap aggiornata post-F3-S5-alpha milestone (AGGIORNATO in v1.7)

Status F3-S4 (caregiver multi-tenant) **completato end-to-end** v3.2.0-alpha.5 LOCALE:
- F3-S4-alpha utenti (par.22.86 N+5.E-alpha+bis): `POST /api/utenti` owner-only + `DELETE /api/utenti/{id}` owner-only + doppio INSERT auto-permesso self+owner + 3 protezioni DELETE (owner / self / idempotent) + `token_plain` one-shot
- F3-S4-beta permessi (par.22.87 N+5.E-beta): `GET /api/permessi` bidirezionale + `POST` admin-on-paziente + `PUT` idempotent + `DELETE` self-protected + helper `assert_admin_on_paziente`

Status F3-S5-alpha (ApiRepository PWA-side) **completato end-to-end** v3.2.0-alpha.6 LOCALE:
- F3-S5-alpha source ops (par.22.91-pre N+5.I-pre): 3 file MOD (`RepositoryError.js` SEVERITY_BY_CODE 7 codici + `index.js` runtime toggle lazy singleton + `vite.config.js` API_BASE_URL define) + 2 file NEW (`apiClient.js` HTTP wrapper + `ApiRepository.js` 31 metodi)
- F3-S5-alpha test ops (par.22.91 N+5.I-post CP1.B): 7 file test NEW + 1 file test MOD = 71 test green cumulativi (575/575 totali su 69 file vs 504 baseline pre-F3-S5)
- Composition pattern Lesson #28 ratifica formale par.22.91 (`this._local = new LocalRepository()` + injection support)
- Runtime toggle attivabile via `localStorage.setItem('pharmatimer.useApiRepo', '1')` (sub-AMB O par.22.90) lazy singleton

**Sessione successiva N+5.J** chiusura cumulativa cluster auth-layer + push:

- **CP1 sub-task F3-S5-beta drift cluster** (par.22.91 closing): unificare auth-layer 401 emit `RepositoryError(UNAUTHORIZED)` body shape vocabulary `{error:{code:'UNAUTHORIZED', severity:'error', message}}` (drift-N44/N45/N53/N54 cluster). Fix opzionale `dependencies.py` `get_current_user` raise `RepositoryError` invece di `HTTPException(401, detail=str)` plain. PWA-side ApiRepository gia consume entrambe le body shape (test 6 apiClient `detail string` + test 7 `vocabulary body`).
- **CP2 push atomic con deploy** (AMB-11.B.7-bis 10x cumulativo Fase 3 + Fase 2 par.22.65): push 14 commit ahead `origin/fase-3-backend` + 5 tag locali (`v3.2.0-alpha.{2..6}`) atomic con deploy.
- **CP3 deploy Mac Mini target F3-S6**: docker-compose + Tailscale setup + CORS prod restrictive + healthcheck Mini + backup automation mysqldump cron. Sblocca PWA cross-device su Mini-hosted backend.

Pre-frozen prompt N+5.J: par.11.O-S3 Changelog Fase 3 (emit post-N+5.I-post closing).

### 11.6.8 Riferimenti cross (RINUMERATO da 11.6.5 in v1.6, AMPLIATO in v1.7)

- **Schema DB**: sez. 3.1/3.4/3.5/3.6 (4 tabelle esistenti estese con `utente_id` FK) + sez. 3.9/3.10/3.11 (3 tabelle NEW `utenti`+`permessi`+`push_subscriptions`)
- **API endpoint**: sez. 9 (nota auth header `X-User-Token` + 8 endpoint NEW caregiver F3-S4 utenti+permessi expanded v1.6 + 4 endpoint nested log/* expanded v1.5 + import/export deferred F3-S4-bis)
- **Convenzioni codice backend**: sez. 11.6.6 (Lesson #25 autocommit pool + Lesson #26 pre-emit static analysis MANDATORY)
- **Convenzioni codice PWA-side**: sez. 11.6.9 (architettura ApiRepository composition) + sez. 11.6.10 (Lesson #28 composition MANDATORY) + sez. 11.6.11 (vocabolario RepositoryError cross-PWA/backend cementato)
- **Changelog Fase 3**: par.22.86 (F3-S4-alpha utenti) + par.22.87 (F3-S4-beta permessi) + par.22.90 (F3-S5-alpha analisi-first ApiRepository design draft) + par.22.91 (F3-S5-alpha closing cumulativo N+5.I-pre source ops + N+5.I-post 71 test green)

### 11.6.9 Architettura ApiRepository PWA-side F3-S5-alpha (NUOVO in v1.7)

`src/data/repository/ApiRepository.js` (440 LOC, sha16 `cf4b1ad6b8cda504`) è wrapper PWA-side symmetric con `LocalRepository.js` (445 LOC, sha16 `9f0aa64daae71af3`), entrambi conformi al contract `IRepository` cementato v3.1.0 Fase 2 (31 metodi pubblici).

Pattern di composizione (Lesson #28 sez. 11.6.10): `ApiRepository` NON estende `LocalRepository` (avoid class-extends Dexie mutation conflicts). Owns instance privata `this._local = local ?? new LocalRepository()` accettando injection via constructor (test 11 `delegate.test.js`).

**Dispatch 31 metodi**:

| Categoria | Count | Implementazione |
|---|---|---|
| Delegate Profili (`getProfili`, `getProfiloAttivo`, `addProfilo`, `updateProfilo`, `deleteProfilo`, `setProfiloAttivo`, `setProfiloAttivoConCleanup`) | 7 | `return this._local.<metodo>(args)` 1:1 passthrough |
| Delegate Setting (`getSetting`, `setSetting`, `getAllSettings`) | 3 | `return this._local.<metodo>(args)` 1:1 passthrough |
| API-routed Farmaci (`getFarmaci`, `getFarmaco`, `addFarmaco`, `updateFarmaco`, `deleteFarmaco`) | 5 | `apiClient.{get,post,put,delete}` + mapper `_fromApiFarmaco`/`_toApiFarmaco` |
| API-routed Orari (`getOrariByFarmaco`, `getAllOrari`, `addOrario`, `updateOrario`, `deleteOrario`, `replaceOrariForFarmaco`) | 6 | `apiClient.{get,put}` + fan-out 1+N + bulk PUT replace + `_stripOrarioServerFields` |
| API-routed Log (`upsertLog`, `upsertLogsBatch`, `getLogByRange`, `getLogByData`, `getLogByFarmacoData`, `getLogByDataStato`, `addLog`) | 7 | dispatch 5 verbi `_dispatchLogVerb` + atomic detect + fan-out + filter+sort |
| Throw GENERIC (`updateLog`, `deleteLog`) | 2 | sub-AMB N+O par.22.90 — operazioni proibite PWA-side (endpoint transitions backend rules state-machine) |
| Orchestration (`withTransaction`) | 1 | best-effort no-rollback multi-call (sub-AMB H par.22.90) |
| **Totale** | **31** | match LocalRepository.js bit-perfect |

**Mapper `_fromApiFarmaco` / `_toApiFarmaco`**: backend ritorna `attivo: bool` + `demo: bool` + `intervallo_ore: Decimal-string` (mysql-connector-python serialization). PWA storage normalizza a `attivo: 0|1` + `demo: 0|1` + `intervallo_ore: number` (Dexie schema cementato Fase 2). `_toApiFarmaco` strip server-managed fields (`id`, `utente_id`, `created_at`, `updated_at`) pre-POST/PUT (RFC 7231 full-replace semantics EMP-20).

**Dispatch 5 verbi `upsertLog`** (sub-AMB A par.22.90):

| `patch.stato` valore | Endpoint POST | Body shape |
|---|---|---|
| `'presa'` | `/api/farmaci/{fid}/log/presa` | `{data, dose_numero, ora_prevista, ora_effettiva, delta_minuti, gap_minuti?, note?}` con HH:MM coerced a ISO datetime EMP-21 |
| `'saltata'` | `/api/farmaci/{fid}/log/saltata` | `{data, dose_numero, ora_prevista, note}` |
| `'sospesa'` | `/api/farmaci/{fid}/log/sospesa` | `{data, dose_numero, ora_prevista, note}` |
| `'prevista'` | `/api/farmaci/{fid}/log/undo` | `{data, dose_numero}` (NO note) |
| `'ricalcolata'` | `/api/farmaci/{fid}/log/undo` | (alias `prevista`, sub-AMB A.1) |
| no `stato` + `recupero_minuti > 0` | `/api/farmaci/{fid}/log/recupero` | `{data, dose_numero, recupero_minuti}` |
| empty patch o stato unknown | n/a | `throw RepositoryError(GENERIC)` no API call |

**Atomic detect `upsertLogsBatch`** (sub-AMB J par.22.90): se input batch contiene esattamente 2 log con pattern `[presa @ D, ricalcolata @ D+1]` stesso `farmaco_id`, emit 1 POST `/log/presa` con `payload.ricalcolo_dose_successiva = {dose_numero, data, ora_prevista, ora_ricalcolata, gap_minuti}` nested. Altri pattern → sequential dispatch loop su `upsertLog` per ogni entry.

**Fan-out 1+N**:

| Metodo | Sequenza calls |
|---|---|
| `getAllOrari` | 1× `GET /api/farmaci` (lista farmaci attivi) → N× `GET /api/farmaci/{id}/orari` `Promise.all` parallel |
| `getLogByRange(d1, d2)` | 1× `GET /api/farmaci` → N× `GET /api/farmaci/{id}/log?data_from=d1&data_to=d2` `Promise.all` parallel |
| `getLogByData(d)` | alias `getLogByRange(d, d)` (sub-AMB C par.22.90) |
| `getLogByDataStato(d, stato)` | `getLogByRange(d, d)` → filter `stato` client-side → sort `ora_effettiva` ASC null-last (sub-AMB E par.22.90) |

`Promise.all` fail-fast: 1 reject su qualsiasi sub-call propaga `RepositoryError` aggregato; nessun partial result returned.

**Bulk PUT replace Orari** (sub-AMB G par.22.90): `addOrario`, `updateOrario`, `deleteOrario` operano via fetch current → merge/append/filter → `PUT /api/farmaci/{fid}/orari` bulk replace (server fa full-replace WHERE farmaco_id=fid). `addOrario` refetch post-PUT per recuperare server-assigned `id`.

**Wrapper apiClient `src/data/repository/apiClient.js`** (151 LOC, sha16 `456b1924c39be622`): 4 metodi HTTP (`get`/`post`/`put`/`delete`) thin wrapper su `fetch`. Inietta header `X-User-Token` da `localStorage.getItem('pharmatimer.userToken')` (key cementata sub-AMB par.22.86). Token absent → immediate `RepositoryError(UNAUTHORIZED)` severity `error` pre-fetch (no HTTP roundtrip); il 422 backend (header `X-User-Token` del tutto assente) e di conseguenza irraggiungibile dalla PWA -- edge-only raggiungibile solo via curl raw che bypassa la guardia client-side (drift-N5P.12, par.22.105). Normalizza 2 body shape error backend in `RepositoryError` (item 3 HTTPException plain 401 rimosso post-N+5.K -- drift-N44, par.22.105):

1. **Vocabulary**: `{error:{code, severity, message}}` (business logic 403/404/409 backend RepositoryError handler aligned)
2. **Pydantic detail array**: `{detail:[{loc, msg, type}]}` (422 validation errors) → `CONSTRAINT_VIOLATION` con message `"<loc>: <msg>"`
<!-- SENTINEL_N5QBIS_DRIFT_N44_ITEM3_REMOVED: item 3 (401 plain HTTPException) rimosso, drift-N44 -->

Severity override per HTTP class: 5xx → `DB_UNAVAILABLE` `critical` (regardless body). Network error fetch reject → `DB_UNAVAILABLE` `critical` con `cause = TypeError`.

**Runtime toggle `src/data/repository/index.js`** (41 LOC, sha16 `9fc7558ce90875d5`): factory `getRepository()` lazy singleton. Reading `localStorage.getItem('pharmatimer.useApiRepo')` at first call (sub-AMB O par.22.90); `'1'` → `new ApiRepository()`, else → `new LocalRepository()`. Singleton memoizzato post-init (test 3 `index.test.js` verifica `r1 === r2`).

### 11.6.10 Lesson #28 MANDATORY -- Composition pattern over inheritance per ApiRepository (NUOVO in v1.7)

Ratifica formale post-F3-S5-alpha empirico 71 test green + 575/575 cumulativi senza red.

**Regola**: `ApiRepository` (e ogni future wrapper Repository) NON estende `LocalRepository` via `class extends`. Owns instance privata `this._local` accettando injection opzionale via constructor. Razionale:

1. **Dexie mutation isolation**: `LocalRepository` mantiene state interno Dexie/IndexedDB (cursor, transaction context). `extends` propagherebbe state cross-class con rischio mutation conflicts cross-method (es. Profili IndexedDB-only vs Farmaci API-routed transaction interleave).
2. **Test granularity**: `vi.spyOn(repo._local, 'getProfili').mockResolvedValue(...)` permette mock granulare per-call senza contaminare prototype (vs `vi.spyOn(LocalRepository.prototype, 'getProfili')` che leakerebbe cross-test). Test 1-10 `delegate.test.js` confermano isolation.
3. **Injection support**: test 11 `delegate.test.js` verifica `new ApiRepository(customLocalInstance)` accetta `_local` injectable (utile per fake-indexeddb test env Fase 2 cementato).
4. **Symmetric contract enforcement**: 31 metodi pubblici devono matchare 1:1 firma `LocalRepository`; pattern `extends` cammuferebbe metodi mancanti via fallback ereditato. Composition rende esplicito ogni metodo come delegate / API-routed / throw / orchestration.

**Self-check pre-emit per future wrapper** (es. F3-S5-beta o `MockRepository.js` test-only):

- 31 metodi presenti (grep `^\s*async\s+\w+\(` + diff vs LocalRepository.js)
- Constructor accetta `_local` injection (`new W(custom)._local === custom`)
- Zero `class W extends LocalRepository` (grep negativo)

### 11.6.11 Vocabolario errori cross-PWA/backend cementato F3-S5-alpha (NUOVO in v1.7)

Vocabolario completo `RepositoryError` codes + severity ratificato post-F3-S5-alpha (estende sez. 11.6.6 backend-only):

| RepositoryErrorCode | Severity default | HTTP status backend | Tipico trigger PWA-side |
|---|---|---|---|
| `UNAUTHORIZED` | `error` (drift-doc-N54 ratifica Opzione A) | 401 | Token assente da localStorage (pre-fetch) OR `RepositoryError(UNAUTHORIZED)` backend middleware `get_current_user` (drift-N44 + drift-N53 backend-side chiusi simmetricamente N+5.K par.22.93) |
| `FORBIDDEN` | `warning` | 403 | Non-owner su endpoint owner-only OR non-admin su endpoint admin-on-paziente (recoverable: caregiver puo avere permesso parziale su altro paziente) |
| `NOT_FOUND` | `warning` | 404 | SELECT lookup empty OR IntegrityError FK violation (recoverable: row sparita race condition) |
| `CONSTRAINT_VIOLATION` | `error` | 409 + 422 (Pydantic detail array) | UNIQUE violation + business-rule protezioni (DELETE owner-attempt + DELETE self-attempt + DELETE self-permesso) + Pydantic Literal field rejection |
| `GENERIC` | `error` | n/a (PWA-side only) | `upsertLog` empty patch / unknown stato / wrapper unsupported (operation throw senza network call) |
| `DB_UNAVAILABLE` | `critical` (override 5xx) | 500/503 | Backend HTTP 5xx OR network error fetch reject (cause: TypeError) — incoerente proseguire, log + alert |
| `TRANSACTION_ABORT` | `critical` | n/a (PWA-side only) | `withTransaction` best-effort wrapper: fn throws non-RepositoryError → wrap con cause preserved |

**Razionale severity `UNAUTHORIZED: 'error'` (drift-doc-N54 Opzione A par.22.91)**: token missing/invalid blocca l'operazione, richiede ri-login utente. Severity `warning` (recoverable no-op) sarebbe appropriata solo se token fosse recuperabile via refresh automatico — non implementato in F3-S5-alpha. Coerente con `CONSTRAINT_VIOLATION` (operation bloccata fino a fix input).

**Razionale severity `FORBIDDEN: 'warning'`**: caregiver puo avere permesso `read` su paziente A e `admin` su paziente B; un 403 su A non blocca la sessione, e una no-op acceptable scoped al paziente. PWA-side toast warning, retry su altro paziente possibile.

**Body shape backend emission**:

- Business logic (`exceptions.py` handler): `{error: {code: '<CODE>', severity: '<SEV>', message: '<msg>'}}` (vocabulary aligned)
- Auth middleware (`dependencies.py`): `{error: {code: 'UNAUTHORIZED', severity: 'error', message: '<msg>'}}` (vocabulary aligned post-N+5.K; drift-N44 + drift-N53 backend-side chiusi simmetricamente par.22.93)
- Pydantic validation: `{detail: [{loc: [...], msg: '...', type: '...'}, ...]}` (FastAPI native)

PWA-side `apiClient._normalizeErrorBody` gestisce 2 body shape (vocabulary aligned + Pydantic detail array); HTTPException plain `{detail: '<msg>'}` rimosso post-N+5.K (drift-N44 cluster chiuso).

---

### 11.6.12 Lesson #29 MANDATORY -- delivery file-based artefatti documentali (NUOVO in v1.9)
<!-- SENTINEL_N5QBIS_LESSONS -->
Artefatti documentali/tooling consegnati come file (`present_files` / script), mai inline code-fence shell-incollante: il mezzo di trasmissione e parte della sicurezza (incidente leak ANTHROPIC_API_KEY). Rif. Changelog Fase 3 par.22.94.

### 11.6.13 Lesson #30 MANDATORY -- deferred decisions immutabili + revisione coerenza pre-commit (NUOVO in v1.9)
Le decisioni architetturali deferred non sono sovrascrivibili silenziosamente da default Claude-side; in sessioni che cementano contenuti immutabili, revisione coerenza pre-commit su richiesta. Rif. par.22.95/22.96.

### 11.6.14 Lesson #31 strong -- assunzioni nascoste esplicitate + INV check empirico (NUOVO in v1.9)
Pre-emit di step esecutivi (deploy Mini): elencare esplicitamente le assunzioni nascoste + INV check empirico dispatch. Rif. par.22.98/22.99.

### 11.6.15 Lesson #32 strong -- self-skepticism checkpoint (catch-in-turn) (NUOVO in v1.9)
Checkpoint di auto-scetticismo post-CP per intercettare drift in-turn (record case-study cumulativa). Rif. par.22.100/22.101.

### 11.6.16 Lesson #33 -- refactor architetturale: audit batch consumer (NUOVO in v1.9)
Ogni refactor di un sub-system richiede audit batch di TUTTI i consumer (grep signature). Rif. par.22.101.

### 11.6.17 Lesson #34 -- refactor unificato preferito a runtime-patching iterativo (NUOVO in v1.9)
Max 2 iterazioni di patch incrementale; post-iterazione 2, analisi root-cause unified + refactor canonical. Rif. par.22.101-ter.

### 11.6.18 Lesson #35-#38 candidate (Tailscale) + reinforcement #17-bis / #27-runtime (NUOVO in v1.9)
Candidate non-MANDATORY: #35 .pkg GUI app non espone CLI symlink headless; #36 tag auto-approved con tagOwners admin; #37 `tailscale serve --bg` persiste config pre-enable; #38 heredoc PYEOF + code-fence destabilizza zsh. Reinforcement: #17-bis (heredoc PYEOF f-string via variabile intermedia), #27-runtime (smoke reale prima di cementare il contratto runtime di un endpoint). Rif. par.22.103/22.105.

---

## 12. Riferimenti

### 12.1 Mockup approvato
Il mockup v2 è stato approvato nella sessione del 15/04/2026 (progetto "Roberto - Salute"). Evoluto nella v5 (`pharmatimer_oggi_v5.jsx`) con tutte le interazioni funzionanti. Include: card con nome + funzione dettagliata (es. "Cortisone broncospasmo · 1ª dose · ogni 6h"), badge relazione pasto colorati, delta orario per i farmaci presi, badge ricalcolo blu, badge gap con modale recupero, stati saltata/sospesa con modali di correzione, contatori in header, barra navigazione inferiore a 4 voci.

### 12.2 Contesto clinico
Il progetto nasce nell'ambito della gestione di una politerapia complessa (terapia cronica + terapie temporanee sovrapposte). La documentazione clinica completa è nel progetto Claude "Roberto - Salute".

### 12.3 Ambiente di sviluppo
- Mac Studio Ultra, macOS Tahoe 26.0.1
- Python come linguaggio primario per backend (out-of-scope rilascio v3.1.0; vedi par.11)
- MariaDB come database (out-of-scope rilascio v3.1.0; vedi par.11)
- Il frontend React/JSX è generato nelle sessioni Claude e distribuito come PWA via GitHub Pages

### 12.4 Storia del rilascio v3.1.0 (NUOVO in v1.3)
Il rilascio v3.1.0 è documentato puntualmente in `PharmaTimer_Changelog_Fase2.md`, in particolare:
- par.22.67 — chiusura Sessione 18 esecutiva guide.html audit content (UX-N17 risolto)
- par.22.68 — closing strategico post-S18 con ratifica out-of-scope Fase 1+4 e scope rilascio v3.1.0
- par.22.69 — closing Sessione N+1 analisi-first con 17 Q discriminanti ratificate
- par.22.70 — closing Sessione N+2 esecutiva vista Log
- par.22.71 — closing Sessione N+3 esecutiva export CSV
- par.22.72 — closing Sessione N+4 cleanup XS
- par.22.73 — closing Sessione N+5 finale v3.1.0 (Spec v1.3 + README + guide.html sezioni Log/Export + tag annotato `v3.1.0` + deploy gh-pages aggregato + smoke production)

---

## 13. Deployment (NUOVO in v1.9)
<!-- SENTINEL_N5QBIS_SEC13 -->
Stub: l'architettura di deploy e cementata nel Changelog Fase 3; il corpo esteso e demandato a sessione doc-only dedicata (N+5.Q-ter).

### 13.1 Architettura gamma nativa Mac Mini (no Docker)
venv Python 3.13, LaunchAgent user (auto-login always-on), MySQL 9.6 Homebrew porta 3306, secrets `~/.my-pharmatimer.cnf` (600), backup `~/PharmaTimer/backups` (retention 7gg). Rif. Changelog Fase 3 par.22.95 -> par.22.101.

### 13.2 config.py modalita DB_DEFAULTS_FILE (s.6.226)
`config.py` supporta modalita defaults-file (prod Mini, `~/.my-pharmatimer.cnf`) in alternativa a direct user+password (dev Studio `.env.dev`), via model_validator xor. Rif. par.22.98.

### 13.3 Tailscale HTTPS
`tailscale serve --bg --https=443` (Let's Encrypt) -> proxy localhost:8000; ACL grants dual-port :443+:8000; CORS dual-origin (localhost:5173 + FQDN tailnet). Rif. par.22.103.

## 14. Funzionamento offline -- Scenario 3 (NUOVO in v1.17, deviazione s.6.257)

Trascrizione normativa del design conclusivo ratificato (Changelog F3 par.22.198-tervicies, DESIGN-A). Le decisioni qui trascritte non si riaprono in fase di implementazione; ogni scostamento emerso ai code-step va segnalato e ratificato (regola critica 2).

### 14.0 Premessa -- il racconto e il metro clinico

**Lessico della sezione** (parole semplici, ratificato come base comune):
- **SPECCHIO** -- la copia locale degli ingredienti (farmaci, orari, registro dosi) da cui l'app ricostruisce il piano quando il server non c'e.
- **CODA DI USCITA** -- le promesse di scrittura in ordine di tocco, in attesa di consegna al server.
- **GUARDIANO** -- lo strato che smista ogni lettura/scrittura fra server e specchio.
- **TARGA DEL TOCCO** -- l'etichetta unica che ogni tocco porta con se, per sempre.
- **PARCHEGGIO-ATTENZIONE** -- gli elementi che non possono proseguire da soli e chiedono mani umane.
- **CENTRO INVII** -- la superficie dove la persona vede coda, parcheggio e freschezza dei dati.

**Il racconto.** (A) *Server presente:* le letture arrivano dal server e a ogni lettura riuscita lo specchio si rinfresca; le scritture partono dirette con conferma immediata. (B) *Server assente:* le letture arrivano dallo specchio -- il piano resta visibile, le notifiche locali restano vive, e se la persona apre l'app -- anche da completamente chiusa (avvio a freddo) -- l'apertura riesce regolarmente senza rete: shell dalla cache del service worker, dati dallo specchio; le scritture si annotano in coda con l'orario vero del tocco e la targa, e lo specchio si aggiorna contestualmente (ai riavvii offline una presa registrata non torna mai "da prendere"). (C) *Ritorno del server:* la coda si consegna in fila indiana, un elemento alla volta, con l'orario vero di ogni tocco; gli esiti si gestiscono (sez. 14.3); a coda percorsa l'app rilegge il piano e rinfresca lo specchio. **Chi comanda:** il server e l'unica verita; specchio e coda non pretendono mai di avere ragione contro di esso.

**Metro clinico sovraordinato -- i TRE MAI.** Governano questa sezione e OGNI sua implementazione; in caso di dubbio interpretativo prevalgono su qualunque altra considerazione:
- **M1 -- mai indurre una doppia assunzione.**
- **M2 -- mai perdere una presa avvenuta** (nessuno scarto automatico silenzioso).
- **M3 -- mai falsificare il record** (l'orario del tocco si preserva; i valori si congelano al tocco).

### 14.1 Perimetro e impianto (ratifiche a/b/c)

**(a) Specchio a ingredienti + coda dei tocchi etichettati.** Lo specchio conserva gli INGREDIENTI (farmaci, orari_base, log_assunzioni), NON dosi precotte firmate dal server: il piano si ricostruisce sempre e solo col motore esistente (`buildMultiDayPlan`), unico e gia collaudato. Nessuna doppia verita che possa divergere; blackout illimitati e passaggio di mezzanotte retti per costruzione. La coda contiene tocchi etichettati (sez. 14.3), non stato.

**(b) Buffer occorrenze server-side.** Idea registrata come input forte per il bivio push di DESIGN-B (motore occorrenze server vs calendario pubblicato dal client); NON fa parte dello scenario 3: anticiparla richiederebbe lo scheduler (gia preventivato in W-full) e introdurrebbe una doppia verita senza migliorare la consegna.

**(c) Creazione/modifica terapie offline.** FUORI dallo scenario 3 (gli id farmaco sono assegnati dal server: servirebbero identita provvisorie + rimappatura), a backlog. Offline le scritture di terapia ricevono un rifiuto esplicito e chiaro (sez. 14.4 punto 6), MAI un ripiego solo-specchio.

**Perimetro delle scritture in coda: i soli 5 verbi del registro dosi** (`presa`, `saltata`, `sospesa`, `undo`, `recupero`). Nota d'impianto: l'identita della DOSE e gia deterministica (farmaco_id, data, dose_numero; UNIQUE `idx_log_slot_unique`, sez. 3.6) e non richiede firma del server; ma la firma della dose non distingue una ritrasmissione da un secondo tocco voluto (es. doppio recupero): per questo la targa identifica il TOCCO, non la dose (sez. 14.6).

### 14.2 Trigger di consegna (Q4 -- opzione A a 6 punti)

1. **Init con coda residua** -> drain all'avvio.
2. **`visibilitychange` + `focus`** gia esistenti in `AppContext` -> tentativo di drain.
3. **Evento `online`** = solo un suggerimento (mai fidarsi: la prova e la consegna). **Nessun listener `offline` e nessun fermo persistente** (deviazione `s.6.271`, PERMANENTE e non reversibile): al suo posto `navigator.onLine` si consulta DENTRO la passata e sopprime **la sola passata in corso**; assenza del flag = PROCEDERE. Movente M2: su iOS in standalone lo evento `online` non e garantito al ritorno dalla sospensione, quindi un fermo alzato da `offline` potrebbe non abbassarsi mai e prese avvenute resterebbero non consegnate e invisibili fino alle superfici di 14.5.
4. **Tick esistente** con throttle interno 60s e guardia anti-sovrapposizione (flag drain-in-corso + timestamp ultimo tentativo). La cadenza reale del tick VA MISURATA a CS-4 (Lesson #27), non assunta.
5. **Nuova scrittura a coda non vuota** -> enqueue diretto in FIFO + drain immediato.
6. **Nessun health-check preliminare:** la prima POST della coda E il probe. Health solo a coda vuota per spegnere l'indicatore "Senza collegamento" (sez. 14.5).

### 14.3 Consegna ed esiti (Q5 -- forma rivista dal riesame clinico)

**Elemento di coda.** Un elemento = **UNA richiesta**. Un tocco = **1..N elementi**, accodati atomicamente insieme al registro (deviazione `s.6.259`). La coppia presa+ricalcolo dose successiva e UN unico elemento (l'atomicita server della coppia e misurata, sez. 9 `/presa` nested). Ogni elemento porta: dose (farmaco_id, data, dose_numero), verbo, orario vero del tocco, valori calcolati dal motore locale al momento del tocco, targa (sez. 14.6).

**Contenuto dello elemento (deviazione `s.6.262`).** Le righe che i gesti `annulla*` producono a sola **protezione** del piano locale non sono transizioni e **non vengono consegnate**: restano nel registro locale e non entrano in `logs[]`. `s.6.259` norma la cardinalita dello elemento, questa clausola il suo contenuto -- affermazioni indipendenti, e due numeri danno due recepimenti verificabili separatamente.

**INVARIANTE TOCCO INDIVISIBILE.** Registro locale e coda si scrivono in UN'UNICA transazione Dexie multi-store (log_assunzioni + outbox): o entrambi o nessuno; il fallimento e visibile subito alla persona. Chiude per costruzione la finestra crash-fra-i-due-gesti (violazione M1 o M2).

**INVARIANTE CONGELAMENTO.** Verbo, orario del tocco, valori e targa si fissano all'istante del tocco e NON si ricalcolano mai, ne in coda ne al replay (M3).

**Esiti di consegna (tabella normativa):**

| Esito | Azione | Nota |
|---|---|---|
| 2xx accettata | drop dell'elemento + specchio aggiornato dalla risposta | percorso normale |
| 2xx con `dedup: true` (gia fatta) | drop + riga nel diario sync | il server aveva gia applicato; lo specchio si allinea allo stato riga restituito |
| 2xx illeggibile | SUCCESSO: drop | contano i fatti, non la leggibilita della busta; la rilettura finale sistema lo specchio |
| 409 conflitto vero | **PARCHEGGIO, non drop** (deviazioni `s.6.266`, `s.6.267`) | Due moventi distinti con estinzioni diverse. **`s.6.266`:** il client non distingue 409 da 422, perche `apiClient` e VIETATO e il vocabolario server non porta un codice di conflitto -- reversibile, subordinata a misura sul Mini. **`s.6.267`:** la superficie di avviso di 14.5 non esiste, e senza di essa il drop sarebbe scarto silenzioso di una presa -- reversibile, ancorata a CS-5. Alla reversione la riga torna a **drop piu avviso visibile**; le due sigle si estinguono SEPARATAMENTE. |
| 4xx richiesta rotta | parcheggio IMMEDIATO, senza retry | elemento malformato: ritentare non lo guarisce |
| 5xx server rotto | come irraggiungibile: resta in coda, consegna si ferma | indistinguibile dal client; parcheggiare una presa vera per guasto altrui la esporrebbe al tasto Elimina |
| Irraggiungibile | resta in coda, consegna si ferma, riprova ai trigger 14.2 | NESSUN limite di tentativi, NESSUN tetto di capienza, NESSUNA scadenza temporale |
| UNAUTHORIZED | coda intatta, consegna ferma, invito al ri-accesso (sez. 14.5) | ne poison ne conflitto |
| Eccezione interna app | N=3 tentativi, poi parcheggio | unico caso con contatore |

**Parcheggio-attenzione.** Mai scarto automatico. Elementi descritti in parole semplici (farmaco, dose, orario del tocco, perche e qui). Azioni: Riprova / Elimina; l'eliminazione e SOLO manuale, con conferma che esplicita la conseguenza quando l'elemento contiene una presa. Il parcheggio NON blocca la coda: i successivi proseguono (le dipendenze sulla stessa dose sono risolte da server-vince + rilettura finale).

**Parcheggio per indecidibilita (deviazione `s.6.261`).** Oltre agli esiti di trasporto, un elemento si parcheggia anche quando la rotta **non e decidibile**: verbo sconosciuto, appaiamento fallito, rotta non derivabile. **Zero tentativi, mai scarto, motivo sempre esplicito**; il parcheggio avviene al **tocco** o alla **consegna**. Una rotta non si indovina mai. La difesa e a tre livelli: guardia sincrona sul verbo al confine del tocco, parcheggio a runtime nello splitter, pin strutturale su conteggio e appartenenza dei letterali.

**Fila indiana.** FIFO rigorosa, una consegna alla volta; la fila si ferma SOLO su irraggiungibile / 5xx / UNAUTHORIZED.

**Chiusura del giro.** A coda percorsa: rilettura della finestra piano + rinfresco specchio + indicatore a riposo (con segnale di attenzione se il parcheggio non e vuoto).

### 14.4 Specchio e guardiano (Q6)

1. **GUARDIANO.** Wrapper `SyncRepository` istanziato nel punto unico `getRepository()` (`src/data/repository/index.js`): COMPONE `ApiRepository` + `LocalRepository` senza toccarli di un byte. Il conflitto col VIETATO su `ApiRepository` e cosi sciolto SENZA eccezioni sul read-path.
2. **Specchio = 3 tabelle Dexie esistenti** (`farmaci`, `orari_base`, `log_assunzioni`); nessuna tabella nuova: il motore locale gia le legge e le scrive. Profili e Impostazioni sono gia locali per costruzione (delegate a `LocalRepository` dentro `ApiRepository`).
3. **Rinfresco a ogni lettura riuscita, fotografia FEDELE incluse le assenze:** un farmaco eliminato dal medico deve sparire anche dallo specchio -- altrimenti offline continuerebbe a suonare, errore clinico opposto ai TRE MAI.
4. **REGOLA DI PROTEZIONE (invariante clinica).** Caso mortale identificato: una lettura dal server PRIMA del drain sovrascriverebbe nello specchio la presa ancora in coda -> la dose ricomparirebbe "da prendere" (M1). Quindi: le righe del registro riferite a promesse vive (in coda O in parcheggio) sono INTOCCABILI da qualunque fotografia server, fino a consegna / dedup / risoluzione manuale; la rilettura finale (sez. 14.3) riallinea. Il parcheggio e il motivo per cui la protezione serve comunque: una presa parcheggiata e l'unica testimonianza dell'ingestione finche la persona non decide. Alternativa scartata: vietare le letture a coda non vuota (non copre il parcheggio: due regole al prezzo di una).
5. **Fallback a specchio** su errore di connettivita, per singola chiamata; staleness sempre DICHIARATA con timestamp di freschezza globale (su un'app medicale lo stato del dato e parte del dato).
6. **Avvio a freddo e mezzanotte offline: per costruzione.** `init()` esegue le 4 letture + `getLogByRange`, tutte con fallback; il profilo attivo e in Dexie (`NO_ACTIVE_PROFILE` impossibile per server giu); il trigger di cambio giorno esistente -> `rebuildPlan` -> `getLogByRange` -> specchio, incluse le prese registrate al buio. Prova empirica dedicata a CS-6: "per costruzione" non basta come collaudo.
7. **Scritture di terapia offline:** rifiuto esplicito e chiaro (sez. 14.5), MAI ripiego solo-specchio (divergenza silenziosa insanabile).
8. **Coda + parcheggio = UNICO store Dexie `outbox`** (bump schema v5) con stato `pending`/`parked`: la fila scorre sui pending, il parcheggio e visibile a parte, niente doppie contabilita.

### 14.5 Superfici (Q7)

1. **Indicatore UNICO a 4 stati**, sempre icona+testo (mai solo colore): *Tutto inviato* (quiete, segno discreto); *Da inviare: N* (rassicurante, nessuna azione richiesta); *Senza collegamento* (**l'offline NON e un errore e non deve sembrarlo**: niente rosso, l'app funziona normalmente -- se spaventa, l'anziano smette di registrare); *Da controllare: N* (unico stato che chiede mani umane; colore attenzione, mai lampeggiante). Lessico: "inviare" (mai sync/queue/retry).
2. Fisso in intestazione, area di tocco generosa -> apre il **CENTRO INVII**.
3. **Centro invii:** freschezza ("Dati aggiornati all'ultima connessione: <timestamp>", unico timestamp globale); *In attesa* (elenco in parole semplici, sola lettura); *Da controllare* (parcheggio, mostrato solo se non vuoto, con Riprova / Elimina e conferma delle conseguenze per le prese).
4. **DUE soli avvisi interrompenti:** *presa in conflitto* (scheda esplicita che resta finche letta); *serve nuovo accesso* (fascia persistente non bloccante: "le registrazioni sono al sicuro sul telefono" + bottone Accedi; app usabile offline sotto la fascia). NESSUN avviso a ogni tocco offline: la conferma resta la card che cambia stato; il rumore addestra a ignorare i messaggi.
5. **I NO detti bene:** terapie offline -> il no spiega cosa NON e compromesso (le registrazioni delle dosi funzionano sempre); primo avvio assoluto senza rete = UNICO caso impossibile (specchio vuoto): messaggio dedicato + Riprova.
6. **Deferito 65 SUPERATO per costruzione** (la fascia rossa scritture scompare: i tocchi si accodano, non falliscono; il ruolo passa all'indicatore, che si spegne a coda vuota; verbale di chiusura a CS-5). **Deferito 66 ASSORBITO in CS-5** (modulo copy condiviso = primo mattone; le frasi nuove nascono li, le esistenti vi confluiscono).
7. **Regole anziani trasversali:** mai solo colore, mai lampeggi, mai gergo, verbi al presente, frasi corte; sempre esplicitato cosa succede da solo e cosa tocca alla persona (quasi sempre: niente).

### 14.6 Targa del tocco (Q8 -- `client_op_id`)

1. **UUID v4 via `crypto.randomUUID()`** (PWA su HTTPS), generato all'istante del tocco. UNA targa per elemento di coda: la coppia presa+ricalcolo ne porta UNA, sulla presa. Congelata per sempre (se cambiasse, il riconoscimento gia-fatta non funzionerebbe).
2. **La targa viaggia SEMPRE, dal primo tentativo** (la risposta puo perdersi anche alla prima trasmissione). Corollario architetturale in forma forte: **TACCUINO-PRIMA anche online** -- ogni tocco prima si annota in outbox, poi parte la consegna immediata; a linea buona l'elemento vive un lampo (annotazione, POST, risposta, rimozione); il contratto dei thunk resta invariato, e il ritorno dello override e costituito dalle **righe del taccuino**, non dalla risposta del server (deviazione `s.6.265`): offline la risposta del server NON ESISTE, quindi la lettera precedente era irrealizzabile proprio nello scenario che questa sezione norma. Argomento clinico decisivo: nessun tocco esiste mai solo in memoria volatile; la finestra risposta-persa / crash-prima-di-accodare NON ESISTE per costruzione (M1/M2). Bonus: un solo percorso di scrittura, nessuna biforcazione online/offline da mantenere coerente.
3. **Server:** colonna `client_op_id CHAR(36) NULL` + UNIQUE su `log_assunzioni`, migrazione v06 (sez. 3.6): righe esistenti NULL, zero backfill, retrocompatibile; ortogonale a MOD-1.
4. **Dedupe = primo gesto di ogni verbo DENTRO la transazione esistente:** targa gia vista -> 200 con `dedup: true` + stato attuale della riga (lo specchio si allinea); targa nuova -> applica e SCRIVE la targa sulla riga toccata. Ogni operazione successiva sulla stessa dose SOVRASCRIVE la targa: la riga porta la targa dell'ULTIMA operazione. Sicurezza garantita da due ratifiche gia prese: FIFO in fila indiana (quando un elemento entra in consegna, ogni predecessore sulla stessa dose e gia uscito dalla coda) + il parcheggio non firma nulla. Coppia atomica: la targa e cercata e scritta sulla riga della presa; il gia-fatta copre l'intera coppia (o tutta o niente).
5. **Regalo M5 (registrato, NON implementato ora):** la targa sulla riga = versione della riga (ultima parola detta su quella dose). Soluzione candidata al caveat undo multi-device: l'undo in coda dichiarera QUALE presa annulla (targa P); mismatch -> 409 -> avviso "presa in conflitto" (sez. 14.5). Prerequisito M5; il design odierno la prepara senza costo aggiuntivo.
6. **Eccezione chirurgica al VIETATO su `ApiRepository` (via (iii), ratificata):** ~6 righe additive, una per ramo di costruzione payload (presa, saltata, sospesa, undo, recupero, batch), campo OPZIONALE, sentinel dedicati; i payload senza targa restano validi (test esistenti verdi, nuovi test coprono la targa). Eccezione PERIMETRATA al solo campo `client_op_id`; esercizio a CS-4, fino ad allora il VIETATO resta pienamente vigente. Via scartata (builder duplicato nel replay): due costruttori divergono nel tempo, e un replay che scrive qualcosa di sottilmente diverso dall'online e una falsificazione silenziosa del record (M3).
7. **Perimetro:** solo i 5 verbi del registro dosi. Terapie fuori: offline non si scrivono (ratifica (c), sez. 14.1); online i PUT full-replace sono gia rigiocabili senza danno.

### 14.7 Piano di realizzazione CS-0..CS-6

**Ordine clinico ratificato: lo scudo del server nasce prima del braccio del client.** Il riconoscimento gia-fatta esiste sul server PRIMA che esista qualunque replay sul telefono: mai una versione, nemmeno intermedia, in cui il replay del recupero possa colpire il buco della risposta persa. Ogni passo lascia l'app rilasciabile e mai piu pericolosa della baseline.

| Passo | Contenuto |
|---|---|
| CS-0 | Sonda shell PWA offline su iPhone (zero codice). **GO dichiarato dal pilota**; prova formale documentata a CS-6 |
| CS-1 | Micro-fix deferito 64: azione dedicata `clearError` in `createActions` + riallineamento test al contratto reale; NON esporre `dispatch` nel context |
| CS-2 | Server: migrazione v06 + dedupe primo-gesto dei 5 verbi in-transazione + campo opzionale nei modelli + risposta 200 `dedup: true` con stato riga + pytest dedicati, INCLUSO il replay del recupero (il buco deve risultare chiuso da un test che oggi fallirebbe) |
| CS-3 | Client lettura: `SyncRepository` nella factory, specchio 3 tabelle da letture riuscite, fallback, timestamp freschezza, avvio a freddo offline; scritture ancora dirette (stato intermedio strettamente migliore della baseline) |
| CS-4 | Client scrittura: outbox Dexie v5 (`pending`/`parked`), tocco indivisibile, targa al tocco, eccezione (iii) nei 5 rami di `ApiRepository` con sentinel, taccuino-prima anche online, consegna FIFO con esiti 14.3, regola di protezione 14.4, trigger 14.2 + misura della cadenza reale del tick |
| CS-5 | Superfici 14.5: indicatore 4 stati, Centro invii, modulo copy condiviso (def. 66), avviso presa-in-conflitto, fascia ri-accesso, i NO detti bene; verbale di chiusura def. 65 |
| CS-6 | Collaudo della matrice offline su Mini (matrice completa redatta in apertura del passo): shell offline (riverifica formale), avvio a freddo da specchio, riavvio offline con prese al buio, mezzanotte offline, notifiche a server giu, **risposta persa simulata sul recupero (prova regina)**, crash tra tocco e consegna, conflitto su presa, parcheggio con conferme, sessione scaduta, primo avvio assoluto senza rete |

La pianificazione operativa (sessioni, modelli, avanzamento) vive nello STATO_CORRENTE (tabella §OFFLINE-3) e nel Changelog Fase 3, non in questa specifica.
