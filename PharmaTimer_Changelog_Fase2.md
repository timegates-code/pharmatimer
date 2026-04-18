# PharmaTimer — Changelog Fase 2 (PWA frontend)

**Versione:** 2.5.2
**Data inizio fase:** 16 aprile 2026
**Ultima modifica:** 18 aprile 2026
**Ambito:** Sviluppo PWA React standalone con persistenza locale, preparata per futuro swap verso backend FastAPI+MariaDB.

Questo documento raccoglie le decisioni architetturali, la struttura del progetto, le deviazioni dalla specifica e lo stato di avanzamento della Fase 2. È il **punto di riferimento unico** per ogni sessione di sviluppo: leggerlo prima di iniziare garantisce continuità senza dover rileggere l'intero storico chat.

**Changelog versione 2.2 (rispetto alla 2.1):**
- Sessione 4a completata (33/33 test, inclusi utils/time e planBuilder)
- Sessione 4b completata (79/79 test totali, coverage 100% su recalc.js)
- Nuove deviazioni 6.16, 6.17, 6.18 aggiunte (estrazione orarioResolver, limitazione annullaAssunzione, limitazione ora_ricalcolata cross-midnight)
- Aggiornamento roadmap sez. 7: step 4a e 4b ✅
- Setup testing esteso: @vitest/coverage-v8 in devDependencies
- Rimosso prompt di apertura Sessione 4a (consumato), sostituito con prompt Sessione 5
- Rinumerazione: la vecchia 6.15 (stato "in ritardo") è ora riversata in spec v1.2 sez. 5.3; aggiunte nuove 6.16/6.17/6.18

**Changelog versione 2.3 (rispetto alla 2.2):**
- Sessione 5a completata (preparatorio allo stato globale): aggiunta `applyRipristino` nel dominio + metodo repo atomico + fix ENUM drift
- Nuove deviazioni 6.19 (applyRipristino), 6.20 (setProfiloAttivoConCleanup), 6.21 (ENUM drift fix) aggiunte
- Aggiornamento roadmap sez. 7: step 5a ✅
- Rimosso prompt di apertura Sessione 5 (consumato), sostituito con prompt Sessione 5b
- Aggiornato totale test: 79 → 95 (+16 T13)

**Changelog versione 2.4 (rispetto alla 2.3):**
- Analisi di coerenza del prompt Sessione 5b: identificati 5 bloccanti + 3 rilevanti risolti pre-implementazione
- Nuova deviazione 6.22 (`upsertLogsBatch` per persistenza atomica logWrites)
- Nuova deviazione 6.23 (invariante `mergeLogIntoEntry` rispetto a `ora_prevista`)
- Nuova sezione 13 "Decisioni pre-implementazione Sessione 5b" con 14 decisioni strutturate (shape, thunks, pattern, test, smoke helpers)
- Sostituito prompt Sessione 5b in sez. 11 con versione riscritta (sanity-check iniziale + scope chiuso)
- Nessuna deviazione applicata al codice esistente: le modifiche al repo (upsertLogsBatch) e ai nuovi file state/ sono ambito Sessione 5b

**Changelog versione 2.5 (rispetto alla 2.4):**
- Sessione 5b parte 1/2 completata: reducer.js (16 azioni, 24 test), selectors.js (5 selectors puri), applyHelper.js (commitApplyResult DRY), upsertLogsBatch in IRepository/LocalRepository (§6.22)
- Conformità §6.23 verificata: mergeLogIntoEntry in planBuilder.js NON sovrascrive plan.ora_prevista. Nessun fix al dominio necessario.
- Nuova sezione 14 "Stato post-Sessione 5b parte 1/2" con file prodotti e nota conformità §6.23
- Aggiornamento roadmap sez. 7: step 5b splittato in 5b-1 ✅ e 5b-2 ⏳
- Totale test: 95 → 119 (+24 reducer.test.js). Target §13/D14 era 115, superato di 4 test per edge case utili
- Sostituito prompt Sessione 5b in sez. 11 con prompt Sessione 5b parte 2/2
- Aggiornata sez. 12 con nuovi file state/

**Changelog versione 2.5.1 (rispetto alla 2.5):**
- Analisi critica del prompt Sessione 5b parte 2/2 post-v2.5: identificati 3 bloccanti, 3 rilevanti, 4 minor
- Nuove AMB pre-approvate congelate nel §11: 5b2.A (popPresoKey in applyHelper), 5b2.B (ricalcolaPianoDaProfilo in cambiaProfilo), 5b2.C (setSetting generico), 5b2.D (costanti plan window in constants.js)
- Thunk count ridotto da 12 a 11 (setNomeUtente assorbito in setSetting). Aggiornato dopo Sessione 5b-2: conteggio finale è 12 (include dismissPrompt e setSimulatedNow sync).
- Scope esecutivo esteso: modifiche a constants.js e applyHelper.js dichiarate come estensioni retroattive documentate
- Prompt §11 riscritto con sanity check esteso (14 punti, era 10), dettagli operativi init/resolveNow/cambiaProfilo, recupero dei 5 campi del placeholder App.jsx dal prompt pre-5b, regola esplicita "NAV bar intoccata"
- Nessuna modifica al codice (la sessione 5b-2 applicherà le estensioni)

**Changelog versione 2.5.2 (rispetto alla 2.5.1):**
- Sessione 5b parte 2/2 completata: actions.js (12 thunks), AppContext.jsx (Provider reale), OggiView.jsx (placeholder ready 5-campi), estensioni retroattive a constants.js (+4 costanti plan window) e applyHelper.js (+popPresoKey con idempotenza)
- Verifica end-to-end in browser: status ready, plan.length=39, farmaci=11, error=null, 12 actions esposte in `__pt.app.actions`
- Nuova deviazione AMB-5b2.F documentata in §15: `App.jsx` non toccato; il placeholder 5-campi vive in `OggiView.jsx` (il prompt §11 ipotizzava un App.jsx placeholder che in realtà è il router Step 1)
- Nuova sezione 15 "Stato post-Sessione 5b parte 2/2" con file prodotti, scoperte e limitazioni
- Aggiornamento roadmap sez. 7: Step 5b-2 ✅, Step 6 ⏳
- Aggiornamento sez. 12 con file prodotti in 5b-2 (actions.js, AppContext.jsx reale, OggiView.jsx placeholder)
- Aggiornata sez. 3 (struttura progetto): rimossi marker `[Step 5]` sui file ora prodotti
- Totale test: 119/119 (invariato, nessun test aggiunto in 5b-2 come da §13/D13)
- Sostituito prompt §11 (Sessione 5b parte 2/2 consumato) con prompt Sessione 6 (hook `useNow`) in modalità analisi-first

---

## 1. Decisioni architetturali (congelate)

| Ambito | Scelta | Motivazione |
|---|---|---|
| Storage locale | IndexedDB via Dexie 4 | Schema strutturato, transazioni atomiche, coerente col futuro schema MariaDB |
| Routing | React Router 6 | Standard ecosistema React, gestione URL per 4 viste |
| Stato globale | Context + useReducer | Sufficiente per la complessità attuale, zero dipendenze extra |
| Stile | Tailwind CSS 3 (core utilities) | Coerente col mockup v5, nessun compiler custom |
| Build tool | Vite 5 | Dev server veloce, HMR, plugin PWA integrato |
| PWA | vite-plugin-pwa | Service worker auto-generato + manifest |
| Test logica | Vitest 2.1 + @vitest/coverage-v8 | Integrato con Vite, API compatibile Jest |
| Backend futuro | Layer repository pattern | Swap da `LocalRepository` a `ApiRepository` senza toccare UI |
| Slider tempo | Solo in dev (`import.meta.env.DEV`) | In prod usa `new Date()` con aggiornamento periodico |
| Notifiche | Notification API + service worker, incluse in Fase 2 | Valore d'uso critico subito disponibile |
| Schema locale | 1:1 con spec (tabelle in italiano) | Migrazione al backend banale |
| Plan multi-day | Ricalcolato on-demand da DB (non materializzato) | `log_assunzioni` fonte di verità; il plan è vista derivata; robustezza a crash/reload |

### Viste implementate in Fase 2

- **Oggi** (principale, basata su mockup v5)
- **Config** (CRUD profili, farmaci, orari, nome utente)

### Viste deferite a Fase 3

- **Log** (storico assunzioni con filtri)
- **Export** (CSV/JSON)

### Target di deployment

PWA installabile su **iOS 16.4+ e Android**. Layout responsive per entrambe le piattaforme. La prima versione funzionante su smartphone è il requisito prioritario che guida le scelte di scope.

---

## 2. Configurabilità utente (requisito aggiunto in sessione 16 apr 2026)

L'app può essere usata da chiunque, non solo da un utente specifico. Conseguenze:

- **Nome utente** configurabile, salvato in `impostazioni_app.nome_utente`, vuoto di default
- **Dati seed** (profili Standard/Nottambulo + 11 farmaci esempio) presentati come "dati demo" con flag `demo: 1`
- Al primo avvio: seed caricato automaticamente come onboarding
- In Config: azione "Cancella dati demo" per ripulire selettivamente
- Nessun riferimento a nomi propri nel codice o nella UI (solo nei commenti storici e nella spec sez. 10 come esempio realistico)

---

## 3. Struttura del progetto

```
pharmatimer/
├── public/
│   ├── manifest.webmanifest          # generato da vite-plugin-pwa
│   └── icons/                        # placeholder 1x1, da sostituire
├── src/
│   ├── main.jsx                      # entry: bootstrap DB + seed + mount
│   ├── App.jsx                       # shell con routing
│   ├── index.css                     # Tailwind + base
│   │
│   ├── data/
│   │   ├── db.js                     # Dexie schema v1
│   │   ├── seed.js                   # dati demo + clearDemoData + wipeDatabase
│   │   ├── devCheck.js               # helper console window.__pt (solo dev)
│   │   └── repository/
│   │       ├── IRepository.js        # contratto JSDoc
│   │       ├── LocalRepository.js    # implementazione Dexie
│   │       └── index.js              # factory singleton `repo`
│   │
│   ├── domain/
│   │   ├── constants.js              # ✅ 4a + 5b-2: TOLLERANZA, PLAN_DAYS_*, GET_FARMACI_SOLO_ATTIVI
│   │   ├── errors.js                 # ✅ Step 4a: class DomainError
│   │   ├── types.js                  # ✅ Step 4a: JSDoc typedef
│   │   ├── orarioResolver.js         # ✅ Step 4b: computeOraPrevista (estratto, §6.16)
│   │   ├── planBuilder.js            # ✅ Step 4a: buildMultiDayPlan (re-export computeOraPrevista)
│   │   └── recalc.js                 # ✅ Step 4b + 5a: apply*, autoSkip, applyRipristino
│   │
│   ├── state/
│   │   ├── AppContext.jsx            # ✅ Step 5b-2: Provider reale + useAppContext + rollover detect
│   │   ├── reducer.js                # ✅ Step 5b-1: 16 azioni
│   │   ├── selectors.js              # ✅ Step 5b-1: 5 selectors puri
│   │   ├── applyHelper.js            # ✅ Step 5b-1 + 5b-2: commitApplyResult + popPresoKey
│   │   └── actions.js                # ✅ Step 5b-2: createActions factory + 12 thunks
│   │
│   ├── hooks/
│   │   ├── useNow.js                 # [Step 6] tempo reale / simulato
│   │   ├── useTheme.js               # [Step 7] dark/light
│   │   └── useNotifications.js       # [Step 9] schedulazione locale
│   │
│   ├── services/
│   │   ├── notifications.js          # [Step 9] Notification API
│   │   └── audio.js                  # [Step 7] beep Web Audio
│   │
│   ├── utils/
│   │   ├── time.js                   # ✅ Step 4a: time utilities + calcolaDelta
│   │   └── theme.js                  # [Step 7] palette tokens
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   ├── NavBar.jsx            # attivo (stub stylato in Step 7)
│   │   │   ├── Badge.jsx             # [Step 7]
│   │   │   ├── TapBadge.jsx          # [Step 7]
│   │   │   ├── Icons.jsx             # [Step 7]
│   │   │   └── DevTimeSlider.jsx     # [Step 6]
│   │   ├── oggi/
│   │   │   ├── OggiView.jsx          # ✅ Step 5b-2 placeholder ready 5-campi; vista completa in Step 7
│   │   │   ├── Card.jsx              # [Step 7]
│   │   │   ├── Header.jsx            # [Step 7]
│   │   │   └── modals/               # [Step 7] 5 modali
│   │   └── config/
│   │       ├── ConfigView.jsx        # [Step 8]
│   │       ├── ProfiliTab.jsx        # [Step 8]
│   │       ├── FarmaciTab.jsx        # [Step 8]
│   │       ├── OrariTab.jsx          # [Step 8]
│   │       └── forms/                # [Step 8] 3 form
│   │
│   └── pwa/
│       └── registerSW.js             # registrazione service worker
│
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── index.html
```

---

## 4. Schema dati locale (Dexie v1)

Fedele alla spec sez. 3 con aggiunte documentate in sez. 6 di questo documento.

| Object store | PK | Indici | Scopo |
|---|---|---|---|
| `farmaci` | `++id` | `attivo` | Registro farmaci (spec 3.1) |
| `orari_base` | `++id` | `farmaco_id`, `[farmaco_id+dose_numero]` | Orari programmati (spec 3.5) |
| `log_assunzioni` | `++id` | `data`, `farmaco_id`, `[farmaco_id+data]` | Log assunzioni (spec 3.6) |
| `profilo_utente` | `++id` | `attivo` | Profili giornalieri (spec 3.4) |
| `impostazioni_app` | `chiave` | — | Key/value settings (nuova, vedi sez. 6) |

### Chiavi di `impostazioni_app`

- `nome_utente` — string, vuoto di default
- `seed_loaded` — 1 se il seed è già stato caricato (marker idempotenza)
- `schema_version` — int, per future migrazioni

---

## 5. Repository — contratto API

`IRepository.js` definisce 30 metodi raggruppati per tabella:

- **Profili** (6): `getProfili`, `getProfiloAttivo`, `addProfilo`, `updateProfilo`, `deleteProfilo`, `setProfiloAttivo`
- **Farmaci** (5): `getFarmaci({soloAttivi?})`, `getFarmaco`, `addFarmaco`, `updateFarmaco`, `deleteFarmaco`
- **Orari** (6): `getOrariByFarmaco`, `getAllOrari`, `addOrario`, `updateOrario`, `deleteOrario`, `replaceOrariForFarmaco`
- **Log** (7): `getLogByData`, `getLogByRange`, `getLogByFarmacoData`, `addLog`, `updateLog`, `deleteLog`, `upsertLog`
- **Settings** (3): `getSetting`, `setSetting`, `getAllSettings`

**Uso:**
```js
import { repo } from "@/data/repository";
const farmaci = await repo.getFarmaci({ soloAttivi: true });
```

**Invarianti garantite dal repository:**
- `setProfiloAttivo` è atomico (transazione): esattamente un profilo attivo alla volta
- `deleteProfilo` rifiuta l'eliminazione del profilo attivo (errore esplicito)
- `deleteFarmaco` è soft-delete (`attivo=0`), preserva log storico
- `replaceOrariForFarmaco` è atomico (drop+insert in transazione)
- `upsertLog` è find-or-create per `(farmaco_id, data, dose_numero)`, write-path primario per stati dose

---

## 6. Deviazioni dalla specifica

Da integrare nella spec principale al termine della Fase 2. Non aggiornare la spec ora, solo accumulare qui. (**Eccezioni:** le deviazioni 6.8 e 6.9 sono state riversate nella spec v1.2 perché riguardano lo schema dati — fonte di verità.)

### 6.1 Nuova tabella `impostazioni_app`

Non presente in spec sez. 3. Aggiunta per supportare la configurabilità del nome utente e altre impostazioni future. Schema:

| Campo | Tipo | Descrizione |
|---|---|---|
| chiave | VARCHAR(100) PK | Nome impostazione |
| valore | TEXT/JSON | Valore (può essere stringa, numero, oggetto) |

Quando arriverà il backend MariaDB, questa tabella sarà aggiunta alla spec sez. 3.8.

### 6.2 Campo `demo` su `farmaci` e `profilo_utente`

Aggiunto per distinguere dati seed da dati utente, abilitando pulizia selettiva. Non presente in spec. In MariaDB sarà `BOOLEAN DEFAULT FALSE`.

### 6.3 Boolean → INT 0/1 su IndexedDB

IndexedDB non indicizza booleans. I campi `attivo` (su `farmaci` e `profilo_utente`) e `demo` sono INT 0/1 sul client. Sul backend MariaDB resteranno BOOLEAN. Il repository si occupa della conversione dove serve.

### 6.4 `deleteFarmaco` = soft-delete esplicito

La spec (sez. 9) indicava "DELETE /api/farmaci/{id} — Disattiva farmaco (soft delete)". L'implementazione conferma questa scelta come invariante di repository, non solo come endpoint.

### 6.5 `deleteProfilo` rifiuta profilo attivo

Vincolo non presente in spec. L'implementazione solleva errore se si tenta di eliminare il profilo con `attivo=1`. Mantiene l'invariante "sempre un profilo attivo".

### 6.6 Notifiche locali anticipate a Fase 2

La roadmap spec (sez. 11) colloca le notifiche in Fase 3. Spostate a Fase 2 (Step 9) perché valore d'uso critico: PWA installata senza notifiche perde molta utilità.

### 6.7 Campo `principio_attivo` popolato nel seed

La spec (sez. 3.1) prevede il campo; i dati esempio in sez. 10 lo omettevano per brevità. Nel seed è popolato con valori standard (solo informativi, non influenzano la logica).

### 6.8 Naming stati al femminile + `sospesa` (riversata in spec v1.2)

**ENUM originale spec v1.1:** `('previsto','preso','saltato','ricalcolato')` (maschile).
**Nuovo ENUM spec v1.2:** `('prevista','presa','saltata','sospesa','ricalcolata')` (femminile, soggetto implicito "dose").

Motivazioni:
- **Coerenza linguistica:** il soggetto è "dose" (femminile). Il mockup v5 usava già `saltata` e `sospesa` ma `ricalcolato` (maschile), creando incoerenza.
- **Nuovo stato `sospesa`:** il mockup v5 lo aveva già introdotto a livello di UI ma non era formalizzato nello schema. Rappresenta una non assunzione **intenzionale** (es. salto concordato col medico), distinta da `saltata` che è dimenticata. Semantica: nessuna propagazione di gap, nessun warning sulla dose successiva.

Questa è l'unica deviazione che richiede aggiornamento immediato dello schema locale (Dexie). Il campo `stato` su `log_assunzioni` accetterà i cinque valori femminili.

### 6.9 Stato UI `in ritardo` con soglia `TOLLERANZA_MIN` (riversata in spec v1.2)

**Mockup v5:** una dose diventa `scaduta` (bordo arancio + pulse + badge "⏰ SCADUTA") **dal primo minuto** di ritardo.

**Fase 2 Step 7:** la dose entra nello stato visivo `in ritardo` solo dopo `TOLLERANZA_MIN` minuti oltre l'orario programmato. Entro tolleranza, la card rimane in stato `prossima` o `in attesa` normale.

Motivazioni UX:
- **Alert fatigue:** con 10-15 farmaci/die, piccoli slittamenti fisiologici (1-5 min) sono frequenti; segnalarli come "scaduti" erode la percezione del segnale.
- **Coerenza interna:** `TOLLERANZA_MIN = 15` è già usata per colorare il delta come verde/rosso dopo l'assunzione. Applicarla anche alla transizione di stato unifica il concetto "in orario ± tolleranza".
- **Lessicale:** "SCADUTA" → "in ritardo". Più neutro, meno giudicante, più accurato (la dose non è perduta, è solo ritardata).

Impatto implementativo: modifica minore a `getState` nello Step 7 + rename del badge nella Card. Zero impatto sul dominio (Step 4).

### 6.10 Unica funzione pura `applyAssunzione` (Step 4b)

Il mockup v5 ha due handler duplicati: `handlePreso` (flow tap PRESA) e `handleSaltataSetTime` (flow "l'ho presa alle..."). Condividono ~40 righe: calcolo delta, aggiornamento stato, ricalcolo dose successiva, propagazione gap.

**Scelta Step 4b:** un'unica funzione pura `applyAssunzione(plan, input)` nel dominio. `input.oraEffettiva` e `input.dataEffettiva` sono sempre forniti dal chiamante: la UI del tap PRESA passa il "now" (da `useNow`), il flow retroattivo passa i valori scelti nel time picker. Il dominio non conosce il concetto di "now" — vincolo di purezza.

**Correzione bug v5 associata:** `handleSaltataSetTime` del mockup non chiamava `autoSkip` sulle dosi precedenti non prese. Nella versione Step 4b, `applyAssunzione` chiama sempre `autoSkip` (comportamento simmetrico ai due flow). Bugfix dichiarato, non regressione accidentale.

### 6.11 `calcolaDelta` DATETIME-based (Step 4a)

Il mockup v5 calcola `delta = curMin - expMin` con wraparound ±720 (interpreta scostamenti > 12h come appartenenti al giorno opposto).

**Bug emerso:** dose prevista alle 08:00, presa alle 21:00 dello stesso giorno (ritardo oggettivo 13h = +780 min). Il wraparound ±720 applica -1440 → -660 min, mostrando "anticipo 11h" invece di "ritardo 13h".

**Scelta Step 4a:** `calcolaDelta({dataPrevista, oraPrevista, dataEffettiva, oraEffettiva}) → minuti` basato su DATETIME, zero wraparound. La UI passa sempre la data esplicita (già in memoria nel plan come `entry.dateStr`).

### 6.12 Auto-skip e gap propagation corretta (Step 4b)

Il mockup v5 propaga `gap_minuti` della dose saltata **sulla dose appena presa** (che ha già il suo delta). Nel caso reale `gap=0` sulla saltata rende il bug invisibile (propagare 0 è no-op), ma la semantica è scorretta.

**Scelta Step 4b:** quando si registra la presa della dose N:
- Le dosi precedenti non prese vengono marcate `saltata`.
- Il loro `gap_minuti` **non** viene sommato alla dose N (che ha già il suo delta).
- Il flag `dose_prec_saltata` viene messo sulla dose N+1 (la prossima da prendere), non sulla N (già `presa`).

Effetto UI: nello scenario "skippo dose 1, prendo dose 2", la dose 3 mostrerà il badge "⚠ dose prec. saltata". Nel mockup v5 questo badge non appariva. È un miglioramento di trasparenza, non una feature nuova.

### 6.13 Vincoli sicurezza recupero nel dominio + UI (Step 4b)

Il mockup v5 calcola `safetyMax` inline nel `RitardoModal`. In Step 4b:
- `calcolaRecuperoMax(farmaco, gapMinuti)` è funzione pura nel dominio.
- `applyRecupero(...)` **valida** l'input e solleva `DomainError` se `recuperoMinuti > calcolaRecuperoMax(...)`.
- Lo slider della UI (Step 7) userà la stessa funzione per bindare `max`, quindi non potrà generare input invalidi.

Single source of truth per il limite.

### 6.14 Undo = ripristino totale (Step 4b)

Scenario: dose 1 presa in ritardo → dose 2 ricalcolata → utente imposta recupero 60 min su dose 2 → utente fa undo su dose 1.

**Regola formalizzata:** l'undo azzera `ora_ricalcolata`, `gap_minuti`, `gap_originale`, `recupero_minuti` sulla dose N+1. Il recupero impostato dall'utente su N+1 si perde. Coerente con "undo = come se l'assunzione non fosse mai avvenuta".

**Implementazione Step 4b:** `annullaAssunzione(plan, entryKey)` ripristina target e N+1. Comportamento target:
- stato → `'ricalcolata'` se `ora_ricalcolata != null` al momento dell'undo
- stato → `'prevista'` altrimenti
- `ora_effettiva` e `delta_minuti` azzerati

Comportamento N+1: reset completo solo se currently `'ricalcolata'`; altrimenti lasciata intoccata (guardia contro undo di eventi non recenti).

### 6.15 (rinumerata da 6.16 di v2.1) Riservata

Slot rinumerato. Contenuto migrato in 6.16 per ordine cronologico di adozione.

### 6.16 Estrazione `computeOraPrevista` in `orarioResolver.js` (Step 4b)

La funzione viveva in `planBuilder.js`. In Sessione 4b emerge che anche `ricalcolaPianoDaProfilo` (in `recalc.js`) e futuri consumatori (UI Step 7, scheduler notifiche Step 9) ne hanno bisogno.

**Scelta:** estratta in nuovo file `src/domain/orarioResolver.js`. `planBuilder.js` la importa da lì e la ri-esporta per retrocompatibilità con i test e eventuali consumatori che la importavano da `planBuilder`.

**Motivazioni:**
- Rule-of-three: tre consumatori previsti (planBuilder, recalc, UI/notifiche).
- Evita duplicazione inline con rischio di drift.
- Permette a `recalc.js` di non dipendere da `planBuilder.js`: grafo dipendenze pulito.

**Grafo dipendenze Step 4 completo:**
```
utils/time  ←  domain/constants  ←  domain/errors
   ↑                                   ↑
   ├── domain/orarioResolver          │
   │       ↑                           │
   ├── domain/planBuilder ─── re-export computeOraPrevista
   │                                   │
   └── domain/recalc ──────────────────┘
              │
              └── importa da: utils/time, domain/constants,
                              domain/errors, domain/orarioResolver
```

`recalc.js` NON importa da `planBuilder.js`.

### 6.17 Limitazione `annullaAssunzione` su dosi auto-skippate (Step 4b)

Scenario: `applyAssunzione` su dose N con dose N-1 ancora `'prevista'` → autoSkip marca N-1 come `'saltata'` e assegna a target presa. Se l'utente poi fa `annullaAssunzione` su N, target e N+1 vengono ripristinate ma **N-1 rimane `'saltata'`**.

**Motivazione:** l'helper `autoSkip` non traccia la causalità (quali saltate sono state prodotte da quale assunzione). Tracciarla richiederebbe un campo aggiuntivo nel modello (es. `saltata_by_assunzione_key`) o una tabella di audit.

**Scelta Step 4b:** limitazione accettata e documentata. In Step 5+ si potrà:
- Aggiungere un campo `saltata_causale` con la key dell'assunzione che l'ha causata
- Oppure far sì che `annullaAssunzione` riapra automaticamente tutte le `saltata` della stessa filiera farmaco/giorno precedenti a target

Nei test T11 e scenari real-world comuni (undo immediato dopo presa) questa limitazione non si manifesta: l'auto-skip avviene solo se si saltano intenzionalmente dosi intermedie.

### 6.18 Limitazione `ora_ricalcolata` cross-midnight (Step 4b)

Scenario: farmaco ogni 8h, dose 2 di 17/04 presa alle 23:00 → dose 3 (stesso giorno, scheduled 23:00) dovrebbe essere ricalcolata a 23:00 + 8h = 07:00 **del 18/04**.

**Comportamento attuale:** `applyAssunzione` calcola `ora_ricalcolata = minutesToTime(effMin + intervallo * 60)` con wrap modulo 1440 → stringa `'07:00'`. La `entry.dateStr` resta `'2026-04-17'`. La UI interpreterà `'07:00'` del 17/04, che è 8h PRIMA delle 23:00 del 17/04 — scorretto.

**Motivazione della scelta attuale:** comportamento identico al mockup v5. Nessun test T03–T12 espone il bug perché tutti i ricalcoli testati restano nello stesso giorno o avanzano al giorno dopo solo per dose_numero=1 (dove la dateStr della entry N+1 è già corretta).

**Azione Step 5+:** due opzioni da valutare:
1. Al ricalcolo: se `effMin + intervallo*60 >= 1440`, anche bumpare `nextDose.dateStr` (più delicato: la entry N+1 non esiste più nel piano se era già su un'altra dateStr)
2. Rappresentare `ora_ricalcolata` come DATETIME invece che TIME — più invasivo ma elimina l'ambiguità

Scelta da congelare in Step 5.

---

### 6.19 Nuova funzione `applyRipristino` nel dominio (Sessione 5a)

Sessione 5a introduce una sesta funzione `apply*` nel dominio per coprire le transizioni di correzione dallo stato "inattivo" (saltata/sospesa) verso altri stati, richieste dalle modali `SospesaCorrectModal` e `SaltataCorrectModal` del mockup v5.

**Firma:**
```js
applyRipristino(plan: Plan, entryKey: string, to: 'attiva'|'sospesa'): ApplyResult
```

Copre le seguenti transizioni:
- `sospesa → prevista` (to='attiva', ora_ricalcolata=null)
- `sospesa → ricalcolata` (to='attiva', ora_ricalcolata≠null)
- `saltata → prevista` (to='attiva', ora_ricalcolata=null, rollback N+1)
- `saltata → ricalcolata` (to='attiva', ora_ricalcolata≠null, rollback N+1)
- `saltata → sospesa` (to='sospesa', rollback N+1)

La transizione `sospesa → saltata` NON passa da qui: l'UI chiama direttamente `applySalto` (che tollera `target.stato='sospesa'` come input, confermato nella risposta Q5 di Sessione 5).

**Rollback N+1 — semantica:** quando il target di partenza è `'saltata'` e `applySalto` aveva propagato alla dose N+1 gap/warning, `applyRipristino` esegue rollback solo se:
- `N+1.stato === 'prevista'` (l'utente non l'ha ancora toccata), AND
- `N+1.dose_prec_saltata === true` (il marker del pass-through è intatto)

Il rollback azzera `gap_minuti`, `gap_originale`, `dose_prec_saltata` su N+1.

**Limitazione A (rollback conservativo):** se N+1 è in stato diverso da `'prevista'` (presa/saltata/sospesa/ricalcolata), o se il marker `dose_prec_saltata` è stato già cancellato, il rollback è skippato. Scelta deliberatamente più restrittiva del mockup v5 (`handleChangeToSospesa`, che rollbackava purché N+1 !== 'preso'), per evitare di corrompere stato di catene modificate dall'utente dopo l'originale `applySalto`. È una correzione di qualità, non un bug.

**Limitazione B (rollback lossy del gap):** il rollback porta `N+1.gap_minuti` a 0, non al valore pre-applySalto. Nel caso di catene (saltata → saltata → saltata) questo cancella il gap intermedio residuo. Accettabile per lo stesso principio di §6.17: il dominio non traccia la causalità del gap.

**Validazioni:** la funzione lancia `DomainError` per:
- `RIPRISTINO_STATO_INVALIDO`: target non in {'saltata','sospesa'}
- `RIPRISTINO_TARGET_INVALIDO`: parametro `to` non in {'attiva','sospesa'}
- `RIPRISTINO_NOOP`: tentativo `sospesa → sospesa`

**Test:** 16 test in suite T13 (`T13 — applyRipristino`). Tutti verdi.

### 6.20 Nuovo metodo repo `setProfiloAttivoConCleanup` (Sessione 5a)

Aggiunto al contratto `IRepository` e implementato in `LocalRepository` un metodo atomico per attivare un profilo ed eliminare log selezionati in una singola transazione Dexie.

**Firma:**
```js
setProfiloAttivoConCleanup(
  profiloId: number,
  logsToDelete: Array<{farmaco_id: number, data: string, dose_numero: number}>
): Promise<void>
```

**Motivazione:** al cambio profilo (Sessione 5b, thunk `cambiaProfilo`), il dominio `ricalcolaPianoDaProfilo` resetta in memoria le entry in stato `'ricalcolata'` a `'prevista'` (v. §AMB-3). Ma i log persistiti su IDB con `stato='ricalcolata'` sopravviverebbero e verrebbero rimergiati al prossimo `buildMultiDayPlan`. Il metodo atomico risolve: il thunk raccoglie le tuple delle ricalcolate, le passa come `logsToDelete`, e la transazione garantisce che attivazione profilo + cleanup log avvengano insieme o per nulla.

Il metodo precedente `setProfiloAttivo(id)` resta disponibile per i casi senza cleanup (es. prima attivazione all'init o profili nuovi).

**Smoke test:** `window.__pt.testProfileCleanup()` in `devCheck.js`. Crea un log dummy, attiva l'altro profilo con cleanup mirato, verifica outcome, ripristina il profilo originale senza lasciare garbage.

### 6.21 Fix ENUM drift in layer repository (Sessione 5a)

La deviazione §6.8 (rinaming stati da maschile a femminile con aggiunta di `sospesa`, riversata in spec v1.2) era stata applicata al dominio Step 4 e al test suite, ma **non** ai file del layer repository scritti in Sessioni 1–3. Drift accumulato:

- `src/data/repository/IRepository.js`: typedef `LogAssunzione.stato` conteneva ancora l'ENUM maschile `"previsto"|"preso"|"saltato"|"ricalcolato"|"sospesa"`.
- `src/data/repository/LocalRepository.js`: `upsertLog` usava `"previsto"` come default per nuove righe.
- `src/data/devCheck.js`: lo smoke test `testRepo()` scriveva un log con `stato: "preso"` e assertava su quel valore.

Il drift sarebbe stato attivato da Sessione 5b al primo `upsertLog` di una `logWrite` femminile (es. `'presa'`), producendo DB con ENUM misto maschile (legacy + seed test) e femminile (nuove scritture del dominio). In assenza di vincoli di schema IDB, il problema sarebbe emerso al primo `mergeLogIntoEntry` che avrebbe prodotto `PlanEntry.stato='previsto'` (stringa valore invalida per il dominio).

**Fix applicato in Sessione 5a:** sincronizzazione del layer repository al rinaming §6.8:
- Typedef aggiornata a `"prevista"|"presa"|"saltata"|"sospesa"|"ricalcolata"`.
- Default `upsertLog` a `"prevista"`.
- Smoke test `testRepo()` usa `"presa"`.

Non è una deviazione nuova rispetto alla spec: è l'applicazione retroattiva di una deviazione già congelata (§6.8). Documentata come §6.21 per tracciabilità della sessione in cui il drift è stato individuato e sanato.

---

### 6.22 Nuova API repo `upsertLogsBatch` (preparatorio Sessione 5b)

**Problema:** il pattern ottimistico di persistenza (Q7 di Sessione 5) richiede che TUTTI i `logWrites` prodotti da un `ApplyResult` siano persistiti atomicamente. Un `applyAssunzione` con auto-skip può produrre 3 logWrites (dose saltata + dose presa + dose ricalcolata N+1). Con l'attuale `upsertLog` single-row, in caso di crash tra la scrittura 1 e la 2 il DB resterebbe inconsistente: dose N+1 vedrebbe ancora lo stato pre-assunzione, dose N sarebbe 'presa', catena ricalcolo persa.

**Decisione:** aggiungere al contratto `IRepository` e implementare in `LocalRepository` il metodo:

```js
/**
 * Atomically upsert multiple log entries in a single IDB transaction.
 * @param {LogAssunzione[]} logs
 * @returns {Promise<LogAssunzione[]>}
 */
upsertLogsBatch(logs)
```

**Implementazione:** singola `db.transaction("rw", db.log_assunzioni, async () => {...})` che itera su tutti i log passati, con logica di upsert (find-by-composite-key + update-or-insert) inline. NON delega a `upsertLog` per evitare transazioni annidate.

**Quando usarla:**
- Sempre nei thunk apply* (presa/salta/sospendi/recupero/ripristina/annullaUltima) — tramite l'helper `commitApplyResult`
- `upsertLog` singolo resta disponibile per operazioni non-apply (es. scrivere un log manualmente in devCheck)

**Ambito implementazione:** Sessione 5b.

Documentata come deviazione al contratto IRepository originale (Sessione 3). Quando arriverà il backend MariaDB, l'endpoint corrispondente userà una singola transazione SQL o un batch insert.

### 6.23 Invariante `mergeLogIntoEntry` rispetto a `ora_prevista`

**Problema:** dopo un cambio profilo, il plan in memoria viene ricalcolato con `ricalcolaPianoDaProfilo` che aggiorna `ora_prevista` di ogni entry al valore derivato dal nuovo profilo. I log persistiti su IDB mantengono la `ora_prevista` storica (dal profilo vecchio). Al prossimo init/rebuild, `mergeLogIntoEntry` deve decidere quale sorgente vince.

**Decisione (invariante, non modifica codice se già conforme):** `mergeLogIntoEntry` **non** sovrascrive `plan.ora_prevista` con `log.ora_prevista`.

Il plan mantiene l'orario dal profilo corrente (semantica: "a che ora questa dose dovrebbe essere presa oggi"); il log conserva l'orario storico come dato di audit (utile per viste Log/Export in Fase 3). Il confronto tra programmato e effettivo è già congelato in `log.delta_minuti` al momento della presa, quindi non si corrompe.

**Azione richiesta in Sessione 5b:** primo passo = verificare il comportamento corrente di `mergeLogIntoEntry` in `planBuilder.js`. Due esiti possibili:

- (a) già non sovrascrive `ora_prevista` → conformità documentata, nessuna modifica
- (b) sovrascrive → fix in planBuilder.js + test aggiuntivo in planBuilder.test.js, segnalato come scoperta AMB-5b prima di procedere con altri file

La dichiarazione come §6.23 serve a evitare la perdita di questa invariante in future modifiche a `mergeLogIntoEntry` (es. Fase 3 vista Log).

**Verifica Sessione 5b-1:** conformità (a) confermata. Nessun fix al dominio richiesto.

---

## 7. Roadmap Fase 2 — avanzamento

| Step | Contenuto | Stato | Note |
|---|---|---|---|
| 1 | Scaffolding Vite + Tailwind + Router + PWA base | ✅ Completo | 45 file strutturali, navigazione funzionante |
| 2 | Schema Dexie + seed idempotente | ✅ Completo | 2 profili, 11 farmaci, 17 orari, 3 settings |
| 3 | Repository pattern (interfaccia + LocalRepository) | ✅ Completo | 30 metodi + smoke test 12 asserzioni |
| **4a** | **Dominio: types + constants + errors + utils/time + planBuilder + test** | ✅ **Completo** | 33/33 test passed |
| **4b** | **Dominio: orarioResolver (estratto) + recalc + apply* + copertura** | ✅ **Completo** | 79/79 test totali, coverage 100% su recalc.js |
| **5a** | **Preparatorio: applyRipristino + setProfiloAttivoConCleanup + ENUM drift fix** | ✅ **Completo** | 95/95 test passed |
| **5b-1** | **Stato globale parte 1/2: reducer + selectors + applyHelper + upsertLogsBatch** | ✅ **Completo** | 119/119 test passed (reducer: 24 test) |
| **5b-2** | **Stato globale parte 2/2: thunks + AppContext + wire-up** | ✅ **Completo** | 119/119 invariati. 12 thunks. Verifica browser: plan.length=39 |
| **6** | **Hook `useNow` (tempo reale in prod / simulato in dev)** | ⏳ **Prossimo** | Prompt in §11 (analisi-first) |
| 7 | Vista Oggi completa (porting mockup v5 + tema + stato `in ritardo`) | | |
| 8 | Vista Config (profili + farmaci + orari + nome utente) | | |
| 9 | Notifiche locali (Notification API + scheduling) | | |
| 10 | Service worker attivo + manifest definitivo + icone | | |
| 11 | Polish, QA, accessibilità, gestione errori | | |

### Setup testing (Step 4a–4b)

devDependencies installate:
- `vitest@^2.1.9` — runner
- `jsdom@^25.0.1` — env per futuri test React (Step 5+)
- `@vitest/coverage-v8@^2.1.9` — coverage (pinned a 2.x per compatibilità con vitest 2.1)

Convenzioni adottate:
- Test di dominio iniziano con `// @vitest-environment node` (in prima riga)
- `vitest.config.js` implicito: usa default (environment node)
- Quando serviranno test React useranno `// @vitest-environment jsdom`

---

## 8. Convenzioni di codice

- **Codice e commenti:** inglese
- **UI, messaggi, documentazione:** italiano
- **Nomi DB (tabelle, campi):** italiano (come da spec)
- **Valori degli ENUM di stato:** italiano **al femminile** (spec v1.2, sez. 3.6)
- **File JSX:** un componente per file, PascalCase
- **Import path:** relativi (`../data/db.js`), no alias Webpack-style per ora
- **Async/await:** sempre, no `.then()` a catena
- **Transazioni Dexie:** esplicite quando si toccano più tabelle o righe critiche
- **Funzioni di dominio:** pure. Zero `Date.now()`, `fetch`, `localStorage`, `console.log` nei path principali. Tutti gli input temporali (data/ora corrente) vengono passati dal chiamante.
- **Immutabilità del dominio:** le funzioni `apply*` NON mutano il plan o le entries in ingresso. Producono nuovi array via map+spread. Test di immutabilità con `structuredClone` per ogni `apply*`.

---

## 9. Come testare lo stato attuale (fine Step 5b-2)

```bash
cd ~/Sviluppo/pharmatimer
npm test -- --run
```

Output atteso:
```
 ✓ src/utils/time.test.js (24 tests)
 ✓ src/domain/planBuilder.test.js (9 tests)
 ✓ src/domain/recalc.test.js (62 tests)
 ✓ src/state/reducer.test.js (24 tests)

 Test Files  4 passed (4)
      Tests  119 passed (119)
```

Per coverage:
```bash
npx vitest run --coverage src/domain/recalc.test.js
```

Output atteso: `recalc.js` → Statements 100%, Branch 100%, Funcs 100%, Lines 100%.

Per avvio app in dev (come da Step 3):
```bash
npm run dev
```

Dev helper console su `http://localhost:5173`:
```javascript
// Helpers data-layer (installati da devCheck.js, sempre disponibili):
await __pt.counts()              // verifica conteggi seed
await __pt.inspect()             // snapshot completo DB
await __pt.testRepo()            // smoke test 12 asserzioni repository
await __pt.testProfileCleanup()  // smoke test setProfiloAttivoConCleanup (5a)
await __pt.wipe()                // reset totale (seguito da reload)

// Helpers state-layer (installati dall AppProvider dopo il primo render):
__pt.app.getState()              // snapshot AppState corrente
__pt.app.actions                 // 12 thunks/azioni
__pt.app.actions.presa(key)      // esempio: apply assunzione
__pt.app.actions.setSimulatedNow('14:30')  // simula orario (DEV)
```

Verifica end-to-end Sessione 5b-2 (console DevTools su `/oggi`):
- `__pt.app.getState().status` → `'ready'`
- `__pt.app.getState().profiloAttivo?.nome_profilo` → `'Standard'`
- `__pt.app.getState().farmaci.length` → `11`
- `__pt.app.getState().plan.length` → `39` (3 giorni × dosi attive)
- `Object.keys(__pt.app.actions).sort()` → 12 nomi
- `__pt.app.getState().error` → `null`

---

## 10. Decisioni pre-implementazione Step 4 (approvate sessione 17 apr 2026)

Sintesi delle 7 domande Q1–Q7 emerse nell'analisi critica del mockup v5, con le risposte approvate.

| # | Tema | Decisione |
|---|---|---|
| Q1 | Duplicazione `handlePreso` / `handleSaltataSetTime` | Unica funzione pura `applyAssunzione(plan, input)`; UI passa sempre `oraEffettiva` + `dataEffettiva` |
| Q2 | Auto-skip e gap propagation | Dosi precedenti marcate `saltata`, gap NON sommato alla presa; flag `dose_prec_saltata` su N+1 |
| Q3 | Cross-day delta | `calcolaDelta` DATETIME-based, eliminato wraparound ±720 |
| Q4 | Vincoli sicurezza recupero | `calcolaRecuperoMax` nel dominio (unica fonte), UI la usa per bindare slider |
| Q5 | Firme funzioni pure | `applyAssunzione`, `applySalto`, `applySospensione`, `applyRecupero`, `annullaAssunzione`, `ricalcolaPianoDaProfilo` |
| Q6 | Plan persistito vs calcolato | Calcolato on-demand da DB, `log_assunzioni` fonte di verità |
| Q7 | Test Vitest | ~12 suite (T01–T12), copertura ≥ 90% su recalc.js (raggiunto 100%) |

Chiarimenti risolti pre-Step 4b (AMB-1/2/3):
- **AMB-1** Estrazione `computeOraPrevista` in `orarioResolver.js` (§6.16)
- **AMB-2** Invariante logWrites = "1 per ogni entry modificata"; `logWrites.length` specificato per tutti i T03–T11
- **AMB-3** Delta come fatto storico in `ricalcolaPianoDaProfilo` per entries `'presa'`; reset completo per entries `'ricalcolata'`

---

## 11. Prossimo step — messaggio di apertura Sessione 6

Scope Sessione 6: implementare il hook `useNow` che espone "adesso" ai componenti UI, in modalità produzione (system clock reattivo) e sviluppo (valore simulato). Sostituisce le chiamate inline `new Date()` sparse nei selectors e nel Provider.

Il prompt di sotto è in **modalità analisi-first** (non esecutiva): chiede all'apertura sessione di mappare consumatori, trade-off e aperture — prima di proporre qualsiasi file. Il modello di Sessione 5b (D1-Dn pre-approvate) sarà applicato dopo il ciclo analisi/conferma.

Prompt da incollare nella nuova conversazione del progetto:

```
Continuiamo PharmaTimer. Sessione 6: hook useNow.

Contesto in KB — leggi integralmente PRIMA di rispondere:
- PharmaTimer_Project_Spec.md v1.2 (sez. 5 per semantica tempo, se presente)
- PharmaTimer_Changelog_Fase2.md v2.5.2
  - sez. 1 (decisioni architetturali: "Slider tempo solo in dev")
  - sez. 15 "Stato post-Sessione 5b parte 2/2" (stato corrente)
  - sez. 3 (struttura progetto: file target src/hooks/useNow.js)

Stato del codice (119/119 test):
- AppProvider attivo, rollover detect già funzionante (setInterval 60s + visibilitychange)
- state.simulatedNow: 'HH:MM'|null — gestita da SET_SIMULATED_NOW + thunk setSimulatedNow
- selectors.selectProssimaDose chiama internamente new Date() con parametro opzionale now
- selectors.selectToday chiama internamente new Date() con parametro opzionale now
- Nessun componente UI reale ancora consuma l'orario reattivo (OggiView è placeholder 5-campi)
- Prossimo consumatore massivo: Step 7 (vista Oggi completa, stato "in ritardo", conto alla rovescia, delta live)

=== ANALISI DA FARE PRIMA DI PROPORRE CODICE ===

Produci una sezione "Analisi pre-implementazione Sessione 6" che copra:

1. Consumatori previsti e requisiti differenziati
   - Chi chiama useNow in Step 7? Card (per stato in ritardo / delta live / countdown),
     Header (clock grande visibile?), modali retro-presa?
   - Granularità: tutti al minuto o qualcuno al secondo?
   - Quanti re-render al minuto sono accettabili in una pagina con N card?

2. Shape del valore restituito
   - Date oggetto? { dateStr, hhmm, minutes }? Entrambi?
   - Se Date: i consumatori chiamano getHours() etc. sparsi, rischio drift
   - Se struttura piatta: più ergonomico ma meno estendibile

3. Integrazione con state.simulatedNow
   - useNow deve leggere simulatedNow via useAppContext? (accoppiamento Provider)
   - O accettarlo come parametro esterno (chiamante decide)?
   - Quando simulatedNow è impostato: valore statico o avanza di 1 minuto ogni 60s reali?

4. Refactor selectors
   - selectProssimaDose e selectToday accettano "now" come param opzionale (già cosi)
   - I consumatori attuali (OggiView placeholder, rollover detect in AppContext) vanno
     adattati a passare il Date/hhmm proveniente da useNow?
   - Rollover detect è già nel Provider: mantenerlo li (è in useEffect, non serve hook)
     o spostarlo dentro useNow stesso?

5. Fonte del tick
   - Un unico setInterval globale con context/subscription, o setInterval per ogni hook?
   - Se un setInterval per hook con N card montate → N timer — inefficiente
   - Alternativa: un solo timer nel Provider che dispatcha NOW_TICK ogni minuto,
     simulatedNow e tick reale convergono in state.nowTick

6. Test
   - Hook testabile con @testing-library/react + vitest (jsdom)?
   - Vale la pena aggiungere 1-2 test minimi, o rinviare a Step 7?

7. Slider DEV
   - Componente src/components/shared/DevTimeSlider.jsx (già pianificato in §3) va
     scritto in Sessione 6 o rinviato a Step 7 dopo che useNow e-consumer esistono?

Al termine: proponi **D1-Dn decisioni pre-implementazione** (stile §13 Sessione 5b) da
confermare prima di scrivere codice. Includi il campo "thunk count post-Sessione 6"
e "test count target" per chiusura.

Nessun codice fino alla conferma delle decisioni.

=== VINCOLI NON NEGOZIABILI ===

- File target principale: src/hooks/useNow.js
- Nessuna dipendenza esterna aggiunta
- Purezza del dominio preservata: recalc.js e planBuilder.js non devono importare useNow
- NavBar, routing, App.jsx, main.jsx: intoccati
- Deviazione AMB-5b2.F ancora vigente: placeholder in OggiView.jsx non va smantellato
  in questa sessione (Step 7 lo sostituisce con la vista reale)

Al termine della sessione (quando il codice sarà scritto e testato):
- Riepilogo strutturato
- Aggiornamento §7 roadmap: Step 6 ✅
- Prompt apertura Sessione 7 (vista Oggi)
```

---

## 12. File prodotti in Step 4a + 4b + 5a + 5b-1 + 5b-2

| File | Step | Note |
|---|---|---|
| `src/domain/types.js` | 4a | 133 righe |
| `src/domain/constants.js` | 4a (ext. 5b-2) | Esteso con PLAN_DAYS_BEFORE/AFTER/TOTAL_DAYS, GET_FARMACI_SOLO_ATTIVI (AMB-5b2.D) |
| `src/domain/errors.js` | 4a | 21 righe |
| `src/utils/time.js` | 4a | 122 righe |
| `src/utils/time.test.js` | 4a | 149 righe |
| `src/domain/planBuilder.js` | 4a (mod. 4b §6.16) | 137 righe |
| `src/domain/planBuilder.test.js` | 4a | 243 righe |
| `src/domain/orarioResolver.js` | 4b | 35 righe |
| `src/domain/recalc.js` | 4b (mod. 5a §6.19) | ~650 righe con applyRipristino |
| `src/domain/recalc.test.js` | 4b (mod. 5a §6.19) | ~1080 righe con T13 |
| `src/data/repository/IRepository.js` | 3 (mod. 5a §6.20/§6.21, 5b-1 §6.22) | typedef upsertLogsBatch aggiunta |
| `src/data/repository/LocalRepository.js` | 3 (mod. 5a §6.20/§6.21, 5b-1 §6.22) | metodo upsertLogsBatch aggiunto |
| `src/data/devCheck.js` | 3 (mod. 5a §6.20/§6.21) | |
| `src/state/reducer.js` | 5b-1 | 16 azioni, ~130 righe |
| `src/state/reducer.test.js` | 5b-1 | 24 test, ~240 righe |
| `src/state/selectors.js` | 5b-1 | 5 selectors puri, ~80 righe |
| `src/state/applyHelper.js` | 5b-1 (ext. 5b-2) | Esteso con popPresoKey + idempotenza (AMB-5b2.A), ~130 righe |
| `src/state/actions.js` | **5b-2** | createActions factory + 12 thunks + 3 helper interni, ~290 righe |
| `src/state/AppContext.jsx` | **5b-2** | Provider reale: useReducer + stateRef + useAppContext + init on mount + rollover detect + DEV window.__pt.app, ~90 righe |
| `src/components/oggi/OggiView.jsx` | **5b-2** | Placeholder ready 5-campi (deviazione AMB-5b2.F, v. §15) |
| **Totale test passing** | | **119/119** |

---

## 13. Decisioni pre-implementazione Sessione 5b

Sezione prodotta durante l'analisi di coerenza del prompt Sessione 5b. Elenca 14 decisioni di design risolte prima di aprire la sessione esecutiva, sul modello della sezione 10 per Sessione 4. Tutte confermate dall'utente.

| # | Tema | Decisione |
|---|---|---|
| D1 | Azioni reducer | 16 azioni totali (aggiunte `SET_ORARI`, `REBUILD_PLAN` rispetto al draft originale) |
| D2 | Sorgente "now" nei thunk | Il thunk risolve: se `state.simulatedNow != null` usa quello, altrimenti `new Date()` formattato HH:MM |
| D3 | API repo per logWrites | Nuovo metodo `upsertLogsBatch(logs)` atomico — §6.22 |
| D4 | Pattern persistenza | Ottimistico (dispatch → persist → rollback) per tutti gli apply*. Pessimistico (persist → dispatch, no rollback) per cambiaProfilo |
| D5 | Merge log vs plan | `mergeLogIntoEntry` **non sovrascrive** `plan.ora_prevista` — §6.23 |
| D6 | Shape AppContext | Valore singolo `{state, actions}` (no split StateContext/DispatchContext) |
| D7 | Pattern ottimistico DRY | File `src/state/applyHelper.js` con funzione `commitApplyResult({dispatch, getState, domainCall, pushPresoKey})` riutilizzata dai 6 thunk apply* |
| D8 | Firma thunk presa | `presa(entryKey, override?)` con `override = {dataEffettiva, oraEffettiva}` opzionale. Stesso pattern esteso a salta/sospendi |
| D9 | `error.kind` enum | `'domain' \| 'repo' \| 'init' \| 'unknown'` |
| D10 | Nome azione cambio profilo | `APPLY_CAMBIO_PROFILO` (esplicito commit atomico profilo+plan). Rinominato da `SET_PROFILO_ATTIVO` |
| D11 | presoStack | Ephemeral (non persistita). UNDO utile in finestra breve; refresh = stack pulito |
| D12 | Smoke test console | In DEV, il Provider espone `window.__pt.app = {getState, actions}` tramite ref aggiornata in useEffect |
| D13 | Test obbligatori | Reducer: sì (~20 test in `reducer.test.js`). Thunks: no in questa sessione |
| D14 | Target test post-5b | 95 (correnti) + 20 (reducer) = **115 test passing** |

### Azione pre-implementazione residua

Durante l'implementazione, come primo passo Sessione 5b verifica il comportamento di `mergeLogIntoEntry` in `planBuilder.js` (§6.23). Se già conforme (non sovrascrive `ora_prevista`), nessuna modifica al dominio — solo documentazione di conformità. Se non conforme, fix + test aggiuntivo, segnalato come AMB-5b prima di procedere con i file state/.

### Analisi di qualità — problemi identificati e risolti

L'analisi del prompt originale (versione Changelog v2.3) ha identificato:
- **5 problemi bloccanti:** azioni reducer mancanti, init senza merge log, API batch assente, pattern pessimistico contraddittorio — risolti da D1, D3, D4
- **3 rilevanti:** consistenza ora_prevista cross-profile, pattern thunks, firma presa — risolti da D5, D6+D7, D8
- **7 minori:** error.kind vago, selectors impliciti, naming azione, presoStack persistence, smoke helpers, test reducer, scope — risolti da D9-D14

Approccio adottato: **A + sanity check** (decisioni centralizzate dal modello analista, confermate dall'utente, verificate dal modello esecutore tramite sanity check all'apertura di Sessione 5b). Evita il Q&A iterativo in-session mantenendo il controllo decisionale.

---

## 14. Stato post-Sessione 5b parte 1/2

Sessione 5b parte 1/2 completata il 18 aprile 2026. Output verificato nel sandbox e in locale con 119/119 test verdi.

### File prodotti
- `src/state/reducer.js` — 16 azioni, stato iniziale tipizzato, immutabilità via spread
- `src/state/reducer.test.js` — 24 test (target §13/D14 era ~20; +4 per edge cases)
- `src/state/selectors.js` — 5 selectors puri (`selectToday`, `selectEntriesForDay`, `selectProssimaDose`, `selectFarmaciAttivi`, `selectHasError`)
- `src/state/applyHelper.js` — `commitApplyResult` DRY con rollback composto (`SET_PLAN` + eventuale `DISMISS_PROMPT` + eventuale `POP_PRESO_STACK`)
- `src/data/repository/IRepository.js` — typedef `upsertLogsBatch` aggiunta (§6.22)
- `src/data/repository/LocalRepository.js` — metodo `upsertLogsBatch` atomico aggiunto (§6.22)

### Conformità §6.23 verificata
Ispezione di `src/domain/planBuilder.js` eseguita in apertura di sessione: la funzione `mergeLogIntoEntry` NON scrive `entry.ora_prevista`. Il plan mantiene quindi l'orario calcolato da `computeOraPrevista(orario, profilo)` al build, mentre il log conserva la `ora_prevista` storica (audit). Nessun fix al dominio richiesto. L'invariante è ora dichiarata come §6.23 del Changelog per prevenire drift in future modifiche.

### Test counts
- Prima: 95/95 (fine Sessione 5a)
- Dopo: 119/119 (+24 reducer)
- Dominio invariato: planBuilder 9, recalc 62, time 24
- Target §13/D14 era 115; risultato 119 (+4 test edge case utili)

### Deviazioni aggiuntive
Nessuna rispetto a §13 D1-D14 e §6.22/§6.23.

### Limitazioni note
- Nessun test propri per `upsertLogsBatch` (per §13/D13 i test del layer I/O sono fuori scope sessione 5b)
- Nessun test propri per `selectors.js` (stesso rationale)
- I thunks e il Provider restano da implementare — scope parte 2/2

### Azioni sul Mac prima della parte 2/2
Nessuna. Il progetto è in stato coerente, tutti i test passano, i file parte 1/2 sono committabili.

---

## 15. Stato post-Sessione 5b parte 2/2

Sessione 5b parte 2/2 completata il 18 aprile 2026. Output verificato nel sandbox (119/119 Vitest) e in browser via `__pt.app` dopo `npm run dev`.

### File prodotti e modificati

**Estensioni retroattive (applicate a file 5b-1 e 4a):**
- `src/domain/constants.js` — da 3 a 14 righe. Aggiunte `PLAN_DAYS_BEFORE=1`, `PLAN_DAYS_AFTER=1`, `PLAN_TOTAL_DAYS=3`, `GET_FARMACI_SOLO_ATTIVI=false` (AMB-5b2.D).
- `src/state/applyHelper.js` — da ~80 a ~130 righe. Aggiunto parametro `popPresoKey: boolean` con idempotenza mutualmente esclusiva rispetto a `pushPresoKey` (AMB-5b2.A). Guard sincrona `throw Error('commitApplyResult: pushPresoKey and popPresoKey are mutually exclusive')` se entrambi truthy.

**File nuovi:**
- `src/state/actions.js` — ~290 righe. `createActions({dispatch, getState, repo})` restituisce 12 thunks: init, rebuildPlan, presa, salta, sospendi, recupero, ripristina, annullaUltima, cambiaProfilo, dismissPrompt, setSetting, setSimulatedNow. Include 3 helper interni privati: `resolveNow(state, now?)`, `readSettingFromState(state, chiave)`, `dispatchSettingUpdate(dispatch, chiave, valore)`.
- `src/state/AppContext.jsx` — ~90 righe. Sovrascrive lo stub Sessione 1. Espone `AppProvider({children})` e `useAppContext()`. Wiring: `useReducer(reducer, initialState)` + `stateRef` aggiornato in `useEffect` + `getStateRef` stabile + `createActions` memoizzato una volta + `init()` on mount + rollover detect (`setInterval 60_000` + `document.addEventListener('visibilitychange')`) + DEV helper `window.__pt.app = {getState, actions}` namespaced sotto il `window.__pt` di `devCheck.js`.
- `src/components/oggi/OggiView.jsx` — ~60 righe. Sovrascrive il placeholder Sessione 1. Placeholder ready 5-campi con rami `status === 'idle'|'error'|'ready'`. Nel ramo error: bottone "Riprova" che chiama `actions.init()`.

**Intoccati (come prescritto dal prompt):**
- `src/App.jsx` (router reale)
- `src/main.jsx`
- `src/components/shared/NavBar.jsx`
- Route stub `/log`, `/export`

### Deviazioni aggiuntive

**AMB-5b2.F — App.jsx non toccato; placeholder in OggiView.jsx**

Il prompt §11 (v2.5.1) listava `src/App.jsx` come file da patchare per ospitare il placeholder "ready (5 campi)". Ispezione del file reale in apertura sessione: `App.jsx` NON è un placeholder generico ma il router effettivo Step 1 (`<Routes>` con `<OggiView/>`, `<ConfigView/>`, `<NavBar/>`, route stub `/log` e `/export`). Toccarlo per aggiungere il placeholder avrebbe violato la regola esplicita "NAV bar + route stub Oggi/Log/Export/Config: intoccate dallo Step 1".

**Scelta:** placeholder collocato in `src/components/oggi/OggiView.jsx` (che era esso stesso uno stub Sessione 1 con testo "Scaffold attivo"). Semanticamente equivalente: quando l'utente naviga a `/oggi`, vede le 5 righe di stato (Ciao / Profilo attivo / Farmaci attivi / Dosi oggi / Prossima) o il loading o l'errore — esattamente come atteso dal prompt.

**Motivazione:** preservare il wiring Step 1 evita regressioni sul routing e mantiene il confine di responsabilità ("App.jsx = shell + routing", "OggiView.jsx = vista"). Il porting completo della vista Oggi in Step 7 sovrascriverà di nuovo `OggiView.jsx`, cancellando questo placeholder — nessun debito tecnico accumulato.

**Impatto:** nessuno sui test (119/119 invariati). Il prompt §11 (v2.5.1) è da considerarsi corretto in spirito ma impreciso sul file target; la tabella SCOPE di quel prompt è stata eseguita con `App.jsx` ri-mappato su `OggiView.jsx`.

### Scoperte durante implementazione

- **`ricalcolaPianoDaProfilo` ritorna `Plan` puro (array), non `ApplyResult`.** Verificato via grep su `src/domain/recalc.js:550`: `export function ricalcolaPianoDaProfilo(plan, nuovoProfilo) { return plan.map((e) => { ... }); }`. Il thunk `cambiaProfilo` usa difensivamente `Array.isArray(out) ? out : out?.plan` con throw su shape inattesa (AMB-5b2.B) — in pratica prende sempre il primo ramo.
- **Reducer 5b-1 non ha azione `PUSH_PRESO_STACK` separata.** Il push avviene via `COMMIT_APPLY_RESULT { pushPresoKey }`. Conseguenza per AMB-5b2.A passo 4 (rollback di `annullaUltima`): il "re-push della key poppata" è implementato con un secondo `dispatch COMMIT_APPLY_RESULT { plan: snapshot, prompt: null, pushPresoKey: poppedKey }`, preceduto da `SET_PLAN(snapshot)` per aderenza letterale al testo AMB. React 18 automatic batching collassa i 3 dispatch in 1 render.
- **`commitApplyResult` — payload `COMMIT_APPLY_RESULT` invariato.** L'estensione AMB-5b2.A agisce solo dentro l'helper (snapshot `poppedKey` + secondo dispatch in rollback). Il reducer non è stato toccato: 16 azioni invariate.

### Test counts
- Prima: 119/119 (fine Sessione 5b-1)
- Dopo: 119/119 (invariato, come da §13/D13 — nessun test di thunks/Provider in 5b-2)

### Verifica browser (end-to-end)
Eseguita su `http://localhost:5173/oggi` (Chromium, DevTools Console):
- `__pt.app.getState().status` → `'ready'` ✓
- `__pt.app.getState().profiloAttivo?.nome_profilo` → `'Standard'` ✓
- `__pt.app.getState().farmaci.length` → `11` ✓
- `__pt.app.getState().plan.length` → `39` (3 giorni × ~13 dosi/giorno, plausibile) ✓
- `Object.keys(__pt.app.actions).sort()` → 12 nomi: `annullaUltima, cambiaProfilo, dismissPrompt, init, presa, rebuildPlan, recupero, ripristina, salta, setSetting, setSimulatedNow, sospendi` ✓
- `__pt.app.getState().error` → `null` ✓

Render UI su `/oggi`: 5 righe come da placeholder. Nessun errore in console.

### Limitazioni note

- **Nessun test unitario** su `actions.js` (thunks), `AppContext.jsx` (Provider), `applyHelper.js` esteso. Coerente con §13/D13 ("Thunks: no in questa sessione"). Integrazione coperta solo da verifica manuale browser.
- **Nessun test** su `upsertLogsBatch` (layer I/O, fuori scope 5b).
- **DEV helper `window.__pt.app`** disponibile solo dopo il primo render del Provider (installato in `useEffect`). Chiamate prima del mount restituiscono `undefined`.
- **Rollover detect** usa `selectToday(state)` che invoca `new Date()` internamente. Coerente col Punto 13 sanity check ma introduce una dipendenza dal clock non iniettabile. Step 6 (`useNow`) centralizzerà la lettura del clock e refattorizzerà questa dipendenza.
- **`ora_ricalcolata` cross-midnight** resta come limitazione §6.18 (non affrontata in 5b). Scelta da congelare prima o durante Step 7.

### Azioni sul Mac prima di Sessione 6
Nessuna. Il progetto è in stato coerente, tutti i test passano, tutti i file 5b-2 sono committabili. L'aggiornamento di questo Changelog alla versione v2.5.2 (file da caricare nella KB del progetto) è l'unica azione manuale residua.
