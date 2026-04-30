# PharmaTimer — Changelog Fase 2 (PWA frontend)

**Versione:** 2.5.40-rc.4
**Data inizio fase:** 16 aprile 2026
**Ultima modifica:** 30 aprile 2026 (Sessione 9-C analisi-first: §6.147 plan cross-day chiuso by-design + §6.148 §6.145 disconnect chiuso falso-positivo metodologico + §6.149 lessons-learned Console DevTools `await` mandatory; AMB-9-C.A÷B congelate; nessun fix code richiesto; CP browser P2-P5+P8 + bump v2.5.40 + cleanup `.bak.*` deferred a Sessione 9-D esecutiva snella)
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

**Changelog versione 2.5.3 (rispetto alla 2.5.2):**
- Analisi critica del prompt §11 v2.5.2 (modalità analisi-first): identificati 3 bloccanti, 3 rilevanti, 6 minor
- 8 AMB-6 pre-approvate congelate nel nuovo §11 esecutivo: A (utils/now.js + resolveNow condiviso), B (rollover resta in AppContext), C (simulatedNow statico), D (useNow solo discendenti Provider), E (timer unico nel Provider), F (shape ibrida {date,dateStr,hhmm,minutes,isSimulated} con date coerente quando simulato), G (ispezione mockup v5 primo passo + TICK_INTERVAL_MS in constants.js), H (target 120 test, +1 su resolveNow)
- Riscritto §11 da modalità analisi-first a modalità esecutiva (stile v2.5.1 per 5b-2): AMB nel prompt, sanity check a 12 punti, scope file ordinato, zero Q&A iterativo in-session
- Nessuna modifica al codice o ad altre sezioni (la sessione 6 applicherà le AMB)

**Changelog versione 2.5.4 (rispetto alla 2.5.3):**
- Sessione 6 completata: `src/utils/now.js` (resolveNow puro, shape AMB-6.F) + `src/hooks/useNow.js` (hook consumer del Provider tick) + refactor di `actions.js` (rimossa `resolveNow` privata, importa da utils/now), `selectors.js` (`selectToday`/`selectProssimaDose` via resolveNow, helper `formatISODate`/`formatHHMM` rimossi, `hhmmToMinutes` mantenuto locale), `AppContext.jsx` (state `tickMs`, timer unico `TICK_INTERVAL_MS` che fa tick + rollover check, value shape `{state, actions, tickMs}`). Estensione `constants.js` con `TICK_INTERVAL_MS=60_000`
- Totale test: 119 → **120** (+1 `utils/now.test.js`, 1 `it()` con 5 asserzioni, target §11/AMB-6.H rispettato)
- Nuova deviazione §6.24 (AMB-6.K) — visibilitychange aggiorna anche `tickMs` oltre al rollover check (AMB-6.B letterale prevedeva solo il rollover; estesa per coerenza UI al ritorno da background)
- Verifica browser end-to-end: `status='ready'`, `plan.length=39`, `lastBuiltForDay='2026-04-18'`, 12 actions, snippet tick 70s senza errori
- Aggiornamento roadmap §7: Step 6 ✅, Step 7 ⏳
- Aggiornata §12 con i file Sessione 6
- Nuova §16 "Stato post-Sessione 6"
- Sostituito prompt §11 (Sessione 6 consumato) con prompt Sessione 7 (vista Oggi completa, porting mockup v5) in modalità analisi-first

**Changelog versione 2.5.5 (rispetto alla 2.5.4):**
- Analisi critica del prompt §11 v2.5.4 (modalità analisi-first Sessione 7): identificati 4 bloccanti, 7 rilevanti, 8 minor
- Split finale dello Step 7 in **4 sotto-sessioni** (7a foundation non-UI / 7b lettura + PRESA/UNDO / 7c 5 modali / 7d polish + a11y). Priorità dichiarata: qualità massima del codice sul numero di sessioni.
- **12 AMB-7a pre-approvate** congelate nel nuovo §11 esecutivo: A (split 4 sotto-sessioni), B (§6.18 workaround UI), C (nuova chiave `tema`), D (PlanEntry.farmaco assunta object denormalizzata con fallback D.1), E (getCardState firma pura), F (format* porting 1:1), G (theme split puro+hook), H (useTheme read-only in 7a), I (shared/ location), J (setup @testing-library/react), K (target 145 test), L (renderHelpers + buildTestPlan condivisi)
- Nuova deviazione **§6.25** — nuova chiave `impostazioni_app.tema` (`'auto'|'light'|'dark'`, default `'auto'`)
- Nuova deviazione **§6.26** — workaround UI per §6.18 cross-midnight. Fix dominio rimandato a Step 9 (consumer naturale: scheduling notifiche DATETIME)
- Aggiornata §4 "Chiavi di `impostazioni_app`": aggiunta chiave `tema`
- Aggiornata roadmap §7: Step 7 split in 7a (⏳ prossimo) / 7b / 7c / 7d
- Riscritto §11 da modalità analisi-first a modalità esecutiva per Sessione 7a (sanity check 14 punti, 13 file nuovi, scope foundation non-UI)
- Nessuna modifica al codice (la Sessione 7a applicherà gli AMB)

**Changelog versione 2.5.6 (rispetto alla 2.5.5):**
- Sessione 7a completata: foundation non-UI per vista Oggi (13 file nuovi + 4 file modificati con estensioni retroattive minor)
- **Bloccante B1 risolto — Opzione 1**: `state.impostazioni` dict generico introdotto nel reducer + nuovo case `SET_IMPOSTAZIONE`. `init()` ora carica via `repo.getAllSettings()` e popola il dict. `setSetting` dispatcha sempre `SET_IMPOSTAZIONE` (+ `SET_NOME_UTENTE` mirror legacy per la chiave `nome_utente`). Documentato come §6.27 / AMB-7a.M
- **R2 applicato**: `AppContext` esportato in AppContext.jsx (riga `export const AppContext = createContext(null)`). Consente a `renderWithProvider` di wrappare con Provider stub invece di invocare `AppProvider` reale (che innescherebbe `repo.init()`)
- **R1 scoperta**: `SOGLIA_PROMPT_RECUPERO = 30` era già presente in constants.js dalle prime sessioni — punto 5 del prompt §11 v2.5.5 no-op
- Nuovo selector `selectImpostazione(state, chiave)` — wrapper puro con fallback `null`
- Setup test esteso: `@testing-library/react@^16`, `@testing-library/jest-dom@^6` aggiunti a devDependencies. `vitest.config.js` esplicitato (environment jsdom di default, setupFiles per jest-dom matchers)
- File foundation prodotti: `utils/theme.js` (porting 1:1 tokens), `utils/uiState.js` (`getCardState`, `isCrossMidnightRecalc`, format helpers), `hooks/useTheme.js` (read-only), `components/shared/{Icons, Badge, TapBadge}.jsx`, `test/{setup, renderHelpers}.{js,jsx}`
- Test totali: **120 → 148** (+28 vs target 145, tolleranza AMB-7a.K ±3 rispettata al boundary superiore). Breakdown: reducer +1 (SET_IMPOSTAZIONE), uiState +20 (target 18, +2 per boundary casing extra), useTheme +4, Badge +3
- Nuova deviazione **§6.27 (AMB-7a.M)** — `state.impostazioni` dict generico. Documentata causa e scelta della Opzione 1
- Nuova §17 "Stato post-Sessione 7a" con file prodotti, scoperte sanity check, deviazioni aggiuntive, limitazioni note, azioni Mac per Sessione 7b
- Aggiornamento roadmap §7: Step 7a ✅, Step 7b ⏳
- Aggiornata §12 con file 7a
- Aggiornata §7 "Setup testing" con nuove devDeps e convenzioni (jsdom default + directive `// @vitest-environment node` per test domain)
- Sostituito prompt §11 (Sessione 7a consumato) con prompt Sessione 7b in **modalità analisi-first** (7b tocca UI reale su complessità header + Card + grouping: richiede sanity check di scoperte prima della produzione)

**Changelog versione 2.5.7 (rispetto alla 2.5.6):**
- Analisi critica del prompt §11 v2.5.6 (modalità analisi-first Sessione 7b): identificati 1 bloccante B1 (raggruppamento spec §5.4 vs mockup), 1 bloccante B2 (enum getCardState femminile vs token theme.js maschili), 1 bloccante B3 (Provider tema non innestato nello shell), 11 AMB minor
- Split finale di **Sessione 7b in 7b-1 (foundation UI + read-only) e 7b-2 (PRESA/UNDO minimi)**. Motivazione: 14-16 file in sessione unica eroderebbero qualità; separando il rendering derivato dai side-effects persistenti la 7b-1 chiude con vista Oggi completa ma sola-lettura verificabile end-to-end
- 13 AMB-7b pre-approvate congelate nel nuovo §11 esecutivo 7b-1: A (split), B (grouping ibrido opz.3), C (rename chiavi theme.js al naming femminile), D (ThemedShell wrapper), E (NavBar token-aware), F (selectCountersForDay), G (groupEntriesByDayAndMomento helper puro), H (services/audio.js reale), I (useAutoBeep hook), J (DevTimeSlider componente), K (toggle tema ciclo auto→dark→light), L (DoseCard read-only + recalcDiff via dominio §6.11), P (target test +19), Q (riconciliare baseline 151 vs §17 148)
- Nuova deviazione **§6.28** — rename chiavi `cardBg`/`cardBorder` in theme.js al naming femminile + token globali `scaduta*` → `inRitardo*`
- Nuova deviazione **§6.29** — raggruppamento opzione ibrida: etichetta fascia su cambio `descrizione_momento`, gap visivo +12px su cambio orario all'interno del gruppo
- Aggiornata roadmap §7: Step 7 split da `7b ⏳` a `7b-1 ⏳ / 7b-2`
- Discrepanza baseline test: 151 passed (atteso 148). Causa non tracciata (residuo sessione 7a o npm install); non bloccante, da riconciliare in chiusura 7b-2 (AMB-7b.Q)
- Riscritto §11 in modalità esecutiva per Sessione 7b-1 (sanity check 8 punti, 9 file nuovi/modificati, scope read-only)
- Nessuna modifica al codice (la Sessione 7b-1 applicherà gli AMB)

**Changelog versione 2.5.8 (rispetto alla 2.5.7):**
- Sessione 7b-1 completata: foundation UI + vista Oggi read-only end-to-end verificata in browser. 14 file prodotti/modificati, tutti i 13 AMB-7b applicati
- Test totali: **151 → 170** (+19, target AMB-7b.P centrato esatto ±0). 8 → 11 test files (+3: `selectors.test.js`, `useAutoBeep.test.jsx`, `DoseCard.test.jsx`)
- AMB-7b.Q non riconciliato: la baseline residua 151 vs §17=148 è stata ereditata. La discrepanza (+3) va investigata in apertura 7b-2 se perseverata, diversamente chiusura silente
- Validazione browser CP5 (7 punti): 6 OK + 1 vacuously OK (badge cross-midnight assente per mancanza di ricalcoli — corretto su stato seed)
- Due hotfix rilevati in CP5 e applicati in sessione:
  - **§6.30** — toggle tema a 3 icone distinte (mezzo-cerchio / luna / sole) mode-driven. Fix ambiguità visiva `auto + OS_dark` vs `dark` forzato: entrambi mostravano luna. Estensione AMB-7b.K
  - **§6.31** — DoseCard style: sostituite `border` shorthand + `borderLeft` longhand con le 4 longhand per silenziare warning React su re-render
- Nuova §18 "Stato post-Sessione 7b-1" con file prodotti, scoperte durante implementazione e validazione visuale, limitazioni note
- Aggiornamento roadmap §7: Step 7b-1 ✅, Step 7b-2 ⏳
- Aggiornata §12 con i 14 file delta 7b-1
- Sostituito prompt §11 (Sessione 7b-1 consumato) con prompt Sessione 7b-2 in **modalità esecutiva** (PRESA + UNDO minimi, no ALTRO / modali / editing saltata-sospesa)

**Changelog versione 2.5.9 (rispetto alla 2.5.8):**
- Sessione 7b-2 completata: PRESA + UNDO minimi applicati end-to-end. 5 file modificati (selectors.js + test, DoseCard.jsx + test, OggiView.jsx), tutti i 7 AMB-7b-2 applicati (A selector, B/C DoseCard ACTION AREA, D wiring, E debounce non richiesto, F target test, G AMB-7b.Q silent-close)
- Test totali: **170 → 178** (+8, target AMB-7b-2.F esatto ±0). 11 → 11 test files invariati (solo estensioni a `selectors.test.js` +2 e `DoseCard.test.jsx` +6)
- AMB-7b.Q chiuso silent al CP0: baseline 170 coerente con §18, il residuo ereditato da 7a non si è più manifestato
- Validazione browser CP4 (7 punti): 6 OK + 1 skipped (punto 6 ricalcoli downstream — rimandato a 7c quando i modali gap saranno wired). Diagnosticato 1 falso-bug (§6.35) e 2 refinement estetici (§6.33, §6.34)
- Una deviazione scoperta durante CP2: **§6.32** — `@testing-library/react` auto-cleanup non registrato. I nuovi test interactive aggirano il problema con `within(container)` scoping; fix globale (`afterEach(cleanup)` in `src/test/setup.js`) deferito a 7c/7d
- Due refinement estetici + una documentazione comportamentale registrati post-validazione browser:
  - **§6.33** — IconUndo overlay nella DoseCard check (isLastPreso=true) troppo piccolo (size=10). Fix proposto size=14. Deferito a 7d polish
  - **§6.34** — Separatori di data multi-giorno poco visibili nel flusso di lettura: in CP4 Roberto ha cliccato accidentalmente PRESA su una Card di ieri credendola di oggi. Candidato per sticky date separator o rinforzo tipografico/cromatico. Deferito a 7d polish
  - **§6.35** — `state.presoStack` è ephemeral (conferma §13/D11): reload di pagina / page-back / cmd+R svuotano la finestra UNDO, ma le PRESA persistono in `log_assunzioni` via `upsertLogsBatch`. Comportamento voluto, documentato. UX warn utente con PRESA recenti al reload: considerare per 7d/8
- Nuova §19 "Stato post-Sessione 7b-2" con file prodotti, scoperte durante implementazione e validazione visuale, limitazioni note
- Aggiornamento roadmap §7: Step 7b-2 ✅, Step 7c ⏳
- Aggiornata §12 con i 5 file delta 7b-2
- Sostituito prompt §11 (Sessione 7b-2 consumato) con prompt Sessione 7c in **modalità analisi-first** (7c introduce 5 modali + auto-prompt gap + editing saltata/sospesa: complessità elevata richiede sanity check di scoperte prima della produzione)

**Changelog versione 2.5.10 (rispetto alla 2.5.9):**
- Sessione di analisi 19/04/2026 post-7b-2 completata: 8 decisioni architetturali congelate (A split, B1 UndoModal esclusa, B2 ispezione applyAssunzione, B3 auto-prompt dismiss immediato → scope 7c-2, R1 naming, R2 cartella, R3 cross-day hint, R4 > vs >= diagnostic, R5 slider step inline, R6 cleanup setup.js premessa)
- Split finale di **Sessione 7c in 7c-1 (4 modali + wiring tap manuale) e 7c-2 (auto-prompt gap recovery end-to-end)**. Motivazione: 10-14 file in sessione unica eroderebbero qualità; separando il wiring manuale dal consumer reattivo di `state.prompt` la 7c-1 chiude con 4 modali verificabili da tap utente, la 7c-2 introduce il solo useEffect auto-prompt + selectPromptEntry + integration tests
- 14 AMB-7c-1 pre-approvate congelate nel nuovo §11 esecutivo 7c-1: A split, B UndoModal esclusa, C naming+path, D AltroModal 3 azioni, E SaltataModal 2 azioni, F SospesaModal 1 azione, G RecuperoModal slider step=5 inline, H premessa cleanup testing-library (chiude §6.32), I cross-day hint UI, J selectEntryByKey, K stati locali OggiView no-useEffect prompt, L DoseCard +4 affordance, M ispezione applyAssunzione guardia 'saltata' con fix condizionale, N target test 202 ±3
- Refusi del prompt §11 v2.5.9 corretti nella riscrittura 7c-1:
  - riferimento a §6.4 sostituito con §6.13 (calcolaRecuperoMax)
  - riferimento a §6.5 sostituito con rinvio a constants.js per SOGLIA_PROMPT_RECUPERO
  - rimosso il componente fantasma "PromptRecupero o AutoPromptModal": le modali 7c sono 4 (Altro, Saltata, Sospesa, Recupero); l'auto-prompt di 7c-2 riuserà RecuperoModal, non introdurrà una quinta modale
  - rimossa la nota tecnica > vs >= dal prompt utente (spostata a diagnostic CP0 punto 6)
- Nuovi candidati deviazione introdotti in sessione di analisi:
  - **§6.36 (candidato, condizionale AMB-7c-1.M)** — `applyAssunzione` estesa ad accettare entry con stato='saltata' come input valido (abilita "correggi a presa" da SaltataModal). Consumato solo se la guardia attuale blocca 'saltata'; verifica al CP0 punto 5 della 7c-1
  - **§6.37 (candidato, limitazione nota)** — non è supportata la dichiarazione retroattiva "presa oggi una dose prevista per ieri": dataEffettiva è sempre clampata a entry.dateStr. Hint UI di cross-day informa l'utente del giorno della dose. Eventuale supporto completo → vista Log Fase 3
- Sostituito prompt §11 (Sessione 7c analisi-first v2.5.9 consumata in sessione esterna alla KB) con prompt Sessione 7c-1 in **modalità esecutiva** (stile v2.5.8 per 7b-2): sanity check 8 punti, scope file ordinato, 14 AMB-7c-1 congelate inline, CP browser 7 punti, riferimenti KB corretti
- Nessuna modifica al codice (la Sessione 7c-1 applicherà gli AMB)

**Changelog versione 2.5.11 (rispetto alla 2.5.10):**
- Sessione 7c-1 completata: 4 modali + wiring tap manuale + fix §6.32 strategico. 12 file touched (9 nuovi + 3 modificati). `src/test/setup.js` + `afterEach(cleanup)` globale. `selectors.js` + `selectEntryByKey` (preparatorio 7c-2). `src/components/oggi/modals/` popolata (AltroModal / SaltataModal / SospesaModal / RecuperoModal + `_crossDayHint.js` helper + 4 file test). DoseCard estesa con 4 affordance tap (ALTRO pill, SALTATA label, SOSPESA label, GAP badge). OggiView estesa con 4 stati locali modale + wiring thunks `{presa, salta, sospendi, recupero, ripristina}`. §6.38 consumato (bonifica 3 stub scaffolding via `git rm`)
- **AMB-7c-1.M no-op**: `applyAssunzione` non ha guardia su `target.stato` (verifica CP0). "Correggi a presa" da SaltataModal funziona out-of-the-box. §6.36 NON consumato
- **Q1/Q2/Q3/Q5/OSS-2 risolte al CP0** (analisi pre-codice): SaltataModal mantiene bottone "Confermo saltata" per porting 1:1 v5; SospesaModal 1 azione sola (§6.37 omissione "Cambia in saltata"); RecuperoModal "Ripristina" via `onReset` → `actions.recupero(key, 0)` (no nuovo thunk); 3 stub naming v5 rimossi (§6.38); cross-day hint applicato solo alle 2 modali con time picker
- **§6.39 scoperta in sessione** (deferita 7d): `renderWithProvider` + `rerender` di testing-library incompatibili (rerender non rimonta il wrapper Provider, rompe hook). Fix tattico applicato: pattern `unmount() + nuova render` per ogni test che cambia props
- **§6.42 falso positivo scartato**: errore Dexie `IDBKeyRange` in `LocalRepository.js:208` era eco di upsert fallito durante CP6 workaround §6.35, non bug reale. `init()` girare pulito confermato a posteriori
- **7 nuove deviazioni candidate** scoperte durante verifica browser CP6 (sezione §6.40-§6.47, dettagli in §20)
- Canale delivery shell script `bash installer.sh` con base64 inline consolidato dopo fallimento download diretti Chrome (CP1/CP2 via here-doc, CP3/CP4 via installer). Pattern stabile per sessioni future
- Totale test: 178 → **203** (+25, target AMB-7c-1.N 178→202±3 rispettato al boundary superiore). Breakdown: AltroModal +6, SaltataModal +5, SospesaModal +3, RecuperoModal +6, DoseCard +4 (ALTRO/gap/saltata/sospesa tap), selectors +1 (selectEntryByKey)
- Nuova §20 "Stato post-Sessione 7c-1" con file prodotti, scoperte CP6, 7 deviazioni candidate §6.40-§6.47, esiti browser check 7/7
- Aggiornamento §12 con file 7c-1 (9 nuovi + 3 modificati)
- Aggiornamento roadmap §7: Step 7c-1 ✅, Step 7c-2 ⏳
- Sostituito prompt §11 (Sessione 7c-1 consumato) con prompt Sessione 7c-2 (auto-prompt gap recovery) in modalità analisi-first

**Changelog versione 2.5.12 (rispetto alla 2.5.11):**
- Sessione di analisi 20/04/2026 per Sessione 7c-2 completata: CP0 eseguito (5 punti su working copy, baseline 203/203 su 15 test files confermata), 2 verifiche successive V1/V2 (RecuperoModal handler chain + AppProvider shape) eseguite, 10 AMB-7c-2 (A-J) congelate
- Risolte 5 questioni di design D1-D5 con raffinamenti post-CP0:
  - D1 singola istanza RecuperoModal, shape esteso a `{entry, source}`
  - D2 useEffect in OggiView (coerenza AMB-7c-1.K)
  - D3 dismissPrompt esplicito solo su path close/overlay (apply/reset auto-coperti da commit chain di `COMMIT_APPLY_RESULT`)
  - D4 race stessa entry manuale = prompt soddisfatto
  - D5 integration test = E2E puri con AppProvider reale + helper `renderWithRealProvider`
- Rilievo R1 del CP0: naming prompt kind = `'gap_recovery'` (non `'RECUPERO'`). Refuso §11 v2.5.11 corretto in AMB-7c-2.A
- Rilievo R2 del CP0: `COMMIT_APPLY_RESULT` sovrascrive `state.prompt` con `(returnedPrompt ?? null)` su OGNI commit downstream. Decisione: Opzione 1 (accettare, ephemeral). Documentato §6.48
- Rilievo V2: `AppProvider` non accetta override `initialState`. Scenario test 1 (seed diretto) non disponibile. Candidato retrofit 7d. Documentato §6.49
- Nuove deviazioni §6.48 (ephemeral prompt, AMB-7c-2.D) e §6.49 (initialStateProp deferred, AMB-7c-2.J)
- Riscritto §11 da analisi-first a modalità esecutiva (5 file scope, CP0 ridotto a 3 punti, CP1-CP5 implementativi, CP browser 6 punti)
- Nessuna modifica al codice (la Sessione 7c-2 applicherà le AMB)

**Changelog versione 2.5.13 (rispetto alla 2.5.12):**
- Sessione 7c-2 completata: auto-prompt gap recovery end-to-end. 5 file touched (3 modificati + 2 nuovi), CP0→CP5 clean, CP browser 6/6 (con #6 vacuously OK per race theory-only coperta da test #7 automatico)
- Test totali: **203 → 215** (+12 esatto, target AMB-7c-2.I centrato ±0). 15 → **16 test files**. Breakdown: selectors +2 (selectPromptEntry), OggiView.test.jsx +10 (scenari 1-10)
- File modificati: `src/state/selectors.js` (+selectPromptEntry, composizione AMB-7c-2.H), `src/state/selectors.test.js` (+2 test), `src/components/oggi/OggiView.jsx` (433→515 righe, +useEffect auto-prompt + shape recuperoModal `{entry,source}|null` + closeRecupero branching AMB-7c-2.E/F)
- File nuovi: `src/test/renderWithRealProvider.jsx` (313 righe, 5 exports: DEFAULT_SEED/makeFakeRepo/renderWithRealProvider/waitForReady/runAction; mock boundary Proxy-based su `../../data/repository/index.js`), `src/components/oggi/OggiView.test.jsx` (349 righe, 10 integration tests E2E puri con AppProvider reale)
- Nessuna nuova deviazione §6.NN in 7c-2. Le scelte di test design (null-gate nel useEffect, race-synthesis auto→manual via tap per #7/#8, scenario #10 via dispatch diretto per Ripristina UI-conditional) sono documentate inline nei test file come applicazioni del contratto dichiarato — non deviazioni
- **Bug scoperto durante CP4 e risolto in-session**: DEFAULT_SEED del helper originale aveva `tipo_frequenza: 'fisso'` + `intervallo_ore: null`. Il cascade branch in `recalc.js:348` è gated su `'intervallo' && intervallo_ore != null`; con 'fisso' il branch veniva skippato → `state.prompt` mai emesso → 8/10 test falliti. Fix banale al seed (2 campi, 2 file). Non è una deviazione §6.NN, è un bug di dati di test. **Lezione registrata per future sessioni**: quando un helper test deve attivare un branch condizionato del dominio, ispezionare il branch PRIMA di comporre il seed — non dopo
- CP browser 6/6 verificato:
  1. ✅ Auto-open senza tap (RecuperoModal appare da sola dopo presa con gap > SOGLIA)
  2. ✅ Auto suspended con AltroModal aperto (+sub-scenario: ripresa naturale dell'auto-open alla chiusura del blocking modal)
  3. ✅ Apply Anticipa → prompt dismisso + plan.recupero_minuti aggiornato, no re-pop
  4. ✅ Ripristina (rec→0) → prompt dismisso, recupero_minuti=0, ora_ricalcolata reset a originale, no re-pop
  5. ✅ Close button/overlay → prompt dismisso, no re-pop (verificato ×2: X button e overlay click)
  6. (vacuously OK) Race manual same-entry: non simulabile in UI reale via mouse (overlay blocca tap sotto), coperto da test #7 automatico
- Nuova §21 "Stato post-Sessione 7c-2" con file prodotti, esiti CP browser, lezione bug seed
- Aggiornamento roadmap §7: Step 7c-2 ✅, Step 7d ⏳
- Aggiornamento §12 titolo + nuove righe 7c-2 (5 file)
- Sostituito prompt §11 (Sessione 7c-2 consumato) con prompt **Sessione 7d polish + a11y** in **modalità analisi-first** (7d accumula 8+ candidati deviazione + a11y 4 modali + §6.49 retrofit: carico elevato, analisi-first giustificata)

**Changelog versione 2.5.14 (rispetto alla 2.5.13):**
- Sessione di analisi 20/04/2026 post-7c-2 per Sessione 7d completata: 11 questioni Q1-Q11 risolte, 14 decisioni D1-D14 congelate, split finale di **Sessione 7d in 7d-1 (a11y + test infra + polish visivo) e 7d-2 (UX polish DoseCard + retrofit + UndoModal)**
- Motivazione split: ~13 file nuovi/modificati aggregati, +23-28 test totali, 3 temi eterogenei (a11y, visual, retrofit). Sessione unica eroderebbe qualità; 7d-1 chiude con superficie interattiva accessibile e test infrastructure stabilizzata verificabili end-to-end, 7d-2 consolida polish semantici e retrofit senza mescolare con modifiche all'infra
- **12 AMB-7d-1 pre-approvate** congelate nel nuovo §11 esecutivo 7d-1: A (split), B (`focus-trap-react` in dependencies runtime), C (hook `useModalA11y` in `src/hooks/`), D (restore focus triggerRef manuale + fallback query→body auto-open), E (DoseCard `data-entry-key` per fallback), F (Escape via libreria `escapeDeactivates`), G (IconUndo size 10→14 §6.33), H (date separator sticky + token `dateSepBgStrong` + boxShadow + icona SVG calendario, accorpa §6.34+§6.44), I (renderHelpers refactor via `wrapper` opt, firma pubblica invariata §6.39), J (ARIA refinements minimi: labelId/describedById via modalProps), K (target 215→228 ±2), L (ordine implementazione hook → consumer → DoseCard/OggiView → renderHelpers)
- AMB-7d-2 volutamente deferite: verranno congelate in sessione di analisi dedicata dopo completamento 7d-1, quando lo stato reale è noto (ratifica Q6 initialStateProp shape, Q7 UndoModal coesistenza, Q9 guard `applyRicalcolo`/`applySospensione`)
- Decisioni D8 (§6.45 riuso TOLLERANZA_MIN), D10 (§6.47 gap residuo), D11 (§6.49 dual-mode), D12 (§6.40 tutti log presa del dateStr corrente), D13 (§6.41 UndoModal + UNDO direct coesistenti) pre-ratificate ma operative solo in 7d-2
- Decisione D14: **§6.26 cross-midnight UI defer a Step 9** (root cause fix dominio, nessun polish intermedio in 7d giustificabile)
- Aggiornata roadmap §7: Step 7d split in `7d-1 ⏳ prossimo` / `7d-2`
- Target test 7d-1: 215 → **228 ±2** (+13: useModalA11y +4, 4 modali × 2 a11y smoke +8, renderHelpers rerender +1)
- Target test 7d-2 stimato: 228 → **242 ±2** (+14: §6.45 +1-2, §6.47 +1, AppProvider.initialStateProp +2, presoStack init +2-3, UndoModal +3-4, annullaAssunzione thunk +1-2)
- Riscritto §11 da prompt analisi-first a modalità esecutiva per Sessione 7d-1 (sanity check 6 punti CP0, 12 AMB-7d-1 congelate inline, 5 CP operativi CP1-CP5, CP browser 6 punti, scope 16 file totali)
- Nessuna modifica al codice (la Sessione 7d-1 applicherà gli AMB)

**Changelog versione 2.5.15 (rispetto alla 2.5.14):**
- Sessione 7d-1 completata il 21/04/2026: a11y 4 modali + test infrastructure + polish visivo. 17 file touched (3 nuovi + 14 modificati). CP0→CP5 clean, CP browser 6/6.
- Totale test: 215 → **228** (+13, target AMB-7d-1.K 228±2 esatto). File test: 16 → **18** (+2: `useModalA11y.test.jsx`, `renderHelpers.test.jsx`).
- **§6.33 chiuso per RIMOZIONE** anziché resize: IconUndo overlay eliminata. Affordance UNDO trasferita su dashed-border + pulse animation + `aria-label` (scoperta CP browser 6 dopo iterazioni 10→14→18 tutte giudicate insufficienti).
- **§6.34 + §6.44 accorpati e chiusi**: date separator sticky cromatico con pill centrato + `IconCalendar` + token `dateSepBgStrong`. Layout `line · label · line` sostituito (le line non leggono pinned). Top calibrato a `top-[180px]` su header 179px misurato.
- **§6.39 chiuso**: `renderWithProvider` refactor a `render(ui, { wrapper: Wrapper })`. Pattern 7c-1 `unmount + nuova render` resta compatibile.
- **a11y 4 modali** via hook condiviso `useModalA11y`: focus trap, Escape-to-close, restore focus chain. Focus ring globale via `:focus-visible` (AMB-7d-1.J estesa in CP browser 1).
- **8 deviazioni aggiuntive scoperte in sessione** (§6.50-§6.57): D1 `fallbackEntryKey` extension, D2 DoseCard.test.jsx modificato (non nel prompt), D3 `:focus-visible` globale, D4 TapBadge border `gapTx`, D5 `tabIndex={-1}` su DoseCard root, D6 §6.33 removal, D7 `allowOutsideClick: true` per overlay-close, D8 rimozione line decorative separator.
- Aggiornata roadmap §7: Step 7d-1 ✅, Step 7d-2 ⏳.
- Nuova §22 "Stato post-Sessione 7d-1".
- Aggiornata §12 con i 17 file 7d-1.
- Sostituito prompt §11 (Sessione 7d-1 consumato) con placeholder per prompt Sessione 7d-2 (da preparare in sessione di analisi dedicata).

**Changelog versione 2.5.16 (rispetto alla 2.5.15):**
- Sessione di analisi 7d-2 completata il 21/04/2026 (post-7d-1, non implementativa): ratifica delle 5 pre-decisioni D8/D10/D11/D12/D13 di v2.5.14 contro stato reale 7d-1, risoluzione di 3 Q ereditate (Q6 shape `initialStateProp`, Q7 coesistenza UndoModal ↔ UNDO direct, Q9 guard downstream edits), risoluzione di 3 Q nuove emerse da 7d-1 (Q-N1 `focusRing` token WCAG, Q-N2 Card presa `<button>` wrapper vs §6.54 `tabIndex`, Q-N4 retrofit sticky dinamico separator)
- **13 AMB-7d-2 A-M pre-approvate** congelate nel nuovo §11 esecutivo: A (sessione singola), B (`AppProvider({children, initialStateProp})` Partial + warn DEV), C (nuovo metodo repo `getLogsByDataStato`), D (UNDO direct + UndoModal coesistono via `stopPropagation` sul check), E (§6.47 scope ristretto a parte-a label residuo), F (thunk `annullaAssunzione` + guard downstream), G (nuovo token `focusRing` in `theme.js`), H (DoseCard root `tabIndex={-1}` invariato + `<button>` wrapper interno ramo `isPresa && onUndoTap`), I (retrofit sticky dinamico defer post-7d), J (conferma §6.26 defer Step 9), K (target test 228→**246 ±2**, Δ+18), L (ordine CP1→CP7), M (invariati `NavBar.jsx` / `App.jsx` / `useModalA11y.js`)
- **Revisione pre-ratifiche v2.5.14:**
  - D10 (§6.47) ristretto alla parte (a) label residuo; parte (b) affordance dash defer al pass §6.46 o successivo
  - D12 (§6.40) naming repo metodo precisato: `getLogsByDataStato(dateStr, stato)` (no `limit`, tutti i log presa del giorno)
- **Target test rivisto:** v2.5.14 stimava 228 → 242 ±2. v2.5.16 aggiorna a 228 → **246 ±2** (+4 rispetto a stima precedente). Breakdown nel §11/AMB-K: §6.45 +2, §6.47(a) +2, §6.49/Q6 +2, §6.40 +3, §6.41 UndoModal +4, `annullaAssunzione` thunk +2, Q9 guard +2, Q-N2 Card button +1
- **Fuori scope 7d-2 confermati:** §6.26 cross-midnight (Step 9), §6.43 posticipo (post-7d con spec v1.3), §6.47 parte (b) affordance dash, retrofit date separator sticky dinamico
- Sostituito §11 placeholder con prompt esecutivo Sessione 7d-2 (sanity check 14 punti CP0 + 7 CP operativi CP1-CP7 + CP browser 6 punti + AMB A-M inline)
- Nessuna modifica al codice o ad altre sezioni (la Sessione 7d-2 applicherà le AMB)
- Nessuna deviazione aggiunta a §6 (le Q-N1/Q-N2/Q-N4 sono ratifiche di scelte, non deviazioni dalla spec; diverranno §6.58+ se emergeranno discrepanze in sessione)

**Changelog versione 2.5.25 (rispetto alla 2.5.24):**
- Sessione 8b analisi-first completata il 23/04/2026 (stessa giornata di 8a impl). Baseline test **invariata a 269/269 su 26 test files** (sessione analisi pura, zero codice).
- **7 Q risolte (Q1-Q7 del prompt §11 v2.5.24 con tutte le sub-questioni a-d), 13 AMB A-M congelate** (scope superiore alle letter indicative del prompt per copertura completa post dry-run CP0):
  - **AMB-8b.A** UX ProfiliTab: lista sempre visibile + drawer bottom-sheet per edit/nuovo; pulsante `+ Nuovo` header tab (top-right); badge verde "Attivo" + bordo sinistro colorato su row attiva; bottone esplicito "Attiva" dentro drawer (no tap-row-ambiguo). Scartati: FAB (ingombra NavBar + ConfigTabBar), sub-route `/config/profili/:id` (complessità routing zero-valore).
  - **AMB-8b.B** Form profilo: 6 campi required (`nome_profilo` + 5 time `ora_sveglia`/`ora_colazione`/`ora_pranzo`/`ora_cena`/`ora_sonno`), **validazione ordine monotonica soft (warning non-blocker) ed esclude `ora_sonno`** (spec §10.1 Nottambulo: sonno 02:00 wrappa mezzanotte → hard-check romperebbe caso valido). Duplicati `nome_profilo` soft (nessun vincolo DB, UX propone append " (2)" o correzione utente). Validazione stretta deferita a 8d polish. Drawer full-height mobile-first, focus trap via `useModalA11y` (esistente).
  - **AMB-8b.C** Reducer: **2 nuove action minime** `SET_PROFILI` (array replace, analoga `SET_FARMACI`/`SET_ORARI`) + `SET_PROFILO_ATTIVO` (campo singolo replace). Scartata opzione combo `UPSERT_PROFILO` (over-engineering). I thunk orchestrano i due dispatch sequenzialmente.
  - **AMB-8b.D** Thunks: **3 nuovi CRUD** `addProfilo(data)` / `updateProfilo(id, patch)` / `deleteProfilo(id)` + **1 wrapper** `attivaProfilo(id)` che risolve id→profilo via `selectProfiloById` e delega a `cambiaProfilo(profilo)` esistente (§6.20). **Pattern pessimistico** (persist DB first, dispatch after), coerente con `cambiaProfilo`. `updateProfilo` su profilo attivo triggera `rebuildPlan()` dopo commit DB (§6.64 riaffermata).
  - **AMB-8b.E** `updateProfilo` **NON accetta `attivo` nel patch** — filtro esplicito `const { attivo: _drop, ...safePatch } = patch` all'inizio del thunk. Canale unico di attivazione = `cambiaProfilo`/`attivaProfilo`. Guard previene side-effect cross-profilo silenzioso (es. form che marca dirty per `attivo` toggle errato).
  - **AMB-8b.F** Delete guard §6.5: il thunk cattura l'`Error` del repo (`"Non si può eliminare il profilo attivo. Attivane un altro prima."`) e dispatch `SET_ERROR` con `kind:'repo'` user-facing. UI bottone Elimina **visibile ma disabled per il profilo attivo** con tooltip/helper text preventivo (hidden scartato: confonde senza spiegare motivo).
  - **AMB-8b.G** Hook `useUnsavedChanges` **NON estratto in 8b** (Rettifica F1). Pattern dirty-lifted-to-parent già funzionante DRY-at-2 via props opzionali (ImpostazioniTab + ProfiliTab entrambi riceve `dirty`/`setDirty` da ConfigView). Estrazione deferita al 3° consumer naturale (8c FarmaciTab o 8d polish). Conseguenza: CP5 rimosso dal breakdown, scende da 7 a 6 CP.
  - **AMB-8b.H** `ConfirmDeleteProfiloModal` **inline** in ProfiliTab (scope-minimal, 1 consumer). Stile coerente con `UnsavedChangesModal` (riuso `modalBg`/`tapBd`/`textPrimary` tokens). Promozione a componente standalone deferita a 2° consumer (analogia §6.78 pattern).
  - **AMB-8b.I** `useTheme` + tokens **pervasivo** su ProfiliTab + drawer + modal fin dalla prima delivery CP1. Preventivo contro hotfix dark post-CP-browser (pattern §6.82, raccomandazione §22.6 scoperta #5). Zero hotfix dark previsti in 8b.
  - **AMB-8b.J** `renderWithRealProvider.jsx` **NON esteso in 8b** (§6.79 rimane). Tutti i nuovi test 8b in stub `renderWithProvider` + mock actions. L'E2E "edit profilo attivo → rebuildPlan" verificato via spy su `REBUILD_PLAN` action o via `getLogByRange` mock (non via AppProvider reale). Estensione rimandata indefinitamente a consumer effettivo.
  - **AMB-8b.K** Selectors nuovi in `src/state/selectors.js`: `selectProfili(state)` (pure read `state.profili`), `selectProfiloAttivo(state)` (pure read `state.profiloAttivo`), `selectProfiloById(state, id)` (find-by-id, null se assente). Consumer: ProfiliTab UI + `attivaProfilo` wrapper.
  - **AMB-8b.L** CP breakdown **6 CP** (post-Rettifica F1): CP0 sanity → CP1 lista/badge/pulsante Nuovo → CP2 drawer edit + form wire → CP3 thunk add+update + selectors + reducer cases → CP4 thunk delete + ConfirmDeleteProfiloModal + disabled-on-active → CP5 thunk attivaProfilo wrapper + wire "Attiva" + CP browser 6 punti. **Target test +14-18** (249-250 → 283-287). Split 8b-1/8b-2 non previsto.
  - **AMB-8b.M** Schema DB invariato. Tabella `profilo_utente` spec §3.4 usata tal quale. **Spec resta v1.2**, zero riversamento necessario in 8b.
- **Dry-run CP0 (pre-implementativa) — 5 rettifiche integrate** nel prompt impl:
  - **F1** Hook `useUnsavedChanges` NON estratto (pattern lifting già DRY-at-2 via props opzionali in ConfigView). CP5 rimosso. Target test ricalibrato 20→14-18. **Impatto architetturale principale della sessione.**
  - **F2** Reducer: 2 action dedicate (`SET_PROFILI` + `SET_PROFILO_ATTIVO`) invece di una combo `UPSERT_PROFILO`. Coerente con `SET_FARMACI`/`SET_ORARI`, più testabili singolarmente.
  - **F3** `cambiaProfilo(profilo)` accetta oggetto intero (non id). Wrapper `attivaProfilo(id)` risolve via `selectProfiloById` prima di delegare. Documentato esplicitamente in AMB-D.
  - **F4** `updateProfilo` filtra `attivo` fuori dal patch (AMB-E). Canale attivazione unico garantito a livello di thunk, non solo UI.
  - **F5** `useTheme` pervasivo su form ProfiliTab da CP1 (AMB-I). Preventivo contro hotfix §6.82 pattern.
- **Nessuna nuova §6.NN introdotta** in 8b analisi-first (sessione pura analisi, zero codice, zero deviazioni consumate).
- Nuova §22.7 "Stato post-Sessione 8b analisi-first" con Q1-Q7 risolte + AMB A-M congelate + rettifiche F1-F5 + scoperte operative + file NON prodotti (per definizione, analisi-first).
- Sostituito §11 (8b analisi-first v2.5.24 consumato) con prompt **Sessione 8b implementativa** (CP0→CP5 + CP browser 6 punti + target 283-287).
- Aggiornamento roadmap §7: 8b analisi-first ✅ inline nella row 8b; implementativa ⏳ prossima.
- **§6.69 procedurale rispettata:** front-matter bumpato in lockstep (v2.5.24 → v2.5.25, stessa giornata 23/04 → Ultima modifica invariata). **Nota drift pregresso:** l'entry "Changelog versione 2.5.24" era assente dall'elenco introduttivo al bump 8a impl (§6.69 drift non rilevato al momento). Non retrocorretto in 8b per principio fatto-storico immutabile (§6.71 analogo); gap documentato in §22.7 come scoperta operativa.
- **§6.70 procedurale (soft):** drift Changelog KB ↔ repo git atteso = 1 versione (2.5.24 → 2.5.25), sotto soglia 2. Commit v2.5.25 raccomandato ma non obbligatorio.


- Sessione 8a analisi-first completata il 22/04/2026 (stessa giornata di 8-pre impl). Baseline test **invariata a 250/250 su 23 test files** (sessione analisi pura, zero codice).
- **6 Q risolte, 11 AMB A-K congelate** (scope superiore alle A-F indicative del prompt §11 v2.5.22 per copertura completa post dry-run CP0):
  - **AMB-A** Routing: `<Route path="/config/*">` in `App.jsx` già presente → nested `<Routes>` in `ConfigView` con relative paths `profili`/`farmaci`/`impostazioni`. Default `<Route index>` redirect a `impostazioni`. Catch-all `*` → `impostazioni`.
  - **AMB-B** `withTransaction` firma: `(mode: 'r'|'rw', storeNames: string[], fn) => Promise<T>`. **Implementazione con mapping** `storeNames.map(name => db[name])` prima del pass-through a `db.transaction` (rettifica F4 — Dexie 4 non accetta array di stringhe nella signature a 3 arg). Scope: 8a (confermato roadmap).
  - **AMB-C** ImpostazioniTab PROD: Nome (input + save esplicito, min 1 char trimmed) + Tema (radio 3-stati auto/light/dark, fonte unica `impostazioni.tema`).
  - **AMB-D** Avanzate-DEV: 3 campi read-only (`schema_version` da `db.verno`, `simulatedNow` da state, `seed_loaded` con **branch A/B/C** determinato al CP0 — A: setting già esistente; B: assente → aggiungere scrittura in `runSeedIfNeeded` quando `result.seeded===true` + fallback runtime per install esistenti; C: naming alternativo → rettifica inline). Pattern `import.meta.env.DEV` gated.
  - **AMB-E** Unsaved changes: save esplicito + confirm modale su tab change con dirty. **Implementazione inline in 8a** (≤15 righe), estrazione hook `useUnsavedChanges` deferita a 8b (DRY-at-2).
  - **AMB-F** Header Oggi toggle tema: **shortcut confermato** (zero refactor), conformità §6.65 letterale.
  - **AMB-G** Cleanup legacy `state.nomeUtente` mirror: **scope 8a** (§17 "Limitazioni note" punto 2 indicava Step 8). Consumer switch a `selectImpostazione(state, 'nome_utente')`. CP0 gate: `grep -rn "nomeUtente"` deve restituire ≤2 consumer attesi (reducer + header Oggi); se >2 branch cleanup split o defer a 8d.
  - **AMB-H** Test helpers: estensione `renderWithProvider` + `renderWithRealProvider` con opzione `initialEntries` (default assente = no MemoryRouter = backward-compat); wrap con `<MemoryRouter initialEntries>` solo se presente.
  - **AMB-I** Test strategy: `userEvent` click-driven per nav happy paths; DOM assertions per stato iniziale.
  - **AMB-J** Target test 8a impl: **250 → 268 (+18)**, tolleranza ±3. Breakdown: +4 shell+routing, +3 TabBar, +3 Nome, +3 Tema, +2 Avanzate-DEV, +2 withTransaction, +1 cleanup mirror.
  - **AMB-K** Ordine CP 8a impl: **CP0** ricognizione (inc. 5 gate: MemoryRouter helpers, `seed_loaded` setting, `nomeUtente` consumer count, `makeFakeRepo` `withTransaction` absence, Dexie `db[storeName]` accesso) → **CP1** `withTransaction` (repo + IRepository + `makeFakeRepo` stub §6.60) → **CP2** routing + ConfigView shell → **CP3** ConfigTabBar + active state → **CP4** ImpostazioniTab Nome + cleanup mirror (AMB-G) → **CP5** ImpostazioniTab Tema → **CP6** ImpostazioniTab Avanzate-DEV → **CP7** unsaved changes inline → **CP8** full suite + CP browser.
- **Dry-run CP0 (pre-delivery) — 6 rettifiche integrate** nel prompt impl:
  - **F1** `seed_loaded` branch A/B/C esplicito (AMB-D).
  - **F2** Ordine CP blindato: CP1 `withTransaction` + estensione `makeFakeRepo` **contestuale** (§6.60 lesson 7d-2p1).
  - **F3** CP0 grep `nomeUtente` come gate per AMB-G (branch se >2 consumer).
  - **F4** AMB-B implementazione dichiara mapping `storeNames.map(name => db[name])` prima del pass-through.
  - **F5** AMB-H: MemoryRouter wrap condizionale a `initialEntries` presente (backward-compat 250 test esistenti).
  - **F7** CP browser: punto esplicito sul replace history di `<Navigate replace>` (tap Config → URL `/config/impostazioni`, back → salto a `/oggi`).
- **§6.76 nuova (procedurale):** fix §3 struttura progetto (riga 451 elencava ancora `OrariTab.jsx` — smentito da §6.65 "niente OrariTab separato"). Hotfix documentale in-session 8a analisi-first (zero impatto codice).
- **§6.77 nuova (cleanup retroattivo):** rimozione mirror legacy `state.nomeUtente` (§17 "Limitazioni note" punto 2 promossa a deviazione attiva). Ambito esecuzione: 8a implementativa CP4. Consumer switch a `selectImpostazione(state, 'nome_utente')`.
- Nuova §22.5 "Stato post-Sessione 8a analisi-first" con AMB A-K congelate + rettifiche F1-F7 + scoperte operative (5 gate CP0, absence `fake-indexeddb`, backward-compat helpers).
- Sostituito §11 (8a analisi-first v2.5.22 consumato) con prompt **Sessione 8a implementativa** (CP0→CP8 + CP browser 5 punti + target 268±3).
- Aggiornamento roadmap §7: 8a analisi-first ✅ inline nella row 8a; implementativa ⏳ prossima.
- **§6.69 procedurale rispettata:** front-matter intestazione bumpata in lockstep con corpo (v2.5.22 → v2.5.23, Ultima modifica 22/04 invariata — stessa giornata).
- **§6.70 procedurale (soft):** drift Changelog KB ↔ repo git atteso = 1 versione (2.5.22 → 2.5.23), sotto soglia 2. Commit v2.5.23 raccomandato ma non obbligatorio.

**Changelog versione 2.5.22 (rispetto alla 2.5.21):**
- Sessione 8-pre implementativa completata il 22/04/2026 (pattern CP consolidato — CP0 8 punti + CP1 rehydration + CP2 condizionale skippato + CP3 full suite + CP browser 2/2). **2 file modificati**, 0 nuovi, **247 → 250 test** (+3 netti, target AMB-E centrato esattamente).
- **CP0.5 Esito A pieno:** ispezione `applyAnnullaAssunzione` in `src/domain/recalc.js` ha confermato compliance §6.14 — il ramo N+1 `ricalcolata` resetta tutti i 5 campi checklist (`ora_ricalcolata`, `gap_minuti`, `gap_originale`, `recupero_minuti`, `dose_prec_saltata`) + bonus `ora_ricalcolata_originale: null` + `stato: 'prevista'`. CP2 skippato interamente. **§6.74 non consumato, resta riservato**.
- **CP0.3 drift risolto:** `PLAN_DAYS_BEFORE=1` confermato in `src/domain/constants.js` (vs citazione `=2` in v2.5.20.1 §11). Window §6.72 operativa = `[today-1, today]` (2 giorni effettivi).
- **§6.75 nuova (operativa):** reuse `logAssunzioni` già fetchato in `init()` + filter in-memoria per rehydration `presoStack`, invece di query dedicata. Deviazione rispetto al letterale del prompt §11 CP1 (opzioni 1-3 presumevano query dedicata). Motivazione: risparmio round-trip IndexedDB (superset semantico già in memoria).
- **File modificati:** `src/state/actions.js` (patch 1 blocco, §6.75 + §6.72), `src/state/actions.init.test.js` (riscritto, 3 test scoped "today only" → 6 test cross-day per §6.72 + §6.75). File test esistente riscritto (non previsto dal prompt §11 letterale che diceva "aggiungere 2-3 test"): i 3 test pre-esistenti erano fondati su `getLogByDataStato` che §6.75 rimuove dal flow, sarebbero falliti.
- **Scenario (b) "altroieri"** del prompt §11 CP1.3 non reachable con `PLAN_DAYS_BEFORE=1` (altroieri fuori window). Rimpiazzato con scenari "yesterday+today combinato" + "window right-bound guard" (log dated tomorrow deve essere escluso pur essendo in `logAssunzioni` via `PLAN_DAYS_AFTER`).
- **CP browser 2/2 verdi** (punto 3 skip condizionale Esito A):
  - Punto 1: setup presa storica di ieri (log naturali già presenti: farmaco_id=10 dose 2 @ 16:00 + dose 3 @ 23:50). Post Cmd+R: `presoStack` rehydrato con 4 keys di ieri (10-2, 4-1, 3-1, 10-3) + simmetria stack↔plan; tap body Card Prontinal ieri dose 3 → UndoModal aperta con cross-day hint `Dose presa alle 23:50 il 21/04`.
  - Punto 2: tap "Annulla assunzione" → entry 10-3 ieri a `stato='ricalcolata'` + `ora_ricalcolata='00:00'` preservato (conferma §6.71 "fatto storico immutabile"); `presoStack` rimuove solo la key target (REMOVE_PRESO_KEY §6.62), altre 3 keys preservate; `state.error === null`.
- Aggiornamento roadmap §7: step 8-pre ✅. Step 8a ⏳ prossima (analisi-first).
- Aggiornamento §12 con delta 8-pre (2 modificati, 0 nuovi).
- Nuova §22.4 "Stato post-Sessione 8-pre implementativa" con esiti CP, file prodotti, scoperte operative (log ieri già presenti → seed artificiale non necessario per CP browser; format `ora_effettiva` ISO datetime in log storici vs HH:MM nel plan).
- Sostituito §11 (8-pre implementativa v2.5.21 consumato) con prompt **Sessione 8a analisi-first** (Foundation Config: ConfigView shell + routing `/config/*` + tab bar URL-addressable + ImpostazioniTab + `withTransaction` repo generico).
- Nessuna modifica retroattiva a §6.NN esistenti.
- **§6.69 procedurale rispettata:** front-matter intestazione bumpata in lockstep con corpo (v2.5.21 → v2.5.22, Ultima modifica 22/04 invariata — stessa giornata).
- **§6.70 procedurale (soft):** drift Changelog KB ↔ repo git atteso = 1 versione (2.5.21 → 2.5.22), sotto soglia 2. Commit v2.5.22 raccomandato ma non obbligatorio; buona igiene in vista di 8a.

**Changelog versione 2.5.21 (rispetto alla 2.5.20.1):**
- Sessione 8-pre analisi-first completata il 22/04/2026 (pattern CP consolidato — CP1 procedurali + CP2 Q1 + CP3 Q2 + CP4 sintesi). 6 Q risolte (Q1.a ratifica §6.14 + CP0 verify, Q1.b status quo guard N+1-only end-of-story, Q1.c fatto storico immutabile, Q2.a+b presoStack scope `PLAN_DAYS_BEFORE`, Q2.c retention log defer) + 2 note procedurali N1/N2 promosse.
- **5 deviazioni candidate §6.69-§6.73 congelate:**
  - **§6.69 procedurale** — Sanity check intestazione front-matter Changelog a ogni bump versione (da N1)
  - **§6.70 procedurale** — Sync Changelog KB Claude ↔ repo git, soft con soglia > 2 versioni (da N2)
  - **§6.71** — Asimmetria `applyRecupero(key, 0)` vs reset `ora_ricalcolata`: fatto storico immutabile per Fase 2 (promozione formale di §22.3.1, da Q1.c)
  - **§6.72** — `presoStack` rehydration + window log init estese a `PLAN_DAYS_BEFORE` (supersedes §6.40 day-scoped, da Q2.a+b)
  - **§6.73** — Retention `log_assunzioni` out-of-scope Fase 2, deferita a Step 9+/Fase 3 (da Q2.c)
- **§6.74 riservato** per eventuale fix al corpo `applyAnnullaAssunzione` se CP0 ispettivo della 8-pre implementativa rivela non-compliance con §6.14 (reset 5 campi N+1 `ricalcolata` incompleto).
- **Flag CP0 documentato:** drift apparente `PLAN_DAYS_BEFORE` tra §15 (=1, valore 5b-2) e riferimento §11 v2.5.20.1 (=2); valore reale da verificare via `cat src/domain/constants.js` in apertura 8-pre implementativa — il valore reale determina l'ampiezza effettiva del presoStack esteso (§6.72).
- Decisione architetturale sessione: **8-pre implementativa = sessione unica**, nessun split 8-pre-1/2 (Q1.b risolto su status quo ha eliminato il rischio principale di esplosione scope). Scope atteso 2-4 file modificati, 0 file nuovi, +2-5 test.
- Aggiornamento roadmap §7: entry 8-pre riscritta con scope dettagliato (sessione unica, target 250 ±2 test).
- Sostituito §11 (analisi-first v2.5.20.1 consumato) con **§11 esecutivo Sessione 8-pre implementativa**: sanity check CP0 8 punti + 6 AMB A-F + CP1→CP3 operativi + CP browser 3 punti + target test 247→**250 ±2**.
- Nessuna modifica al codice (la Sessione 8-pre implementativa applicherà i delta).
- Nessun aggiornamento retroattivo a §6.NN esistenti (§6.40 non modificata in-place per preservare il contesto storico; §6.72 è esplicita "supersedes §6.40 scope"). Coerente con pattern post-hoc di sessioni precedenti (§6.32, §6.60 introdotte senza modificare le predecessore).

**Changelog versione 2.5.26 (rispetto alla 2.5.25):**
- Sessione 8b implementativa completata: 269 -> 287 test (+18, bound superiore AMB-L esatto)
- 13 AMB-8b.A-M consumate (ProfiliTab + drawer + CRUD thunks + selectors + UI guard)
- Nuove deviazioni 6.86 (backdrop-click drawer modal-first + tooltip span-wrap + z-index UnsavedChangesModal) e 6.87 (convenzione file test thunk split-per-concern)
- Nuovo §22.8 stato post-Sessione 8b implementativa
- §11 sostituita con stub Sessione 8c (FarmaciTab analisi-first, prompt da scrivere in apertura sessione)
- Drift §6.69 pregresso (entry §1 ferme a v2.5.20.1, gap di 5 versioni) NON retrocorretto per principio fatto-storico immutabile

**Changelog versione 2.5.33 (rispetto alla 2.5.32):**
- Sessione **8d-A-continue-2** completata 25/04/2026: chiusura **§6.104** (fix routing loop ConfigView/ConfigTabBar) + browser check residuo CP7 + bump v2.5.32 → v2.5.33. Baseline test invariata **310/310 su 31 test files** (nessun test aggiunto, AMB-8d-A-continue-2.C "no test in-session").
- **Fase 1 analisi-first** — 3 AMB ratificate (Roberto: "Decidi tu" → scelte raccomandate):
  - **AMB-8d-A-continue-2.A** = path absolute (`/config/impostazioni`, `/config/profili`, `/config/farmaci`) per leggerezza e stabilità base path `/config`. Scartate (ii) `useResolvedPath` idiomatic-verboso e (iii) rollback `v7_relativeSplatPath` (annullerebbe §6.84).
  - **AMB-8d-A-continue-2.B** = audit esaustivo via grep `'Navigate to="[^/]'` + `'NavLink to="[^/]'` + `'navigate("[^/]"'`. Esito: solo 2 file effettivamente coinvolti (ConfigView.jsx + ConfigTabBar.jsx). Audit conferma assenza altri consumer relativi dentro splat routes. **Limitazione del pattern grep documentata** in nota retroattiva §6.104 (vedi sotto).
  - **AMB-8d-A-continue-2.C** = no test integration aggiunto in 8d-A-continue-2 (§6.100 ha deferred test router future flags). Regression guard = browser check manuale post-fix. Ratifica formale in 8d-B.
- **Fase 2 CP1 fix §6.104** — commit `67937e5` su branch `step-8`. Modifiche: ConfigView.jsx (2 `<Navigate to>` + 1 `navigate()`) + ConfigTabBar.jsx (3 `<NavLink to>`) → tutti path assoluti `/config/<tab>`. Test 310/310 invariati post-fix.
- **Fase 3 CP browser 5/5 PASS** (Punto 3 skipped giustificato §6.106):
  - Punto 1 (`/config/profili` delete profilo non-attivo + form dirty): PASS con caveat **§6.105** (ConfirmModal focus-restore non torna al trigger button su ProfiliTab; riproducibile mouse + keyboard).
  - Punto 2 (`/config/farmaci` create + tap Annulla): PASS (CP4 §6.98 confermato).
  - Punto 3 (update profilo attivo + rebuildPlan `/oggi`): SKIP → **§6.106** (ridondante vs unit coverage `actions.profili.test.js:274,283` da CP6 §6.95).
  - Punto 4 (cross-tab `/config/farmaci` → tap Profili): PASS (URL `/config/profili`, zero loop, console pulita).
  - Punto 5 (5 coppie cross-tab rimanenti, totale 6 permutazioni ordinate): PASS tutte verdi.
  - Bonus (cross-tab dirty `ImpostazioniTab` Nome + UnsavedChangesModal + Scarta e continua): PASS, valore persistito ripristinato dopo scarto.
- **§6.104 chiusa** in v2.5.33: fix path absolute applicato e verificato in browser. Aggiunta **nota audit retroattiva** dentro §6.104 (pattern grep `'NavLink to="[^/]'` non cattura data-driven `to={var}`; estendere a `to={` literal match per audit futuri — lezione operativa).
- **Nuove §6.105** (ConfirmModal focus-restore non funziona su ProfiliTab — fix scope **8d-B tier C** insieme a §6.103) + **§6.106** (CP7 Punto 3 skipped per ridondanza vs unit coverage §6.95 — pattern documentato).
- **§11 sostituita** con prompt analisi-first **Sessione 8d-B** (tier C + investigation: §6.81 dark contrast, §6.96 sticky separator CSS var+ResizeObserver per AMB-8d.B, §6.85 `nome_utente` investigation per AMB-8d.E, §6.84 test router retrofit, §6.103 useModalA11y UnsavedChangesModal, §6.105 ConfirmModal focus-restore ProfiliTab).
- Nuovo **§22.15** stato post-Sessione 8d-A-continue-2.
- §7 roadmap: riga 8d-A-continue-2 da "⏳ Pianificata" a ✅ **Completo**. Riga 8d-A-continue parziale resta come record storico.
- Nessuna modifica a §12 (2 file codice toccati in 8d-A-continue-2: `ConfigView.jsx`, `ConfigTabBar.jsx` — già tracciati in 8a).
- Commit code-side (sul Mac, branch `step-8`): `67937e5` CP1 §6.104. Commit Changelog alla consegna.

**Changelog versione 2.5.32 (rispetto alla 2.5.31):**
- Sessione **8d-A-continue parziale** completata 24/04/2026: 3 CP su 4 eseguiti (CP4 §6.98, CP5 §6.89+§6.92, CP6 §6.95). Baseline test **307/307 → 310/310 su 31 test files** (+3 netti, in range §11). Bump v2.5.31 → v2.5.32.
- **CP4 §6.98** — FarmacoDrawer `handleAnnulla` split in `doAnnulla` (silent primitive) + `handleAnnulla` (dirty-gated). Mount conditional `UnsavedChangesModal` su `unsavedConfirmOpen`, on-discard → `doAnnulla`, on-cancel preserva form. Source-of-truth dirty = `isDirty` memo locale (non hook `_isDirty`). Tutti e 4 i trigger close (× header, Annulla footer, Escape useModalA11y, backdrop `!isDirty`-gated) funnel attraverso `handleAnnulla`. **+2 test** (guard su dirty / silent close su clean). 1 hotfix pre-commit intra-CP4: test selector `getByText(/modifiche non salvate/i)` → `getByRole('heading', …)` per disambiguare h3 title vs p body (regex match ambiguo). Rettifica di riferimento §11 (prompt citava "ProfiliTab::handleClose §6.86.3" impropriamente: ProfiliTab fa silent close, §6.86.3 è z-index bump; precedente effettivo è ConfigView cross-tab guard) annotata inline nel commento codice, no §6.NN.
- **CP5 §6.89+§6.92** — ProfiliTab retrofit: `ConfirmDeleteProfiloModal` inline rimosso (54 righe dead-code + 13 commento intestazione), sostituito con `<ConfirmModal>` shared (`src/components/shared/ConfirmModal.jsx`, creato 8c-2 CP5). Copy preservata 1:1 (title "Elimina profilo?" / confirmLabel "Elimina profilo" / body con `{nomeProfilo}` / danger=true). **§6.92 risolta automaticamente**: ConfirmModal shared monta `useModalA11y` (focus-trap + Escape + restore-focus) che il predecessore mancava ("deferred to 8d polish" consumato). Test esistente (linea 134) adattato: `confirm-delete-profilo` → `confirm-modal` (testid shared, 2 occorrenze). Δ test = 0 (solo adattamento, come da §11 range "0-1"). ProfiliTab.jsx 643 → 585 righe (-58 netti).
- **CP6 §6.95** — `updateProfilo` proactive retrofit (AMB-8d.D coherence defence). `rebuildPlanFromFresh` generalizzato da `{farmaci, orari}` obbligatori a **`{profilo?, farmaci?, orari?} = {}`** con fallback stateRef via `getState()`. Retrocompat per thunks farmaci esistenti. `updateProfilo` sostituisce `await rebuildPlan()` con `await rebuildPlanFromFresh({ profilo: nuovoProfiloAttivo })` per bypassare stateRef lag (AppContext aggiorna stateRef via useEffect un tick dopo dispatch). **+1 test** (vi.mock planBuilder, verifica `buildMultiDayPlan` riceve profilo fresco ora_colazione:'09:00' non stale '07:30' da getState). Rettifica prompt §11 ("APPLY_CAMBIO_PROFILO" → `SET_PROFILO_ATTIVO` effettivo; APPLY_CAMBIO_PROFILO è in `cambiaProfilo`, flow diverso con `ricalcolaPianoDaProfilo`) annotata inline. **§6.102 aperta** (generalizzazione helper = rifattorizzazione positiva).
- **Nuove §6.102** (rebuildPlanFromFresh signature extension) + **§6.103** (UnsavedChangesModal 2° consumer → candidate useModalA11y retrofit, docs-only da CP4 parziale) + **§6.104** (ConfigView routing loop — pre-existing interaction con CP1 §6.84 `v7_relativeSplatPath: true`, scoperto in browser check CP7).
- **CP7 NON eseguito** — browser check ha rivelato blocker §6.104 al tap tab Profili da `/config/farmaci`: URL degenera in `/config/farmaci/profili/impostazioni/impostazioni/...` → rate limit Chrome (`Throttling navigation to prevent the browser from hanging`) + `Maximum update depth exceeded` da `<Navigate>` in ConfigView:41. Root cause: ConfigView + ConfigTabBar scritti contro v6 path-resolution, `v7_relativeSplatPath` opt-in in §6.84 ha flippato risoluzione `<Navigate to="impostazioni">` da parent-relative a splat-relative. Bug **pre-esistente da CP1 8d-A**, non regressione CP4/5/6. Isolato via source-review (2 file coinvolti, fuori scope pattern-retrofit 8d-A-continue). Pattern §6.99-style: chiusura parziale + prosecuzione in **Sessione 8d-A-continue-2** con scope **analisi-first §6.104 + fix + browser check + CP7 bump v2.5.33**.
- **§11 sostituita** con prompt analisi-first **Sessione 8d-A-continue-2** (§6.104 fix + browser checklist CP4/5/6 + bump Changelog v2.5.32 → v2.5.33).
- Nuovo **§22.14** stato post-Sessione 8d-A-continue parziale.
- §7 roadmap: riga 8d-A-continue da "⏳ Pianificata" a **"⚠️ Parziale (CP4-CP6 ✅, CP7 blocker §6.104 deferred)"**, nuova riga **8d-A-continue-2 ⏳**.
- Nessuna modifica a §12 (4 file codice toccati in 8d-A-continue: `FarmaciTab.jsx`, `FarmaciTab.test.jsx`, `ProfiliTab.jsx`, `ProfiliTab.test.jsx`, `actions.js`, `actions.profili.test.js` — tutti già tracciati in sessioni precedenti).
- Commit code-side (sul Mac, branch `step-8`): `30b01ce` CP4, `f316e6c` CP5, `264ab1c` CP6. Commit Changelog alla consegna.

---

**Changelog versione 2.5.31 (rispetto alla 2.5.30):**
- Sessione **8d-A parziale** completata 24/04/2026: 3 CP su 6 eseguiti (CP1 §6.84, CP2 §6.94, CP3 §6.97 riscoped). Baseline test **306/306 → 307/307 su 31 test files** (+1 da CP3 regression guard). Bump v2.5.30 → v2.5.31.
- **CP1 §6.84** — React Router v7 future flags. Scope ridotto ad **app router only** (`src/main.jsx`): tentativo estensione al test router `MemoryRouter` in `src/test/renderHelpers.jsx` ha causato hang deterministico >26min di `vitest run`, rollback immediato. Warning `React Router Future Flag` persistono in stderr dei test. Dettagli in nuova **§6.100**.
- **CP2 §6.94** — `defaultNoopActions()` completamento (AMB-8d.C): +5 thunks noop (`addProfilo/updateProfilo/deleteProfilo/attivaProfilo/annullaAssunzione`) in `src/test/renderHelpers.jsx`. Pattern `async () => ({...})` coerente con noop pre-esistenti (non `vi.fn()` letterale del prompt §11 CP2: micro-invarianza auto-evidente nel diff, non documentata). Commento header aggiornato. Δ test = 0 come atteso.
- **CP3 §6.97** — **Riscoped da fix a regression guard**. Diagnosi 8d-A (git blame `src/components/oggi/DoseCard.jsx` linee 120-140, commit `1c900064` del 19 apr 2026) ha confermato che il branch `indifferente` + early-return esistono dalla creazione del file: bug descritto in §6.97 **non riproducibile nel codice attuale**. Nuovo describe block in `DoseCard.test.jsx` con 1 test assertion di contratto. §6.97 chiusa. Dettagli in nuova **§6.101**.
- **Nuove §6.100** (CP1 scope app-only) + **§6.101** (CP3 riscope + chiusura §6.97).
- **CP4-CP6 + CP7 NON eseguiti** — chiusura parziale per stanchezza sessione (~2h20min + hang CP1). Pattern §6.99-style: prosecuzione in **Sessione 8d-A-continue** con baseline 307/307 e scope residuo (CP4 §6.98 drawer guard, CP5 §6.89+§6.92 ProfiliTab retrofit, CP6 §6.95 proactive `updateProfilo`, CP7 bump v2.5.32).
- **§11 sostituita** con prompt esecutivo **Sessione 8d-A-continue** (CP0 sanity su baseline 307 + CP4-CP6 + CP7 bump v2.5.31 → v2.5.32).
- Nuovo **§22.13** stato post-Sessione 8d-A parziale.
- §7 roadmap: riga 8d-A da "⏳ Pianificata" a **"⚠️ Parziale (CP1-CP3 ✅, CP4-CP7 deferred)"**, nuova riga **8d-A-continue ⏳**.
- Nessuna modifica a §12 (3 file codice toccati in 8d-A parziale: `src/main.jsx`, `src/test/renderHelpers.jsx`, `src/components/oggi/DoseCard.test.jsx` — tutti già tracciati in sessioni precedenti).
- Commit code-side (sul Mac, branch `step-8`): `2d79055` CP1, `98cb25f` CP2, `ace1ed2` CP3. Commit Changelog alla consegna.

---

**Changelog versione 2.5.30 (rispetto alla 2.5.29):**
- Sessione **8d analisi-first** completata 24/04/2026: 5 AMB-8d.A-E congelate. Baseline test invariata **306/306 su 31 test files** (zero codice toccato, solo documentale). Bump v2.5.29 → v2.5.30.
- **AMB-8d.A** — Split Sessione 8d in **8d-A** (tier A+B, pattern-based) + **8d-B** (tier C + §6.85, design-decision + investigation). Documentato in nuova **§6.99** (deviazione procedurale).
- **AMB-8d.B** — §6.96 sticky separator `/oggi` approach = **CSS var `--app-header-height` aggiornata da ResizeObserver** sull'header root. Scope 8d-B.
- **AMB-8d.C** — §6.94 `defaultNoopActions()` retrofit scope = **tutti i 5 thunks mancanti** (`addProfilo / updateProfilo / deleteProfilo / attivaProfilo / annullaAssunzione`). Scope 8d-A.
- **AMB-8d.D** — §6.95 preventive retrofit `updateProfilo` a `rebuildPlanFromFresh` pattern = **proattivo** (coherence defence, non reattivo on-demand). Scope 8d-A.
- **AMB-8d.E** — §6.85 `nome_utente` azzerato anomalia = **include in 8d-B tier C** (investigation con strumentazione logging). Il prompt §11 v2.5.29 l'aveva omessa dai prerequisiti di lettura pur marcandola "candidate 8d investigation" in §6.85:1871 + §22.6:3745 — lapsus di scrittura sanato.
- **Scope 8d-A (6 retrofit, target test 310-312 / +4 a +6):**
  - CP1 §6.84 future flags Router v7 (zero Δ test)
  - CP2 §6.94 bag noop +5 (zero Δ test)
  - CP3 §6.97 DoseCard copy `indifferente` (+1)
  - CP4 §6.98 UnsavedChanges guard FarmacoDrawer (+2)
  - CP5 §6.89+§6.92 ProfiliTab retrofit ConfirmModal shared (0-1)
  - CP6 §6.95 proactive updateProfilo retrofit (+1)
- **Scope 8d-B (3 item, target test TBD in analisi-first 8d-B):**
  - §6.81 ConfigTabBar dark token
  - §6.96 sticky separator dinamico (AMB-8d.B)
  - §6.85 nome_utente investigation (AMB-8d.E)
- **§11 sostituita** con prompt esecutivo **Sessione 8d-A impl** (CP0 sanity + CP1-CP6 retrofit + CP7 browser+bump+commit). Target 310-312 test, bump v2.5.30 → v2.5.31.
- Nuovo **§22.12** stato post-Sessione 8d analisi-first.
- §7 roadmap: 8d → "⏸️ Split in 8d-A + 8d-B (analisi-first ✅)"; nuova riga **8d-A ⏳** + **8d-B ⏳**.
- Nessuna modifica a §12 (zero file codice prodotti in 8d analisi-first).
- Nessun commit Mac-side di codice richiesto; solo commit Changelog bump alla consegna.

---

**Changelog versione 2.5.29 (rispetto alla 2.5.28):**
- Sessione 8c-2 contingency completata (CP5+CP6 di 8c). Baseline 297/297 → **306/306 su 31 test files** (+9 netti; target §11 v2.5.28 "308 ±3" soddisfatto con -2 in range). Bump v2.5.28 → v2.5.29.
- **CP5** thunks farmaci CRUD + ConfirmModal shared + delete + data_fine-past:
  - `src/components/shared/ConfirmModal.jsx` NUOVO (108 righe): API props `{open, title, body, confirmLabel, cancelLabel='Annulla', danger=false, onConfirm, onCancel}`. Monta `useModalA11y` (focus trap + Escape + restore focus). Z-index `z-[60]` sopra drawer/UnsavedChangesModal. No-backdrop-dismiss (buttons-only).
  - 3 thunks pessimistici in `src/state/actions.js`: `addFarmaco(data, orari)`, `updateFarmaco(id, patch, orari?)`, `deleteFarmaco(id)`. Pattern `withTransaction('rw', ['farmaci','orari_base'], ...)` per add/update; soft-delete no-tx. Post-commit rifetch `farmaci + orari` parallelo + dispatch `SET_FARMACI + SET_ORARI` + `rebuildPlanFromFresh(...)` (cfr §6.95).
  - `selectFarmacoById(state, id)` in `src/state/selectors.js` — firma non-curried allineata a `selectProfiloById` (AMB-8c-2.C decisa opzione A consigliata).
  - FarmaciTab wire: bottone "Elimina" danger in footer drawer (edit-mode only), `normalizeForm` helper (string→number, trim→null), `handleSalva` route attraverso data_fine-past interceptor se `data_fine < todayIso()` (create + edit, AMB-8c-2.D), submit-lock `submitting` state per prevenire double-fire.
  - 2 `ConfirmModal` inline: copy §6.67 (delete) + copy §6.68 (data_fine-past), con `dataFinePendingPayload` preservato in state tra Save→Confirm.
  - Test: `actions.farmaci.test.js` NUOVO (6 test split-per-concern §6.87: add success/fail, update con/senza orari, delete success/fail); `selectors.test.js` +1 test; `FarmaciTab.test.jsx` +2 test end-to-end (delete flow + data_fine-past flow).
- **CP6** CP browser 7 punti (tutti ✅ verdi). **Hotfix §6.95** intra-sessione rilevato al punto 4 (vedi sotto).
- **7 deviazioni §6.NN** aperte/consumate in questa sessione:
  - **§6.89** — ConfirmModal promozione 2° consumer. **Consumata parzialmente** (FarmaciTab delete + data_fine-past). Retrofit `ConfirmDeleteProfiloModal` → `ConfirmModal` shared in ProfiliTab resta pendente, candidato 8d.
  - **§6.92** — ConfirmModal shared monta `useModalA11y` mentre predecessore `ConfirmDeleteProfiloModal` (ProfiliTab 8b CP7) NON lo fa ("deferred to 8d polish" commento pregresso). Asimmetria temporanea accettata (AMB-8c-2.B opzione A consigliata); retrofit 8d.
  - **§6.93** — thunks farmaci rifetch anche `orari` oltre a `farmaci` (il prompt §11 v2.5.28 CP5 punto 5 menzionava solo `SET_FARMACI` rifetch). Motivazione: `rebuildPlan` legge `state.orari` che dopo `replaceOrariForFarmaco` è stale; rifetch coerente a zero UX cost. Reducer `SET_ORARI` già preesistente (8a CP4, §6.90 contesto esteso). (AMB-8c-2.A opzione A consigliata.)
  - **§6.94** — `defaultNoopActions()` in `src/test/renderHelpers.jsx` esteso con i 3 thunks farmaci nuovi. Simmetria per consumer futuri; zero scope creep (profili/annullaAssunzione mancanze preesistenti NON retrofit, candidato 8d). (AMB-8c-2.F decisa da Claude come "Decidi tu" ratifica.)
  - **§6.95** — **hotfix intra-CP6 (stateRef-bypass)**. Scoperta al punto 4 browser: dopo `addFarmaco` il nuovo farmaco era persistito e presente nella lista, ma **zero plan entries per oggi**. Causa: `await rebuildPlan()` subito dopo `dispatch SET_FARMACI/SET_ORARI` legge `stateRef.current` che `AppContext.jsx:55-57` aggiorna in un `useEffect([state])` **un tick dopo** il dispatch. Nella stessa microtask chain del thunk, `rebuildPlan` opera su state stale che non include il farmaco appena scritto. Fix: helper `rebuildPlanFromFresh({farmaci, orari})` che costruisce il plan inline dai dati già fetchati, bypassando stateRef. Pattern `updateProfilo` (actions.js:464) soffre analogo ma osservabilità mascherata dallo spread `profiloAttivo` nel dispatch; retrofit preventivo candidato 8d. Commit separato `06dc680`.
  - **§6.96** — (emersa) sticky separator `/oggi` ha `top: 180px` hardcoded invece di ancorarsi dinamicamente alla base dell'header app. Non-blocker, scoperta CP6 punto 4/5; retrofit 8d.
  - **§6.97** — (emersa) DoseCard copy mismatch su `relazione_pasto='indifferente'` → rende "Assumere lontano dai pasti" invece di "Assumere indifferentemente dai pasti". Bug pregresso (pre-8c-2): i 10 seed hanno `relazione_pasto ∈ {prima,durante,dopo,lontano}`, mai `indifferente`, quindi non si manifestava. Emerso al punto 4 creando "Test" con `indifferente`. Non-blocker, retrofit 8d.
  - **§6.98** — (emersa) UnsavedChangesModal guard **NON scatta** al tap Annulla/× nel drawer `FarmacoDrawer` pur con form dirty. Verificato in 2 path distinti (pulito create-mode con solo Nome dirty; dopo cancel di ConfirmModal data_fine-past): in entrambi i casi drawer chiude direttamente senza prompt. Ipotesi: porting da ProfiliTab dell'hook `useUnsavedChanges` copre solo cambio-tab cross-contesto, non il close path del drawer. Non-blocker (zero writes IDB, dato perso solo nel form React state, equivalente a "refresh pagina"). Retrofit 8d, pattern replica da ProfiliTab ~10 righe.
- **Scoperte operative** (non §6.NN):
  1. **Trim concatenato `dosi_giornaliere`** (es. 2→3→1) sovrascrive `removedOrari` in FarmaciDrawer invece di cumulare. Undo ripristina solo l'ultimo trim. Design choice di CP4 8c (non un bug): il prompt §11 punto 3 testa un trim singolo, lo scenario concatenato non è nel contratto. Se mai diventasse problema UX reale, valutare in sessione dedicata.
  2. **ConfirmModal cancel preserva form dirty by design** (FarmaciTab data_fine-past cancel punto 6c): l'utente può rivedere la data senza perdere altri campi dirty. Lo state IDB non è toccato. Non è §6.NN ma interfaccia atipica da ricordare.
  3. **Drawer backdrop blocca cambio-tab fisicamente** (punto 7 UnsavedChanges cross-tab): il click sull'area del tab-bar Config viene assorbito dal backdrop del drawer. Guard UnsavedChanges "by design" in quanto drawer modale preventivo. La guard rimane rilevante solo per navigation diretta (URL bar, back button) — non testato in CP6.
- **Hotfix commit policy**: 3 commit separati per 8c-2 (`dda9af7` CP5, `06dc680` CP6 hotfix §6.95, + Changelog bump in commit successivo). Pattern 8b §6.70 (drift-preventive split codice + Changelog).
- **§11 sostituita** con prompt esecutivo **Sessione 8d — polish Config + retrofit 8a-8c candidate** (chiude §6.81, §6.84, §6.89 retrofit ProfiliTab, §6.92 useModalA11y retrofit, §6.96 sticky separator, §6.97 DoseCard copy, §6.98 UnsavedChanges guard FarmacoDrawer + §6.94 completamento defaultNoopActions).
- Nuovo **§22.11** stato post-Sessione 8c-2.
- §7 roadmap: 8c-2 ✅; nuova riga **8d ⏳** (polish + retrofit).
- §12 titolo esteso con `+ 8c-2`; tabella delta 8c-2 append.

**Changelog versione 2.5.28 (rispetto alla 2.5.27):**
- Sessione 8c implementativa **parziale** (CP1-CP4 completati, CP5-CP6 rimandati a 8c-2 contingency per preservare qualità, come previsto da §11 v2.5.27 note finali).
- **CP1** flip `GET_FARMACI_SOLO_ATTIVI = true` in `src/domain/constants.js`: **287/287 test invariati** (zero rotti — consumer unico `actions.js:99` in `init()`, nessun test di integrazione con fixture `attivo:0` su farmaci).
- **CP2** lista FarmaciTab read-only + `FarmacoCard` interno + `selectFarmaci` in selectors.js + sort alfabetico collation `it` + border-left + badge Cronico/Temporaneo + bottone "+ Nuovo" disabled. **287 → 290 test** (+3 netti).
- **CP3** `FarmacoDrawer` + form 3 sezioni (Anagrafica / Frequenza & Dosi / Avanzate) con H2 sticky per sezione, `useModalA11y` focus trap, backdrop gated (§6.86.1/.4), validation required + duplicate name warning case-insensitive+trim, hard check `intervallo_minimo_ore < intervallo_ore` + conditional rendering `intervallo_ore`. ConfigView wire `dirty/setDirty` su `<Route path="farmaci">`. **290 → 293 test** (+3 netti). **§6.88 consumata** (campo `attivo` OMESSO dal form, commento inline).
- **CP4** hook `useUnsavedChanges` estratto in `src/hooks/useUnsavedChanges.js` (AMB-8c.I, rettifica F2 / DRY-at-3, AMB-8b.G chiusa implicitamente). FarmaciTab consuma il hook al posto di `useState`+fallback. **Sezione Orari inline** tra Frequenza&Dosi e Avanzate con `OrarioRow` sub-component mobile-first (grid 2-col ancora+offset + textarea descrizione). Auto-sync righe↔`dosi_giornaliere`: add con defaults (ancora=colazione, offset=0) + trim con banner `role="status"` + undo label "Ripristina" (no collision con footer "Annulla"). Rehydration orari in edit mode da `state.orari.filter(farmaco_id)`. Soft warning ordine `wrapCount > 1` usando `computeOraPrevista` importato da `src/domain/planBuilder.js` (zero duplicazione dominio). **293 → 297 test** (+4 netti: 1 hook + 3 FarmaciTab).
- **3 deviazioni §6 aperte** in questa sessione:
  - **§6.88** — campo `attivo` OMESSO dal form farmaco (CP3, AMB-8c.H). Soft-delete (§6.67) diventa unico canale user-level di disattivazione; schema DB invariato.
  - **§6.90** — `SET_FARMACI` action type + test preesistenti da Sessione 8a CP4 (§6.77 cleanup), non catturati dall'analisi 8c (§22.9) che aveva scope AMB-only. Reducer.js:161 e reducer.test.js:201 già presenti come "template pattern" insieme a `SET_ORARI`. Effetto: CP5 punto 3 del prompt §11 v2.5.27 degenera in no-op; target finale 8c rivisto 309±3 → **308±3** per coerenza. Nessuna azione correttiva sul codice, solo documentale. Precedente analogo: §6.60.
  - **§6.91** — badge "Temporaneo" in `FarmacoCard` usa token `t.orange` (non `amber` letterale AMB-8c.A), per token-completeness: theme.js espone terna `orange/orangeBg/orangeTx` simmetrica a `green`, mentre `amber` ha solo `amberBg/amberTx` partials. Impatto: nominalismo visuale, zero impatto semantico.
- **Scoperta operativa CP0**: 19 file `.bak` relitti (suffissi `.cp1 .cp2 .cp3 .cp4 .cp5 .cp6 .cp7 .hotfix .hotfixbug`) residui di sessioni 8a/8b presenti in `src/test/`, `src/components/config/`, `src/data/repository/`, `src/state/`. Rimozione massiva via `find src -name '*.bak' -delete` in apertura CP2 (untracked, zero perdita). Rischio grep fantasma nelle future sessioni neutralizzato.
- **Scoperta operativa CP4**: `computeOraPrevista` già esportata pura da `src/domain/planBuilder.js:7` (re-export backward-compat). Import diretto evita re-implementazione logica ora_prevista virtuale — coerente con "helper pure inline" (scelta utente) senza duplicazione dominio.
- **Contingency split deciso in chiusura CP4**: CP5 (thunks CRUD + ConfirmModal shared + delete + data_fine-past + 12 test) + CP6 (CP browser 7 punti) delegati a **Sessione 8c-2**. Rationale: attenzione residua post-CP4 insufficiente per qualità CP5, consistent con note finali §11 v2.5.27.
- **§11 sostituita** con prompt esecutivo **Sessione 8c-2 contingency** (CP0 sanity-light + CP5 thunks/ConfirmModal/delete/data_fine-past + CP6 browser; baseline 297, target **308 ±3**).
- Nuovo **§22.10** stato post-Sessione 8c implementativa (parziale CP1-CP4).
- §7 roadmap: riga 8c → "⏸️ In corso (parziale CP1-CP4)", nuova riga **8c-2** pianificata (CP5+CP6).
- §12 titolo esteso con `+ 8a + 8b + 8c-parz`; nuova tabella delta 8c parziale.
- Deviazioni **candidate** ancora aperte per 8c-2: **§6.89** (ConfirmModal promozione 2° consumer, rationale F3) rimane da aprire al primo commit CP5 8c-2.
- Drift §6.69 pregresso invariato rispetto a v2.5.27 (entry 2.5.28 in continuità posizionale con 2.5.27).

**Changelog versione 2.5.27 (rispetto alla 2.5.26):**
- Sessione 8c analisi-first completata 23/04/2026: 14 AMB-8c.A-N congelate per FarmaciTab (lista+drawer + form 4 sezioni §6.66 + thunks CRUD + hook `useUnsavedChanges` estratto + `ConfirmModal` shared + soft-delete + flip `GET_FARMACI_SOLO_ATTIVI`)
- 9 Q risolte (UX FarmaciTab, form details, thunks, hook extraction, delete+data_fine-past, lista/filtri, test strategy, CP breakdown, CP0 gates)
- 4 rettifiche F emerse: **F1** rimozione campo `attivo` dal form §6.66 (→ candidata §6.88 per impl); **F2** `useUnsavedChanges` DRY-at-3 triggered (chiusura AMB-8b.G); **F3** `ConfirmModal` promosso al 2° consumer vs 3° canonico (→ candidata §6.89 per impl); **F4** O2 DoseCard delta_minuti check già soddisfatto da 7d-2p3 (§22.3.1 + §6.45)
- §11 stub sostituito con prompt esecutivo **Sessione 8c implementativa** (7 CP: CP0 sanity → CP1 flip `GET_FARMACI_SOLO_ATTIVI` + remediation → CP2 lista read-only → CP3 drawer + 3 sezioni → CP4 sezione Orari + hook extraction → CP5 thunks + ConfirmModal + delete + data_fine-past → CP6 CP browser; baseline 287, target **309 ±3**)
- Nuovo §22.9 stato post-Sessione 8c analisi-first
- Zero deviazioni §6.NN consumate (sessione analisi pura); 2 candidate dichiarate per 8c impl
- Drift §6.69 pregresso invariato rispetto a v2.5.26 (entry 2.5.27 in continuità posizionale con 2.5.26)

**Changelog versione 2.5.20.1 (rispetto alla 2.5.20):**
- Micro-patch al §11 del prompt Sessione 8-pre: integrate **2 note procedurali** (N1/N2) emerse in chiusura Sessione 8 analisi-first del 22/04/2026, da valutare come candidate §6.69/§6.70 procedurali in apertura di 8-pre.
  - **N1 — Sanity check intestazione front-matter ad ogni bump versione.** Scoperta quando l'utente ha rilevato che il file v2.5.20 riportava ancora `**Versione:** 2.5.19` nell'intestazione, perché il bump era stato applicato solo al blocco meta del corpo. Applicata subito in questo micro-patch (intestazione ora riporta v2.5.20.1 + Ultima modifica 22/04, coerenza front-matter ↔ corpo preservata).
  - **N2 — Sanity check sincronizzazione Changelog KB Claude ↔ repo git.** Scoperta in chiusura sessione: il Changelog nel repo `~/Sviluppo/pharmatimer` era fermo a **v2.5.3** (commit `4f2669f` del 18/04, pre-Sessione 6), mentre la KB Claude era aggiornata a v2.5.19. Drift silenzioso di 17 versioni (il codice delle sessioni 6/7a/7b-1/7b-2/7c-1/7c-2/7d-1/7d-2p1/7d-2p2/7d-2p3 era regolarmente committato, solo il Changelog rimasto fuori git). Catch-up applicato con commit unico `2bf2373` del 22/04 (messaggio esplicita range v2.5.3 → v2.5.20).
- Entrambe le note sono ora ancorate al §11 di 8-pre in una sezione dedicata ("Note procedurali emerse in chiusura Sessione 8 analisi-first") così che vengano trattate naturalmente in apertura della prossima analisi-first invece di essere rimandate indefinitamente.
- Nessuna modifica al codice, nessuna modifica a §6.NN esistenti (le note sono candidate, non ancora promosse). La formalizzazione eventuale come §6.69/§6.70 procedurali sarà decisione aperta di 8-pre.

**Changelog versione 2.5.20 (rispetto alla 2.5.19):**
- Sessione 8 analisi-first 22/04/2026 completata: 7 Q (Q3-Q9) risolte in sessione interattiva checkpoint-based; 3 Q residue (Q1/Q2/parziale) differite a 8-pre dedicata per non contaminare 8d polish.
- Congelate **5 deviazioni candidate §6.64-§6.68** (strategia refresh post-Config + layout Config + form farmaco atomico + soft-delete + date editabili).
- **Scoperta critica durante analisi Q8:** `GET_FARMACI_SOLO_ATTIVI=false` (AMB-5b2.D) rende inefficace il soft-delete sul plan corrente. Flip a `true` congelato in §6.67 con verifica CP0 in 8c.
- **Nota CP0 per 8c:** verificare che `DoseCard` usi `entry.delta_minuti` storico e non ricalcoli al render (invariante §6.23 riaffermata in §6.64). Se ricalcola, pre-fix obbligatorio prima di aprire gli edit form.
- **Split finale Step 8 in 5 sotto-sessioni:** 8-pre (Q1/Q2 analisi-first) → 8a (foundation+Impostazioni) → 8b (Profili) → 8c (Farmaci) → 8d (polish). §7 roadmap aggiornata con scope dettagliato per ciascuna sub.
- **Config = 3 tabs URL-addressable** (Profili / Farmaci / Impostazioni), niente OrariTab separato: orari nested in FarmaciTab, save atomico via nuovo `withTransaction` Dexie-native (§6.64). Header Oggi mantiene toggle tema come shortcut (Config.Impostazioni è fonte).
- Sostituito prompt §11 (Sessione 8 analisi-first v2.5.19 consumato) con prompt **Sessione 8-pre analisi-first** (scope Q1 + Q2; prerequisiti di lettura: `src/domain/recalc.js` §6.61, `src/state/actions.js`, `src/state/applyHelper.js`, `src/state/reducer.js`, `src/state/AppContext.jsx`, `src/domain/constants.js`, `src/data/repository/IRepository.js`, §22.3.1, §6.40, §6.48).
- **Rilievo R1** dell'analisi 22/04/2026 (non corretto retroattivamente, prompt consumato): refuso v2.5.19 "§7 flussi utente" — §7 della spec è Export, flussi utente non esistono come sezione dedicata. Documentato per non ripetere errore nei prompt §11 futuri (nuova regola in §6.60 procedurale: verificare che i riferimenti a sezioni della spec nei prompt §11 corrispondano a sezioni realmente esistenti).
- **Rilievo R2:** il mockup `pharmatimer_oggi_v5.jsx` non contiene alcuna schermata Config (solo tab stub nella NavBar). Step 8 parte con zero UI reference; le decisioni Q4/Q5 hanno colmato il vuoto con choice esplicite (tab bar URL-addressable, form unico farmaco+orari a sezioni, niente wizard).
- Nessuna modifica al codice (Sessione 8-pre applicherà eventuali AMB). Nessuna deviazione aggiunta oltre §6.64-§6.68.

**Changelog versione 2.5.19 (rispetto alla 2.5.18):**
- Sessione 7d-2 parte 3/3 completata in esecuzione il 21/04/2026: CP6 (DoseCard polish §6.45 + §6.47a) + CP7 (theme token `focusRing` + OggiView `buildCss(t)` token-aware) + CP browser 6/6 verdi. 4 file touched (modificati), zero nuovi file, zero nuovi test files (test aggiunti al file `DoseCard.test.jsx` esistente). Test: **245 → 247** (+2 netti, target AMB-K'' 247±2 centrato esattamente).
- **CP6 clean (Δ+2 test netti):** in `DoseCard.jsx` §6.45 estende label "in orario" a tutta la finestra di tolleranza `|delta_minuti| ≤ TOLLERANZA_MIN` (pre-CP6 solo `delta===0`, color già verde ma label "Anticipo/Ritardo" — incoerenza UI); §6.47(a) introduce `gapResiduo = (gap_minuti ?? 0) - (recupero_minuti ?? 0)` consumato da `hasGapTap` guard + mount condition + label `formatGapLabel(gapResiduo)` per entrambe le branche TapBadge e Badge fallback. In `DoseCard.test.jsx` 2 update (test "delta=-5 → Anticipo" ora "delta=-5 → in orario"; nome test "gap_minuti > 0" → "gapResiduo > 0") + 2 NEW (§6.45 "delta=30 → Ritardo + 30 min"; §6.47a "gap=60 recupero=60 → badge NON renderizzato").
- **CP7 clean (Δ0 test, decisione design):** in `theme.js` nuovo token `focusRing: dk ? '#60A5FA' : '#3B82F6'` accanto a `dateSepBgStrong`. In `OggiView.jsx` promozione di `const CARD_AND_SLIDER_CSS` (top-level) a `function buildCss(t)` (Opzione 1 del prompt §11); consumer `const cssString = useMemo(() => buildCss(t), [t])` piazzato prima degli early return (hooks-before-returns rispettato); `<style>{cssString}</style>` sostituisce `<style>{CARD_AND_SLIDER_CSS}</style>`. Regola `:focus-visible` usa `${t.focusRing}` invece di `#3B82F6` hardcoded.
- **Zero nuove deviazioni §6:** tutte le 7 AMB-7d-2p3 congelate da v2.5.16 (E/G/I/J/M/K''/L'') rispettate letteralmente. Nessun refuso di prompt da segnalare.
- **CP browser 6/6 verdi** (pilotato via `__pt.app.actions` dalla console, visto che le preferenze utente favoriscono una guida step-by-step): §6.45 tolleranza (delta=130 → "Ritardo 2h 10" rosso; delta=10 → "in orario" verde), §6.47(a) gap residuo (parziale 210→90; completo 210→0 con badge scomparso), §6.40 presoStack preservato su reload (stack a 3 elementi integro), §6.41 UndoModal happy path (modale aperta, titolo "Ezevast 10/20mg", sottotitolo "Dose presa alle 21:05 il 21/04", tap "Annulla assunzione" → stato → prevista + `ora_effettiva`/`delta_minuti` = null + key rimossa dal `presoStack`), §6.41 guard DOWNSTREAM_USER_EDITS (banner "⚠ Impossibile annullare — Una dose successiva è già stata registrata o sospesa. Correggi prima quella." con modale aperta; state.error = `{kind:'domain', code:'DOWNSTREAM_USER_EDITS', message:...}`), §6.46/§G focus ring token-aware (verifica DOM + visuale: `#60A5FA` in dark mode, `#3B82F6` in light mode via `useMemo` rebuild, ring visibile offset 3px spessore 2.5px).
- **Scoperta operativa non bloccante §22.3.1:** `actions.recupero(key, 0)` azzera `recupero_minuti` in DB ma NON resetta `ora_ricalcolata` al valore originale. Rebuild plan (`actions.rebuildPlan()`) neppure lo fa. Interpretazione: il dominio tratta `ora_ricalcolata` come **fatto storico persistito** una volta scritto (coerente con §6.48 ephemeral prompt + valore consolidato post-apply). Non è scope 7d-2, non è bug in CP6/CP7; è asimmetria del path `applyRecupero` da valutare in futuro (candidato §6.6x se emerge necessità esplicita di reset).
- Nuova §22.3 "Stato post-Sessione 7d-2 parte 3/3" con file prodotti, consuntivo test, esiti CP browser puntuali, scoperta operativa.
- Aggiornamento roadmap §7: step 7d-2 passa a `7d-2p1 ✅ / 7d-2p2 ✅ / 7d-2p3 ✅`. **Step 7 completo** (7a/7b-1/7b-2/7c-1/7c-2/7d-1/7d-2 tutti ✅). Step 8 ⏳ prossimo.
- Aggiornamento §12 con delta 7d-2p3 (4 file modificati, 0 nuovi).
- Sostituito prompt §11 (Sessione 7d-2 parte 3/3 esecutiva v2.5.18 consumata) con prompt **Sessione 8 analisi-first** (scope Config view + plan refresh strategy; 3 Q architetturali residue da risolvere — Q1 scope UNDO_ASSUNZIONE total/partial, Q2 log range at init, Q3 plan refresh strategy post-Config edits).

**Changelog versione 2.5.18 (rispetto alla 2.5.17):**
- Sessione 7d-2 parte 2/2 completata in esecuzione il 21/04/2026, ma conclusa anticipatamente dopo CP5 per preservare qualità (dopo varie asperità operative Terminal su heredoc Python e paste base64; workaround `echo '<b64>' | base64 -d | python3` adottato come pattern stabile per patch Python su Mac). CP6 e CP7 delegati a **Sessione 7d-2 parte 3/3** (nuova).
- 10 file touched (modificati) + 3 nuovi = 13 totali. Test: **235 → 245** (+10, in linea con target AMB-K' 246±2 a -1 dal top); 21 → **23 test files** (+2: `actions.annullaAssunzione.test.js`, `UndoModal.test.jsx`).
- **CP4 eseguito clean (Δ+5 test):** rename dominio `annullaAssunzione` → `applyAnnullaAssunzione` (§6.58 chiuso atomicamente), guard `DOWNSTREAM_USER_EDITS` in `applyAnnullaAssunzione` (§6.61 nuova, guard parziale — vedi sotto), nuovo thunk `annullaAssunzione(entryKey)` in action bag, nuova action reducer `REMOVE_PRESO_KEY` (§6.62 nuova) + dispatch dal thunk per stack coherence.
- **CP5 eseguito clean (Δ+5 test):** `applyHelper.js` estende return type a `{ok: false, code?: string}` sul path DomainError (§6.63 nuova); `UndoModal.jsx` riscritto (stub §6.59 sostituito) con focus trap, banner DOWNSTREAM_USER_EDITS in-place, banner GENERIC fallback; DoseCard refactor con 3 JSX const estratti (timeColumn/separator/content) + wrapper `<button>` sibling condizionale su `isPresa && onUndoTap` (HTML-valido, ACTION AREA preservata come sibling); OggiView wiring completo (stato `undoModal`, guard auto-prompt esteso a 4 modali, `closeUndo`, `onUndoTap` prop, mount `<UndoModal>`).
- **Nuove deviazioni §6.61 / §6.62 / §6.63:** guard limitato a N+1 `presa|sospesa` (nessun marker `user_edited` sul modello PlanEntry, ramo `ricalcolata` downstream ancora trattato come auto); stack coherence via action dedicata; UI branch su code evita accesso a `state.error`.
- **2 refusi prompt §11 v2.5.16 risolti (D-R4 / D-R5, non deviazioni):** `ApplyError({kind, code:'downstream_user_edits'})` → `DomainError('DOWNSTREAM_USER_EDITS', ...)` per coerenza con `applyRecupero` (tre codici SCREAMING_SNAKE preesistenti); "focus bottone Annulla" → "focus al primo tabbable (header X)" per uniformità con pattern `useModalA11y` + focus-trap nelle 4 modali 7c-1/7d-1.
- Nuova §22.2 "Stato post-Sessione 7d-2 parte 2/2" con file prodotti, sub-step esiti, scoperte operative (paste Terminal/base64), limitazioni note.
- Aggiornamento roadmap §7: step 7d-2 splittato in `7d-2p1 ✅ / 7d-2p2 ✅ / 7d-2p3 ⏳`.
- Aggiornamento §12 con 13 file delta 7d-2 parte 2/2 (10 modificati + 3 nuovi).
- Sostituito prompt §11 (Sessione 7d-2 parte 2/2 esecutiva v2.5.17 consumata) con prompt **Sessione 7d-2 parte 3/3 esecutiva** (scope CP6 polish DoseCard + CP7 theme focusRing + CP browser 6 punti; baseline 245; target **247 ±2**; 5 AMB residue richiamate da v2.5.16).

**Changelog versione 2.5.17 (rispetto alla 2.5.16):**
- **Sessione 7d-2 splittata in esecuzione in due parti; parte 1/2 completata** il 21/04/2026: CP0→CP3 clean + hotfix intra-sessione su `renderWithRealProvider.jsx`. 9 file touched (5 modificati + 3 nuovi + 1 hotfix). Test: **228 → 235** (+7, target parziale parte 1/2 centrato); 18 → 21 test files (+3: `LocalRepository.test.js`, `AppContext.test.jsx`, `actions.init.test.js`)
- **Motivazione split:** completate CP1 (repo) + CP2 (Provider dual-mode) + CP3 (init populates presoStack), restano CP4 (thunk `annullaAssunzione` + rename dominio + guard) + CP5 (UndoModal + DoseCard onUndoTap) + CP6 (polish §6.45/§6.47a) + CP7 (theme focusRing). CP4 è il CP denso della sessione (rename dominio + nuovo thunk + guard + rischio breakage su test esistenti di `annullaUltima`); chiusura anticipata preserva qualità. Split naturale: CP4 è prerequisito di CP5, CP6/CP7 sono polish visivo indipendenti
- **3 rettifiche refusi prompt §11 v2.5.16 emerse in CP0** (non deviazioni, refusi di specifica):
  - **D-R1** — path `constants.js`: sanity point 13 implicava `src/utils/constants.js` o `src/constants.js`; path reale `src/domain/constants.js`. Zero impatto runtime
  - **D-R2** — naming `getLogsByDataStato` (plurale) in AMB-7d-2.C ridefinito a **`getLogByDataStato`** (singolare) per coerenza con `getLogByData`/`getLogByRange`/`getLogByFarmacoData`. Zero impatto semantico
  - **D-R3** — conflitto nome dominio-vs-thunk: funzione `annullaAssunzione` in `recalc.js:473` coincide col nome thunk richiesto da AMB-7d-2.F. Risoluzione: rename dominio → `applyAnnullaAssunzione` (Opzione 1), applicato in CP4 parte 2/2. Documentato §6.58
- **Nuove deviazioni §6.58-§6.60 candidate** (congelate in §6, applicazione in parte 2/2 o procedurale):
  - **§6.58** — rename `annullaAssunzione` → `applyAnnullaAssunzione` in `recalc.js`. Coerenza famiglia `apply*` + disambiguazione dal thunk. Non applicata in parte 1/2 (CP4 dominio)
  - **§6.59** — stub `UndoModal.jsx` (1 riga, Initial commit) non rimosso in §6.38. Parte 2/2 lo riscriverà, non creerà file nuovo
  - **§6.60** — procedurale: sanity check prompt §11 futuri deve verificare copertura fake repo. Scoperta dopo CP3: estesa `IRepository` con `getLogByDataStato` ma `makeFakeRepo` in `renderWithRealProvider.jsx` non la rispecchiava → 10 OggiView tests falliti al primo run. Hotfix eseguito in-session
- **Running total test e stima residua:** 235/235 corrente. Target finale 7d-2: **246 ±2**. Rimangono +11 da CP4-CP7 (parte 2/2). Breakdown AMB-K atteso: §6.41 UndoModal +4, `annullaAssunzione` thunk +2, Q9 guard +2, §6.45 +2, §6.47(a) +2, Q-N2 Card button +1, CP7 +0 = **+13 vs +11 disponibili** → surplus previsto ~+2 entro tolleranza AMB-K ±2
- Nuova §22.1 "Stato post-Sessione 7d-2 parte 1/2" con file prodotti, hotfix intra-sessione, scoperte CP0→CP3, limitazioni note (UndoModal stub presente ma non consumato; entry key non centralizzata in helper)
- Aggiornamento roadmap §7: step 7d-2 splittato in `7d-2p1 ✅ / 7d-2p2 ⏳`
- Aggiornamento §12 con 8 file delta 7d-2 parte 1/2 (3 nuovi + 5 modificati, contando `reducer.js` una sola volta per le 2 case aggiunte)
- Sostituito prompt §11 (Sessione 7d-2 esecutiva v2.5.16 consumata) con prompt **Sessione 7d-2 parte 2/2 esecutiva** (scope CP4→CP7 + CP browser; baseline 235; target 246 ±2; 7 AMB residue richiamate da v2.5.16 + 3 nuove parte-2/2 specific)

**Changelog versione 2.5.35 (rispetto alla 2.5.34):**
- Sessione **8d-C impl** completata 25/04/2026 (sera): 5 CP eseguiti (CP1+CP3+CP4+CP5 chiusi con fix, CP2 archiviato post-diagnosi A/B). Baseline test **invariata 313/313 su 31 test files** (Δ test = 0, target conservativo AMB-K' "313 ±2" centrato esatto). Bump v2.5.34 → v2.5.35.
- **Nota drift §6.69 pregresso su v2.5.34:** l'entry "Changelog versione 2.5.34 (rispetto alla 2.5.33):" è **assente** dall'elenco introduttivo (drift non rilevato al bump 8d-B impl parziale, analogo a v2.5.24 / v2.5.25 §22.7). **Non retrocorretto in 8d-C** per principio fatto-storico immutabile (§6.71): la nuova entry v2.5.35 si aggiunge senza recuperare il gap. Lo stato 8d-B è coperto da §22.16; questa nuova entry copre 8d-C.
- **5 AMB-8d-C.A÷E ratificate inline** (modalità "decidi tu" su raccomandate di Fase 1 senza interazione Q&A iterativa): A §6.107 calibrazione statica `top-[149px]` (chiude §6.96), B §6.109 diagnosi A/B + fallback condizionale `requestAnimationFrame`, C §6.108 lift `navInactive` token (consigliata b vs a §11), D §6.85 strumentazione 30min + safety net `__pt.wipe()`, E §6.84 `onConsoleLog` filter vitest. Sessione **atomica 8d-C** (split 8d-D non necessario).
- **CP1 §6.110** — fix calibrazione statica `top-[180px]` → `top-[149px]` in `OggiView.jsx` DATE SEPARATOR (149px = altezza header reale misurata 8d-B browser DevTools, validata empiricamente in CP1.4 con `getBoundingClientRect()`). Trade-off accettato: gap residuo possibile in build production senza DEV slider (commento §6.110 inline). **Chiude §6.96** (e §6.107: terzo tentativo dinamico evitato per debito tecnico). 1 file, 8 ins / 7 del.
- **CP2 §6.111** — diagnosi A/B in browser `/config/profili` per §6.109 (focus restore wrong target ProfiliTab post-§6.105). Punto A baseline confermato bug riprodotto (`activeElement = INPUT id="profilo-nome"`). Punto B: span wrapper §6.86.2 rimosso live via DOM patch + retry → focus ancora errato → **h2 falsificata** (span NON è root cause). Hard-defer **8d-D** investigation strumentata (h1 drawer-trap re-grab o h3 mouse-no-focus). 0 file modificati, 0 commit.
- **CP3 §6.112** — lift `navInactive` token in `theme.js` per chiudere §6.108 (NavBar bottom contrast sub-AA-ui). Calcolo contrast WCAG inline (`Python relative luminance`): light `#A8A29E` (2.41:1) → `#888286` (3.60:1), dark `#4A4854` (2.05:1) → `#73686D` (3.43:1). Pattern weak-helper iOS-like preservato (gerarchia `subTabInactive` 5.27/5.50:1 > `navInactive` 3.43/3.60:1 > `navActive` 4.94/7.20:1 attivo). **Chiude §6.108**. 1 file, 9 ins / 1 del.
- **CP4 §6.113** — safety net `__pt.wipe()` in `devCheck.js`. Diagnosi-first ha rivelato che `__pt.wipe = wipeDatabase` (Console-accessible, no confirm) + `db.delete()` senza reload = root cause plausibile dell'incident §6.85 (toggle tema rapido post-wipe → `tema='light'` riscritto su DB ricreato, `nome_utente=''` mai più scritto). Skip strumentazione (diagnosi convergente). Fix: wrap `__pt.wipe` con `window.confirm` + `window.location.reload()` post-wipe. **Chiude §6.85** (archiviazione: anomalia non riprodotta in 30min, root cause plausibile bloccata da safety net, terzo timebox scaduto). 1 file, 22 ins / 1 del.
- **CP5 §6.114** — `onConsoleLog` filter in `vitest.config.js` per §6.84 test router warning persistenti (4 stderr emit ridotti a **0**, full suite 313/313 in 6.29s, no overhead). Workaround non-invasivo, no-op naturale al futuro upgrade `react-router-dom` 7.x. Alternative scartate: bisezione hang (costo), `act()` wrapper (rischio §6.100), upgrade RR7 (scope). **Chiude §6.84** (parte test router). 1 file, 16 ins.
- **5 nuove §6.110-§6.114** introdotte in §6 + 4 §6.NN chiuse (§6.96, §6.108, §6.85, §6.84) + 1 hard-defer 8d-D (§6.111 = §6.109 unresolved).
- **CP browser interleaved:** CP1.4 (5/5 punti, P5 non applicabile) + CP3.4 (4/4 punti) + CP4.4 (smoke 4/4). Vincolo §11 v2.5.34 "no CP §6.96 senza CP browser interleaved" rispettato.
- **Tempo effettivo:** ~80min vs vincolo §11 medio-alto stimato 4h+. Risparmio grazie a (D) shortcut §6.107, h2 falsification rapida §6.109 (~10min), diagnosi-grep convergente §6.85 (skip strumentazione), filter API noto §6.84.
- 4 commit Mac-side branch `step-8`: `0283567` CP1, `3406e33` CP3, `af147e0` CP4, `db30fae` CP5 (CP2 zero-commit).
- Nuova **§22.17** "Stato post-Sessione 8d-C impl" con file prodotti, esiti CP gate-by-gate, scoperte (h2 falsification, drift §6.69 pregresso v2.5.34, diagnosi grep > strumentazione live).
- Aggiornamento roadmap §7: nuova riga **8d-C ✅ Completo**, riga 8d-B parziale resta come record storico.
- Nessuna modifica a §12 (4 file codice toccati: `OggiView.jsx`, `theme.js`, `devCheck.js`, `vitest.config.js` — tutti già tracciati in §12).
- **§11 sostituita** con stub **Sessione 8d-D analisi-first** (scope: §6.111 investigation strumentata h1/h3 + eventuale fix `useModalA11y` pause/resume) **OPPURE** stub **Step 9 analisi-first** (notifiche locali + fix dominio §6.18 cross-midnight via §6.26) — decisione di Roberto in apertura prossima sessione.

**Changelog versione 2.5.36 (rispetto alla 2.5.35):**
- **Sessione 9 analisi-first** completata 26/04/2026: ratificate **10 AMB-9.A÷J** copertura completa Step 9 (Wave A fix dominio §6.18 cross-midnight + Wave B notifiche Opzione 1 foreground-only + Wave C closing). Modalità Q&A iterativa (Q1→Q10) con "decidi tu" da Q2 in poi.
- **Decisione strategica scope Step 9:** confermato **Opzione 1 foreground-only** (`setTimeout` main thread, no SW push, no backend Mac Mini) per consegna iPhone+Android senza server. Web Push backend-driven differito a **Fase 3 estesa post-Step 11** (~9-15 sessioni). TimestampTrigger Android non implementato per uniformità messaging iOS+Android (entrambi Opzione 1).
- **Wave A — Fix dominio §6.18 cross-midnight** (4 AMB):
  - **AMB-9.A** — `ora_ricalcolata` cambia tipo TIME → TEXT formato ISO `'YYYY-MM-DDTHH:MM'`, `ora_prevista` invariato (resta HH:MM, non va mai cross-midnight per costruzione).
  - **AMB-9.B** — stesso nome campo `ora_ricalcolata` (typeless Dexie su campo non-indexed), migration semplice predicato `length === 5` con self-heal cross-midnight legacy al prossimo `apply*`, no rollback automatico (`__pt.wipe()` come escape hatch §6.113).
  - **AMB-9.C** — `db.version(2).stores({...})` invariato + upgrade hook + dev-dep `fake-indexeddb` per test integrazione + grep gate `seed.js`/`devCheck.js` in apertura CP impl Wave A.
  - **AMB-9.D** — 3 helper monouso in `utils/time.js` (`composeIsoDateTime`, `addMinutesToIso`, `parseIsoDateTime`), `new Date(iso)` interno deterministico (DST documentato come limitazione nota fuori scope Step 9), tear-down §6.26 + nuovo helper `isEntryFutureDate(entry, todayDateStr)`. §6.18 e §6.26 chiuse contestualmente nel CP impl Wave A.
- **Wave B — Notifiche Opzione 1 foreground-only** (5 AMB):
  - **AMB-9.E** — `setTimeout` main thread, riuso `services/audio.js` (Sessione 7b-1) per beep simultaneo se app foreground, limitazioni note documentate in nuova §6.NN (no app chiusa, no recovery post-suspend, recovery via UI standing badge "in ritardo" Sessione 7c-1).
  - **AMB-9.F** — toggle esplicito in `ImpostazioniTab` (Sessione 8a), nuova chiave `impostazioni_app.notifiche_attive` boolean default 0 (analoga §6.25 `tema`), hook `useNotifications` con `{permission, enabled, isStandalone, requestEnable, disable}`, vincolo `display-mode: standalone` uniforme iOS+Android (no notifiche da browser, sempre PWA installata).
  - **AMB-9.G** — 8 trigger re-schedule (`init` / `commitApplyResult` / rollover / `cambiaProfilo` / Config thunks / toggle on / toggle off / `visibilitychange`+`focus`), window cap 12h, rolling re-schedule ogni 30 tick (~30min) integrato nel tick Provider esistente (§6.24).
  - **AMB-9.H** — singleton closure-private in `services/notifications.js` 7+1 metodi (`isSupported`/`getPermission`/`requestPermission`/`scheduleNotification`/`cancelNotification`/`cancelAll`/`showDoseNotification` + `getPendingCount` introspection), Map `pending: Map<entryKey, timeoutId>`, payload tag-based `dose-{farmaco_id}-{dose_numero}-{dateStr}` per OS replacement, click handler `window.focus()` + `window.location.href` (limite full-reload accettabile, migration cleanup Fase 3), funzione `rescheduleAllNotifications(state, services)` puro esportato chiamato da AppContext, test isolato con mock `globalThis.Notification` + `vi.useFakeTimers()`.
  - **AMB-9.I** — title `farmaco.nome`, body via nuovo helper `formatRelazionePastoCopy(farmaco)` in nuovo file `utils/copy.js` con fallback `"Promemoria farmaco"` se body vuoto (caso `indifferente` senza `dettaglio_pasto`), defensive `Notification.permission !== 'granted'` check (rileva revoche iOS post-subscribe), beep best-effort con catch silenzioso (DOMException AudioContext suspended), notifica sempre emessa (OS decide visibility: iOS sopprime in foreground tipicamente, Android heads-up).
- **Wave C — Closing** (1 AMB):
  - **AMB-9.J** — target test 313 → **360 ±5** (boundary 355–365), split upfront **9-A** (Wave A: dominio + migration, 4 CP impl + 1 CP browser) + **9-B** (Wave B: notifiche + UI, 5 CP impl + 1 CP browser), no adaptive split intra-sessione (lezione 8d).
- **§6.NN previste post-impl** (numerazione effettiva attribuita alla scrittura, in continuità con §6.114 ultima 8d-C):
  - §6.115 — `ora_ricalcolata` ISO datetime (chiude §6.18) — CP1+CP3 Wave A.
  - §6.116 — tear-down workaround §6.26 + helper `isEntryFutureDate` (chiude §6.26) — CP4 Wave A.
  - §6.117 — Dexie v1→v2 migration + dev-dep `fake-indexeddb` — CP2 Wave A.
  - §6.118 — chiave `impostazioni_app.notifiche_attive` (analoga §6.25 `tema`) — CP4 Wave B.
  - §6.119 — Opzione 1 foreground-only limitazioni note + roadmap Web Push Fase 3 estesa — Wave B globale.
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.36 (continuità principio fatto-storico immutabile, §6.71/§6.85 archive). Gap visibile come jump v2.5.33 → v2.5.35 → v2.5.36 nel sommario §1.
- **Aggiornamento roadmap §7:** Step 9 split in **9-A** ⏳ prossimo (Wave A dominio + migration) + **9-B** ⏳ (Wave B notifiche + UI, post-9-A).
- **Nuova §22.18** "Stato post-Sessione 9 analisi-first" con tabella AMB-9.A÷J, scope Wave A/B/C, deviazioni previste §6.115-§6.119, baseline test 313, target 360 ±5, raccomandazioni apertura 9-A.
- **§11 sostituita** con prompt esecutivo **Sessione 9-A** (CP0 sanity-light + CP1-CP4 Wave A dominio + CP browser 4 punti + bump intermedio v2.5.36 → v2.5.37 a chiusura 9-A; il §11 per Sessione 9-B verrà scritto in v2.5.37 dopo chiusura 9-A).
- Nessuna modifica al codice (analisi-first pura). Nessuna modifica a §12 (zero file prodotti). Nessuna modifica a §3 struttura progetto (file Step 9 nuovi `services/notifications.js`, `hooks/useNotifications.js`, `utils/copy.js` già marcati `[Step 9]` o assimilabili).
**Changelog versione 2.5.37 (rispetto alla 2.5.36):**
- Sessione **9-A implementativa** completata 26/04/2026 (Wave A — fix dominio §6.18 cross-midnight). 4 CP impl + CP browser 4 punti. Baseline test **313/313 → 328/328 su 32 test files** (+15, target AMB-9.J 313→329 ±3 a -1 dal centro). Bump v2.5.36 → v2.5.37.
- **CP1 §6.115a** — 3 helper ISO in `utils/time.js` (`composeIsoDateTime` / `addMinutesToIso` / `parseIsoDateTime`). +6 test in nuovo file `src/utils/time.test.js` (3 happy + 3 edge: cross-midnight, month-rollover, round-trip). Implementazione spec-conforme da §11 v2.5.36 (commit `d5248a0`).
- **CP2 §6.117** — Dexie `db.version(2).stores({...})` upgrade hook self-heal `length===5` HH:MM → ISO `'YYYY-MM-DDTHH:MM'`. Dev-dep `fake-indexeddb@^6` aggiunta. Nuovo file `src/data/db.migration.test.js` (+3 test: legacy convertito, ISO no-op, NULL preservato). 1 commit `d0d4e5e`.
- **CP3 §6.115b** — `recalc.js` `applyAssunzione`/`applySalto`/`autoSkip`/`applyRecupero` compongono `ora_ricalcolata` via `composeIsoDateTime + addMinutesToIso`. `planBuilder.js` `mergeLogIntoEntry` opaque ISO confermato (invariante §6.23 esteso). +6 test cross-midnight in `recalc.test.js` + 1 invariante `planBuilder.test.js`. 1 commit `d5de70f`.
- **CP4 §6.116** — tear-down workaround §6.26 `isCrossMidnightRecalc` HH:MM-heuristic. Prima iterazione introdotta `isEntryFutureDate(entry, todayDateStr)` con prop opzionale `todayDateStr` su `DoseCard` propagata da `OggiView` (§6.116a). **CP browser punto 2 ha rivelato semantica invertita** (badge fired su dose-naturali-domani, mancato caso §6.18 reale): commit fix §6.118 ha riscritto `isCrossMidnightRecalc` ISO-aware compare `parseIsoDateTime(entry.ora_ricalcolata).dateStr > entry.dateStr`, prop `todayDateStr` rimossa. 2 commit: `816a49f` (§6.116 prima iter) + `0e70a38` (§6.118 fix).
- **§6.116b** — consumer drift latente in `uiState.js` (`getCardState` + `groupEntriesByDayAndMomento`) e `OggiView` gap calc: chiamavano `timeToMinutes(entry.ora_ricalcolata)` direttamente, ma post-CP3 `ora_ricalcolata` è ISO. Fix: helper `effHHMM`/`entryHHMM` estraggono HH:MM via `parseIsoDateTime`. Bug latente catturato analizzando i file pre-CP4 (test passavano solo perché fixture ancora HH:MM).
- **§6.117a** — `types.js` JSDoc drift Q-CP3-2 differito da CP3: 3 occorrenze `ora_ricalcolata: 'HH:MM' or null` → `ISO datetime 'YYYY-MM-DDTHH:MM' or null` (LogAssunzione + PlanEntry × 2). sed surgical 2-comandi.
- **§6.118** — fix CP4-iteration ex-post (vedi sopra): `isCrossMidnightRecalc(entry)` ISO-aware (`parseIsoDateTime(ora_ricalcolata).dateStr > entry.dateStr`). Self-contained, no arg esterno. Revert §6.116a (`todayDateStr` prop e propagazione OggiView rimossi). CP browser punto 2 verde post-fix (card `2026-04-26-4-2` `has_orario_domani_badge: true`, card `2026-04-27-4-2` `false`).
- **§6.119 (deferred)** — bug visivo §6.18 sottostante NON chiuso: card cross-midnight resta sotto separator pill di OGGI invece di essere bumpata sotto separator DOMANI. Causa: `planBuilder.js` non bumpa `entry.dateStr` quando `ora_ricalcolata` cross-midnight; i due valori restano disallineati. Il badge §6.118 è UI mitigation, non fix completo. Scheduled post-9-A o 9-B.
- **§6.120 (deferred)** — `actions.presa(entryKey)` senza override `dataEffettiva/oraEffettiva` ignora `simulated_now` e usa l'ora reale di sistema. Scoperto in CP browser punto 1 (slider 08:00 ma recalc applicato +12h da ora reale). Workaround per test browser: passare override esplicito. Fix proprio scheduled post-9-A.
- **Drift numerazione vs §22.18 plan:** §6.115 single splittato in §6.115a (CP1) + §6.115b (CP3) durante impl. **§6.118 e §6.119 originariamente assegnati Wave B (notifiche_attive + Opzione 1 limitazioni) sono stati consumati da 9-A** (CP4-fix + deferred). Wave B 9-B userà **§6.121** (notifiche_attive) + **§6.122** (foreground-only limits) per coerenza fatto-storico (§6.71/§6.85 archive: numerazione non retrocorretta).
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.37 (continuità fatto-storico immutabile).
- **Aggiornamento roadmap §7:** Step 9-A → ✅ Completo. Step 9-B aggiornato con drift numerazione.
- **Nuova §22.19** "Stato post-Sessione 9-A implementativa" con file prodotti, esiti CP1-CP4, esiti CP browser 4 punti (P2 verde post-§6.118; P1 ambiguo per §6.120 pre-existing; P3 visivo OK; P4 retry-ambiguo, focus restore non fa parte scope CP4).
- **§11 sostituita** con prompt **Sessione 9-B analisi-first** (raccomandato vs esecutiva diretta dato lessons learned 9-A: spec semantics da rivalidare in browser, AMB-9.E÷I già ratificate ma edge cases iOS PWA permettono rifinitura).
- 5 file codice modificati (`utils/uiState.js`, `utils/uiState.test.js`, `components/oggi/DoseCard.jsx`, `components/oggi/DoseCard.test.jsx`, `components/oggi/OggiView.jsx`) + 1 file modificato in CP1 (`utils/time.js`, `utils/time.test.js` nuovo) + 2 modificati CP2 (`data/db.js`, `package.json`, `data/db.migration.test.js` nuovo) + 2 modificati CP3 (`domain/recalc.js`, `domain/planBuilder.js` confermato, test estesi) + 1 modificato CP4 docs (`domain/types.js`).

**Changelog versione 2.5.40-rc.4 (rispetto alla 2.5.40-rc.3):**
- **Sessione 9-C analisi-first** completata 30/04/2026. Investigazione strutturata di **§6.147** (plan cross-day 27 entries) e **§6.148** (§6.145 fix presente nel bundle ma non sanante runtime), entrambi rivelati da CP browser P1 di parte 6/6. Esito: **entrambi i bug chiusi senza fix code**. Baseline test invariata **375/375 su 36 test files** (analisi-first pura). Bump cosmetico v2.5.40-rc.3 → **v2.5.40-rc.4**.
- **§6.147 → CHIUSA by-design (AMB-9-C.A).** Verdetto immediato post-DIAG-1÷7: `state.plan` è multi-day per intentional design dal Step 5b-2 (`buildMultiDayPlan` §6.72, rehydration cross-day). `PLAN_DAYS_TOTAL=3` dichiarato esplicitamente in `domain/constants.js` (`PLAN_DAYS_BEFORE=1` + 1 + `PLAN_DAYS_AFTER=1`). 27 entries = 9 farmaci × 3 giorni, distribuzione corretta. `selectEntriesForDay(state, today)` filtra correttamente per `e.dateStr === today`; consumer notifiche/UI Oggi sono day-scoped via selettore. Nessun drift cronologico (DIAG-7: le costanti nascono già con valore 3, mai modificate). Zero codice toccato. Doc spec §3 update raccomandato in 9-D closing per documentare scope esplicito, non bloccante per release.
- **§6.148 → CHIUSA falso-positivo metodologico (AMB-9-C.B).** Verdetto via DIAG-RT-1 runtime test deterministico Chrome-side (IIFE async con `await` esplicito): `pending: 3 → 4 → 4` (before/afterAwait/after100ms). Il fix §6.145 propaga la sintetica al rescheduler in modo deterministico, senza race async. Spiegazione del falso positivo: protocollo CP browser parte 6/6 ha letto `__pt.notifications.getPendingCount()` su tick sincrona post-`scheduleTestDose(5)` (Promise pending non awaited), prima della microtask del thunk async. Il valore osservato `pending=3` era stale. 7 ipotesi root cause investigate (H-A÷H-G2): tutte escluse dal codice statico (DIAG-8÷20) e dal runtime test, tranne **H-G2** (Promise non awaited) confermata come spiegazione. Zero codice toccato.
- **§6.149 NUOVA — lessons-learned Console DevTools `await` mandatory.** Pattern operativo per CP browser: **mai leggere stato post-thunk async senza `await`**. `async function` ritorna sempre Promise pending; il check successivo digitato in Console su riga separata legge stato pre-microtask, contaminando la misurazione. Pattern corretto: IIFE async con `await` interno + `console.log` finale strutturato (es. JSON.stringify del bundle di osservazioni). Parallelo metodologico a §6.146 (canary-marker su commenti = inconcludente; `grep <identifier>` su bundle minified = invalido). Da formalizzare in §8 convenzioni come step di troubleshooting standard CP browser.
- **AMB-9-C congelate (2 totali):**
  - **AMB-9-C.A** §6.147 plan cross-day = intentional by-design (no fix code, doc spec §3 in 9-D closing)
  - **AMB-9-C.B** §6.148 §6.145 disconnect = falso positivo metodologico (no fix code, pattern §6.149 reusabile)
- **Decisione split implementativo:** dato che nessuno dei due bug richiede codice, **niente split 9-D + 9-E**. Sessione 9-D pianificata come **esecutiva snella** (singola sessione, ~15-20K token stimati): completamento CP browser P2-P5+P8 deferred di parte 6/6 + bump v2.5.40 definitivo + cleanup `.bak.*` (12 untracked) + chiusura formale §6.147+§6.148 nel changelog + doc spec §3 update per scope plan multi-day.
- **Stato baseline post-9-C:** 375/375 test invariati, top commit `35fed4d` invariato, bundle `dist/assets/index-Cd8Of8Q2.js` invariato. Nessuna modifica al codice (analisi-first pura). Nessuna modifica a §12 (zero file prodotti).
- **Pattern §6.118 reinforcement:** chiusura by-design / falso-positivo è coerente con regola critica #2 (fermarsi su incongruenze, non inventare fix). Sessione 9-C ha esercitato il pattern senza scorciatoie: 7 ipotesi indagate prima di chiudere, runtime test deterministico richiesto per dirimere H-G2 vs altre.
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.40-rc.4 (continuità fatto-storico immutabile, §6.71/§6.85 archive).
- **Aggiornamento roadmap §7 row 9-B:** post-`parte 6/6 parziale (§6.146 sbloccato, §6.147+§6.148 nuovi)` → `+ Sessione 9-C analisi-first ✅ chiude §6.147 by-design + §6.148 falso-positivo + §6.149 nuova; CP browser P2-P5+P8 + bump v2.5.40 deferred Sessione 9-D esecutiva snella`.
- **§11 sostituita** con prompt esecutivo **Sessione 9-D esecutiva snella** (CP0 sanity-light + CP browser P2-P5+P8 + closing chiusure §6.147/§6.148/§6.149 + doc spec §3 update + bump v2.5.40 + cleanup `.bak.*`). 9-D è una sessione browser-heavy / no-code-heavy.
- **Nuova §22.25** "Stato post-Sessione 9-C analisi-first" con dataset diagnostico (DIAG-1÷20 + DIAG-RT-1), tabella ipotesi H-A÷H-G2, tabella AMB-9-C, decisione no-split, scope 9-D dettagliato.
- Nessuna modifica a §3 struttura progetto. Nessun nuovo file in §12.

**Changelog versione 2.5.40-rc.1 (rispetto alla 2.5.40-rc):**
- **Sessione 9-B parte 4/4 esecutiva** completata 27/04/2026 con esito **misto**. Setup PWA install ✅, hotfix latente §6.138 ✅ (commit `fada4a6` figlio di `f856b46`, 371/371 test), CP browser P1-P5+P8 ❌ **bloccati su limitazione architetturale**. Decisione: **split a Sessione 9-B parte 5/5** dedicata (regola critica #5).
- Bump intermedio v2.5.40-rc → **v2.5.40-rc.1** (release candidate progressiva, NO bump definitivo a v2.5.40 fino a CP browser parte 5/5 verde).
- **§6.136 (closed)** — gate `if (!import.meta.env.DEV) return` in `AppContext.jsx:194` rimosso temporaneamente per esporre `__pt.notifications` in build production (necessario per tooling CP browser; il build prod stock non espone `__pt`). Patch applicata + revertata in stessa sessione (working tree pulito post-Step 21a). Pattern preservato per parte 5/5 ma da rieseguire ad-hoc (NON committato).
- **§6.137 (closed)** — icone PWA placeholder 1×1 px (pre-esistenti, stub) sostituite con 3 PNG validi (192/512/512 con "P" stilizzata su `#15141A` theme_color, generati via Pillow nel sandbox + installer self-extracting bit-perfect SHA-1). Necessario per sbloccare Chrome "Install page as app". Patch applicata + revertata in stessa sessione (icone originali stub ripristinate via `.bak.cp-browser`).
- **§6.138 (committed `fada4a6`)** — bug latente in `services/notifications.js`: `rescheduleAllNotifications` leggeva `entry.farmaco_id` flat e `showDoseNotification` leggeva `entry.dose_numero` flat, ma il canonical shape della plan entry (verificato runtime in PWA standalone via `__pt.app.getState().plan[10]`) annida entrambi sotto `entry.orario`. Fix: `entry.orario?.farmaco_id` + `entry.orario?.dose_numero`. CP4 §6.128 era incompleto (correggeva il dict-access bug ma non il path mismatch). 13 fixture allineate in `notifications.test.js` (11 single-line + 2 multi-line) + 1 fixture `AppContext.test.jsx`. Test 371/371 verde (Δ=0, fixture aligned in-place). **Validato unit, NON validato runtime** (P1 deferred per §6.141).
- **§6.139 (deferred Wave-C)** — drift implementativo §6.133: la SezioneNotifiche di `ImpostazioniTab.jsx` rende lo stato `granted-on` come **button rettangolare grigio** (sembra disabilitato) anziché slider toggle 4-state come AMB-9.F' literal letterale prevedeva. Il prompt OS Chrome appare e il dispatch `notifiche_attive=1` funziona, ma l'affordance visiva è ambigua. UX da raffinare in Wave-C o sessione polish dedicata.
- **§6.140 (deferred Wave-C)** — `actions.init()` non re-arma `rescheduleAllNotifications` al boot anche se `permission==='granted'` e `notifiche_attive===1` persistito. Forced reschedule manuale da Console funziona, ma init silente lascia `pending: 0` al cold start del browser. Probabilmente trigger 1 (init) gating su qualche pre-condizione non verificata (es. `services` non ancora iniettato nel context al primo dispatch). Da investigare in parte 5/5 oppure Wave-C.
- **§6.141 (architecture, parte 5/5 blocker)** — **`simulatedNow` NON propaga ai `setTimeout` del singleton notifications**. Il filtro `delay = fireAt - Date.now()` in `scheduleNotification` usa **wall clock OS** (non resolveNow). Conseguenza: P1-P5 NON testabili a wall clock 21:00+ con piano demo statico (orari 07:00-20:30 tutti passati). Workaround possibili per parte 5/5: (a) `actions.scheduleTestDose(minutesFromNow)` thunk dedicato, (b) farmaco demo dinamico con `ora_prevista` 5 min reali nel futuro, (c) accettare CP browser eseguibile **solo nella finestra giornaliera 06:30-20:30** con istruzioni operative tempo-vincolate. Lascio scelta a sessione 9-B parte 5/5 analisi-first.
- **§7 row 9-B** aggiornata: `Impl 4/5 ✅, CP browser deferred a parte 4/4` → `Impl 5/5 ✅ + hotfix §6.138, CP browser deferred a parte 5/5 per §6.141`. Aggiunto rif a `fada4a6` (hotfix).
- **§11 sostituita** con prompt **Sessione 9-B parte 5/5 analisi-first** (raccomandata vs esecutiva diretta dato §6.141 architecture blocker richiede design pre-codice del workaround test-dose; CP browser P1-P5+P8 + CP6 closing definitivo).
- **Nuova §22.23** "Stato post-Sessione 9-B parte 4/4 esecutiva (misto)" con scoperte runtime, esito CP browser, deviazioni introdotte, blockers identificati, hand-off a parte 5/5.
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.40-rc.1 (continuità fatto-storico immutabile).

**Changelog versione 2.5.40-rc (rispetto alla 2.5.39):**
- **Sessione 9-B parte 2/2 implementativa** completata 27/04/2026 (CP4 AppContext wiring) e **Sessione 9-B parte 3/3 implementativa** stessa giornata (CP5 ImpostazioniTab UI). Entrambe portate al delivery 357/357 → 367/367 → **371/371** test su 35 test files. CP browser 8 punti deferred a Sessione 9-B parte 4/4 esecutiva (per dimensionamento sessione, regola critica #5).
- Bump intermedio v2.5.39 → **v2.5.40-rc** (release candidate, NO bump definitivo a v2.5.40 fino a chiusura CP browser parte 4/4 + verde end-to-end).
- **CP4 §6.125-§6.132** (parte 2/2) — wiring `AppContext.jsx` + `actions.js` + 8 trigger reschedule. 8 deviazioni introdotte e già implementate (top commit `530e983`):
  - **§6.125** alias `useApp = useAppContext` (CP3 backward compat)
  - **§6.126** services injection retrofit (`createActions(repo, services)` + context value `{state, actions, services, tickMs}` + `__pt.notifications` window debug)
  - **§6.127** `rescheduleAllNotifications` usa `selectEntriesForDay(state, selectToday(state))` (was: `state.pianoOggi || []` provvisorio CP2 Q-CP2.6 risolto)
  - **§6.128** lookup farmaco via `selectFarmacoById` (was: `state.farmaci[id]` dict access bug — `state.farmaci` è array, non dict)
  - **§6.129** `SETTINGS_KEYS.NOTIFICHE_ATTIVE` no schema bump Dexie, default off via missing-key (`selectImpostazione` ritorna `undefined` ⇒ `enabled=false` per AMB-9.F')
  - **§6.130** rolling-30-tick safety net (mitigazione iOS PWA `setTimeout` suspend dopo 30s in background — re-arm idempotente nel tick `useEffect` Provider)
  - **§6.131** Δ test +10 effettivi (5 pure `notifications.test.js` + 5 wiring `AppContext.test.jsx`) vs 5 stimati in §22.20 (boundary AMB-9.J alta assorbe)
  - **§6.132** bypass `maybeReschedule` gate in `setSetting` toggle-on (stateRef-lag dopo optimistic dispatch — il reschedule deve usare il nuovo state, non lo stateRef stale; bug reale in produzione, non solo in test)
- **CP5 §6.133-§6.134** (parte 3/3) — `ImpostazioniTab.jsx` SezioneNotifiche 4-state + 4° campo `Notifiche pendenti` in SezioneAvanzate. Δ test +4 (367 → 371). Top commit `93c3d21` (post-amend, vedi §6.135). 2 deviazioni:
  - **§6.133** drift terminologico §11 prompt vs AMB-9.F' literal §22.20 — il prompt §11 usava enum `{not-supported, denied, granted-off, granted-on}`; l'API reale di `useNotifications` (CP3 §6.123) espone `(isStandalone, permission, enabled)`. UI implementata segue AMB-9.F' literal (fonte autoritativa). `not-supported` collassato su `permission='denied'` da `readPermission` early-return. Documentato qui per ricerca grep futura: la nomenclatura AMB-9.F' è quella vincolante.
  - **§6.134** pattern test `mock-collaborator` per `vi.mock('../../hooks/useNotifications.js')` in `ImpostazioniTab.test.jsx`. Alternativa scartata: estendere `renderHelpers.jsx` per iniettare `services` nel context value (richiesta ~15 LOC + tocco di 13 callers esistenti). Pattern mock-collaborator è già stabilito in `useNotifications.test.jsx` parte 1/2 (mock di `useApp`); replica naturale per UI test che consumano hook custom.
- **§6.135** (delivery infra) — pattern installer self-extracting con backup `.bak.cpN`. L'installer crea automaticamente backup su disco prima di sovrascrivere file esistenti (rollback rapido locale). I `.bak.cpN` NON sono tracked (`.gitignore` ha pattern `*.bak`). Pattern emerso in CP5 9-B parte 3/3 quando l'amend del primo commit ha dovuto espungere i `.bak.cp5` finiti in stage per default. Convenzione formalizzata: i backup sopravvivono alla sessione per sicurezza, vengono eliminati manualmente quando non più rilevanti (es. al passaggio a sessione successiva).
- **Sandbox vitest pre-delivery** (CP5): pattern §22.21 confermato — sandbox `/home/claude/sandbox` con vitest 2.1.9 + happy-dom, validazione 13/13 verdi prima dell'emissione installer. SHA-1 hash sandbox = SHA-1 post-install Mac (`9fc992bc...` jsx, `ff7f5b10...` test) = bit-perfect delivery.
- **CP browser 8 punti deferred a Sessione 9-B parte 4/4** — dimensionamento regola critica #5: P1-P5 obbligatori + P6-P8 raccomandati richiedono ~30-40min di esecuzione browser ininterrotta, mal compatibile con Q&A asincrono nella stessa sessione di parte 3/3. Decisione: parte 4/4 dedicata, sessione fresh con context pulito per checklist procedurale browser-side.
- **Decisione raccomandata CP browser parte 4/4:** P1-P5 obbligatori + P8 (tag-based replacement, OS-specific). P6 (revocation defensive) e P7 (non-PWA fallback) coperti da unit test (`useNotifications.test.jsx` test #1 `!isStandalone` + test #6 defensive revocation on mount), skip browser ridondante. Device: Chrome PWA Mac soltanto, iPhone PWA defer a Wave C se emergono regressioni iOS-specifiche.
- **Nuova §22.22** "Stato post-Sessione 9-B parte 2/2 + parte 3/3 implementativa (CP browser deferred)" con dettaglio CP4-CP5, top commit `93c3d21`, 371/371 test, 8+2+1 deviazioni §6.125-§6.135.
- **§11 sostituita** con prompt esecutivo **Sessione 9-B parte 4/4 esecutiva** (CP browser 6 punti + CP6 finale + bump definitivo v2.5.40-rc → v2.5.40).
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.40-rc (continuità fatto-storico immutabile).

**Changelog versione 2.5.39 (rispetto alla 2.5.38):**
- **Sessione 9-B parte 1/2 implementativa** completata 27/04/2026. Eseguiti **CP1+CP2+CP3** della Sessione 9-B esecutiva (split parte 1/2 vs piano §22.20 originale a 5 CP unica). 357/357 test su 35 test files (Δ +29: +13 CP1 + +10 CP2 + +6 CP3, in linea con target per checkpoint). Bump v2.5.38 → v2.5.39.
- **CP1 §6.124** — `src/utils/copy.js` + `src/utils/copy.test.js` nuovi. Helper `formatRelazionePastoCopy(farmaco)` body stripped (drift voluto vs `DoseCard.getPastoText`). Decisioni pre-codice Q-CP1.1=A (`indifferente` → `null` sempre, detail ignorato), Q-CP1.2=C (enum sconosciuto → `null` defensive), Q-CP1.3=ok (slice "Assumere " 9 char). 13 test verdi. Commit `f7ab6d5`.
- **CP2 AMB-9.H** — `src/services/notifications.js` + `src/services/notifications.test.js`. Factory `createNotificationsService()` + singleton `notifications`, 7+1 metodi, Map `pending`, tag-based replacement implicito, click handler `/oggi`, defensive permission check al fire. `rescheduleAllNotifications(state, services)` puro esportato (test deferito a CP4 via AppContext.test.jsx). Decisioni pre-codice Q-CP2.1=signature confermata, Q-CP2.2=A (`/oggi`), Q-CP2.3=A (no-op silenzioso fireAt passato), Q-CP2.4=A (check al fire), Q-CP2.5=A (beep delegato a useAutoBeep esterno), Q-CP2.6=A (`state.pianoOggi || []` provvisorio, da confermare CP4). 10 test verdi. Commit `fd2ab9a`.
- **CP3 §6.123** — `src/hooks/useNotifications.js` + `src/hooks/useNotifications.test.jsx`. Decision tree 4 stati implementato, defensive revocation check on mount + `visibilitychange`. Decisioni pre-codice Q-CP3.1=`useApp()` espone `services.notifications`/`actions.setSetting` (provvisorio, da confermare CP4), Q-CP3.2=`matchMedia` + `navigator.standalone` fallback, Q-CP3.3=throw `'permission_denied'`/`'not_standalone'`, Q-CP3.4=disable noop se non-standalone/denied, Q-CP3.5=revocation on mount + visibilitychange. 6 test verdi. Commit `c158496`.
- **2 stub orfani scoperti durante install** (CP2 e CP3): `services/notifications.js` e `hooks/useNotifications.js` esistevano come stub di 2 righe da sessione precedente non documentata. Installer ha sovrascritto correttamente. Da formalizzare come §6.NN al CP6 closing parte 2/2.
- **Pattern §6.118 internalizzato in tutti i CP**: ogni CP ha sezione "Pre-codice" con 2-3 scenari concreti + tabella ambiguità Q-CP_N.M con default raccomandati esplicitati e confermati prima della scrittura. Costo metodologico ~5min/CP, beneficio: zero fix ex-post analoghi a §6.118.
- **Sandbox testing pattern** introdotto in CP2/CP3: prima di emettere installer, vitest 2.1.9 + happy-dom in sandbox `/home/claude/sandbox` per validare la suite mirata. Catch errori di mocking pattern e syntax pre-delivery. Da formalizzare come §6.NN al CP6 closing parte 2/2.
- **Decisione split sessione**: dopo CP3 verde, sessione chiusa con ~6.5K token consumati per preservare context fresco per CP4 (modifica `AppContext.jsx` esistente, 8 trigger reschedule, listener visibility/focus, ~15 LOC + 5 test). Pattern coerente con principle §6.79 / Sessione 7d-2 split.
- **Nuova §22.21** "Stato post-Sessione 9-B parte 1/2 implementativa" con dettaglio CP1-CP3, top commit `c158496`, 357/357 test, 2 stub orfani, decisioni pre-codice congelate per CP4-CP5.
- **§11 sostituita** con prompt esecutivo **Sessione 9-B parte 2/2 esecutiva** (CP4 AppContext + CP5 ImpostazioniTab + CP browser 8 punti + CP6 closing bump v2.5.39 → v2.5.40).
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.39 (continuità fatto-storico immutabile).

**Changelog versione 2.5.38 (rispetto alla 2.5.37):**
- **Sessione 9-B analisi-first** completata 26/04/2026 (Wave B notifiche Opzione 1 foreground-only). Q&A pattern Q1-Q5 (Q1-Q3 raccomandazioni esplicite su AMB-9.E/F/G, Q4-Q5 "decidi tu" su AMB-9.H/I) per rivalidare le 5 AMB già ratificate in §22.18 contro lessons learned 9-A (spec semantics §6.118 + pre-existing browser bug §6.119/§6.120). Baseline test invariata **328/328 su 32 test files** (analisi-first pura). Bump v2.5.37 → v2.5.38.
- **5 AMB-9.E÷I confermate con 4 emendamenti:**
  - **AMB-9.E'** — `rescheduleAllNotifications(state, services)` **sincrona idempotente**, no debounce. Visibility flip rapido foreground→background→foreground produce N reschedules consecutivi senza leak (cancel-then-rebuild atomico, JS single-threaded). Alternative debounce 200ms / lock booleano scartate per complessità senza beneficio.
  - **AMB-9.F'** — Decision tree UI **4 stati esplicito** (`isStandalone × permission`): (1) `!isStandalone` → toggle nascosto + banner installa; (2) `standalone+default` → toggle off, tap requestPermission; (3) `standalone+granted` → toggle abilitato gating `notifiche_attive`; (4) `standalone+denied` → toggle disabilitato + banner. Defensive permission revocation check su mount + visibilitychange forza `notifiche_attive=0` se OS revoca.
  - **AMB-9.G'** — 8 trigger **nominati** (no più "Config thunks" generico): `init` / `commitApplyResult` / rollover mezzanotte / `cambiaProfilo` / **7 thunks rilevanti** (`add/update/deleteFarmaco`, `add/update/delete/attivaProfilo`) / toggle on / toggle off / `visibilitychange`+`focus`. `setSetting('notifiche_attive')` ha path dedicato (toggle on/off); `setSetting('tema')` e altre chiavi NON triggerano. Rolling 30 tick integrato in `useEffect` tick Provider §6.24.
  - **AMB-9.I'** — body `formatRelazionePastoCopy` **stripped del prefisso "Assumere "** rispetto a `DoseCard.getPastoText` (drift voluto §6.124, copy nuda suona meglio in notifica). 13 test: 6 enum × {detail, null} + 1 fallback body vuoto.
  - **AMB-9.H** invariata (test mocking `globalThis.Notification` + `vi.useFakeTimers()`, pattern replicato da `audio.js` test Sessione 7b-1).
- **4 deviazioni §6.121-§6.124 previste post-impl** (numerazione corretta post-9-A consumption §6.118-§6.120):
  - §6.121 — chiave `impostazioni_app.notifiche_attive` boolean default 0 (analoga §6.25 `tema`) — CP4 9-B
  - §6.122 — Opzione 1 foreground-only limitazioni note + roadmap Web Push Fase 3 estesa — Wave B globale
  - §6.123 — `useNotifications` decision tree 4 stati + defensive permission revocation check — CP3 9-B
  - §6.124 — `formatRelazionePastoCopy` body stripped (drift voluto UX notifica) — CP1 9-B
- **Tabella CP impl 9-B (5 CP):** CP1 §6.124 utils/copy.js (+13 test), CP2 services/notifications.js singleton (+10), CP3 §6.123 hooks/useNotifications.js (+6), CP4 §6.121+§6.122 integration AppContext (+5), CP5 ImpostazioniTab.jsx UI (+4). Δ test totale +38, target AMB-9.J 9-B split +31 (centro 313+47=360 ±5; 9-A actual +15; 9-B target +32; +38 dentro boundary alta).
- **CP browser 9-B 8 punti** (lesson §6.118 non-skippable pre-bump): permission flow, schedule/cancel cycle, rollover overnight, beep simultaneity, visibility change, permission revocation defensive, non-PWA fallback, tag-based replacement.
- **Pattern §6.118 internalizzato** in CP1/CP2/CP3/CP4: validare 2-3 scenari concreti del codice contro AMB pre-codice, non trust letterale del prompt §11.
- **Drift §6.69 v2.5.34 NON retrocorretto** in v2.5.38 (continuità fatto-storico immutabile).
- **Aggiornamento roadmap §7:** Step 9-B aggiornato con riferimento §22.20 + scope CP1-CP5 dettagliato.
- **Nuova §22.20** "Stato post-Sessione 9-B analisi-first" con tabella AMB-9.E÷I confermate + emendamenti E'/F'/G'/I', tabella deviazioni §6.121-§6.124, tabella CP impl 5 CP con file/test/commit, 8 punti CP browser, Q&A pattern Q1-Q5 utilizzato.
- **§11 sostituita** con prompt esecutivo **Sessione 9-B esecutiva** (5 CP impl + CP browser 8 punti + CP6 closing bump v2.5.38 → v2.5.39).
- Nessuna modifica al codice (analisi-first pura). Nessuna modifica a §12 (zero file prodotti). Nessuna modifica a §3 struttura progetto (file `services/notifications.js`, `hooks/useNotifications.js`, `utils/copy.js` già marcati `[Step 9]` o assimilabili).


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
- `tema` — enum `'auto'|'light'|'dark'`, default `'auto'` via `?? 'auto'` (nessuna migrazione Dexie). Letta da `useTheme` (Sessione 7a, read-only). Scritta da toggle UI in Sessione 7b via `setSetting('tema', v)`. Vedi §6.25.

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

### 6.24 `visibilitychange` aggiorna anche `tickMs` (Sessione 6, AMB-6.K)

**Contesto:** AMB-6.B in §11 v2.5.3 prevedeva che il rollover detect riusasse il timer unico del Provider, con invocazione "al tick + al visibilitychange". La lettera di AMB-6.B faceva riferimento solo al rollover check. AMB-6.E definiva `tickMs` come sorgente di re-render per i consumer di `useNow`, aggiornato dal `setInterval(TICK_INTERVAL_MS)`.

**Problema:** un'app in background per minuti/ore, al ritorno in foreground avrebbe `tickMs` stale fino al prossimo tick regolare. I consumer di `useNow` (Step 7: header clock, countdown, stato "in ritardo") avrebbero mostrato valori di `resolveNow` non aggiornati per fino a 60s dopo il ritorno.

**Decisione:** l'handler `visibilitychange` invoca la stessa funzione `tick()` che gira dal `setInterval`, la quale fa **entrambi**: `setTickMs(Date.now())` e rollover check. Ritornare da background riallinea immediatamente sia il calendario sia la lettura dell'HH:MM.

**Impatto:** nessuno sui test (0 test su AppContext per §13/D13 invariato). Effetto percepibile solo in Step 7 (consumer reali di `useNow`).

**Motivazione formale della deviazione:** coerenza UI > aderenza letterale. AMB-6.B diceva "stesso timer", ma limitare il visibilitychange al solo rollover check avrebbe reso `tickMs` asimmetrico (aggiornato da interval ma non dall'event). Il codice commentato esplicitamente in `AppContext.jsx` dichiara l'intent ("The same handler runs on visibilitychange so that returning from background re-aligns both tickMs and the rollover check").

### 6.25 Nuova chiave `impostazioni_app.tema` (Sessione 7a, AMB-7a.C)

Aggiunta al §4 schema locale (Chiavi di `impostazioni_app`).

**Schema:**
- Chiave: `tema`
- Valori ammessi: `'auto' | 'light' | 'dark'`
- Default: `'auto'` (ottenuto via `?? 'auto'` nel `useTheme`, nessuna migrazione Dexie richiesta)

**Semantica:**
- `'auto'` — il tema segue `window.matchMedia('(prefers-color-scheme: dark)')` dinamicamente
- `'light'` | `'dark'` — tema forzato, ignora matchMedia

**Lettura (Sessione 7a):** `useTheme` hook in `src/hooks/useTheme.js` compone `state.impostazioni.tema ?? 'auto'` con matchMedia e restituisce `{dark, tokens, mode}`. Read-only in 7a.

**Scrittura (Sessione 7b):** toggle UI nell'Header cicla `auto → light → dark → auto` via `actions.setSetting('tema', v)` (thunk già esistente da Sessione 5b-2).

**Impatto backend futuro:** quando arriverà MariaDB (§6.1), la chiave `tema` entrerà nella tabella `impostazioni_app` senza modifiche allo schema.

### 6.26 Workaround UI per §6.18 cross-midnight (Sessione 7a, AMB-7a.B)

§6.18 documenta che `applyAssunzione`/`applySalto` possono produrre `ora_ricalcolata` HH:MM mod 1440 mantenendo `entry.dateStr` del giorno originale, causando rendering della dose al posto sbagliato nella timeline (es. farmaco 8h, dose 2 presa alle 23:00 → dose 3 ricalcolata a `'07:00'` su `dateStr='oggi'` invece che `dateStr='domani'`).

**Fix dominio stimato:** 50-100 righe in `recalc.js` + test di regressione (~10-15) + migrazione schema Dexie (nuovo campo `dateStr_ricalcolata` nullable o cambio tipo `ora_ricalcolata` a DATETIME stringa `YYYY-MM-DDTHH:MM`) + propagazione in `applyAssunzione`/`applySalto`/`annullaAssunzione`/`applyRipristino`/`autoSkip`/`mergeLogIntoEntry`/selectors. Fuori scope Step 7.

**Scelta Sessione 7a:** detector puro `isCrossMidnightRecalc(entry)` in `utils/uiState.js`:

```
true se entry.ora_ricalcolata != null
     AND timeToMinutes(entry.ora_ricalcolata) < timeToMinutes(entry.ora_prevista) - 60
```

Quando `true`, la Card (Sessione 7b) mostrerà badge "⚠ orario: domani" accanto al time display. Il dominio resta inalterato.

**Fix dominio rimandato a Step 9 (Notifiche):** lo scheduler `Notification API` richiede comunque rappresentazione DATETIME per calcolare l'offset di `setTimeout`/`scheduler.postTask` dal `Date.now()` corrente. Il refactor temporale ha lì il suo consumer naturale.

**Motivazioni del rinvio:**
- Evita refactor dominio senza consumer reale per 2 sessioni (rischio di correzioni retroattive quando Step 9 espone scenari non considerati)
- Evita duplicazione della logica temporale tra 7-pre e Step 9
- Comportamento UI con workaround è coerente con mockup v5 approvato (non regressione)

**Invariante da mantenere fino a Step 9:** `log_assunzioni.data` riflette sempre il giorno effettivo della presa (deriva da `now.dateStr` nel thunk `presa`). Solo la rappresentazione in-memory del piano è affetta dal bug, non i dati persistiti. La `ora_ricalcolata` salvata nel log è una stringa HH:MM già modulata; la sua interpretazione temporale corretta verrà ricostruita in Step 9 dal fix dominio in retrocompatibilità (o con una migrazione dati singola se necessario).

### 6.27 `state.impostazioni` dict generico (Sessione 7a, AMB-7a.M)

**Contesto:** AMB-7a.C (v2.5.5) prescriveva a `useTheme` di leggere `state.impostazioni.tema ?? 'auto'`. Il sanity check all'apertura di Sessione 7a ha rivelato che `state.impostazioni` **non esisteva**: lo state aveva solo `nomeUtente` come mirror diretto di `impostazioni_app.nome_utente`, e `init()` caricava esclusivamente `repo.getSetting('nome_utente')` con `Promise.all`. `useTheme` non aveva substrato state su cui comporre `mode`.

**Scelta (Opzione 1):** introdurre un dict generico `state.impostazioni: Record<string, any>`, popolato all'init da tutte le settings presenti nel DB, e leggibile via nuovo selector `selectImpostazione(state, chiave)`.

**Modifiche al reducer (`src/state/reducer.js`):**
- `initialState.impostazioni = {}` aggiunto
- `INIT_SUCCESS` payload esteso con `impostazioni` (fallback `{}`)
- Nuovo case `SET_IMPOSTAZIONE` payload `{chiave, valore}` → spread-merge su `state.impostazioni[chiave]`
- `nomeUtente` mantenuto come mirror legacy per retrocompatibilità (nessun refactor dei test esistenti)

**Modifiche a `actions.js`:**
- `init()` chiama `repo.getAllSettings()` (metodo già esistente dal contratto IRepository, sez. 5) e normalizza il risultato in dict via helper `normaliseSettingsDict` (gestisce sia Array\<{chiave, valore}\> sia oggetto dict)
- `nomeUtente` estratto da `impostazioni.nome_utente ?? ''` (single source of truth: il dict)
- `setSetting(chiave, valore)`: flow ottimistico semplificato — dispatch `SET_IMPOSTAZIONE` sempre, + dispatch `SET_NOME_UTENTE` solo per `chiave === 'nome_utente'` (mantenimento del mirror legacy). Rollback su errore repo ripristina entrambe le sorgenti

**Nuovo selector (`src/state/selectors.js`):**
- `selectImpostazione(state, chiave)` — ritorna `state.impostazioni?.[chiave] ?? null` (null esplicito, non `undefined`)

**Impatto sui test:** `SET_IMPOSTAZIONE` aggiunto come nuovo test in `reducer.test.js` (+1 → 25 test reducer). I 24 test esistenti non sono stati toccati: l'aggiunta di `impostazioni: {}` all'`initialState` e di un nuovo case al `reducer` sono compatibili con le assertion esistenti (verificate implicitamente dal passaggio 120→148 verde).

**Impatto backend futuro:** quando arriverà MariaDB (§6.1), la tabella `impostazioni_app` verrà letta come-è; il mapping dict è puramente lato client.

**Alternative scartate:**
- *Opzione 2 (split 7a-0 + 7a-1):* rinviata per rispetto della "qualità del codice sul numero di sessioni" (§2.5.5). Il costo dell'Opzione 1 è contenuto (~35 righe tra reducer e actions)
- *Opzione 3 (useTheme ignora persistenza in 7a):* invaliderebbe AMB-7a.C e ridurrebbe a 1 il numero di test `useTheme` significativi (solo `mode='auto'`). Scartata per coverage

### 6.28 Rename chiavi `theme.js` al naming femminile (Sessione 7b-1, AMB-7b.C)

Il mockup v5 (righe 202-304, portato 1:1 in `createThemeTokens`) usa chiavi maschili per i dict `cardBg` e `cardBorder`: `{preso, prossimo, attesa, saltata, sospesa, scaduta}`. `getCardState` (uiState.js, Sessione 7a) segue spec §5.3 e restituisce enum femminile: `{presa, prossima, in_attesa, in_ritardo, saltata, sospesa}`.

**Mismatch silenzioso:** il lookup `t.cardBg[state]` in Card cade sempre sul fallback `|| t.cardBg.attesa`, facendo apparire visivamente "in attesa" qualunque dose anche se presa/saltata/etc. Regressione grave non rilevabile da unit test della foundation 7a (nessun test indicizza questi dict internamente).

**Fix in Sessione 7b-1:** rename atomico in `theme.js`:
- `cardBg`: `preso→presa`, `prossimo→prossima`, `attesa→in_attesa`, `scaduta→in_ritardo` (saltata/sospesa invariati)
- `cardBorder`: stessi rename
- Token globali: `scadutaBg/Tx/Bd → inRitardoBg/Tx/Bd` per coerenza enum (consumer: counter "in ritardo" in OggiView header, badge Card)

**Impatto:** unico consumer attuale dei token rinominati è il mockup Card (non ancora portato in 7a). Nessun test 7a tocca questi dict internamente, quindi il rename non rompe la baseline 151.

### 6.29 Raggruppamento orario ibrido (Sessione 7b-1, AMB-7b.B)

Spec §5.4 prescrive raggruppamento per fascia con etichette "ORE 10:00 — COLAZIONE" derivate da `orari_base.descrizione_momento`. Mockup v5 (righe 1283-1297, 1420-1453) raggruppa solo per `dateStr`, con gap visivo +12px quando `thisTime !== prevTime`. Due posizioni inconciliabili.

**Scelta in Sessione 7b-1: ibrido.**
- Raggruppamento primario: per `dateStr` (come mockup) con separatore data.
- All'interno del giorno, **etichetta fascia solo quando `descrizione_momento` cambia** rispetto all'entry precedente (ordinata per ora effettiva). Formato etichetta: `ORE HH:MM — DESCRIZIONE_MOMENTO` dove HH:MM è la prima ora del gruppo, DESCRIZIONE_MOMENTO è uppercase.
- All'interno di uno stesso `descrizione_momento`, gap visivo +12px su cambio orario (fedele al mockup).

**Motivazione:** etichetta su ogni cambio orario (opzione 2) produce etichette ridondanti per dosi nella stessa fascia ("ORE 08:00 — colazione" + "ORE 08:30 — colazione"); porting mockup 1:1 (opzione 1) rinuncia alla spec. L'ibrido aderisce a §5.4 con densità visiva accettabile.

**Implementazione:** helper puro `groupEntriesByDayAndMomento(entries)` in `uiState.js`. Output: `[{dateStr, groups: [{descrizioneMomento, primaOra, entries[]}]}]`. Testabile in isolamento (+5 test stimati).

### 6.30 Toggle tema a 3 icone distinte mode-driven (Sessione 7b-1, estensione AMB-7b.K)

**Scoperta CP5 punto 4 (validazione visuale Sessione 7b-1).** Il mockup v5 aveva un toggle binario `dark on/off` con icona scelta in base al flag `dark` effettivo (`moon` se dark, `sun` altrimenti). L'estensione AMB-7b.K ha introdotto un ciclo a 3 stati (`auto → dark → light → auto`) ma ha preservato la logica `icon = dark ? moon : sun`. Conseguenza:

| mode | OS preference | dark effettivo | icona mostrata |
|---|---|---|---|
| `auto` | dark | true | moon |
| `dark` | (ignorato) | true | moon |
| `auto` | light | false | sun |
| `light` | (ignorato) | false | sun |

Due coppie di stati indistinguibili visualmente → l'utente non sa mai se sta forzando un tema o seguendo l'OS. Un singolo test visivo lo ha rivelato subito in CP5: 3 click in sequenza mostrano solo 2 icone.

**Fix applicato.** Icona `mode`-driven (non più `dark`-driven):
- `mode='auto'` → **mezzo-cerchio pieno** (pattern standard macOS/iOS per "segui sistema")
- `mode='dark'` → luna
- `mode='light'` → sole

L'iconografia perde l'informazione "quale tema sta applicando l'OS sotto auto", ma guadagna distinguibilità del ciclo, che è prerequisito funzionale.

**Impatto.** Solo `src/components/oggi/OggiView.jsx`, header toggle button. Nessun cambio a `useTheme` (che espone sia `dark` sia `mode` dalla 7a — la modifica si esegue solo a livello di rendering).

### 6.31 DoseCard `border` shorthand vs `borderLeft` longhand (Sessione 7b-1, hotfix CP5)

**Scoperta CP5 dev console.** React emette warning `Updating style property during rerender (border) when a conflicting property is set (borderLeft)` quando un `style={}` object misca `border: ...` (shorthand) con `borderLeft: ...` (longhand). Il warning è legittimo: React non può garantire l'ordine di applicazione tra tick di render quando entrambi coesistono, perché non serializza la cascade CSS.

Nel mockup v5 la Card aveva lo stesso pattern `{border: borderAll, borderLeft: ...}`. Sul mockup standalone il warning era invisibile (render quasi-statico); nella nostra app, `useNow()` fa ri-renderizzare 30-60+ istanze di DoseCard ogni `TICK_INTERVAL_MS=60s` + drag slider + toggle tema, producendo centinaia di warning nella console.

**Fix applicato.** Sostituito `border: borderAll` con le 4 longhand esplicite (`borderTop`, `borderRight`, `borderBottom`, `borderLeft`), tutte con lo stesso valore `borderAll` tranne `borderLeft` che mantiene la semantica di bordo colorato per stato. Comportamento visivo identico, warning silenziato, comportamento deterministico garantito.

**Impatto.** Solo `src/components/oggi/DoseCard.jsx` block `style={{...}}` del root div. Nessuna deviazione logica, solo normalizzazione CSS.

### 6.32 Auto-cleanup `@testing-library/react` non registrato (Sessione 7b-2, scoperta CP2)

**Sintomo.** I 6 nuovi test `DoseCard (interactive — Sessione 7b-2)` prodotti a CP2 fallivano con `Found multiple elements with the role "button"` / `Found multiple elements with the text: PRESA` quando usavano query generiche `screen.getByRole('button')` o `screen.queryByText('PRESA')`. Il DOM residuo del test precedente non veniva ripulito tra un `it()` e l'altro.

**Diagnosi.** `@testing-library/react` v16 registra un `afterEach(cleanup)` automatico solo quando rileva un test framework supportato tramite setupFiles o global. Nel nostro `src/test/setup.js` (7a) importiamo solo `@testing-library/jest-dom` per i matchers, ma non registriamo esplicitamente `cleanup`. I 5 test 7b-1 di `DoseCard.test.jsx` passavano comunque solo per coincidenza statistica: ciascuno interrogava stringhe uniche della propria Card (es. "23:55", "⚠ orario: domani") che non collidevano con le Card residue degli altri test.

**Fix applicato (tactical) in 7b-2.** Tutti i 6 nuovi test interactive usano `const { container } = renderWithProvider(...)` + `within(container).getBy/queryBy...`. Lo scoping per container è bulletproof rispetto allo stato del cleanup globale. I 5 test 7b-1 preesistenti sono rimasti letterali (lavorano comunque per le ragioni sopra).

**Fix strategico (deferito).** Registrare `import { cleanup } from '@testing-library/react'; afterEach(() => cleanup())` in `src/test/setup.js`. Dopo, i test possono tornare a usare `screen.getByRole('button')` senza scoping. Scope 7c o 7d.

**Impatto.** Solo `src/components/oggi/DoseCard.test.jsx`. Nessun file di runtime toccato.

### 6.33 `IconUndo` overlay troppo piccolo su DoseCard check (Sessione 7b-2, CP4)

**Scoperta CP4 punto 2.** Il badge overlay `IconUndo` nel cerchio check ✓ della Card `isLastPreso=true` è `size=10` (valore portato 1:1 dal mockup v5 riga 518). Su display Retina standard è visibile ma poco riconoscibile a colpo d'occhio: l'utente vede il pulse dashed ma non identifica subito l'affordance "puoi annullare". Il mockup v5 stand-alone probabilmente è stato validato su desktop a 100% zoom, mentre la PWA gira anche su iPhone dove 10px sono marginali.

**Fix proposto.** `size=14` per la IconUndo overlay, con eventuale piccolo box bianco dietro per contrasto. Alternativa: promuovere l'icona da overlay in angolo a una seconda riga di testo piccola "annulla" sotto il check.

**Impatto.** Solo `src/components/oggi/DoseCard.jsx` riga overlay IconUndo. Deferito a 7d polish (insieme alla discussione generale su dimensioni icone touch e leggibilità mobile).

### 6.34 Separatori di data multi-giorno non bloccano l'attenzione (Sessione 7b-2, CP4)

**Scoperta CP4 punto 1 — falso-bug intercettato.** In CP4 Roberto ha cliccato PRESA su una Card che visualmente appariva "delle 07:00 di oggi" ma era in realtà delle 07:00 di **ieri**. Conseguenza: counter `presi` resta a 0 (corretto, conta solo oggi), ma la Card è diventata verde con delta `Ritardo 24h 05` (matematicamente corretto dato che la PRESA delle 07:05 di oggi su una dose programmata alle 07:00 di ieri produce 1445 minuti di ritardo).

**Root cause UX.** Due Card di giorni diversi con identica etichetta "ORE 07:00 — PRIMA DI COLAZIONE" e stesso farmaco sono visivamente indistinguibili se lo scroll non mostra il separatore di data. Nel layout corrente il separatore è una riga sottile `dateSepBg` con testo centrato in caps — facilmente trascurato quando si scrolla velocemente.

**Fix proposto.**
- Separatore data **sticky** subito sotto l'header (z-index intermedio): sempre visibile mentre si scorre il giorno corrente
- Oppure/anche: sfondo separatore più contrastato (`headerBg` invece di transparent) e prefisso `📅` o icona calendario
- Oppure/anche: rendering condizionale — se la Card è di un giorno diverso da oggi, una sottile etichetta "IERI" / "DOMANI" in alto a destra del time column

**Impatto.** Solo `src/components/oggi/OggiView.jsx` sezione DATE SEPARATOR + eventuale modifica in `DoseCard.jsx`. Deferito a 7d polish. In 7b-2 non applicato: fuori scope (AMB-7b-2 non lo copre).

### 6.35 `state.presoStack` ephemeral su reload/back (Sessione 7b-2, CP4 — comportamento voluto documentato)

**Scoperta CP4 durante punto 4.** Un page-back involontario sul browser ha svuotato `state.presoStack` (da 2 elementi a 0), mentre `presi_today` è rimasto a 1. Riprodotto deterministicamente con `Cmd+R`.

**Analisi.** Coerente con §13/D11 (presoStack ephemeral, in-memory only):
- Il `presoStack` NON è persistito in IndexedDB, vive solo in `state` del Provider React
- Un reload/back innesca una nuova `init()` che carica da repo → lo stack parte vuoto
- Le PRESA già committate sono salvate in `log_assunzioni` via `upsertLogsBatch` (§6.22) e sopravvivono al reload → `stato='presa'` si conserva correttamente su ogni entry
- Conseguenza: dopo reload, nessuna Card mostra il check dashed+pulse+UNDO (nessuna è "top of stack"), ma tutte le Card già prese mantengono il check verde solid

**Non è un bug** — è la realizzazione corretta del design "UNDO è azione immediata, non time-travel". Una volta abbandonata la pagina, la finestra UNDO si chiude.

**UX miglioramento candidato.** Un visual hint all'utente che ha appena fatto PRESA: se tenta il back/reload entro N secondi dall'ultima presa, mostrare un confirm nativo "Perderai la possibilità di annullare le ultime azioni. Continuare?". Alternativa più soft: pannello `Ultima azione: PRESA di Pantorc (07:05) — annulla` che appare per M secondi dopo ogni PRESA e si auto-dismissa. Deferito a 7d/8 a seconda di quanto è intrusivo.

**Impatto.** Nessuna modifica richiesta al runtime in 7b-2. Comportamento corretto, solo documentato.

### 6.36 Guardia `applyAssunzione` su `target.stato` non presente (Sessione 7c-1, CP0 AMB-7c-1.M verifica)

**Verificato.** Ispezione del codice (`src/domain/recalc.js:300+`) conferma: `applyAssunzione(plan, input)` non implementa guard iniziale su `target.stato`, procede indipendentemente da `prevista`/`ricalcolata`/`saltata`/`sospesa`.

**Conseguenza.** Il flusso "Correggi a presa" da `SaltataModal` funziona out-of-the-box chiamando il thunk `presa(entryKey, override)`. `autoSkip` gira incondizionatamente, `upsertLogsBatch` sovrascrive il log precedente (PK `id` autoincrement + condizione by `[farmaco_id+data+dose_numero]` in filter memory-side) con il nuovo `stato='presa'`.

**AMB-7c-1.M no-op.** Nessun fix retroattivo a `recalc.js`, nessun nuovo test in `recalc.test.js`. Target test AMB-7c-1.N abbassato da 178→202 a 178→200 (fallback), chiuso a 203 (+25, boundary superiore).

**Nota a margine.** `applySospensione` e `applyRicalcolo` possono avere guardie diverse. Non esaminate in 7c-1 perché non impattate dai modali tap-manuali. Verificare se emerge necessità in 7c-2.

### 6.37 SospesaModal 2ª opzione "Cambia in saltata" omessa (Sessione 7c-1, Q2 risolta)

**Context.** Il mockup v5 `SospesaCorrectModal` (righe 803-832) ha 2 opzioni: "Ripristina come da prendere" e "Cambia in saltata". AMB-7c-1.F impone 1 sola azione. Q2 risolta con opzione **omettere**.

**Motivazione.** `applyRipristino(entryKey, to)` accetta solo `to ∈ {'attiva', 'sospesa'}`, non `'saltata'` (`RIPRISTINO_TARGET_INVALIDO`). Replicare l'UX via dispatch composto `ripristina→salta` violerebbe lo spirito "thunks sono l'unica API business" e introdurrebbe race su due dispatch separati.

**Effetto UX.** L'utente che voleva "cambiare una sospesa in saltata" deve compiere 2 azioni: prima Ripristina (torna a `prevista`/`ricalcolata`), poi ALTRO → Saltata. Step aggiuntivo tollerabile per la frequenza bassa del caso.

**Fix strategico candidato.** Introdurre thunk composto `ripristinaCambiaInSaltata` oppure estendere `applyRipristino` ad accettare `to='saltata'` (richiede nuovo ramo: `to='saltata'` su `stato='sospesa'` → patch stato + nessuna propagazione). Deferito a **7d polish o Step 8**. Candidato §6.37-fix.

### 6.38 Bonifica stub scaffolding 16 apr (Sessione 7c-1, CP5 consumato)

**Origine.** Lo scaffolding iniziale del 16 aprile 2026 (Sessione 1) aveva creato stub vuoti in `src/components/oggi/modals/`:
- `AltroModal.jsx` (`return null`)
- `RitardoModal.jsx` (naming v5, `return null`)
- `SaltataCorrectModal.jsx` (naming v5, `return null`)
- `SospesaCorrectModal.jsx` (naming v5, `return null`)
- `UndoModal.jsx` (`return null`)

**Azione CP5.** Sessione 7c-1 ha sovrascritto `AltroModal.jsx` con l'implementazione reale e ha rimosso via `git rm` i 3 stub con naming v5 (`RitardoModal`, `SaltataCorrectModal`, `SospesaCorrectModal`), confermando preventivamente zero import residui via `grep -rn "from.*RitardoModal..."`.

**UndoModal.jsx mantenuto.** Stub vuoto conservato. AMB-7c-1.B esclude UndoModal da 7c-1 ma lo stub potrebbe essere popolato in 7d (candidato §6.41).

**Post-CP5.** `modals/` contiene: 4 modali reali (Altro/Saltata/Sospesa/Recupero) + 4 test file + `_crossDayHint.js` + 1 stub (UndoModal). 10 file.

### 6.39 `renderWithProvider` incompatibile con `rerender` di testing-library (Sessione 7c-1, CP3 scoperta)

**Scoperta CP3.** Un test in `AltroModal.test.jsx` che usava `rerender()` di testing-library per ri-renderizzare la modale con `entry` invariato falliva con:
```
Error: useAppContext: AppProvider is missing in the React tree
```

**Root cause.** `renderWithProvider(ui, options)` wrappa `ui` in `<AppContext.Provider value={value}>` **esternamente**, ma `rerender` di testing-library riusa il container del mount originale e ri-renderizza **solo** il `ui` passato, **senza** il wrapper Provider. Risultato: l'hook `useAppContext` chiamato da `useTheme` dentro il componente rerendered non trova Provider e throw.

**Fix tattico applicato in 7c-1.** Pattern `unmount() + nuova render` in tutti i test 7c-1 che cambiano props. Esempio da `AltroModal.test.jsx`:
```javascript
const first = renderModal();
fireEvent.click(first.getByTestId('altro-modal'));
expect(first.props.onClose).toHaveBeenCalledTimes(1);
first.unmount();  // <-- invece di rerender
const second = renderModal();
fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
```

**Fix strategico candidato.** Usare l'opzione `wrapper` di `render` in `renderWithProvider`:
```javascript
// in renderHelpers.jsx — proposta 7d
function Wrapper({ children }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
return render(ui, { wrapper: Wrapper });
```
Testing-library applica il `wrapper` anche al `rerender`. Deferito a **7d polish** (tooling test, nessun impatto runtime).

### 6.40 candidato — Caricamento `presoStack` da log alla `init()` (deriva §6.35)

**Problema.** §6.35 documenta `presoStack` ephemeral come comportamento voluto. CP6 Sessione 7c-1 ha confermato sul campo che lo scenario "tap PRESA per errore → reload pagina → impossibile annullare" è frequente e costringe l'utente a workaround DevTools.

**Proposta.** Al `init()` del Provider, popolare `presoStack` con le N chiavi corrispondenti alle ultime N dosi `stato='presa'` del giorno corrente, ordinate per `ora_effettiva` ASC (LIFO → top = più recente). N finestra tipica: 3-5. Parametro in `constants.js` (`UNDO_STACK_INIT_WINDOW = 5`).

**Boundary.** Se un log di ieri ha `stato='presa'` ma l'utente apre l'app oggi, non entra nello stack (scope = dateStr corrente via `resolveNow`). Le dosi `presa` di giorni passati restano immutabili senza UNDO, coerente con "UNDO è finestra temporale corta".

**Impatto.**
- `actions.js:init` + 1 query repo (`getLogByDateStato(today, 'presa', limit=N)` — nuovo metodo)
- 1 costante in `constants.js`
- 2-3 test in `actions.init.test.js` (caso con/senza log presa, ordinamento, limit)

**Scope.** **7c-2 o 7d**. Stretto vincolo di chiusura della finestra UNDO dopo back/reload, candidato naturale di 7c-2 se l'utente lo percepisce come bug critico. Altrimenti 7d polish.

### 6.41 candidato — Tap sulla Card `presa` → UndoModal (deriva §6.35)

**Problema.** Anche con §6.40 applicato, la finestra UNDO resta limitata all'ultima azione. Per dosi `presa` fuori dalla finestra l'utente non ha strada UX per annullare senza DevTools.

**Proposta.** Popolare lo stub `UndoModal.jsx` (§6.38 lo conserva). Handler UI: tap sulla Card in stato `presa` (non più solo sul check dashed) apre UndoModal. Contiene:
- Riassunto "Dose presa alle HH:MM il DD/MM"
- Bottone "Annulla questa assunzione" → dispatch di nuovo thunk `annullaAssunzione(entryKey)` (distinto da `annullaUltima()` che lavora solo sullo stack)
- Bottone "Chiudi"

**Impatto dominio.** `applyAnnullaAssunzione(plan, entryKey)` esiste già nel dominio (è il motore di `annullaUltima`). Il thunk nuovo `annullaAssunzione(entryKey)` lo invoca senza il vincolo "stack.length > 0 + top === key". Il `commitApplyResult` già gestisce il `popPresoKey` se presente nello stack.

**Scope.** **7d polish**. Nessun impatto spec. ~3 file toccati (UndoModal.jsx, UndoModal.test.jsx, actions.js + nuovo test) + piccola modifica DoseCard (Card presa diventa `<button onClick={onUndoTap}>` quando handler è presente).

### 6.42 (FALSO POSITIVO scartato)

**Scoperta apparente CP6 Sessione 7c-1.** Errore Dexie `IDBKeyRange: The parameter is not a valid key` in `LocalRepository.js:208` durante un `actions.init()` invocato da console.

**Verifica.** Riesecuzione pulita di `init()` dopo reset state → OK, nessun errore. L'errore era stato innescato da un `upsertLog(...)` fallito silenziosamente nel tentativo di workaround §6.35, che aveva lasciato il Dexie in stato transient.

**Conclusione.** Non è un bug reale. `LocalRepository.js:208` funziona correttamente su input sanitizzati. Scartato.

### 6.43 candidato — Ritardo programmato (posticipo) di dose/e

**Use case.** Emerso in CP6 Sessione 7c-1. L'utente alle 07:00 sa che per N ore non potrà assumere il/i farmaco/i, vuole dichiarare un posticipo **preventivo** (non a consuntivo come "L'ho presa alle...").

**Gap rispetto al dominio attuale.**
- `applyAssunzione(dataEffettiva, oraEffettiva)` registra un fatto **passato** (`stato='presa'`)
- `applyRecupero` riduce un gap già esistente, non crea uno spostamento autonomo
- Nessun thunk modifica `ora_ricalcolata` in modo "programmato" prima dell'assunzione

**Proposta.** Nuova funzione pura `applyPosticipo(plan, entryKey, nuovoOrario)`:
- Stato target: `'ricalcolata'`
- `ora_ricalcolata = nuovoOrario`, `ora_ricalcolata_originale` già settato dal seed se esiste
- `delta_minuti = null`, `ora_effettiva = null`
- Per `tipo_frequenza='intervallo'`: ricalcolo N+1 identico a `applyAssunzione`
- Per `tipo_frequenza='fisso'`: nessuna propagazione

Variante multi-dose `applyPosticipoMulti(plan, chiavi[], deltaMin)` per scenario "2h di blocco su più farmaci simultanei".

**Q aperte (da risolvere prima dell'implementazione).**
- **Q-P1**: dosi `fisso` — posticipare una dose può collidere con altre dosi dello stesso farmaco nella giornata? (Es. Pantorc 07:00 + Ezevast 20:00 — posticipare Pantorc alle 19:00?)
- **Q-P2**: dosi `intervallo` — propagazione su N+1 identica a `applyAssunzione`? Presumibilmente sì.
- **Q-P3**: interazione con `SOGLIA_PROMPT_RECUPERO` — posticipo > 30 min attiva il prompt immediatamente o solo al momento dell'assunzione della dose N+1?
- **Q-P4**: UX — 4ª azione in AltroModal o entry point header dedicato? Se multi-dose, serve un modale separato con checkbox per le dosi impattate.

**Scope.** **Fuori 7c-1 e fuori 7c-2.** Richiede prima aggiornamento **spec v1.3** (fonte di verità per dominio). Candidato a sessione dedicata post-7d o nuova fase.

### 6.44 candidato — Data corrente visibile durante lo scroll (sticky date separator)

**Scoperta CP6 Sessione 7c-1.** L'header app ha `sticky top-0 z-30` e mostra sempre "lunedì 20 aprile" (today). Ma il separator di data della timeline (`DOMENICA 19 APRILE` / `OGGI · LUNEDÌ 20 APRILE`) scorre via con le Card. Quando l'utente scorre indietro di un giorno, perde il riferimento visivo a quale giorno sta osservando — rischia di toccare PRESA su una Card di ieri credendola di oggi (caso simulato dall'utente in CP6 punto 1, `§6.34` già candidato per visibilità insufficiente del separator).

**Nota sui modali.** Cross-day hint (AMB-7c-1.I) in AltroModal/SaltataModal timepick **rassicura** l'utente solo quando `entry.dateStr ≠ today` (es. "Ieri — 18/04"). Per Card del giorno corrente nessun hint — coerente con la regola. Ma l'utente può avere dubbi anche senza hint se ha perso visivamente il separator.

**Proposta.** Separator di data **sticky** con `position: sticky; top: [altezza header app]`. Così scorrendo il separator del giorno corrente resta visibile sopra le Card fino a che non arriva il separator del giorno successivo.

**Impatto.** 1 file (`OggiView.jsx`, sezione DATE SEPARATOR, wrapper `<div>` con `sticky` + top calcolato). Nessun impatto dominio, nessun nuovo test.

**Scope.** **7d polish**. Accorpato naturalmente a §6.34 (visibilità separator).

### 6.45 candidato — Feedback ritardo/anticipo "normale" troppo loquace

**Scoperta CP6 Sessione 7c-1.** Card `presa` mostra sempre `Ritardo X min` / `Anticipo X min` anche quando `|delta| ≤ TOLLERANZA_MIN`. Es. "Anticipo 3 min" su dose presa 3 minuti prima del previsto: rumore visivo, il dato esatto è irrilevante (è dentro tolleranza per definizione).

**Proposta (Opzione A, consigliata).** Sotto tolleranza mostrare solo `in orario` indipendentemente dal valore esatto di `delta_minuti`. Oltre tolleranza mantenere il formato attuale `Ritardo X min` / `Anticipo X min` in rosso. Il valore esatto resta tracciato nel log e recuperabile per audit.

**Alternative valutate.**
- **Opzione B** — testo con scala di intensità (3 tier di styling): aumenta complessità senza valore proporzionale
- **Opzione C** — seconda soglia `TOLLERANZA_SILENZIOSA` (es. 5 min): introduce concetto nuovo da documentare in spec

**Impatto.** `DoseCard.jsx` branch `isPresa` (~15 righe). Aggiornamento 2 test esistenti (`Anticipo` label sparisce per Card con delta=-5 in `buildTestPlan` entry 3; servirà entry test con |delta| > 15 per coprire ramo rosso).

**Scope.** **7d polish**. Nessun impatto dominio.

### 6.46 candidato — Contrasto testi grigi in dark mode

**Scoperta CP6 Sessione 7c-1.** In RecuperoModal dark theme risultano poco leggibili:
- "0" e "max 1h" sotto slider (color: `t.textMuted = #78716C` su `t.modalBg = #1F1E26`)
- Label "Seleziona tempo" del bottone disabilitato (`t.btnDisabledTx = #4A4854` su `t.btnDisabledBg = #252430`)

**Pattern ricorrente.** Già §6.33 (IconUndo overlay size=10) e §6.34 (date separator visibility) sono sintomi dello stesso problema: tema dark sotto-contrastato.

**Proposta 7d polish (accorpata a §6.33/§6.34).** Pass di contrasto WCAG su tutti i token `*Muted`, `*Disabled*` e sizing di icone accessorie. Target: **AA** su fondo dark (≥4.5:1 per testo normale, ≥3:1 per UI graphics, ≥7:1 per testo piccolo se raggiungibile).

**Impatto.** `utils/theme.js` (aggiornamento ~8-12 token). Nessun impatto runtime o test (i test usano `tema: 'light'` override).

**Scope.** **7d polish**.

### 6.47 candidato — Badge gap non considera `recupero_minuti` + affordance cliccabile debole

**Scoperta CP6 Sessione 7c-1 step 6-8.** Dopo `applyRecupero(entryKey, 60)` su dose con `gap_minuti=60`, il dominio produce correttamente `recupero_minuti=60`, `ora_ricalcolata` anticipata al valore originale, residuo = 0. La RecuperoModal mostra box verde "0 — riallineato". Ma la DoseCard continua a mostrare il badge rosso `ritardo 1h` perché il branch di render è `entry.gap_minuti > 0`, ignorando `recupero_minuti`.

**Semantica dominio.** Corretta: `gap_minuti` è immutabile come fatto storico del ritardo accumulato al momento della dose precedente (§6.13 JSDoc: *"gap_minuti and gap_originale are left untouched"*). Il recupero è un `recupero_minuti` separato che modifica `ora_ricalcolata` ma non azzera il gap storico.

**Problema UI.** Il badge dovrebbe mostrare il **residuo**: `(gap_minuti - recupero_minuti)`, non il gap lordo. Analogamente la soglia di rendering.

**Proposta fix UI.**
```jsx
// in DoseCard.jsx, condizione e label del badge gap:
const gapResiduo = entry.gap_minuti - entry.recupero_minuti;
{gapResiduo > 0 && !isDone && (
  <TapBadge label={formatGapLabel(gapResiduo)} ... />
)}
```

**Seconda parte §6.47 — affordance cliccabile debole.** Badge blu `+1h` (recalc diff, statico) e badge rosso `ritardo 1h >` (interattivo via `TapBadge`) sono visivamente simili. Il solo segnale di interattività è il `border-dashed` (1.5px) + chevron del TapBadge, che passa inosservato.

**Proposte migliorative.**
- Alzare spessore dash a 2-2.5px
- Aggiungere icona esplicita (clock o touch)
- Sfondo con gradient leggero
- Da valutare nel pass §6.46 contrasto dark

**Impatto.** `DoseCard.jsx` (2-3 righe) + `DoseCard.test.jsx` (aggiornamento test "gap badge shown when gap_minuti > 0" → deve usare `gap - recupero`, +1 test per caso `gap=60, recupero=60 → badge nascosto`). `shared/TapBadge.jsx` styling.

**Scope.** **7d polish** (è un bug UI ma non bloccante: il recupero funziona correttamente a livello dominio e ora_ricalcolata, è solo la visualizzazione del badge residuo a essere fuorviante).

### 6.48 Ephemeral prompt behaviour (AMB-7c-2.D)

Il reducer `COMMIT_APPLY_RESULT` sovrascrive `state.prompt` con `returnedPrompt ?? null` su ogni commit. Conseguenza: qualsiasi apply* successivo al trigger azzera il prompt se il nuovo apply non ne emette uno proprio. Il prompt di gap recovery è quindi ephemeral, valido finché non arriva un altro commit.

Esempio: utente ha prompt pendente su entry B, poi corregge entry C via presa su SaltataModal. Il commit di C azzera `state.prompt` senza che B venga mai auto-prompted.

**Motivazione accettazione:**
- Il tap manuale sul gap badge (7c-1) è fallback permanente affidabile
- Opzione alternativa (prompt sticky) richiederebbe logica trivalente in reducer (undefined lascia, null pulisce, oggetto sostituisce) + regola "entry target = prompt soddisfatto" + cap 1 prompt
- Caso d'uso dominante (terapia quotidiana, pochi edit al giorno) non espone lo scenario di perdita
- Retrofit a opzione sticky sempre possibile in 7d/post-7d

**Invariante documentata:** l'utente ha sempre un fallback manuale. Il prompt automatico è "best effort", non garantito oltre il primo commit successivo.

Revisione candidata: 7d polish se osservazione d'esercizio rivela frequenti perdite silenziose.

### 6.49 AppProvider.initialStateProp rimandato (AMB-7c-2.J)

`AppProvider` in `src/state/AppContext.jsx` riceve `initialState` come costante importata da `reducer.js`, senza possibilità di override via props. Firma attuale: `function AppProvider({ children })`.

Conseguenza per test integration Sessione 7c-2: scenario "seed diretto con `state.prompt` pre-popolato" non disponibile. Gli integration test devono forzare il prompt tramite chain E2E completo (dispatch `actions.presa()` con seed plan/profilo/orari che produca gap > SOGLIA_PROMPT_RECUPERO su N+1).

**Scelta 7c-2:** scenario E2E puro. Helper `renderWithRealProvider` monta `AppProvider` reale, espone `waitForReady` (attende `status='ready'`) e accesso a `actions` tramite hook test-only. Setup verboso ma fedele.

**Retrofit candidato 7d/8:** estensione `AppProvider({ children, initialStateProp })` con skip di `repo.init()` quando `initialStateProp !== undefined`. Abiliterebbe contract test più semplici per futuri prompt/notifiche. Decisione rimandata a osservazione d'esercizio di 7c-2: se il setup E2E risulterà >10 righe per test, promuovere retrofit.

### 6.50 `useModalA11y` firma estesa con `fallbackEntryKey` (Sessione 7d-1, CP1)

AMB-7d-1.C originale specificava firma `useModalA11y({ isOpen, triggerRef, onClose, labelId, describedById })`. AMB-7d-1.D richiedeva che il fallback per auto-open (RecuperoModal) eseguisse `document.querySelector('[data-entry-key="<key>"]')` "interno al hook" — ma `<key>` non era presente in firma.

**Chiarimento in CP1:** estesa firma a `{ isOpen, onClose, labelId, describedById, triggerRef=null, fallbackEntryKey=null }`. Il chiamante responsabile passa `fallbackEntryKey` (RecuperoModal lo riceve da OggiView via prop, che lo legge da `recuperoModal.entry.key`).

**Impatto:** zero sui chiamanti manuali (4 modali tap, `fallbackEntryKey` default null). Solo RecuperoModal popola il campo.

### 6.51 `DoseCard.test.jsx` modificato fuori dallo scope prompt CP3 (Sessione 7d-1)

Il prompt §11 CP3 dichiarava `DoseCard.jsx` modificato per `data-entry-key + IconUndo size`, ma non `DoseCard.test.jsx`. La firma handler dei 4 modali-openers (ALTRO, SALTATA label, SOSPESA label, Gap) cambiata da `(entry) → void` a `(entry, triggerEl) → void` per cattura `e.currentTarget` (AMB-7d-1.D): i 4 test 7c-1 di DoseCard rompono senza update assertion.

**Modifica:** assertion da `toHaveBeenCalledWith(plan[...])` a `toHaveBeenCalledWith(plan[...], expect.any(HTMLElement))` per ALTRO/SALTATA/SOSPESA. Il test Gap usa soft assertion sul 2° arg (TapBadge shared component può o non forwardare `e`).

**Deviazione minore dal prompt:** accettata per non rompere suite. Nessun nuovo test aggiunto, solo estensione delle assertion esistenti.

### 6.52 `:focus-visible` globale anziché scoped a `[role="dialog"]` (Sessione 7d-1, CP browser 1+4)

AMB-7d-1.J congelata come "ARIA refinements minimi". CP browser 1 ha rivelato che Tailwind rimuove `outline` sui bottoni di default: il focus trap era attivo ma invisibile. Fix iniziale: regola CSS `[role="dialog"] :focus-visible { outline: ... }` in `CARD_AND_SLIDER_CSS` di OggiView.jsx.

CP browser 4 (badge gap TapBadge **fuori** dai dialog) ha rivelato che lo stesso bisogno di ring visibile si applica a ogni elemento focussabile dell'app. La regola è stata estesa a `:focus-visible` globale con parametri finali `outline: 2.5px solid #3B82F6; outline-offset: 3px; border-radius: 4px`.

**Chiarimento AMB-7d-1.J:** focus ring visibile è parte integrante dell'obiettivo a11y e si applica ovunque, non solo nei dialog.

### 6.53 TapBadge gap — `border={t.gapTx}` invece di `t.gapBd` (Sessione 7d-1, CP browser 4)

Il bordo tratteggiato del TapBadge gap usava `gapBd` (dark `#991B1B`, light `#FCA5A5`). In dark mode il rosso scuro `#991B1B` su fondo `#5C1B1B` (gapBg) era difficilmente leggibile — il dash sembrava un bordo solido o addirittura assente.

**Fix:** `border={t.gapTx}` (dark `#FCA5A5` rosa chiaro / light `#B91C1C` rosso scuro). Il colore del bordo coincide con il colore del testo → contrasto massimo su entrambi i temi, dash nettamente visibile.

**Impatto:** solo `DoseCard.jsx` ramo `hasGapTap` (call-site del TapBadge). Zero modifiche al componente condiviso `TapBadge.jsx`. Il fallback Badge non-interattivo (senza `hasGapTap`) mantiene `gapBd` (non ha bordo tratteggiato, il token scuro non crea problemi di leggibilità lì).

### 6.54 DoseCard root div `tabIndex={-1}` per focus programmatico (Sessione 7d-1, CP browser 5)

CP browser 5 (RecuperoModal auto-prompt) ha rivelato che il fallback `[data-entry-key]` di `useModalA11y` trovava correttamente il `<div>` root della Card ma `.focus()` era silently ignored: il focus tornava a `<body>`.

**Root cause:** i `<div>` non sono focussabili programmaticamente senza `tabindex`. Il `triggerRef` manuale funziona perché punta a `<button>` (ALTRO pill, TapBadge) che è focussabile nativamente.

**Fix:** `tabIndex={-1}` sul div root di DoseCard. `-1` rende l'elemento focussabile via `.focus()` senza inserirlo nel tab order naturale (utente Tab non ci passa sopra, screen reader lo tratta come elemento programmatico).

**Impatto:** 1 riga in `DoseCard.jsx`. Nessun test esistente asserisce su tabindex, zero regressioni.

### 6.55 §6.33 IconUndo chiuso per RIMOZIONE, non resize (Sessione 7d-1, CP browser 6)

AMB-7d-1.G prescriveva promozione IconUndo size 10 → 14 con eventuale aggiustamento offset. CP browser 6 ha mostrato size 14 ancora insufficiente; iterato a 18 ancora giudicato marginale.

**Scelta finale:** rimozione completa dell'overlay IconUndo. L'affordance "puoi annullare" è comunicata da:
- Dashed border del cerchio check (visivamente distintivo vs solid-border delle altre prese)
- Pulse animation (movimento attira l'occhio)
- `aria-label="Annulla ultima presa"` (a11y / screen reader / tooltip su hover)

**Motivazione:** scalare un overlay piccolo in posizione marginale è lotta contro la posizione stessa. Il dashed+pulse già comunicano semanticamente "temporaneo, modificabile"; l'icona era rumore visivo non strettamente necessario.

**Impatto:** `DoseCard.jsx` rimosso `<span>` overlay + rimosso `IconUndo` dall'import. `IconUndo` resta esportato da `Icons.jsx` (usato da `SospesaModal` bottone Ripristina).

### 6.56 `allowOutsideClick: true` in focus-trap config (Sessione 7d-1, CP2 fix)

Al primo run CP2 i 4 test "closes on overlay click" fallivano (0 chiamate a onClose invece di 1) su tutti e 4 i modali. 

**Root cause:** focus-trap ha default `allowOutsideClick: false` che intercetta click outside con stopPropagation+preventDefault. L'`onClick={(e) => ...onClose()}` sul div overlay del modale non veniva mai chiamato.

**Fix:** opzione `allowOutsideClick: true` nel `createFocusTrap`. Permette propagazione del click al handler React senza deactivare il trap (che si deactiva comunque poco dopo quando il parent azzera `entry` → cleanup useEffect del hook).

**Alternative scartate:**
- `clickOutsideDeactivates: true` → doppia chiamata di onClose (focus-trap + handler React)
- Rimuovere handler overlay e delegare a focus-trap → cambio semantico pervasivo

### 6.57 Date separator: rimozione line decorative + layout pill (Sessione 7d-1, CP4)

AMB-7d-1.H accorpava §6.34 (visibilità) + §6.44 (sticky). Il layout 7b-1 era `<line> <label> <line>` con linee orizzontali ai lati del testo.

**Scelta CP4:** rimosse le linee, sostituite da pill centrato full-width con `background: dateSepBgStrong`, `boxShadow`, prefissato da `IconCalendar`. Le linee decorative non leggono bene quando l'elemento è pinned — un pill pieno con icona+label comunica istantaneamente "sono un separator fissato".

**Calibrazione top offset:** `top-16` (64px, stima iniziale AMB-7d-1.H) risultato insufficiente in CP browser — header app alto 179px con DEV slider + counter row wrap + title. Fix: `top-[180px]` (Tailwind arbitrary value). In produzione senza DEV slider l'header sarà più corto, causando un piccolo gap tra header e separator pinned. Accettabile; alternativa dinamica (ref + ResizeObserver) out-of-scope 7d-1.

### 6.58 Rename `annullaAssunzione` → `applyAnnullaAssunzione` nel dominio (Sessione 7d-2 parte 1/2, CP0)

Scoperto in CP0 della Sessione 7d-2 (round 2 diagnostic): la funzione pura in `recalc.js:473` si chiama `annullaAssunzione`, ma AMB-7d-2.F richiede un **thunk** con lo stesso nome. Conflitto nominale inaccettabile: o la funzione o il thunk deve rinominarsi.

**Scelta (Opzione 1, approvata in CP0 round 2):** rinomina funzione dominio a `applyAnnullaAssunzione`. Motivazioni:
- coerenza con la famiglia `apply*`: `applySospensione` / `applySalto` / `applyAssunzione` / `applyRecupero` / `applyRipristino`
- zero cambi semantici: stessa firma `(plan, entryKey) → ApplyResult`
- unica call site da aggiornare: `annullaUltima()` in `actions.js:218`
- sblocca il thunk `annullaAssunzione(entryKey)` con nome naturale (AMB-7d-2.F)

**Applicazione:** deferita a CP4 della parte 2/2. Parte 1/2 la documenta come candidata senza applicarla.

**File impattati (parte 2/2):** `src/domain/recalc.js` (rename export + chiamanti interni), `src/domain/recalc.test.js` (rename references), `src/state/actions.js` (rename import), `src/state/renderHelpers.jsx` stub se presente.

### 6.59 `UndoModal.jsx` stub non rimosso in §6.38 (Sessione 7d-2 parte 1/2, CP0)

Scoperto in CP0 round 2: `src/components/oggi/modals/UndoModal.jsx` esiste nell'Initial commit come stub 1-riga `export default function UndoModal() { return null; }`. La Sessione 7c-1 con §6.38 aveva rimosso 3 stub obsoleti (`RitardoModal`, `SaltataCorrectModal`, `SospesaCorrectModal`) ma UndoModal è stato tralasciato.

**Stato file:** presente, contenuto placeholder, **nessun import consumer** in tutta la codebase (grep globale clean).

**Impatto su prompt §11 v2.5.16:** AMB-7d-2.L elencava CP5 come "UndoModal (NUOVO)". Reinquadramento post-CP0: CP5 **riscriverà** lo stub, non creerà il file. Contratto AMB invariato, solo il wording "nuovo" → "riscritto".

**Applicazione:** deferita a CP5 della parte 2/2.

### 6.60 Sanity check: copertura fake repo per nuovi metodi `IRepository` (procedurale, Sessione 7d-2 parte 1/2)

Scoperto durante l'esecuzione di CP3: dopo aver esteso `IRepository` con `getLogByDataStato` (CP1) e averlo consumato in `actions.init()` (CP3), 10 dei 215 test preesistenti (il file `OggiView.test.jsx`, integration E2E con `AppProvider` reale) hanno iniziato a fallire con `repo.getLogByDataStato is not a function`.

**Root cause:** il test helper `src/test/renderWithRealProvider.jsx` esporta `makeFakeRepo(seed?)` che costruisce un'implementazione in-memory del contratto. L'estensione del contratto in CP1 **non è stata accompagnata** dall'estensione del fake. Il sanity check del prompt §11 v2.5.16 non includeva verifica di questo fallimento.

**Fix in-session (hotfix post-CP3):** aggiunto `getLogByDataStato` al ritorno di `makeFakeRepo` con stessa semantica di `LocalRepository` (filter per `(data, stato)`, sort ASC per `ora_effettiva`, nulls-last difensivo). 235/235 test ristabiliti.

**Lezione procedurale:** i prompt §11 esecutivi che introducono nuovi metodi `IRepository` devono elencare nel sanity check un punto dedicato — *"per ogni nuovo metodo `IRepository` introdotto dall'AMB, verificare che `renderWithRealProvider.jsx:makeFakeRepo` lo rispecchi"*. Non è una deviazione dal codice ma dal processo; registrata per i prompt futuri.

**Alternative non adottate:**
- Defensive in `actions.init()` con `if (typeof repo.getLogByDataStato === 'function')` → nasconde bug reali, viola il contratto
- Promozione di `IRepository` da JSDoc a TypeScript interface con strutture runtime-enforced → over-engineering per il contesto Fase 2

### 6.61 Guard `DOWNSTREAM_USER_EDITS` in `applyAnnullaAssunzione` (Sessione 7d-2 CP4, §11 AMB-7d-2p2.F)

Scoperto in analisi CP4: AMB-7d-2p2.F del prompt §11 v2.5.16 richiedeva che l'undo fallisse se la dose N+1 presentava stati utente (`presa` / `sospesa` / `ricalcolata` non-auto). Revisione del modello ha evidenziato che la terza condizione non è rilevabile: `PlanEntry` non traccia la provenienza di uno stato `ricalcolata` (auto-generato da `applyAssunzione` vs editato manualmente). Nessun campo `user_edited:boolean` o simile esiste oggi.

**Scelta (approvata CP4):** guard limitato a `presa|sospesa`. `ricalcolata` downstream continua ad essere trattato come auto-generato (comportamento CP3 invariato).

**Implementazione:** early-return `throw new DomainError('DOWNSTREAM_USER_EDITS', 'Impossibile annullare: la dose successiva è già stata registrata o sospesa.')` prima delle mutazioni, dentro `applyAnnullaAssunzione` (riga post-rename in `recalc.js`). Il codice SCREAMING_SNAKE è coerente con i tre codici preesistenti in `applyRecupero`. `commitApplyResult` già mappa `DomainError → SET_ERROR {kind:'domain', code}` (righe 75-86 `applyHelper.js`).

**Estensione futura:** introdurre un campo `user_edited:boolean` (o `origine:'auto'|'user'`) su `PlanEntry.stato === 'ricalcolata'` sblocca il terzo ramo del guard. Lavoro fuori scope 7d-2.

**Test:** 2 nuovi in `recalc.test.js` — happy path guard (N+1 presa → ApplyError code=DOWNSTREAM_USER_EDITS), idem per sospesa.

### 6.62 Stack coherence su `annullaAssunzione` individuale (Sessione 7d-2 CP4)

Scoperto in analisi CP4: il nuovo thunk `annullaAssunzione(entryKey)` può annullare una dose `presa` che è nello stack `presoStack` ma non necessariamente al top. Pattern `commitApplyResult` offre `pushPresoKey` e `popPresoKey` (LIFO); nessuno dei due copre il caso "rimuovi una key specifica (non-top) dallo stack in seguito a undo riuscito".

Senza intervento, post-undo individuale resta una key "zombie" nello stack: il successivo `annullaUltima()` (tap check dashed) proverebbe a ri-annullare una dose ormai in stato `prevista` o `ricalcolata`, con risultato imprevedibile.

**Scelta (approvata CP4):** nuova action reducer `REMOVE_PRESO_KEY` con payload stringa (la key da rimuovere), implementata come `presoStack.filter(k => k !== payload)`. Dispatch dal thunk `annullaAssunzione` **solo su `result.ok`**. No-op se la key non è presente (copre il caso annullamento di dose non nello stack, es. presa caricata da log all'init).

**Razionale del design:** mantiene DRY di `commitApplyResult` (nessuna terza modalità `removePresoKey`), concentra la responsabilità stack-coherence nel thunk, preserva atomicità del commit (dispatch sequenziale post-success).

**File impattati:** `src/state/reducer.js` (+case), `src/state/reducer.test.js` (+1 test filter).

### 6.63 `commitApplyResult` ritorna `code` su DomainError (Sessione 7d-2 CP5)

Scoperto in analisi CP5 mentre si implementava UndoModal: UndoModal necessita di branch UI tra success (chiude modale), fallimento DOWNSTREAM_USER_EDITS (banner specifico), fallimento altro (banner generico). Il contratto originale di `commitApplyResult` ritornava sempre `{ok: boolean}` — il code del DomainError era dispatchato a `state.error` ma non surface-abile al callsite senza accedere a state post-dispatch (rompe l'ergonomia del pattern thunk-returning-Promise).

**Scelta (approvata CP5, Opzione 1):** estendere il return type del path DomainError a `{ok: false, code: err.code}`. Gli altri path (unknown, repo persist-fail) restano `{ok: false}` perché non hanno code. `SET_ERROR` dispatch invariato (continua a includere code nel payload). Tutto additivo, zero breaking per i 6 thunk preesistenti che ignorano oltre `ok`.

**Alternative scartate:**
- Nuova classe `ApplyError extends DomainError` con campo `kind`: sovradimensiona la gerarchia per un singolo caso d'uso
- Estendere `ApplyResult` con variante error: invasivo su contratto dominio + `commitApplyResult`

**File impattati:** `src/state/applyHelper.js` (DomainError path return), `src/state/actions.annullaAssunzione.test.js` (assert esteso a `{ok: false, code: 'DOWNSTREAM_USER_EDITS'}`). UndoModal consumer-side: `handleConfirm` legge `result?.code` e setta `errorCode` locale.

### 6.64 Strategia refresh plan post-Config edits + atomicità multi-tabella (Sessione 8 analisi-first, Q3)

Estensione di §3.5 spec ("ora_prevista aggiornato quando si cambia profilo") al caso degli edit in-place in vista Config. Regole congelate:

- **Edit profilo attivo** (`updateProfilo` dove `id === profilo_attivo_id`) → il thunk invoca `rebuildPlan()` dopo commit DB. Conseguenza: tutti gli `orari_base.ora_prevista` in-memory vengono ricalcolati dalla nuova àncora del profilo; log consolidati preservati (§6.23).
- **Edit profilo non-attivo** → scrittura DB sola, nessun refresh. Il ricalcolo avverrà al prossimo `cambiaProfilo` sul profilo modificato (coerente con spec §3.5 letterale).
- **Edit farmaci / orari** (si assume profilo attivo come riferimento corrente) → `rebuildPlan()` dopo commit DB, invocato dallo stesso thunk CRUD.
- **Edit impostazioni app** (nome_utente, tema) → nessun rebuild, solo dispatch `SET_IMPOSTAZIONE` (pattern §6.27 già esistente).

**Atomicità multi-tabella:** nuovo metodo `withTransaction(mode, storeNames, fn)` sul contratto `IRepository`, Dexie-native (~20 righe in `LocalRepository`):

```js
async withTransaction(mode, storeNames, fn) {
  return this.db.transaction(mode, storeNames, fn);
}
```

Usato da tutti i thunks Config che toccano ≥2 tabelle (es. `updateFarmaco + replaceOrariForFarmaco` atomico). L'API esistente (`setProfiloAttivoConCleanup` §6.20, `replaceOrariForFarmaco`, `upsertLogsBatch` §6.22) resta disponibile per i casi fissi già codificati, ma la forma canonica per nuovi scenari è `withTransaction`. Quando arriverà il backend MariaDB, mapperà su una singola transazione SQL.

**Invariante §6.23 riaffermata per Config-case:** `mergeLogIntoEntry` non sovrascrive `plan.ora_prevista` con `log.ora_prevista` nemmeno dopo edit di orario che cambia il primo ma lascia immutato il secondo. `delta_minuti` del log è fatto storico (AMB-3), congelato al momento della presa.

**Nota CP0 8c:** verificare che `DoseCard` usi `entry.delta_minuti` dal log e NON ricalcoli al render (`now - ora_prevista` o simili). Se ricalcola, pre-fix obbligatorio prima di aprire gli edit form — altrimenti edit di orario corrompe il rendering di dosi già presa.

### 6.65 Config layout e scope ImpostazioniTab (Sessione 8 analisi-first, Q4 + Q7)

La spec §5.1 dedica a Config una riga ("Gestione farmaci, orari base, intervalli, relazione pasti, profili giornalieri"). Il mockup v5 non ha schermate Config. Shape UI congelata ex-novo:

- **3 tabs URL-addressable** `/config/profili`, `/config/farmaci`, `/config/impostazioni`. Router React Router già presente (Step 1). Deep-link utile Step 9 (tap notifica → apri Config farmaco specifico).
- **Nessun tab Orari separato** (decisione Q5.c): gli orari vivono solo nested in FarmaciTab. Divergenza implicita dalla NavBar 4-tab della spec §5.1 (che comunque non descriveva una tab Orari in modo esplicito — il "orari base" citato era inteso come proprietà dei farmaci).
- **ImpostazioniTab in PROD**: `nome_utente` (text input) + tema (toggle 3-stati auto/dark/light, pattern §6.30 riutilizzato).
- **ImpostazioniTab sezione "Avanzate"**: visibile solo se `import.meta.env.DEV`. Mostra `seed_loaded`, `schema_version`, stato `simulatedNow`. Read-only (nessun edit UI). Pattern equivalente a DevTimeSlider (gated-visibility DEV-only).
- **Header Oggi mantiene toggle tema**: shortcut per azione frequente, non regressione. Duplicato con Config.Impostazioni accettato come pattern standard (cfr. macOS Menu Bar + Preferences).

Spec resta v1.2: nessuna §5.X Config riversata, coerente con il precedente delle UI di Oggi (tutte in changelog). Eventuale riversamento rimandato a chiusura Fase 2 se emergeranno cambi di schema.

### 6.66 Form farmaco unico con orari inline atomico (Sessione 8 analisi-first, Q5)

FarmaciTab espone lista farmaci + scheda farmaco come **form unico a 4 sezioni scroll-verticale** (no wizard, no schermate separate, no modale figlia):

1. **Anagrafica** — `nome`, `principio_attivo`, `funzione`
2. **Frequenza & Dosi** — `tipo_frequenza` (radio fisso/intervallo), `intervallo_ore` (visibile solo se intervallo), `intervallo_minimo_ore` (default 50% intervallo_ore, override esplicito), `dosi_giornaliere`
3. **Orari** — lista dinamica di `dosi_giornaliere` righe, ciascuna con `offset_minuti`, `ancora_riferimento`, `descrizione_momento`. Add/remove row attivato automaticamente dal cambio di `dosi_giornaliere`. Validation: almeno 1 riga, offset numerico, ancora in enum.
4. **Avanzate** — `relazione_pasto`, `dettaglio_pasto`, `note`, `data_inizio`, `data_fine`, `attivo`

Save atomico via `withTransaction('rw', ['farmaci','orari_base'], fn)` (§6.64): aggiorna la riga `farmaci` e chiama `replaceOrariForFarmaco` internamente nello stesso tx. Creazione di nuovo farmaco: prima `addFarmaco` → ottiene `id`, poi `replaceOrariForFarmaco(id, orari)`, tutto nella stessa tx. Niente wizard, niente flussi spezzati.

### 6.67 Soft-delete farmaco + flip `GET_FARMACI_SOLO_ATTIVI` (Sessione 8 analisi-first, Q8)

**Scoperta critica in analisi:** la costante `GET_FARMACI_SOLO_ATTIVI = false` (AMB-5b2.D in `src/domain/constants.js`) fa sì che `actions.init()` passi `{soloAttivi: false}` a `repo.getFarmaci`. Conseguenza diretta: il planBuilder include anche farmaci con `attivo=0`, rendendo **inefficace il soft-delete §6.4 sul rendering del plan corrente**. In assenza di UI di delete (pre-Step 8), il problema non si è mai manifestato — ma diventa bloccante appena FarmaciTab espone l'azione.

**Decisione per 8c:** flip a `GET_FARMACI_SOLO_ATTIVI = true` in `constants.js`. Da quel punto, `deleteFarmaco(id)` (soft-delete, setta `attivo=0`) produce scomparsa immediata del farmaco dal plan di Oggi al prossimo `rebuildPlan()` (triggerato dal thunk delete stesso, §6.64). **Le dosi di oggi già `presa`/`saltata`/`sospesa` scompaiono dal rendering insieme al farmaco**; i log restano integri in IDB per Log Fase 3 (§6.4 invariante preservata, solo il rendering è affetto).

**UX del delete:** confirm dialog modale con messaggio esplicito:

> Sei sicuro di voler eliminare "{nome}"?
> Le eventuali dosi già registrate oggi scompariranno dalla vista Oggi; il log storico sarà preservato per consultazione futura.
> [Annulla]  [Elimina]

Bottone Elimina in danger style (colore rosso del tema). No tap+undo stile Oggi: il delete Config è azione "a freddo", non hot-path.

**Nessun restore UI in Fase 2.** Un farmaco eliminato per errore richiede ri-creazione manuale (form farmaco = 2-3 minuti). Restore/archivio è feature Log Fase 3, dove la vista storico esporrà anche i farmaci con `attivo=0`.

**Nota CP0 8c:** baseline test di 8b va ri-verificato col flag flippato; alcune entries di test che implicitamente dipendevano dal seed completo (incluso farmaci inattivi) potrebbero rompere. Candidato intra-sessione 8c (hotfix), non bloccante se emerge al CP0.

### 6.68 Date farmaco editabili senza vincoli (Sessione 8 analisi-first, Q9)

`data_inizio` e `data_fine` sono entrambe editabili nella sezione Avanzate del form farmaco (§6.66), senza validator strict. Defaults in creazione: `data_inizio = today`, `data_fine = null` (cronica).

L'utente può impostare `data_fine` a qualsiasi data, incluso il passato. Quando `data_fine < today`, il form pre-save mostra confirm dialog esplicativo:

> Impostando data_fine a {DD/MM/YYYY}, le dosi successive a quella data scompariranno dalla vista Oggi. I log storici saranno preservati.
> Confermi?

Semantica equivalente al delete (§6.67): stesso pattern UX, stessa conseguenza (dose visibile sparisce, log storico resta).

**Trade-off dichiarato:** scelta consapevole di non implementare validator "data_fine >= data_ultima_presa" per evitare complessità aggiuntiva su edge case raro. Coerenza interna con §6.67 ha priorità su protezione pre-save. Retrofit validator eventualmente in Fase 2 polish (Step 11) se emerge confusione utente.

**Nota:** `data_inizio` nel passato è semanticamente corretto (es. utente crea il farmaco "Medrol" oggi ma ha iniziato il ciclo 3 giorni fa; la backfill non genera log per i giorni passati — il plan parte da today comunque, perché `init()` carica log esistenti e il planBuilder produce entries prospettiche). `data_inizio` futuro è ammesso ma il planBuilder lo rispetta (farmaco non appare nel plan finché `today >= data_inizio`).

### 6.69 procedurale — Sanity check intestazione front-matter Changelog a ogni bump versione (Sessione 8-pre analisi-first, promozione N1)

**Contesto.** Durante il delivery v2.5.20 le righe 3 e 5 del file (`**Versione:**` e `**Ultima modifica:**`) erano rimaste ferme alla versione precedente 2.5.19 — il bump era stato applicato solo al blocco meta del corpo. L'utente ha rilevato la discrepanza ("il file scaricato riporta ancora 2.5.19"). Applicata hotfix in v2.5.20.1.

**Regola formalizzata.** A ogni bump di versione del `PharmaTimer_Changelog_Fase2.md`, le righe front-matter (`**Versione:** X.Y.Z` a riga 3, `**Ultima modifica:** DD mese YYYY` a riga 5) **devono essere aggiornate in parallelo** all'inserimento del nuovo blocco meta nel corpo. Nessun delivery Changelog è considerato completo se le due fonti di versione non sono allineate.

**Verifica automatizzabile** (facoltativa ma consigliata): `head -n 5 PharmaTimer_Changelog_Fase2.md | grep -E "^\*\*(Versione|Ultima modifica)"` confrontato con il `**Changelog versione X.Y.Z**` più recente del corpo.

**Classificazione:** deviation procedurale (pattern consolidato con §6.32, §6.60). Zero impatto sul codice.

### 6.70 procedurale — Sync Changelog KB Claude ↔ repo git, soft con soglia > 2 versioni (Sessione 8-pre analisi-first, promozione N2)

**Contesto.** In chiusura Sessione 8 analisi-first (22/04/2026) è emerso che il Changelog committato nel repo git era fermo a **v2.5.3** (commit `4f2669f` del 18/04, pre-Sessione 6), mentre la KB Claude era aggiornata fino a v2.5.19. Drift silenzioso di **17 versioni** (v2.5.4 → v2.5.20), con tutto il codice delle sessioni intermedie regolarmente committato ma il Changelog rimasto fuori git. Catch-up applicato con commit unico `2bf2373` del 22/04 (messaggio esplicita range v2.5.3 → v2.5.20).

**Regola formalizzata.** A ogni chiusura di sessione (analisi o esecutiva) che produce un bump del Changelog, valutare il commit del file in `~/Sviluppo/pharmatimer` con messaggio dedicato. **Se in una chiusura successiva emerge drift > 2 versioni** tra HEAD git e KB Claude, produrre commit catch-up esplicito (messaggio formato `Changelog catch-up vX.Y → vX.Z`) invece di fondere il delta con un commit feature.

**Versione soft con soglia.** La soglia > 2 evita commit spuri in sequenze di sessioni ravvicinate (es. analisi + esecuzione consecutive che bump il Changelog 2 volte in poche ore), mantenendo l'invariante *"la KB è eventualmente consistente col repo entro 2 bump"*.

**Classificazione:** deviation procedurale. Zero impatto sul codice.

### 6.71 Asimmetria `applyRecupero(key, 0)` vs reset `ora_ricalcolata`: fatto storico immutabile per Fase 2 (Sessione 8-pre analisi-first, Q1.c)

**Contesto.** Scoperto in CP browser Sessione 7d-2p3 (§22.3.1): dopo un recupero esteso che ricalcola `ora_ricalcolata` (es. 23:00 → 17:30), chiamare `applyRecupero(key, 0)` azzera `recupero_minuti` ma **non** ripristina `ora_ricalcolata` al valore pre-recupero. Anche `rebuildPlan` non la ricalcola.

**Semantica formalizzata.** Il dominio tratta `ora_ricalcolata` come **fatto storico persistito**: una volta scritta da `applyAssunzione`, `applyRecupero` o `applyRipristino`, il valore resta committed e non è ripristinabile al valore pre-scrittura. Chiamare `applyRecupero(key, 0)` azzera `recupero_minuti` e il gap effettivo ma **non modifica** `ora_ricalcolata`. Analogamente `rebuildPlan` non la ricalcola (coerente AMB-3: delta storici preservati).

**Motivazione del non-fix.** Un "reset path" richiederebbe una di queste opzioni, tutte fuori scope Fase 2:
1. **Tracking storico esplicito** (nuovo campo `ora_ricalcolata_originale` distinto da quello attuale, aggiornato solo dal primo scrivente). Invasivo sul modello, richiede migration dati esistenti
2. **Ricostruzione post-hoc da `log_assunzioni`**. Accoppiamento dominio→repo (il dominio è puro), dipendenza dalla retention (§6.73), uso creativo del log non previsto
3. **Rebuild parziale da `applyAssunzione` upstream**. Stesso problema del rebuildPlan globale (costoso, perde delta di altre prese)

**Invisibilità UX.** Nessuna modale UI espone esplicitamente "reset recupero" come affordance dedicata. `ora_ricalcolata` stessa è invisibile a livello utente (la UI mostra `ora_effettiva` per dosi `presa`). L'asimmetria non emerge in uso reale. §22.3.1 lo conferma esplicitamente.

**Coerenza con pattern consolidati.** Coerente con §6.48 (ephemeral prompt accettato) e §6.17 (causality non tracciata sul modello). Non è estensione generalizzabile a una famiglia "reset path": il revert di una `presa` via `applyAnnullaAssunzione` è semanticamente diverso (ha valore originale ben definito `null`, vedi §6.14).

**Revisione futura.** Solo se emerge use case Fase 3+ che richieda storicizzazione esplicita di `ora_ricalcolata_originale`. Fuori scope Fase 2.

**Impatto.** Zero codice da scrivere, zero test nuovi. Promozione formale di §22.3.1.

### 6.72 `presoStack` rehydration + window log init estese a `PLAN_DAYS_BEFORE` (Sessione 8-pre analisi-first, Q2.a + Q2.b) — *supersedes §6.40 scope*

**Contesto.** §6.40 (Sessione 7d-2p1) aveva introdotto la rehydration di `presoStack` al mount del Provider via `repo.getLogByDataStato(today, 'presa')` — **day-scoped**. Scenario scoperto in analisi 8-pre: se l'app viene aperta alle 00:05 dopo mezzanotte e ieri aveva N prese registrate, lo stack è vuoto e le Card di ieri (visibili scrollando backward nella timeline) non hanno affordance UNDO direct. Rottura UX evidente su tap PRESA errato subito pre-mezzanotte.

**Decisione (Q2.a+b).** Estendere la rehydration al range **`[today - PLAN_DAYS_BEFORE, ..., today]`**, coerente con la window del plan backward. Ogni Card visibile nella timeline ha UNDO direct disponibile. Simmetria totale: nessuna affordance "solo su oggi".

**Implementazione attesa in Sessione 8-pre implementativa.**
- `actions.init()`: sostituisce `repo.getLogByDataStato(today, 'presa')` con caricamento multi-giorno. Opzione preferita: `repo.getLogByRange(startDate, endDate, {stato:'presa'})` se l'API esiste con filter stato; altrimenti loop sequenziale di `getLogByDataStato` sui `PLAN_DAYS_BEFORE + 1` giorni
- `SET_PRESO_STACK` reducer: atteso già accetti array keys (verifica CP0)
- Dominio `applyAnnullaAssunzione` **invariato**: data-agnostic, non distingue `entry.dateStr === today` vs `!== today`
- Guard `DOWNSTREAM_USER_EDITS` (§6.61) **invariata**: statechart-based, non time-based, funziona cross-day

**Costo.** Trascurabile: IndexedDB locale, 1 query range o ~3 query sequenziali. Volume atteso: ~15-45 keys max nello stack (3 giorni × ~5-15 prese/giorno).

**Flag CP0 apparente drift `PLAN_DAYS_BEFORE`.** §15 (post-5b-2) registra `PLAN_DAYS_BEFORE=1`. Il riferimento v2.5.20.1 §11 parla di `PLAN_DAYS_BEFORE=2`. Il valore reale in `src/domain/constants.js` determina l'ampiezza effettiva della window §6.72. **CP0 obbligatorio**: `cat src/domain/constants.js | grep PLAN_DAYS` in apertura 8-pre implementativa; se necessario rettificare §6.72 con valore corretto.

**Cap stack.** Non dichiarato in §6.40 né §13/D11 (dove presoStack è definito "ephemeral, non persistito"). CP0 8-pre implementativa: verificare se un cap esiste nel reducer/initialState (`grep -n 'presoStack' src/state/reducer.js`). Se esiste e risulta ≤10, ricalibrare (rimuovere o aumentare a 50). Se non esiste, nessuna azione.

**Supersedes §6.40.** La §6.40 originale rimane in archivio come contesto storico; §6.72 è l'invariante operativa da v2.5.21+. Coerente con pattern consolidato (§6.32 ha superseded §6.28 implicitamente, §6.60 è estensione procedurale di pattern precedenti).

**Test attesi.** +2-3 in test file init: (a) ieri ha presa, today no → key yesterday nello stack; (b) altroieri ha presa, ieri+today no → key altroieri nello stack; (c) cross-day empty → stack vuoto.

### 6.73 Retention `log_assunzioni`: out-of-scope Fase 2, deferita a Step 9+/Fase 3 (Sessione 8-pre analisi-first, Q2.c)

**Contesto.** Il repo IndexedDB accumula `log_assunzioni` indefinitamente; non esistono cleanup automatici né API `deleteLogsOlderThan`. Ogni `apply*` scrive 1-2 log via `upsertLogsBatch` (§6.22). API disponibili per lettura by range: `getLogByRange`, `getLogByData`, `getLogByDataStato`. Nessuna API di delete by age.

**Stima volumi.** Utente tipico 2-5 farmaci × 1-4 dosi/giorno = ~5-15 entries/giorno. Con overhead correttivi ~20% → ~6-18 entries/giorno. Ordine: **~200-500 righe/mese**, **~2.5K-6K righe/anno**, ~1-2 MB/anno. Quota IDB browser tipica 50-500 MB → margine pluriennale.

**Performance.** Query `getLogByRange` su IDBCursor resta O(n) ma con indice ottimizzato Dexie; <50ms attesi su volumi fino a ~50K righe. Nessun bottleneck atteso.

**Decisione (Q2.c).** **Out-of-scope Fase 2.** Motivazioni:
1. Nessun problema reale nel perimetro Fase 2: volume e performance OK su orizzonti pluriennali
2. Retention automatica = cancellazione silenziosa dati utente, rischio UX. Va preceduta da Export (Step 10, non ancora implementato) come fallback esplicito
3. Step 9+/Fase 3 hanno contesto migliore: la vista Log (Fase 3) mostrerà all'utente cosa sta accumulando; feedback reale guida la policy
4. Backend FastAPI+MariaDB (fase ulteriore) cambia la storia: retention serverside config-driven è design differente da IDB locale

**Implicazioni immediate.**
- Nessun metodo repo `deleteLogsOlderThan` in Fase 2
- Nessun thunk `cleanupOldLogs` in `actions.js`
- Nessuna affordance UI in 8a ImpostazioniTab ("Pulisci log" = fuori scope)
- Utente che oggi voglia cancellare manualmente: azione Dev via IDB Inspector (non documentata, non esposta)

**Coerenza con pattern deferral.** §6.17 (annullaAssunzione auto-skippate), §6.18 (`ora_ricalcolata` cross-midnight), §6.26 (cross-midnight UI) sono precedenti consolidati di "limitazione accettata, risolta in step successivo".

**Revisione.** Step 9+ o Fase 3, guidato da (a) feedback utente su dimensioni IDB percepite, (b) disponibilità Export come preconditon per cancellazione sicura, (c) decisione backend timing.

### 6.74 Reset completo campi N+1 in `applyAnnullaAssunzione` — NON CONSUMATA (Sessione 8-pre implementativa, CP0.5 Esito A)

**Stato:** Riservata in v2.5.21 per eventuale Esito B al CP0.5 della Sessione 8-pre implementativa. **Non consumata** in sessione esecutiva: CP0.5 ha verificato Esito A pieno (tutti e 5 i campi `ricalcolata` + `stato` resetati correttamente nel corpo di `applyAnnullaAssunzione` già dalla Sessione 7d-2p2 CP4). `src/domain/recalc.js` immutato in 8-pre. `src/domain/recalc.test.js` immutato in 8-pre.

**Evidenza CP0.5** (body `applyAnnullaAssunzione` ramo `nextDose.stato === 'ricalcolata'`): il dictionary mutation già contiene `ora_ricalcolata: null, ora_ricalcolata_originale: null, gap_minuti: 0, gap_originale: 0, recupero_minuti: 0, dose_prec_saltata: false, stato: 'prevista'`.

**Classificazione:** slot numerico §6.74 resta assegnato ma vuoto per preservare continuità numerica delle §6.75+. Pattern coerente con precedenti riservati-non-consumati nel Changelog.

### 6.75 Reuse `logAssunzioni` in `init()` per rehydration `presoStack` (Sessione 8-pre implementativa, ottimizzazione §6.72)

**Contesto.** §6.72 richiede di rehydrate `presoStack` con le keys dei log `presa` nella window `[today - PLAN_DAYS_BEFORE, today]`. Il prompt §11 v2.5.21 CP1 step 1 proponeva 3 opzioni, tutte basate su **query dedicata** al repo (opzione 1: `getLogByRange(start, end, {stato:'presa'})` se filter supportato; opzione 2: loop `getLogByDataStato(d, 'presa')` su N giorni; opzione 3: `getLogByRange(start, end)` + in-memory filter).

**Scoperta CP0.6.** `IRepository.getLogByRange(dataDa, dataA)` non accetta parametro filter (opzione 1 non applicabile). Scelta tra opzione 2 (loop) e opzione 3 (range + filter).

**Scoperta CP0.4+.** A riga 115 di `src/state/actions.js` `init()` chiama già `repo.getLogByRange(startDate, endDate)` con range `[today - PLAN_DAYS_BEFORE, today + PLAN_DAYS_AFTER]` per costruire il `plan` via `buildMultiDayPlan`. Questo range **contiene come superset semantico** la window `[today - PLAN_DAYS_BEFORE, today]` richiesta per `presoStack`. L'array `logAssunzioni` risultante è già in scope al momento della rehydration.

**Decisione (Opzione A).** Riusare `logAssunzioni` con filter in-memoria:

```js
const startPresoDate = addDays(today, -PLAN_DAYS_BEFORE);
const presaLogsInWindow = logAssunzioni.filter(
  (l) => l.stato === 'presa' && l.data >= startPresoDate && l.data <= today
);
dispatch({ type: 'SET_PRESO_STACK', payload: presaLogsInWindow.map(logRowToEntryKey) });
```

**Motivazioni:**
1. **Zero query IndexedDB extra** (vs stato pre-8-pre: 1 query `getLogByDataStato` a riga 153; vs opzione 2/3 letterali del prompt §11: 1 query dedicata nuova). Round-trip risparmiato.
2. **Simmetria window garantita**: lo stesso array che alimenta `buildMultiDayPlan` alimenta la rehydration. Nessun rischio di divergenza temporale tra query plan e query stack (scenario: today che cambia tra le due chiamate al clock).
3. **Guard esplicito `data <= today`**: difensivo contro presunti `presa` dated nel futuro (teoricamente impossibili, ma `logAssunzioni` include `PLAN_DAYS_AFTER`).
4. **Sort order preservato**: `repo.getLogByRange` ritorna ASC per `(data, ora_effettiva)`; il filter preserva l'ordine; LIFO convention (`top = stack.at(-1) = most recent press`) intatta.

**Deviazione dichiarata.** Micro-deviazione rispetto al letterale del prompt §11 v2.5.21 (che presumeva query dedicata). Non deviazione dalla spec PharmaTimer_Project_Spec.md. Categorizzata come **ottimizzazione** con maggiori garanzie di coerenza.

**Implicazioni sui test.** `repo.getLogByDataStato` **non è più chiamato da `init()`** post-8-pre. Il test file `src/state/actions.init.test.js` è stato riscritto di conseguenza: i 3 test pre-8-pre (scoped "today only" via `getLogByDataStato`) rimpiazzati da 6 test cross-day via `getLogByRange`. Nuovo invariante di test: `expect(repo.getLogByDataStato).not.toHaveBeenCalled()`.

**Coesistenza con §6.72.** §6.75 implementa §6.72; non la sostituisce. §6.72 resta la deviazione architetturale (estensione della window da day-scoped a cross-day); §6.75 ne è la realizzazione operativa ottimizzata.

### 6.76 procedurale — Fix §3 struttura progetto: rimozione `OrariTab.jsx` fantasma (Sessione 8a analisi-first, scoperta collaterale)

**Contesto.** Durante la ricognizione KB per 8a analisi-first, rilevato che §3 "Struttura del progetto" (riga 451 pre-fix) elencava ancora:

```
│   │   └── config/
│   │       ├── ConfigView.jsx          # [Step 8]
│   │       ├── ProfiliTab.jsx          # [Step 8]
│   │       ├── FarmaciTab.jsx          # [Step 8]
│   │       ├── OrariTab.jsx            # [Step 8]
│   │       └── forms/                  # [Step 8] 3 form
```

La riga `OrariTab.jsx` contraddice §6.65 (Sessione 8 analisi-first, v2.5.20): *"Nessun tab Orari separato (decisione Q5.c): gli orari vivono solo nested in FarmaciTab"*. Drift documentale silente tra §3 (pre-8) e §6.65 (v2.5.20).

**Hotfix inline applicato** in 8a analisi-first: riga `OrariTab.jsx` rimossa dalla tabella §3. Struttura attesa post-Fase 2 per cartella `config/`:

```
│   │   └── config/
│   │       ├── ConfigView.jsx          # [Step 8a]
│   │       ├── ProfiliTab.jsx          # [Step 8b]
│   │       ├── FarmaciTab.jsx          # [Step 8c]
│   │       ├── ImpostazioniTab.jsx     # [Step 8a]
│   │       ├── ConfigTabBar.jsx        # [Step 8a]
│   │       └── forms/                  # [Step 8b+8c] form profilo + farmaco
```

**Classificazione:** procedurale (pattern §6.32, §6.60, §6.69, §6.70). Zero impatto codice — solo KB grooming.

**Lezione.** Aggiornare §3 quando una decisione architetturale in §6.NN altera la struttura prevista. Candidato check in prompt §11 futuri che introducono nuovi file: "verifica coerenza §3 vs decisioni §6.NN recenti".

### 6.77 Cleanup retroattivo mirror `state.nomeUtente` → `impostazioni.nome_utente` (Sessione 8a analisi-first, promozione §17 "Limitazioni note" punto 2)

**Contesto.** §17 (Stato post-Sessione 7a) "Limitazioni note" punto 2: *"Mirror legacy `nomeUtente`. Resta come duplicato di `state.impostazioni.nome_utente`. Non è tecnicamente necessario [...] ma l'ho lasciato per retrocompatibilità con i 24 test esistenti di `reducer.test.js` e con consumer hardcoded futuri. Rimozione rinviata a Step 8 (ConfigView) dove il refactor ha consumer naturale."*

Step 8 è arrivato. ImpostazioniTab (AMB-C) introduce il consumer naturale: la form Nome scrive su `impostazioni.nome_utente` via `setSetting('nome_utente', v)`. Mantenere il mirror significa o duplicare il dispatch (fragile) o accettare che `state.nomeUtente` resti desincronizzato. Nessuna opzione accettabile per build pulita.

**Decisione.** Rimuovere il mirror in **8a implementativa CP4** (contestuale all'introduzione ImpostazioniTab Nome):

1. `src/state/reducer.js`: rimuovere campo `nomeUtente` da `initialState`; rimuovere case `SET_NOME_UTENTE` (se esiste come action separata); `INIT_SUCCESS` non popola più `nomeUtente`.
2. `src/state/actions.js`: `init()` non deriva più `nomeUtente` da `impostazioni.nome_utente`; `setSetting('nome_utente', v)` non dispatcha più il mirror `SET_NOME_UTENTE`; rollback su errore repo semplificato (solo `SET_IMPOSTAZIONE` rollback).
3. Consumer: switch a `selectImpostazione(state, 'nome_utente')` (selector introdotto in §17).
4. Test esistenti che leggono `state.nomeUtente`: rifattorizzare su selector.

**CP0 gate (AMB-G, rettifica F3).** `grep -rn "nomeUtente\|state\.nomeUtente" src/` deve restituire ≤2 consumer attesi (reducer + header Oggi, più i rispettivi test file). Se >2 (consumer non atteso in componenti 7b/7c/7d), branch alternativo:
- **Branch cleanup split:** include tutti i consumer in 8a CP4 (accetta +1-2 test cascade); target AMB-J ricalibrato +19-20.
- **Branch defer:** 8a lascia il mirror intatto (AMB-G sospesa), ripropone cleanup in 8d polish. Candidato §6.77 ri-aperta.

**Test attesi:** +1 test di regressione su selettore `selectImpostazione('nome_utente')` che conferma la derivazione dal dict; test esistenti (reducer `SET_IMPOSTAZIONE`, useTheme consumer pattern, etc.) restano verdi senza modifiche.

**Invariante consumer UI.** Header Oggi mostra saluto "Ciao, {nome}" (pattern mockup v5): il switch al selector deve preservare il rendering (include fallback esplicito a stringa vuota — mai `undefined` in UI).

**Classificazione:** cleanup retroattivo (pattern §6.24, §6.48). Zero effetto runtime osservabile dall'utente finale — è refactor interno su data shape.

---

## 6.78 — AMB-A interpretazione: `<TabPlaceholder>` inline vs componenti standalone

**Sessione:** 8a implementativa (CP2, 23/04/2026).

Il prompt §11 v2.5.23 prescriveva `<TabPlaceholder title="Profili" />` inline in ConfigView per le tab non-impostazioni. Il filesystem a inizio 8a implementativa conteneva già `ProfiliTab.jsx`, `FarmaciTab.jsx`, `OrariTab.jsx`, `forms/{FarmacoForm,OrarioForm,ProfiloForm}.jsx` come stub `return null;` da 16/04/2026 (scaffold §3 iniziale).

**Deviazione applicata.** CP2 ha sovrascritto i 3 tab standalone (Profili, Farmaci, Impostazioni) con placeholder funzionali minimi (testid `config-tab-*` stabile CP2→8c) e li ha importati in ConfigView. `<TabPlaceholder>` inline non è stato introdotto.

**File fuori-scope AMB-A preservati:** `OrariTab.jsx` + `forms/*.jsx` non nominati in AMB-A sono stati lasciati in-situ come stub `return null`. Cleanup pianificato 8d polish.

**Motivazione.** Evitare file orfani (non importati) in 8a-8c. Stabilizzare tag name per i test routing (CP2 ConfigView.test.jsx asserta tramite testid sui componenti standalone). Zero-risk rewrite — gli stub non avevano logica da preservare.

**Classificazione:** interpretazione favorevole di AMB-A, zero impatto comportamentale.

---

## 6.79 — `renderWithRealProvider.jsx` NON esteso in CP2

**Sessione:** 8a implementativa (CP2, 23/04/2026).

AMB-8a.H + rettifica F5 prevedevano l'estensione di **entrambi** i test helper (`renderHelpers.jsx` e `renderWithRealProvider.jsx`) con parametro opzionale `initialEntries` per wrap condizionale `MemoryRouter`.

**Deviazione applicata.** CP2 ha esteso solo `renderHelpers.jsx`. `renderWithRealProvider.jsx` (313 righe, 10 consumer OggiView E2E) è stato lasciato invariato.

**Motivazione.** I 4 nuovi test ConfigView (routing + redirect) non richiedono AppProvider reale con init thunk — bastano MemoryRouter + stub context di `renderHelpers`. Estendere anche `renderWithRealProvider` in CP2 sarebbe stato scope-creep con rischio regressione sui 10 OggiView E2E tests.

**Posticipo.** L'estensione di `renderWithRealProvider.jsx` verrà applicata in 8b se un test lo richiederà; altrimenti resta deferita senza prescrizione specifica.

**Classificazione:** scope-creep evitato, AMB-H applicata parzialmente con motivazione documentata.

---

## 6.80 — Dipendenza dev `@testing-library/user-event` aggiunta

**Sessione:** 8a implementativa (CP3, 23/04/2026).

Il primo tentativo di esecuzione dei test CP3 (`ConfigTabBar.test.jsx`) è fallito con errore Vite `Failed to resolve import "@testing-library/user-event"`. La dipendenza non era presente in `package.json` nonostante AMB-8a.I del §11 prescrivesse esplicitamente `userEvent click-driven` per i test di navigazione.

**Deviazione applicata.** Installata `@testing-library/user-event@^14.6.1` come devDependency via `npm i -D`.

**Motivazione.** AMB-8a.I letterale richiede `userEvent`. Evita di introdurre `fireEvent.click` come pattern alternativo che sarebbe stato meno fedele a gesture reali e avrebbe creato incoerenza con i test futuri 8b/8c (che useranno userEvent per form input).

**Note.** La dipendenza non era presente nel baseline codebase perché i 269 test pre-CP3 usavano esclusivamente `@testing-library/react` + `screen` (nessun click-driven). Pattern storico del progetto: dep aggiunte just-in-time quando necessarie.

**Classificazione:** nuova dep dev, documentata retroattivamente.

---

## 6.81 — ConfigTabBar inactive color troppo scuro in dark mode (candidate 8d)

**Sessione:** 8a implementativa (CP browser Punto 1, 23/04/2026).

Durante la verifica CP browser è emerso che le tab inattive di ConfigTabBar appaiono poco leggibili in dark mode. Il colore applicato è `navInactive` che in dark vale `#4A4854` (warmGray-700), con contrast ratio marginale su `headerBg` dark (`#15141A` → ratio ~2.3:1, sotto soglia WCAG AA non-text 3:1).

**Stato.** Non corretto in 8a. Candidate per 8d polish con revisione palette (possibile aggiunta token dedicato `subTabInactive` con lift dark).

**Motivazione deferral.** Non blocker funzionale. Richiede design review coerente con eventuali altre sub-tab bar future (Farmaci filter bar, ProfiliTab sub-tabs, ecc.).

**Classificazione:** a11y polish, non-blocker.

---

## 6.82 — SezioneNome input non rehydra post idle→ready (fix applicato)

**Sessione:** 8a implementativa (CP browser Punto 3, 23/04/2026).

Durante CP browser è emerso che il campo Nome non mostrava il valore persistito dopo refresh. Diagnosi via DevTools Console: `state.impostazioni.nome_utente = 'Roberto test'` ma `document.getElementById('impostazioni-nome').value = ''`.

**Root cause.** `useState(nomeAttuale)` in `SezioneNome` inizializza una sola volta al mount. Al primo render `state.status === 'idle'`, `impostazioni = {}`, quindi `nomeAttuale = ''` e `useState('')` fissa value=''. Quando `init()` completa e lo state aggiorna a `ready` con valore persistito, il componente re-renderizza ma `useState` non si re-inizializza.

**Fix applicato (hotfix intra-sessione).** Aggiunto `useEffect(() => { setValue(nomeAttuale); }, [nomeAttuale])` in `SezioneNome` per sincronizzare il controlled state locale con la source-of-truth. Non è ciclo infinito: post-save `nomeAttuale === value.trim()` (quasi sempre) → setValue no-op.

**Coverage test.** Nessun test automatico ha catturato il bug (i test passano mock di `stateOverrides` con `impostazioni.nome_utente` già popolato dal primo render). Gap noto — test che esercitano il pattern idle→ready per componenti Config potrebbero essere aggiunti in 8b (pattern riusabile per `ProfiliTab` edit form).

**Classificazione:** bug UX runtime scoperto in CP browser, fix immediato inline.

---

## 6.83 — Button Salva layout shift orizzontale (fix applicato)

**Sessione:** 8a implementativa (CP browser Punto 3, 23/04/2026).

Durante l'edit del campo Nome con hint "Il nome non può essere vuoto" presente, il bottone Salva appariva sotto il campo. Quando l'hint spariva (dopo primo carattere digitato), il bottone si spostava a lato destro dell'input causando disorientamento.

**Root cause.** Button element è `display: inline-block` di default HTML. Con `<p>` block presente tra input e button, il `<p>` forza linebreak. Senza `<p>`, il button inline-block si affianca all'input.

**Fix applicato (hotfix intra-sessione).** Aggiunta class Tailwind `block` al bottone Salva: `className="block mt-3 px-4 py-2 rounded border disabled:opacity-50"`. Il bottone resta ora sempre in block layout, sotto l'input, indipendentemente dalla presenza del hint.

**Classificazione:** layout bug cosmetico, fix trivial 1-word CSS.

---

## 6.84 — React Router 6 future flag warnings (candidate 8d)

**Sessione:** 8a implementativa (CP browser Punto 4c, 23/04/2026).

Durante l'uso del dev server la Console browser mostra 2 warning ripetuti:
```
React Router Future Flag Warning: React Router will begin wrapping state updates in React.startTransition in v7
React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7
```

**Stato.** Non corretto in 8a. Non impatta comportamento runtime attuale. Richiede scelta: opt-in ora con `future` flag su `BrowserRouter` o attendere migrazione React Router 7.

**Motivazione deferral.** Nessun impatto funzionale su 8a. Da inquadrare in contesto più ampio (eventuale migrazione `BrowserRouter` → `createBrowserRouter` + DataRouter per abilitare `useBlocker` correttamente — vedi §22.6 nota su unsaved changes inline workaround).

**Classificazione:** deprecation warning, candidate 8d polish.

---

## 6.85 — Anomalia `nome_utente` azzerato a DB durante CP browser 4→5 (non riprodotta)

**Sessione:** 8a implementativa (CP browser Punto 5, 23/04/2026).

Tra il completamento del Punto 3 (Nome `'Roberto test'` correttamente persistito in DB, verificato via Console) e l'inizio del Punto 5 (modal unsaved changes), il valore in DB è stato trovato azzerato a stringa vuota: `impostazioni_app.get('nome_utente') = {chiave: 'nome_utente', valore: ''}`.

**Diagnosi in-session.** Ispezionati i path che possono scrivere a `nome_utente`:
- Toggle tema header in OggiView: scrive solo `setSetting('tema', ...)`, verificato.
- `SezioneNome.handleSave`: scrive `setSetting('nome_utente', trimmed)` ma gated da `canSave = dirty && trimmed.length > 0` — non scrive `''` se bottone disabled.
- `actions.setSetting` rollback path: dispatches `valore: prevValore` in caso di error da `repo.setSetting`. Il `prevValore` su `nome_utente` era `'Roberto test'`, quindi rollback avrebbe restaurato, non azzerato.

**Mancanza logs runtime.** Zero strumentazione attiva durante CP browser → impossibile ricostruire la sequenza causa-effetto.

**Test automatici.** 269/269 passano. Il bug non è catturato dai test esistenti, ma nemmeno riprodotto localmente.

**Ipotesi work-in-progress:**
1. `__pt.wipe()` invocato accidentalmente (dev helper disponibile in Console), seguito da re-seed che mette `nome_utente: ''` di default + tema re-scritto dai test successivi. **Parzialmente coerente** (tema `'light'` sopravvissuto al wipe smentisce wipe integrale).
2. Race condition tra toggle tema rapido e altra azione.
3. Bug pre-esistente in un consumer legacy non identificato.

**Stato.** Non riprodotto. Test automatici verdi. Classificato come anomalia isolata da investigare in 8d con strumentazione logging (dispatcher intercept + Dexie hook).

**Classificazione:** anomalia runtime non riprodotta, candidate 8d investigation.

---

## 6.86 — Drawer modal-first: backdrop-click gated + tooltip span-wrap + z-index UnsavedChangesModal

**Contesto.** Sessione 8b CP5 CP browser rivela che UnsavedChangesModal (guard cross-tab ereditato da 8a) non appare quando l'utente modifica un campo del drawer ProfiloDrawer e poi clicca un altro tab della ConfigTabBar. Tre sotto-problemi intrecciati, risolti con fix incrementali (.1 -> .4) durante il CP browser.

**.1 — Backdrop-click close reset silenzioso dirty.** Scoperto: il backdrop `onClick` del drawer, come scritto in CP2, chiamava sempre `handleAnnulla` che faceva `setDirty(false)` prima della propagazione del click. Fix: gate `!isDirty`, backdrop no-op quando ci sono modifiche in corso.

**.2 — Tooltip su `<button disabled>` non renderizzato.** HTML sopprime il `title` attribute su button disabled (comportamento cross-browser). Fix: wrap in `<span title="...">` che riceve hover events al posto del button. Semantica a11y invariata (button resta `disabled`).

**.3 — Z-index UnsavedChangesModal == drawer.** Entrambi a `z-50`, il modal veniva occluso dal drawer. Fix: UnsavedChangesModal bumped a `z-[60]` (coerente con `ConfirmDeleteProfiloModal` introdotto in CP4). Pattern: modals di guard/conferma sempre sopra modals di editing.

**.4 — Scoperta finale: drawer modal-first by design.** Dopo i fix .1-.3, il guard UnsavedChangesModal continua a NON apparire via click manuale sul tab (conferma programmatica via `tab.click()` invece funziona). Root cause: il drawer ha `fixed inset-0 z-50` che copre l'intero viewport inclusa la tab bar. Il mouse reale clicca sul backdrop per hit-testing geometrico; il NavLink del tab non riceve eventi. Decisione di design: accettare che drawer aperto blocchi navigazione laterale (pattern modal-first standard iOS/Material/Figma/Notion). Il guard UnsavedChangesModal di ConfigView opera solo per ImpostazioniTab (dove non c'è modal sovrapposto). Il fix .1 resta come cintura difensiva (anti-accidental-dismiss) anche se il razionale originale anti-tab-conflict non si applica.

**File toccati:** `src/components/config/ProfiliTab.jsx` (.1 + .2 + .4 commento), `src/components/config/UnsavedChangesModal.jsx` (.3).

**Test delta:** 0 (tutti i fix sono UX behavior non coperti da test unitari esistenti; CP browser ha servito da validation).

---

## 6.87 — Convenzione: file test thunk split-per-concern

**Contesto.** Sessione 8b CP3 scopre che i test thunk in `src/state/` seguono un pattern split-per-concern: `actions.init.test.js` (6 test init), `actions.annullaAssunzione.test.js` (2 test undo). Non esiste un `actions.test.js` monolitico.

**Decisione.** Nuovo file `actions.profili.test.js` (6 test: add success + error, update con guard + rebuild, delete success + error, attivaProfilo wrapper) coerente con il pattern esistente. Convenzione applicabile a ogni futura famiglia di thunk (es. 8c farmaci -> `actions.farmaci.test.js`).

**Razionale.** File focus singolo <200 righe, discovery più veloce su failing test, parallelizzazione Vitest più efficace. Costo: nessuno — import ripetuto `createActions` è trascurabile.

**Non è deviazione dalla specifica** ma osservazione operativa meritevole di entry §6 per prevenire regressione a file monolitico in sessioni future.

---

## 6.88 — Rimozione campo `attivo` dal form farmaco (8c CP3)

**Contesto.** §6.66 (Sessione 8 analisi-first) includeva `attivo` tra i campi editabili del form farmaco sezione "Avanzate". AMB-8c.H (Sessione 8c analisi-first, §22.9) ha rettificato la scelta con rettifica F1: il campo resta in schema DB (necessario per infrastruttura filtering post-flip `GET_FARMACI_SOLO_ATTIVI`) ma **non è editabile in UI**.

**Decisione.** In CP3 8c impl, il form FarmacoDrawer omette `attivo`. Soft-delete (§6.67) diventa unico canale user-level di disattivazione. Con `GET_FARMACI_SOLO_ATTIVI=true` post-flip CP1 e farmaci inattivi non visibili in FarmaciTab lista, un checkbox "Attivo" nel form sarebbe alias funzionale nascosto di delete senza i suoi safeguard (ConfirmModal + copy §6.67 + `rebuildPlan` esplicito).

**Razionale.** Consistenza con principio "un solo canale per operazione destructive": delete via bottone dedicato con conferma, non via toggle nascosto in un form CRUD. Se in futuro emerge caso d'uso "disattiva temporaneamente senza eliminare" (es. sospensione terapia su farmaco cronico con intenzione di riprendere), sarà feature "pausa" separata in Log Fase 3, **non** ripristino del campo in form.

**Schema DB invariato.** Il flag resta come infrastruttura per `WHERE attivo=1` del repo.

**Consumatori impattati.** Solo `FarmaciTab.jsx` → `FarmacoDrawer` → sezione Avanzate. Commento inline nel codice riporta §6.88.

---

## 6.89 — ConfirmModal promozione 2° consumer (consumata parzialmente in 8c-2)

**Contesto.** AMB-8b.H (Sessione 8b) fissava la regola "promozione `ConfirmModal` shared al 2° tab consumer". Rettifica F3 (Sessione 8c analisi-first, §22.9) interpreta "2° consumer" in senso più sfumato: in FarmaciTab il modal è consumato in 2 scenari distinti dello stesso tab (delete + data_fine-past), rendendo la promozione contestuale più efficiente della duplicazione inline.

**Status.** **Consumata parzialmente** in Sessione 8c-2 CP5 (commit `dda9af7`): `src/components/shared/ConfirmModal.jsx` creato + FarmaciTab lo consuma in entrambi i flow (delete §6.67 + data_fine-past §6.68). ProfiliTab (`ConfirmDeleteProfiloModal` inline) NON ancora retrofit al nuovo shared — resta candidato 8d.

**Asimmetria temporanea.** Vedi §6.92 (il nuovo ConfirmModal monta `useModalA11y` mentre il predecessore ProfiliTab inline no; retrofit simultaneo in 8d).

---

## 6.90 — `SET_FARMACI` case + test preesistenti da Sessione 8a CP4 (§6.77 cleanup)

**Contesto.** CP0 di 8c impl (gate 3c "naming clash check") ha rivelato che `reducer.js:161` e `reducer.test.js:201` già contenevano il case `SET_FARMACI` + test previsti da AMB-8c.E + CP5 punto 3 del prompt §11 v2.5.27.

**Origine.** Introdotti in Sessione 8a CP4 (§6.77 "nomeUtente mirror removal") come "full-list replacement pattern" template insieme a `SET_ORARI`. Il commento `reducer.js:168` ne fa cenno esplicito. Non catturati dall'analisi 8c (§22.9) che aveva scope AMB-only e non riesaminava il reducer post-8a.

**Effetto operativo.** CP5 punto 3 del prompt §11 v2.5.27 degenera in no-op (conformità già verificata). Δ test CP5 atteso +12 → +11 effettivi. Target finale 8c rivisto **309±3 → 308±3**.

**Nessuna azione correttiva sul codice.** Solo documentale. Precedente analogo: §6.60 (drift-preventive scoperta hotfix in-session).

**Lezione.** Le analisi-first hanno scope AMB ma possono cieche a infrastruttura già in place. In 8d considerare regola procedurale: "gate CP0 deve grep-check ogni action type dichiarato come NEW nell'analisi, per intercettare preesistenze".

---

## 6.91 — Badge "Temporaneo" usa `t.orange` (non `amber` letterale AMB-8c.A)

**Contesto.** AMB-8c.A (Sessione 8c analisi-first) specificava testualmente "badge cronica verde / **temp amber**" per `FarmacoCard`.

**Decisione.** In CP2 8c impl, il badge usa token `t.orange` invece di `t.amberBg/amberTx`. Rationale: `theme.js` espone **terna** `orange/orangeBg/orangeTx` simmetrica a `green/greenBg/greenTx` usata da `ProfiloCard` per "Attivo", mentre `amber` ha solo `amberBg/amberTx` partials (no token base). Usare `amber` richiederebbe 2 access al theme (Bg+Tx) senza colore primario coerente per il border-left e il font del badge stesso.

**Differenza visiva.** Orange (`#FB923C` dark / `#C2410C` light) è leggermente più rosso rispetto all'amber (`#FEF3C7`/`#92400E`). Percezione: indistinguibile nel contesto "warning non-critico / temporaneo".

**Impatto.** Nominalismo visuale; zero impatto funzionale/semantico.

**Alternative valutate.** Introdurre token `amber` base in theme.js (scope creep); tornare letteralmente ad amber partials (architettura inconsistente). Scelta utente confermata: opzione A (orange, consigliata).

---

## 6.92 — `ConfirmModal` shared monta `useModalA11y` (asimmetria con predecessore ProfiliTab)

**Contesto.** Il prompt §11 v2.5.28 CP5 punto 2 dichiarava: «useModalA11y + focus trap ereditati da `ConfirmDeleteProfiloModal`». Ma il predecessore in ProfiliTab (inline 8b CP7, §6.86.3) NON monta `useModalA11y` — commento pregresso `ProfiliTab.jsx:509` "ZERO focus-trap (deferred to 8d polish)".

**Decisione.** Nel nuovo `src/components/shared/ConfirmModal.jsx` (8c-2 CP5) **monto** `useModalA11y` (focus-trap + Escape-to-close + restore-focus), aderendo alla lettera del prompt + a11y migliore. Asimmetria temporanea con `ConfirmDeleteProfiloModal` accettata. (AMB-8c-2.B opzione A consigliata, ratifica "Decidi tu".)

**Retrofit previsto.** 8d polish — migrazione `ConfirmDeleteProfiloModal` → `ConfirmModal` shared (§6.89 parte 2) risolve automaticamente anche l'asimmetria a11y (pattern replica da 8c-2).

**Alternative valutate.** Opzione B: replicare pattern minimale senza focus-trap per parità con predecessore → regressione a11y + divergenza dal prompt letterale. Respinta.

---

## 6.93 — Thunks farmaci rifetch anche `orari` oltre a `farmaci`

**Contesto.** Il prompt §11 v2.5.28 CP5 punto 5 descriveva il post-commit dei 3 thunks come «dispatch `SET_FARMACI` (rifetch) → `rebuildPlan()`». Non menzionava rifetch/dispatch `SET_ORARI`.

**Problema.** `rebuildPlan` legge `state.orari` per costruire il multi-day plan. Dopo `replaceOrariForFarmaco(farmacoId, orari)` lo state.orari è stale; un rifetch solo farmaci produrrebbe un piano basato su timing pre-edit.

**Decisione.** I 3 thunks `addFarmaco / updateFarmaco / deleteFarmaco` fanno refetch **parallelo** di `repo.getFarmaci({soloAttivi}) + repo.getAllOrari()` e dispatchano sia `SET_FARMACI` sia `SET_ORARI`. Il reducer `SET_ORARI` è già preesistente (introdotto in 8a CP4 alongside `SET_FARMACI`, ref §6.90 contesto esteso). (AMB-8c-2.A opzione A consigliata, ratifica "Decidi tu".)

**Impatto.** Zero UX cost (rifetch parallelo); stato coerente dopo ogni mutation.

---

## 6.94 — `defaultNoopActions()` esteso con 3 thunks farmaci (scope-minimal)

**Contesto.** `src/test/renderHelpers.jsx::defaultNoopActions()` rappresenta un no-op action bag per test consumer di `renderWithProvider(component, {actions: {...overrides}})`. Pre-8c-2 copriva i 12 thunks canonici definiti in 7a/7b/7c/7d, ma NON era stato esteso con thunks aggiunti in 8a/8b (profili + annullaAssunzione).

**Decisione.** In CP5 8c-2 ho aggiunto i 3 thunks farmaci NUOVI (`addFarmaco`, `updateFarmaco`, `deleteFarmaco`) al bag no-op — simmetria per consumer futuri, zero TypeError nei test che omettono override espliciti. (AMB-8c-2.F "Decidi tu" ratifica implicita.)

**Scope creep evitato.** I thunks `addProfilo/updateProfilo/deleteProfilo/attivaProfilo/annullaAssunzione` mancanti **NON** sono stati retrofit in 8c-2 — estensione puramente ortogonale allo scope del prompt. Retrofit candidato 8d.

**Impatto test.** Zero shape-change sugli esistenti; zero test invalidati.

---

## 6.95 — Hotfix intra-CP6: `rebuildPlanFromFresh` nei thunks farmaci (stateRef-bypass)

**Scoperta.** CP6 CP browser punto 4 (Sessione 8c-2): dopo `addFarmaco({nome:"Test", ...}, [orario])` il nuovo farmaco risulta correttamente persistito in IDB + presente in `state.farmaci` + `state.orari` + presente nella lista `/config/farmaci`. Ma `/oggi` NON lo include: `plan entries Test oggi = 0`.

**Diagnosi.** Il thunk chiama `await rebuildPlan()` subito dopo `dispatch SET_FARMACI + SET_ORARI`. `rebuildPlan` usa closure `getState()` → `stateRef.current` (definito in `AppContext.jsx:55-57`) che è aggiornato in un `useEffect([state])` **un tick dopo** il dispatch. Risultato: nella stessa microtask chain del thunk, `rebuildPlan` opera su state stale che NON include il farmaco/orari appena scritti. Analogia diretta con la nota architetturale della memory utente: «React stateRef updates via useEffect one tick after dispatch».

**Fix.** Estratto helper privato nel factory actions:
```
async function rebuildPlanFromFresh({ farmaci, orari }) {
  const state = getState();
  if (!state.profiloAttivo) return;
  const today = selectToday(state);
  const startDate = addDays(today, -PLAN_DAYS_BEFORE);
  const endDate = addDays(today, PLAN_DAYS_AFTER);
  const logAssunzioni = await repo.getLogByRange(startDate, endDate);
  const plan = buildMultiDayPlan({
    profilo: state.profiloAttivo, farmaci, orari,
    logAssunzioni, startDate, numDays: PLAN_TOTAL_DAYS,
  });
  dispatch({ type: 'REBUILD_PLAN', payload: { plan, lastBuiltForDay: today }});
}
```
I 3 thunks passano `{farmaci, orari}` freschi (già in scope locale dopo il refetch parallelo) bypassando stateRef. `profiloAttivo` è letto da stateRef ma è stabile in questo contesto (non muta in transazioni farmaci).

**Nota architetturale.** `updateProfilo` (actions.js:464) ha il **pattern analogo** ma il bug non emerge perché il `profiloAttivo` aggiornato è spread nel payload di dispatch `APPLY_CAMBIO_PROFILO`, non letto da stateRef. Retrofit preventivo candidato 8d (coherence defence).

**Test sandbox invariati.** I mock `getState` sono closure su oggetto mutabile (non ref React), quindi gli scenari sandbox non riproducono il bug; 306/306 baseline invariata post-fix.

**Commit.** Separato da CP5 (`06dc680`), pattern 8b §6.70 drift-preventive per tracciabilità.

---

## 6.96 — Sticky separator `/oggi` top: 180px hardcoded (candidate 8d)

**Scoperta.** CP6 punto 4/5 browser (Sessione 8c-2): lo sticky data separator in `/oggi` ("Oggi · venerdì 24 aprile") appare posizionato ~180px dal top invece che ancorato alla base dell'header app.

**Diagnosi.** L'elemento sticky ha `computedStyle.top = '180px'` letterale. L'header app misura altezza variabile (timer hero + counters) e può essere più alto o più basso di 180px, generando gap visivo.

**Retrofit 8d.** Ancorare a CSS variable `--app-header-height` o usare observer dinamico. Non-blocker.

---

## 6.97 — DoseCard copy mismatch `indifferente` → "lontano dai pasti" (bug pregresso, candidate 8d) — CHIUSA in 8d-A CP3

**Stato:** ✅ **Chiusa in Sessione 8d-A CP3** (24/04/2026) — bug **non riproducibile** nel codice attuale. Vedi §6.101 per dettagli diagnosi (git blame commit `1c900064` del 19 apr 2026 conferma branch `indifferente` + early-return presenti dalla creazione del file). Aggiunto regression guard test in `DoseCard.test.jsx`. L'osservazione originale in 8c-2 CP6 punto 4 resta non spiegata (ipotesi residue: stale cache browser, state transiente non persistito, errore di osservazione).

**Scoperta.** CP6 punto 4 (Sessione 8c-2): creato farmaco "Test" con `relazione_pasto='indifferente'`. In `/oggi` la card rende "Assumere lontano dai pasti" invece di "Assumere indifferentemente dai pasti".

**Diagnosi.** Bug pregresso in DoseCard (o helper testuale): map/switch su `relazione_pasto` non copre `'indifferente'` correttamente o lo mappa su `'lontano_dai_pasti'`. Verifica console conferma `state.farmaci[Test].relazione_pasto === 'indifferente'` (la normalizeForm CP5 non è in causa).

**Manifestazione tardiva.** I 10 seed farmaci hanno `relazione_pasto ∈ {prima, durante, dopo, lontano}`, mai `indifferente`. Il bug è rimasto invisibile fino alla prima creazione user-level di un farmaco con `indifferente` (CP6 punto 4).

**Retrofit 8d.** Ispezione switch/map renderer DoseCard + chiarimento label "indifferente" vs "lontano". Non-blocker.

---

## 6.98 — UnsavedChangesModal guard non scatta su FarmacoDrawer close (bug, candidate 8d)

**Scoperta.** CP6 punto 6c + punto 7 cleanup (Sessione 8c-2): verificato in 2 path distinti che il tap Annulla/× nel `FarmacoDrawer` con form dirty **NON** triggera `UnsavedChangesModal`:
1. Create mode puro (`+ Nuovo` → Nome="Guardia", tap × senza altro) → drawer chiude direttamente
2. Dopo `ConfirmModal` data_fine-past cancel (Movicol punto 6c) → tap Annulla drawer chiude direttamente

**Diagnosi.** `FarmaciTab` consuma `useUnsavedChanges` (8c CP4, §22.9 AMB-8c.I) per la guard cross-tab via ConfigView. Ma il close path del drawer (`handleAnnulla` / bottone ×) NON consulta `dirty` prima di chiudere. In ProfiliTab il pattern equivalente è presente (8b CP7). Lapsus di porting in 8c CP3.

**Impatto.** Non-blocker: IDB non è toccato (thunk non chiamato = zero writes). Dato perso solo nel form React state = equivalente a refresh pagina. User experience degradata ma nessun rischio integrità.

**Retrofit 8d.** ~10 righe: handleAnnulla controlla `dirty`, apre `UnsavedChangesModal` se true, delegata conferma a close effettivo. Pattern replica da `ProfiliTab::handleClose`.

---

## 6.99 — Split Sessione 8d in 8d-A (tier A+B) + 8d-B (tier C + §6.85)

**Sessione:** 8d analisi-first (24/04/2026, v2.5.29 → v2.5.30).

**Contesto.** Il prompt §11 v2.5.29 proponeva Sessione 8d unica su scope "polish Config + retrofit candidate 8a-8c" e prospettava esplicitamente possibile split 8d-A / 8d-B (note finali §11 v2.5.29). L'analisi-first ha ratificato lo split.

**Decisione (AMB-8d.A).** Split in 2 sessioni separate:

**8d-A (tier A + tier B, pattern-based, zero design-decision):**
- §6.84 React Router future flags v7 (`v7_startTransition` + `v7_relativeSplatPath`)
- §6.94 `defaultNoopActions()` +5 thunks profili/annullaAssunzione (AMB-8d.C)
- §6.97 DoseCard copy `indifferente` → "indifferentemente dai pasti"
- §6.98 `FarmacoDrawer.handleAnnulla` consulta `dirty` → UnsavedChangesModal (pattern replica ProfiliTab)
- §6.89 + §6.92 ProfiliTab retrofit `ConfirmDeleteProfiloModal` → `ConfirmModal` shared (auto-fix asimmetria a11y)
- §6.95 `updateProfilo` retrofit `rebuildPlanFromFresh` preventive (AMB-8d.D proattivo)

**8d-B (tier C + §6.85, scope variabile con design-decision e investigation):**
- §6.81 ConfigTabBar dark token `subTabInactive` (design review)
- §6.96 sticky separator dinamico `--app-header-height` + ResizeObserver (AMB-8d.B)
- §6.85 `nome_utente` azzerato (investigation con strumentazione logging) — AMB-8d.E

**Motivazione split.** Tier A+B sono retrofit pattern-based con modello di riferimento già presente nel codice (8b/8c-2); sessione analisi+impl lineare e atomica. Tier C + §6.85 richiedono design choice aperta (token a11y, approccio dinamico) e investigation strumentata; meritano sessione dedicata con feedback browser rapido.

**Impatto versioning.**
- v2.5.30 (questa): analisi-first 8d + split formalizzato + prompt 8d-A impl in §11.
- v2.5.31: impl 8d-A (target 310-312 test).
- v2.5.32 (analisi-first 8d-B) + v2.5.33 (impl 8d-B) oppure combo single-bump se analisi-first 8d-B è leggera.

**Impatto roadmap §7.** Riga 8d → "⏸️ Split in 8d-A + 8d-B (analisi-first ✅)"; nuove righe **8d-A** e **8d-B** pianificate.

**Classificazione.** Deviazione procedurale (scope-split, non tecnica). Zero impatto codice.

---

## 6.100 — Sessione 8d-A CP1: scope §6.84 ridotto ad app-only (test router deferred)

**Contesto.** CP1 §6.84 (Sessione 8d-A) applicava le future flag `v7_startTransition` + `v7_relativeSplatPath` al `<BrowserRouter>` in `src/main.jsx` per silenziare i warning React Router v7. Il prompt §11 v2.5.30 CP1 specificava come file target `src/main.jsx` (app router) ma prescriveva come verifica finale "stderr pulito sui test ConfigTabBar + ConfigView", implicando copertura del test router anche.

**Scoperta.** Post-sed su `main.jsx` il warning check mostrava ancora 4 righe React Router Future Flag su stderr dei test. Diagnosi (`grep -rn "BrowserRouter\|MemoryRouter" src/test/`) ha rivelato che `src/test/renderHelpers.jsx:153` monta `<MemoryRouter initialEntries={initialEntries}>` senza future flag. Estensione al test router avrebbe completato il fix.

**Tentativo estensione (rollback).** sed analogo su `renderHelpers.jsx:153` → warning check subset (ConfigTabBar+ConfigView) **verde**, ma full suite `npm test -- --run` in **hang deterministico** (26+ min, zero output, nessun banner vitest, zero progressi test files). Ripetibile via `npx vitest run` diretto: hang early in setup/transform. Bisezione non approfondita per costo/beneficio (incidente nella prima metà sessione, 5 CP ancora da fare).

**Ipotesi non diagnosticata.** `React.startTransition` wrappa gli update del router. In jsdom + vitest, pattern async test che attendono state update potrebbero non risolversi mai se una transition è pending e non ha modo di "flushare" (es. `await screen.findBy...` dopo navigation). MemoryRouter con `future={{ v7_startTransition: true }}` potrebbe triggerare questa patologia in ≥1 test file, mandando la suite in hang. Non riproducibile con il subset ConfigTabBar+ConfigView → significa che il colpevole è altrove (candidato: test che usano `useNavigate` o effettuano navigation imperative in test body).

**Decisione 8d-A.** Rollback di `renderHelpers.jsx`, mantenere il fix su `main.jsx`. Warning test persistono in ogni `npm test` (rumore stderr) — accettato come compromesso:
- App runtime / dev server: **clean**, v7-ready.
- Test suite: warning persistenti ma 306 → 307 invariata integrity, zero flake da hang.

**Deferred.** Retrofit test router come item tier C → **Sessione 8d-B** analisi-first (decidere: (a) bisezione per identificare test file colpevole + fix mirato, (b) wrapper `act()` generalizzato attorno a MemoryRouter in renderHelpers, (c) silenziare i 2 warning via vitest `onConsoleLog` filter come workaround non-invasivo, (d) upgrade a react-router-dom 7.x che rende i future flag default).

**Non-deviazione implementata.** `src/main.jsx:39` ha `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`. §6.84 rimane formalmente **aperta** per la parte test router.

---

## 6.101 — Sessione 8d-A CP3: §6.97 riscoped da fix a regression guard + chiusura

**Contesto.** CP3 §6.97 (Sessione 8d-A) era prescritto come fix al presunto bug "DoseCard rende 'lontano dai pasti' per `relazione_pasto='indifferente'`" (osservato in 8c-2 CP6 punto 4).

**Scoperta diagnosi preliminare CP3.** Grep su `src/components/oggi/DoseCard.jsx` ha rivelato che:
- Linea 125-126: `if (f.relazione_pasto === 'indifferente') { return 'Assumere indifferentemente dai pasti'; }` — **early-return incondizionato presente**.
- Linea 138: `return map[f.relazione_pasto] || 'Assumere indifferentemente dai pasti';` — fallback anch'esso corretto.

**Git blame conferma.** Entrambe le linee risalgono a commit `1c900064` del 19/04/2026 (Sessione 7b-1 — vista Oggi read-only iniziale). Il branch `indifferente` esiste **dalla creazione del file**, mai toccato da commit successivi. Nessun fix silenzioso post-8c-2.

**Grep esteso su tutto `src/`.** Verificato che `DoseCard.jsx` è l'unico renderer testuale di `relazione_pasto`. `FarmaciTab.jsx` usa il valore solo come option label nel dropdown form. Nessun altro consumer potenzialmente patologico.

**Conclusione.** Il bug descritto in §6.97 **non è riproducibile** nel codice attuale. Con `relazione_pasto === 'indifferente'` la funzione `getPastoText` ritorna incondizionatamente "Assumere indifferentemente dai pasti" via early-return. Non c'è cammino di codice che produca "lontano dai pasti" per quell'input.

**Ipotesi residue non falsificabili:**
- (a) Stale cache browser in 8c-2 CP6 (app in watch mode + HMR, stato renderer disallineato transitoriamente).
- (b) Errore di osservazione in 8c-2 CP6 (es. farmaco osservato aveva `relazione_pasto` diverso, confusione con altra card).
- (c) Race / transient state non persistito (es. form commit non ancora atomicizzato).

**Decisione riscope CP3 (opzione A approvata 24/04):** il prompt §11 CP3 prescriveva `+1` test come regression coverage. Mantenuto Δ test +1 come **regression guard** proattivo: nuovo describe block in `DoseCard.test.jsx` con 1 test che documenta il contratto `getPastoText(indifferente)`. Zero code change a `DoseCard.jsx`. Scopo: prevenire reintroduzione del bug in refactor futuri che rimuovessero l'early-return.

**Chiusura §6.97.** Annotata come "CHIUSA in 8d-A CP3 (bug non riproducibile)" con rimando a questa §6.101.

**Alternative scartate:**
- **(B)** CP3 rimosso (Δ test 0, 6 commit totali invece di 7): asciutto ma nessuna protezione contro regressione futura.
- **(C)** Verifica browser empirica pre-decisione: costo aggiuntivo senza information gain (il git blame è già evidenza conclusiva).

---

## 6.102 — Sessione 8d-A-continue CP6: `rebuildPlanFromFresh` signature extension per coherence defence `updateProfilo`

**Contesto.** Sessione 8d-A-continue CP6 (AMB-8d.D proactive). §6.95 hotfix 8c-2 CP6 aveva introdotto `rebuildPlanFromFresh({farmaci, orari})` per bypassare stateRef lag nei thunks farmaci. Commento §6.95 pregresso (actions.js:528-532) anticipava il problema analogo per `updateProfilo`: dispatch `SET_PROFILO_ATTIVO` con payload spread + `await rebuildPlan()` che legge `stateRef.current.profiloAttivo` stale (AppContext aggiorna stateRef via `useEffect([state])` un tick DOPO il dispatch).

**Decisione.** Generalizzare l'helper invece di duplicare la logica:

- **Prima:** `rebuildPlanFromFresh({farmaci, orari})` — 2 parametri obbligatori.
- **Dopo:** `rebuildPlanFromFresh({profilo?, farmaci?, orari?} = {})` — 3 parametri opzionali con fallback a `state.profiloAttivo`/`state.farmaci`/`state.orari` via `getState()`.

**Call sites:**
- Thunks farmaci (`addFarmaco`/`updateFarmaco`/`deleteFarmaco`): invariati. Passano `{farmaci, orari}`, `profilo` viene letto da stateRef via fallback. Corretto: questi thunks non mutano il profilo.
- `updateProfilo` (nuovo): `await rebuildPlanFromFresh({ profilo: nuovoProfiloAttivo })`. Passa profilo fresco esplicitamente; farmaci/orari da fallback stateRef. Sostituisce `await rebuildPlan()`.

**Rationale rifattorizzazione positiva (non deviazione negativa).** La signature extension è retrocompatibile e naturale — l'helper pre-esisteva già in `src/state/actions.js`, il fix del bug analogo richiede *solo* l'aggiunta del parametro `profilo`. Alternativa scartata: helper separato `rebuildPlanFromFreshProfilo` (duplicazione + divergenza futura probabile).

**File toccati:** `src/state/actions.js` (+28 righe: firma + destructuring + commenti §6.102 verbosi per tracciabilità).

**Test delta:** +1 in `actions.profili.test.js`. `vi.mock('../domain/planBuilder.js')` al top del file espone spy su `buildMultiDayPlan`. Nuovo test (7): verifica che dopo `updateProfilo(activeId, {ora_colazione: '09:00'})`, l'ultimo call a `buildMultiDayPlan` riceve `profilo.ora_colazione === '09:00'` (fresh patched), **non** `'07:30'` che getState() continua a ritornare stale (cross-check incluso). Mock default `() => []` non rompe i test (1)-(6) che non assertano su plan content.

**Rettifica prompt §11 annotata inline.** Prompt §11 (`Dopo dispatch APPLY_CAMBIO_PROFILO`) impreciso: `updateProfilo` dispatcha `SET_PROFILO_ATTIVO`. `APPLY_CAMBIO_PROFILO` è in `cambiaProfilo` (flow diverso, ricalcolo via `ricalcolaPianoDaProfilo` non `buildMultiDayPlan`). Commento codice annota la differenza. No §6.NN separata per refuso prompt (coerente con CP4 D6).

---

## 6.103 — UnsavedChangesModal 2° consumer → candidate `useModalA11y` retrofit

**Contesto.** Sessione 8d-A-continue CP4. `UnsavedChangesModal` (`src/components/config/UnsavedChangesModal.jsx`, 8a CP7) aveva 1 solo consumer in ConfigView cross-tab guard. Commento originale 8a (linee 8-16 del file) anticipava: *"ZERO focus-trap (deferred to 8d polish)... When a 2° consumer arrives in 8b (or later), extract shared dialog primitives... current codebase already has `useModalA11y` hook... wire it in then."*

**Trigger.** CP4 §6.98 monta `UnsavedChangesModal` come guard del close path di `FarmacoDrawer` — **FarmacoDrawer è il 2° consumer**. Il trigger promesso è scattato.

**Decisione.** **Retrofit NON eseguito in CP4** — scope §11 CP4 era wiring consumer, non modifica del modal. §11 vincolo esplicito: *"Non tentare estensione future flag React Router al test router... è scope 8d-B con analisi-first dedicata"* — per analogia, retrofit a11y sul modal shared è item **tier C** (design-touching), appartiene a 8d-B con analisi-first.

**Scope retrofit atteso (8d-B tier C):**
1. Modifica `UnsavedChangesModal` per montare `useModalA11y` (pattern identico a ConfirmModal shared 8c-2 CP5).
2. Zero cambi API props (`{onCancel, onDiscard}` invariati).
3. Verifica: Escape → `onCancel`, focus-trap attivo, restore-focus al trigger.
4. Browser check 2 punti: cross-tab guard ConfigView (consumer 1) + close path FarmacoDrawer (consumer 2).

**File coinvolti attesi:** `src/components/config/UnsavedChangesModal.jsx` (+~10 righe useModalA11y wiring). Δ test 0-2.

**Non-blocker per 8d-A-continue CP4.** Il modal funziona correttamente senza focus-trap come "scope-minimal" originale; l'asimmetria con ConfirmModal shared (che ha focus-trap) è tracciata. CP4 browser check userebbe Escape solo se useModalA11y fosse wired — non requisito scope CP4.

---

## 6.104 — Sessione 8d-A-continue CP7: ConfigView routing loop (interaction con CP1 §6.84 `v7_relativeSplatPath`)

**Contesto.** Sessione 8d-A-continue CP7 (browser checklist). Al tap di un tab in `ConfigTabBar` da una tab diversa (es. click "Profili" mentre su `/config/farmaci`), l'URL degenera accumulando segmenti: `/config/farmaci/profili/impostazioni/impostazioni/impostazioni/…`. Chrome logga `Throttling navigation to prevent the browser from hanging` + React logga `Maximum update depth exceeded` con stack `Navigate (ConfigView:41)`.

**Root cause.** Interazione tra **due decisioni architetturali**:

1. **ConfigView** (8a CP2-CP7) usa `<Navigate to="impostazioni" replace />` (non absolute `/config/impostazioni`) in 2 punti (`index` + `path="*"`). Analogamente `navigate("impostazioni")` in `handleDiscard`. `ConfigTabBar` usa `<NavLink to="profili">` etc. Tutti path relativi scritti contro la semantica **v6**: "relative al parent route".

2. **CP1 §6.84** (8d-A parziale) ha abilitato `v7_relativeSplatPath: true` + `v7_startTransition: true` nel BrowserRouter `src/main.jsx`. `v7_relativeSplatPath` cambia la risoluzione dei path relativi DENTRO route splat (`path="/config/*"` è splat): da "relative al parent route path" (`/config/`) a "relative al matched splat segment". Quando si è già su `/config/farmaci`, un `<NavLink to="profili">` produce `/config/farmaci/profili` invece di `/config/profili`. Nessuna route specifica matcha → matcha `path="*"` in ConfigView → `<Navigate to="impostazioni" replace />` produce `/config/farmaci/profili/impostazioni` → loop infinito.

**Pre-esistenza confermata.** Il bug è stato introdotto al commit **`2d79055` (8d-A CP1 §6.84)**, NON in 8d-A-continue. I CP4/5/6 non hanno toccato routing né ConfigView. Test unit continuano a passare perché §6.100 ha escluso il test router dall'opt-in future flags (il router di test non simula la navigazione browser reale con il nuovo behavior).

**Scoperta tardiva rationale.** 8a-8c CP browser checks erano focalizzati su funzionalità intra-tab (form drawer, delete confirm). Navigazione cross-tab da tab diversa dall'initial `/config/impostazioni` (default) non era stata esercitata. 8d-A parziale (§22.13) NON ha eseguito browser check per stanchezza. 8d-A-continue CP7 è la prima interazione browser post-§6.84.

**Scope fix atteso (8d-A-continue-2 analisi-first):**
- `ConfigView.jsx:41,49` — `<Navigate to="impostazioni">` → absolute `/config/impostazioni` oppure usare `<Navigate to="./impostazioni">` con analisi behavior vs v7 semantica.
- `ConfigView.jsx:handleDiscard` — `navigate(target)` analogo.
- `ConfigTabBar.jsx` — `<NavLink to="profili">` etc. → absolute `/config/profili` oppure pattern alternativo.
- Decisioni trade-off: path absolute (semplice, ma tight coupling al base path `/config`) vs pattern `useResolvedPath` (idiomatic v7, ma più verboso).

**Decisione 8d-A-continue-2 analisi-first** (blockers vs options):
- Q1: path absolute vs `useResolvedPath` resolution idiomatic?
- Q2: fix solo ConfigView+ConfigTabBar o audit di tutto il codice per `<Navigate to>` / `navigate()` / `<NavLink to>` senza leading slash dentro splat routes?
- Q3: test router (deferred in §6.100) copre questo scenario post-fix? Oppure test browser manuale rimane unica guardia?

**Non-blocker per CP4/5/6.** I 3 CP committati (`30b01ce`, `f316e6c`, `264ab1c`) sono sani: test 310/310 verdi, logica corretta, copy preservata. §6.104 è isolata al shell di navigazione Config; i tab singoli funzionano correttamente se raggiunti **direttamente** via URL o al primo load (default `/config/impostazioni`).

**Workaround temporaneo disponibile (non applicato):** downgrading `v7_relativeSplatPath: false` in `src/main.jsx` ripristinerebbe comportamento v6 e sbloccherebbe browser check immediato, ma annullerebbe §6.84 CP1. Scartato: §6.84 va preservata come scope 8d-A completato; fix proper va in 8d-A-continue-2.

**Esito Sessione 8d-A-continue-2 (chiusura §6.104).** Fix applicato come **path absolute** (AMB-8d-A-continue-2.A): tutti i `<Navigate to>`, `<NavLink to>`, `navigate(...)` dentro lo shell `/config/*` riscritti con leading slash (`/config/impostazioni`, `/config/profili`, `/config/farmaci`). Audit grep esaustivo (AMB-8d-A-continue-2.B) ha confermato che i soli 2 file coinvolti sono `ConfigView.jsx` e `ConfigTabBar.jsx`. Commit `67937e5` su branch `step-8`. Browser check 5/5 verde (6 permutazioni cross-tab + bonus dirty + UnsavedChangesModal). §6.104 **CHIUSA** in v2.5.33.

**Nota audit retroattiva (lezione operativa).** I pattern grep usati in AMB-8d-A-continue-2.B (`'Navigate to="[^/]'`, `'NavLink to="[^/]'`, `'navigate("[^/]"'`) catturano solo i call-site con stringa letterale. NON catturano i casi data-driven (`<NavLink to={tabPath}>`, `navigate(targetVar)`). Per audit futuri di routing relativi dentro splat routes, estendere il pattern a `'to={'` (literal `to={`) per scoprire anche i call-site dinamici. Nel caso 8d-A-continue-2 questo gap non ha causato falsi negativi (l'app non usa NavLink/Navigate data-driven dentro `/config/*`), ma il pattern resta valido come buona pratica.

---

## 6.105 — ConfirmModal focus-restore non funziona su ProfiliTab (delete profilo non-attivo)

**Sessione:** 8d-A-continue-2 CP7 browser check Punto 1 (25/04/2026).

**Contesto.** Verifica CP5 §6.89+§6.92 (ProfiliTab retrofit `ConfirmModal` shared con `useModalA11y`): tap "Elimina" su un profilo non-attivo in `/config/profili` apre il `ConfirmModal` shared (focus-trap attivo, Escape funziona, dismiss ok). Tuttavia, dopo dismiss del modal (sia "Annulla" che backdrop click che Escape), il focus **non torna al bottone "Elimina"** che ha originato l'apertura — finisce sul `<body>` o su elemento parent indeterminato.

**Riproducibilità.** Confermata via mouse e via keyboard (Tab fino al bottone Elimina + Invio per aprire, poi Escape per chiudere → focus perso). Comportamento consistente.

**Confronto con altri consumer di ConfirmModal.**
- `FarmaciTab` (delete farmaco, 8c-2 CP5): non testato in browser per §6.105 — verifica scope 8d-B.
- `UnsavedChangesModal` (ConfigView guard, 8a CP6): pattern simile (focus-trap mancante, candidato §6.103 retrofit) — NON ConfirmModal shared.

**Ipotesi root cause.** `useModalA11y` registra trigger via `document.activeElement` al mount. Su ProfiliTab, è possibile che il mount del modal avvenga in un timing in cui `document.activeElement` non sia più il bottone Elimina (es. blur indotto da `setState` re-render del parent). Da diagnosticare in 8d-B con strumentazione ad hoc (logging `triggerRef.current` al mount/unmount).

**Scope fix.** **8d-B tier C**, insieme a §6.103 (UnsavedChangesModal `useModalA11y` retrofit). Possibile fix unificato sull'hook `useModalA11y` se il bug è in shared infrastructure, oppure fix locale ProfiliTab se è race condition specifica al consumer.

**Non-blocker.** Funzionalità delete profilo invariata (modal apre, conferma applica delete, dismiss chiude). Solo regressione a11y minore (focus restore).

**Classificazione.** a11y polish, non-blocker, candidate 8d-B tier C.

---

## 6.106 — CP7 browser check Punto 3 skipped per ridondanza vs unit coverage

**Sessione:** 8d-A-continue-2 CP7 browser check (25/04/2026).

**Contesto.** Il prompt §11 v2.5.32 prescriveva 5 punti di browser check post-fix §6.104:

1. delete profilo non-attivo + form dirty → ConfirmModal + focus-trap (CP5).
2. create farmaco solo Nome + Annulla → UnsavedChangesModal (CP4).
3. update profilo attivo (es. cambio `ora_colazione`) → plan `/oggi` rigenera correttamente (CP6 coherence defence §6.95).
4. cross-tab da `/config/farmaci` (§6.104 regression).
5. permutazioni rimanenti cross-tab.

**Decisione.** Il **Punto 3** è stato skipped in browser check. Motivazione: il path completo del thunk `updateProfilo` con coherence defence `rebuildPlanFromFresh({profilo: nuovoProfiloAttivo})` è già coperto da test unit dedicati in `src/state/actions.profili.test.js` (linee 274, 283 — test 7 introdotto in 8d-A-continue CP6). Il test mockizza `planBuilder.buildMultiDayPlan` e verifica che riceva il profilo fresco (es. `ora_colazione: '09:00'`) e non quello stale dallo `stateRef` lag. Il browser check sarebbe stato un'osservazione qualitativa di un comportamento già asserito quantitativamente.

**Pattern documentato.** Quando un CP browser checklist item è già coperto da unit test che mockizza il path end-to-end con assertion sull'output (qui: `buildMultiDayPlan` riceve profilo fresco), lo skip è giustificato. Resta utile il browser check quando:
- Il test unit non copre l'intero path (es. side effect UI non testato).
- Il bug originale era runtime-only (es. race condition non riproducibile in vitest).
- Una regressione UI visiva è plausibile (animazioni, layout, focus).

Per Punto 3 nessuna delle 3 condizioni è soddisfatta: il bug §6.95 era stateRef lag deterministico, riproducibile e asseribile in unit test.

**Lezione.** Il CP browser checklist può essere ridotto a posteriori quando la coverage unit cresce. Annotare lo skip nel Changelog come §6.NN dedicata (questa) per tracciabilità — non lasciarlo come decisione silente.

**Classificazione.** Procedurale, scope-reduction giustificata, non-blocker.

---

## 6.107 — CP1 8d-B §6.96 rolled back (scroll regression + CSS var mai settata)

**Sessione:** 8d-B (25 aprile 2026, CP1).

**Stato:** **ROLLED BACK** in-session. §6.96 resta APERTA, re-investigation deferred a 8d-C.

**Scope CP1 originale.** Implementare AMB-8d.B (preesistente da 8d analisi-first): sticky data separator in `/oggi` ancorato dinamicamente alla base dell'header app via CSS var `--app-header-height` aggiornata da `ResizeObserver` su header root, sostituendo il valore letterale `top-[180px]` calibrato a CP browser 7d-1.

**Implementazione.** 4 modifiche in 2 file:

1. `src/test/setup.js` — polyfill stub `ResizeObserver` per jsdom (no-op).
2. `src/components/oggi/OggiView.jsx` — import `useRef`, `headerRef` + `useEffect` con `ResizeObserver` + cleanup, `ref={headerRef}` sull'header sticky, `top: 'var(--app-header-height, 180px)'` sul DATE SEPARATOR.

Test full suite: 310/310 → 313/313 (CP1 zero Δ test, +3 da CP2/CP3) — verde.

**Esito CP browser (Punto 1).** Due bug concorrenti rilevati:

1. **CSS var mai settata.** `getComputedStyle(document.documentElement).getPropertyValue('--app-header-height')` ritorna `''`. Il fallback letterale 180px nel separator `var(--app-header-height, 180px)` è quindi sempre attivo. Header reale misurato post-mount = 149px (vs 180px ipotizzato in commento 7d-1). Hypothesis root cause: `OggiView` ha early return per `state.status='idle'` che NON renderizza l'header DOM; quando lo state passa a `ready` il rerender mounta l'header, ma `useEffect` con `dep=[]` non riesegue (dep vuoto già consumato durante mount idle). `headerRef.current` resta null per il `ResizeObserver`.

2. **Scroll bloccato sulla pagina `/oggi`.** Lo scroll non risponde al gesto rotellina/trackpad. DevTools: html/body/main hanno `overflow: visible`, main height = 3617px (page completa renderizzata), nessun errore "ResizeObserver loop" in console. Causa esatta non diagnosticata in-session.

**Decisione.** Rollback completo via `git checkout 67937e5 -- src/components/oggi/OggiView.jsx src/test/setup.js`. Stato baseline ripristinato; scroll torna funzionante; separator torna pinned a 180px hardcoded (gap 31px visibile, comportamento pre-§6.96 identico).

**Lezioni.**

- `useEffect(() => {...}, [])` su componenti con render condizionale early-return è un pattern fragile: il ref può essere null al primo mount e l'effetto non riesegue al rerender che monta il target.
- Il CP test in jsdom NON ha rilevato il bug perché il polyfill `ResizeObserver` è no-op (l'`useEffect` con guard `if (!headerEl || typeof ResizeObserver === 'undefined') return` esce silenziosamente). I test guard a livello unit non possono catturare regressioni di layout/scroll: serve CP browser obbligatorio per modifiche sticky/layout.
- Lo scroll bloccato è una regressione critica indipendente dal bug 1: introdurre dinamiche su sticky in browser real richiede investigation più profonda di un singolo CP impl.

**Carryforward 8d-C.** Re-investigation §6.96 con scope esteso:

- Ipotesi A: spostare misurazione da `useEffect` a `useLayoutEffect` con `dep=[state.status]` per riapplicare al transition idle→ready.
- Ipotesi B: usare un wrapper component dedicato `<HeaderHeightProbe>` con `useLayoutEffect` interno mountato solo dopo lo status check.
- Ipotesi C: investigare la causa del scroll lock (interazione z-index, pointer-events, listener fantasma).
- Ipotesi D: rinunciare a measurement dinamico, calibrare `top-[N]` a 149px se le condizioni reali sono stabili (regression test contro reflow header).

**Classificazione.** Procedurale + tecnico, deferred 8d-C, alta priorità (regressione gap 31px attiva).

---

## 6.108 — Scope creep §6.81 verso NavBar bottom

**Sessione:** 8d-B (25 aprile 2026, CP browser Punto 2).

**Stato:** APERTA, deferred a 8d-C.

**Osservazione.** Durante CP browser 8d-B Punto 2 (verifica §6.81 ConfigTabBar dark mode contrast), confermata risoluzione del bug originale: i sub-tab "Profili" e "Farmaci" inactive in `/config/*` sono ora chiaramente leggibili in dark mode con il nuovo token `subTabInactive` (5.27:1 dark, 5.50:1 light). Tuttavia Roberto ha rilevato che lo **stesso problema di contrast** è presente sulla **NavBar bottom** (Oggi / Log / Export / Config) dove i tab inactive risultano "poco visibili" in dark mode.

**Confronto contrast NavBar bottom (token `navInactive`).**

- Light: `#A8A29E` vs `headerBg #FAFAF7` → 2.41:1 ❌ (sotto AA-ui 3:1).
- Dark: `#4A4854` vs `headerBg #15141A` → 2.05:1 ❌ (sotto AA-ui 3:1).

**Trade-off.** §6.81 originale aveva escluso esplicitamente la NavBar bottom dal scope, motivando l'asimmetria col fatto che NavBar segue un pattern "icon prominent + label inactive helper" (4 tab tipo iOS) dove l'effetto "weak inactive" è semantico desiderato. Roberto contesta questa scelta in CP browser: anche con quel pattern, l'inactive deve restare leggibile.

**Decisione 8d-C.** Apri scope-extension §6.81: estendere il fix a `NavBar.jsx` con uno dei pattern seguenti:

- (a) sostituire `navInactive` con `subTabInactive` anche in NavBar (uniformità tutti i tab del prodotto).
- (b) lift dei valori `navInactive` direttamente in `theme.js` a soglia AA-ui (rinuncia al pattern "weak helper").
- (c) introdurre nuovo token `tabInactive` unificato per NavBar+ConfigTabBar e rinominare il `subTabInactive` di 8d-B (refactor backward-incompatible interno, 1 sessione di lavoro).

Raccomandazione provvisoria: (a) per minimizzare cambi al modello tokens. Decisione finale in CP1 di 8d-C.

**Classificazione.** Design system, deferred 8d-C, priorità media.

---

## 6.109 — ProfiliTab focus restore wrong target post-CP2 §6.105

**Sessione:** 8d-B (25 aprile 2026, CP browser Punto 3).

**Stato:** APERTA parzialmente regredita, deferred a 8d-C.

**Sintomo.** Post-CP2 §6.105 (estensione API `ConfirmModal` con `triggerRef` opt-in + propagazione 3 consumer + regression guard test verdi), il restore-focus su ProfiliTab dismissal ConfirmModal va su `<input id="profilo-nome">` invece che sul button "Elimina" che ha aperto il modal. Pre-§6.105 il focus restore cadeva su `document.body` (default `useModalA11y`); post-§6.105 è cambiato target ma è ancora errato.

**Asimmetria diagnostica con FarmaciTab.** Il fix §6.105 funziona correttamente su FarmaciTab (CP browser Punto 4: `document.activeElement.tagName === 'BUTTON'`, text "Elimina") ma fallisce su ProfiliTab (Punto 3: `document.activeElement.tagName === 'INPUT'`, id "profilo-nome"). I 2 drawer sono architetturalmente identici nel wiring `useModalA11y` (entrambi montano focus-trap a livello drawer, ConfirmModal child). Differenza individuata solo nel JSX: button Elimina ProfiliTab è dentro uno `<span title=...>` wrapper (introdotto in §6.86.2 per esporre tooltip nativo quando button è disabled per profilo attivo), assente in FarmaciTab.

**Hypothesis residue (non validate).**

- (h1) Il drawer-level focus-trap re-imprigiona il focus al primo tabbable interno (`<input id="profilo-nome">`) dopo il modal teardown. Ma se così fosse, FarmaciTab dovrebbe avere lo stesso sintomo.
- (h2) Lo `<span>` wrapper interferisce con la logica `tabbable` della libreria focus-trap, escludendo il button Elimina dalla lista tabbable del drawer. Quando il modal restoraza focus, drawer-trap rileva il button "fuori dal trap" e re-imprigiona al primo tabbable conosciuto.
- (h3) Mouse click su button non trasferisce focus (Safari/macOS standard behavior); `triggerRef.current` punta al button corretto, ma il drawer trap intercetta il `focus()` programmatico e lo redirige.

**Falso negativo del regression guard test.** Il test `(c) Escape su ConfirmModal delete restituisce focus al button Elimina drawer (§6.105)` aggiunto in CP2 (FarmaciTab) è verde. Test analogo in ProfiliTab (`Escape su ConfirmModal restituisce il focus al button Elimina (§6.105)`) anch'esso verde. Significa che jsdom + focus-trap library non riproducono il comportamento del browser real:

- `tabbableOptions: { displayCheck: 'none' }` in `useModalA11y` sopprime check di visibilità che potrebbero essere il discriminante.
- L'interazione drawer-trap → modal-trap → dismiss in jsdom potrebbe non triggerare il re-trap del drawer come fa il browser.

**Decisione.** Non rollback CP2 (FarmaciTab + ConfirmModal API restano in produzione, hanno valore). ProfiliTab resta in stato "regression parziale": focus va a target prevedibile (input Nome del drawer) invece che a body random. Acceptable in attesa di fix mirato 8d-C.

**Carryforward 8d-C.**

1. Diagnosi live in browser con DevTools logging strumentato (capture `document.activeElement` a ogni transition: pre-modal-open, post-modal-mount, pre-dismiss, post-trap-deactivate, +1 frame, +2 frame).
2. Test ipotesi h2 con A/B controllato: rimuovere temporaneamente lo span wrapper su ProfiliTab e verificare se il restore va correttamente al button.
3. Se h2 confermata: scelta tra (a) rimuovere span wrapper §6.86.2 e ripensare tooltip con altro pattern (rischio breaking on disabled state); (b) `requestAnimationFrame` workaround in `useModalA11y.onDeactivate` per outlast il drawer trap re-check; (c) introdurre `pause`/`resume` esplicito sul drawer trap durante modal lifecycle (refactor `useModalA11y` con stack management).
4. Estendere regression guard test con verifica multi-frame (`waitFor` con multiple ticks) per catturare il pattern in jsdom anche se attualmente passa "for the wrong reason".

**Classificazione.** Tecnico (a11y), deferred 8d-C, priorità media.

---

## 6.110 — CP1 8d-C: sticky separator calibrazione statica `top-[149px]` (chiude §6.96 e §6.107)

**Sessione:** 8d-C (25 aprile 2026 sera, CP1).

**Stato:** ✅ **CHIUSA**. §6.96 e §6.107 chiuse contestualmente.

**Contesto.** Dopo il rollback CP1 8d-B (§6.107) del tentativo dinamico (CSS var `--app-header-height` + `ResizeObserver` → 2 bug concorrenti: scroll lock + var mai settata), AMB-8d-C.A ha ratificato la calibrazione statica come scelta pragmatica:

- (D) `top-[149px]` hardcoded — header reale misurato post-mount in 8d-B browser DevTools (`document.querySelector('.sticky.top-0').getBoundingClientRect().height`).
- Vincolo §11 v2.5.34: "se la re-investigation §6.96 fallisce di nuovo, chiudere come deferred fase 9+; il bug è low-priority (gap cosmetico 31px), non vale il debito tecnico". (D) rispetta il vincolo evitando il terzo tentativo dinamico.

**Implementazione.** 1 file (`src/components/oggi/OggiView.jsx`), 8 ins / 7 del:
- `className="sticky top-[180px] ..."` → `className="sticky top-[149px] ..."` sul `<div>` DATE SEPARATOR.
- Commento storico 7d-1 sostituito con commento §6.110 (riferimenti §6.96/§6.107, motivazione "residual gap acceptable in production senza DEV slider").

**Validazione CP1.4 browser (5 punti):**

| Punto | Scope | Esito |
|-------|-------|-------|
| 1 | Scroll regression (CRITICO post-8d-B) | ✅ Scroll funziona normalmente (modifica statica = zero ResizeObserver) |
| 2 | Misura header reale | ✅ 149px esatti (`getBoundingClientRect().height`) |
| 3 | Gap visivo separator vs base header | ✅ 0px (`top: 149` = `header.height: 149`) |
| 4 | Visibility durante scroll | ✅ Pill "OGGI · ..." resta visibile e ancorato senza overlap |
| 5 | DEV slider toggle off | ⚠️ Non applicabile (DEV slider è render incondizionato in dev mode, non controlla via `simulatedNow`). Production-like residual gap accettato per documentazione. |

**Trade-off accettati:**
- Build production senza DEV slider avrà header più corto (probabile <149px) → gap residuo visibile sotto header. Documentato come trade-off pre-§6.96 identico, gap cosmetico minore del bug pre-fix.
- Reflow header futuro (es. aggiunta toolbar, modifiche layout 8e+) richiederà ricalibrazione manuale del numero. Nessun ResizeObserver = nessuna auto-correzione.

**Lezione operativa.** Il vincolo §11 "no terzo tentativo per regressioni a bassa priorità" ha protetto efficacemente da debito tecnico ulteriore. Pattern di chiusura: documentare la scelta statica con riferimenti completi alle 2 entry storiche (§6.96 originale + §6.107 rollback) per tracciabilità.

**Classificazione.** Layout polish, scelta pragmatica post-rollback, chiusura definitiva entry storica.

**Commit.** `0283567` su branch `step-8`.

---

## 6.111 — CP2 8d-C: §6.109 h2 falsificata empiricamente, hard-defer 8d-D

**Sessione:** 8d-C (25 aprile 2026 sera, CP2).

**Stato:** APERTA, hard-defer 8d-D.

**Contesto.** AMB-8d-C.B prescriveva diagnosi A/B controllata in browser per testare h2 (`<span>` wrapper §6.86.2 interferisce con focus-trap library `tabbable` list). Eseguita senza modificare file su disco, con DOM patch live via DevTools Console.

**Procedura A/B (CP2.2).**

1. **Punto A (baseline):** in `/config/profili`, tap profilo non-attivo → tap "Elimina" → ConfirmModal apre → tap "Annulla" → check `document.activeElement`. Esito: `{tag: 'INPUT', id: 'profilo-nome', text: null}`. Bug §6.109 riprodotto. Confermato 2 volte di seguito (deterministico).

2. **Punto B (span rimosso):** drawer aperto, esecuzione DOM patch:
   ```js
   const target = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Elimina').pop();
   const span = target.parentElement; // <span title=...>
   span.parentElement.insertBefore(target, span);
   span.remove();
   ```
   Output: `OK button moved out of span; new parent: DIV.flex gap-2`. Stesso scenario tap Elimina → tap Annulla → check `activeElement`. Esito: `{tag: 'INPUT', id: 'profilo-nome', text: null}` — **focus ancora errato**.

**Conclusione.** **h2 FALSIFICATA.** Lo `<span>` wrapper §6.86.2 NON è la root cause. Restano:

- **h1 (drawer focus-trap re-imprigiona).** Pattern stack di trap nidificati che `focus-trap-react` non gestisce automaticamente. Quando ConfirmModal teardown rilascia il suo trap, il drawer-level trap ri-attiva e re-imprigiona al primo tabbable interno (`<input id="profilo-nome">`).
- **h3 (mouse-no-focus + drawer trap intercept).** Safari/macOS mouse click su button non trasferisce focus; `triggerRef.current` punta al button corretto, ma drawer trap intercetta il `focus()` programmatico e lo redirige.

Entrambe richiedono refactor `useModalA11y` con `pause`/`resume` esplicito sul drawer trap durante modal lifecycle, oppure wrapper `requestAnimationFrame` per outlast il re-grab del drawer trap. Scope dedicato 8d-D (sessione investigation + impl ad hoc).

**Asimmetria FarmaciTab vs ProfiliTab.** FarmaciTab (CP2 8d-B) funziona correttamente con stesso pattern `useModalA11y` + `triggerRef`. Differenza non più attribuibile allo span (h2 falsa). Possibile differenza: ordine di mount/unmount dei drawer trap, o numero di tabbable interni del drawer (FarmaciTab drawer ha più campi tra cui il button Elimina è "centrale", ProfiliTab drawer ha pochi campi e `profilo-nome` è il primo tabbable). Da investigare in 8d-D.

**Falso negativo regression guard.** I test guard CP2 8d-B (`(c) Escape su ConfirmModal delete restituisce focus al button Elimina`) sono verdi sia per FarmaciTab che ProfiliTab in jsdom, ma in browser real solo FarmaciTab funziona. jsdom + `focus-trap` library con `displayCheck: 'none'` non riproduce il browser real cross-trap interaction. Lezione: i guard a11y in jsdom sono necessari ma non sufficienti — CP browser obbligatorio per validate focus restore.

**Stato pratico ProfiliTab.** Focus va a target prevedibile (`<input id="profilo-nome">`, primo tabbable del drawer) invece che button Elimina atteso. Non blocker funzionale (delete funziona, modal chiude); regressione a11y minore (focus visibile su elemento diverso da quello atteso).

**Carryforward 8d-D scope:**

1. **Investigation strumentata** in browser con DevTools logging multi-frame: capture `document.activeElement` a ogni transition (pre-modal-open, post-modal-mount, pre-dismiss, post-trap-deactivate, +1 frame, +2 frame, +5 frame).
2. **Test mirato h1 vs h3:** disabilitare drawer trap temporaneamente (rimozione `useModalA11y` da ProfiliTab drawer) — se focus va corretto, h1 confermato; se ancora errato, h3 confermato.
3. **Decisione fix:** (a) `requestAnimationFrame` in `useModalA11y.onDeactivate` (1-2 righe, hack tattico, retrocompatibile); (b) refactor con stack `pause`/`resume` (architettonicamente corretto, scope sessione dedicato).
4. **Estensione test guard:** `waitFor` multi-tick per catturare il pattern in jsdom anche se attualmente passa per ragione sbagliata.

**Classificazione.** Tecnico (a11y), hard-defer 8d-D, priorità media.

**Δ codice / Δ commit:** zero (diagnosi browser-only).

---

## 6.112 — CP3 8d-C: lift `navInactive` token a soglia AA-ui (chiude §6.108)

**Sessione:** 8d-C (25 aprile 2026 sera, CP3).

**Stato:** ✅ **CHIUSA**. §6.108 chiusa contestualmente.

**Contesto.** §6.108 (scope creep §6.81 a NavBar bottom) aveva proposto 3 opzioni: (a) sostituire `navInactive` con `subTabInactive`, (b) lift `navInactive` valori, (c) refactor token unificato. AMB-8d-C.C ha ratificato (b) — divergente dalla raccomandazione provvisoria (a) del §11 v2.5.34 — per preservare gerarchia visiva semantica (NavBar bottom = livello primario con icon prominent + label helper, ConfigTabBar sub-tab = livello secondario label-only).

**Calcolo contrast WCAG.** Eseguito in-session via Python (`relative luminance` formula, sRGB → linear). Risultati:

| Ruolo | Light | Light ratio vs `#FAFAF7` | Dark | Dark ratio vs `#15141A` |
|---|---|---|---|---|
| `navActive` (riferimento active) | `#2563EB` | 4.94:1 ✅ | `#60A5FA` | 7.20:1 ✅ |
| `subTabInactive` (8d-B §6.81, ConfigTabBar) | `#6B6469` | 5.50:1 ✅ | `#8B8893` | 5.27:1 ✅ |
| `navInactive` PRE-fix | `#A8A29E` | **2.41:1 ❌** | `#4A4854` | **2.05:1 ❌** |
| **`navInactive` POST-fix** | **`#888286`** | **3.60:1 ✅** | **`#73686D`** | **3.43:1 ✅** |

**Gerarchia preservata:** `navActive > subTabInactive > navInactive > btnDisabled`. `subTabInactive` resta più leggibile (sub-tab in livello secondario "labels-only"); `navInactive` è weak-helper (NavBar bottom con icon dominante) ma sopra soglia AA-ui 3:1.

**Implementazione.** 1 file (`src/utils/theme.js`), 9 ins / 1 del:

```js
// 8d-C (§6.112): lift navInactive contrast da sub-AA-ui a >=3:1.
// Originale 2.05:1 (dark) / 2.41:1 (light) vs headerBg failava AA-ui 3:1.
// Lift a 3.43:1 (dark) / 3.60:1 (light): preserva pattern weak-helper
// iOS-like (icon prominent, label helper) ma garantisce leggibilita
// minima. Resta sotto subTabInactive (5.27/5.50) per gerarchia visiva
// ConfigTabBar > NavBar bottom.
//   light #888286 -> 3.60:1 vs #FAFAF7
//   dark  #73686D -> 3.43:1 vs #15141A
navInactive: dk ? '#73686D' : '#888286',
```

**Validazione CP3.4 browser (4 punti):**

| Punto | Scope | Esito |
|-------|-------|-------|
| 1 | Leggibilità NavBar bottom dark mode | ✅ Tab inattivi chiaramente leggibili (vs "fantasma" pre-fix) |
| 2 | Leggibilità NavBar bottom light mode | ✅ Tab inattivi chiaramente leggibili |
| 3 | Gerarchia attivo > inattivo preservata | ✅ Tab attivo (icona blu `navActive`) resta visivamente dominante |
| Bonus | Sub-tab Config > NavBar inactive (gerarchia secondaria) | ✅ Sub-tab `/config/profili` più leggibili dei NavBar inactive (subTab 5.27-5.50 > navInactive 3.43-3.60) |

**Razionale divergenza dal §11 v2.5.34** (che raccomandava provvisoriamente opzione a):
- (a) avrebbe collassato il pattern weak-helper deliberato di NavBar bottom (icon prominent + label helper) appiattendo NavBar e ConfigTabBar a stessa leggibilità.
- (b) preserva differenziazione semantica: NavBar bottom resta "weak helper minimo AA" (3.5:1) vs ConfigTabBar "labels-only" (5.5:1). Roberto aveva contestato la non-leggibilità non l'asimmetria.
- (c) refactor backward-incompatible scope sessione dedicata, non giustificato per problema risolto da 2-line lift.

**Classificazione.** Design system / a11y, fix definitivo, chiusura entry storica.

**Commit.** `3406e33` su branch `step-8`.

---

## 6.113 — CP4 8d-C: `__pt.wipe()` safety net (chiude §6.85 archiviazione)

**Sessione:** 8d-C (25 aprile 2026 sera, CP4).

**Stato:** ✅ **CHIUSA con archiviazione**. §6.85 chiusa contestualmente come "anomalia non riprodotta in 30min, root cause plausibile bloccata da safety net, terzo timebox scaduto".

**Contesto.** §6.85 (anomalia `nome_utente='\'\''` osservata in 8a CP browser 4→5) era stata timeboxed 2 volte senza riproduzione. AMB-8d-C.D prescriveva 3° timebox 30min con strumentazione + safety net. Vincolo §11 v2.5.34: "il terzo timebox è l'ultimo — chiusura senza fix è ammissibile per item con confidence bassa cronica".

**Diagnosi-first paga (revisione AMB-D in-session).** Skip strumentazione in favore di diagnosi grep-based:

- `grep "__pt.wipe\|wipeDatabase"` ha rivelato che `__pt.wipe = wipeDatabase` è esposto in `src/data/devCheck.js:21` come Console-accessible **senza confirm prompt**.
- Banner `devCheck.js:170` stampa esplicitamente in Console: `Try: __pt.counts() / __pt.inspect() / __pt.testRepo() / __pt.wipe()` — invito attivo a invocare `__pt.wipe()`.
- `wipeDatabase` fa `await db.delete()` totale; commento nel codice esplicita: "Caller must reload the page afterwards so Dexie re-opens with a fresh schema and re-runs the seed". **Senza reload**, Dexie continua a operare su DB cancellato (comportamento indefinito).

**Ricostruzione plausibile incident.**

1. Roberto digita Nome `'Roberto test'` → `setSetting('nome_utente', 'Roberto test')` → IDB write OK (Punto 4 verified).
2. Tra Punto 4 e Punto 5, evocazione accidentale di `__pt.wipe()` da Console (es. esplorazione dev helpers) → `db.delete()` totale, no reload → Dexie disallineato.
3. Operazioni successive (toggle tema rapido = ipotesi 2 §6.85 originale) scrivono su DB ricreato silenziosamente da Dexie con schema nuovo. `tema='light'` viene re-scritto e sopravvive (ipotesi 2 spiegata).
4. `nome_utente=''` (mai più scritto post-wipe; default seed è stringa vuota se ricreato).

Match perfetto con osservazione §6.85: tema sopravvissuto + nome azzerato. Plausibilità altissima.

**Fix (revisione AMB-D scope-extended in-session).** Wrap `__pt.wipe` con confirm prompt + auto-reload post-wipe:

```js
wipe: async () => {
  const ok = window.confirm(
    '__pt.wipe() drops the entire IndexedDB. Confirm?\n\n' +
    'The page will reload automatically after wipe.'
  );
  if (!ok) {
    console.log('[__pt.wipe] cancelled');
    return;
  }
  await wipeDatabase();
  console.log('[__pt.wipe] DONE. Reloading...');
  window.location.reload();
},
```

Migliorie rispetto alla versione pre-fix:
1. Confirm obbligatorio prima del drop totale (safety net contro click accidentali in Console DevTools autocompletion).
2. Reload automatico post-wipe (rispetta esplicitamente il vincolo del commento `wipeDatabase`, evita stato disallineato Dexie).

**Validazione CP4.4 smoke (4 punti):**

| Punto | Scope | Esito |
|-------|-------|-------|
| 1 | `__pt.wipe()` apre browser confirm | ✅ Popup appare con copy corretta |
| 2 | Click "Annulla" non distrugge DB | ✅ `[__pt.wipe] cancelled` in Console, app continua |
| 3 | Console log su cancel | ✅ Messaggio visibile |
| 4 | Pagina NON ricarica su cancel | ✅ App stabile |

**Implementazione.** 1 file (`src/data/devCheck.js`), 22 ins / 1 del.

**Skip strumentazione (revisione AMB-D in-session).** La strumentazione (console.log temporaneo in reducer + repo) era prescritta per identificare il path di scrittura su `nome_utente`. Diagnosi grep-based ha reso l'investigation strumentata ridondante: il path probabile (`__pt.wipe()` accidentale + toggle tema) è ricostruibile dalla sola lettura del codice. Tempo risparmiato: ~25min (timebox 30min) reinvestito in CP5 §6.84 + CP6 bump.

**Lezione operativa.** "Diagnosi-first paga" replica del pattern §6.105 (Sessione 8d-B CP2): leggere il codice prima di assumere bug runtime + strumentare. Per anomalie a confidence bassa cronica, il grep mirato batte la strumentazione live in costo/beneficio.

**Classificazione.** Sicurezza dev tools / safety net, chiusura archiviazione entry storica.

**Commit.** `af147e0` su branch `step-8`.

---

## 6.114 — CP5 8d-C: `onConsoleLog` filter vitest (chiude §6.84)

**Sessione:** 8d-C (25 aprile 2026 sera, CP5).

**Stato:** ✅ **CHIUSA**. §6.84 chiusa contestualmente (parte test router, completa la chiusura insieme a §6.100 app router).

**Contesto.** §6.84 era parzialmente fixata in 8d-A CP1 (app router via `src/main.jsx` future flags) ma con scope ridotto: estensione al test router (`MemoryRouter` in `renderHelpers.jsx:153`) aveva causato hang deterministico full-suite >26min in 8d-A — rollback documentato in §6.100. I 4 warning React Router persistevano in stderr di ogni `npm test -- --run`.

**Opzioni da §6.100:** (a) bisezione test colpevole, (b) `act()` wrapper attorno MemoryRouter, (c) `onConsoleLog` filter in vitest config, (d) upgrade `react-router-dom` 7.x. AMB-8d-C.E ha ratificato **(c)** come workaround non-invasivo, immediato, future-proof.

**Implementazione.** 1 file (`vitest.config.js`), 16 ins:

```js
test: {
  // ...esistente...
  // 8d-C (§6.114, chiude §6.84): sopprime i 2 warning React Router
  // future flag emessi dal MemoryRouter test (renderHelpers.jsx).
  // L'estensione delle future flag al test router in 8d-A (sed su
  // renderHelpers.jsx:153) causava hang deterministico >26min full
  // suite (§6.100). Filter onConsoleLog e' workaround non-invasivo:
  // i warning erano puro rumore stderr, nessuna info diagnostica
  // utile. No-op naturale al futuro upgrade react-router-dom 7.x.
  onConsoleLog(log, type) {
    if (
      type === 'stderr' &&
      log.includes('React Router Future Flag Warning')
    ) {
      return false;
    }
    // undefined = default emit (no override)
  },
},
```

**Validazione CP5.3:**

```
$ npm test -- --run 2>&1 | grep -c 'React Router Future Flag Warning'
0
$ npm test -- --run | tail
Test Files  31 passed (31)
     Tests  313 passed (313)
  Duration  6.29s
```

- Warning count: 4 → **0** (target raggiunto).
- Test count: 313/313 invariato.
- Durata: 6.29s (vs pre-fix ~6.19s, no overhead misurabile).

**Razionale opzione (c).**

- **Zero rischio hang** (vs (b) `act()` wrapper che avrebbe richiesto modifiche al test router stesso, riproducendo il rischio §6.100).
- **No-op naturale al futuro upgrade RR7** (quando i future flag saranno default in `react-router-dom` 7.x, il filter non matcherà più nulla; nessuna rimozione necessaria).
- **Costo zero diagnostic** (i warning erano rumore stderr senza info utile; il loro scopo è "guidare il developer al opt-in", non diagnostic test).

**Alternative scartate:**
- (a) **Bisezione hang.** Costo alto (~1h+) per identificare il test file colpevole; benefit basso (anche identificandolo, fix richiederebbe `act()` o future flag custom).
- (b) **`act()` wrapper.** Rischio di reintrodurre hang §6.100; ortogonale al problema reale.
- (d) **Upgrade RR7.** Fuori scope sessione (semver bump app-wide).

**Classificazione.** Test infra / DX, fix workaround future-proof, chiusura entry storica.

**Commit.** `db30fae` su branch `step-8`.

---

## 6.115a — CP1 9-A: 3 helper ISO `utils/time.js` (AMB-9.A/D)

**Sessione:** 9-A implementativa (26 aprile 2026, CP1).

**Stato:** ✅ **CHIUSA**.

**Scope.** Aggiunti 3 helper monouso in `utils/time.js`: `composeIsoDateTime(dateStr, hhmm)` produce `'YYYY-MM-DDTHH:MM'`, `addMinutesToIso(iso, minutes)` aritmetica con carry-over via `Date`, `parseIsoDateTime(iso)` ritorna `{dateStr, hhmm, dateObj}`. `minutesToTime` invariato (resta HH:MM per `ora_prevista`). DST out-of-scope (AMB-9.D, limitazione documentata).

**Test.** Nuovo file `src/utils/time.test.js` (+6 test): 3 happy path + 3 edge (cross-midnight `addMinutesToIso('2026-04-26T23:00', 480) → '2026-04-27T07:00'`, month-rollover `'2026-04-30T22:00' + 240 → '2026-05-01T02:00'`, round-trip invariante).

**Commit.** `d5248a0` su branch `step-8`.

---

## 6.115b — CP3 9-A: `recalc.js` ISO propagation cross-midnight (AMB-9.A) + planBuilder invariante

**Sessione:** 9-A implementativa (26 aprile 2026, CP3).

**Stato:** ✅ **CHIUSA** (chiude **§6.18** a livello dominio).

**Scope.** `applyAssunzione`/`applySalto`/`autoSkip`/`applyRecupero` in `recalc.js` compongono `ora_ricalcolata` via `addMinutesToIso(composeIsoDateTime(entry.dateStr, ora_effettiva_hhmm), intervallo*60)`. Sostituisce `minutesToTime(effMin + intervallo*60)` che produceva HH:MM mod 1440 (root cause §6.18). `mergeLogIntoEntry` in `planBuilder.js` confermato opaque ISO (invariante §6.23 esteso, no transformation).

**Test.** +6 test cross-midnight in `recalc.test.js` (4 scenari `apply*` + 1 round-trip) + 1 invariante in `planBuilder.test.js`. Esempio: dose 8h presa alle 23:00 su entry `dateStr='2026-04-26'` → entry N+1 `ora_ricalcolata === '2026-04-27T07:00'`.

**Limitazione nota — §6.119.** Il bug §6.18 è chiuso a livello DATI (l'ISO porta correttamente l'informazione di data); il bug VISIVO sottostante (card cross-midnight resta sotto separator OGGI invece di essere migrata sotto separator DOMANI nella vista Oggi) richiede bump di `entry.dateStr` non implementato in CP3. Documentato come §6.119 deferred.

**Commit.** `d5de70f` su branch `step-8`.

---

## 6.116 — CP4 9-A: tear-down workaround §6.26 (prima iterazione, sostituita da §6.118)

**Sessione:** 9-A implementativa (26 aprile 2026, CP4).

**Stato:** ⚠️ **SOSTITUITA da §6.118** (semantica corretta). Entry mantenuta come storico per tracciabilità decisionale.

**Scope originale (commit `816a49f`).** Rimossa `isCrossMidnightRecalc(entry)` HH:MM-heuristic detector (`< ora_prevista − 60min`, workaround §6.26). Sostituita con `isEntryFutureDate(entry, todayDateStr) → entry.dateStr > todayDateStr`. Prop opzionale `todayDateStr` aggiunta a `DoseCard` (§6.116a), propagata da `OggiView` con `now.dateStr`.

**Falsificazione in CP browser punto 2.** Scenario reale: PRESA Olevia dose 1 alle 14:00 su intervallo 12h → `ora_ricalcolata` = 14:00 + 12h = 02:00 next day. Atteso badge "⚠ orario: domani" sulla card di OGGI (la dose-2 di oggi ricalcolata cross-midnight). Osservato: badge **non firato** su card oggi, **firato** invece su card di domani (dose-2 naturale di domani, dove badge è ridondante).

**Diagnosi root cause.** La gate `entry.dateStr > todayDateStr` cattura entry di domani, non entry-oggi-con-recalc-domani. La spec §11 v2.5.36 AMB-9.D era semanticamente errata: il caso §6.18 reale è `entry.dateStr=oggi AND ora_ricalcolata.dateStr=domani`, dove `entry.dateStr === todayDateStr` quindi `entry.dateStr > todayDateStr === false`. Il helper non poteva cogliere il caso pensato.

**Mea culpa metodologica.** Decisione "trust §11 letterale" presa a Q-CP4-2 con autorizzazione "decidi tu". Regola critica progetto #2 (fermarsi su incongruenze) avrebbe dovuto innescare CP analisi pre-impl. Conseguenza: 1 commit aggiuntivo `0e70a38` per fix.

**Commit.** `816a49f` (sostituito).

---

## 6.116b — CP4 9-A: consumer drift `uiState.js` + `OggiView` gap calc post-ISO

**Sessione:** 9-A implementativa (26 aprile 2026, CP4).

**Stato:** ✅ **CHIUSA** (in commit `816a49f`, mantenuta valida post-§6.118).

**Scope.** Bug latente catturato durante analisi pre-CP4: `getCardState` e `groupEntriesByDayAndMomento` in `uiState.js` chiamavano `timeToMinutes(entry.ora_ricalcolata ?? entry.ora_prevista)` diretto. Post-CP3 `ora_ricalcolata` è ISO `'YYYY-MM-DDTHH:MM'` ma `timeToMinutes` accetta solo HH:MM; il parse di un ISO (es. `'2026-04-27T07:00'`) come HH:MM produce minuti garbage. I 313 test passavano solo perché tutte le fixture esistenti usavano ancora HH:MM (test `'prefers ora_ricalcolata'` con valore `'10:30'`).

Stesso bug latente in `OggiView::gap calc` (`thisTime !== prevTime` con confronto stringa mista ISO/HH:MM sempre `!==`).

**Fix.** Helper `effHHMM(entry)` (file-scope `uiState.js`) e `entryHHMM(entry)` (top-level `OggiView.jsx`) estraggono HH:MM via `parseIsoDateTime` quando `ora_ricalcolata` set, fallback `ora_prevista`. Consumer aggiornati: `getCardState`, sort di `groupEntriesByDayAndMomento`, computazione `primaOra`, calcolo `needsGap` in OggiView.

**Test.** 2 fixture esistenti aggiornate HH:MM → ISO in `uiState.test.js` (`'prefers ora_ricalcolata'` con `'2026-04-19T10:30'`, `'sorts entries within a day'` con `'2026-04-19T09:00'`). Net Δ test: 0 (le modifiche fungono da regression test naturale).

**Lezione.** Q-CP3-3 finding: cambi di tipo a livello dominio (CP3 ISO propagation) richiedono pre-CP grep esaustivo dei consumer downstream (`grep -rn 'ora_ricalcolata' src/`), non solo audit dei file modificati.

**Commit.** `816a49f` (incluso in CP4 commit, mantenuto post-§6.118 in `0e70a38`).

---

## 6.117 — CP2 9-A: Dexie v1→v2 migration ora_ricalcolata ISO + fake-indexeddb (AMB-9.B/C)

**Sessione:** 9-A implementativa (26 aprile 2026, CP2).

**Stato:** ✅ **CHIUSA**.

**Scope.** `db.version(2).stores({...})` con stores invariati (campo `ora_ricalcolata` non-indexed, typeless Dexie) + upgrade hook self-heal `length===5` (predicato HH:MM legacy) → `data + 'T' + HH:MM`. Dev-dep `fake-indexeddb@^6` aggiunta a `package.json` per test integrazione environment-globale. Pre-CP grep gate `seed.js`/`devCheck.js` zero hit confermato (no riferimenti a `ora_ricalcolata` in seed/dev tooling, evita coupling).

**Trade-off.** Cross-midnight legacy entries (HH:MM mod 1440 storico) **NON** sono recuperate dalla migration: `'07:00'` legacy diventa ISO `'<entry.data>T07:00'` mantenendo l'errore §6.18 originale. Self-heal automatico al prossimo `apply*` che le tocca (AMB-9.B accettato). `__pt.wipe()` come escape hatch (§6.113).

**Test.** Nuovo file `src/data/db.migration.test.js` (+3 test): legacy HH:MM convertito, ISO già migrato no-op, NULL preservato.

**Commit.** `d0d4e5e` su branch `step-8`.

---

## 6.117a — types.js JSDoc drift `ora_ricalcolata` HH:MM → ISO (Q-CP3-2 differito)

**Sessione:** 9-A implementativa (26 aprile 2026, CP4 — differito da CP3).

**Stato:** ✅ **CHIUSA**.

**Scope.** 3 occorrenze JSDoc in `src/domain/types.js` aggiornate da `'HH:MM' or null` a `ISO datetime 'YYYY-MM-DDTHH:MM' or null (§6.18 closure, §6.117)`:
1. `LogAssunzione.ora_ricalcolata` (~r.60)
2. `PlanEntry.ora_ricalcolata` (~r.78)
3. `PlanEntry.ora_ricalcolata_originale` (~r.79, suffisso `(pre-recovery snapshot, §6.18 closure)`)

Differito da CP3 a CP4 perché Q-CP3-2 emerso post-merge CP3 (drift documentale, non funzionale). sed surgical 2-comandi BSD/GNU compatible.

**Lezione.** I JSDoc `@property` sono spec-of-truth complementare al codice; il drift silente è facile da introdurre in CP che cambiano runtime types ma non toccano `types.js`. Aggiungere a checklist post-CP impl: "grep types.js per occorrenze del field modificato".

**Commit.** `816a49f` (incluso in CP4 commit).

---

## 6.118 — CP4-fix 9-A: `isCrossMidnightRecalc` ISO-aware (revert §6.116a)

**Sessione:** 9-A implementativa (26 aprile 2026, CP4-fix post-CP browser punto 2).

**Stato:** ✅ **CHIUSA** (chiude **§6.26** definitivamente, sostituendo §6.116 prima iterazione).

**Scope.** Fix ex-post di §6.116 dopo falsificazione in CP browser punto 2 (vedi §6.116 per diagnosi). Implementazione:

```js
export function isCrossMidnightRecalc(entry) {
  if (!entry?.ora_ricalcolata) return false;
  return parseIsoDateTime(entry.ora_ricalcolata).dateStr > entry.dateStr;
}
```

Confronto lex `'YYYY-MM-DD' > 'YYYY-MM-DD'` è cronologico per quel formato. Cattura esattamente il caso §6.18: entry con dateStr=oggi e ora_ricalcolata.dateStr=domani.

**Revert §6.116a.** Prop opzionale `todayDateStr` rimossa da `DoseCard` (signature + JSDoc). Propagazione `todayDateStr={today}` rimossa da `OggiView` JSX. Il helper è ora self-contained, nessun arg esterno.

**Test.** `uiState.test.js` 3 test `isEntryFutureDate` → 3 test `isCrossMidnightRecalc` ISO-aware (same-day false, cross-midnight true, null false). `DoseCard.test.jsx` test badge riscritto: `entry={...plan[0], ora_ricalcolata: '2026-04-20T07:30'}` (entry su 2026-04-19, recalc domani). Net Δ test: 0.

**Validazione CP browser punto 2 post-§6.118.**
| Card | Atteso | Osservato |
|---|---|---|
| `2026-04-25-4-2` | no badge | `false` ✅ |
| `2026-04-26-4-2` (recalc cross-midnight) | badge ON | `true` ✅ |
| `2026-04-27-4-2` (dose naturale domani) | no badge | `false` ✅ |

**Lezione metodologica.** Q-CP4-2 "trust §11 letterale" è stato un errore. Pattern correttivo per future sessioni con AMB ratificate da analisi-first: validare la semantica del helper proposto contro 2-3 scenari concreti PRIMA di scrivere codice, anche se sembrano ovvi. Tempo CP browser breve (~5min) ha catturato bug che 2 ore di test unitari avrebbero mancato (le fixture HH:MM non esercitavano la condizione).

**Commit.** `0e70a38` su branch `step-8`.

---

## 6.119 — Bug visivo §6.18 sottostante: card cross-midnight non bumpata di giorno (deferred)

**Sessione:** 9-A implementativa (26 aprile 2026, scoperta in CP browser punto 2).

**Stato:** ⏳ **DEFERRED** post-9-A (candidate 9-B o sessione dedicata pre-Step 10).

**Contesto.** Post-§6.118 il badge "⚠ orario: domani" funziona correttamente, ma la card resta visivamente sotto il date separator "Oggi · …" invece di migrare sotto "Domani · …". Esempio reale dal CP browser:

```
Card key:                    2026-04-26-4-2
Display orario:              07:54 (cross-midnight da 14:00 + 12h = 02:00, drift §6.120 ma irrilevante per §6.119)
Sezione visiva:              Oggi (date separator pill = oggi)
Sezione semantica corretta:  Domani (perché ora_ricalcolata.dateStr = 2026-04-27)
```

**Causa.** `planBuilder.js` produce entry con `entry.dateStr = entry.dateStr originale` indipendentemente dal valore di `ora_ricalcolata`. Quando recalc cross-midnight scatta in `apply*`, l'entry mantiene `dateStr=oggi` mentre `ora_ricalcolata.dateStr=domani`. La vista `OggiView` raggruppa per `entry.dateStr` (via `groupEntriesByDayAndMomento`), quindi la card resta nel gruppo di oggi.

**Opzioni di fix (out-of-scope 9-A).**
- **(A) Bump `entry.dateStr` in `planBuilder` quando ora_ricalcolata cross-midnight.** Conseguenze cascade: la entry si "sposta" tra giorni durante recalc; `mergeLogIntoEntry` deve ri-mappare; key dell'entry (`${dateStr}-${farmaco_id}-${dose_numero}`) cambia → break referential equality, può rompere React keys e `useAutoBeep`.
- **(B) Lasciare `entry.dateStr` invariato, raggruppare in vista per `effective_dateStr = ora_ricalcolata.dateStr ?? entry.dateStr`.** Più sicuro a livello dominio (entry immutabili) ma richiede modifica `groupEntriesByDayAndMomento` + selectors counters.
- **(C) Mitigation status quo (badge §6.118).** Già in place. UI segnala il caso senza richiedere ri-architettura.

**Decisione differimento.** §6.119 non blocca consegna 9-A: il badge §6.118 è UX accettabile (l'utente è informato). Fix proprio richiede analisi-first dedicata (scelta A vs B, impatto su counters/selectors/test).

**Validazione UI.** Entry rimane visibile e actionable in entrambi i casi (PRESA tap funziona); solo il posizionamento visivo è errato. Severity: bassa.

---

## 6.120 — `actions.presa()` ignora `simulated_now` in DEV (deferred)

**Sessione:** 9-A implementativa (26 aprile 2026, scoperta in CP browser punto 1).

**Stato:** ⏳ **DEFERRED** post-9-A (candidate 9-B o sessione dedicata).

**Contesto.** CP browser punto 1 avrebbe dovuto verificare recalc same-day: PRESA Olevia dose 1 alle 08:00 (slider 480) → atteso dose 2 ricalcolata 08:00+12h=20:00 stesso giorno, badge `+30 min`, NESSUN badge cross-midnight. **Osservato invece:** ora_ricalcolata = ~08:00 next day (cross-midnight), badge cross-midnight ON.

**Diagnosi.** `actions.presa(entryKey)` chiamata senza override usa `Date.now()` real-time, **non** `now` derivato da `simulated_now`. Il DEV slider muove `now` UI per `getCardState`/`useAutoBeep` ma `actions.presa` registra `ora_effettiva` da clock di sistema reale. Calcolo verificato: ora reale 19:55 + 12h = 07:55 next day ≈ 08:15 osservato.

**Impatto.**
- **Production:** zero. In production `simulated_now` è null/disabled, `actions.presa()` legge correttamente l'ora reale.
- **DEV:** test browser scenari time-shifted impossibili senza override esplicito `actions.presa(key, { dataEffettiva, oraEffettiva })`.
- **Test unit:** zero. Test usano `actions.presa(key, override)` esplicito o mock di `now`.

**Workaround temporaneo per CP browser future.**
```js
const slider = document.querySelector('input[type="range"]');
slider.value = 480;
slider.dispatchEvent(new Event('input', { bubbles: true }));
const card = document.querySelector(`[data-entry-key="${todayStr}-4-1"]`);
// NO: card.querySelector('button[aria-label="Registra dose presa"]').click();
// SI: invocare actions.presa programmaticamente con override
__pt.app.actions.presa(`${todayStr}-4-1`, { dataEffettiva: todayStr, oraEffettiva: '08:00' });
```

**Fix proprio (out-of-scope 9-A).** `actions.presa` thunk dovrebbe leggere `now` dal Provider (via context o param injection) anziché direttamente `Date.now()`/`new Date()`. Pattern simile a `useAutoBeep` che usa `now` iniettato.

**Decisione differimento.** §6.120 non blocca consegna 9-A: il critico CP browser punto 2 (cross-midnight) è stato verificato indipendentemente con presa alle 14:00 (slider 840) — il drift `simulated_now` ha solo cambiato l'ora osservata da `~02:00` (atteso) a `~07:54` (real-time + 12h = 19:54+12h = 07:54), ma la condizione cross-midnight è scattata comunque. Severity: bassa (DEV-only).

---

## 6.136 — Gate `__pt` dev-only rimosso temporaneamente per CP browser PWA build (Sessione 9-B parte 4/4)

**Tipo:** workaround sessione + revert in-session. **Stato:** chiusa post-revert.

`AppContext.jsx:194` ha `if (!import.meta.env.DEV) return` come gate per esporre `window.__pt = {app, notifications}` (tooling CP browser). In build production il gate blocca l'esposizione, e §11 line 3209-3216 presupponeva implicitamente che il tooling fosse disponibile in PWA standalone (richiede build). Tensione architetturale: PWA install richiede build, tooling `__pt` richiede dev → incompatibili sotto `import.meta.env.DEV` come unico gate.

**Decisione esecutiva 9-B parte 4/4:** rimuovere temporaneamente il gate (commento applicato `// §6.136 CP-BROWSER 9-B parte 4/4: gate disabled (REVERT pre-CP6)`), build production con `__pt` esposto, eseguire CP browser, **revertare pre-chiusura sessione**. Pattern: backup `.bak.cp-browser` simmetrico a `.bak.cpN` di §6.135 ma scope più ampio (working tree only, mai committed).

**Esito:** patch applicata Step 7, revertata Step 21a. File `AppContext.jsx` su disco identico a pre-sessione (verifica: `grep -c '§6.136' src/state/AppContext.jsx → 0`).

**Lessons learned:**
- §11 line 3209-3216 va riformulato in parte 5/5 con esplicita procedura "patch + build + revert" come setup CP browser
- Considerare in Wave-C un secondo gate dedicato (es. `import.meta.env.VITE_PT_TOOLING === '1'`) per evitare patch ad-hoc ricorrenti
- L'opzione di abilitare `vite-plugin-pwa` in dev (`devOptions: { enabled: true }`) **NON** è alternativa equivalente: HMR + SW interagiscono male, e i CP browser ne risentono

---

## 6.137 — Icone PWA placeholder valide (Sessione 9-B parte 4/4)

**Tipo:** asset patch + revert in-session. **Stato:** chiusa post-revert.

Le 3 icone PNG in `public/icons/` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) erano **placeholder 1×1 px stub** (68 byte ciascuna), pre-esistenti dalla scaffolding iniziale e mai sostituite. Conseguenza: Chrome rifiuta install ("No supplied icon is at least 144 pixels square") nonostante manifest, SW e HTTPS context tutti OK. CP browser §11 line 3209 ("Chrome PWA Mac in standalone") implicitamente richiedeva install funzionante.

**Decisione esecutiva 9-B parte 4/4:** generare al volo 3 PNG placeholder validi (theme_color `#15141A` solid + lettera "P" bianca stilizzata via Pillow nel sandbox), consegna via installer self-extracting con SHA-1 verification (pattern §6.135 esteso), backup `.bak.cp-browser` per revert. Asset di Fase 2 placeholder definitivi sono fuori scope (decisione design grafico differita a Wave-C o Fase 3).

**Esito:** install PWA Chrome funzionante (verificato Step 9c-9d, "Install page as app..." in menu Chrome 147+), patch revertata Step 21a. Stub originali 1×1 px ripristinati (working tree pulito).

**Lessons learned:**
- L'install PWA è una pre-condizione del CP browser §11 da verificare al CP0 (non assumere sia disponibile out-of-box)
- Generazione asset al volo via sandbox + installer self-extracting è pattern riproducibile per future situazioni
- Da considerare in Wave-C: design icone PharmaTimer definitive con palette progetto + maskable safe-area corretta

---

## 6.138 — Bug latente: `entry.farmaco_id` / `entry.dose_numero` nested under `entry.orario` (Sessione 9-B parte 4/4 hotfix)

**Tipo:** bug fix latente. **Stato:** **chiusa committed `fada4a6`** (figlio di `f856b46` Changelog v2.5.40-rc).

**Bug scoperto durante CP browser P1:** dump runtime di `state.plan[10]` in PWA standalone ha rivelato che il canonical shape della plan entry annida `farmaco_id` e `dose_numero` sotto `entry.orario`, NON come properties flat su `entry`:

```
entry shape reale (runtime):
{
  key, dateStr, farmaco (object denormalizzato), 
  orario: { farmaco_id, dose_numero, offset_minuti, ... },
  ora_prevista, ora_ricalcolata, stato, ...
}
```

`services/notifications.js` (CP4 §6.128) leggeva flat:
- `rescheduleAllNotifications` riga ~191: `selectFarmacoById(state, entry.farmaco_id)` → `entry.farmaco_id === undefined` → tutti gli entry skippati → `pending: 0`
- `showDoseNotification` riga ~119: `dose-${farmaco.id}-${entry.dose_numero}-${dateStr}` → entryKey con `undefined` interpolato

CP4 §6.128 aveva corretto un bug di accesso `state.farmaci[id]` (array-as-dict) con `selectFarmacoById(state, entry.farmaco_id)`, mantenendo però il path errato `entry.farmaco_id`. Bug latente non scoperto da unit test perché le 13 fixture in `notifications.test.js` + `AppContext.test.jsx` usavano lo shape flat (replicava il bug).

**Fix applicato (commit `fada4a6`):**
- `services/notifications.js`: `entry.farmaco_id` → `entry.orario?.farmaco_id` (1 occorrenza, riga 174)
- `services/notifications.js`: `entry.dose_numero` → `entry.orario?.dose_numero` (1 occorrenza, riga ~120 dentro `showDoseNotification`)
- `services/notifications.test.js`: 13 fixture allineate (11 single-line via regex, 2 multi-line via regex distinto)
- `state/AppContext.test.jsx`: 1 fixture multi-line allineata

**Test:** 371/371 verde, Δ=0 (fixture aligned in-place, no new test).

**Validazione runtime:** unit test verde, **PWA standalone NON validato a wall clock 21:00+** (P1 dipende da `pending > 0` ma alle 21:00 nessuna dose demo è ancora futura — vedi §6.141). Validation runtime deferred a parte 5/5.

**Lessons learned:**
- §6.128 dovrebbe aver verificato anche il **path** verso il farmaco_id, non solo l'accesso a `state.farmaci`. Pattern §6.118 (validate concrete scenario, not literal prompt) non applicato in profondità sufficiente per CP4.
- Pattern di scoperta CP browser efficace: dump runtime entry shape con `JSON.stringify(state.plan[N], null, 2)` rivela mismatch shape immediatamente.
- Quando si fixa bug latente con fixture pre-esistenti, **assumere che le fixture replichino il bug** e allinearle al shape canonico runtime — non al shape canonico "atteso".

---

## 6.139 — SezioneNotifiche button-style vs slider 4-state AMB-9.F' (deferred Wave-C)

**Tipo:** drift implementativo UX. **Stato:** deferred Wave-C.

Implementazione CP5 §6.133 della SezioneNotifiche in `ImpostazioniTab.jsx` rende lo stato `granted-on` come **button rettangolare grigio scuro** ("Notifiche dosi"), non come **slider/toggle 4-state** che AMB-9.F' literal §22.20 prescriveva. Il button è funzionale (tap → prompt OS → `notifiche_attive=1`) ma l'affordance visiva è ambigua: sembra disabilitato anche quando attivo, l'utente non distingue stati `(off, default, granted-off, granted-on)` a colpo d'occhio.

Scoperto durante CP browser parte 4/4 P1 (Roberto: "A quale toggle UI visivamente 'on'?"). UX da raffinare con pattern slider/switch standard (es. iOS-style toggle, già usato nella stessa pagina per altre impostazioni boolean).

**Tipologia:** drift letterale §6.133 (che già documentava drift terminologico §11 vs AMB-9.F'). §6.139 è il **drift visivo** complementare. AMB-9.F' literal vincolante è 4-state slider; §6.133 e §6.139 entrambe rappresentano divergenze accettate temporaneamente.

**Risoluzione attesa:** Wave-C polish UX, oppure sessione dedicata "ImpostazioniTab notifiche redesign" se altre rifiniture si accumulano sulla stessa view.

---

## 6.140 — `actions.init()` non re-arma `rescheduleAllNotifications` al boot (deferred Wave-C)

**Tipo:** bug minore + investigation pending. **Stato:** deferred Wave-C.

Scoperta durante CP browser parte 4/4 P1: dopo PWA hard reload con `permission==='granted'` + `notifiche_attive===1` persistito a DB, lo stato post-init mostra `pending: 0`. Trigger 1 di §6.126/AMB-9.G' (init reschedule) NON arma i timer.

**Workaround validato:** `await window.__pt.app.actions.rescheduleAllNotifications?.()` da Console produce reschedule funzionante (post-§6.138 fix).

**Ipotesi cause:**
- (a) `services` non ancora iniettato nel `actions` factory al primo dispatch di init (race condition con `useEffect` dell'AppProvider)
- (b) Gate condizionale interno a `maybeReschedule` salta init se `permission !== requestPermissionResult` (improbabile, codice non lo prevede)
- (c) Sequencing reducer: `init()` dispatch carica impostazioni DA DB DOPO il primo `maybeReschedule(getState())`, quindi `notifiche_attive` è ancora `undefined` al check del gate

Va investigato in parte 5/5 o Wave-C con dump trace di `services` + `state.impostazioni.notifiche_attive` al momento del trigger 1 init.

**Impact:** medio. UX: utente che chiude/riapre PWA con notifiche già attivate perde i timer fino a prossimo trigger (cambio profilo, edit farmaco, visibility change). Mitigazione naturale: trigger visibility/focus al primo show della PWA dovrebbe ri-armare entro 1 secondo.

---

## 6.141 — `simulatedNow` non propaga ai `setTimeout` del singleton notifications (parte 5/5 design blocker)

**Tipo:** limitazione architetturale **scoperta**. **Stato:** **active blocker per CP browser P1-P5**.

Architettura attuale del singleton `notifications`:
- `scheduleNotification({fireAt, ...})` calcola `delay = fireAt - Date.now()` con `Date.now()` **wall clock OS-bound**
- `setTimeout(callback, delay)` agganciato al wall clock browser
- Il filtro `if (delay <= 0) return` (Q-CP2.3=A no-op silenzioso) rifiuta ogni dose con `fireAt <= wall clock now`

Conseguenza: `actions.setSimulatedNow('06:30')` aggiorna `state.simulatedNow` (e quindi `selectToday`/`resolveNow`/UI), ma **NON sposta** `Date.now()` percepito dal singleton. Quindi a wall clock 21:00 con `simulatedNow='06:30'`:
- UI mostra plan come fosse mattina (corretto)
- `rescheduleAllNotifications` itera correttamente le 9 entries today (post-§6.138)
- `scheduleNotification` però rifiuta tutte le 9 perché `fireAt 07:00 < wall clock 21:00`

Il bug **non è** §6.138 né architetturale di `notifications.js` — è una **limitazione del simulatore di tempo** che non può fingere il futuro per i `setTimeout` reali del browser. È filosoficamente coerente: il simulatore è progettato per la UI, non per il time travel dei native API browser.

**Conseguenza CP browser:** P1 (permission flow + schedule) richiede una **dose realmente futura nel wall clock del momento di esecuzione**. Con piano demo statico (orari 07:00-20:30), CP browser eseguibile solo nella finestra reale 06:30-20:30. Eseguendolo dopo le 20:30, `pending: 0` è il comportamento corretto (nessuna dose schedulabile), ma rende P1-P5 invalidanti vacuously.

**Opzioni di workaround per parte 5/5 analisi-first:**

| Opt | Descrizione | Pro | Contro |
|-----|-------------|-----|--------|
| **A** | Helper `actions.scheduleTestDose(minutesFromNow=5)` thunk dedicato, crea entry sintetica `dateStr=today` `ora_prevista=now+5min`, dispatch `ADD_PLAN_ENTRY`, trigger reschedule | Pulito, isolato, riutilizzabile per Wave-C smoke test runtime | Richiede nuovo thunk + 1 case reducer + test (~3-5 LOC + 2-3 test) |
| **B** | Farmaco demo dinamico "TestNotif" con `ora_prevista` calcolato a `now + 5min` reali, aggiunto via `actions.addFarmaco`, scattenza naturalmente reschedule via §6.126 trigger 5.4 | Riusa flusso esistente, zero nuovo codice | Richiede UI tap o Console multi-step, pollusce DB demo |
| **C** | Accept CP browser eseguibile **solo finestra 06:30-20:30** wall clock + istruzioni operative tempo-vincolate | Zero codice, zero design | Procedural fragile, non automatizzabile, P1-P5 ripetibili solo in finestra ristretta |

Raccomandata in apertura parte 5/5: **opzione A** per qualità + riusabilità. Da congelare in analisi-first parte 5/5.

**Risoluzione completa Wave-C / Fase 3:** Opzione 2 server-side (Web Push backend Mac Mini, già scheduled in §22.20 lessons learned 9-B) elimina il problema alla radice — il backend programma push notification a fireAt assoluto, senza dipendere da setTimeout client-side.

---

## 6.142 — `actions.scheduleTestDose` thunk per CP browser smoke test (Sessione 9-B parte 5/5 CP1)

**Scope:** Implementazione del workaround §6.141 secondo opzione A ratificata in analisi-first parte 5/5 (AMB-parte5.A). Nuovo thunk `scheduleTestDose(minutesFromNow=5, opts={farmacoId?})` in `actions.js` per validazione runtime dello scheduling notifications senza dipendere da `simulatedNow`.

**Design (originale, vedi §6.145 per fix successivo):**
- Crea entry sintetica con `dateStr=today`, `ora_prevista = now + minutesFromNow` calcolato sul wall clock reale (`Date.now()`, non `resolveNow`)
- Shape canonico post-§6.138: `entry.orario.{farmaco_id, dose_numero, offset_minuti}` nested
- `dose_numero=999` sentinel garantisce `entryKey` stabile per (farmaco, day) → 2× invocazioni con stesso `farmacoId` collassano via tag-as-Map-key del singleton notifications (validazione P8 idempotenza)
- Default `farmacoId = state.farmaci[0].id`; opzionale override via `opts.farmacoId`
- Throw `NOT_READY` se `state.status !== 'ready'`, `NO_FARMACI` se array vuoto, `FARMACO_NOT_FOUND` se override id non trovato
- Bypassa intenzionalmente il gate `maybeReschedule` (chiamata diretta `rescheduleAllNotifications`, non via wrapper): smoke test non richiede `notifiche_attive=1` come prerequisito formale (il chiamante controlla via Console)
- Persistenza runtime-only: nessuna scrittura DB. Wiped al prossimo `rebuildPlan` (cambio profilo, midnight rollover). Coerente con scope smoke test
- Esposto via `__pt.app.actions.scheduleTestDose(...)` quando build con `VITE_PT_TOOLING=1` (vedi §6.143)

**Test:** `actions.scheduleTestDose.test.js` con 3 scenari (happy path, NOT_READY, NO_FARMACI) + (4) state freshness aggiunto in CP1.1 (vedi §6.145). Pattern `vi.useFakeTimers` + `vi.setSystemTime` per asserzione deterministica su `ora_prevista`. Mock dispatch mutativo + closure state per simulare flusso sincrono `dispatch → reschedule`.

**Δ codice:** +49 LOC in `actions.js` (function block + 1 entry in return obj), +143 LOC test file nuovo. **Δ test:** +3 (371→374). Commit `3de09ab` branch `step-8` (`9-B parte 5/5 CP1 — scheduleTestDose thunk per CP browser smoke test (§6.142)`).

**Prerequisito di funzionamento:** §6.143 (gate `__pt` ampliato a `VITE_PT_TOOLING`) + §6.144 (icone PWA placeholder valide) committed nel commit precedente `d7f252a`.

---

## 6.143 — Gate `__pt` esteso a `VITE_PT_TOOLING` per build production tooling-aware (Sessione 9-B parte 5/5 CP-pre)

**Scope:** Rifattorizzazione strutturale del gate dev-only `__pt` console handle in `AppContext.jsx:194` per supportare CP browser ripetibili senza patch+revert manuali (deviazione §6.136 della parte 4/4 elevata a fix permanente).

**Decisione (AMB-parte5.D D1):** introdurre env var `VITE_PT_TOOLING` lato build e ampliare il gate da `if (!import.meta.env.DEV) return;` a `if (!import.meta.env.DEV && !import.meta.env.VITE_PT_TOOLING) return;`. Aggiunto script `package.json` `"build:tooling": "VITE_PT_TOOLING=1 vite build"` per rendere la build CP-browser one-command idempotente.

**Invariante di sicurezza (verificato):**
- `npm run build` (production standard) **NON** espone `__pt` → bundle minified `grep -c '__pt'` = 0 nella suite CP-pre Step 5
- `npm run build:tooling` espone `__pt` come previsto → bundle minified contiene `__pt` keyword

**Razionale lift-out:** la deviazione §6.136 della parte 4/4 (patch+revert ad ogni CP browser) era costo operativo ricorrente che si sarebbe ripresentato in Wave-C (smoke test future). Il refactor è 1 riga di gate + 1 script in `package.json` + un commento §6.143. Costo minimale, eliminazione completa del pattern transient.

**Δ codice:** 1 riga in `AppContext.jsx:194`, +1 script in `package.json`. **Δ test:** 0 (gate non testato in unit, validato in CP-pre browser). §6.136 storica resta "chiusa parte 4/4"; §6.143 è il fix permanente parte 5/5. Commit `d7f252a`.

---

## 6.144 — Icone PWA placeholder valide (192/512/maskable-512) committed (Sessione 9-B parte 5/5 CP-pre)

**Scope:** Sostituzione delle icone PWA stub da 68 byte (placeholder Vite scaffolding) con 3 PNG validi 192×192, 512×512, e 512×512 maskable, generati via Pillow nel sandbox e committati come placeholder definitivi Fase 2 (icone artistiche definitive Wave-C).

**Decisione (AMB-parte5.D D2):**
- Design: lettera "P" bianca su fondo `#15141A` (theme color PharmaTimer), font sans-serif bold
- 192×192 e 512×512 standard: "P" al ~70% della dimensione, full-bleed
- Maskable 512×512: "P" al ~45% della dimensione per safe-area circolare Android (icone di Chrome/Android applicano crop circolare aggressivo)
- Path: `public/icons/{icon-192,icon-512,icon-maskable-512}.png` (allineato al riferimento `vite.config.js` VitePWA `manifest.icons[]`)

**Razionale lift-out:** la deviazione §6.137 della parte 4/4 (icone valide installate temporaneamente per Chrome PWA install, poi revertate a stub) era anch'essa transient. Le icone valide in repository non incidono sull'app production (le definitive Wave-C le sovrascriveranno) e sbloccano `Cmd+T` apri-PWA-install in Chrome senza patch ad-hoc.

**Verifica visiva (sandbox claude):** entrambi 192 e maskable-512 sono stati renderizzati e ispezionati pre-delivery (lettera "P" centrata, no clipping, contrasto pulito).

**Δ codice:** 3 PNG binari (1578/4423/3450 byte). **Δ test:** 0. §6.137 storica resta "chiusa parte 4/4"; §6.144 è il fix permanente parte 5/5. Commit `d7f252a` (combinato con §6.143 in unico commit "CP-pre" perché entrambi setup-ripetibile).

---

## 6.145 — Fix stateRef lag in `scheduleTestDose`: pass fresh state to rescheduleAllNotifications (Sessione 9-B parte 5/5 CP1.1 hotfix)

**Scope:** Hotfix critico al thunk `scheduleTestDose` (§6.142) emerso durante CP browser pre-§6.146 blocking. La versione iniziale chiamava `rescheduleAllNotifications(getState(), services.notifications)` **dopo** `dispatch({type:'SET_PLAN', payload:[...state.plan, syntheticEntry]})`, leggendo lo stato via `getState()` di seconda lettura. Pattern stateRef lag (memory user / §6.95 / §6.102): `getState()` post-dispatch in flusso sincrono restituisce stato **stale** (plan pre-mutation) perché AppContext aggiorna `stateRef` in `useEffect` **un tick DOPO** il dispatch. Conseguenza runtime: `rescheduleAllNotifications` non vedeva l'entry sintetica appena creata → `pending count` invariato → notifica mai schedulata.

**Diagnosi runtime (confermata in DIAG-5/DIAG-6 CP browser parte 5/5):**
- BEFORE `scheduleTestDose(5)`: pending=3 (3 entries cena 20:30 future)
- AFTER `scheduleTestDose(5)` con state stale: pending=3 (NON aumenta, plan +1 ma scheduling skip)
- Toggle `setSetting('notifiche_attive', 0/1)` post-thunk: pending=4 (con state aggiornato in stateRef ad un tick di distanza, l'entry sintetica diventa visibile e viene schedulata)

**Fix:** sostituire `getState()` di seconda lettura con state freshly-built esplicito, pattern §6.95/§6.102 (test 7 di `actions.profili.test.js` per `updateProfilo`):

```js
const newPlan = [...state.plan, syntheticEntry];
dispatch({ type: 'SET_PLAN', payload: newPlan });
const freshState = { ...state, plan: newPlan };
rescheduleAllNotifications(freshState, services.notifications);
```

**Test (4) aggiunto in `actions.scheduleTestDose.test.js`** dentro nuovo describe `'state freshness (§6.145)'`:
- Mock dispatch che NON muta state (simula stateRef lag literally)
- Counter `getStateCallsAfterDispatch` per detect re-read
- Asserzione: `showDoseNotification` chiamato 1× con entry sintetica (proverebbe che reschedule l'ha vista, possibile solo con freshState esplicito)

**Δ codice:** -1/+7 righe in `scheduleTestDose` (4 commento + 3 logica), +61 LOC test (4). **Δ test:** +1 (374→375). Commit `35fed4d` branch `step-8` (`9-B parte 5/5 CP1.1 hotfix — pass fresh state to rescheduleAllNotifications (§6.145, stateRef lag fix)`).

**Lessons learned:**
- Il bias §6.95/§6.102 si estende a **qualsiasi** chiamata sincrona post-dispatch che legga state via `getState()`, non solo `rebuildPlan()` post-`updateProfilo`. Audit candidato Wave-C: identificare altri thunk con pattern `dispatch(action) → readState → callPureFn(state)` che potrebbero avere lo stesso bias silente
- L'analisi-first parte 5/5 (AMB-parte5.A) aveva descritto il design corretto a livello concettuale (`rescheduleAllNotifications(getState(), ...)`) ma non aveva messo a fuoco il bias stateRef. Pre-codice §6.118 in CP1 ha catturato altre scoperte (S1/S2/S3) ma non questa: stateRef lag è invisibile in unit test (vitest non simula `useEffect` lag a meno di mock dedicato). Il bias emerge solo runtime. Pattern memorizzato

---

## 6.146 — Anomalia rebuild Vite: bundle deterministicamente pre-fix nonostante sorgente patchato (Sessione 9-B parte 5/5, blocco CP browser)

**Sintomo:** dopo commit CP1.1 (`35fed4d`), `npm run build:tooling` produce `dist/assets/index-Ci2FlSxN.js` **identico bit-per-bit** a quello pre-fix CP1.1, sia per hash che per dimensione (405564 byte) che per SHA-1 contenuto (`ab4bcd76...`). Il bundle **NON contiene** `freshState`, `newPlan`, `§6.145` (0 occorrenze), pur con `src/state/actions.js` patchato (2 occorrenze `freshState` confermate via `grep`). Il bundle viene servito a Chrome via `vite preview`, dove `__pt.app.actions.scheduleTestDose.toString()` mostra il pattern minified pre-fix `e({type:"SET_PLAN",payload:[...Z.plan,fe]}),Ya(t(),...)` (riconoscibile per `t()` = `getState()` minified).

**Diagnosi tentate (tutte negative):**
- `rm -rf dist node_modules/.vite node_modules/.cache` + rebuild → bundle identico
- `touch src/state/actions.js` per forzare mtime → bundle identico
- Cache HTTP Chrome: `Cmd+Shift+R` + Application > Storage > Clear site data + Service Worker Unregister + Cmd+Q Chrome + relaunch → bundle identico
- Test canary marker: prepend riga `// CANARY_<timestamp>_PT_DEBUG` al sorgente → marker invisibile nel bundle (0 occorrenze) → conferma che **Vite NON sta leggendo il sorgente patchato durante il build**, anche con cache wiped
- Verifica integrità sorgente: `grep -c freshState src/state/actions.js` = 2 ✅; nessun secondo `actions.js` nel progetto; nessuna directory `dist` shadow; nessuna cache `.vite*` residua

**Stato all'atto del blocco:**
- Test suite `npm test -- --run`: 375/375 in 36 file ✅ (Vitest legge il sorgente patchato; il fix è verificato a livello dominio e propagato nei test unit)
- File system: 1 sola directory `dist/`, 1 solo `actions.js`, 4 directory `.backup_5b2_*` / `.backup_changelog_*` (pre-esistenti, no `actions.js` interno)
- Working tree: pulito (10 `.bak.*` untracked attesi)

**Ipotesi rimaste, non validate (non escluse):**
- macOS APFS clone/copy-on-write semantica che può far apparire un file "modificato" agli utility ma immutato a Vite/Rollup file watcher
- Plugin Vite con caching a livello di modulo non standard (improbabile, vite-plugin-pwa è il più sospetto ma non noto per questo)
- npm cache (`~/.npm`) o esbuild cache (in `node_modules` non rimosso interamente) che fornisce bytecode/AST stale
- Pattern Roberto-specifico: macOS Tahoe 26.0.1 + APFS + Time Machine + il filesystem snapshot ha cache che Vite non invalida

**Decisione:** **deferred a parte 6/6** dopo regola critica #5 invocazione. Continuare diagnostica ad-hoc senza ipotesi solida è anti-pattern. Sessione chiusa con CP browser non eseguiti (P1-P5+P8 zero verde) ma fix codice committed integralmente (375/375 test garantisce correttezza dominio).

**Action plan parte 6/6:**
1. **Tentativo radicale**: `rm -rf node_modules package-lock.json && npm install && npm run build:tooling`. Se risolve → Vite cache nascosta dentro node_modules
2. Se persiste: investigation Rollup tracing (`vite build --debug`), comparazione AST diretta sorgente vs bundle
3. Fallback: rebuild da branch fresh (clone separato), confronto bundle. Se in clone fresh il fix appare → conferma corruzione cache locale
4. Una volta sbloccato: ri-eseguire CP browser P1-P5+P8 + closing definitivo

### Chiusura §6.146 (Sessione 9-B parte 6/6, CP1 Tentativo A)

**Risoluzione:** **Tentativo radicale** ha sbloccato l'anomalia al primo colpo.

```
rm -rf node_modules package-lock.json
npm install
npm run build:tooling
```

Risultato:
- Bundle hash: `index-Ci2FlSxN.js` (pre-fix, 405564 byte) → `index-Cd8Of8Q2.js` (post-fix, 405628 byte, +64 byte coerenti con i due `const` aggiuntivi `newPlan` + `freshState`)
- Test post-reinstall: 375/375 in 36 file ✅
- Pattern `SET_PLAN` nel bundle (verifica CP1.5):
  - Pre-fix: `e({type:"SET_PLAN",payload:[...Z.plan,fe]}),Ya(t(),...)` (call inline `getState()` minified come `t()`)
  - Post-fix: `Te=[...Z.plan,fe];e({type:"SET_PLAN",payload:Te});const Ce={...Z,plan:Te};return Ya(Ce,...)` (binding a variabile + `freshState` minified come `Ce`)

Mapping minify: `Te`→`newPlan`, `Ce`→`freshState`, `Z`→`state`, `fe`→`syntheticEntry`, `Ya`→`rescheduleAllNotifications`. Il fix `freshState` è semanticamente nel bundle ma l'identificatore-stringa è scomparso (Rollup minify rinomina `const` locali in identificatori a 1-2 lettere).

**Causa root candidata:** cache nascosta in `node_modules` non invalidata dalle pulizie targeted (`node_modules/.vite`, `node_modules/.cache`). Probabilmente esbuild deps cache o un livello di cache plugin Vite-PWA che usa un path/namespace non documentato. Nessuna evidenza diretta, ma il rebuild radicale è stato risolutivo deterministicamente. La rimozione di **`package-lock.json`** è verosimilmente l'elemento decisivo: riforza npm a re-risolvere le versioni transitive e a re-fetchare gli artefatti da scratch, by-passando qualsiasi cache di `npm ci`-style.

**Falso positivo metodologico documentato (lezione critica):**
- **"Test canary marker"** del §6.146 originale (prepend `// CANARY_<timestamp>` al sorgente, `grep` sul bundle) era **inconcludente by design**: i commenti vengono **sempre** rimossi dal minify Rollup, indipendentemente dalla cache. Quel test non distingue "sorgente non letto" da "sorgente letto + commento minified".
- **`grep -c freshState dist/...`** come check di propagazione del fix in §11 era **invalido per produzione**: gli identificatori `const` locali sono rinominati. Nel bundle di un fix sano `grep freshState` può legittimamente dare 0.
- **Pattern corretto** per verificare propagazione fix in bundle minified:
  1. Confronto **semantico pre/post** (es. `t()` vs `Ce`)
  2. **Sourcemap** se presente (in build corrente assente)
  3. Verifica behavior runtime (P1-Px CP browser)
  4. **MAI** affidarsi all'identificatore-stringa di un simbolo locale

**Lessons-learned per il futuro:**
- Pulizia cache Vite/Rollup affidabile = `rm -rf node_modules package-lock.json && npm install`. Le pulizie targeted (`node_modules/.vite`, `dist`, `node_modules/.cache`) **non sono sufficienti**. Documentare in §8 convenzioni come step di troubleshooting standard.
- Mai usare commenti come canary marker per verificare che un build legga il sorgente.
- Mai usare `grep <identifier-name>` su bundle production-minified come prova di presenza di un fix.

**Status:** chiuso ✅. Soluzione: rebuild radicale.

---

## 6.147 — Plan cross-day: 27 entries su 3 giorni nel pristine state (Sessione 9-B parte 6/6, CP browser P1)

**Sintomo:** post-hard-refresh, **prima di qualsiasi azione utente o `scheduleTestDose`**, `__pt.app.getState().plan` contiene **27 entries** distribuite su 3 giorni consecutivi (ieri, oggi, domani):

```
Object.keys(plan distribution): {2026-04-29: 9, 2026-04-30: 9, 2026-05-01: 9}
plan.length: 27
lastBuiltForDay: '2026-04-30'  (oggi, corretto)
oggi_iso: '2026-04-30'
simulatedNow: null
status: 'ready'
```

Keys delle entries (ispezionate via `plan.map(e => e.key)`): rigorosamente univoche, pattern `dateStr-farmacoId-orarioId` (es. `2026-04-29-1-1`, `2026-04-30-1-1`, `2026-05-01-1-1`). Distribuzione 9 farmaci × 3 giorni rigorosa, niente duplicati, niente collisioni di key. Il plan **è costruito intenzionalmente** su tre giorni, non è accumulo da chiamate ripetute di `init`.

**Domanda aperta:** intentional design o regression?

- **Ipotesi A (intentional):** una sessione passata ha introdotto un orizzonte di look-ahead 3 giorni nel `planBuilder` (forse per supportare cross-midnight, prefetch per UI "domani", o pre-schedule notifiche oltre mezzanotte). Lo scope è disponibile in `plan` per UI ma il filtro applicativo (`selectEntriesForDay(state, today)`) restringe a 1 giorno per i consumi correnti (rescheduler notifiche, contatori homepage).
- **Ipotesi B (regression):** lo scope del plan è sempre stato 1 giorno; l'estensione a 3 giorni è regression introdotta in qualche sessione recente (8c-2 / 8d-* / 9-* sospetti, dato che §22.x precedenti non menzionano cross-day esplicitamente). Bug bloccante: viola spec §3 (modello dati) + §4 (algoritmo ricalcolo).

**Verifiche richieste in 9-C analisi-first:**
1. Lettura spec §3 + §4 per scope ufficiale del piano
2. `git log -- src/state/planBuilder.js src/domain/recalc.js` per identificare quando lo scope è cambiato
3. Lettura `selectEntriesForDay`, `selectToday`, `rescheduleAllNotifications` per verificare se filtrano per `dateStr === today` (atteso) o accettano cross-day
4. Verifica unit test: c'è un test che assert `plan.length === 9` per profilo 9-farmaci? Se sì, come passa con `plan.length === 27`? (mock specifico? ambiente test sterile vs runtime browser?)
5. Decisione: se intentional → confermare e documentare in §3 spec; se regression → identificare commit responsabile + fix

**Impatto su §6.148:** se §6.147 è regression, il plan cross-day potrebbe **mascherare** il bug §6.145 in runtime: la sintetica entra in `state.plan` (key con `dateStr` di oggi), ma `freshState = {...state, plan: newPlan}` propagato a `rescheduleAllNotifications` potrebbe non essere visto correttamente da `selectEntriesForDay(freshState, today)` se i selectors hanno comportamenti inattesi su plan cross-day. Va investigato CONGIUNTAMENTE a §6.148.

**Status:** open, **bloccante per release v2.5.40**. Investigazione in 9-C analisi-first.

**Aggiornamento Sessione 9-C (30/04/2026):** ✅ **CHIUSA — by-design** (AMB-9-C.A).

**Verdetto:** plan cross-day intentional dal Step 5b-2 (`buildMultiDayPlan` §6.72, rehydration cross-day), non regression.

**Evidenze convergenti (DIAG-1÷7 Mac-side):**

| DIAG | Evidenza | Implicazione |
|---|---|---|
| DIAG-2 | `domain/constants.js`: `PLAN_DAYS_BEFORE=1`, `PLAN_DAYS_AFTER=1`, `PLAN_TOTAL_DAYS=3` | Look-ahead 3-day **dichiarato esplicitamente** |
| DIAG-1 | `domain/planBuilder.js:101` itera `addDaysLocal(startDate, d)` su `d ∈ [0, PLAN_TOTAL_DAYS)` | Genera 3 giorni × N farmaci by-design |
| DIAG-7 | I 3 add `+export const PLAN_DAYS_*` sono il **commit di introduzione**, niente storia di drift | Le costanti nascono già con valore 3 (Sessione 5b-2 §6.72) |
| DIAG-6 | Ultimo touch `d5de70f` (9-A CP3 §6.115b) "planBuilder invariante §6.23 esteso", nessun cambio scope post-5b-2 | No regression recente |
| DIAG-3 | `selectEntriesForDay(state, dateStr)` filtra correttamente `e.dateStr === dateStr` | Filtro applicativo presente e funzionante |
| DIAG-5 | `rescheduleAllNotifications` (`services/notifications.js:170-171`) usa `selectEntriesForDay(state, today)` → restringe a 1 giorno | Consumer notifiche day-scoped corretto |

**Risultato pristine state ricostruito:** 27 entries = 9 farmaci × 3 giorni (ieri / oggi / domani). Distribuzione corretta, nessun bug.

**Impatto su §6.148:** ipotesi originale (plan cross-day maschera bug §6.145 via `selectEntriesForDay` rotto) **esclusa** — la sintetica ha `dateStr=today` (verificato in DIAG-RT-1: `sint_dateStr: '2026-04-30'`) e viene correttamente inclusa dal selettore.

**Risoluzione:** zero codice toccato. Doc spec §3 raccomandato in 9-D closing per documentare scope esplicito (`state.plan` multi-day, scope `[today-PLAN_DAYS_BEFORE, today+PLAN_DAYS_AFTER]`, projection day-scoped via `selectEntriesForDay`). Non bloccante per release v2.5.40.

**Lessons-learned:** un'osservazione runtime "anomala" può corrispondere a behavior intentional non documentato esplicitamente nella spec. Pre-investigazione standard: leggere costanti + lettore primario (planBuilder) + consumer (selectors) + git log; spesso 4 grep risolvono.

---

## 6.148 — Bug §6.145 sembra non sanato in runtime nonostante fix presente nel bundle (Sessione 9-B parte 6/6, CP browser P1)

**Sintomo:** CP browser P1 (`scheduleTestDose(5)` con `Notification.permission === 'granted'`, eseguito ad ore valide ~15:43, sintetica per ~15:48 quindi `delay > 0` non-no-op):

| Indicatore | Valore | Atteso | Esito |
|---|---|---|---|
| `getPendingCount()` pre | 3 | 3 | ✅ baseline |
| `getPendingCount()` post `scheduleTestDose(5)` | **3** | 4 (3 sera + 1 sintetica) | ❌ |
| `result.ok` | n.d. (Promise non ispezionato) | true | (probabile true, irrilevante) |
| `state.plan` post | contiene la sintetica come key 27 | sì | ✅ (il dispatch SET_PLAN funziona) |

Il fix §6.145 funziona a livello **dispatch+state** (la sintetica entra in `state.plan`) ma **non a livello `rescheduleAllNotifications`** (`getPendingCount` non sale).

**Stato dei check:**
- Unit test 375/375 verde, incluso `actions.scheduleTestDose.test.js` (3 test specifici §6.145 in §6.142)
- Bundle servito contiene il pattern semantico post-fix (CP1.5 verde, vedi §6.146 chiusura)
- Behavior runtime browser **non corrisponde** né alla source né al bundle né ai test unit

**Ipotesi root cause (da investigare 9-C):**
1. **H-A (correlato §6.147)** — `freshState = {...state, plan: newPlan}` propagato a `rescheduleAllNotifications`, ma `selectEntriesForDay(freshState, today)` filtra in modo inatteso per via del plan cross-day 27 entries. La sintetica ha `dateStr` corretto (oggi) o no? Se la sintetica è stata costruita da `scheduleTestDose` senza `dateStr` o con `dateStr` differente dal `today` calcolato dal selector, verrebbe filtrata via.
2. **H-B (delay <= 0 silent no-op)** — `scheduleNotification` ha early-return su `delay <= 0` (vedi `notifications.js:64`). La sintetica per `+5min` ha `fireAt = Date.now() + 5*60*1000`, quindi `delay = 5*60*1000`, sicuramente > 0. **Esclusa** salvo bug grossolano nel calcolo di `fireAt` interno a `scheduleTestDose`.
3. **H-C (entryKey collision)** — la sintetica costruita da `scheduleTestDose` usa una `entryKey` che collide con una entry già presente in `pending` Map → tag-based replacement (per design, vedi `notifications.js:65-68`) cancella e re-schedula sulla stessa key, mantenendo `pending.size === 3`. Pattern AMB-9.H. Da verificare: che `entryKey` ha la sintetica? Coincide con quella di una dose 20:30 (le 3 sere)?
4. **H-D (race tra dispatch + rescheduleAllNotifications)** — il fix §6.145 dovrebbe averla risolta passando `freshState` esplicito (no `getState()` lazy), ma forse esiste un altro percorso async (es. `services` ha riferimento a uno snapshot di state stantio).

**Investigazioni richieste in 9-C analisi-first:**
1. Ispezione `entryKey` della sintetica vs quelle delle 3 sere preesistenti (ipotesi H-C)
2. Tracing `rescheduleAllNotifications`: aggiungere log temp `console.log('reschedule-all:', state.plan.length, today, entries.length)` e ri-buildare con `VITE_PT_TOOLING=1`
3. Ispezione `selectEntriesForDay` su `freshState` con plan 27 entries — quante entries oggi vede? La sintetica è inclusa?
4. Verifica `dateStr` della sintetica in `state.plan` (se `undefined` o ≠ `today`, root cause = `scheduleTestDose` non setta `dateStr` correttamente)

**Status:** open, **bloccante per release v2.5.40**. Investigazione CONGIUNTA con §6.147 in 9-C analisi-first (le due ipotesi H-A potrebbero risolvere entrambe).

**Aggiornamento Sessione 9-C (30/04/2026):** ✅ **CHIUSA — falso positivo metodologico** (AMB-9-C.B).

**Verdetto:** il fix §6.145 funziona deterministicamente. La discrepanza rilevata in CP browser parte 6/6 era un **artifact del protocollo di test in DevTools Console**: l'`async function` `scheduleTestDose` ritorna Promise pending; il `getPendingCount()` digitato in Console su riga separata legge `pending.size` **prima** che la microtask del thunk venga processata. Il valore stale `pending=3` è precisamente il valore baseline pre-thunk.

**Dataset diagnostico DIAG-RT-1 (Chrome-side, IIFE async con await esplicito):**

```js
(async () => {
  const before = __pt.notifications.getPendingCount();
  const r = await __pt.app.actions.scheduleTestDose(5);
  const afterAwait = __pt.notifications.getPendingCount();
  await new Promise(res => setTimeout(res, 100));
  const after100ms = __pt.notifications.getPendingCount();
  // ... ispezione plan + sintetica ...
})();
```

Output runtime (30/04/2026 ~17:15 wall-clock):

| Misura | Atteso (sano) | Osservato | Diagnosi |
|---|---|---|---|
| `before` | 3 | **3** | ✅ baseline |
| `afterAwait` | 4 | **4** | ✅ fix §6.145 funziona |
| `after100ms` | 4 | **4** | ✅ no race async |
| `plan_total` | 28 (=27 §6.147 + 1 sintetica) | **28** | ✅ |
| `plan_dates` (3 distinte) | `[2026-04-29, 2026-04-30, 2026-05-01]` | match esatto | ✅ §6.147 by-design |
| `sint_dateStr` | today (`2026-04-30`) | **`2026-04-30`** | ✅ |
| `sint_ora_prevista` | now+5min wall-clock | **`17:15`** (now era `17:10`) | ✅ |
| `sint_stato` | `'prevista'` | **`'prevista'`** | ✅ |
| `sint_orario.farmaco_id` | farmaci[0].id reale | **1** | ✅ no collision con sentinel 999 |
| `sint_orario.dose_numero` | 999 sentinel | **999** | ✅ |
| `result.ok` | `true` | **`true`** | ✅ |

**7 ipotesi root cause investigate, 6 escluse:**

| Ipotesi | Stato | Evidenza esclusione |
|---|---|---|
| **H-A** plan cross-day filtra male sintetica | ❌ esclusa | DIAG-3 + DIAG-RT-1: `selectEntriesForDay` corretto, `sint_dateStr === today`, sintetica inclusa |
| **H-B** `delay ≤ 0` no-op | ❌ esclusa | wall-clock `delay ≈ 5min > 0` |
| **H-C** entryKey collision sentinel 999 | ❌ esclusa | DIAG-8/9: `dose_numero=999` non collide con dosi reali (1..N max) |
| **H-D** race dispatch+reschedule async | ❌ esclusa | DIAG-11: `freshState` esplicito + DIAG-RT-1 `after100ms = afterAwait` (no race) |
| **H-E** lookup farmaco fallisce | ❌ esclusa | DIAG-14: `selectFarmacoById` corretto, sint farmaco lookup match |
| **H-F** secondo reschedule async post-dispatch (tick TICK_INTERVAL_MS=60s o `onForegroundEvent`) sovrascrive con stato stantio | ❌ esclusa | DIAG-RT-1 `after100ms = 4` invariato; tick non scatta in 100ms; focus rimane su Console durante test |
| **H-G2** Promise non awaited (pattern Console) | ✅ **confermata** | DIAG-RT-1 `before=3, afterAwait=4` mostra che il valore osservato in §6.148 originale era pre-microtask |

**Risoluzione:** zero codice toccato. Pattern operativo §6.149 (Console DevTools `await` mandatory) introdotto come lessons-learned reusabile.

**Lessons-learned (parallelo metodologico §6.146):** in CP browser via Console, **mai leggere stato post-thunk async senza `await`**. `async function` ritorna sempre Promise pending; il check successivo digitato in Console su riga separata legge stato pre-microtask, contaminando la misurazione. Pattern corretto: IIFE async con `await` interno + `console.log` strutturato finale. Vedi §6.149 per pattern reusabile.

---

## 6.149 — Lessons-learned: Console DevTools `await` mandatory per check post-thunk async (Sessione 9-C analisi-first)

**Sintesi:** in CP browser via Chrome DevTools Console, il pattern di lettura "fire-and-forget" su riga separata genera **falsi positivi** nel test di thunks async che mutano stato mediato da microtask. `async function` ritorna Promise pending; il check successivo eseguito in stessa tick sincrona legge stato **pre-microtask**, contaminando la misurazione.

**Esempio falso-positivo (§6.148 originale):**
```js
__pt.app.actions.scheduleTestDose(5)
// Console: Promise {<pending>}
__pt.notifications.getPendingCount()
// Console: 3   ← stale (microtask del thunk non ancora eseguita)
```

**Pattern corretto (§6.149):**
```js
(async () => {
  const before = __pt.notifications.getPendingCount();
  const r = await __pt.app.actions.scheduleTestDose(5);
  const afterAwait = __pt.notifications.getPendingCount();
  await new Promise(res => setTimeout(res, 100));   // intercetta eventuali reschedule async
  const after100ms = __pt.notifications.getPendingCount();
  console.log(JSON.stringify({ before, afterAwait, after100ms, /* + altri probe */ }, null, 2));
})();
```

**Razionale:**
1. **IIFE async** garantisce che il body sia eseguito in un contesto async coerente
2. **`await` su Promise del thunk** forza la conclusione delle microtask del thunk prima del check
3. **`await new Promise(setTimeout)` con delay piccolo (50-100ms)** intercetta eventuali reschedule async (es. `useEffect` reattivi su state change) che potrebbero rimuovere/sovrascrivere il risultato del thunk
4. **`JSON.stringify` di un bundle di osservazioni** in singolo `console.log` evita output frammentato e rende la misurazione atomicamente leggibile

**Contesto:**
- Roberto digita comandi in Console DevTools manualmente; è **inevitabile** che due righe consecutive vengano eseguite su tick separate o su stessa tick
- Anche con `Object.keys(__pt.app.actions)` è fattibile distinguere `async function` da funzioni sincrone, ma il pattern IIFE va applicato **per default** a qualsiasi check post-thunk per immunità contro async-future-changes
- Il pattern non sostituisce gli unit test (vitest con `await act()` / `vi.runOnlyPendingTimers()`); è uno strumento di **runtime validation** per CP browser

**Parallelo metodologico §6.146:** entrambe le deviazioni documentano antipattern di troubleshooting che producono conclusioni invalide:
- §6.146: canary marker su commenti (rimossi dal minify) + `grep <identifier>` su bundle minified (rinominati) → falso negativo (fix sembra mancante)
- §6.149: check stato sync post-thunk async senza `await` → falso positivo (bug sembra presente)

**Da formalizzare in §8 convenzioni** come step di troubleshooting standard CP browser. Riferimento da inserire in §11 prompt CP browser future per riuso.

**Status:** chiuso ✅ (lessons-learned non richiede fix code).

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
| **6** | **Hook `useNow` + refactor `resolveNow` in `utils/now.js` + tick unico nel Provider** | ✅ **Completo** | 120/120 test. Verifica browser: status='ready', plan=39, 12 actions |
| **7a** | **Foundation non-UI: utils/theme.js, utils/uiState.js, hooks/useTheme.js (read-only), components/shared/{Icons, Badge, TapBadge}, testing setup @testing-library/react, renderHelpers** | ✅ **Completo** | 148/148 test (+28 vs 120). §6.27 / AMB-7a.M introdotta. Verifica browser: /oggi placeholder 5-campi invariato |
| **7b-1** | **Foundation UI + Oggi read-only: theme rename, ThemedShell, NavBar token-aware, services/audio reale, useAutoBeep, DevTimeSlider, DoseCard read-only, selectCountersForDay, groupEntriesByDayAndMomento, OggiView** | ✅ **Completo** | 170/170 test (+19 vs 151, target ±0). Verifica browser: 6/7 OK + 1 vacuously OK. §6.28-§6.31 introdotte |
| **7b-2** | **PRESA tap + UNDO immediato ultima dose: DoseCard handlers + selectUltimaPresa + OggiView wiring** | ✅ **Completo** | 178/178 test (+8, target ±0). Verifica browser: 6/7 OK + 1 skipped (ricalcoli downstream → 7c). §6.32-§6.35 introdotte |
| **7c-1** | **4 modali + wiring tap manuale (Altro/Saltata/Sospesa/Recupero) + fix §6.32 strategico + DoseCard 4 affordance tap + OggiView 4 stati modali** | ✅ **Completo** | 203/203 test (+25, target AMB-7c-1.N 178→202±3 boundary superiore). Verifica browser CP6 7/7 OK. §6.36-§6.47 introdotte (11 nuove deviazioni, 7 candidate 7d/post-7d, 1 FALSO POSITIVO scartato) |
| **7c-2** | **Auto-prompt gap recovery: useEffect `state.prompt` in OggiView + `selectPromptEntry` + integration tests E2E con AppProvider reale** | ✅ **Completo** | 215/215 test (+12, target AMB-7c-2.I esatto ±0). 15→16 test files. Verifica browser CP 6/6 (con #6 vacuously OK, race theory-only). Zero nuove deviazioni §6.NN. Bug CP3 seed 'fisso' risolto in-session (§21 lesson) |
| 7d | **Split in 7d-1 + 7d-2** (analisi 20/04/2026 post-7c-2, ratifica in delega per bassa attenzione utente) | | |
| **7d-1** | ✅ **Completo** · a11y 4 modali (focus-trap-react + hook `useModalA11y` + restore focus chain) + §6.33 IconUndo (chiuso per rimozione) + §6.34+§6.44 date separator sticky+cromatico (accorpati, chiusi) + §6.39 renderHelpers refactor (chiuso) | ✅ **Completo** | 228/228 test (+13, target AMB-7d-1.K esatto). 16→18 test files. Verifica browser CP 6/6 OK. 8 nuove deviazioni §6.50-§6.57 (tutte scoperte in CP, pre-esistenti come esigenze implicite di AMB-7d-1) |
| 7d-2 | **Splittata in 3 parti in esecuzione** (7d-2p2 chiusa anticipatamente dopo CP5 per preservare qualità post-asperità Terminal; CP6/CP7 delegati a 7d-2p3) | | |
| **7d-2p1** | ✅ **Completo** · CP1 repo `getLogByDataStato` + CP2 `AppProvider` dual-mode (`initialStateProp`) + CP3 `actions.init()` rehydrates `presoStack` dai log presa del giorno. Include hotfix intra-sessione `renderWithRealProvider.jsx:makeFakeRepo` (§6.60) | ✅ **Completo** | 235/235 test (+7, target centrato). 18→21 test files. §6.58/§6.59/§6.60 introdotte (candidate applicate in p2 o procedurali) |
| **7d-2p2** | ✅ **Completo** · CP4 rename `annullaAssunzione` → `applyAnnullaAssunzione` (§6.58 chiuso) + guard `DOWNSTREAM_USER_EDITS` (§6.61) + thunk `annullaAssunzione` + action `REMOVE_PRESO_KEY` (§6.62) + CP5 UndoModal riscritto (§6.59 chiuso) + DoseCard wrapper sibling + OggiView wiring + `commitApplyResult` estende return type su DomainError (§6.63) | ✅ **Completo** | 245/245 test (+10, target AMB-K' 246±2 a -1 dal top). 21→23 test files. §6.61/§6.62/§6.63 introdotte. D-R4/D-R5 refusi prompt §11 risolti |
| **7d-2p3** | ✅ **Completo** · CP6 polish DoseCard (§6.45 "in orario" ±TOLLERANZA_MIN, §6.47a gap residuo label) + CP7 theme token `focusRing` + OggiView `buildCss(t)` token-aware + CP browser 6/6 verdi | ✅ **Completo** | 247/247 test (+2, target AMB-K'' 247±2 centrato esattamente). 23 test files invariato. Zero nuove deviazioni §6 (7 AMB rispettate letteralmente). Scoperta operativa §22.3.1: asimmetria `actions.recupero(key, 0)` su `ora_ricalcolata` |
| **Step 7 completo** | Vista Oggi (porting mockup v5 + interattività + a11y + stack UNDO) | ✅ **Chiuso** | 7 sotto-sessioni (7a→7d-2p3), da baseline 120 a 247 test. 38 deviazioni §6.25-§6.63 |
| 8 | Vista Config (Profili + Farmaci + Impostazioni) + plan refresh + chiusura Q1/Q2 residue | ⏳ **In corso** | **Split in 5 sotto-sessioni** (8-pre → 8a → 8b → 8c → 8d). Config = 3 tabs (Q4/Q5), niente OrariTab separato. Decisioni Q3-Q9 congelate in §6.64-§6.68 (Sessione 8 analisi-first 22/04/2026 — v2.5.20) |
| **8-pre** | Chiusura Q1 (scope UNDO_ASSUNZIONE) + Q2 (log range at init) residue | ✅ **Completo** | Analisi-first + implementativa completate 22/04/2026. Esito A al CP0.5 (compliance §6.14 già in place dalla 7d-2p2), CP2 skippato, §6.74 non consumato (riservato). §6.75 nuova (reuse `logAssunzioni`, ottimizzazione §6.72). 2 file modificati, 0 nuovi, **247 → 250 test** (target AMB-E centrato). CP browser 2/2 verdi (punto 3 skip condizionale) |
| **8a** | Foundation Config: ConfigView shell + routing `/config/*` + tab bar URL-addressable + ImpostazioniTab (Nome + Tema + Avanzate-DEV) + `withTransaction` repo generico + thunks setting-related | ✅ **Completo** | Implementativa completata 23/04/2026 (v2.5.23 → v2.5.24). **250 → 269 test** (+19, target AMB-J +18 ±3 bound superiore). 6 nuovi file, 13 modificati. 3 hotfix intra-sessione (dark tokens, useEffect rehydrate, button block). 8 deviazioni §6.78-§6.85 (di cui 3 candidate 8d). CP browser 5/5 verdi |
| **8b** | ProfiliTab: CRUD profili + form profilo + riuso `cambiaProfilo` / `setProfiloAttivoConCleanup` (§6.20) + guard §6.5 (delete profilo attivo rifiutato) + rebuildPlan reattivo post-edit (§6.64) | | Target ~7-9 file, +18-22 test |
| **8c** | FarmaciTab: CRUD farmaci + form unico con orari inline (§6.66) + save atomico `withTransaction` + soft-delete (§6.67) + flip `GET_FARMACI_SOLO_ATTIVI=true` + date editabili (§6.68). CP0: verificare `DoseCard` usi delta storico del log (§6.64 nota) | ✅ **Completo** (via 8c+8c-2) | 8c parziale 24/04/2026 (v2.5.27 → v2.5.28, CP1-CP4, 287 → 297 test, §6.88/6.90/6.91). 8c-2 contingency 24/04/2026 (v2.5.28 → v2.5.29, CP5+CP6, 297 → 306 test). 7 deviazioni totali 8c-2 (§6.89 consumata parziale, §6.92/6.93/6.94/6.95/6.96/6.97/6.98 nuove) |
| **8c-2** | CP5+CP6 di 8c: 3 thunks (`addFarmaco`/`updateFarmaco`/`deleteFarmaco`) pessimistici con `withTransaction`, `ConfirmModal` shared (§6.89 consumata parziale), delete button + copy §6.67, data_fine-past interceptor + copy §6.68, file nuovo `actions.farmaci.test.js`, 2 test end-to-end FarmaciTab, CP browser 7 punti + hotfix §6.95 intra-CP6 | ✅ **Completo** | **297 → 306 test** (+9 netti, target §11 v2.5.28 "308 ±3" soddisfatto con -2 in range). 3 commit separati (`dda9af7` CP5, `06dc680` CP6 hotfix §6.95, + Changelog). 7 deviazioni §6.89/6.92-6.98. CP browser 7/7 verdi |
| **8d** | Polish Config + retrofit 8a-8c candidate: §6.81 ConfigTabBar dark color, §6.84 React Router future flags, §6.89 retrofit `ConfirmDeleteProfiloModal` → `ConfirmModal` shared + §6.92 `useModalA11y` su ProfiliTab, §6.94 completamento `defaultNoopActions`, §6.95 preventive retrofit `updateProfilo`, §6.96 sticky separator, §6.97 DoseCard copy `indifferente`, §6.98 UnsavedChanges guard FarmacoDrawer close path, §6.85 `nome_utente` investigation | ⏸️ **Split in 8d-A + 8d-B** (analisi-first ✅ 24/04/2026, v2.5.30) | 5 AMB-8d.A-E congelate. Split documentato in §6.99. Impl dilazionata su 2 sessioni |
| **8d-A** (parziale) | Tier A+B pattern-based. **CP1-CP3 completati** (v2.5.31): §6.84 Router future flags app-only (§6.100), §6.94 noop bag +5 (AMB-8d.C), §6.97 DoseCard regression guard riscoped (§6.101 + chiusura §6.97). **CP4-CP7 deferred** a 8d-A-continue | ⚠️ **Parziale** | 306 → 307 test (+1 da CP3). 3 commit Mac-side: `2d79055`, `98cb25f`, `ace1ed2`. Bump v2.5.30 → v2.5.31 |
| **8d-A-continue** (parziale) | Tier A+B CP residui pattern-based. **CP4-CP6 completati** (v2.5.32): §6.98 FarmacoDrawer UnsavedChanges guard, §6.89+§6.92 ProfiliTab retrofit ConfirmModal shared + a11y (auto-risolta), §6.95 updateProfilo proactive `rebuildPlanFromFresh` (§6.102 generalizzazione helper). **CP7 deferred** per blocker §6.104 (routing loop pre-esistente CP1 §6.84 interaction) | ⚠️ **Parziale** | 307 → 310 test (+3). 3 commit Mac-side: `30b01ce`, `f316e6c`, `264ab1c`. 3 nuove deviazioni: §6.102/§6.103/§6.104. Bump v2.5.31 → v2.5.32 |
| **8d-A-continue-2** | Analisi-first §6.104 ConfigView routing fix (path absolute, AMB-A) + audit esaustivo (AMB-B) + browser check 5/5 (Punto 3 skip §6.106) + CP7 bump v2.5.32 → v2.5.33 | ✅ **Completo** | 310 → 310 test invariati (AMB-C no test in-session). 1 commit Mac-side: `67937e5` CP1 §6.104. 2 nuove deviazioni: §6.105 (ConfirmModal focus-restore ProfiliTab → 8d-B tier C), §6.106 (Punto 3 skip ridondanza). Audit nota retroattiva in §6.104 (pattern grep limit data-driven). Bump v2.5.32 → v2.5.33 |
| **8d-B** | Tier C design-decision + investigation: §6.81 ConfigTabBar dark token, §6.96 sticky separator CSS var+ResizeObserver (AMB-8d.B), §6.85 `nome_utente` investigation con strumentazione logging (AMB-8d.E) | ⚠️ **Parziale** | CP1 §6.96 ROLLED BACK in-session (scroll lock + CSS var mai settata → §6.107). CP2 §6.105 fix +2, CP3 §6.103 retrofit +1, CP4 §6.81 fix 0 → 313/313 (+3). 1 commit `eac185a`. 3 nuove deviazioni §6.107/108/109 deferred a 8d-C. Bump v2.5.33 → v2.5.34 |
| **8d-C** | Carryforward residuo 8d-B + 8d originale: §6.107 sticky separator re-investigation, §6.109 ProfiliTab focus restore, §6.108 NavBar bottom contrast, §6.85 nome_utente 3° timebox, §6.84 test router warning | ✅ **Completo** | 313 → 313 test invariati (Δ=0, target AMB-K' centrato). 4 commit Mac-side: `0283567` CP1 §6.110, `3406e33` CP3 §6.112, `af147e0` CP4 §6.113, `db30fae` CP5 §6.114. CP2 §6.111 zero-commit (h2 falsificata, hard-defer 8d-D). 5 nuove §6.110-§6.114, 4 chiuse (§6.96/§6.108/§6.85/§6.84). Bump v2.5.34 → v2.5.35 |
| 9 | Notifiche locali (Notification API + scheduling Opzione 1 foreground-only) + **fix dominio §6.18 cross-midnight** (§6.26) | ⏳ **Analisi-first ✅** | Split in **9-A + 9-B** (analisi-first 26/04/2026, v2.5.36). 10 AMB-9.A÷J ratificate. Decisione scope: Opzione 1 senza server (Web Push backend Mac Mini differito a Fase 3 estesa post-Step 11) |
| **9-A** | Wave A — fix dominio §6.18 cross-midnight: `ora_ricalcolata` TIME → TEXT ISO + 3 helper `utils/time.js` + Dexie v1→v2 migration `fake-indexeddb` + propagazione apply* + tear-down §6.26 (`isCrossMidnightRecalc` ISO-aware sostituisce HH:MM-heuristic) | ✅ **Completo** | 4 CP impl + CP browser 4 punti (P2 critico verde post-§6.118 fix; P1/P4 ambigui per pre-existing fuori scope §6.119/§6.120). 313 → 328 test (+15, target AMB-9.J 329 ±3 a -1). 5 commit branch `step-8` (`d5248a0`/`d0d4e5e`/`d5de70f`/`816a49f`/`0e70a38`). 9 deviazioni: §6.115a/§6.115b/§6.116/§6.116b/§6.117/§6.117a/§6.118 chiuse, §6.119/§6.120 deferred. Bump v2.5.36 → v2.5.37 |
| **9-B** | Wave B — notifiche Opzione 1 foreground-only: `services/notifications.js` singleton + `hooks/useNotifications.js` + `utils/copy.js` + `rescheduleAllNotifications` puro + AppContext wiring (8 trigger) + chiave `notifiche_attive` Dexie + toggle UI in ImpostazioniTab | ⏳ **Impl 5/5 + hotfix §6.138 + parte 5/5 parziale + parte 6/6 parziale + 9-C analisi-first ✅ chiude §6.147+§6.148 senza fix code** | Analisi-first ✅ 26/04/2026 (v2.5.38). Impl 1/2+2/2+3/3 ✅ 27/04/2026 v2.5.39→v2.5.40-rc. Parte 4/4 esecutiva ✅ 27/04/2026 v2.5.40-rc.1. Parte 5/5 esecutiva parziale ⚠️ 29/04/2026 v2.5.40-rc.2. Parte 6/6 implementativa parziale ⚠️ 30/04/2026 v2.5.40-rc.3 (§6.146 sbloccato; CP browser P1 ha rivelato §6.147+§6.148). **Sessione 9-C analisi-first ✅ 30/04/2026 v2.5.40-rc.4**: §6.147 chiuso by-design (AMB-9-C.A), §6.148 chiuso falso-positivo metodologico (AMB-9-C.B), §6.149 nuova lessons-learned. CP browser P2-P5+P8 + bump v2.5.40 deferred Sessione 9-D esecutiva snella. 375/375 test invariati |
| **9-D** | Esecutiva snella post-9-C: completamento CP browser P2-P5+P8 (deferred parte 6/6) + bump v2.5.40 definitivo + cleanup `.bak.*` (12 untracked) + chiusura formale §6.147+§6.148+§6.149 + doc spec §3 update scope plan multi-day | ⏳ **Pianificata** | Browser-heavy / no-code-heavy. Stima ~15-20K token. Nessun fix code richiesto (entrambi i bug 9-B parte 6/6 chiusi senza codice in 9-C) |
| 10 | Service worker attivo + manifest definitivo + icone | | |
| 11 | Polish finale, QA, accessibilità estesa, gestione errori | | |


### Setup testing (Step 4a–4b + 7a)

devDependencies installate:
- `vitest@^2.1.9` — runner
- `jsdom@^25.0.1` — env jsdom (default da Sessione 7a)
- `@vitest/coverage-v8@^2.1.9` — coverage (pinned a 2.x per compatibilità con vitest 2.1)
- `@testing-library/react@^16` — Sessione 7a, render hooks e componenti React
- `@testing-library/jest-dom@^6` — Sessione 7a, matchers (`toBeInTheDocument`, `toHaveStyle`, ...)

Convenzioni adottate:
- `vitest.config.js` esplicitato da Sessione 7a (prima era implicito). Environment **jsdom** di default, `setupFiles: ['./src/test/setup.js']`
- Test di dominio / utils puri iniziano con `// @vitest-environment node` in prima riga (pattern già adottato da Sessione 4a, confermato in 7a per `utils/uiState.test.js`)
- Test React (componenti, hooks) ereditano l'environment jsdom default, nessuna directive richiesta

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


## 11. Prossimo step — Sessione 9-D esecutiva snella (CP browser P2-P5+P8 deferred + bump v2.5.40 + cleanup + closing 9-B)

**Stato baseline:** v2.5.40-rc.4 (post-Sessione 9-C analisi-first). 375/375 test su 36 test files. Catena commit branch `step-8` invariata vs parte 5/5 e parte 6/6:
- `35fed4d` CP1.1 hotfix §6.145 (stateRef lag fix)
- `3de09ab` CP1 §6.142 (`scheduleTestDose` thunk + 3 test)
- `d7f252a` CP-pre §6.143+§6.144 (VITE_PT_TOOLING gate + icone PWA valide)
- `6a403e0` Changelog v2.5.40-rc.1 (storico parte 4/4)
- `fada4a6` hotfix §6.138 (storico parte 4/4)
- `f856b46` Changelog v2.5.40-rc (storico parte 3/3)

**Bundle servito:** `dist/assets/index-Cd8Of8Q2.js` (405628 byte, post-CP1A rebuild radicale parte 6/6). Pattern post-fix `freshState` confermato semanticamente nel bundle (vedi §6.146 chiusura) e validato runtime via DIAG-RT-1 (vedi §6.148 chiusura).

Backup `.bak.*` ancora su disco (12 untracked: 10 baseline §11 parte 5/5 + 1 `Changelog.bak2` user safety + 1 `package-lock.json.bak.cp1A` da CP1 Tentativo A parte 6/6), espurgazione pianificata in 9-D CP6 closing.

**Scope:** sessione **esecutiva snella browser-heavy / no-code-heavy** dedicata a:
1. completamento CP browser P2-P5+P8 deferred di parte 6/6 (validazione runtime AMB-9.E'/G'/H + permission revocation defensive + non-PWA fallback)
2. eventuali fix code emergenti dai CP browser (best case zero, worst case 1-2 hotfix puntuali)
3. doc spec §3 update: documentazione esplicita scope plan multi-day (`PLAN_DAYS_TOTAL=3`)
4. bump v2.5.40 definitivo (release candidate finalizzata)
5. cleanup `.bak.*` (12 untracked) + commit closing
6. chiusura formale §6.147+§6.148+§6.149 nel changelog (già marcate CHIUSE in v2.5.40-rc.4, qui solo conferma post-CP browser)

### Razionale 9-C → 9-D (sessione esecutiva snella, niente split 9-D + 9-E)

Sessione 9-C ha chiuso §6.147 (by-design via DIAG-1÷7 + DIAG-RT-1 conferma sintetica `dateStr=today`) e §6.148 (falso-positivo metodologico via DIAG-RT-1 deterministico) **senza richiedere fix code**. Decisione split implementativo originale (9-D singola vs 9-D+9-E) **decaduta**: niente codice da scrivere, solo CP browser deferred + bump + cleanup. Stima 9-D: ~15-20K token totali (browser-heavy).

### Workflow proposto

1. **CP0 sanity-light** (4 gate Mac-side): tree clean tranne 12 untracked attesi, top `35fed4d`, 375/375 test in 36 file, bundle `index-Cd8Of8Q2.js` su disco
2. **Setup CP browser:** preview attiva (`VITE_PT_TOOLING=1 npm run preview`), Chrome `http://localhost:4173`, DevTools Console dropdown `top`, verifica `typeof __pt === 'object'`
3. **CP browser P2:** `visibilitychange` + `focus` event triggerano `rescheduleAllNotifications` (validazione AMB-9.G' trigger 8). Test: simulare blur/focus della tab, ispezionare `pending.size` pre/post via IIFE async pattern §6.149
4. **CP browser P3:** `setSetting('notifiche_attive', 1)` → `rescheduleAllNotifications` (toggle on); `setSetting('notifiche_attive', 0)` → `cancelAll` (toggle off). Validazione AMB-9.G' trigger 6+7
5. **CP browser P4:** `addFarmaco` / `updateFarmaco` / `deleteFarmaco` trigger reschedule (validazione AMB-9.G' trigger 5 — 7 thunks rilevanti). Test: aggiungere farmaco con orario futuro, ispezionare `pending` cresce di 1
6. **CP browser P5:** rapid visibility flip foreground→background→foreground (5 cicli rapidi) — validazione AMB-9.E' "sincrona idempotente cancel-then-rebuild atomico". Test: `pending.size` finale = baseline, no leak
7. **CP browser P8:** tag-based replacement entryKey collision — re-schedulare 2× `scheduleTestDose` per stesso farmaco con sentinel `dose_numero=999` → `pending.size` collapse a baseline + 1 (non +2). Validazione AMB-9.H
8. **CP browser P6 (raccomandato):** permission revocation defensive — revocare manualmente Notification permission da Chrome Settings, focus tab → check `notifiche_attive` forzato a 0 (AMB-9.F' decision tree)
9. **CP browser P7 (raccomandato):** non-PWA fallback — aprire URL in regular tab (no install) → toggle nascosto + banner "Installa l'app sulla home" (AMB-9.F' branch !isStandalone)

### Pattern di test §6.149 mandatory

Tutti i test in CP browser P2-P8 devono usare **IIFE async + `await` pattern** introdotto in §6.149:

```js
(async () => {
  const before = __pt.notifications.getPendingCount();
  // ... azione + await dei thunk ...
  const after = __pt.notifications.getPendingCount();
  await new Promise(res => setTimeout(res, 100));
  const after100ms = __pt.notifications.getPendingCount();
  console.log(JSON.stringify({ before, after, after100ms, /* + altri probe */ }, null, 2));
})();
```

Mai leggere `getPendingCount()` su riga separata post-thunk async (rischio falso-positivo §6.148 stile).

### Doc spec §3 update (post-CP browser, pre-bump)

Aggiungere a `PharmaTimer_Project_Spec.md` §3 "Modello dati" la nota:

> `state.plan` è multi-day per intentional design dal Step 5b-2. Scope: `[today − PLAN_DAYS_BEFORE, today + PLAN_DAYS_AFTER]` con `PLAN_DAYS_TOTAL = PLAN_DAYS_BEFORE + 1 + PLAN_DAYS_AFTER` (default `3`). Le projection day-scoped per UI/notifiche avvengono via `selectEntriesForDay(state, dateStr)`. Vedi `PharmaTimer_Changelog_Fase2.md` §6.147 (chiusura by-design Sessione 9-C).

### CP6 closing (post-CP browser P2-P8 verdi)

1. **Bump v2.5.40-rc.4 → v2.5.40 definitivo** in changelog front-matter + sommario §1
2. **§7 row 9-B** marcata `✅ Completo` con riferimento commit closing
3. **§7 row 9-D** marcata `✅ Completo` con riferimento dataset CP browser
4. **Cleanup `.bak.*`** (12 untracked):
   ```
   echo 'Cleanup backup files post-9-D closing'
   rm -f PharmaTimer_Changelog_Fase2.md.bak2
   rm -f package-lock.json.bak.cp1A package.json.bak.cp-pre
   rm -f public/icons/icon-192.png.bak.cp-pre public/icons/icon-512.png.bak.cp-pre public/icons/icon-maskable-512.png.bak.cp-pre
   rm -f src/components/config/ImpostazioniTab.jsx.bak.cp5 src/components/config/ImpostazioniTab.test.jsx.bak.cp5
   rm -f src/state/AppContext.jsx.bak.cp-pre
   rm -f src/state/actions.js.bak.cp1 src/state/actions.js.bak.cp1.1
   rm -f src/state/actions.scheduleTestDose.test.js.bak.cp1.1
   git status --short
   ```
5. **Commit closing 9-D:**
   ```
   echo 'Commit closing Sessione 9-D'
   git add -A
   git commit -m '9-D closing — CP browser P2-P8 verdi + cleanup .bak.* + bump v2.5.40'
   ```
6. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.40** (deliverata in 9-D closing)

### Pattern operativi da rispettare

- Bash zsh-safe (echo single-quoted, no `#`, no apostrofi italiani)
- Approval esplicita tra step (regola critica #4) — chiusura punto per punto
- **Niente codice in 9-D salvo emergenze** (best case zero codice; se emergono bug runtime in CP browser P2-P8, applicare hotfix puntuali con §6.NN dedicata)
- Se un CP browser fallisce con bug nuovo, **non bloccare la sessione**: documentare come §6.NN deferred a 9-E e procedere con bump v2.5.40 limitato ai CP verdi (regola critica #5)
- Markdown autolink: usare `window['__pt']['app']` (bracket notation) per evitare autolink Console su `pt.app`

### Riferimenti AMB carryforward

- AMB-9.E' (sincrona idempotente cancel-then-rebuild atomico) — validazione runtime in CP browser P5
- AMB-9.F' (decision tree 4 stati permission) — validazione runtime in CP browser P6+P7 (raccomandati)
- AMB-9.G' (8 trigger reschedule) — validazione runtime in CP browser P2/P3/P4
- AMB-9.H (tag-based replacement entryKey) — validazione runtime in CP browser P8
- AMB-9.I (rilevamento revoche post-subscribe) — coperto unit + validazione runtime in CP browser P6
- **AMB-9-C.A** (§6.147 by-design) — chiuso in 9-C, conferma in 9-D via doc spec §3 update
- **AMB-9-C.B** (§6.148 falso-positivo) — chiuso in 9-C, pattern §6.149 reusabile in CP browser P2-P8

### Stima token

~15-20K token totali (CP0 sanity ~2K + setup CP browser ~2K + 5 CP browser core P2-P5+P8 ~6-8K + 2 CP browser raccomandati P6+P7 ~2-3K + CP6 closing bump+cleanup+commit ~3-4K + §11 sostituzione 9-E o "Step 10" ~1-2K). Sessione browser-heavy / no-code-heavy.

### Comandi diagnostici di apertura proposti

```
cd ~/Sviluppo/pharmatimer
echo 'CP0 9-D gate 1: git status'
git status --short
echo ''
echo 'CP0 9-D gate 2: top commit chain'
git --no-pager log --oneline -3
echo ''
echo 'CP0 9-D gate 3: test suite full run'
npm test -- --run 2>&1 | tail -8
echo ''
echo 'CP0 9-D gate 4: bundle on disk'
ls -la dist/assets/index-*.js
echo ''
echo 'CP0 9-D gate 5: branch'
git branch --show-current
```

Atteso: 12 untracked `.bak.*`, top `35fed4d`, 375/375 in 36 file, `Cd8Of8Q2.js` 405628 byte, branch `step-8`.

### One-liner di apertura

```
Esegui il prompt al §11 del Changelog (Sessione 9-D esecutiva snella).
```

## 12. File prodotti in Step 4a + 4b + 5a + 5b-1 + 5b-2 + 6 + 7a + 7b-1 + 7b-2 + 7c-1 + 7c-2 + 7d-1 + 7d-2p1 + 7d-2p2 + 7d-2p3 + 8-pre + 8a + 8b + 8c-parz + 8c-2

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
| `src/state/reducer.js` | 5b-1 (mod. **7a** §6.27) | 17 azioni (SET_IMPOSTAZIONE aggiunta), `initialState.impostazioni={}` |
| `src/state/reducer.test.js` | 5b-1 (mod. **7a**) | 25 test (+1 SET_IMPOSTAZIONE) |
| `src/state/selectors.js` | 5b-1 (mod. 6, **7a**) | 6 selectors puri (aggiunto `selectImpostazione`) |
| `src/state/applyHelper.js` | 5b-1 (ext. 5b-2) | Esteso con popPresoKey + idempotenza (AMB-5b2.A), ~130 righe |
| `src/state/actions.js` | 5b-2 (mod. 6, **7a**) | createActions factory + 12 thunks. 7a: `init()` via `repo.getAllSettings()`, `setSetting` generico (+ helper `normaliseSettingsDict`) |
| `src/state/AppContext.jsx` | 5b-2 (mod. 6, **7a**) | Provider. 7a: `AppContext` **exported** per test helpers (§17 R2) |
| `src/components/oggi/OggiView.jsx` | 5b-2 | Placeholder ready 5-campi — **non toccato in 7a** (v. §15) |
| `src/domain/constants.js` | 4a (ext. 5b-2, 6) | Esteso Sessione 6 con `TICK_INTERVAL_MS=60_000` (AMB-6.G.2). `SOGLIA_PROMPT_RECUPERO=30` già presente (scoperta §17 R1) |
| `src/utils/now.js` | 6 | `resolveNow(state, referenceDate)` puro, shape AMB-6.F `{date,dateStr,hhmm,minutes,isSimulated}` |
| `src/utils/now.test.js` | 6 | 1 `it()` con 5 asserzioni (null / attivo / dateStr anchored) — AMB-6.H |
| `src/hooks/useNow.js` | 6 | Hook consumer di `{state,tickMs}`, delega a `resolveNow(state, new Date())` |
| **`vitest.config.js`** | **7a** | Config esplicita (prima implicita). Env `jsdom` default, setupFiles per jest-dom (AMB-7a.J) |
| **`src/test/setup.js`** | **7a** | Import `@testing-library/jest-dom` (solo matchers) |
| **`src/test/renderHelpers.jsx`** | **7a** | `renderWithProvider`, `buildTestState`, `buildTestPlan` — fixture riusabili per 7b/7c/7d (AMB-7a.L) |
| **`src/utils/theme.js`** | **7a** | `createThemeTokens(dark)` puro — porting 1:1 tokens mockup v5 righe 202-304 (AMB-7a.G) |
| **`src/utils/uiState.js`** | **7a** | `getCardState`, `isCrossMidnightRecalc`, `formatDelta/Duration/GapLabel/DateLabel` (AMB-7a.E/F) |
| **`src/utils/uiState.test.js`** | **7a** | 20 test (env node) — target AMB-7a.K era 18, +2 per boundary casing (±3 tollerato) |
| **`src/hooks/useTheme.js`** | **7a** | Hook read-only: legge `state.impostazioni.tema ?? 'auto'`, compone matchMedia (AMB-7a.H) |
| **`src/hooks/useTheme.test.jsx`** | **7a** | 4 test (env jsdom) — 3 modi + reattività matchMedia (AMB-7a.K) |
| **`src/components/shared/Icons.jsx`** | **7a** | 7 SVG port (Chevron, Check, X, Undo, Edit, Pause, Clock) |
| **`src/components/shared/Badge.jsx`** | **7a** | Static non-clickable. Tokens inline style (AMB-7a.I) |
| **`src/components/shared/TapBadge.jsx`** | **7a** | Interactive dashed + chevron. Tokens inline style (AMB-7a.I) |
| **`src/components/shared/Badge.test.jsx`** | **7a** | 3 test (Badge render, TapBadge onClick, TapBadge icon slot) |
| **`src/utils/theme.js`** | **7b-1** | Rename chiavi `cardBg`/`cardBorder` → naming femminile (§6.28) + token globali `scaduta{Bg,Tx,Bd}` → `inRitardo{Bg,Tx,Bd}` |
| **`src/utils/uiState.js`** | **7b-1** | Append di `groupEntriesByDayAndMomento(entries)` (§6.29, AMB-7b.G) |
| **`src/utils/uiState.test.js`** | **7b-1** | +5 test su grouping (totale 28) |
| **`src/state/selectors.js`** | **7b-1** | + `selectCountersForDay(state, dateStr, now)` con TOLLERANZA_MIN (AMB-7b.F, bugfix §6.9) |
| **`src/state/selectors.test.js`** | **7b-1** | NUOVO, +6 test (env node) |
| **`src/services/audio.js`** | **7b-1** | Rewrite: `playBeep()` pura (Web Audio, 880+1100Hz, ~0.55s, try/catch). AMB-7b.H |
| **`src/hooks/useAutoBeep.js`** | **7b-1** | NUOVO: forward-crossing beep + flashingKeys Set + timer re-arm. AMB-7b.I |
| **`src/hooks/useAutoBeep.test.jsx`** | **7b-1** | NUOVO, +3 test (env jsdom, fake timers) |
| **`src/components/oggi/DevTimeSlider.jsx`** | **7b-1** | NUOVO: range 0-1439 step 5, useTheme interno, NaN guard. AMB-7b.J |
| **`src/components/oggi/DoseCard.jsx`** | **7b-1** | NUOVO read-only: calcolaDelta DATETIME + crossMidnight badge + PASTO_TX inline + 4 longhand borders (§6.31). AMB-7b.L |
| **`src/components/oggi/DoseCard.test.jsx`** | **7b-1** | NUOVO, +5 test (env jsdom, renderWithProvider) |
| **`src/components/shared/NavBar.jsx`** | **7b-1** | Rewrite token-aware (AMB-7b.E): SVG icons + NavLink + useTheme |
| **`src/App.jsx`** | **7b-1** | + `ThemedShell` wrapper (AMB-7b.D) |
| **`src/components/oggi/OggiView.jsx`** | **7b-1** | Rewrite completo: header + counters + grouping + DevTimeSlider + DoseCard cascade + toggle tema 3-icone mode-driven (§6.30) + keyframes scaduta/flash/slider-thumb inline |
| **`src/state/selectors.js`** | **7b-2** | + `selectUltimaPresa(state)` pure, ritorna top of `state.presoStack` o null (AMB-7b-2.A) |
| **`src/state/selectors.test.js`** | **7b-2** | +2 test (stack vuoto → null; 3 keys → top) |
| **`src/components/oggi/DoseCard.jsx`** | **7b-2** | + 3 props opzionali (`onPresa`, `onUndo`, `isLastPreso`) + ACTION AREA: check button isLastPreso-aware (dashed+pulse+UNDO overlay / solid-disabled), PRESA button gated su `onPresa`, saltata/sospesa non-clickable come `<div aria-hidden>` (AMB-7b-2.B/C) |
| **`src/components/oggi/DoseCard.test.jsx`** | **7b-2** | +6 test interactive con scoping `within(container)` per bypass §6.32 |
| **`src/components/oggi/OggiView.jsx`** | **7b-2** | + import `selectUltimaPresa`, `useMemo` su `state.presoStack`, wiring `onPresa/onUndo/isLastPreso` per ogni DoseCard, injection `@keyframes pulse-border` nel CSS inline (AMB-7b-2.D) |
| **Totale test passing post-7b-2** | | **178/178** |
| **`src/test/setup.js`** | **7c-1** | + `afterEach(cleanup)` globale di @testing-library/react (AMB-7c-1.H). Chiude §6.32 strategicamente |
| **`src/state/selectors.js`** | **7c-1** | + `selectEntryByKey(state, entryKey)` pure, preparatorio 7c-2 (AMB-7c-1.J) |
| **`src/state/selectors.test.js`** | **7c-1** | +1 test per `selectEntryByKey` (hit/miss/empty/falsy) |
| **`src/components/oggi/DoseCard.jsx`** | **7c-1** | + 4 props opzionali (`onAltro`/`onSaltataTap`/`onSospesaTap`/`onGapTap`) + 4 affordance tap: ALTRO pill (gated su handler), SALTATA/SOSPESA label come `<button>` con dashed underline + IconEdit, gap badge come `<TapBadge>` condizionale. Fallback non-interattivo quando handler assente (AMB-7c-1.L) |
| **`src/components/oggi/DoseCard.test.jsx`** | **7c-1** | +4 test interactive 7c-1 (ALTRO tap / gap tap / saltata label / sospesa label). 15 test totali |
| **`src/components/oggi/modals/AltroModal.jsx`** | **7c-1** | NUOVO: 3 azioni (Saltata/Sospesa/timepick) + cross-day hint inside timepick. Porting v5 `AltroModal` (AMB-7c-1.C/D/I) |
| **`src/components/oggi/modals/AltroModal.test.jsx`** | **7c-1** | NUOVO, 6 test (mount gate / 3 azioni / overlay+close / cross-day hint) |
| **`src/components/oggi/modals/SaltataModal.jsx`** | **7c-1** | NUOVO: 3 azioni (Confermo/Cambia sospesa/timepick). Porting v5 `SaltataCorrectModal`. Q1 risolta (mantiene "Confermo saltata") |
| **`src/components/oggi/modals/SaltataModal.test.jsx`** | **7c-1** | NUOVO, 5 test |
| **`src/components/oggi/modals/SospesaModal.jsx`** | **7c-1** | NUOVO: 1 azione (Ripristina via `ripristina(key,'attiva')`). Porting v5 `SospesaCorrectModal`. §6.37 2ª opzione "Cambia in saltata" omessa (AMB-7c-1.F) |
| **`src/components/oggi/modals/SospesaModal.test.jsx`** | **7c-1** | NUOVO, 3 test |
| **`src/components/oggi/modals/RecuperoModal.jsx`** | **7c-1** | NUOVO: slider step=5 bindato a `calcolaRecuperoMax(§6.13)` + bottone Ripristina condizionale via `onReset` → `actions.recupero(key,0)`. Porting v5 `RitardoModal` (AMB-7c-1.G, Q3 risolta) |
| **`src/components/oggi/modals/RecuperoModal.test.jsx`** | **7c-1** | NUOVO, 6 test (mount / slider update / apply / disabled at rec=0 / Ripristina conditional / close) |
| **`src/components/oggi/modals/_crossDayHint.js`** | **7c-1** | NUOVO: helper puro AMB-7c-1.I, usato da AltroModal + SaltataModal (le 2 modali con time picker) |
| **`src/components/oggi/OggiView.jsx`** | **7c-1** | + 4 stati locali modale + handlers `onAltro/onSaltataTap/onSospesaTap/onGapTap` per DoseCard + mount 4 modali con wiring thunks (presa/salta/sospendi/ripristina/recupero). NO useEffect su state.prompt (scope 7c-2). AMB-7c-1.K |
| **`src/components/oggi/modals/RitardoModal.jsx`** ~~rimosso~~ | **7c-1 (§6.38)** | `git rm` stub scaffolding 16/04 (naming v5 obsoleto) |
| **`src/components/oggi/modals/SaltataCorrectModal.jsx`** ~~rimosso~~ | **7c-1 (§6.38)** | idem |
| **`src/components/oggi/modals/SospesaCorrectModal.jsx`** ~~rimosso~~ | **7c-1 (§6.38)** | idem |
| **Totale test passing post-7c-1** | | **203/203 su 15 test files** |
| **`src/state/selectors.js`** | **7c-2** | + `selectPromptEntry(state)` pure, composizione AMB-7c-2.H (gate `state.prompt?.entryKey` + delega a `selectEntryByKey`). Null-safe: null se prompt assente/malformato o entryKey stale (robustezza) |
| **`src/state/selectors.test.js`** | **7c-2** | +2 test `selectPromptEntry` (null paths: prompt assente/null/no-entryKey/empty-string; hit + stale-key miss). 9 → 11 test totali |
| **`src/components/oggi/OggiView.jsx`** | **7c-2** | 433 → 515 righe. + useEffect auto-prompt (guardia AMB-7c-2.C: altri 3 modali closed + `recuperoModal===null` + `state.prompt?.kind==='gap_recovery'`; null-gate su selectPromptEntry) + shape `recuperoModal` refactor a `{entry, source: 'manual'\|'auto'} \| null` (AMB-7c-2.B) + closeRecupero con branching AMB-7c-2.E/F. `onGapTap` ora passa `source: 'manual'`. Altri 3 modali (altro/saltata/sospesa) invariati |
| **`src/test/renderWithRealProvider.jsx`** | **7c-2** | NUOVO (313 righe). 5 exports: `DEFAULT_SEED`, `makeFakeRepo(seed?)` (concreto su 7 metodi IRepository usati dai thunks + no-op stubs sul resto), `renderWithRealProvider(ui)` con ctxRef capture via CtxCapture, `waitForReady(ctxRef)`, `runAction(fn)` act wrapper. Pattern mock boundary: Proxy via `vi.hoisted` per stabilità identity del binding `repo` attraverso destructure di Vitest |
| **`src/components/oggi/OggiView.test.jsx`** | **7c-2** | NUOVO (349 righe). 10 integration tests E2E puri: #1 no prompt→no auto; #2 prompt→auto; #3 AltroModal open→auto suspended; #4 E2E large delta→prompt; #5 E2E small delta→no prompt; #6 close auto→dismiss; #7 manual close same-key→dismiss (race-synthesis auto→manual via tap gap badge); #8 manual close other-key→no dismiss (SEED_TWO_FARMACI); #9 Anticipa→prompt via commit chain + plan check; #10 recupero(key,0) direct→prompt via commit chain (Ripristina UI-conditional, bypass UI per contract verification) |
| **`src/hooks/useModalA11y.js`** | **7d-1** | NUOVO (~110 righe). Hook `useModalA11y({isOpen, onClose, labelId, describedById, triggerRef?, fallbackEntryKey?}) → {containerRef, modalProps}`. Focus trap via focus-trap + `allowOutsideClick:true` (§6.56), Escape via `escapeDeactivates`, restore chain `triggerRef.current → [data-entry-key] → body`. `modalProps = {role:'dialog', aria-modal:true, aria-labelledby, aria-describedby?}`. Firma estesa con `fallbackEntryKey` (§6.50) |
| **`src/hooks/useModalA11y.test.jsx`** | **7d-1** | NUOVO (~100 righe). 4 test: mount activation, Escape → onClose, restore manuale via triggerRef, restore auto-fallback `[data-entry-key]` missing → body |
| **`src/test/renderHelpers.test.jsx`** | **7d-1** | NUOVO. 1 test: `rerender` con componente che usa `useAppContext` non lancia "AppProvider is missing" (§6.39 chiuso) |
| **`src/test/renderHelpers.jsx`** | 7a (mod. **7d-1** §6.39) | Refactor interno: `render(ui, { wrapper: Wrapper })` invece di wrap esterno. Firma pubblica `renderWithProvider(ui, options)` invariata (AMB-7d-1.I) |
| **`package.json` + `package-lock.json`** | mod. **7d-1** | + `focus-trap-react` in `dependencies` (AMB-7d-1.B). `focus-trap` incluso come dep transitiva usata direttamente da `useModalA11y` |
| **`src/components/oggi/modals/AltroModal.jsx`** | 7c-1 (mod. **7d-1**) | + import `useModalA11y` + prop `triggerRef=null` + `LABEL_ID='altro-modal-title'` + spread `modalProps` su sheet + `id={LABEL_ID}` su `<h3>`. Rimossi `role`/`aria-label` manuali dal div overlay |
| **`src/components/oggi/modals/AltroModal.test.jsx`** | 7c-1 (mod. **7d-1**) | +2 test a11y smoke (focus mount activation / Escape → onClose). 6 → 8 test |
| **`src/components/oggi/modals/SaltataModal.jsx`** | 7c-1 (mod. **7d-1**) | Stesso pattern AltroModal (+ hook + triggerRef + LABEL_ID) |
| **`src/components/oggi/modals/SaltataModal.test.jsx`** | 7c-1 (mod. **7d-1**) | +2 test a11y smoke. 5 → 7 test |
| **`src/components/oggi/modals/SospesaModal.jsx`** | 7c-1 (mod. **7d-1**) | Stesso pattern |
| **`src/components/oggi/modals/SospesaModal.test.jsx`** | 7c-1 (mod. **7d-1**) | +2 test a11y smoke. 3 → 5 test |
| **`src/components/oggi/modals/RecuperoModal.jsx`** | 7c-1 (mod. **7d-1**) | Stesso pattern + prop `fallbackEntryKey=null` (§6.50) usata solo da auto-open da OggiView |
| **`src/components/oggi/modals/RecuperoModal.test.jsx`** | 7c-1 (mod. **7d-1**) | +2 test a11y smoke. 6 → 8 test |
| **`src/components/oggi/DoseCard.jsx`** | 7b-1+7b-2+7c-1 (mod. **7d-1**) | `data-entry-key={entry.key}` + `tabIndex={-1}` su root div (§6.54). Handler 4 modali-openers ora `(entry, e.currentTarget)`. IconUndo overlay rimossa (§6.55 / §6.33 closed). TapBadge gap `border={t.gapTx}` invece di `t.gapBd` (§6.53). Import `IconUndo` rimosso (unused) |
| **`src/components/oggi/DoseCard.test.jsx`** | 7b-1+7b-2+7c-1 (mod. **7d-1** §6.51) | 4 test 7c-1 aggiornati con `expect.any(HTMLElement)` come 2° arg per ALTRO/SALTATA/SOSPESA. Gap test con soft assertion (TapBadge may-or-may-not forward event). Totale 15 test invariato |
| **`src/components/oggi/OggiView.jsx`** | 7b-1+7b-2+7c-1+7c-2 (mod. **7d-1**) | 4 modal state slots estesi con `triggerEl`. Handler DoseCard catturano `e.currentTarget` in 2° arg. 4 modali ricevono `triggerRef={{current: el}}`. RecuperoModal riceve anche `fallbackEntryKey`. Date separator: sostituito layout `line·label·line` con pill sticky `top-[180px] z-20` + `background: dateSepBgStrong` + `boxShadow` + `IconCalendar` (§6.34+§6.44 chiusi, §6.57). Import `IconCalendar` aggiunto. Inline CSS `:focus-visible` globale (§6.52) |
| **`src/utils/theme.js`** | 7a (mod. **7d-1**) | + token `dateSepBgStrong` (light `#D6D3D1` / dark `#3D3A47`). 1 riga aggiunta |
| **`src/components/shared/Icons.jsx`** | 7a (mod. **7d-1**) | + export `IconCalendar` (outlined calendar glyph, size default 12). IconUndo export mantenuto (consumato da SospesaModal) |
| **Totale test passing post-7d-1** | | **228/228 su 18 test files** |
| **`src/data/repository/IRepository.js`** | 3 (mod. **7d-2p1**) | +1 `@property` typedef `getLogByDataStato` (§6.40 / AMB-7d-2.C, naming D-R2) |
| **`src/data/repository/LocalRepository.js`** | 3 (mod. **7d-2p1**) | +1 metodo `getLogByDataStato(data, stato)` (filter+sort ASC `ora_effettiva`, nulls-last difensivo). ~20 righe aggiunte |
| **`src/data/repository/LocalRepository.test.js`** | **7d-2p1** | NUOVO (env node, mock `../db.js` via `vi.hoisted`). 2 test: ordering/filter+empty |
| **`src/state/AppContext.jsx`** | 5b-2 (mod. 6, 7a, **7d-2p1**) | Firma estesa `{children, initialStateProp}`. Effect boot dual-mode: seed → `INIT_FROM_SEED` dispatch, altrimenti `actions.init()`. DEV warn separato per `status`/`profiloAttivo` mancanti (§6.49 / AMB-7d-2.B) |
| **`src/state/AppContext.test.jsx`** | **7d-2p1** | NUOVO (env jsdom). 2 test: no-repo-calls quando seeded + shallow spread preserva campi non seminati |
| **`src/state/reducer.js`** | 5b-1 (mod. 7a, **7d-2p1**) | +2 case: `INIT_FROM_SEED` (shallow spread, §6.49), `SET_PRESO_STACK` (rehydrate stack init-time, §6.40). 17 → 19 azioni |
| **`src/state/actions.js`** | 5b-2 (mod. 6, 7a, **7d-2p1**) | + helper `logRowToEntryKey` (formula canonica `${data}-${farmaco_id}-${dose_numero}` replicata da `planBuilder.js`, rinvio inline) + chiamata `repo.getLogByDataStato(today,'presa')` post `INIT_SUCCESS` + dispatch `SET_PRESO_STACK` (§6.40). Rimane 12 thunks |
| **`src/state/actions.init.test.js`** | **7d-2p1** | NUOVO (env node). 3 test: empty stack / ordering LIFO / day isolation. Pattern `vi.useFakeTimers + vi.setSystemTime` per fissare `today` deterministico |
| **`src/test/renderWithRealProvider.jsx`** | 7c-2 (mod. **7d-2p1** hotfix §6.60) | +1 metodo in `makeFakeRepo`: `getLogByDataStato` (mirror semantica `LocalRepository`). Hotfix post-CP3: 10 OggiView tests falliti al primo run → ripristinati 235/235. Lezione procedurale §6.60 |
| **Totale test passing post-7d-2p1** | | **235/235 su 21 test files** |

### Delta 7d-2p2 (10 modificati + 3 nuovi = 13 totali)

| Path | Tipo | Delta |
|---|---|---|
| `src/domain/recalc.js` | **mod.** 7d-2p2 | Rename `annullaAssunzione` → `applyAnnullaAssunzione` (§6.58 chiuso atomicamente). Guard early-return `DOWNSTREAM_USER_EDITS` prima delle mutazioni su N+1 `presa`/`sospesa` (§6.61, partial — no marker `user_edited` su `ricalcolata`) |
| `src/domain/recalc.test.js` | **mod.** 7d-2p2 | Rename import. +2 test guard happy path (N+1 presa → ApplyError code=DOWNSTREAM_USER_EDITS, idem sospesa) |
| `src/state/actions.js` | **mod.** 7d-2p2 | Rename import `applyAnnullaAssunzione`. Nuovo thunk `annullaAssunzione(entryKey)` con dispatch `REMOVE_PRESO_KEY` su success. Export bag: 12 → 13 thunks |
| `src/state/actions.annullaAssunzione.test.js` | **NUOVO** 7d-2p2 | 2 test thunk (env node): happy path `{ok:true}`, guard path `{ok:false, code:'DOWNSTREAM_USER_EDITS'}` con asserzione no COMMIT_APPLY_RESULT / no REMOVE_PRESO_KEY dispatched |
| `src/state/reducer.js` | **mod.** 7d-2p2 | +1 case `REMOVE_PRESO_KEY` (§6.62): `presoStack.filter(k => k !== payload)`. No-op se key non presente. 19 → 20 azioni |
| `src/state/reducer.test.js` | **mod.** 7d-2p2 | +1 test filter `REMOVE_PRESO_KEY` (happy path + no-op) |
| `src/state/applyHelper.js` | **mod.** 7d-2p2 | `commitApplyResult` DomainError path: return esteso da `{ok: false}` a `{ok: false, code: err.code}` (§6.63). Path unknown/repo invariati |
| `src/components/oggi/modals/UndoModal.jsx` | **mod.** 7d-2p2 | Stub 1-riga §6.59 sostituito con implementazione completa (196 righe). Pattern `useModalA11y` (focus trap, Escape, restore focus). Handle `handleConfirm` async: legge `result?.code`, branch errorCode `DOWNSTREAM_USER_EDITS` / `GENERIC`. Banner alert in-place con `role="alert"`. Copy italiana ("Impossibile annullare", "Una dose successiva...") |
| `src/components/oggi/modals/UndoModal.test.jsx` | **NUOVO** 7d-2p2 | 4 test (env jsdom): (1) no-mount su `entry=null`, (2) a11y initial focus inside dialog, (3) success path calls `onConfirm(entry)` + `onClose`, (4) banner DOWNSTREAM on reject + NO `onClose` |
| `src/components/oggi/DoseCard.jsx` | **mod.** 7d-2p2 | Refactor strutturale: 3 JSX const estratti (timeColumn, separator, content) dentro il componente. Nuova prop opzionale `onUndoTap(entry, triggerEl)`. Body conditionally wrapped in `<button type="button">` sibling rispetto ad ACTION AREA quando `isPresa && onUndoTap` (HTML-valido: check dashed resta sibling, non descendant). 644 righe |
| `src/components/oggi/DoseCard.test.jsx` | **mod.** 7d-2p2 | +1 test wrapper: `onUndoTap` handler invocato su click del wrapper Card body, con `(entry, HTMLElement)` args. Zero regressioni sugli 11 test preesistenti |
| `src/components/oggi/OggiView.jsx` | **mod.** 7d-2p2 | Import `UndoModal`. Stato locale `undoModal = {open, entry, triggerEl}`. Guard `useEffect` auto-prompt esteso a 4 modali (aggiunge `undoModal.open`). `closeUndo` handler. Prop `onUndoTap` su DoseCard wired a `setUndoModal({open:true, entry, triggerEl})`. Mount `<UndoModal>` con `triggerRef={{current: triggerEl}}` per restore focus, `onConfirm={(en) => actions.annullaAssunzione(en.key)}` |
| **Totale test passing post-7d-2p2** | | **245/245 su 23 test files** |

### Delta 7d-2p3 (4 modificati + 0 nuovi = 4 totali)

| Path | Tipo | Delta |
|---|---|---|
| `src/components/oggi/DoseCard.jsx` | **mod.** 7d-2p3 | CP6 §6.45: branch `isPresa` estende "in orario" a `|delta_minuti| ≤ TOLLERANZA_MIN` (pre: `delta === 0`). CP6 §6.47a: nuova const `gapResiduo = (gap_minuti ?? 0) - (recupero_minuti ?? 0)` accanto a `displayTime`; `hasGapTap` guard consuma `gapResiduo > 0`; mount condition badge + label `formatGapLabel(...)` su entrambi i rami (TapBadge + Badge fallback) consumano `gapResiduo`. Header comment: nuova sezione "Sessione 7d-2 CP6 (AMB-7d-2p3.E/K'', §6.45 + §6.47a)". 659 righe |
| `src/components/oggi/DoseCard.test.jsx` | **mod.** 7d-2p3 | 2 update: test `extracts HH:MM ... taken entry` (delta=-5 atteso `'in orario'` invece di `'Anticipo'`); nome test `calls onGapTap ... (gap_minuti > 0)` → `(gapResiduo > 0)` (funzionalità invariata, fixture recupero_minuti=0). 2 NEW (nuovo describe "Sessione 7d-2 CP6"): (a) §6.45 `delta_minuti=30` → `'Ritardo'` + `'30 min'` + assert negative su `'in orario'`; (b) §6.47a `gap=60 recupero=60` → né TapBadge né Badge rendered (queryByRole + queryByText entrambe `null`). Net +2 test |
| `src/utils/theme.js` | **mod.** 7d-2p3 | CP7: nuovo token `focusRing: dk ? '#60A5FA' : '#3B82F6'` piazzato accanto a `dateSepBgStrong` (cluster a11y). Commento inline documenta degrade accettato su `gapBg`/`redBg` dark (AMB-G). Light value invariato da 7d-1 hardcoded; dark value lift per contrast AA su `#15141A` pageBg |
| `src/components/oggi/OggiView.jsx` | **mod.** 7d-2p3 | CP7: `const CARD_AND_SLIDER_CSS` promosso a `function buildCss(t)` top-level (Opzione 1 del prompt §11). Regola `:focus-visible` usa `${t.focusRing}` invece di `#3B82F6` hardcoded. Consumer `const cssString = useMemo(() => buildCss(t), [t])` piazzato dopo `ultimaPresa` + prima dell'`useEffect` auto-prompt (hooks-before-returns). `<style>{cssString}</style>` sostituisce `<style>{CARD_AND_SLIDER_CSS}</style>`. Header comment: nuova sezione "7d-2 CP7 wiring (AMB-7d-2p3.G / §6.46+§G)" |
| **Totale test passing post-7d-2p3** | | **247/247 su 23 test files** |

### Delta 8-pre implementativa (2 modificati + 0 nuovi = 2 totali)

| Path | Tipo | Delta |
|---|---|---|
| `src/state/actions.js` | **mod.** 8-pre | Rehydration `presoStack` in `init()` riscritta (§6.72 + §6.75). Rimossa call `repo.getLogByDataStato(today, 'presa')` a riga 153 pre-8-pre. Introdotto block `const startPresoDate = addDays(today, -PLAN_DAYS_BEFORE); const presaLogsInWindow = logAssunzioni.filter(...)`. Filter triplo: `stato === 'presa'` (semantics), `data >= startPresoDate` (left bound window §6.72), `data <= today` (right-bound defensive vs `PLAN_DAYS_AFTER`). Header comment block aggiornato: nuova sezione "Sessione 8-pre (§6.72, supersedes §6.40) + §6.75 source optimization" |
| `src/state/actions.init.test.js` | **mod.** 8-pre | Riscrittura completa (6 test vs 3 pre-8-pre). Describe rinominato "Sessione 8-pre, §6.72 + §6.75". `makeRepo` riconfigurato: `getLogByRange` è il canale primario (riceve `rangeLogs`), `getLogByDataStato` mock conservato solo come spy per verificare `not.toHaveBeenCalled()`. 6 scenari: (1) empty window; (2) today only; (3) yesterday only (cross-day happy path §6.72); (4) yesterday+today ASC+LIFO; (5) stato filter (esclude saltata/ricalcolata/sospesa); (6) window right-bound guard (esclude tomorrow). Helper `presaLog({id, data, dose_numero, ora})` factory estratto per DRY. `beforeEach/afterEach` globali per `vi.useFakeTimers` clock fissato a `2026-04-21T10:30:00` |
| **Totale test passing post-8-pre** | | **250/250 su 23 test files** (+3 netti) |

---



### Delta 8c parziale (CP1-CP4) — 2 nuovi + 4 modificati = 6 totali

| Path | Tipo | Delta |
|---|---|---|
| `src/domain/constants.js` | **mod.** 8c CP1 | `GET_FARMACI_SOLO_ATTIVI = false` → `true` (1 riga flip, AMB-8c.L). Consumer unico `src/state/actions.js:99` in `init()`; zero test rotti (remediation ripristina 287/287). |
| `src/state/selectors.js` | **mod.** 8c CP2 | Append `selectFarmaci(state) => state.farmaci \|\| []` prima di `selectFarmaciAttivi` (+12 righe, JSDoc con nota post-CP1 flip). |
| `src/components/config/FarmaciTab.jsx` | **mod.** 8c CP2+CP3+CP4 | Riscrittura completa da placeholder §6.78 a ~870 righe: `FarmaciTab` root + `FarmacoCard` (badge Cronico/Temporaneo §6.91, border-left color-coded, sort `localeCompare('it')`, card tap a openerRef) + `FarmacoDrawer` (form 4 sezioni: Anagrafica / Frequenza&Dosi / Orari / Avanzate con H2 sticky; `useModalA11y` focus trap; backdrop gated §6.86.1/.4; X close button; Salva gate su `canSave`; save no-op CP3/CP4 — thunks in CP5) + `OrarioRow` sub-component (grid 2-col ancora+offset + textarea descrizione, mobile-first) + helpers inline (FormField, FormSelect, FormTextarea, FormCheckbox, SectionHeading) — candidati promozione shared 8d. §6.88 consumata (campo `attivo` OMESSO). Auto-sync `dosi_giornaliere` ↔ righe orari (add defaults / trim+banner "Ripristina" con undo). Rehydration orari edit mode da `state.orari.filter(farmaco_id)`. Duplicate name warning case-insensitive+trim. Hard check `intervallo_minimo_ore < intervallo_ore`. Soft warning ordine wrap-aware via import `computeOraPrevista` dominio (zero duplicazione). |
| `src/components/config/FarmaciTab.test.jsx` | **nuovo** 8c CP2+CP3+CP4 | 9 test totali (+3 CP2 lista + 3 CP3 drawer/form + 3 CP4 orari/undo/wrap-mezzanotte). Fixtures locali `buildFarmaci()` + `buildProfiloAttivo()`. Mix `userEvent` (click, type per input text) + `fireEvent.change` (number inputs controllati). |
| `src/components/config/ConfigView.jsx` | **mod.** 8c CP3 | 1 riga wire: `<Route path="farmaci" element={<FarmaciTab dirty={dirty} setDirty={setDirty} />} />` (da `<FarmaciTab />` stand-alone). Allinea con pattern ProfiliTab/ImpostazioniTab. |
| `src/hooks/useUnsavedChanges.js` | **nuovo** 8c CP4 | Hook ~15 righe, API tuple-like `[isDirty, setDirty] = useUnsavedChanges({onChange?})`. AMB-8c.I. Consuma rettifica F2 (DRY-at-3), chiude AMB-8b.G implicitamente. ProfiliTab + ImpostazioniTab retrofit differito 8d. |
| `src/hooks/useUnsavedChanges.test.jsx` | **nuovo** 8c CP4 | 1 test (6 asserzioni): initial false + onChange mount + setDirty(true) flips + setDirty(false) reverts, `renderHook` + `act` pattern (template: `useAutoBeep.test.jsx`). |
| **Totale test passing post-CP4 (8c parziale)** | | **297/297 su 30 test files** (+10 netti rispetto a baseline 287). Target finale 8c completo: 308 ±3 dopo 8c-2 (era 309 ±3 pre-§6.90). |

### Delta 8c-2 contingency (CP5+CP6) — 2 nuovi + 6 modificati = 8 totali + hotfix §6.95

| File | Step | Note |
|---|---|---|
| `src/components/shared/ConfirmModal.jsx` | **nuovo** 8c-2 CP5 | 108 righe. API props `{open, title, body, confirmLabel, cancelLabel='Annulla', danger=false, onConfirm, onCancel}`. Monta `useModalA11y` (focus-trap + Escape + restore). Z-index `z-[60]` sopra drawer (z-50) e UnsavedChangesModal. Backdrop NON dismissive (buttons-only). §6.89 consumata parziale (ProfiliTab retrofit 8d) + §6.92 (asymmetry `useModalA11y` vs predecessore). |
| `src/state/actions.js` | **mod.** 8c-2 CP5+CP6 hotfix | +154 righe. 3 thunks farmaci pessimistici: `addFarmaco(data, orari)`, `updateFarmaco(id, patch, orari?)`, `deleteFarmaco(id)`. Pattern `withTransaction('rw', ['farmaci','orari_base'], ...)` per add/update; soft-delete no-tx (single-row atomic). Post-commit rifetch parallelo `Promise.all([getFarmaci, getAllOrari])` + dispatch `SET_FARMACI + SET_ORARI` (§6.93). Rebuild via helper `rebuildPlanFromFresh({farmaci, orari})` (§6.95 hotfix CP6): bypassa stateRef stale letto da `getState()` un tick dopo dispatch, costruisce plan inline dai dati freschi. Error handling dispatcha `SET_ERROR` kind:'repo' senza chiudere drawer. Action bag esteso con i 3 nuovi thunks. |
| `src/state/selectors.js` | **mod.** 8c-2 CP5 | +20 righe. `selectFarmacoById(state, id)` non-curried allineato a `selectProfiloById` (AMB-8c-2.C). Defensive `state.farmaci \\|\\| []` guard per early-render paths. Return `null` su miss (mai `undefined`). |
| `src/components/config/FarmaciTab.jsx` | **mod.** 8c-2 CP5 | +172 righe. `useAppContext` destructura `actions` oltre a `state`. Helpers: `normalizeForm(f)` (string→number con NaN guard, trim→null per campi testo opzionali, conditional `intervallo_minimo_ore` solo se `custom_minimo`). State: `dataFineConfirmOpen`, `dataFinePendingPayload` (preserva payload Save tra open/confirm della §6.68 modal), `deleteConfirmOpen`, `submitting` (lock double-fire). `handleSalva` route via `isoToday()` check (create+edit, AMB-8c-2.D), `commitSave` delegato a add/update thunk. `confirmDelete` chiama `deleteFarmaco(editingId)`. Bottone "Elimina" danger in footer drawer edit-mode (rosso border+text, `t.red`). 2 `<ConfirmModal>` inline con copy §6.67 + §6.68, disabled states su `submitting`. |
| `src/state/actions.farmaci.test.js` | **nuovo** 8c-2 CP5 | 210 righe, 6 test split-per-concern §6.87. Mock repo con `vi.fn` + `withTransaction` pass-through + dispatch capture. Scenari: add success (tx + refetch + SET_FARMACI/ORARI + rebuildPlan via getLogByRange tell), add repo-fail (SET_ERROR kind:'repo', no SET_FARMACI), update con orari, update senza orari (replaceOrari NOT invocato), delete success, delete repo-fail. |
| `src/state/selectors.test.js` | **mod.** 8c-2 CP5 | +20 righe, 1 test su `selectFarmacoById` (hit + miss + state.farmaci assente). |
| `src/components/config/FarmaciTab.test.jsx` | **mod.** 8c-2 CP5 | +89 righe, 2 test end-to-end append: (a) delete flow Pantorc → tap Elimina footer drawer → ConfirmModal copy §6.67 → tap Elimina danger → `deleteFarmaco(1)` invocato → drawer chiuso; (b) data_fine-past flow Duoresp → cambio data_fine a passato → Salva → ConfirmModal copy §6.68 → Conferma → `updateFarmaco(id, patch, orari)` invocato con patch.data_fine. Usa `within(drawer).getByRole('button', {name: /^elimina$/i})` per scope query (evita clash footer vs modal). |
| `src/test/renderHelpers.jsx` | **mod.** 8c-2 CP5 | +10 righe. `defaultNoopActions()` esteso con `addFarmaco/updateFarmaco/deleteFarmaco` noop (§6.94 scope-minimal). Altri thunks profili/annullaAssunzione mancanti NON retrofit (candidato 8d). |
| **Totale test passing post-8c-2** | | **306/306 su 31 test files** (+9 netti rispetto a baseline 297). Target §11 v2.5.28 "308 ±3" soddisfatto con -2 in range. |
| **Commits separati** | | `dda9af7` CP5 (8 file codice+test, 786 ins / 46 del). `06dc680` CP6 hotfix §6.95 (1 file, 42 ins / 7 del). + Changelog v2.5.29 (questo delivery). |

**NON prodotti (scope CP5-CP6, sessione 8c-2):**
- `src/components/shared/ConfirmModal.jsx` (§6.89 da aprire)
- `addFarmaco` / `updateFarmaco` / `deleteFarmaco` thunks in `src/state/actions.js`
- `src/state/actions.farmaci.test.js`
- Delete button + data_fine-past interceptor in FarmaciTab
- 1 test `selectFarmacoById` in `selectors.test.js`

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

## 16. Stato post-Sessione 6

Sessione 6 completata il 18 aprile 2026. Output verificato nel sandbox (120/120 Vitest) e in browser via `__pt.app.getState()` dopo `npm run dev`.

### File prodotti e modificati

**File nuovi:**
- `src/utils/now.js` — ~75 righe. Funzione pura `resolveNow(state, referenceDate=new Date())` che ritorna la shape AMB-6.F `{date, dateStr, hhmm, minutes, isSimulated}`. Gestisce `state.simulatedNow` sovrascrivendo HH:MM sul clone di `referenceDate` con `setHours(h, m, 0, 0)`. `dateStr` sempre ancorato a `referenceDate` (locale TZ via `getFullYear/getMonth/getDate`). Nessuna import da dominio o stato: è `leaf utility`.
- `src/utils/now.test.js` — 1 `it()` con 5 asserzioni che copre i tre casi AMB-6.H: simulatedNow null, simulatedNow attivo con coerenza HH:MM/date, dateStr ancorato a referenceDate quando simulatedNow è su un altro orario. Test eseguito in env node (default Vitest).
- `src/hooks/useNow.js` — ~40 righe. Hook che chiama `useAppContext()` destructurando `{state, tickMs}` (tickMs destructurato per documentare intent, anche se la reattività deriva comunque dall'identità del context value) e delega a `resolveNow(state, new Date())`. Throw implicito se fuori Provider (via `useAppContext`). Commento dichiara vincolo "NON va invocato in AppContext.jsx stesso" (AMB-6.D anti-circular).

**File modificati (refactor Sessione 6):**
- `src/state/actions.js` — rimossa `resolveNow` privata (11 righe). Aggiunto `import { resolveNow } from '../utils/now.js'`. Il destructuring `const { dateStr, hhmm } = resolveNow(getState())` in `presa` funziona invariato (nuova shape è superset della vecchia `{dateStr, hhmm}`).
- `src/state/selectors.js` — `selectToday(state, now)` e `selectProssimaDose(state, now)` delegano a `resolveNow(state, now)`. Rimossi helper locali `formatISODate` e `formatHHMM` (duplicavano `utils/now.js`). Mantenuto `hhmmToMinutes` locale: serve a convertire `entry.ora_ricalcolata ?? entry.ora_prevista` (stringhe del piano), non solo "now". Firma `selectToday` passata da `(_state, now)` a `(state, now)`: `state` ora effettivamente letto ma risultato identico (il simulato non sposta il calendar).
- `src/state/AppContext.jsx` — aggiunto `useState` agli import react e `TICK_INTERVAL_MS` a quelli di `../domain/constants.js`. Nuovo state `tickMs` (`useState(() => Date.now())`). Il precedente `setInterval(check, 60_000)` è diventato un unico `setInterval(tick, TICK_INTERVAL_MS)` dove `tick()` fa **entrambi**: `setTickMs(Date.now())` e il rollover check. Lo stesso `tick` è agganciato a `visibilitychange` (§6.24). Value shape passata da `{state, actions}` a `{state, actions, tickMs}` (AMB-6.E). Rimosso il literal `60_000`.
- `src/domain/constants.js` — estensione retroattiva: aggiunte 2 righe con `TICK_INTERVAL_MS = 60_000` (AMB-6.G.2).

**Intoccati (come prescritto dal prompt §11 v2.5.3):**
- `src/App.jsx`, `src/main.jsx`, `src/components/shared/NavBar.jsx`
- `src/state/reducer.js`, `src/state/applyHelper.js`
- `src/domain/recalc.js`, `src/domain/planBuilder.js`, `src/domain/orarioResolver.js`
- `src/data/repository/IRepository.js`, `src/data/repository/LocalRepository.js`, `src/data/devCheck.js`
- `src/utils/time.js`
- `src/components/oggi/OggiView.jsx` (placeholder 5-campi intatto; verrà sovrascritto in Sessione 7)

### Deviazioni aggiuntive

**§6.24 (AMB-6.K) — `visibilitychange` aggiorna anche `tickMs`**

Documentata nella sez. 6. AMB-6.B letterale prevedeva che al `visibilitychange` girasse solo il rollover check. La decisione esecutiva è di far girare l'intera funzione `tick()` (che comprende sia `setTickMs` sia il rollover check), così che il ritorno da background re-allinei immediatamente sia il calendario sia il clock per i consumer di `useNow`.

### Scoperte durante implementazione

- **Reattività via context value.** React ri-renderizza i componenti che chiamano `useContext(AppContext)` ogni volta che il `value` cambia identità. Siccome `useMemo(() => ({ state, actions, tickMs }), [state, actions, tickMs])` ricrea l'oggetto quando `tickMs` cambia, tutti i consumer `useAppContext` — e quindi `useNow` — re-renderano ad ogni tick, anche se non leggono direttamente `tickMs`. Il destructuring di `tickMs` in `useNow` è puramente documentativo.
- **Test count semantics.** AMB-6.H dichiarava "+1 test" con target 120; interpretato come +1 al conteggio totale di `it()` (coerente con il conteggio reducer.test.js in §14). Un unico `it()` con 5 asserzioni raggruppate soddisfa sia il target numerico sia la copertura dei 3 casi.
- **`ricalcolaPianoDaProfilo` ritorna `Plan` puro** (già §15): il commento difensivo in `cambiaProfilo` resta, non toccato in questa sessione.

### Test counts
- Prima: 119/119 (fine Sessione 5b-2)
- Dopo: **120/120** (+1 `utils/now.test.js`)
- Dettaglio per file: planBuilder 9, recalc 62, reducer 24, time 24, **now 1**

### Verifica browser (end-to-end)
Eseguita su `http://localhost:5173/oggi` (Safari/Chrome, DevTools Console):
- `__pt.app.getState().status` → `'ready'` ✓
- `__pt.app.getState().lastBuiltForDay` → `'2026-04-18'` ✓
- `__pt.app.getState().plan.length` → `39` ✓
- `Object.keys(__pt.app.actions).length` → `12` ✓
- Snippet tick 70s: mark0 stampato con plan.length=39, finestra trascorsa senza errori in console (verifica di stabilità Provider su >1 tick)

Render UI su `/oggi`: placeholder 5-campi invariato (come atteso — la UI consumer di `useNow` arriva in Sessione 7).

### Limitazioni note

- **Nessun test** su `useNow` hook: testing con `@testing-library/react` + jsdom rinviato a Sessione 7 quando esistono consumer reali (AMB-6.H).
- **Verifica diretta di `tickMs`** non effettuata (estensione React DevTools non accessibile in finestra incognito). Verifica indiretta via snippet 70s conferma stabilità Provider; la verifica diretta verrà effettuata in Sessione 7 quando l'header clock della vista Oggi mostrerà l'HH:MM aggiornarsi al minuto.
- **`ora_ricalcolata` cross-midnight** (§6.18) ancora aperta. Decisione UI da congelare **in Sessione 7** prima del porting (inclusa in analisi-first §11 punto F).
- **Re-render Provider ad ogni tick**: tutti i consumer `useAppContext` re-renderizzano ogni 60s anche se non usano `tickMs` (AMB-6.E). Accettabile per la complessità attuale (~singola vista consumer); sub-context / event emitter rinviati a Step 7+ se emergono problemi perf misurati.

### Azioni sul Mac prima di Sessione 7
1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione v2.5.4 fornita in questo delivery (unico file da aggiornare in KB).
2. Nessuna modifica al codice richiesta.

---

## 17. Stato post-Sessione 7a

Sessione 7a completata il 19 aprile 2026. Output prodotto nel sandbox, consegnato via `present_files` per copia manuale nella working copy sul Mac. Verifica baseline `npm test -- --run` a 120/120 confermata in apertura.

### File prodotti e modificati

**File nuovi (13):**
- `vitest.config.js` — config esplicita (era implicita). `environment: 'jsdom'` default, `setupFiles: ['./src/test/setup.js']`. AMB-7a.J.
- `src/test/setup.js` — 4 righe. Solo `import '@testing-library/jest-dom'`. Niente globals (AMB-7a.J).
- `src/test/renderHelpers.jsx` — ~115 righe. `buildTestState(overrides)`, `buildTestPlan({dateStr})` (3 entries: prevista / ricalcolata / presa), `renderWithProvider(ui, {stateOverrides, actions, tickMs})`. Usa `AppContext` esportato (§17 R2) per wrappare con Provider stub; nessun `AppProvider` reale ⇒ niente `repo.init()` asincrono nei test. AMB-7a.L.
- `src/utils/theme.js` — ~110 righe. Funzione pura `createThemeTokens(dark)`. Porting 1:1 dei 70+ tokens dal mockup v5 righe 202-304. AMB-7a.G.
- `src/utils/uiState.js` — ~130 righe. `getCardState(entry, {dateStr, minutes})` con rules documentate in-file (match stato → match dateStr → match window), `isCrossMidnightRecalc(entry)` (soglia: `ora_ricalcolata < ora_prevista - 60 min`), `formatDelta/Duration/GapLabel/DateLabel` porting 1:1 mockup v5 righe 34-68. AMB-7a.E/F.
- `src/utils/uiState.test.js` — ~170 righe, **20 test** (env node). `describe getCardState` 12 test (inclusi boundary -15/-16/+0/+30/+31), `describe isCrossMidnightRecalc` 3 test, `describe formatDelta/Duration/GapLabel/DateLabel` 5 test. Target AMB-7a.K era 18, overshoot +2 dovuto al casing esplicito dei boundary di tolleranza (giustificato).
- `src/hooks/useTheme.js` — ~55 righe. Read-only. Legge `state.impostazioni?.tema ?? 'auto'`; `useState` iniziale lazy per matchMedia (guard SSR/jsdom); `useEffect` ascolta `change` solo se `mode === 'auto'`; resync `mq.matches` nell'effect per catturare cambi tra lazy init e mount. Tokens via `useMemo([dark])`. AMB-7a.G/H.
- `src/hooks/useTheme.test.jsx` — ~100 righe, **4 test** (env jsdom default). Helper `makeMatchMedia(initial)` con `setMatches` per triggerare listeners. Wrapper basato su `AppContext.Provider` stub. I 4 test: `mode='auto' + OS dark`, `mode='light' override`, `mode='dark' override`, `matchMedia change` con `act()`. AMB-7a.K.
- `src/components/shared/Icons.jsx` — ~45 righe. 7 SVG: `IconChevron`, `IconCheck`, `IconX`, `IconUndo`, `IconEdit`, `IconPause`, `IconClock`. Porting 1:1 mockup righe 309-331. Props `{color='currentColor', size=default}`.
- `src/components/shared/Badge.jsx` — ~15 righe. Non-clickable. Tailwind core + inline `style={}` per tokens (AMB-7a.I).
- `src/components/shared/TapBadge.jsx` — ~25 righe. Clickable dashed + chevron. Stesso pattern stile.
- `src/components/shared/Badge.test.jsx` — ~35 righe, **3 test** (env jsdom). Badge render label + style, TapBadge onClick fires, TapBadge icon slot rendering. AMB-7a.K.
- `reducer_test_patch.js` — snippet da appendere a `src/state/reducer.test.js` esistente: **+1 test** `SET_IMPOSTAZIONE` con 3 asserzioni (init / merge / overwrite).

**File modificati (estensioni retroattive):**
- `src/state/reducer.js` — `initialState.impostazioni = {}` aggiunto; `INIT_SUCCESS` payload esteso con `impostazioni`; nuovo case `SET_IMPOSTAZIONE` (spread-merge). `nomeUtente` mantenuto come mirror legacy. §6.27 / AMB-7a.M.
- `src/state/actions.js` — `init()` chiama `repo.getAllSettings()` (sostituisce il single `repo.getSetting('nome_utente')`); helper `normaliseSettingsDict` gestisce sia `Array<{chiave,valore}>` sia shape `object`; `nomeUtente` derivato da `impostazioni.nome_utente ?? ''`; `setSetting` riscritto con dispatch generico `SET_IMPOSTAZIONE` + mirror `SET_NOME_UTENTE` per key `nome_utente`. Rollback su errore repo ripristina entrambi. Rimosse funzioni obsolete `readSettingFromState` / `dispatchSettingUpdate`.
- `src/state/selectors.js` — nuovo `selectImpostazione(state, chiave)` con fallback esplicito `null` (mai `undefined`).
- `src/state/AppContext.jsx` — `export` aggiunto davanti a `const AppContext = createContext(null)` (R2). Zero altri cambiamenti runtime. Commento inline documenta intent.

**Intoccati (come prescritto dal prompt §11 v2.5.5):**
- `src/App.jsx`, `src/main.jsx`, `src/components/shared/NavBar.jsx`
- `src/domain/recalc.js`, `src/domain/planBuilder.js`, `src/domain/orarioResolver.js`, `src/domain/errors.js`, `src/domain/types.js`
- `src/state/applyHelper.js`
- `src/data/repository/IRepository.js`, `src/data/repository/LocalRepository.js`, `src/data/devCheck.js`
- `src/utils/time.js`, `src/utils/now.js`, `src/hooks/useNow.js`
- `src/components/oggi/OggiView.jsx` (placeholder 5-campi intatto; sarà sovrascritto in 7b)

### Deviazioni aggiuntive

**§6.27 (AMB-7a.M) — `state.impostazioni` dict generico**

Documentata nella sez. 6. Risposta al bloccante B1 emerso al punto 13 del sanity check: lo state pre-7a non aveva `state.impostazioni`, mentre AMB-7a.C lo dava per presente. Scelta Opzione 1 (introduzione dict + SET_IMPOSTAZIONE) motivata dal costo contenuto (~35 righe) e dalla preservazione retrocompatibile del mirror `nomeUtente`.

**R1 — `SOGLIA_PROMPT_RECUPERO` già presente**

Scoperta al punto 2 del sanity check: `SOGLIA_PROMPT_RECUPERO = 30` era già in `constants.js` dalle prime sessioni (usata in `applyAssunzione` al trigger del prompt). Il punto 5 del prompt §11 v2.5.5 ("aggiungi retroattivamente") diventa no-op. Nessun edit a `constants.js` in 7a.

**R2 — `AppContext` esportato**

Scoperta al punto 10 del sanity check: `const AppContext = createContext(null)` era privato al modulo. Aggiunta una sola parola (`export`), zero impatto runtime. Sblocca `renderWithProvider` con Provider stub (vantaggio: evita `repo.init()` asincrono al mount nei test).

### Scoperte durante implementazione

- **Target test 148 vs 145 prefigurato.** AMB-7a.K diceva 120 → 145 (+25) con tolleranza ±3. Conteggio finale: reducer +1, uiState +20 (target era 18), useTheme +4, Badge +3 → **+28** vs target, **+3 dalla tolleranza** = al boundary superiore accettabile. I 2 test `uiState` sopra target coprono i boundary di `TOLLERANZA_MIN` (-15 exact → 'prossima' vs -16 → 'in_ritardo') e `+30 exact → 'prossima' vs +31 → 'in_attesa'`; senza questi rischierebbero silent drift in future modifiche di `getCardState`. Deviazione accettata.
- **`getCardState` branch ordering.** La regola "altro giorno → sempre in_attesa" (punto 4 in cascata) viene PRIMA del calcolo diff. Conseguenza: una dose di ieri rimasta 'prevista' appare 'in_attesa', non 'in_ritardo'. Volutamente conservativo: l'utente revisiona la storia senza vedere alert su dosi del passato. Per marcare ritardi storici, la UI consumer (7b) potrà aggiungere un badge distinto.
- **`useTheme` resync on mount.** Durante la stesura ho aggiunto `setMqDark(mq.matches)` dentro l'effect per coprire il gap tra `useState` lazy init e l'attach del listener. Scenario: l'utente cambia le preferenze OS nell'arco di ~100ms prima che l'effect giri. Senza resync, il primo render mostrerebbe lo stato vecchio. Non era nel prompt, ma è coerenza utente; documentato in commento inline.
- **`matchMedia` stub in `useTheme.test.jsx`.** jsdom non implementa `matchMedia`. Il mock live è definito nel `beforeEach` del file (Object.defineProperty su `window`), NON in `test/setup.js` (AMB-7a.J vietava globals). Ogni test sostituisce `window.matchMedia = () => mm.mq` con la sua istanza controllata. Pattern replicabile in 7b/7c.
- **`normaliseSettingsDict` difensivo.** Gestisce sia `Array<{chiave, valore}>` (atteso da `repo.getAllSettings()` secondo IRepository) sia già-dict (fallback). Costo 7 righe per robustezza contro futuri refactor del repo layer.

### Test counts
- Prima: 120/120 (fine Sessione 6)
- Dopo: **148/148** (+28)
- Dettaglio per file: planBuilder 9, recalc 62, reducer **25** (+1), time 24, now 1, **uiState 20**, **useTheme 4**, **Badge 3**

### Verifica browser (end-to-end) — attesa

Da eseguire post-copia file sul Mac: `npm run dev`, `http://localhost:5173/oggi`. Attesi:
- `/oggi` renderizza ancora il placeholder 5-campi (invariato da 5b-2). Nessuna consumer UI dei nuovi helper in 7a.
- Console: `__pt.app.getState().impostazioni` → `{}` (o con eventuali settings caricate dal seed demo). Nessun errore.
- Smoke manuale: `__pt.app.actions.setSetting('tema', 'dark')` + `__pt.app.getState().impostazioni.tema` → `'dark'`. Poi ricarica pagina e rilegge: persistenza OK.

### Limitazioni note

- **useTheme mai consumato in 7a.** Nessuna UI reale chiama `useTheme()`; la verifica browser sopra è solo un controllo di shape. L'integrazione vera avviene in 7b (header consumer + shell applica `pageBg`).
- **Mirror legacy `nomeUtente`.** Resta come duplicato di `state.impostazioni.nome_utente`. Non è tecnicamente necessario (il reducer potrebbe derivare via selector), ma l'ho lasciato per retrocompatibilità con i 24 test esistenti di `reducer.test.js` e con consumer hardcoded futuri. Rimozione rinviata a Step 8 (ConfigView) dove il refactor ha consumer naturale.
- **`setSetting` rollback imperfetto per chiave nuova.** Se `setSetting('chiave_nuova', v)` fallisce su repo e la chiave non esisteva prima (`prevValore === undefined`), il rollback re-dispatcha `SET_IMPOSTAZIONE` con `valore: undefined`, che lascia la chiave nel dict con valore `undefined` invece di rimuoverla. Accettabile: `selectImpostazione` tratta `undefined` come `null` (fallback esplicito). Una nuova azione `DELETE_IMPOSTAZIONE` risolverebbe in modo pulito ma è overkill per 7a.
- **`renderWithProvider` non testa re-render su cambio `state`.** Il value del Provider stub è costruito una volta per chiamata `render()`. I test che vogliano coprire reattività al cambio state devono costruire un wrapper custom (pattern già usato in `useTheme.test.jsx`). Documentato come limitation nel commento JSDoc.
- **Niente Playwright / visual regression.** Il delivery è coperto da unit + integration test light (jsdom). La verifica a occhio sul Mac resta necessaria (specialmente per token colore in light/dark). Accettabile in scope 7a (no UI visibile nuova).

### Azioni sul Mac prima di Sessione 7b

1. **Estrarre i file dal delivery** (present_files) nella working copy `~/Sviluppo/pharmatimer/` rispettando i path relativi.
2. **Installare devDeps:**
   ```
   npm install --save-dev @testing-library/react@^16 @testing-library/jest-dom@^6
   ```
3. **Appendere lo snippet test** di `reducer_test_patch.js` a `src/state/reducer.test.js` (in fondo al file, o dentro il describe root se presente).
4. **Verificare:**
   ```
   npm test -- --run
   ```
   Atteso: **148 passed** (prima era 120).
5. **Verifica browser:** `npm run dev`, apri DevTools su `/oggi`, console → `__pt.app.getState().impostazioni` dovrebbe restituire `{}` o il dict popolato da seed.
6. **Sostituire** `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.6** fornita.
7. **Aprire la nuova sessione** con il messaggio one-liner: `Continuiamo PharmaTimer. Esegui il prompt al §11 del Changelog (Sessione 7b).` (Il prompt esecutivo è già nel file KB.)

---

## 18. Stato post-Sessione 7b-1

Sessione 7b-1 completata il 19 aprile 2026. Output prodotto nel sandbox, consegnato via `present_files` per copia manuale nella working copy sul Mac. Validazione browser end-to-end eseguita in CP5 (7 punti checklist): 6 OK + 1 vacuously OK.

### File prodotti e modificati

Vedi tabella §12 (blocco 7b-1, 14 file). In sintesi:

- **File nuovi (8):** `src/state/selectors.test.js`, `src/services/audio.js` (rewrite da stub), `src/hooks/useAutoBeep.js`, `src/hooks/useAutoBeep.test.jsx`, `src/components/oggi/DevTimeSlider.jsx`, `src/components/oggi/DoseCard.jsx`, `src/components/oggi/DoseCard.test.jsx`, e rewrite del guscio di `src/components/oggi/OggiView.jsx` (era placeholder 5-campi).
- **File modificati (6):** `src/utils/theme.js` (rename §6.28), `src/utils/uiState.js` (+grouping §6.29), `src/utils/uiState.test.js` (+5 test), `src/state/selectors.js` (+selectCountersForDay §6.9 fix), `src/components/shared/NavBar.jsx` (rewrite token-aware), `src/App.jsx` (+ThemedShell §6.D).

### Scoperte durante implementazione

- **Export style di `Badge.jsx`.** Pre-check prudenziale a CP3: il file `src/components/shared/Badge.jsx` prodotto in 7a era `export function Badge(...)` (named export). Il mio import in DoseCard era già `import { Badge } from ...` — convergenza corretta al primo colpo.
- **Baseline 170/170 test files count = 11.** La discrepanza AMB-7b.Q (151 vs §17=148) era stata ereditata da 7a e si è azzerata con l'aggiunta delle 19 test del 7b-1 (target centrato esatto: 151+19=170). Il +3 residuo resta non tracciato ma non più materiale; silent-close definitivo.
- **`renderWithProvider` funziona per componenti che usano useTheme.** I test DoseCard.test.jsx passano `{ stateOverrides: { impostazioni: { tema: 'light' } } }` per forzare il tema light e garantire determinismo dei token. jsdom senza `matchMedia` non crasha grazie alla guard già presente in `useTheme.js` (7a).
- **matchMedia in jsdom 25.** Il hook `useTheme` ha `typeof window.matchMedia !== 'function'` come guard, quindi in `mode='auto'` su jsdom restituisce `dark=false` silenziosamente. Non serve mock dedicato nei test 7b-1.
- **Validazione visuale CP5** ha identificato due bug visivi gestibili in-sessione (§6.30 e §6.31) — documentati e hotfixati prima di chiudere la sessione. La checklist 7 punti ha scoperto entrambi entro i primi 4 check.

### Deviazioni aggiuntive

**§6.30 — Toggle tema a 3 icone distinte.** Hotfix CP5 punto 4. Vedi sezione 6.30.

**§6.31 — DoseCard `border` shorthand vs longhand.** Hotfix CP5 dev console. Vedi sezione 6.31.

### Scoperte minori non tracciate come deviazioni

- **`formatDateLabel` non gestisce "Ieri".** Attualmente produce prefisso `"Oggi · "` e `"Domani · "`, ma per giorni passati restituisce solo `"<weekday> <day month>"`. In CP5 Roberto ha confermato che il separatore del 18 apr mostra `"SABATO 18 APRILE"` senza prefisso ieri, il che è leggibile ma asimmetrico rispetto a Oggi/Domani. Fix stimato: 2-3 righe in `src/utils/uiState.js`. Non bloccante, raccolto per 7b-2 o 7d polish.
- **Counter "in ritardo" ha sfondo rosso-aranciato** (dark: `#6B2410` bg + `#FB923C` text). In CP5 percepito come "rosso" da Roberto; in realtà è il design token `inRitardoBg/Tx` (rename §6.28 da `scadutaBg/Tx`). Leggermente meno distinguibile dal badge rosso "saltati" rispetto al mockup v5 che usava palette più contrastate. Al momento coerente con Spec §5.3 ("Arancio"), nessun fix necessario.

### Test counts

```
baseline 151  → 170    (+19, target AMB-7b.P ±0)
  uiState     + 5  (grouping)
  selectors   + 6  (counters, nuovo file)
  useAutoBeep + 3
  DoseCard    + 5
  TOTAL       +19
```

File test: 8 → 11.

### Verifica browser (end-to-end, CP5)

7 punti checklist eseguita a 17:40 CET del 19 aprile 2026:

| # | Check | Esito |
|---|---|---|
| 1 | Render base (header + separatore data + Card) | ✅ |
| 2 | Counters header (4 badge visibili, valori coerenti con orario) | ✅ |
| 3 | Raggruppamento `ORE HH:MM — MOMENTO` uppercase | ✅ |
| 4 | Toggle tema ciclo 3 stati con icone distinte | ✅ dopo hotfix §6.30 |
| 5 | Slider modifica orologio + counters + stati Card | ✅ |
| 6 | Beep + flash su forward-crossing di una dose | ✅ |
| 7 | Badge `⚠ orario: domani` su cross-midnight | ✅ (vacuous, nessuna Card con la condizione) |

Stato runtime verificato:

- `state.status = 'ready'`
- `state.plan.length = 34` (11 farmaci filtrati per data_inizio/fine × 3 giorni)
- `state.profiloAttivo.nome_profilo = 'Standard'`
- `state.impostazioni = { nome_utente: '', schema_version: 1, seed_loaded: 1, tema: 'auto' }`
- `state.simulatedNow = null` (pre-drag)

### Limitazioni note (scope esplicito)

- **Counter `presi` resta a 0** in tutta la 7b-1: l'azione PRESA è scope 7b-2.
- **DoseCard interattive = assenti**: zero pulsanti (PRESA, ALTRO, UNDO, edit saltata/sospesa, tap gap). Le Card sono visivamente complete ma solo-lettura.
- **Badge `⚠ dose prec. saltata` inerte**: la DoseCard lo renderizza se `entry.dose_prec_saltata=true`, ma nessuna PRESA in 7b-1 può trigerarlo. Utile solo per scenari di plan pre-esistenti con log storici.
- **Badge `⚠ orario: domani` inerte**: idem, nessun ricalcolo avviene senza PRESA.
- **§6.32 (candidato)** — `formatDateLabel` senza "Ieri": non applicato, lasciato come nota per 7b-2 polish.

### Azioni sul Mac prima di Sessione 7b-2

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.8** fornita in questo delivery.
2. Nessuna modifica al codice richiesta: baseline attuale (**170 passed su 11 test files**) è il punto di partenza.
3. Aprire nuova conversazione con one-liner: `Continuiamo PharmaTimer. Esegui il prompt al §11 del Changelog (Sessione 7b-2).`

---

## 19. Stato post-Sessione 7b-2

Sessione 7b-2 completata il 19 aprile 2026. 5 file modificati nel sandbox, consegnati via `present_files` per copia manuale nella working copy sul Mac. Validazione browser end-to-end eseguita in CP4 (7 punti checklist): 6 OK + 1 skipped (punto 6 ricalcoli downstream deferito a 7c).

### File prodotti e modificati

Vedi tabella §12 (blocco 7b-2, 5 file). In sintesi, tutte modifiche incrementali (nessun file nuovo):

- `src/state/selectors.js` — append di `selectUltimaPresa` in coda
- `src/state/selectors.test.js` — import esteso + nuovo describe con 2 test
- `src/components/oggi/DoseCard.jsx` — 3 props opzionali aggiunte + blocco ACTION AREA (~80 righe) prima della chiusura flex container
- `src/components/oggi/DoseCard.test.jsx` — import esteso con `vi/fireEvent/within` + nuovo describe con 6 test interactive scoped
- `src/components/oggi/OggiView.jsx` — 4 punti modificati: import selector, `useMemo` ultimaPresa, wiring props DoseCard, injection keyframe pulse-border

### Scoperte durante implementazione

- **AMB-7b.Q silent-close a CP0.** Baseline 170/170 coerente con §18, nessun residuo non tracciato — la questione del +3 ereditato da 7a si è auto-risolta durante 7b-1 e non è più riemersa.
- **Auto-cleanup testing-library non registrato (§6.32).** Scoperta al CP2 quando i 6 test interactive con `screen.getByRole('button')` fallivano con multiple-elements. Fix tattico: scoping `within(container)` in tutti i nuovi test. Fix strategico (registrare `afterEach(cleanup)` in `src/test/setup.js`) deferito a 7c/7d.
- **Render-order del mockup v5 replicato con fedeltà femminile.** Il porting `isPreso → isPresa`, `scaduta → in_ritardo` è completo. Tutte le condizioni dell'ACTION AREA girano sui nuovi enum senza fallback silenziosi.
- **`<div>` non-button per stati saltata/sospesa.** Scelta deliberata (registrata come commento in DoseCard.jsx): in 7b-2 gli stati saltata e sospesa NON sono cliccabili (editing → scope 7c). Renderizzarli come `<button disabled>` avrebbe inquinato `getByRole('button')` nei test e introdotto affordance touch senza handler attaccato. In 7c diventeranno nuovamente `<button onClick={onSaltataTap}>` con modale attached.

### Deviazioni aggiuntive (scoperte in sessione)

**§6.32 — Auto-cleanup `@testing-library/react` non registrato.** Vedi sezione 6.32 (fix tattico applicato, strategico deferito).

**§6.33 — IconUndo overlay size=10 poco visibile.** Hotfix estetico proposto per 7d polish. Vedi sezione 6.33.

**§6.34 — Separatori di data multi-giorno poco visibili.** Scoperta in CP4 attraverso falso-bug (PRESA accidentale su ieri). Fix UX proposto per 7d polish. Vedi sezione 6.34.

**§6.35 — presoStack ephemeral su reload.** Comportamento voluto (§13/D11), solo documentato. Possibile UX warn candidato per 7d/8. Vedi sezione 6.35.

### Test counts

```
baseline 170  → 178    (+8, target AMB-7b-2.F ±0)
  selectors   + 2  (selectUltimaPresa: stack vuoto / 3 keys)
  DoseCard    + 6  (PRESA mount gate, non-done only, onPresa call,
                    check disabled, check enabled+onUndo, overlay gate)
  TOTAL       + 8
```

File test: 11 → 11 (nessun file nuovo, solo estensioni).

### Verifica browser (end-to-end, CP4)

7 punti checklist eseguita a 19:20-20:15 CET del 19 aprile 2026:

| # | Check | Esito |
|---|---|---|
| 1 | Click PRESA → Card verde + check ✓ + counter `1 presi` | ✅ (dopo falso-bug §6.34 intercettato e risolto) |
| 2 | Check dashed + pulse + IconUndo overlay | ✅ (con nota §6.33: overlay piccolo) |
| 3 | Click ✓ UNDO ripristina stato pending + counter torna | ✅ |
| 4 | PRESA su 2a Card: la 1a torna solid, la 2a prende dashed | ✅ |
| 5 | UNDO della 2a: 1a resta presa solid, counter corerente | ✅ |
| 6 | PRESA con gap > SOGLIA_PROMPT_RECUPERO propaga ricalcoli | ⏭ skipped (deferito a 7c quando modali gap saranno wired) |
| 7 | Regressioni 7b-1 (slider, toggle tema) | ✅ |

Stato runtime verificato durante CP4:

- `state.status = 'ready'`
- `state.presoStack` varia da 0 a 2 elementi durante i test
- `state.simulatedNow` usato in CP4 punto 1 (`'07:05'`, `'07:30'`)
- `state.plan.filter(e => e.stato === 'presa' && e.dateStr === today).length` coerente col counter header `N presi`
- Console: nessun warning React, nessun errore runtime

### Limitazioni note (scope esplicito, ereditate + nuove)

- **ALTRO button assente**: scope 7c. La Card non-done monta SOLO il pulsante PRESA.
- **Editing saltata/sospesa assente**: le Card saltata/sospesa mostrano un glyph non cliccabile.
- **Tap gap assente**: il badge gap è visivamente presente ma non interattivo.
- **Auto-prompt gap recovery assente**: scope 7c. Se un PRESA dovesse settare gap≥30 su N+1, il `state.prompt` viene popolato dal dominio ma OggiView 7b-2 non monta nessuna modale di recupero.
- **§6.35 — reload azzera UNDO window**: documentato, non risolto.
- **§6.32 — auto-cleanup test**: bypassato tatticamente con scoping, non risolto globalmente.
- **§6.33 — IconUndo overlay**: non fixato (scope 7d).
- **§6.34 — separatori data**: non fixato (scope 7d).

### Azioni sul Mac prima di Sessione 7c

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.9** fornita in questo delivery.
2. Copiare i 5 file 7b-2 dalla cartella di delivery alla working copy:
   - `src/state/selectors.js`
   - `src/state/selectors.test.js`
   - `src/components/oggi/DoseCard.jsx`
   - `src/components/oggi/DoseCard.test.jsx`
   - `src/components/oggi/OggiView.jsx`
3. Verificare baseline: `npm test -- --run` → atteso **178/178 test su 11 test files**.
4. Aprire nuova conversazione con one-liner: `Continuiamo PharmaTimer. Esegui il prompt al §11 del Changelog (Sessione 7c).`

## 20. Stato post-Sessione 7c-1

Sessione 7c-1 completata il 20 aprile 2026. 12 file touched (9 nuovi + 3 modificati), consegnati via mix di canali (`present_files` inline per CP1-CP2, `bash installer.sh` con base64 embedded per CP3-CP4 dopo fallimento download binari). Validazione browser end-to-end eseguita in CP6 con 7 punti checklist: **7/7 OK** (dopo workaround §6.35 per sbloccare Pantorc in presoStack vuoto al punto 1).

### File prodotti e modificati

**File NUOVI (9)**:

| File | Ruolo | Note |
|---|---|---|
| `src/components/oggi/modals/AltroModal.jsx` | Modale 3 azioni su Card pending | porting 1:1 v5 `AltroModal` (570-645) con rename femminili + AMB-7c-1.I cross-day hint |
| `src/components/oggi/modals/AltroModal.test.jsx` | 6 unit test | mount gate, 3 azioni, overlay+X close, cross-day hint |
| `src/components/oggi/modals/SaltataModal.jsx` | Modale 3 azioni su Card saltata | porting `SaltataCorrectModal` v5 (737-800); Q1 risolta (mantenuto "Confermo saltata") |
| `src/components/oggi/modals/SaltataModal.test.jsx` | 5 unit test | mount gate, 3 azioni (confermo/cambia sospesa/timepick), close |
| `src/components/oggi/modals/SospesaModal.jsx` | Modale 1 azione su Card sospesa | porting `SospesaCorrectModal` v5 (803-832); Q2 risolta (§6.37 "Cambia in saltata" omessa) |
| `src/components/oggi/modals/SospesaModal.test.jsx` | 3 unit test | mount gate, ripristina, close |
| `src/components/oggi/modals/RecuperoModal.jsx` | Slider recupero gap | porting `RitardoModal` v5 (648-734); Q3 risolta (bottone Ripristina via `onReset` → `actions.recupero(key, 0)`) |
| `src/components/oggi/modals/RecuperoModal.test.jsx` | 6 unit test | mount, slider update, apply, disabled at rec=0, Ripristina conditional, close |
| `src/components/oggi/modals/_crossDayHint.js` | Helper puro AMB-7c-1.I | usato da AltroModal + SaltataModal (solo i 2 con time picker) |

**File MODIFICATI (3)**:

| File | Δ | Note |
|---|---|---|
| `src/test/setup.js` | +16 righe | AMB-7c-1.H: `afterEach(cleanup)` globale di @testing-library/react. Chiude §6.32 strategicamente |
| `src/state/selectors.js` | +22 righe | AMB-7c-1.J: `selectEntryByKey(state, entryKey)` pure, preparatorio 7c-2 |
| `src/state/selectors.test.js` | +22 righe | +1 test per `selectEntryByKey` (hit/miss/empty/falsy) |
| `src/components/oggi/DoseCard.jsx` | +~100 righe | AMB-7c-1.L: 4 prop opzionali `onAltro`/`onSaltataTap`/`onSospesaTap`/`onGapTap` + 4 affordance tap (ALTRO pill, SALTATA label button, SOSPESA label button, gap badge → TapBadge). Fallback non-interattivo quando handler assente (compatibilità 7b-1/7b-2) |
| `src/components/oggi/DoseCard.test.jsx` | +~80 righe | +4 test interactive 7c-1 (ALTRO tap, gap tap, saltata tap, sospesa tap). Estensione a 15 test totali |
| `src/components/oggi/OggiView.jsx` | +~60 righe | AMB-7c-1.K: 4 stati locali `{altroModal, saltataModal, sospesaModal, recuperoModal}` + handlers `on*Tap` passati a DoseCard + mount 4 modali con wiring thunks. NO useEffect su state.prompt (scope 7c-2) |

**File RIMOSSI via `git rm` (§6.38)**:
- `src/components/oggi/modals/RitardoModal.jsx` (stub scaffolding, naming v5 obsoleto)
- `src/components/oggi/modals/SaltataCorrectModal.jsx` (idem)
- `src/components/oggi/modals/SospesaCorrectModal.jsx` (idem)

**File NON toccati in 7c-1**:
- `src/components/oggi/modals/UndoModal.jsx` (stub vuoto mantenuto, candidato §6.41 per 7d)
- `src/components/oggi/{Card, Header}.jsx` (stub non importati, candidato bonifica in sessione ordinaria futura)
- Tutti i file `src/domain/**`, `src/state/{actions, reducer, AppContext, applyHelper}.*`, `src/hooks/**`, `src/utils/**` (invariati, regola 7c-1 rispettata)

### Scoperte durante implementazione

- **AMB-7c-1.M no-op confermato al CP0.** Lettura di `applyAssunzione` in `recalc.js:300+` conferma nessuna guardia su `target.stato`. "Correggi a presa" funziona out-of-the-box. §6.36 documentato ma non consumato, target test rivisto da 202 a 200 floor, chiuso a 203.
- **§6.32 fix strategico al CP1.** Baseline 178/178 confermata dopo registrazione di `afterEach(cleanup)` in setup.js: nessun test 7b-2 rotto dal cleanup aggiunto (i test usavano già `within(container)` come workaround — ora superfluo ma lasciato in loco per leggibilità).
- **§6.39 scoperta al CP3.** 1/24 test CP3 falliva con errore `useAppContext: AppProvider is missing`: `rerender` di testing-library non rimonta il wrapper Provider. Fix tattico: `unmount() + nuova render`. Fix strategico candidato a 7d (opzione `wrapper` in `renderWithProvider`).
- **Canale delivery via shell script consolidato al CP3.** Download diretti di `.tgz` via `present_files` bloccati o corrotti. Pattern adottato: file `.sh` con `base64 -D <<EOF` + tar embedded, validazione gzip prima dell'estrazione, `tar xzf` + `ls` + `npm test` in un unico comando. Funziona su macOS nativamente (`base64 -D` presente). Pattern riusabile in sessioni future.

### Deviazioni aggiuntive (scoperte in sessione)

**7 nuove deviazioni §6.40-§6.47** documentate dettagliatamente nel capitolo §6:
- **§6.40** — carica presoStack da log all'init (deriva §6.35, scope 7c-2 o 7d)
- **§6.41** — tap su Card presa → UndoModal (deriva §6.35, scope 7d)
- **§6.42** — FALSO POSITIVO, scartato
- **§6.43** — ritardo programmato (posticipo), scope post-7d con spec v1.3
- **§6.44** — sticky date separator, scope 7d
- **§6.45** — feedback ritardo/anticipo troppo loquace, scope 7d
- **§6.46** — contrasto testi grigi dark, scope 7d
- **§6.47** — badge gap non considera recupero_minuti + affordance debole, scope 7d

**4 deviazioni §6.36-§6.39 consumate o documentate**:
- **§6.36** — applyAssunzione no-op guard (non consumato)
- **§6.37** — SospesaModal omette "Cambia in saltata"
- **§6.38** — bonifica 3 stub consumata CP5
- **§6.39** — renderWithProvider + rerender incompatibili, fix tattico applicato

### Test counts

```
baseline 178  → 203  (+25, target AMB-7c-1.N 178→202±3 boundary superiore)
  setup.js           + 0  (fix strategico §6.32, zero test aggiunti)
  selectors          + 1  (selectEntryByKey AMB-7c-1.J)
  AltroModal         + 6  (mount gate / 3 azioni / overlay+close / cross-day hint)
  SaltataModal       + 5  (mount gate / 3 azioni / close + cross-day)
  SospesaModal       + 3  (mount gate / ripristina / close)
  RecuperoModal      + 6  (mount / slider / apply / disabled / Ripristina cond / close)
  DoseCard           + 4  (ALTRO tap / gap tap / saltata label tap / sospesa label tap)
  TOTAL              +25
```

File test: 11 → **15** (+4: i nuovi .test.jsx delle 4 modali).

### Verifica browser (end-to-end, CP6)

7 punti checklist eseguiti il 20 aprile 2026 dopo avvio `npm run dev`:

| # | Check | Esito | Note |
|---|---|---|---|
| 1 | Regressioni 7b-2 + UNDO diretto Card di oggi | ✅ | Dopo workaround §6.35 su Pantorc (presoStack vuoto causa reload). UNDO su Card pulita del 20/04 funziona come 7b-2. |
| 2 | AltroModal: apertura + 3 azioni + close pattern | ✅ | 3 bottoni visibili (Saltata/Sospesa/L'ho presa), overlay+X chiudono |
| 3 | AltroModal timepick + cross-day hint | ✅ | Hint "Ieri — DD/MM" mostrato correttamente su Card del 19/04 nel timepick submode, assente per Card del 20/04 |
| 4 | SaltataModal via tap SALTATA label | ✅ | "Confermo saltata", "Cambia in sospesa", "L'ho presa alle..." tutti funzionanti |
| 5 | SospesaModal via tap SOSPESA label | ✅ | 1 sola opzione "Ripristina come da prendere" (§6.37) |
| 6 | RecuperoModal via tap badge gap | ✅ | Flusso completo: slider update → apply → Card ricalcolata → re-open + Ripristina conditional → reset |
| 7 | Close pattern consistente (4 modali) | ✅ | Overlay + X header chiudono tutte le 4 modali senza dispatch |

Stato runtime verificato durante CP6:

- `state.status = 'ready'` stabile
- `state.plan.length = 39` (11 farmaci × ~3-4 giorni rolling window). Post-CP6 punto 6 modifica: 29 entries (Prontinal attivo 2026-04-20 a 2026-04-25)
- `state.simulatedNow` usato per generare ritardi controllati (13:30 per 1ª dose Prontinal alle 12:30 → ritardo 1h propagato a 2ª dose)
- `state.presoStack` osservato variare 0 → 1 → 0 durante tap PRESA/UNDO sequenziali
- Console: nessun warning React, nessun errore runtime (dopo workaround §6.35)

### Limitazioni note (scope esplicito, ereditate + nuove)

**Ereditate 7b-2**:
- `presoStack` ephemeral su reload (§6.35) — scoperta formalizzata CP6 §6.40
- IconUndo overlay size=10 (§6.33) — non fixato (7d)
- Separatori di data poco visibili (§6.34) — non fixato (7d)
- §6.26 cross-midnight warning — non evolto (7d o 9)

**Nuove 7c-1**:
- Auto-prompt gap recovery non attivo (scope esplicito 7c-2): il dominio popola `state.prompt` ma OggiView non ha useEffect che lo consuma
- UndoModal non implementata (scope esplicito 7c-1, candidato 7d via §6.41)
- a11y delle modali minimale: role="dialog" + aria-label presenti, ma focus trap / Escape-to-close / restore focus assenti (scope 7d)
- §6.39 fix tattico: `renderWithProvider` + `rerender` non funziona, pattern `unmount + nuova render` obbligatorio nei test fino a 7d
- §6.40/§6.41 (UX UNDO post-reload): non affrontate in 7c-1, workaround DevTools documentato
- §6.43-§6.47: candidati polish/feature per 7d o post-7d

### Azioni sul Mac prima di Sessione 7c-2

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.11** fornita in questo delivery.
2. Copiare (se non già fatto in sessione) i file 7c-1 dalla working copy:
   - NUOVI: 9 file in `src/components/oggi/modals/` (4 modali + 4 test + `_crossDayHint.js`)
   - MODIFICATI: `src/test/setup.js`, `src/state/selectors.js`, `src/state/selectors.test.js`, `src/components/oggi/DoseCard.jsx`, `src/components/oggi/DoseCard.test.jsx`, `src/components/oggi/OggiView.jsx`
   - RIMOSSI: 3 stub in `src/components/oggi/modals/` (`RitardoModal.jsx`, `SaltataCorrectModal.jsx`, `SospesaCorrectModal.jsx`)
3. Verificare baseline: `npm test -- --run` → atteso **203/203 test su 15 test files**.
4. Aprire nuova conversazione con one-liner: `Continuiamo PharmaTimer. Esegui il prompt al §11 del Changelog (Sessione 7c-2).`

---

## 21. Stato post-Sessione 7c-2

Sessione 7c-2 completata il 20 aprile 2026. 5 file touched (3 modificati + 2 nuovi), consegnati via `present_files` individuali. CP1→CP5 clean, CP browser 6/6 (con #6 vacuously OK per race theory-only non simulabile in UI reale, coperta da test #7 automatico).

### File prodotti e modificati

Vedi tabella §12 (blocco 7c-2, 5 file).

### Test counts

```
baseline 203  → 215    (+12, target AMB-7c-2.I esatto ±0)
  selectors.test.js  +2  (selectPromptEntry: null paths + hydration hit/miss)
  OggiView.test.jsx  +10 (integration E2E, scenari 1-10)
  TOTAL              +12
```

File test: 15 → **16**.

### Verifica browser (end-to-end, CP)

6 punti checklist eseguiti il 20 aprile 2026 dopo `npm run dev`, su DB reale con farmaci `tipo_frequenza='intervallo'` (Olevia 1000mg, intervallo 12h / minimo 6h):

| # | Check | Esito | Note |
|---|---|---|---|
| 1 | Auto-open senza tap utente (presa late → RecuperoModal da sola) | ✅ | Trigger: setSimulatedNow('10:45') + tap PRESA su Olevia dose 1 (07:30) → RecuperoModal aperta con farmaco, ritardo 3h 15m, slider 0-195 min, primary "Seleziona tempo" disabled |
| 2 | Auto suspended con AltroModal aperto | ✅ | AltroModal aperta → `actions.presa` via Console (bypass UI coperta) → `state.prompt` popolato, RecuperoModal assente. Sub-scenario aggiunto: chiusura AltroModal → auto-open naturale della RecuperoModal (coerenza useEffect deps) |
| 3 | Apply Anticipa → prompt dismisso + no re-pop | ✅ | Slider a 30 min via fireEvent-like dispatch (React controlled input). Click "Anticipa di 30 min" → RecuperoModal chiusa, `state.prompt: null`, plan.ora_ricalcolata shifted 22:45→22:15, `recupero_minuti: 30`, `ora_ricalcolata_originale: '22:45'` invariato, `gap_minuti: 195` invariato. DoseCard mostra "22:15 / 20:30 / +1h 45m / ritardo 3h 15m" |
| 4 | Ripristina → prompt dismisso + no re-pop | ✅ | Dopo scenario 3 (`recupero_minuti: 30`), re-apertura RecuperoModal via tap gap badge → 3 buttons visibili (incluso "Ripristina", condizionale su hasExisting). Click Ripristina → modal chiusa, `recupero_minuti: 0`, `ora_ricalcolata: '22:45'` reset a originale, stato resta `ricalcolata` (il gap persiste), no re-pop |
| 5 | Close button/overlay → prompt dismisso + no re-pop | ✅ | Verificato DUE volte: (a) tap X con dismiss-auto-branch; (b) overlay click (scoperto fortuitamente durante scenario 3) stesso onClose path. Entrambi dismissPrompt idempotenti, no-op se prompt già null |
| 6 | Race manual same-entry | (vacuously OK) | Non simulabile in UI reale: overlay del modal auto-aperto copre la DoseCard sottostante, il tap sul gap badge non raggiunge l'elemento in modalità mouse normale. Pattern di conversione auto→manual via tap-sotto è theory-only. Comportamento già coperto dal test automatico #7 di `OggiView.test.jsx` (race sintetizzata via `fireEvent.click` bypassando overlay) |

Stato runtime verificato durante CP:

- `state.status = 'ready'` stabile per tutta la sessione
- `state.plan` coerente: dose 1 Olevia presa/unde diverse volte senza corruption
- `simulatedNow = '10:45'` mantenuto (non resettato da rollover/tick)
- Console: nessun warning React, nessun errore runtime
- `presoStack` funzionale per UNDO (consistency §6.35 ephemeral)

### Lezione registrata: bug seed 'fisso' durante CP4

Il DEFAULT_SEED in v1 di `renderWithRealProvider.jsx` aveva `tipo_frequenza: 'fisso'` + `intervallo_ore: null`. Il cascade+prompt in `recalc.js:348` è gated su `'intervallo' && intervallo_ore != null`; con 'fisso' il branch è skippato → `state.prompt` mai emesso → 8/10 test di CP4 falliti al primo run con `TypeError: Cannot read properties of null (reading 'entryKey')`.

Fix: 2 campi su 2 file (DEFAULT_SEED in rWRP.jsx + SEED_TWO_FARMACI.farmaci[1] in OggiView.test.jsx). Zero logic change, applicato in ~5 minuti dopo ispezione del branch condizionale.

**Principio operativo per future sessioni di test authoring**: *quando un helper test deve attivare un branch condizionato del dominio, ispezionare il branch PRIMA di comporre il seed — non dopo*. Il costo di 10 secondi di `sed -n` su `recalc.js` avrebbe risparmiato 1 round di iterazione. Pattern replicabile ogni volta che si cerca di sintetizzare scenari E2E su dominio con discriminanti di tipo.

### Limitazioni note (ereditate + nuove)

**Ereditate da 7c-1 (non affrontate in 7c-2, scope 7d)**:
- `presoStack` ephemeral su reload (§6.35 / §6.40)
- IconUndo overlay size=10 (§6.33)
- Separatori di data poco visibili (§6.34)
- `renderWithProvider + rerender` pattern fragile (§6.39)
- UndoModal non implementata (§6.41)
- §6.44/§6.45/§6.46/§6.47 candidati scoperti in CP6 7c-1

**Nuove 7c-2**:
- **§6.48 ephemeral prompt behaviour** (documentata, accettata come trade-off): ogni `commitApplyResult` sovrascrive `state.prompt`. Se utente ha prompt pendente su entry B e poi corregge entry C, il commit di C azzera il prompt senza che B venga mai auto-prompted. Fallback manuale via tap gap badge resta affidabile. Eventuale retrofit sticky → scope post-7d
- **§6.49 AppProvider.initialStateProp rimandato**: integration test 7c-2 usano il chain E2E completo (presa+simulatedNow) per sintetizzare state.prompt invece del seed diretto. Retrofit → 7d
- **DoseCard accessibilità gap badge**: il button non ha `aria-label` (usa solo accessible-name fallback sul testo "ritardo Xh Ym"). I test usano `getByRole('button', {name: /ritardo/i})` che matcha via name fallback, ma querySelector su aria-label fallisce. Non è un bug — solo una nota per chi scrive scripting DOM nei CP browser futuri
- **a11y delle 4 modali minimale**: role="dialog" + aria-label presenti, ma focus trap / Escape-to-close / restore focus assenti → scope 7d

### Azioni sul Mac prima di Sessione 7d

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.13** fornita in questo delivery.
2. Verificare che i 5 file 7c-2 siano nella working copy:
   - NUOVI: `src/test/renderWithRealProvider.jsx`, `src/components/oggi/OggiView.test.jsx`
   - MODIFICATI: `src/state/selectors.js`, `src/state/selectors.test.js`, `src/components/oggi/OggiView.jsx`
3. Verificare baseline: `npm test -- --run` → atteso **215/215 test su 16 test files**.
4. Commit del lavoro 7c-2. Messaggio suggerito:
   ```
   7c-2: auto-prompt gap recovery end-to-end

   + selectPromptEntry selector (composition of selectEntryByKey) + 2 tests
   + OggiView useEffect auto-prompt + recuperoModal shape {entry,source}
   + closeRecupero branching AMB-7c-2.E/F (auto→dismiss;
     manual-same-key→dismiss; manual-other-key→preserve)
   + test helper renderWithRealProvider (AppProvider real + Proxy
     mock boundary for repo singleton)
   + OggiView.test.jsx 10 integration tests (E2E, AppProvider real)

   Tests: 203 -> 215 (+12, target AMB-7c-2.I exact).
   CP browser: 6/6 (with #6 vacuously OK, race theory-only).
   ```
5. Aprire nuova conversazione con one-liner: `Continuiamo PharmaTimer. Esegui il prompt al §11 del Changelog (Sessione 7d).`

---

## 22. Stato post-Sessione 7d-1

Sessione 7d-1 completata il 21 aprile 2026. **17 file touched** (3 nuovi + 14 modificati). CP1→CP5 clean, CP browser **6/6** (con 8 deviazioni aggiuntive scoperte durante i CP, tutte §6.50-§6.57 documentate).

### File prodotti e modificati

Vedi tabella §12 (blocco 7d-1, 17 righe).

Classificazione sintetica:
- **NUOVI (3):** `src/hooks/useModalA11y.js`, `src/hooks/useModalA11y.test.jsx`, `src/test/renderHelpers.test.jsx`
- **MODIFICATI (14):** 4 modali × 2 (jsx + test) = 8, `DoseCard.jsx` + `DoseCard.test.jsx`, `OggiView.jsx`, `renderHelpers.jsx`, `theme.js`, `Icons.jsx`, `package.json` + `package-lock.json` (dep install)

### Test counts

```
baseline 215 → 228 (+13, target AMB-7d-1.K 228±2 esatto)
  useModalA11y.test.jsx         +4  (mount / Escape / restore manuale / fallback)
  AltroModal.test.jsx           +2  (focus iniziale / Escape)
  SaltataModal.test.jsx         +2  (focus iniziale / Escape)
  SospesaModal.test.jsx         +2  (focus iniziale / Escape)
  RecuperoModal.test.jsx        +2  (focus iniziale / Escape)
  renderHelpers.test.jsx        +1  (rerender con useAppContext)
  DoseCard.test.jsx             ±0  (4 test 7c-1 aggiornati alla nuova firma (entry, triggerEl), totale 15 invariato)
  TOTAL                         +13
```

File test: 16 → **18** (+2: `useModalA11y.test.jsx`, `renderHelpers.test.jsx`).

### Verifica browser (end-to-end, CP)

6 punti checklist eseguiti il 21 aprile 2026 dopo `npm run dev`, su DB reale con stato piano rolling (Olevia/Prontinal/Pantorc/Ezevast/Lyrica/etc., 12 entries oggi):

| # | Check | Esito | Note |
|---|---|---|---|
| 1 | AltroModal a11y | ✅ | Focus iniziale su X close (verificato via `document.activeElement`), Tab cicla 4 bottoni (3 azioni + X), Escape chiude, focus restore su pill ALTRO. Ring non visibile al primo run → fix §6.52 (regola CSS `:focus-visible` globale) |
| 2 | SaltataModal a11y | ✅ | Stesso pattern. Label SALTATA nel time column è `<button>` tappabile (7c-1), ring visibile dopo Tab |
| 3 | SospesaModal a11y | ✅ | 1 bottone (Ripristina) + X close. Trap minimo ma funzionale |
| 4 | RecuperoModal a11y manuale | ✅ | Tap su badge gap Olevia dose 2 (gap 195 min pre-esistente). Ring dash TapBadge "poco visibile" → fix §6.53 (`border={t.gapTx}`). Restore focus OK sul badge gap |
| 5 | RecuperoModal auto-prompt | ✅ | `annullaUltima()` + PRESA Olevia dose 1 con `simulatedNow='11:00'` → `state.prompt={kind:'gap_recovery', entryKey:'2026-04-21-4-2'}` → RecuperoModal auto-aperta. Escape → `document.activeElement.tagName = 'BODY'` (bug!) → fix §6.54 (`tabIndex={-1}` su DoseCard root div). Re-test: `'DIV \| 2026-04-21-4-2'` ✅ |
| 6 | Visual polish | ✅ | IconUndo 10→14→18 giudicata insufficiente a ogni size → decisione rimozione (§6.55/§6.33 closed). Date separator `top-16` nascosto sotto header alto 179px → fix `top-[180px]` (§6.57). Sticky funziona (misurato `sepTop=64` pinned poi `parentBottom<0` quando esce dal giorno, correctness CSS confermata) |

### Scoperte durante CP browser (deviazioni §6.50-§6.57)

7 deviazioni nuove emerse durante implementazione e CP browser, 1 durante CP2 fix:

- **§6.50** — `useModalA11y` firma estesa con `fallbackEntryKey` (CP1, AMB-7d-1.C chiarimento)
- **§6.51** — `DoseCard.test.jsx` modificato fuori scope prompt CP3
- **§6.52** — `:focus-visible` globale anziché scoped (CP browser 1+4)
- **§6.53** — TapBadge gap `border={t.gapTx}` (CP browser 4)
- **§6.54** — DoseCard root `tabIndex={-1}` per focus programmatico (CP browser 5)
- **§6.55** — §6.33 chiuso per RIMOZIONE IconUndo anziché resize (CP browser 6)
- **§6.56** — `allowOutsideClick: true` in focus-trap config (CP2 fix)
- **§6.57** — Date separator layout pill invece di line/label/line (CP4)

### Lezioni registrate

**Overlay affordance e resize iteration.** IconUndo a size 10, 14, 18 sempre giudicata insufficiente: l'evidenza sperimentale mostrava che il *tipo* di affordance (overlay in angolo) era il problema, non la dimensione. Principio operativo: **dopo 2 iterazioni consecutive sullo stesso asse che non risolvono, cambiare asse**. Applicato a §6.33 con scelta di rimozione.

**Browser defaults vs test assumptions.** CP2 ha rivelato che `focus-trap` ha `allowOutsideClick: false` di default. Le suite unit test precedenti passavano perché i test usavano `fireEvent.click` diretto sul overlay, che bypassa il capture phase del trap. In UI reale invece il click viene intercettato. Lezione: **test jsdom + fireEvent non garantiscono equivalenza con comportamento browser reale** per elementi con focus capture. CP browser resta insostituibile.

**Focus programmatico su elementi non-focusable.** `.focus()` su `<div>` senza tabindex è silently ignored, non emette errore né warning. Il `document.activeElement` mostra invariato, rendendo il bug difficile da identificare via test automatico. Lezione: **un test "restore focus funziona" richiede verificare che l'elemento target sia realmente focusable** (rect tabbable check) oltre che raggiungibile via query DOM.

**Positioning CSS sticky dinamico.** `top-16` (64px) era stima AMB. L'header app in DEV ha altezza 179px (title + counters potenzialmente wrap + DEV slider). In produzione senza DEV slider sarà ~120-130px. Un valore statico non può coprire entrambi i contesti. Lezione: **valori dipendenti da altezze variabili richiedono misurazione dinamica** (ref + ResizeObserver) oppure accettazione del compromesso. Scelto compromesso per 7d-1 scope; retrofit misurazione candidata 7d-2.

### Limitazioni note (ereditate + nuove)

**Ereditate da 7c-2 (non affrontate in 7d-1, scope 7d-2):**
- §6.45 feedback "in orario" sotto tolleranza
- §6.46 contrasto WCAG dark (importante dopo §6.52 ring globale)
- §6.47 badge gap residuo + affordance (interagisce con §6.53 nuovo border)
- §6.48 ephemeral prompt behaviour (accettata trade-off)
- §6.49 `AppProvider.initialStateProp` retrofit
- §6.40 `presoStack` init da log
- §6.41 UndoModal + thunk `annullaAssunzione`

**Nuove 7d-1:**
- **Date separator top `[180px]` statico**: in produzione senza DEV slider risulterà in gap tra header (più corto) e separator. Candidato fix 7d-2 con misurazione dinamica (§6.46/6.57 interazione)
- **`:focus-visible` globale con outline blu fisso**: il blu `#3B82F6` funziona bene su background dark e light, ma non testato contro contrasto WCAG formale (§6.46 7d-2)
- **TapBadge gap border change non rispecchiato nello stato Badge non-tap**: il fallback `Badge` (senza `hasGapTap`) mantiene `gapBd` — inconsistenza minima ma esistente. Accettabile finché i due sono visivamente differenziati (uno tratteggiato interattivo, l'altro solido statico)
- **IconUndo export mantenuto in `Icons.jsx`**: consumato da `SospesaModal` bottone Ripristina, quindi non rimuovibile. Il consumer DoseCard è stato rimosso, ma il simbolo resta esportato

### Azioni sul Mac prima di Sessione 7d-2

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.15** fornita in questo delivery.
2. Verificare che i 17 file 7d-1 siano nella working copy (vedi §12 per l'elenco completo).
3. Verificare baseline: `npm test -- --run` → atteso **228/228 test su 18 test files**.
4. Commit del lavoro 7d-1. Messaggio suggerito:
   ```
   7d-1: a11y 4 modali + test infra + polish visivo

   + hook useModalA11y (focus trap + Escape + restore chain) + 4 tests
   + 4 modali: a11y smoke tests (+8), hook integration, modalProps spread
   + :focus-visible globale (AMB-7d-1.J estesa, §6.52)
   + IconUndo overlay rimossa (§6.33 closed via removal, §6.55)
   + Date separator sticky pill + IconCalendar + dateSepBgStrong (§6.57)
   + renderHelpers wrapper refactor (§6.39 closed) + rerender test
   + DoseCard data-entry-key + tabIndex={-1} per focus restore (§6.54)
   + TapBadge gap border gapTx per contrasto dash (§6.53)

   Tests: 215 -> 228 (+13, target AMB-7d-1.K esatto).
   CP browser: 6/6. 8 nuove deviazioni §6.50-§6.57.
   ```
5. Aprire **sessione dedicata di analisi 7d-2** (non implementativa) per ratificare D8-D14 contro stato reale post-7d-1.

---

## 22.1 Stato post-Sessione 7d-2 parte 1/2

**Data:** 21 aprile 2026
**Baseline pre-sessione:** 228/228 su 18 test files (post 7d-1)
**Baseline post-sessione:** 235/235 su 21 test files (+7 test, +3 file)
**Target cumulativo sessione 7d-2 finale:** 246 ±2 (da consegnare in parte 2/2, +11 residui)

### Esiti CP

| CP | Scope | Delta test | Esito |
|---|---|---|---|
| **CP0** | Sanity check 14 punti → 4 rettifiche refusi prompt (D-R1/D-R2/D-R3 + round 2 diagnostic) | — | ✅ Clean dopo rettifiche |
| **CP1** | Repo `getLogByDataStato` + test | +2 (vs target +1, entro tolleranza AMB-K) | ✅ 230/230 |
| **CP2** | `AppProvider` dual-mode + nuova case reducer `INIT_FROM_SEED` + 2 test | +2 (esatto) | ✅ 232/232 |
| **CP3** | `actions.init()` popola `presoStack` + nuova case reducer `SET_PRESO_STACK` + 3 test | +3 (esatto) | ✅ 235/235 (post hotfix §6.60) |
| **Hotfix §6.60** | `renderWithRealProvider.jsx:makeFakeRepo` +metodo `getLogByDataStato` | 0 (ripristino 10 fail) | ✅ 10 OggiView tests restored |

### File prodotti in 7d-2p1

3 nuovi + 5 modificati (8 totali, contando `reducer.js` per 1 tocco pur avendo 2 case aggiunte):

| Path | Stato |
|---|---|
| `src/data/repository/IRepository.js` | mod. (+1 typedef) |
| `src/data/repository/LocalRepository.js` | mod. (+1 metodo, ~20 righe) |
| `src/data/repository/LocalRepository.test.js` | **NUOVO** (env node, 2 test) |
| `src/state/AppContext.jsx` | mod. (dual-mode boot, DEV warn) |
| `src/state/AppContext.test.jsx` | **NUOVO** (env jsdom, 2 test) |
| `src/state/reducer.js` | mod. (+2 case: `INIT_FROM_SEED`, `SET_PRESO_STACK`) |
| `src/state/actions.js` | mod. (helper `logRowToEntryKey` + fetch log presa + dispatch `SET_PRESO_STACK`) |
| `src/state/actions.init.test.js` | **NUOVO** (env node, 3 test) |
| `src/test/renderWithRealProvider.jsx` | mod. hotfix (+1 metodo `makeFakeRepo`, §6.60) |

### Consuntivo test

```
baseline 228 → 235 (+7, target parziale parte 1/2 centrato)
  LocalRepository.test.js       +2  (ordering/filter + empty)
  AppContext.test.jsx           +2  (no repo-calls when seeded + shallow spread preservation)
  actions.init.test.js          +3  (empty / LIFO ordering / day isolation)
  TOTAL                         +7
```

File test: 18 → **21** (+3).

### Scoperte durante CP0 (round 2 diagnostic, 4 rettifiche)

- **D-R1 path** — `constants.js` reale in `src/domain/constants.js` (non `src/utils/` come sanity point 13 implicava). Zero impatto runtime
- **D-R2 naming** — `getLogsByDataStato` (plurale in AMB-7d-2.C v2.5.16) ridefinito `getLogByDataStato` (singolare, coerente con famiglia `getLogByData`/`getLogByRange`/`getLogByFarmacoData`). Zero impatto semantico
- **D-R3 conflitto nome** — dominio `annullaAssunzione` (recalc.js:473) vs thunk richiesto AMB-7d-2.F con stesso nome. Scelta Opzione 1: rinomina dominio → `applyAnnullaAssunzione` (§6.58, applicata in parte 2/2)
- **D-R4 stub UndoModal** — `UndoModal.jsx` presente nell'Initial commit come stub 1-riga (§6.59), da riscrivere in CP5 parte 2/2 invece di creare nuovo

### Scoperta durante CP3 (hotfix in-session §6.60)

Esteso `IRepository` in CP1 ma `makeFakeRepo` in `renderWithRealProvider.jsx` (test helper consumato da 10 OggiView E2E tests) non è stato aggiornato. Al run di CP3 → 10 fail `repo.getLogByDataStato is not a function`. Fix: aggiunto metodo al fake repo con stessa semantica (filter + sort ASC nulls-last). Lezione procedurale §6.60: sanity check dei prompt §11 futuri deve verificare copertura fake repo quando AMB introduce nuovi metodi `IRepository`.

### Deviazioni §6 candidate in parte 1/2 (da applicare in parte 2/2 o procedurali)

- **§6.58** — rename dominio `annullaAssunzione` → `applyAnnullaAssunzione`. Non applicata in parte 1/2, CP4 parte 2/2 la esegue
- **§6.59** — stub `UndoModal.jsx` 1-riga non rimosso in §6.38. Riscrittura in CP5 parte 2/2
- **§6.60** — procedurale: sanity check copertura fake repo. Hotfix applicato in-session, lezione per prompt futuri

### Limitazioni note (parte 1/2, da risolvere in parte 2/2)

- **UndoModal stub presente ma inutilizzato** — nessun import consumer esistente in codebase, ma il file `UndoModal.jsx` è committato. CP5 parte 2/2 lo riscriverà (§6.59)
- **Entry key derivation non centralizzata** — helper `logRowToEntryKey` in `actions.js` replica la formula canonica `${data}-${farmaco_id}-${dose_numero}` (originale in `planBuilder.js`, riferimento test in `recalc.test.js:61`). Se emergono altri call-site post-7d-2, promuovere a `makeEntryKey` nel dominio. Candidato refactor post-sessione, non in scope 7d-2
- **§6.58 applicato solo in parte 2/2** — l'attuale `actions.js:12` importa ancora `annullaAssunzione` da `recalc.js`; il nuovo thunk CP4 non può avere lo stesso nome fino al rename dominio
- **Baseline git branch `sessione-5b`** — il commit della parte 1/2 è stato applicato su branch feature ereditato da 5b. Considerare rename del branch o merge verso `main` a chiusura 7d-2 completa

### Azioni sul Mac prima di Sessione 7d-2 parte 2/2

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.17** di questo delivery
2. Verificare che la working copy corrisponda al commit `Sessione 7d-2 parte 1/2: CP1–CP3 (repo getLogByDataStato, Provider dual-mode, presoStack rehydration)` (28 file changed, 1273 insertions, 140 deletions)
3. Verificare baseline: `npm test -- --run` → atteso **235/235 su 21 test files**
4. Aprire sessione implementativa 7d-2p2 con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 7d-2 parte 2/2 esecutiva).`

---

## 22.2 Stato post-Sessione 7d-2 parte 2/2

**Data:** 21 aprile 2026
**Baseline pre-sessione:** 235/235 su 21 test files (post p1)
**Baseline post-sessione:** 245/245 su 23 test files (+10 test, +2 file)
**Target cumulativo sessione 7d-2 finale:** 247 ±2 (da consegnare in parte 3/3, +2 residui in CP6)

### Esiti sub-step

| Sub-step | Scope | Delta test | Esito |
|---|---|---|---|
| **CP4a** | Rename `annullaAssunzione` → `applyAnnullaAssunzione` atomico (3 file) | 0 | ✅ 235/235 invariato |
| **CP4b** | Guard §6.61 + thunk `annullaAssunzione` + action `REMOVE_PRESO_KEY` §6.62 + 5 test | +5 | ✅ 240/240 (22 file) |
| **CP5a** | `applyHelper.js` +code DomainError path §6.63 + aggiorna test CP4 | 0 | ✅ 240/240 invariato |
| **CP5b** | `UndoModal.jsx` riscrittura §6.59 + `UndoModal.test.jsx` NUOVO | +4 | ✅ 244/244 (23 file) |
| **CP5c** | `DoseCard.jsx` refactor 3 const + wrapper + `DoseCard.test.jsx` +1 test | +1 | ✅ 245/245 |
| **CP5d** | `OggiView.jsx` wiring UndoModal (7 patch) | 0 | ✅ 245/245 invariato |

### File prodotti in 7d-2p2

10 modificati + 3 nuovi (13 totali):

| Path | Stato |
|---|---|
| `src/domain/recalc.js` | mod. (rename §6.58, guard §6.61) |
| `src/domain/recalc.test.js` | mod. (rename + 2 test guard) |
| `src/state/actions.js` | mod. (rename import + nuovo thunk + export bag) |
| `src/state/actions.annullaAssunzione.test.js` | **NUOVO** (env node, 2 test) |
| `src/state/reducer.js` | mod. (+case REMOVE_PRESO_KEY §6.62) |
| `src/state/reducer.test.js` | mod. (+1 test filter) |
| `src/state/applyHelper.js` | mod. (+code DomainError return §6.63) |
| `src/components/oggi/modals/UndoModal.jsx` | mod. (stub §6.59 → implementazione, 196 righe) |
| `src/components/oggi/modals/UndoModal.test.jsx` | **NUOVO** (4 test, env jsdom) |
| `src/components/oggi/DoseCard.jsx` | mod. (refactor 3 const + wrapper, ~640 righe) |
| `src/components/oggi/DoseCard.test.jsx` | mod. (+1 test wrapper) |
| `src/components/oggi/OggiView.jsx` | mod. (wiring completo UndoModal, 7 patch) |

### Consuntivo test

```
baseline 235 → 245 (+10, target cumulativo AMB-K' 246±2 a -1 dal top)
  recalc.test.js                        +2  (guard DOWNSTREAM N+1 presa/sospesa)
  actions.annullaAssunzione.test.js     +2  (happy path, guard path)
  reducer.test.js                       +1  (REMOVE_PRESO_KEY filter)
  UndoModal.test.jsx                    +4  (mount-gate, a11y, success, banner)
  DoseCard.test.jsx                     +1  (onUndoTap wrapper)
  TOTAL                                 +10
```

File test: 21 → **23** (+2).

### Deviazioni registrate

- **§6.61** — guard `DOWNSTREAM_USER_EDITS` parziale (no marker `user_edited` su `ricalcolata`)
- **§6.62** — action `REMOVE_PRESO_KEY` + dispatch dal thunk per stack coherence
- **§6.63** — `commitApplyResult` ritorna `code` sul path DomainError

### Refusi prompt §11 v2.5.16 risolti (non deviazioni)

- **D-R4** — `ApplyError({kind, code})` citato dal prompt → `DomainError('DOWNSTREAM_USER_EDITS', ...)` per coerenza con `applyRecupero`. `commitApplyResult` già mappa DomainError in SET_ERROR kind='domain' preservando code
- **D-R5** — "focus bottone Annulla" citato da CP5 step del prompt → "focus al primo tabbable (header X)" per uniformità con il pattern `useModalA11y` adottato dalle 4 modali 7c-1/7d-1 (focus-trap atterra sul primo tabbable; non espone `initialFocusRef`)

### Scoperte operative (non bloccanti, rilevanti per sessioni future)

- **Paste Terminal macOS Tahoe su heredoc Python multilinea:** paste > ~30 righe può troncarsi silenziosamente, lasciando il terminale nello stato `quote>` o `heredoc>`. Sintomo: comando sembra appeso dopo OK. Workaround stabile: **encapsulare ogni patch Python in base64, una singola riga `echo '<b64>' | base64 -d | python3`**. Zero rischi di orphan quote, zero dipendenza dalla dimensione del script Python.
- **Paste singola riga base64 con `-w 0`:** funziona fino a ~32KB senza troncamento su Terminal.app macOS Tahoe 26.0.1. Pattern adottato per `DoseCard.jsx` riscritto completo (644 righe, 32172 chars base64).
- **Bug encoding transitorio emesso da Claude:** in un blocco 5a.2 è stato emesso un base64 corrotto (mancava quote di chiusura di `print('OK ...')`). Mitigazione: round-trip verify `base64 -d | tail -3` prima di emettere, con md5 match sul file sorgente. Adottato per tutti i base64 successivi.

### Limitazioni note (da risolvere in parte 3/3)

- **CP6 deferito:** DoseCard polish §6.45 (delta "in orario" con tolleranza ±TOLLERANZA_MIN) + §6.47(a) (gap residuo label = `gap_minuti − recupero_minuti`, hide se ≤0)
- **CP7 deferito:** theme `focusRing` token + OggiView `:focus-visible` token-aware (promozione di `CARD_AND_SLIDER_CSS` dentro il componente o estrazione in `buildCss(t)` per avere `t` in scope)
- **CP browser 6 punti deferito:** verifica manuale end-to-end post-CP7
- **Guard §6.61 parziale:** ramo `ricalcolata user-edited` non implementabile senza estensione modello. Future `user_edited:boolean` su `PlanEntry` abilita il terzo branch. Non in scope 7d-2

### Azioni sul Mac prima di Sessione 7d-2 parte 3/3

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.18** di questo delivery
2. Verificare working copy corrisponda al commit `Sessione 7d-2 parte 2/2: CP4–CP5` (13 file changed)
3. Verificare baseline: `npm test -- --run` → atteso **245/245 su 23 test files**
4. Aprire sessione implementativa 7d-2p3 con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 7d-2 parte 3/3 esecutiva).`

## 22.3 Stato post-Sessione 7d-2 parte 3/3

**Data:** 21 aprile 2026
**Baseline pre-sessione:** 245/245 su 23 test files (post p2)
**Baseline post-sessione:** **247/247 su 23 test files** (+2, target AMB-K'' 247±2 centrato esattamente)

### Esiti sub-step

| Sub-step | Scope | Delta test | Esito |
|---|---|---|---|
| **CP0** | Sanity check 6 punti + ricostruzione 4 file nel sandbox Claude | 0 | ✅ baseline 245/245 confermata |
| **CP6** | DoseCard §6.45 "in orario" esteso a ±TOLLERANZA_MIN + §6.47a gap residuo | +2 netti | ✅ 247/247 (23 file invariato). 2 update + 2 nuovi, 4 file test interessati → 1 solo `DoseCard.test.jsx` |
| **CP7** | theme.js token `focusRing` + OggiView `buildCss(t)` token-aware + useMemo consumer | 0 | ✅ 247/247 invariato (decisione design, verifica in CP browser) |
| **CP browser** | 6 punti manuali (§6.45 tolleranza + §6.47a gap + §6.40 presoStack + §6.41 UndoModal happy path + §6.41 guard + §6.46/§G ring) | 0 | ✅ 6/6 verdi (console-driven, vedi dettaglio §22.3.2) |

### File prodotti in 7d-2p3

4 modificati, 0 nuovi:

| Path | Stato |
|---|---|
| `src/components/oggi/DoseCard.jsx` | mod. (§6.45 tolleranza, §6.47a gapResiduo, header comment +sezione CP6) |
| `src/components/oggi/DoseCard.test.jsx` | mod. (2 update + 2 new test, +1 describe CP6) |
| `src/utils/theme.js` | mod. (+token `focusRing`) |
| `src/components/oggi/OggiView.jsx` | mod. (promo `CARD_AND_SLIDER_CSS` → `buildCss(t)`, useMemo, header comment +sezione CP7) |

### Consuntivo test

```
baseline 245 → 247 (+2, target AMB-K'' 247±2 centrato esattamente)
  DoseCard.test.jsx                     +2  (§6.45 "Ritardo 30 min" + §6.47a "gap=60 rec=60 → no badge")
  TOTAL                                 +2
```

File test: 23 → **23** (invariato, nessun file test nuovo).

### Deviazioni registrate

**Zero nuove deviazioni §6** in questa sessione. Le 7 AMB-7d-2p3 congelate da v2.5.16 (E/G/I/J/M/K''/L'') sono state tutte rispettate letteralmente:

- **E** (invariato): §6.47 ridotto a parte (a) — label badge = `gap_minuti − recupero_minuti`, hide se ≤0. `shared/TapBadge.jsx` e `Badge.jsx` non toccati
- **G** (invariato): ring focus light `#3B82F6`, dark `#60A5FA`. Token `focusRing` in `theme.js`. CSS `:focus-visible` globale in `OggiView.jsx` via `t.focusRing`
- **I** (invariato): date separator `top[180px]` statico mantenuto. Retrofit ResizeObserver defer a post-7d
- **J** (invariato): §6.26 cross-midnight UI resta defer a Step 9
- **M** (invariato): `NavBar.jsx`, `App.jsx`, `useModalA11y.js`, 4 modali esistenti, `UndoModal.jsx` (appena implementato in p2) non toccati
- **K''** (rivisto per p3): target 247±2 centrato esattamente (+2 netti)
- **L''** (rivisto per p3): ordine CP6→CP7 rispettato

### 22.3.1 Scoperta operativa (non bloccante, fuori scope CP6/CP7)

**Asimmetria `actions.recupero(key, 0)` vs reset di `ora_ricalcolata`:**

Durante CP browser punto 2 (§6.47a) dopo aver testato un recupero estremo che ha ricalcolato `ora_ricalcolata` da `23:00` a `17:30`, il tentativo di reset via `actions.recupero(key, 0)` ha azzerato correttamente `recupero_minuti` a 0, ma **non ha ripristinato** `ora_ricalcolata` al valore precedente. Anche `actions.rebuildPlan()` non ha ricalcolato `ora_ricalcolata` partendo da zero.

Interpretazione: il dominio tratta `ora_ricalcolata` come **fatto storico persistito** una volta scritto, coerente con il pattern `§6.48 ephemeral prompt` + persistenza consolidata dei valori post-apply. Il path `applyRecupero` non è simmetrico rispetto al path `applyRecupero(rec=0)`: il primo può RIVOLUZIONARE `ora_ricalcolata`, il secondo NON la ripristina.

**Impatto operativo:** nessuno in scope 7d. Durante uso reale questa asimmetria non emerge: un utente che applica un recupero e poi vuole "annullarlo" tipicamente userebbe UNDO / re-apply con parametri diversi, non `rec=0`. La scoperta è puramente a livello di invariant testing.

**Classificazione:** candidato §6.6x (futuro, se si decide di normalizzare il reset path). NON applicabile in scope 7d-2. NON blocca chiusura Step 7.

### 22.3.2 CP browser (dettaglio puntuale, console-driven)

Eseguiti via `__pt.app.actions` in console per guida step-by-step (pattern preferito da utente in questa sessione):

1. **§6.45 tolleranza (PASS)** — Ezevast 10/20mg `20:30` testata a 2 valori di delta:
   - `presa` con `ora_effettiva=22:40 delta_minuti=130` → Card mostra `22:40` verde + `Ritardo` rosso + `2h 10` rosso (formatPresaValue: 130→"2h 10"). ✅
   - `undo + presa {oraEffettiva:'20:40'}` → `delta_minuti=10` → Card mostra `20:40` verde + `in orario` verde (single line, no valore sotto). ✅
2. **§6.47a gap residuo (PASS)** — Olevia 1000mg `23:00` gap=210, baseline badge "ritardo 3h 30min":
   - `recupero(key, 120)` → `gapResiduo=90` → badge persiste, label "ritardo 1h 30min". ✅
   - `recupero(key, ≥210)` → `gapResiduo=0` → badge scomparso completamente dal DOM. ✅
   - Scoperta operativa §22.3.1 emersa durante reset verifica
3. **§6.40 presoStack reload (PASS)** — 3 presa accumulate, Cmd+R → `presoStack_last3: ['2026-04-21-4-1', '2026-04-21-3-1', '2026-04-21-7-1']` integro ✅
4. **§6.41 UndoModal happy path (PASS)** — tap su body Card Ezevast presa → UndoModal aperta con titolo "Ezevast 10/20mg" + sottotitolo "Dose presa alle 21:05 il 21/04" + bottone "Annulla assunzione" + ring focus su X; tap bottone → `stato: 'prevista'` + `ora_effettiva: null` + `delta_minuti: null` + `presoStack` da 3 → 2 elementi (§6.62 REMOVE_PRESO_KEY verificata) ✅
5. **§6.41 guard DOWNSTREAM_USER_EDITS (PASS)** — setup `10-2 presa` + `10-3 presa` (Prontinal N+1 terminale), tap body `10-2` → UndoModal → "Annulla assunzione" → banner `⚠ Impossibile annullare — Una dose successiva è già stata registrata o sospesa. Correggi prima quella.` con modale aperta + bottone scomparso + Card invariata. Console: `state.error = {kind:'domain', code:'DOWNSTREAM_USER_EDITS', message:...}` (§6.63 verificata) ✅
6. **§6.46/§G focus ring token-aware (PASS)** — DOM probe:
   - auto mode (OS dark) → `focusRingColor: '#60A5FA'` ✅
   - `setSetting('tema', 'light')` → `focusRingColor: '#3B82F6'` ✅
   - Verifica visuale: ring visibile su X UndoModal + icona Oggi NavBar, offset 3px spessore 2.5px, colori distinti tra modi ✅

### Azioni sul Mac prima di Sessione 8

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.19** di questo delivery
2. Commit working copy 7d-2p3 su branch feature corrente con messaggio suggerito:
   ```
   Sessione 7d-2 parte 3/3: CP6+CP7 (DoseCard §6.45 tolleranza + §6.47a gapResiduo, theme focusRing, OggiView buildCss token-aware) — 245→247
   ```
3. Considerare **merge Step 7 completo** verso branch parent/main (7 sotto-sessioni, 247 test, 38 deviazioni §6.25-§6.63 dalla baseline Step 6)
4. Verificare baseline: `npm test -- --run` → atteso **247/247 su 23 test files**
5. Aprire sessione analisi Step 8 con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8 analisi-first).`

---

## 22.4 Stato post-Sessione 8-pre implementativa

**Data:** 22 aprile 2026
**Baseline pre-sessione:** 247/247 su 23 test files (post 7d-2p3)
**Baseline post-sessione:** **250/250 su 23 test files** (+3, target AMB-E centrato esattamente)

### Esiti CP

| CP | Scope | Delta test | Esito |
|---|---|---|---|
| **CP0** | Sanity check 8 punti ispettivi (baseline + git + drift costanti + rehydration call site + §6.14 compliance + API repo + reducer + makeFakeRepo) | 0 | ✅ 8/8 (punto 5 Esito A → CP2 skippato) |
| **CP1** | §6.72 + §6.75: rehydration `presoStack` multi-giorno via reuse `logAssunzioni` + filter in-memoria | +3 netti | ✅ 6/6 nuovi scenari verdi. Test file riscritto integralmente (3 → 6 test) |
| **CP2** | (condizionale) Esito B Q1.a fix reset campi N+1 | — | ⏭️ Skippato (Esito A al CP0.5) |
| **CP3** | Full suite post-patch | 0 (cumulativo +3) | ✅ 250/250, 23 test files invariati |
| **CP browser** | 3 punti console-driven (cross-day seed + UndoModal + annulla happy path; punto 3 Esito B condizionale) | 0 | ✅ 2/2 (punto 3 skip condizionale) |

### File prodotti in 8-pre

2 modificati, 0 nuovi:

| Path | Stato |
|---|---|
| `src/state/actions.js` | mod. (§6.72 + §6.75 rehydration riscritta, block `logAssunzioni.filter(...)` sostituisce call `getLogByDataStato`) |
| `src/state/actions.init.test.js` | mod. (riscrittura 3 → 6 test; source mock da `getLogByDataStato` a `getLogByRange`; `makeRepo` refactored; beforeEach/afterEach globali per fake timers) |

### Consuntivo test

```
baseline 247 → 250 (+3, target AMB-E 250 ±2 centrato esattamente)
  src/state/actions.init.test.js        +3  (6 scenari cross-day vs 3 pre-8-pre "today only")
  TOTAL                                 +3
```

File test: 23 → **23** (invariato, nessun file test nuovo).

### Deviazioni registrate

**§6.75 nuova (operativa):** reuse `logAssunzioni` in `init()` per rehydration `presoStack` + filter in-memoria. Micro-deviazione dal letterale del prompt §11 v2.5.21 (che presumeva query dedicata nelle 3 opzioni). Motivazione: risparmio 1 round-trip IndexedDB, simmetria window garantita dallo stesso array che alimenta `buildMultiDayPlan`.

**§6.74 non consumata (riservata):** CP0.5 Esito A pieno ha confermato compliance §6.14 già in place dalla 7d-2p2. Slot numerico preservato.

**Riscrittura test file esistente non prevista dal prompt §11 letterale** (che indicava "aggiungere 2-3 test"): i 3 test pre-esistenti in `actions.init.test.js` erano fondati su `getLogByDataStato` che §6.75 rimuove dal flow. Senza riscrittura sarebbero falliti.

**Scenario (b) "altroieri"** del prompt §11 CP1.3 non reachable con `PLAN_DAYS_BEFORE=1` (altroieri = `today-2`, fuori dalla window §6.72 con config corrente). Rimpiazzato con scenari "yesterday+today ASC+LIFO" e "window right-bound guard" (log dated tomorrow escluso pur essendo in `logAssunzioni` via `PLAN_DAYS_AFTER`). Sostanza del prompt (test della window cross-day) preservata.

### 22.4.1 Scoperte operative

**(1) `window.__pt.app.repo` non esposto** (per design §13/D12). Smoke test pubblico espone solo `{getState, actions}`. CP browser punto 1 ha dovuto accedere a IndexedDB via API nativa (`indexedDB.open('pharmatimer')`) per seedare log di test cross-day. Nota per sessioni future: se CP browser richiederanno frequentemente seeding diretto DB, valutare esposizione `repo` (debouncée DEV-only) in §13.

**(2) Log storici di ieri già presenti** nel DB di Roberto al momento del CP browser (farmaco_id=10 dose 2 @ 16:00 + dose 3 @ 23:50, entrambe `stato: 'presa'`). Il test cross-day §6.72 ha potuto funzionare senza seed artificiale — scenario "ieri popolato naturalmente" era già realistico. Il seed artificiale iniziale (id=24) è stato rimosso via `store.delete(24)` dopo aver rilevato il duplicato logico con la row naturale [8].

**(3) Format inconsistenza minore:** nei log storici `ora_effettiva` è ISO datetime completo (`'2026-04-21T23:50:00'`), mentre nel plan in memoria è HH:MM (`'23:50'`). Il seed artificiale iniziale del CP browser usava HH:MM (errato per log); dopo delete non è stato riseedato perché le row naturali bastavano. Non è deviazione (invariante già accettata nel codebase), ma va documentato per evitare errori in seed futuri.

**(4) Confronto CP browser punto 2 rafforza §6.71** "fatto storico immutabile": `ora_ricalcolata='00:00'` su entry 10-3 di ieri è stato **preservato** dopo "Annulla assunzione" (entry tornata a `stato='ricalcolata'`, non `'prevista'`). Coerente con il restore logic nel body di `applyAnnullaAssunzione` (`restoredStato = target.ora_ricalcolata != null ? 'ricalcolata' : 'prevista'`). La deviazione §6.71 è quindi osservabile direttamente dall'UX cross-day UNDO.

### 22.4.2 CP browser (dettaglio puntuale, console-driven)

Eseguiti via `__pt.app` (solo `{getState, actions}`) + accesso IDB nativo per seed/cleanup:

1. **Cross-day UNDO direct §6.72 happy path (PASS)** — log storici di ieri già naturali in DB (farmaco 10 dose 2 @ 16:00 + dose 3 @ 23:50, entrambe `stato:'presa'`, oltre farmaco 4 dose 1 @ 11:00 + farmaco 3 dose 1 @ 12:13). Cmd+R post rehydration. Stack: `['2026-04-21-10-2', '2026-04-21-4-1', '2026-04-21-3-1', '2026-04-21-10-3']` (4 keys di ieri, simmetria stack↔plan verificata 3/3 PASS). Tap body Card Prontinal ieri dose 3 → UndoModal aperta con titolo "Prontinal aerosol 800mcg" + cross-day hint `Dose presa alle 23:50 il 21/04` + bottone "Annulla assunzione" + focus su X. ✅

2. **Cross-day annulla happy path (PASS)** — tap "Annulla assunzione". Post-undo 4/4 PASS:
   - Entry `2026-04-21-10-3`: `stato: 'ricalcolata'` (preservato perché `ora_ricalcolata='00:00'` pre-esistente, conferma §6.71), `ora_effettiva: null`, `ora_ricalcolata: '00:00'`, `delta_minuti: null` ✅
   - `presoStack`: `['2026-04-21-10-2', '2026-04-21-4-1', '2026-04-21-3-1']` (rimossa solo la key target, altre 3 preservate, REMOVE_PRESO_KEY §6.62 OK) ✅
   - `state.error === null` ✅
   - Altre Card presa di ieri (10-2, 4-1, 3-1) invariate visualmente ✅

3. **Reset N+1 ricalcolata post-fix §6.14 Esito B** — ⏭️ Skippato: CP0.5 Esito A pieno.

### Azioni sul Mac prima di Sessione 8a

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.22** di questo delivery.
2. Commit working copy 8-pre con messaggio suggerito:
   ```
   Sessione 8-pre implementativa: §6.72 + §6.75 rehydration presoStack cross-day (actions.js + actions.init.test.js) — 247→250
   ```
3. Commit Changelog v2.5.22 nel repo git (§6.70 soft: drift attuale 1 versione, sotto soglia 2 — commit non obbligatorio ma raccomandato in vista di 8a).
4. Verificare baseline: `npm test -- --run` → atteso **250/250 su 23 test files**.
5. **Opzionale**: merge Step 7 su parent/main se non già fatto (step completo da 7d-2p3; 8-pre non sposta l'ago sulla decisione di merge).
6. Aprire sessione 8a analisi-first con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8a analisi-first).`

---

## 22.5 Stato post-Sessione 8a analisi-first

**Data:** 22 aprile 2026 (stessa giornata di 8-pre impl e 8 analisi-first v2.5.20)
**Baseline test:** 250/250 su 23 test files (invariata — sessione analisi pura, zero codice)
**Bump:** v2.5.22 → v2.5.23

### Esiti Q

| Q | Tema | Esito |
|---|---|---|
| **Q1** | Routing shell ConfigView | Q1.a nested `<Routes>` in ConfigView con relative paths; Q1.b default redirect `/config` → `/config/impostazioni`; Q1.c deep-link automatico via nested Routes. **→ AMB-A** |
| **Q2** | `withTransaction` API | Q2.a firma `(mode, storeNames:string[], fn)` con **mapping interno** (rettifica F4); Q2.b scope 8a (confermato); Q2.c unit test spy-based senza nuove deps (fake-indexeddb non installato). **→ AMB-B** |
| **Q3** | ImpostazioniTab scope 8a | Q3.a Nome + save esplicito + min 1 char trimmed; Q3.b Tema fonte unica `impostazioni.tema`; Q3.c Avanzate-DEV 3 campi read-only con branch A/B/C per `seed_loaded` (rettifica F1). **→ AMB-C, AMB-D** |
| **Q4** | Unsaved changes policy | Q4.a save esplicito + confirm modale su tab change con dirty; Q4.b inline in 8a (≤15 righe), estrazione hook deferita a 8b (DRY-at-2). **→ AMB-E** |
| **Q5** | Header Oggi toggle tema | Q5.a shortcut confermato, zero refactor. **→ AMB-F** |
| **Q6** | Test strategy 8a | Q6.a `initialEntries` optional wrap MemoryRouter (backward-compat, rettifica F5); Q6.b `userEvent` click-driven per happy path nav; Q6.c breakdown +18 test su 7 aree. **→ AMB-H, AMB-I, AMB-J** |

### AMB congelate (A-K)

11 AMB congelate. Numerazione superiore alle A-F indicative del prompt §11 v2.5.22 per copertura completa post dry-run CP0:

- **AMB-A** Routing nested `<Routes>` + default redirect + catch-all.
- **AMB-B** `withTransaction` firma + mapping `storeNames.map(name => db[name])` + scope 8a.
- **AMB-C** ImpostazioniTab PROD: Nome + Tema.
- **AMB-D** Avanzate-DEV: 3 campi read-only + branch A/B/C per `seed_loaded`.
- **AMB-E** Unsaved changes: inline in 8a.
- **AMB-F** Header Oggi toggle tema: shortcut confermato.
- **AMB-G** Cleanup mirror `nomeUtente` in scope 8a CP4 (gate CP0).
- **AMB-H** Test helpers: `initialEntries` optional (backward-compat).
- **AMB-I** Test strategy: `userEvent` click-driven.
- **AMB-J** Target test 250 → 268 (+18), tolleranza ±3.
- **AMB-K** Ordine CP: CP0→CP8 + CP browser.

### Rettifiche dry-run CP0 (F1-F7)

| # | Fragilità | Rettifica applicata |
|---|---|---|
| **F1** | `seed_loaded` non osservabile tra settings attuali | AMB-D dichiara branch A/B/C (A: esiste; B: assente → scrittura in `runSeedIfNeeded` + fallback runtime; C: naming alternativo → rettifica inline) |
| **F2** | `makeFakeRepo` non aggiornato quando si estende IRepository (lesson §6.60 7d-2p1) | AMB-K blindatura CP1: `withTransaction` repo + `makeFakeRepo` stub **contestualmente**, mai separatamente |
| **F3** | Consumer `state.nomeUtente` potenzialmente >2 (inatteso) | CP0 gate grep; branch cleanup split (target +19-20) o defer a 8d; §6.77 registra entrambi i path |
| **F4** | Dexie 4 `db.transaction(mode, tables, fn)` richiede Table objects, non stringhe | AMB-B implementazione: `const tables = storeNames.map(name => db[name])` prima del pass-through |
| **F5** | `renderWithRealProvider` già usato da 10 test OggiView E2E — wrap incondizionato MemoryRouter romperebbe 245 test esistenti | AMB-H `initialEntries` opzionale: wrap solo se presente, default absent = comportamento attuale invariato |
| **F6** | `useTheme` re-render su `SET_IMPOSTAZIONE` tema | Zero fragilità — meccanica già funzionante (§17 smoke test browser conferma). Nessuna rettifica. |
| **F7** | `<Navigate replace>` sostituisce history entry, back salta a `/oggi` | CP browser punto esplicito: "tap Config → URL `/config/impostazioni` (replace, non push); browser back → torna a `/oggi` diretto" |

### Scoperte operative

1. **§3 struttura progetto contiene `OrariTab.jsx` fantasma** (riga 451 pre-fix). Smentito da §6.65. Hotfix documentale inline → §6.76. Candidato check in prompt §11 futuri: "verifica coerenza §3 vs decisioni §6.NN recenti".

2. **`fake-indexeddb` non installato** (`package.json` devDependencies). Q2.c risolta con unit test spy-based su `db.transaction`. Se in 8c emergeranno test integration multi-tabella reali, valutare installazione in quel momento (non ora).

3. **`renderWithRealProvider.jsx` (313 righe, 7c-2)** attualmente monta AppProvider reale senza router. Consumer unico: 10 OggiView tests E2E. Non ispezionato il sorgente in analisi-first (inference dalla genesi + §6.60 lesson sufficient). **CP0 8a impl verifica: grep `MemoryRouter\|initialEntries` su `src/test/*.jsx`**. Se MemoryRouter già presente (improbabile) → rettifica inline AMB-H.

4. **`useLocation` / `useNavigate` consumer attuali:** solo NavBar.jsx (confermato via `grep -rn "useLocation\|useNavigate\|NavLink" src/`). Tutti i test 7b/7c/7d passano senza router: wrap condizionale MemoryRouter è safe (F5).

5. **Mockup `pharmatimer_oggi_v5.jsx` non contiene schermate Config** (R2 v2.5.20 rilievo, confermato). ImpostazioniTab è design ex-novo. Nessun nuovo token tema richiesto (`src/utils/theme.js` completo da 7b-1). UX fine (spacing, affordance radio, header "Avanzate") da validare in CP browser Mac — niente design reference pattern-match.

6. **Riga §3 va aggiornata a 8a impl con file reali prodotti** (ConfigView, ConfigTabBar, ImpostazioniTab, updated nested structure). Candidato edit contestuale al delivery 8a impl post-CP8.

### File NON prodotti (analisi pura)

Zero file di codice prodotti in 8a analisi-first. Solo update Changelog (questo delivery). Coerente con modalità analisi-first consolidata (pattern 5b, 7c-2, 8, 8-pre).

### Azioni sul Mac prima di Sessione 8a implementativa

1. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.23** (eseguire `bash ~/Downloads/patch_changelog_v2_5_23.sh` nella dir `~/Sviluppo/pharmatimer/`, poi upload nella KB).
2. Commit Changelog v2.5.23 nel repo git (§6.70 soft: drift atteso 1 versione, sotto soglia 2; raccomandato ma non obbligatorio).
3. Verificare baseline invariata: `npm test -- --run` → atteso **250/250 su 23 test files** (invariata da 8-pre impl).
4. Aprire sessione 8a implementativa con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8a implementativa).`

## 22.6 Stato post-Sessione 8a implementativa

**Data:** 23 aprile 2026
**Baseline test:** 250 → **269/269** su 26 test files (+19, entro tolleranza AMB-J +18 ±3)
**Bump:** v2.5.23 → v2.5.24

### Esiti CP

| CP | Scope | Risultato | Δ test |
|---|---|---|---|
| **CP0** | Sanity check 5 gate (seed marker / nomeUtente consumers / MemoryRouter absence / makeFakeRepo no withTx / Dexie db[name]) | ✅ tutti pass, baseline 250/250 | 0 |
| **CP1** | `withTransaction` repo + fake + test spy-based | ✅ | +2 (250→252) |
| **CP2** | ConfigView nested Routes + placeholder tabs + `initialEntries` helper extension | ✅ | +4 (252→256) |
| **CP3** | ConfigTabBar top + NavLink auto aria-current + 3 test click-driven | ✅ (hotfix dep user-event) | +3 (256→259) |
| **CP4** | Cleanup mirror §6.77 + ImpostazioniTab Sezione Nome + 4 test | ✅ | +5 (259→264) |
| **CP5** | Sezione Tema 3 radio save-on-change + 3 test | ✅ | +3 (264→267) |
| **CP6** | Sezione Avanzate-DEV (schema_version / simulatedNow / seed_loaded) + 2 test con stubEnv | ✅ | +2 (267→269) |
| **CP7** | Unsaved changes modal inline intra-Config (BrowserRouter puro → useBlocker non disponibile, custom intercept su ConfigTabBar) | ✅ | 0 |
| **CP8** | Full suite + CP browser 5/5 | ✅ | 0 |

**Cumulativo:** +19 test. Target AMB-J (+18 ±3) centrato sul bound superiore.

### Hotfix intra-sessione (3 applicati, nessun rollback)

| Hotfix | Trigger | Scope | §6.NN |
|---|---|---|---|
| `cp7_hotfix_dark.sh` | CP browser Punto 3: input Nome invisibile in dark (white-on-white) | Tokens theme-aware su ImpostazioniTab input/button + UnsavedChangesModal buttons (riuso `modalBg`+`tapBd`+`textPrimary`, zero nuovi token) | §6.81 (nota correlata) |
| `cp7_hotfix_bug.sh` (parte 1) | CP browser Punto 3: input Nome non rehydra post idle→ready | `useEffect(() => setValue(nomeAttuale), [nomeAttuale])` in SezioneNome | §6.82 |
| `cp7_hotfix_bug.sh` (parte 2) | CP browser Punto 3: button Salva layout shift orizzontale | Class Tailwind `block` su button Salva | §6.83 |

### Esiti CP browser (5/5)

| Punto | Scope | Esito |
|---|---|---|
| 1 | `/config` redirect → `/config/impostazioni` replace + back diretto a `/oggi` | ✅ |
| 2 | Deep-link `/config/profili`, `/config/farmaci`, `/config/inesistente` → redirect catch-all | ✅ |
| 3 | Nome edit → Salva → Console state popolato → Cmd+R → persistito (dopo hotfix §6.82) | ✅ |
| 4 | Tema 3 flip (light/dark/auto) + persistence + toggle header Oggi AMB-F condivide stato | ✅ |
| 5 | Unsaved changes: edit → click tab → modal → Annulla (mantiene dirty) / Scarta (naviga + reset) / no-dirty → navigate diretto | ✅ |

### File prodotti

**Nuovi (6):**
- `src/components/config/ConfigTabBar.jsx`
- `src/components/config/ConfigTabBar.test.jsx`
- `src/components/config/ConfigView.test.jsx`
- `src/components/config/ImpostazioniTab.test.jsx`
- `src/components/config/UnsavedChangesModal.jsx`
- (nota: `ImpostazioniTab.jsx` trasformato da placeholder stub a componente funzionale — conteggiato come nuovo)

**Modificati (13):**
- `src/components/config/ConfigView.jsx` (rewrite CP2 + ampliamento CP7)
- `src/components/config/ProfiliTab.jsx` (placeholder CP2)
- `src/components/config/FarmaciTab.jsx` (placeholder CP2)
- `src/components/config/ImpostazioniTab.jsx` (CP4 Nome + CP5 Tema + CP6 Avanzate + CP7 props optional + hotfix dark + hotfix bug)
- `src/data/repository/IRepository.js` (CP1 JSDoc withTransaction)
- `src/data/repository/LocalRepository.js` (CP1 impl withTransaction)
- `src/data/repository/LocalRepository.test.js` (CP1 +2 test)
- `src/state/reducer.js` (CP4 cleanup §6.77)
- `src/state/reducer.test.js` (CP4 refactor + regression)
- `src/state/actions.js` (CP4 cleanup §6.77)
- `src/state/AppContext.test.jsx` (CP4 seed + asserts)
- `src/test/renderHelpers.jsx` (CP2 initialEntries optional)
- `package.json` + `package-lock.json` (CP3 @testing-library/user-event)

### Deviazioni §6.NN introdotte

| § | Titolo breve | Classificazione |
|---|---|---|
| §6.78 | AMB-A interpretazione componenti standalone | Interpretazione favorevole |
| §6.79 | renderWithRealProvider non esteso in CP2 | Scope-creep evitato |
| §6.80 | @testing-library/user-event nuova dep | Nuova dep dev |
| §6.81 | ConfigTabBar inactive troppo scuro dark | A11y polish (candidate 8d) |
| §6.82 | SezioneNome useEffect rehydrate | Bug UX fixed |
| §6.83 | Button Salva class `block` | Layout bug fixed |
| §6.84 | React Router 6 future flag warnings | Deprecation (candidate 8d) |
| §6.85 | `nome_utente` azzerato anomalia non riprodotta | Investigation (candidate 8d) |

### Scope OUT dichiarato 8a (confermato rispettato)

- ProfiliTab UI/thunks → 8b
- FarmaciTab + orari inline → 8c
- `useUnsavedChanges` hook estratto (DRY-at-2) → 8b
- Polish a11y profondo (focus trap modal, aria-labels estesi) → 8d
- Flip `GET_FARMACI_SOLO_ATTIVI=true` → 8c
- `OrariTab.jsx` + `forms/*.jsx` cleanup → 8d (§6.78)

### Scoperte operative

1. **`BrowserRouter` puro in main.jsx** (non `createBrowserRouter` + `RouterProvider`). `useBlocker` di React Router 6 non disponibile. CP7 ha adottato custom intercept su ConfigTabBar `onTabClick` prop con modal inline. Eventuale migrazione a DataRouter = scope 9 o 10, non 8d.

2. **Pattern `data-testid="config-tab-*"` stabile CP2→8c.** Convenzione documentata inline in `ProfiliTab.jsx`, `FarmaciTab.jsx`, `ImpostazioniTab.jsx`: il testid wrapper outer non cambia quando la tab diventa funzionale in 8b/8c. I 4 test routing di ConfigView.test.jsx dipendono da questo contratto.

3. **Pattern `renderHelpers initialEntries` opzionale.** Consumer-count impact: 13 test esistenti con `renderWithProvider(..., options={})` passano invariati (destructuring `const { initialEntries } = options` → `undefined` → `if (undefined)` falsy → wrap non applicato). Nuovi 7 test CP2-CP3 usano `{ initialEntries: [path] }`. Pattern replicabile per test Router-dependent futuri.

4. **`vi.stubEnv('DEV', bool)` funziona in Vitest 2.1.9** per gate `import.meta.env.DEV && <Component />`. Confermato empiricamente in CP6 (senza documentazione ufficiale da noi verificata). Pattern riusabile per altri gate DEV-only futuri.

5. **Hotfix dark mode su Config ha rivelato gap sistematico.** `useTheme` non era applicato a nessun form element in ImpostazioniTab al primo delivery CP4. Il codebase preesistente (OggiView, modali Oggi) usa `useTheme` + `tokens: t` pervasivamente — Config è stata sviluppata fuori dal pattern. Consiglio per 8b: applicare `useTheme` fin dall'inizio a tutti i form ProfiliTab (nome profilo, time inputs) per evitare ripetere l'hotfix.

### Azioni sul Mac post-Sessione 8a implementativa

1. Verificare test finale: `npm test -- --run` → atteso **269/269** su 26 test files.
2. Commit dei file di codice 8a (strategia a scelta: commit unico "Sessione 8a implementativa completa" o commit per CP).
3. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.24** (questo delivery).
4. Commit Changelog v2.5.24 (raccomandato stesso commit dei file di codice per allineare delivery).
5. Aprire sessione 8b analisi-first con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8b analisi-first).`

## 22.7 Stato post-Sessione 8b analisi-first

**Data:** 23 aprile 2026
**Baseline test:** **269/269** su 26 test files (invariato — sessione analisi pura)
**Bump:** v2.5.24 → v2.5.25

### Scope consegnato

Sessione 8b analisi-first NON produce codice. Produce decisioni congelate che blindano l'implementativa: 13 AMB-8b.A-M + 5 rettifiche F1-F5 + 1 scoperta procedurale (drift §6.69 pregresso su v2.5.24, non retrocorretto).

### Q1-Q7 risolte (summary)

| Q | Scope | Decisione |
|---|---|---|
| **Q1.a** | Master-detail shape | Lista sempre visibile + drawer bottom-sheet per edit/nuovo |
| **Q1.b** | "+ Nuovo" placement | Bottone top-right header tab |
| **Q1.c** | Indicator attivo | Badge verde "Attivo" + bordo sinistro colorato |
| **Q1.d** | Azione Attiva | Bottone esplicito "Attiva" dentro drawer |
| **Q2.a** | Required + validazione | Tutti required; ordine soft warning escluso `ora_sonno` (spec §10.1 Nottambulo wrap-mezzanotte) |
| **Q2.b** | Edit attivo | Permesso, `rebuildPlan()` post-save (§6.64) |
| **Q2.c** | Container form | Drawer bottom-sheet full-height mobile-first, `useModalA11y` focus trap |
| **Q3.a** | `addProfilo` | Nuovo thunk pessimistico |
| **Q3.b** | `updateProfilo` | Nuovo thunk con guard `attivo` filter + rebuildPlan su profilo attivo |
| **Q3.c** | `deleteProfilo` | Nuovo thunk senza guard duplicata (repo §6.5 già solleva Error) |
| **Q3.d** | Attivazione | Wrapper `attivaProfilo(id)` → `selectProfiloById` → `cambiaProfilo(profilo)` |
| **Q4.a** | Hook extraction | **NON estrarre in 8b** (Rettifica F1 — DRY-at-2 già soddisfatto via props opt lifting in ConfigView) |
| **Q4.b** | Hook shape | N/A — deferita |
| **Q5.a** | Elimina UX | Visibile ma disabled per profilo attivo + tooltip preventivo |
| **Q5.b** | Confirm modal | Sì, `ConfirmDeleteProfiloModal` inline (scope-minimal, stile UnsavedChangesModal) |
| **Q5.c** | Cascade log | Hard-delete senza cascade (log ha solo FK `farmaco_id`, nessuna rel. con profilo) |
| **Q6.a** | Test strategy | Tutto stub `renderWithProvider`; E2E rebuildPlan via spy action |
| **Q6.b** | Target test | +14-18 (ricalibrato da F1): lista/drawer 6 · thunk add/update 3 · delete 3 · attivaProfilo 2 · selectors 3 · confirm modal 1 |
| **Q6.c** | `renderWithRealProvider` | **NON esteso** (§6.79 rimane) — spy su action basta |
| **Q7.a** | CP breakdown | 6 CP (CP0→CP5 + browser finale) — CP5 hook cancellato |
| **Q7.b** | Split risk | 8b-1/8b-2 non previsto (riduzione 7→6 CP dà margine adeguato) |

### 13 AMB-8b congelate

| AMB | Scope | Congelato |
|---|---|---|
| **A** | UX ProfiliTab | lista+drawer / "+ Nuovo" top-right / badge "Attivo" / bottone "Attiva" drawer |
| **B** | Form 6 campi | tutti required; ordine soft escluso `ora_sonno`; duplicati nome soft; focus trap useModalA11y |
| **C** | Reducer actions | `SET_PROFILI` (array) + `SET_PROFILO_ATTIVO` (campo) — 2 action separate |
| **D** | Thunks | 3 CRUD pessimistici + wrapper `attivaProfilo(id)` via `selectProfiloById` + `cambiaProfilo` |
| **E** | Guard updateProfilo | filtra `attivo` dal patch — canale attivazione unico via `cambiaProfilo` |
| **F** | Delete guard | repo solleva Error (§6.5), thunk cattura → SET_ERROR; UI disabled+tooltip |
| **G** | Hook extraction | **deferita** al 3° consumer (8c/8d) — props opt lifting sufficiente |
| **H** | ConfirmDeleteProfiloModal | inline in ProfiliTab (1 consumer) — promozione al 2° consumer |
| **I** | useTheme pervasivo | applicato da CP1 su tutti i form element — preventivo §6.82 |
| **J** | renderWithRealProvider | non esteso in 8b (§6.79 rimane) — spy bastano |
| **K** | Selectors | `selectProfili`, `selectProfiloAttivo`, `selectProfiloById` |
| **L** | CP breakdown | 6 CP, target test +14-18, no split 8b-1/8b-2 |
| **M** | Schema spec | invariato (v1.2 resta) — tabella `profilo_utente` §3.4 usata tal quale |

### 5 rettifiche F integrate nel prompt impl

| F | Trigger | Rettifica |
|---|---|---|
| **F1** | Dry-run CP0 su `ConfigView.jsx` | Pattern dirty-lifted via props opt già attivo + riproducibile in ProfiliTab senza nuovo hook → `useUnsavedChanges` deferito (AMB-G). **Architetturalmente la scoperta più importante della sessione.** CP breakdown 7→6, target 20→14-18. |
| **F2** | Dry-run CP0 su `reducer.js` | Pattern `SET_FARMACI`/`SET_ORARI` template per 2 action simili → scelta minimalista `SET_PROFILI`+`SET_PROFILO_ATTIVO` invece di combo `UPSERT_PROFILO` |
| **F3** | Dry-run CP0 su `actions.js cambiaProfilo` | `cambiaProfilo` accetta oggetto profilo, non id → wrapper `attivaProfilo(id)` risolve id→profilo via selettore (AMB-D esplicitata) |
| **F4** | Analisi semantica guard attivazione | `updateProfilo` può accettare `attivo` in patch se form buggy → filtro esplicito nel thunk (AMB-E) chiude vulnerabilità silenziosa |
| **F5** | §22.6 scoperta operativa #5 | Gap sistematico useTheme su form 8a CP4 → AMB-I pre-emptive useTheme su ProfiliTab da CP1 |

### Scoperte operative

1. **Repo layer profili completo:** `addProfilo`/`updateProfilo`/`deleteProfilo` (con guard §6.5 in-repo) / `getProfili` / `setProfiloAttivo` / `setProfiloAttivoConCleanup` / `withTransaction` — **tutti già implementati** in LocalRepository.js. Zero lavoro repo in 8b (pattern inverso rispetto a 8a, dove `withTransaction` fu introdotto in CP1).

2. **Pattern dirty-lifted già DRY-at-2 nativo:** ConfigView lifta `dirty`/`setDirty` e li passa a ImpostazioniTab via props opt con fallback locale. Estendere il pattern a ProfiliTab (stessi props) è zero-cost e soddisfa DRY-at-2 naturalmente. Il 3° consumer (8c FarmaciTab con potenziali drawer nested) è il momento corretto per estrarre l'hook — prima è premature abstraction. Questa scoperta rompe l'assunzione iniziale del prompt §11 v2.5.24 (che preannunciava hook extraction in 8b) e costituisce la rettifica F1.

3. **Zero selettori profilo attuali:** `selectors.js` post-8a ha 10 selettori (selectToday / selectEntriesForDay / selectProssimaDose / selectFarmaciAttivi / selectHasError / selectImpostazione / selectCountersForDay / selectUltimaPresa / selectEntryByKey / selectPromptEntry). Nessun `selectProfili*`. I 3 nuovi (AMB-K) non hanno naming clash (grep 0 match atteso — gate CP0 punto 3).

4. **`cambiaProfilo` shape oggetto-intero è importante:** il thunk esistente `cambiaProfilo(profilo)` (non `cambiaProfilo(id)`) richiede risoluzione id→profilo a monte. `attivaProfilo(id)` wrapper coglie questa asimmetria in un punto unico, evitando di scaricare sul consumer UI la responsabilità di risolvere profilo via selettore. Pattern replicabile per future wrapper con simile asimmetria.

5. **Drift procedurale §6.69 pregresso su v2.5.24:** l'entry "Changelog versione 2.5.24 (rispetto alla 2.5.23):" è **assente** dall'elenco introduttivo del file al momento dell'apertura di 8b. Il front-matter dice v2.5.24 ma manca il bullet summary. Questo è un drift §6.69 non rilevato al bump 8a impl. **Non retrocorretto in 8b** per principio fatto-storico immutabile (§6.71 analogo): le modifiche alla v2.5.25 aggiungono la nuova entry sopra v2.5.23, lasciando il gap visibile come traccia. Non serve nuova §6.NN (è rispetto della regola esistente, non deviazione nuova).

6. **`config-tab-profili` testid invariante (§6.78):** l'outer wrapper `<section data-testid="config-tab-profili">` del placeholder CP2 deve essere preservato in 8b CP1 come outer del componente funzionale. I 4 test routing ConfigView.test.jsx dipendono da questo — modifiche al testid spezzerebbero silenziosamente la suite.

### Deviazioni §6.NN introdotte

**Nessuna.** Sessione analisi pura, zero codice, zero deviazioni consumate. Le deviazioni previste per 8b (es. §6.86 eventuale rettifica target test se out-of-bound) verranno iscritte solo se materializzate in implementativa.

### File prodotti / NON prodotti

**Prodotti (modificati):**
- `PharmaTimer_Changelog_Fase2.md` v2.5.24 → v2.5.25: bump front-matter + nuova entry 2.5.25 + §11 sostituita (analisi-first → implementativa) + §22.7 append.

**NON prodotti (per definizione, analisi-first):**
- Nessun file di codice sorgente.
- Nessun file test.
- Nessun hotfix script.

### Azioni sul Mac post-Sessione 8b analisi-first

1. Verificare che `git status` sia pulito sul branch `step-8` (nessun file codice 8b previsto — solo il Changelog deve muoversi).
2. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.25** (questo delivery).
3. Opzionale: `git add PharmaTimer_Changelog_Fase2.md && git commit -m "Changelog v2.5.25 (Sessione 8b analisi-first)"` — raccomandato per mantenere drift §6.70 sotto soglia.
4. Aprire sessione 8b implementativa con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8b implementativa).`



## 22.8 Stato post-Sessione 8b implementativa

**Data:** 23 aprile 2026
**Baseline test:** **287/287** su 28 test files (+18 vs 269/26 pre-8b, bound superiore AMB-L esatto)
**Bump:** v2.5.25 -> v2.5.26

### Scope consegnato

Sessione 8b implementativa: 6 CP (CP0 sanity + CP1..CP5 incrementali + CP browser finale). Tutte le 13 AMB-8b.A-M consumate, tutte le 5 rettifiche F1-F5 applicate, 1 nuova convenzione emersa (§6.87), 1 deviazione multi-parte introdotta (§6.86 .1-.4).

### Delta test per CP (cumulativi)

| CP | Scope | Delta | Totale | File test toccati |
|---|---|---|---|---|
| CP0 | Sanity gate (no code) | 0 | 269 | — |
| CP1 | Lista + card + "+ Nuovo" read-only | +3 | 272 | ProfiliTab.test.jsx (nuovo) |
| CP2 | Drawer + form 6 campi + warning ordine | +3 | 275 | ProfiliTab.test.jsx (append) |
| CP3 | Reducer cases + thunk add/update + selectors | +8 | 283 | reducer.test.js, selectors.test.js, actions.profili.test.js (nuovo) |
| CP4 | deleteProfilo thunk + ConfirmDeleteModal inline | +3 | 286 | actions.profili.test.js, ProfiliTab.test.jsx |
| CP5 | attivaProfilo wrapper | +1 | 287 | actions.profili.test.js |
| **Tot** | — | **+18** | **287** | — |

### 13 AMB-8b consumate (mapping)

| AMB | Consumo |
|---|---|
| A | ProfiliTab lista+drawer, "+ Nuovo" top-right, badge Attivo verde, bottone Attiva drawer |
| B | Form 6 campi tutti required; ordine soft escluso `ora_sonno`; warning inline `role="status"`; duplicati nome non enforced |
| C | 2 reducer cases `SET_PROFILI`/`SET_PROFILO_ATTIVO` (CP3) |
| D | 4 thunk: addProfilo, updateProfilo, deleteProfilo, attivaProfilo (wrapper) |
| E | Guard update: destructuring `{attivo: _drop, ...safePatch}` strippa attivo dal patch |
| F | Delete guard: repo solleva (§6.5), thunk solo cattura; UI disabled+tooltip |
| G | Hook `useUnsavedChanges` **deferito** (Rettifica F1 confermata in impl) |
| H | ConfirmDeleteProfiloModal inline in ProfiliTab.jsx |
| I | `useTheme` applicato da CP1 su tutti gli element form |
| J | `renderWithRealProvider` non esteso (§6.79 rimane) |
| K | 3 selectors: selectProfili, selectProfiloAttivo, selectProfiloById |
| L | CP breakdown 6 CP, target +14-18, bound superiore raggiunto esatto (+18) |
| M | Schema spec invariato (v1.2), tabella profilo_utente §3.4 tal quale |

### Deviazioni §6 introdotte in 8b

- **§6.86** (multi-parte .1-.4): backdrop-click drawer modal-first + tooltip span-wrap + z-index UnsavedChangesModal + scoperta pattern modal-first (click reale bloccato da hit-testing, guard cross-tab opera solo fuori drawer).
- **§6.87**: convenzione test thunk split-per-concern (`actions.profili.test.js` nuovo, coerente con `actions.init.test.js` + `actions.annullaAssunzione.test.js` esistenti).

### File prodotti

**Modificati:**
- `src/state/reducer.js` (+2 case)
- `src/state/actions.js` (+4 thunk addProfilo/updateProfilo/deleteProfilo/attivaProfilo + import selectProfiloById + return bag esteso)
- `src/state/selectors.js` (+3 selectors AMB-K)
- `src/components/config/ProfiliTab.jsx` (placeholder -> componente completo: lista + ProfiloCard + ProfiloDrawer + ConfirmDeleteProfiloModal inline + FormField + computeOrderWarnings helper)
- `src/components/config/ConfigView.jsx` (+1 riga: dirty/setDirty lifted a ProfiliTab)
- `src/components/config/UnsavedChangesModal.jsx` (z-50 -> z-[60], §6.86.3)
- `src/state/reducer.test.js` (+2 test SET_PROFILI/SET_PROFILO_ATTIVO)
- `src/state/selectors.test.js` (+3 test profili selectors)
- `src/components/config/ProfiliTab.test.jsx` (append +3 test CP2 + +1 test CP4, import vi esteso)

**Nuovi:**
- `src/components/config/ProfiliTab.test.jsx` (creato in CP1 con 3 test CP1)
- `src/state/actions.profili.test.js` (creato in CP3 con 3 test, esteso CP4 +2, CP5 +1 = 6 test totali)

**Eliminati:**
- `src/state/actions.js.cp4.bak` (stale backup 8a, rimosso in CP0 pre-implementation)

### Scoperte operative

1. **Drawer modal-first pattern emerge dall'esperienza CP browser** (§6.86.4). Validato contro screenshot viewport desktop 1011px: `fixed inset-0` copre tab bar, hit-testing geometrico dirotta click reali al backdrop. Pattern replicabile per futuri modals (drawer Farmaci 8c, qualunque modal editing sopra tab bar).

2. **Convenzione test thunk split-per-concern** esisteva già ma non documentata (§6.87). Scoperta tramite `ls src/state/*.test.js` in dry-run CP3.

3. **Drift §6.69 pregresso** su §1 entry Changelog: l'ultima entry era v2.5.20.1 al momento dell'apertura 8b impl (gap v2.5.21..v2.5.25 = 5 versioni). Drift totale pre-8b era ben oltre soglia §6.70. Non retrocorretto per principio fatto-storico (coerente con §22.7 scoperta #5). Solo entry 2.5.26 aggiunta in cima al blocco come normale.

4. **Punti CP browser 3-5-6-7 NON eseguiti** manualmente. Coperti dai test unitari (rebuildPlan via `actions.profili.test.js` test 3; activate via test 6; delete via test 4+5). Rischio residuo: regressione UI visiva minore; accettato per chiusura tempestiva sessione.

5. **Anomalia input type="time" diagnosi inconclusiva** (pre-§6.86.4): la digitazione manuale non aggiornava il campo `Nome` (text) anche in assenza di backdrop interference. Possibile interferenza estensione browser (console log mostra `runtime.lastError` da estensioni). Non approfondito — superato dalla decisione modal-first che rende scenario irrilevante. Se riemerge in 8c/8d: apri §6.NN dedicata.

### Azioni sul Mac post-Sessione 8b implementativa

1. Verificare `git status` e committare: `git add -A && git commit -m "Sessione 8b implementativa (Changelog v2.5.26)"`. Preferibilmente 2 commit separati: codice + Changelog, per drift §6.70 pulito.
2. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.26** (questo delivery).
3. Aprire sessione 8c analisi-first con prompt naturale (non one-liner §11; lo stub §11 non è eseguibile): cfr. istruzioni nello stub §11.


## 22.9 Stato post-Sessione 8c analisi-first

**Data:** 23 aprile 2026
**Baseline test:** **287/287** su 28 test files (invariato — sessione analisi pura)
**Bump:** v2.5.26 → v2.5.27

### Scope consegnato

Sessione 8c analisi-first NON produce codice. Produce decisioni congelate che blindano l'implementativa: 14 AMB-8c.A-N + 4 rettifiche F1-F4 + 2 candidate §6.NN per impl + 5 scoperte operative. Template strutturale: §22.7 (Sessione 8b analisi-first), scope guide: §11 v2.5.26 stub.

### O1-O3 risolte (pre-Q)

| O | Scope | Decisione |
|---|---|---|
| **O1** | Asimmetria campi §11 stub vs §6.66/§3.1 | Form completo §6.66 letterale (include `principio_attivo`, `intervallo_minimo_ore`, `dettaglio_pasto`, `descrizione_momento`). §11 stub era compressione narrativa, non esclusione normativa. |
| **O2** | §6.64 nota CP0 su DoseCard delta_minuti | Verifica anticipata OK da §22.3.1 + §6.45 (7d-2p3): DoseCard consuma `entry.delta_minuti` dal log, non ricalcola. CP0 8c mantiene 1 test-gate di conferma (~5 righe). → F4 |
| **O3** | Impatto flip `GET_FARMACI_SOLO_ATTIVI=true` sui 287 test | Non anticipabile senza codebase access. Gate CP0 8c: run full suite post-flip, hotfix intra-sessione se ≤5 rotti, stop+diagnosi se >5. |

### Q1-Q9 risolte (summary)

| Q | Scope | Decisione |
|---|---|---|
| **Q1.a-e** | UX FarmaciTab | Lista+drawer bottom-sheet (8b letterale), "+ Nuovo" top-right, card con badge cronica/temp + `N×/die` + border-left attivo, tap-to-edit, inattivi non visibili, no wrapper `attivaFarmaco` |
| **Q2.a-f** | Form 4 sezioni §6.66 | Scroll continuo H2 sticky, required Q2.b, `intervallo_ore` conditional, soft warning ordine orari wrap-mezzanotte-aware, auto-add/trim righe Orari con undo-banner, `intervallo_minimo_ore` checkbox-gated, scope completo §6.66 |
| **Q3.a-f** | Thunks CRUD | 3 thunk separati pessimistici con `withTransaction`, no guard su `attivo`, `SET_FARMACI` unica action, rebuildPlan sempre |
| **Q4.a-c** | Hook extraction | Estratto ora (DRY-at-3), API `[isDirty, setDirty]` tuple-like, FarmaciTab 1° consumer, retrofit 8d |
| **Q5.a-e** | Delete + data_fine-past | `ConfirmModal` shared promosso al 2° consumer, copy §6.67+§6.68 letterale, no count dosi-oggi, pre-save interceptor data_fine |
| **Q6.a-d** | Lista shape | Lista flat alfabetica, no sezioni cronici/temp, inattivi esclusi (`soloAttivi=true`), no filtri |
| **Q7.a-d** | Test strategy | Target **+22 ±3**, `actions.farmaci.test.js` nuovo (§6.87), `renderWithRealProvider` non esteso, `makeFakeRepo` verifica CP0 |
| **Q8.a-b** | CP breakdown | 7 CP (CP0-CP6), no split pre-pianificato, contingency 8d anticipata |
| **Q9.a-b** | CP0 gates | DoseCard delta_minuti già soddisfatto (§22.3.1 + §6.45), flip test impact gate CP0 + hotfix ≤5 |

### 14 AMB-8c congelate

| AMB | Scope | Congelato |
|---|---|---|
| **A** | UX FarmaciTab | Lista+drawer, "+ Nuovo" top-right, card cronica/temp + `N×/die` + border-left, tap-edit, inattivi non visibili |
| **B** | Form 4 sezioni | Scroll H2 sticky, required+conditional Q2.b, soft warning ordine wrap-aware, `useModalA11y` |
| **C** | Orari dinamici | Auto-add/trim su `dosi_giornaliere`, undo-banner inline (no confirm nested), defaults ancora=colazione/offset=0 |
| **D** | `intervallo_minimo_ore` | Checkbox personalizza; off→null fallback 50%, on→esplicito con validation `< intervallo_ore` |
| **E** | Reducer | 1 sola `SET_FARMACI` (array completo), no action orari separata |
| **F** | Thunks CRUD | `addFarmaco`/`updateFarmaco`/`deleteFarmaco` pessimistici + `withTransaction('rw',['farmaci','orari_base'],fn)` |
| **G** | rebuildPlan trigger | Sempre post-CRUD, no condition profilo |
| **H** | Campo `attivo` rimosso dal form §6.66 | Delete unico canale user-level (candidata §6.88) |
| **I** | Hook `useUnsavedChanges` estratto | `src/hooks/useUnsavedChanges.js`, API `[isDirty, setDirty]` tuple, FarmaciTab 1° consumer, retrofit 8d |
| **J** | `ConfirmModal` shared | `src/components/shared/ConfirmModal.jsx` parametrico, 2° consumer (candidata §6.89) |
| **K** | data_fine-past UX | Pre-save interceptor + `ConfirmModal` con copy §6.68 |
| **L** | Flip `GET_FARMACI_SOLO_ATTIVI=true` | `src/domain/constants.js`, FarmaciTab stesso canale del plan |
| **M** | Test strategy | Target +22 ±3, `actions.farmaci.test.js`, no `renderWithRealProvider` extension |
| **N** | CP breakdown | 7 CP, no split pianificato, contingency 8d anticipata |

### 4 rettifiche F integrate nel prompt impl

| F | Trigger | Rettifica |
|---|---|---|
| **F1** | Q6.c: inattivi non visibili + campo `attivo` form → alias nascosto di delete | Rimozione campo `attivo` dalla sezione Avanzate §6.66 → AMB-H + candidata §6.88 da aprire in CP3 impl |
| **F2** | DRY-at-3 raggiunto (ImpostazioniTab + ProfiliTab + FarmaciTab dirty pattern) | Hook `useUnsavedChanges` estratto ora, non deferito — AMB-I + chiusura AMB-8b.G |
| **F3** | Stesso modal usato in 2 scenari interni stesso tab (delete + data_fine-past) | `ConfirmModal` promosso al 2° consumer (vs 3° canonico AMB-8b.H) → AMB-J + candidata §6.89 da aprire in CP5 impl |
| **F4** | §22.3.1 + §6.45 review | O2 DoseCard delta_minuti check già soddisfatto da 7d-2p3; CP0 8c mantiene solo gate-di-conferma minimo |

### Scoperte operative

1. **`withTransaction` già in place da 8a** (§22.6 + LocalRepository CP1). Zero lavoro repo in 8c lato infrastruttura tx — speculare a 8b (`addProfilo`/`updateProfilo`/`deleteProfilo` già implementati). Pattern consolidato: in 8a si investe in infrastruttura, 8b/8c consumano senza estenderla.

2. **Campo `attivo` su farmaci architetturalmente ridondante lato UX** con soft-delete come unico canale. DB mantiene il flag per discriminare plan-eligible vs deleted, ma l'utente non ne ha bisogno come switch indipendente. Confuta implicitamente §6.66 "Avanzate ... attivo" e produce F1. Caso d'uso futuro "disattiva temporaneamente senza eliminare" → feature "pausa" separata in Log Fase 3, non ripristino del campo in form.

3. **`intervallo_minimo_ore = null` in DB ↔ fallback computed a runtime** è pattern semantico-utile: `null` significa "usa default 50%", non "valore assente". Permette di distinguere default-implicito da override-esplicito senza raddoppiare colonne.

4. **§6.67 completato, non deviato.** §6.67 descriveva flip + delete sul plan ma non specificava comportamento FarmaciTab lista per farmaci inattivi. Q6.c risolve a favore di coerenza (stesso canale `soloAttivi=true`). Completamento di §6.67 su dimensione non trattata, non deviazione.

5. **Drift §6.69 pregresso invariato** rispetto a §22.7 (scoperta #5) e §22.8 (scoperta #3). Entry 2.5.27 aggiunta in continuità posizionale con 2.5.26 (tra block 2.5.21 e block 2.5.20.1). Non retrocorretto per principio fatto-storico immutabile.

### Deviazioni §6.NN introdotte

**Nessuna in 8c analisi-first** (sessione analisi pura, zero codice). Due candidate dichiarate per implementativa:

- **§6.88 candidata** (rimozione campo `attivo` dal form §6.66) — da aprire al primo commit CP3 impl con rationale F1.
- **§6.89 candidata** (`ConfirmModal` shared promosso al 2° consumer) — da aprire al primo commit CP5 impl con rationale F3.

Se emergeranno hotfix CP0 (flip impact >5 test) o gap `makeFakeRepo`, §6.90+ dedicate in implementativa.

### File prodotti / NON prodotti

**Prodotti (modificati):**
- `PharmaTimer_Changelog_Fase2.md` v2.5.26 → v2.5.27: bump front-matter + nuova entry 2.5.27 + §11 sostituita (stub → prompt esecutivo 8c implementativa) + §22.9 append.

**NON prodotti (per definizione, analisi-first):**
- Nessun file di codice sorgente.
- Nessun file test.
- Nessun hotfix script.

### Azioni sul Mac post-Sessione 8c analisi-first

1. Verificare `git status` pulito sul branch 8 (nessun file codice 8c previsto — solo il Changelog deve muoversi).
2. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB del progetto Claude con la versione **v2.5.27** (questo delivery).
3. Opzionale raccomandato: `git add PharmaTimer_Changelog_Fase2.md && git commit -m "Changelog v2.5.27 (Sessione 8c analisi-first)"`.
4. Aprire Sessione 8c implementativa con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8c implementativa).`


## 22.10 Stato post-Sessione 8c implementativa (parziale CP1-CP4)

**Data:** 24 aprile 2026
**Baseline test pre-sessione:** 287/287 su 28 test files (§22.9 post-analisi-first).
**Baseline test post-sessione:** **297/297 su 30 test files** (+10 netti, +2 test files).
**Bump:** v2.5.27 → v2.5.28.

### Scope consegnato

Sessione 8c implementativa aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8c implementativa)` consumando prompt §11 v2.5.27. Completati **CP0 sanity + CP1 flip + CP2 lista + CP3 drawer+form + CP4 sezione Orari + hook extraction**. CP5 (thunks + ConfirmModal + delete + data_fine-past) e CP6 (browser) delegati a 8c-2 contingency per preservare qualità (decisione runtime coerente con §11 note finali v2.5.27).

### Esiti CP gate-by-gate

| CP | Scope | Esito | Δ test |
|----|-------|-------|--------|
| **CP0** | 6 gate sanity + cleanup .bak | ✅ Tutti verdi dopo scoperta §6.90 (SET_FARMACI preesistente). 19 file `.bak` rimossi (CP2 pre-work). | 0 |
| **CP1** | Flip `GET_FARMACI_SOLO_ATTIVI = true` | ✅ 287/287 invariati (zero rotti — consumer unico `init()`). | 0 |
| **CP2** | FarmaciTab lista + `selectFarmaci` | ✅ 3 test verdi al 1° run. | +3 |
| **CP3** | Drawer + form 3 sezioni + ConfigView props wire | ✅ 3 test verdi al 1° run. §6.88 consumata. Intrusione "script fantasma" su modals rimediata con `git checkout src/components/oggi/modals/`. | +3 |
| **CP4** | Hook `useUnsavedChanges` + sezione Orari + rehydration + wrap-aware warning | ✅ 4 test verdi al 1° run (1 hook + 3 FarmaciTab). | +4 |

### Deviazioni §6.NN consumate / aperte

- **§6.88** — Rimozione campo `attivo` dal form farmaco. Consumata inline al commit CP3. Rationale F1 / AMB-8c.H.
- **§6.90** — `SET_FARMACI` case + test preesistenti da 8a CP4. Scoperta CP0 gate 3c. Documentale (no codice). Target finale rivisto 309±3 → **308±3**.
- **§6.91** — Badge "Temporaneo" usa `t.orange` (non amber letterale). Rationale token-completeness. Scelta utente confermata opzione A (orange, consigliata).
- **§6.89** — (candidata, non ancora aperta) Promozione `ConfirmModal` shared al 2° consumer. Riservata per CP5 in 8c-2.

### Scoperte operative

1. **`.bak` residui pervasivi** — 19 file con suffissi cp1..cp7 / hotfix / hotfixbug in `src/test/`, `src/components/config/`, `src/data/repository/`, `src/state/`. Residui di sessioni 8a/8b non rimossi. Grep-fantasma creò rumore nel CP0 gate 3c (un `.bak` faceva match su `SET_FARMACI`). Cleanup globale `find src -name '*.bak' -delete` in apertura CP2. Lezione: aggiungere alias zsh o step `nettoBak` in template gate CP0 futuri.

2. **`computeOraPrevista` già esportata pura** da `src/domain/planBuilder.js:7` (re-export backward-compat). Import diretto evita re-implementazione logica wrap-mezzanotte. Coerente con scelta utente "helper pure inline" (le opzioni UI helper e import dominio sono compatibili).

3. **`state.profiloAttivo` ambiguous contract** — il selettore `selectProfiloAttivo` ritorna `state.profiloAttivo` ma non è chiaro se sia ID o oggetto. Workaround defensivo: `state.profili.find(p => p.attivo === 1) ?? state.profili[0]`. Candidato chiarimento 8d o documentazione §1.

4. **Intrusione "script fantasma" CP3** — Roberto ha lanciato per errore un installer precedente (versione stale di `cp3_install.sh` renominato da Chrome come `cp3_install (1).sh` o simile). Effetto: 9 file modals modificati + 5 test persi. Rimedio in-flight: `git checkout src/components/oggi/modals/` + rm file corrotto + re-run installer corretto. Lezione: `head -4 ~/Downloads/cp3_install.sh` check prima di `bash` ha salvato la situazione.

5. **`sticky top-0` + `overflow-y-auto`** del drawer richiede che l'ancestor H2 sia dentro lo scroll container, quindi `-mx-5 px-5` per bleeding full-width (coerente con mobile-first). Nessun problema rilevato ma pattern-da-ricordare per SectionHeading shared in 8d.

### File prodotti / NON prodotti

**Prodotti (modificati):**
- `src/domain/constants.js` — 1 riga flip (CP1).
- `src/state/selectors.js` — `selectFarmaci` append (CP2).
- `src/components/config/FarmaciTab.jsx` — riscrittura integrale CP2→CP3→CP4 (~870 righe).
- `src/components/config/ConfigView.jsx` — 1 riga wire `dirty/setDirty` su Route farmaci (CP3).
- `PharmaTimer_Changelog_Fase2.md` — v2.5.27 → **v2.5.28** (questo delivery).

**Prodotti (nuovi):**
- `src/components/config/FarmaciTab.test.jsx` — 9 test (3 CP2 + 3 CP3 + 3 CP4).
- `src/hooks/useUnsavedChanges.js` — 15 righe.
- `src/hooks/useUnsavedChanges.test.jsx` — 1 test (6 asserzioni).

**NON prodotti (scope 8c-2):**
- `src/components/shared/ConfirmModal.jsx`
- 3 thunks in `src/state/actions.js`
- `src/state/actions.farmaci.test.js`
- Test `selectFarmacoById` in `selectors.test.js`
- Delete button wiring + data_fine-past interceptor in FarmaciTab

### Azioni sul Mac post-Sessione 8c (parziale)

1. Verificare `git status` atteso: 4 M (`constants.js`, `selectors.js`, `FarmaciTab.jsx`, `ConfigView.jsx`) + 3 ?? (`FarmaciTab.test.jsx`, `useUnsavedChanges.js`, `useUnsavedChanges.test.jsx`).
2. **Commit consigliato (split codice + Changelog, pattern 8b §6.70 drift-preventive):**
   ```
   git add src/domain/constants.js src/state/selectors.js \
           src/components/config/FarmaciTab.jsx \
           src/components/config/FarmaciTab.test.jsx \
           src/components/config/ConfigView.jsx \
           src/hooks/useUnsavedChanges.js \
           src/hooks/useUnsavedChanges.test.jsx
   git commit -m "Sessione 8c CP1-CP4 parziale: flip + lista + drawer + hook + orari (287→297)"
   ```
3. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude con la versione **v2.5.28** (questo delivery).
4. Commit Changelog separato:
   ```
   git add PharmaTimer_Changelog_Fase2.md
   git commit -m "Changelog v2.5.28 (Sessione 8c parziale CP1-CP4)"
   ```
5. Aprire **Sessione 8c-2 contingency** con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8c-2 contingency).`


## 22.11 Stato post-Sessione 8c-2 contingency (CP5+CP6 completamento 8c)

**Data:** 24 aprile 2026
**Baseline test pre-sessione:** 297/297 su 30 test files (§22.10 post-8c CP1-CP4).
**Baseline test post-sessione:** **306/306 su 31 test files** (+9 netti, +1 test file).
**Bump:** v2.5.28 → v2.5.29. Step 8c **chiuso** (via 8c + 8c-2).

### Scope consegnato

Sessione 8c-2 contingency aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8c-2 contingency)` consumando prompt §11 v2.5.28. Completati **CP0 sanity-light + CP5 thunks/ConfirmModal/delete/data_fine-past + CP6 CP browser 7 punti** (con hotfix §6.95 intra-CP6). Tutti gli obiettivi del prompt §11 v2.5.28 raggiunti.

### Esiti CP gate-by-gate

| CP | Scope | Esito | Δ test |
|----|-------|-------|--------|
| **CP0** | 3 gate sanity-light (git / test / naming clash) | ✅ Tutti verdi al primo tentativo. Confirmata assenza clash `ConfirmModal` + `addFarmaco/updateFarmaco/deleteFarmaco`. | 0 |
| **CP5** | Thunks CRUD + ConfirmModal shared + delete + data_fine-past | ✅ 9 test verdi al 1° run (6 actions + 2 FarmaciTab + 1 selectors). 4 deviazioni §6.NN consumate/aperte (§6.89 parziale + §6.92/6.93/6.94 nuove). Zero hotfix intra-CP5. Commit separato `dda9af7`. | +9 |
| **CP6** | CP browser 7 punti + hotfix §6.95 | ✅ Tutti e 7 i punti verdi. Scoperta §6.95 al punto 4 (plan entries = 0 per nuovo farmaco post-addFarmaco) → diagnosi stateRef-bypass → helper `rebuildPlanFromFresh` → fix applicato → replay punto 4 verde. Commit separato `06dc680`. 3 §6.NN aggiuntive emerse non-blocker (§6.96/6.97/6.98, candidati 8d). | 0 (fix invariante sui test sandbox) |

### Deviazioni §6.NN consumate / aperte in questa sessione

**Consumate in CP5:**
- **§6.89** (parziale) — ConfirmModal shared promozione 2° consumer. FarmaciTab delete + data_fine-past via `ConfirmModal` shared. ProfiliTab retrofit pending 8d.
- **§6.92** — `useModalA11y` mount nel ConfirmModal shared (asimmetria con `ConfirmDeleteProfiloModal` predecessore, retrofit 8d).
- **§6.93** — Rifetch orari nei thunks farmaci oltre a farmaci (coerenza post-`replaceOrariForFarmaco`).
- **§6.94** — `defaultNoopActions()` esteso con 3 thunks farmaci (scope-minimal; profili/annullaAssunzione retrofit 8d).

**Consumate in CP6 (hotfix):**
- **§6.95** — `rebuildPlanFromFresh` bypass stateRef stale nei thunks farmaci. Scoperta browser punto 4. Nota architetturale: `updateProfilo` pattern analogo non-emergente, retrofit preventivo 8d.

**Scoperte in CP6, aperte pending 8d (non-blocker):**
- **§6.96** — Sticky separator `/oggi` top: 180px hardcoded (retrofit CSS var/observer).
- **§6.97** — DoseCard copy mismatch `relazione_pasto='indifferente'` → "lontano dai pasti" (bug pregresso, invisibile nel seed perché nessun farmaco usa `indifferente`).
- **§6.98** — UnsavedChangesModal guard non scatta su `FarmacoDrawer` close path (lapsus porting da ProfiliTab, ~10 righe retrofit 8d).

### Scoperte operative (non §6.NN)

1. **Trim concatenato `dosi_giornaliere`** (es. 2→3→1) sovrascrive `removedOrari` invece di cumulare. Undo ripristina solo ultimo trim. Design choice CP4 8c (non bug): il prompt §11 testa trim singolo. Se emergesse come UX problem futuro, sessione dedicata.

2. **ConfirmModal cancel preserva form dirty by design.** L'utente può rivedere il campo che ha triggerato il modal senza perdere altri dirty. Lo state IDB non è toccato. Non è §6.NN, solo pattern da ricordare.

3. **Drawer backdrop blocca cambio-tab fisicamente** (punto 7 UnsavedChanges cross-tab). Il click sull'area del tab-bar Config è assorbito dal backdrop z-50 del drawer. Guard UnsavedChanges "by design" in quanto drawer è modale preventivo. La guard rimane rilevante solo per navigation diretta (URL bar, back button hardware) — non testato in CP6 (assunto equivalente).

4. **Seed pre-esistenti `data_fine` in alcuni farmaci** (Medrol 16mg=2026-04-19, Prontinal aerosol=2026-04-18, Levotuss=2026-04-16) già nel passato rispetto alla data attuale (2026-04-24). Mostrano il badge "Temporaneo" correttamente ma sono esclusi dal plan della vista Oggi. Comportamento corretto; da verificare in 8d se vogliamo flagging visivo ulteriore "scaduto" (scope feature, no deviazione).

### File prodotti / NON prodotti

**Prodotti (nuovi):**
- `src/components/shared/ConfirmModal.jsx` — 108 righe.
- `src/state/actions.farmaci.test.js` — 210 righe, 6 test.

**Prodotti (modificati):**
- `src/state/actions.js` — +154 righe (3 thunks + helper `rebuildPlanFromFresh` §6.95).
- `src/state/selectors.js` — +20 righe (`selectFarmacoById`).
- `src/components/config/FarmaciTab.jsx` — +172 righe (handleSalva + normalizeForm + ConfirmModal wire + Elimina button).
- `src/components/config/FarmaciTab.test.jsx` — +89 righe (2 test e2e CP5).
- `src/state/selectors.test.js` — +20 righe (1 test).
- `src/test/renderHelpers.jsx` — +10 righe (§6.94 defaultNoopActions).
- `PharmaTimer_Changelog_Fase2.md` — v2.5.28 → **v2.5.29** (questo delivery).

**NON prodotti (scope 8d):**
- Retrofit `ConfirmDeleteProfiloModal` → `ConfirmModal` shared in ProfiliTab (§6.89 parte 2).
- Retrofit `useModalA11y` in ProfiliTab modal (§6.92).
- Retrofit `defaultNoopActions()` con thunks profili/annullaAssunzione (§6.94 parte 2).
- Retrofit preventivo `updateProfilo` a `rebuildPlanFromProfilo` (§6.95 preventivo).
- Fix §6.96 / §6.97 / §6.98 (scoperte browser CP6).

### Azioni sul Mac post-Sessione 8c-2

1. Stato git corrente: 2 commit separati già effettuati (`dda9af7` CP5 + `06dc680` CP6 hotfix §6.95).
2. **Commit Changelog separato:**
   ```
   git add PharmaTimer_Changelog_Fase2.md
   git commit -m "Changelog v2.5.29 (Sessione 8c-2 contingency)"
   ```
3. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude con la versione **v2.5.29** (questo delivery).
4. Verifica finale stato git:
   ```
   git log --oneline -5
   ```
   Atteso (top 5):
   - `<hash>` Changelog v2.5.29 (Sessione 8c-2 contingency)
   - `06dc680` Sessione 8c-2 CP6 hotfix §6.95: rebuildPlanFromFresh nei thunks farmaci (stateRef-bypass)
   - `dda9af7` Sessione 8c-2 CP5: thunks farmaci CRUD + ConfirmModal shared + delete + data_fine-past (297->306)
   - `d3f617c` Changelog v2.5.28 (Sessione 8c parziale CP1-CP4)
   - (commit 8c parziale CP1-CP4)
5. Aprire **Sessione 8d — polish Config + retrofit candidate 8a-8c** con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8d).`


## 22.12 Stato post-Sessione 8d analisi-first

**Data:** 24 aprile 2026
**Baseline test pre-sessione:** 306/306 su 31 test files (§22.11 post-8c-2).
**Baseline test post-sessione:** **306/306 su 31 test files** (invariata — zero codice toccato, solo documentale).
**Bump:** v2.5.29 → v2.5.30. Step 8d **split in 8d-A + 8d-B** (§6.99).

### Scope consegnato

Sessione 8d analisi-first aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8d).` consumando prompt §11 v2.5.29. Eseguita in un singolo turno di discussione: 5 AMB-8d.A-E congelate + split sessione formalizzato. Zero codice prodotto; solo deliverable documentale (questo Changelog v2.5.30).

### Esiti CP0

| Gate | Scope | Esito |
|------|-------|-------|
| **Gate 1** | `git status` + `git log -1` | ✅ Tree clean su branch `step-8`. Ultimo commit `f00b5d0 Changelog v2.5.29 (Sessione 8c-2 contingency)`. |
| **Gate 2** | `npm test -- --run` | ✅ **306/306 su 31 test files** in 5.99s. 2 warning React Router visibili (confermano §6.84 riproducibile in test, target CP1 8d-A). |
| **Gate 3** | `grep candidate 8d / candidato 8d` | ✅ 19 occorrenze (atteso ≥ 8). Tutti i 9 retrofit coperti + §6.85 outlier segnalato. |

### AMB-8d.A-E congelate

| ID | Decisione | Ratifica |
|----|-----------|----------|
| **AMB-8d.A** | Split 8d → 8d-A (tier A+B) + 8d-B (tier C + §6.85) | ✅ Roberto diretta |
| **AMB-8d.B** | §6.96 approach = CSS var `--app-header-height` + ResizeObserver | ✅ Roberto diretta |
| **AMB-8d.C** | §6.94 bag noop = tutti i 5 thunks (`addProfilo/updateProfilo/deleteProfilo/attivaProfilo/annullaAssunzione`) | ✅ Roberto diretta |
| **AMB-8d.D** | §6.95 retrofit `updateProfilo` = proattivo (coherence defence) | ✅ Roberto diretta |
| **AMB-8d.E** | §6.85 scope = include in 8d-B tier C (investigation) | ✅ Roberto diretta |

### Deviazioni §6.NN aperte / consumate

**Nuova:**
- **§6.99** — Split Sessione 8d in 8d-A (tier A+B, pattern-based) + 8d-B (tier C + §6.85, design-decision + investigation). Deviazione procedurale, zero impatto codice.

**Consumate:** nessuna (sessione analisi-first).

**Pending su 8d-A:** §6.84 (CP1), §6.94 (CP2), §6.97 (CP3), §6.98 (CP4), §6.89+§6.92 (CP5), §6.95 (CP6).

**Pending su 8d-B:** §6.81, §6.96 (AMB-8d.B già congelata → direct impl), §6.85 (AMB-8d.E investigation).

### Scoperte analisi

1. **§6.85 outlier sanato.** Il prompt §11 v2.5.29 elencava §6.81, §6.84, §6.89, §6.92, §6.94, §6.95, §6.96, §6.97, §6.98 tra i prerequisiti di lettura ma ometteva §6.85 ("candidate 8d investigation" esplicito in §6.85:1871 e §22.6:3745). Lapsus di scrittura, non scope deliberato. Ratificato AMB-8d.E include in 8d-B.

2. **§6.99 pattern.** Prima "deviazione procedurale" documentata come §6.NN di categoria scope-split (precedenti analoghi: split 7d → 7d-1 + 7d-2, split 7d-2 in 3 parti, split 8c → 8c-2 contingency — ma nessuno aveva §6.NN dedicata; erano solo righe §7). Stabilisce precedente: da qui in avanti, ogni split formale di sessione va §6.NN-tracciato.

3. **Warning React Router riproducibili nei test.** Gate 2 CP0 ha mostrato i 2 warning `v7_startTransition` + `v7_relativeSplatPath` su `ConfigTabBar.test.jsx` + `ConfigView.test.jsx` (stderr). Conferma §6.84 è fix zero-cost + high-impact (pulizia test output), giusto candidato CP1 8d-A.

### File prodotti / NON prodotti

**Prodotti (modificati):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.29 → **v2.5.30** (questo delivery).

**Prodotti (nuovi):** nessuno (sessione analisi-first).

**NON prodotti (scope 8d-A):** tutti i retrofit codice — vedi §11 per breakdown CP1-CP6.
**NON prodotti (scope 8d-B):** investigation §6.85 + design review §6.81 + impl §6.96.

### Azioni sul Mac post-Sessione 8d analisi-first

1. Stato git corrente: tree clean, ultimo commit `f00b5d0`.
2. **Commit Changelog separato** (solo questo file):
   ```
   cd ~/Sviluppo/pharmatimer
   git add PharmaTimer_Changelog_Fase2.md
   git commit -m "Changelog v2.5.30 (Sessione 8d analisi-first)"
   ```
3. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude con la versione **v2.5.30** (questo delivery).
4. Verifica finale stato git:
   ```
   git log --oneline -3
   ```
   Atteso (top 3):
   - `<hash>` Changelog v2.5.30 (Sessione 8d analisi-first)
   - `f00b5d0` Changelog v2.5.29 (Sessione 8c-2 contingency)
   - `06dc680` Sessione 8c-2 CP6 hotfix §6.95: rebuildPlanFromFresh nei thunks farmaci (stateRef-bypass)
5. Aprire **Sessione 8d-A impl** (nuova conversazione Claude) con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8d-A).`


## 22.13 Stato post-Sessione 8d-A parziale (CP1-CP3)

**Data:** 24 aprile 2026
**Baseline test pre-sessione:** 306/306 su 31 test files (§22.12 post-8d analisi-first).
**Baseline test post-sessione:** **307/307 su 31 test files** (+1 netto da CP3 regression guard).
**Bump:** v2.5.30 → v2.5.31. Sessione **parziale**: 3 CP su 6 eseguiti, 4 CP+CP7 deferred a **8d-A-continue**.

### Scope consegnato

Sessione 8d-A impl aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8d-A).` consumando prompt §11 v2.5.30. Eseguiti CP1, CP2, CP3 in sequenza. Chiusa anticipatamente dopo CP3 per stanchezza operatore (~2h20min di lavoro + hang CP1 di 26+ min che ha prosciugato attenzione). Pattern §6.99-style "continue session".

### Esiti CP0

| Gate | Scope | Esito |
|------|-------|-------|
| **Gate 1** | `git status` + `git log -1` | ✅ Tree clean su branch `step-8`. Ultimo commit `f1dca3c Changelog v2.5.30`. |
| **Gate 2** | `npm test -- --run` | ✅ **306/306 su 31 test files** in 6.37s. 2 warning React Router confermati (conferma §6.84 target CP1). |
| **Gate 3** | sanity grep § + AMB-8d | ✅ 89 occorrenze §6.NN target (≥ 20), 30 occorrenze AMB-8d (≥ 10). Allineato v2.5.30. |

### CP completati

| CP | §6.NN | Δ test | Commit | Note |
|----|-------|--------|--------|------|
| **CP1** | §6.84 | 0 | `2d79055` | Scope ridotto ad app-only. Hang full suite su tentativo estensione test router → rollback. Dettagli §6.100. Test router deferred a 8d-B. |
| **CP2** | §6.94 (AMB-8d.C) | 0 | `98cb25f` | +5 thunks noop in `defaultNoopActions()`. Pattern `async () => ({...})` coerente (non `vi.fn()`). Commento header aggiornato. Zero regressioni 306/306. |
| **CP3** | §6.97 | +1 | `ace1ed2` | **Riscoped da fix a regression guard**. Git blame conferma bug non riproducibile (branch `indifferente` dal commit `1c900064` del 19 apr). §6.97 chiusa. Dettagli §6.101. 306 → 307. |

### CP deferred a 8d-A-continue

| CP | §6.NN | Δ test atteso | Note |
|----|-------|---------------|------|
| **CP4** | §6.98 | +2 | FarmacoDrawer UnsavedChanges guard. Pattern `ProfiliTab::handleClose` (§6.86.3). ~10 righe + 2 test. |
| **CP5** | §6.89+§6.92 | 0-1 | ProfiliTab retrofit `ConfirmDeleteProfiloModal` inline → `ConfirmModal` shared. Auto-risolve asimmetria a11y §6.92. |
| **CP6** | §6.95 | +1 | Proactive `updateProfilo` retrofit `rebuildPlanFromFresh` (AMB-8d.D coherence defence). ~5 righe + 1 test. |
| **CP7** | — | 0 | Bump v2.5.31 → v2.5.32 + browser checklist ridotta + commit finale. |

Target 8d-A-continue: 307 → 310-311 (+3 a +4). Commit attesi: 4 (CP4-CP6 + Changelog).

### Deviazioni §6.NN aperte / consumate / chiuse

**Nuove:**
- **§6.100** — CP1 scope app-only + test router deferred 8d-B (hang full suite su MemoryRouter future flag).
- **§6.101** — CP3 riscope fix → regression guard + chiusura §6.97 (bug non riproducibile, diagnosi via git blame).

**Consumate (parziale):**
- **§6.94** (CP2) — completata AMB-8d.C (bag noop full symmetry).

**Chiuse:**
- **§6.97** — non riproducibile nel codice, regression guard aggiunto. Rimando a §6.101.

**Pending su 8d-A-continue:** §6.98 (CP4), §6.89+§6.92 (CP5), §6.95 (CP6).
**Pending su 8d-B:** §6.81, §6.96 (AMB-8d.B), §6.85 (AMB-8d.E), **§6.84 test router retrofit** (aggiunto da §6.100).

### Scoperte

1. **Hang deterministico `future={{ v7_startTransition: true }}` + vitest.** Applicato a `MemoryRouter` in `renderHelpers.jsx` causa hang >26min della full suite, mentre subset 2-file (ConfigTabBar+ConfigView) passa. Patologia non bisecata per costo/beneficio. Documentata come §6.100 per investigazione 8d-B.

2. **§6.97 bug fantasma.** Git blame conferma la "correzione" era già in codice dalla creazione (commit `1c900064`, 19 apr, Sessione 7b-1). L'osservazione in 8c-2 CP6 punto 4 rimane non spiegata: ipotesi residue (stale cache, errore osservazione, transient state) non falsificabili. Lesson: per bug report da CP browser, validare riproducibilità con diagnosi codice-side **prima** di committare a retrofit multi-CP.

3. **Pattern invariance `defaultNoopActions()`.** Prompt §11 CP2 prescriveva `vi.fn()`, codice pre-esistente usava `async () => ({...})`. Scelta locale coerenza silenziosa (non §6.NN-tracciata per micro-invarianza self-evident). Regola implicita: pattern invariance vince su prompt letterale quando l'output è semanticamente equivalente e il pattern locale è uniforme.

### File prodotti / modificati

**Modificati (code):**
- `src/main.jsx` — future flags su BrowserRouter (CP1).
- `src/test/renderHelpers.jsx` — +5 thunks noop (CP2).
- `src/components/oggi/DoseCard.test.jsx` — +1 describe block regression guard (CP3).

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.30 → **v2.5.31** (questo delivery).

**Nuovi:** nessuno.

### Azioni sul Mac post-Sessione 8d-A parziale

1. Stato git corrente: tree clean, commit top `ace1ed2` CP3.
2. **Commit Changelog separato** (solo questo file):
   ```
   cd ~/Sviluppo/pharmatimer
   git add PharmaTimer_Changelog_Fase2.md
   git commit -m "Changelog v2.5.31 (Sessione 8d-A parziale, CP1-CP3)"
   ```
3. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude con la versione **v2.5.31** (questo delivery).
4. Verifica finale stato git:
   ```
   git log --oneline -5
   ```
   Atteso (top 5):
   - `<hash>` Changelog v2.5.31 (Sessione 8d-A parziale, CP1-CP3)
   - `ace1ed2` Sessione 8d-A CP3 §6.97: DoseCard regression guard per relazione_pasto=indifferente (riscoped da fix a guard, bug non riproducibile)
   - `98cb25f` Sessione 8d-A CP2 §6.94: defaultNoopActions completamento (5 thunks profili + annullaAssunzione)
   - `2d79055` Sessione 8d-A CP1 §6.84: React Router v7 future flags opt-in (app router only; test router deferred)
   - `f1dca3c` Changelog v2.5.30 (Sessione 8d analisi-first)
5. Aprire **Sessione 8d-A-continue** (nuova conversazione Claude) con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8d-A-continue).`


## 22.14 Stato post-Sessione 8d-A-continue parziale (CP4-CP6)

Sessione 8d-A-continue aperta 24/04/2026 alle 21:53 circa come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8d-A-continue)` consumando prompt §11 v2.5.31. Completati **CP0 sanity-light + CP4 §6.98 + CP5 §6.89+§6.92 + CP6 §6.95 (§6.102)** con 1 hotfix pre-commit intra-CP4. **CP7 NON eseguito** per blocker §6.104 scoperto in browser check.

### Δ rispetto al prompt §11 v2.5.31

| CP | Prompt | Eseguito | Δ test |
|---|---|---|---|
| **CP0** | 3 gate sanity | ✅ Tutti verdi (working tree pulito, 307/307 test, 3 commit 8d-A CP1-CP3 presenti) | — |
| **CP4** | §6.98 FarmacoDrawer UnsavedChanges guard, +2 test | ✅ Refactor `handleAnnulla` split in `doAnnulla` (silent) + `handleAnnulla` (dirty-gated). 1 hotfix pre-commit (test selector `getByText` → `getByRole heading` per disambiguare h3 vs p con stesso fragment testuale). Commit `30b01ce`. | +2 (307 → 309) |
| **CP5** | §6.89+§6.92 ProfiliTab retrofit, 0-1 test | ✅ Dead-code removal `ConfirmDeleteProfiloModal` (54 righe) + retrofit `<ConfirmModal>` shared, copy 1:1 preservata. Δ test 0 (adattamento 2 testid `confirm-delete-profilo` → `confirm-modal`). §6.92 auto-risolta (ConfirmModal shared monta `useModalA11y`). Commit `f316e6c`. | 0 (309 → 309) |
| **CP6** | §6.95 proactive updateProfilo, +1 test | ✅ Generalizzato `rebuildPlanFromFresh` a `{profilo?, farmaci?, orari?}` (§6.102). `updateProfilo` usa `await rebuildPlanFromFresh({profilo: nuovoProfiloAttivo})` invece di `await rebuildPlan()`. Nuovo test (7) con `vi.mock` planBuilder verifica profilo fresco vs stateRef stale. Commit `264ab1c`. | +1 (309 → 310) |
| **CP7** | Browser check + Changelog bump v2.5.32 | ❌ **Blocker §6.104**. Browser check tap tab Profili da `/config/farmaci` → URL `/config/farmaci/profili/impostazioni/impostazioni/...` → rate limit Chrome + `Maximum update depth exceeded`. Root cause pre-esistente CP1 §6.84 (`v7_relativeSplatPath: true` interaction con ConfigView/ConfigTabBar path relativi). Bump Changelog eseguito parzialmente (questa entry) come v2.5.32 parziale documenta fino a CP6 + §6.104. | — |

### AMB consumate / congelate

Nessuna nuova AMB aperta. AMB consumate:
- **AMB-8d.D** (CP6): §6.95 retrofit `updateProfilo` proattivo ✅ applicato come generalizzazione helper §6.102.
- **AMB-8c.I** (CP4): `useUnsavedChanges` hook API riconfermata — FarmacoDrawer usa `isDirty` memo locale (non `_isDirty` del hook) come source-of-truth per il guard (hook rimane usato solo per `setDirty` propagato a parent/ConfigView).

### Deviazioni aperte/chiuse

**Nuove §6.NN aperte (da docs in questo Changelog):**
- **§6.102** — `rebuildPlanFromFresh` signature extension (CP6 AMB-8d.D impl).
- **§6.103** — UnsavedChangesModal 2° consumer → candidate `useModalA11y` retrofit (CP4 emergenza docs-only, impl 8d-B tier C).
- **§6.104** — ConfigView routing loop (interazione v7_relativeSplatPath ↔ ConfigView/ConfigTabBar v6-style path resolution). Pre-esistente CP1 §6.84. Fix scope 8d-A-continue-2.

**§6.NN consumate/chiuse:**
- **§6.98** — FarmacoDrawer UnsavedChanges guard (CP4). CHIUSA.
- **§6.89** (2° parte) — ConfirmModal shared promozione consumer pieno in ProfiliTab (CP5). CHIUSA (era parziale da 8c-2 CP5).
- **§6.92** — `useModalA11y` asimmetria ConfirmModal vs ConfirmDeleteProfiloModal (CP5). CHIUSA automaticamente via retrofit §6.89.

### Rettifiche di riferimento inline (no §6.NN)

Prompt §11 v2.5.31 presentava 2 imprecisioni minori, annotate nei commenti codice:
1. **CP4 "Pattern di riferimento: ProfiliTab::handleClose (8b CP7, §6.86.3)"** — ProfiliTab non ha `handleClose` (solo `handleAnnulla` + `closeDrawer`). ProfiliTab.handleAnnulla fa silent restore + close, NON prompt-on-dirty. §6.86.3 è z-index bump UnsavedChangesModal. Precedente effettivo = ConfigView cross-tab guard (consumer 1 del modal).
2. **CP6 "Dopo dispatch APPLY_CAMBIO_PROFILO"** — updateProfilo dispatcha `SET_PROFILO_ATTIVO`. APPLY_CAMBIO_PROFILO è in `cambiaProfilo` (flow diverso, usa `ricalcolaPianoDaProfilo` non `buildMultiDayPlan`).

### Test delta finale

**307 → 310** (+3 netti, target §11 v2.5.31 "310-311, +3 a +4" range centrato al minimo). 31 test files invariati (eventuale 32° test file per test router §6.100 deferred a 8d-B).

### File toccati (code-side, già tracciati in §12)

- `src/components/config/FarmaciTab.jsx` (+37 righe, refactor handleAnnulla + mount UnsavedChangesModal)
- `src/components/config/FarmaciTab.test.jsx` (+56 righe, 2 test nuovi + hotfix selector)
- `src/components/config/ProfiliTab.jsx` (-58 righe netti, dead-code removal + retrofit)
- `src/components/config/ProfiliTab.test.jsx` (+2 righe, adattamento testid + commento)
- `src/state/actions.js` (+28 righe, rebuildPlanFromFresh generalization + commenti)
- `src/state/actions.profili.test.js` (+61 righe, vi.mock + test coherence)

Totale: 6 file modificati, netto +126 righe code (prevalentemente commenti §6.102 verbosi per tracciabilità).

### Blocker §6.104 — contesto per 8d-A-continue-2

**Non-blocker per CP4/5/6 committati.** I 3 commit sono sani, test verdi, logica corretta. §6.104 isola il shell di navigazione Config (ConfigView + ConfigTabBar), i tab funzionano correttamente se raggiunti direttamente via URL o al primo load (default `/config/impostazioni`).

**Workaround temporaneo scartato:** downgrade `v7_relativeSplatPath: false` in `src/main.jsx` ripristinerebbe v6 ma annullerebbe §6.84. Preservare §6.84, fix proper in 8d-A-continue-2 (path absolute o `useResolvedPath`).

**Scope 8d-A-continue-2:** analisi-first (3 AMB: strategia fix, scope audit, test coverage) → impl → browser check completo (5 punti incluso regression §6.104) → bump v2.5.33.

### Prossimi passi Mac-side

1. Confermare `git log --oneline -5`:
   - `264ab1c` Sessione 8d-A-continue CP6 §6.95: updateProfilo proactive rebuildPlanFromFresh (coherence defence)
   - `f316e6c` Sessione 8d-A-continue CP5 §6.89+§6.92: ProfiliTab retrofit ConfirmModal shared + a11y
   - `30b01ce` Sessione 8d-A-continue CP4 §6.98: FarmacoDrawer UnsavedChanges guard su handleAnnulla
   - `44fd3fa` Changelog v2.5.31 (Sessione 8d-A parziale, CP1-CP3)
   - `ace1ed2` Sessione 8d-A CP3 §6.97: DoseCard regression guard per relazione_pasto=indifferente (riscoped da fix a guard, bug non riproducibile)
2. Working tree pulito post-commit CP6.
3. Caricare il Changelog v2.5.32 nella KB Claude.ai (sostituisce il precedente).
4. Aprire **Sessione 8d-A-continue-2** (nuova conversazione Claude) con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8d-A-continue-2).`



## 22.15 Stato post-Sessione 8d-A-continue-2

Sessione 8d-A-continue-2 aperta 25/04/2026 come one-liner di ripresa post-pausa: `Riprendi Sessione 8d-A-continue-2 da Punto 4 CP7 browser check. Stato: CP1 committato (67937e5), Punti 1/2 PASS, Punto 3 skipped (§6.106), restano Punti 4/5 + Bonus + CP7b bump v2.5.33. Deviazioni intra-sessione da consolidare: §6.105, §6.106, nota audit §6.104.`

La sessione era stata aperta in una conversazione precedente con il prompt §11 v2.5.32 (analisi-first §6.104), che aveva eseguito CP0 + Fase 1 AMB + CP1 fix + Punti browser 1-3. La pausa è avvenuta tra Punto 3 e Punto 4. La ripresa ha completato Punti 4/5 + Bonus + CP7b bump.

### Δ rispetto al prompt §11 v2.5.32

| Fase | Prompt | Eseguito | Δ test |
|------|--------|----------|--------|
| **CP0 sanity-light** | 3 gate (status, npm test, log grep) | ✅ Tutti verdi (310/310) | — |
| **Fase 1 analisi-first** | 3 AMB (A/B/C) | ✅ Ratificate "Decidi tu" → scelte raccomandate (i path absolute, B audit esaustivo, C no test) | — |
| **Fase 2 CP1 fix** | 1 commit ConfigView + ConfigTabBar | ✅ Commit `67937e5`. Test 310/310 invariati | 0 |
| **Fase 3 CP browser** | 5 punti | ✅ 4/5 PASS + 1 skip giustificato (§6.106). +1 Bonus PASS. 1 caveat §6.105 su Punto 1 | — |
| **Fase 4 CP7b** | bump v2.5.33 + §22.15 + §11 → 8d-B | ✅ Questo delivery | — |

### AMB consumate / congelate

Nessuna nuova AMB-8d-B aperta (saranno ratificate in apertura Sessione 8d-B). AMB-8d-A-continue-2 consumate:
- **AMB-8d-A-continue-2.A** (strategia fix): path absolute ✅.
- **AMB-8d-A-continue-2.B** (scope audit): audit esaustivo grep ✅. Esito: 2 file effettivamente coinvolti (ConfigView, ConfigTabBar).
- **AMB-8d-A-continue-2.C** (test coverage): no test in-session, regression guard = browser check manuale ✅.

### Deviazioni aperte/chiuse

**Nuove §6.NN aperte:**
- **§6.105** — ConfirmModal focus-restore non funziona su ProfiliTab (delete profilo non-attivo). Riproducibile mouse + keyboard. Fix scope **8d-B tier C** insieme a §6.103.
- **§6.106** — CP7 Punto 3 skipped per ridondanza vs unit coverage `actions.profili.test.js` (test 7 da CP6 §6.95). Pattern documentato come decisione esplicita.

**Note retroattive su §6.NN esistenti:**
- **§6.104** — chiusa in v2.5.33. Aggiunta nota audit retroattiva (limitazione pattern grep `'NavLink to="[^/]'` su data-driven `to={var}`; estendere a `to={` per audit futuri).

**Consumate:** §6.104 (chiusa).

**Pending su 8d-B:** §6.81, §6.96 (AMB-8d.B → direct impl), §6.85 (AMB-8d.E investigation), §6.84 test router retrofit (§6.100), §6.103 useModalA11y UnsavedChangesModal, **§6.105** ConfirmModal focus-restore ProfiliTab (nuova).

### File prodotti / modificati

**Modificati (code, sul Mac):**
- `src/components/config/ConfigView.jsx` — 2 `<Navigate to>` + 1 `navigate(...)` da relativi a path absolute (`/config/impostazioni`).
- `src/components/config/ConfigTabBar.jsx` — 3 `<NavLink to>` da relativi a path absolute (`/config/<tab>`).

**Modificati (docs, in KB):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.32 → **v2.5.33** (questo delivery).

**Nuovi:** nessuno.

Totale: 2 file code modificati, 1 file docs aggiornato. Δ righe code stimato: ~6-8 righe (sostituzioni 1:1 di string literal nei JSX).

### Scoperte operative

1. **Pattern grep audit limit (annotata in §6.104).** I pattern `'Navigate to="[^/]'`, `'NavLink to="[^/]'`, `'navigate("[^/]"'` catturano solo string literal. Per coverage completa, aggiungere pattern `'to={'` per data-driven cases. Nel caso 8d-A-continue-2 il limit non ha causato falsi negativi (l'app non usa data-driven routing dentro `/config/*`), ma resta lezione per future audit.

2. **Browser check Bonus efficace.** Il Bonus (cross-tab dirty state + UnsavedChangesModal + Scarta) ha confermato che il guard CP4 §6.98 funziona end-to-end anche fuori dal trigger originale (FarmacoDrawer close path): la combinazione cross-tab + dirty form in ImpostazioniTab attiva correttamente l'UnsavedChangesModal di ConfigView. Pattern di test consigliato per future modifiche al guard.

3. **§6.105 emerge solo con focus-restore audit specifico.** Il bug a11y non è catturato dai test esistenti (i test ProfiliTab non asseriscono su `document.activeElement` post-dismiss). Sintomo solo riproducibile in browser con osservazione attiva del focus. Lesson: per a11y polish, il browser check è oggi l'unica guardia — investigare in 8d-B se aggiungere assertion `vi.fn()` su `triggerRef.current.focus()` come unit test guard.

4. **Skip giustificato vs skip silente.** §6.106 stabilisce un precedente esplicito: quando un browser check item è già coperto da unit test che mockizza il path completo, lo skip va documentato come §6.NN dedicata, non lasciato come decisione silente. Pattern applicabile in future sessioni.

5. **Console rumore "runtime.lastError".** Il pattern ripetuto `Unchecked runtime.lastError: The message port closed before a response was received` è generato da estensioni Chrome (password manager, ad-blocker, dev tools extensions) e non dall'applicazione. Identificabile perché compare anche su pagine non-React. Da ignorare in CP browser future.

### Azioni sul Mac post-Sessione 8d-A-continue-2

1. Verifica stato git pre-commit Changelog:
   ```
   echo 'Verifica stato pre-commit Changelog'
   cd ~/Sviluppo/pharmatimer
   git status
   git --no-pager log --oneline -5
   ```
   Atteso: tree clean, HEAD `67937e5`.

2. Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai con la versione **v2.5.33** (questo delivery).

3. Commit Changelog separato (solo se il repo lo traccia — verificare convenzione progetto: il Changelog vive in KB, il repo traccia solo codice):
   ```
   echo 'Commit Changelog v2.5.33 (opzionale, dipende da convenzione progetto)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.33 (Sessione 8d-A-continue-2)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. Verifica finale stato git:
   ```
   git --no-pager log --oneline -5
   ```

5. Aprire **Sessione 8d-B** (nuova conversazione Claude) con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8d-B).`


## 22.16 Stato post-Sessione 8d-B impl (parziale)

**Data:** 25 aprile 2026
**Baseline test pre-sessione:** 310/310 su 31 test files (§22.15 post-8d-A-continue-2).
**Baseline test post-sessione:** **313/313 su 31 test files** (+3 netti: 1 da CP2 ProfiliTab + 1 da CP2 FarmaciTab + 1 da CP3 FarmaciTab).
**Bump:** v2.5.33 → v2.5.34. Sessione **parziale**: 3 CP su 4 chiusi verdi (CP2/CP3/CP4), CP1 §6.96 ROLLED BACK in-session, 3 nuove deviazioni §6.107/108/109 deferred a 8d-C.

### Scope consegnato

Sessione 8d-B impl aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8d-B).` consumando prompt §11 v2.5.33. Eseguiti CP1 (rolled back), CP2, CP3, CP4 in sequenza con metodologia analisi-first ratificata in Fase 2 (6 AMB-8d-B.A÷F decise prima di scrivere codice). Scope ratificato: split 8d-B (A+B+E+F) + 8d-C (C+D), basato su confidence map item-per-item (§22.15 carryforward).

### Esiti CP0

| Gate | Scope | Esito |
|------|-------|-------|
| **Gate 1** | `git status` + `git log -1` | ✅ Tree clean su `step-8`. Ultimo commit `67937e5` Sessione 8d-A-continue-2. |
| **Gate 2** | `npm test -- --run` | ✅ **310/310 su 31 test files** in 6.09s. 4 warning React Router stderr persistono (target §6.84/§6.100 deferred 8d-C). |
| **Gate 3** | sanity commit 8d-A-continue-2 | ✅ 1 match `8d-A-continue-2`. Allineato baseline. |

### CP completati

| CP | §6.NN | AMB | Δ test | Note |
|----|-------|-----|--------|------|
| **CP1** | §6.96 | 8d.B | 0 | **ROLLED BACK in-session.** Sticky separator dinamico via CSS var `--app-header-height` + ResizeObserver. CP browser ha rivelato 2 bug concorrenti: CSS var mai settata (root cause hypothesis: `useEffect dep=[]` su componente con render condizionale early-return) + scroll bloccato sulla pagina `/oggi` (causa non diagnosticata). Rollback via `git checkout 67937e5`. Apertura **§6.107** carryforward 8d-C con 4 ipotesi di re-investigation. |
| **CP2** | §6.105 | 8d-B.F | +2 | Diagnosi-first di 15 min ha rivelato API gap: `ConfirmModal` shared non propagava `triggerRef` ai consumer → `useModalA11y` cadeva sempre sul fallback `document.body`. Fix: prop `triggerRef` opt-in (default null per retrocompatibilità) propagata a `useModalA11y`. 3 consumer wirati: ProfiliTab delete profilo (`deleteTriggerRef` su button Elimina), FarmaciTab data_fine-past (`salvaTriggerRef` su button Salva), FarmaciTab delete farmaco (`deleteTriggerRef` su button Elimina drawer footer). 2 regression guard test: ProfiliTab + FarmaciTab — entrambi verdi. **CP browser:** FarmaciTab Punto 4 ✅, ProfiliTab Punto 3 ❌ (focus va su input Nome invece che button Elimina). Apertura **§6.109** carryforward 8d-C. |
| **CP3** | §6.103 | 8d-B.E | +1 | Retrofit `useModalA11y` su `UnsavedChangesModal` (2° consumer arrival trigger gate). API estesa con `open` (gate visibilità + null-render, simmetria con `ConfirmModal`) e `triggerRef` opt-in (pattern §6.105). 2 call-site refactored: `ConfigView` (cross-tab guard) e `FarmaciTab` (drawer close path §6.98). 1 regression guard: Escape su `UnsavedChangesModal` chiama `onCancel` + drawer resta aperto. **CP browser:** Punti 5 e 6 ✅. |
| **CP4** | §6.81 | 8d-B.A | 0 | Nuovo token semantico `subTabInactive` in `theme.js` (light `#6B6469` 5.50:1 / dark `#8B8893` 5.27:1 vs headerBg, AA-text ≥4.5:1 ✅). Calcolo contrast WCAG via formula relative luminance pre-applicato per scegliere il valore. Asimmetria semantica preservata vs `navInactive` (che resta come è per NavBar bottom: pattern weak-helper intenzionale). ConfigTabBar switched. **CP browser:** Punto 2 ⚠️ — fix sub-tab OK ma scope creep su NavBar bottom (Oggi/Log/Export poco visibili). Apertura **§6.108** carryforward 8d-C. |

Target sessione: 310 → 313 (+3). Raggiunto. Commit code-side: 1 (CP2+CP3+CP4 atomic, CP1 escluso per rollback).

### CP browser ridotto — 6 punti

| Punto | Scope | Esito |
|-------|-------|-------|
| 1 | §6.96 sticky separator dinamico | ❌ scroll bloccato + CSS var vuota → rollback CP1 → §6.107 |
| 2 | §6.81 sub-tab dark mode | ⚠️ sub-tab OK ma scope creep NavBar bottom → §6.108 |
| 3 | §6.105 ProfiliTab focus-restore | ❌ focus va su input Nome (vs button Elimina atteso) → §6.109 |
| 4 | §6.105 FarmaciTab focus-restore | ✅ focus su button Elimina come atteso |
| 5 | §6.103 UnsavedChangesModal focus-trap + Escape | ✅ trap attivo, Escape chiama onCancel, drawer resta aperto |
| 6 | §6.103 UnsavedChangesModal cross-tab | ✅ modal apre su tab change con dirty form, Escape annulla, drawer preservato |

### Deviazioni §6.NN aperte / consumate / chiuse

**Nuove (3 deferred a 8d-C):**

- **§6.107** — CP1 §6.96 rolled back. Scroll regression + CSS var mai settata. Re-investigation con 4 ipotesi (useLayoutEffect, wrapper component, scroll lock root cause, fallback statico calibrato).
- **§6.108** — Scope creep §6.81: NavBar bottom (Oggi/Log/Export/Config) ha lo stesso bug contrast del ConfigTabBar pre-fix (2.41 light, 2.05 dark). 3 opzioni di fix (riuso `subTabInactive`, lift `navInactive`, refactor token unificato).
- **§6.109** — ProfiliTab post-CP2 focus restore va su `<input id="profilo-nome">` invece che button Elimina. Asimmetria diagnostica con FarmaciTab (architetturalmente identici, differenza solo nel JSX `<span>` wrapper §6.86.2 sul button Elimina ProfiliTab). 3 hypothesis residue, 4 step diagnostici proposti per 8d-C.

**Consumate:**

- **§6.103** (CP3) — completata AMB-8d-B.E retrofit `useModalA11y` su `UnsavedChangesModal` 2° consumer arrival.
- **§6.105** (CP2) — completata AMB-8d-B.F per FarmaciTab (entrambi i ConfirmModal). ProfiliTab parziale, riapertura come §6.109.
- **§6.81** (CP4) — completata AMB-8d-B.A per ConfigTabBar. NavBar bottom riapertura come §6.108.

**Chiuse:** nessuna in questa sessione.

**Pending su 8d-C:**

- **§6.107** (re-investigation §6.96) — priorità alta (regressione scroll attiva con `top-[180px]` hardcoded e header reale 149px).
- **§6.108** (estensione §6.81 a NavBar bottom) — priorità media.
- **§6.109** (ProfiliTab focus restore) — priorità media.
- **§6.85** (anomalia `nome_utente` azzerato) — investigation timeboxed (carryforward originale §11 v2.5.33, riconfermato).
- **§6.84** (test router future flags retrofit) — bisezione hang timeboxed (carryforward originale §11 v2.5.33, riconfermato).

### Scoperte

1. **`useEffect(dep=[])` su componenti con render condizionale early-return è anti-pattern.** Quando il componente ha un early return `if (status==='idle') return <Loading />` precedente al return principale, l'`useEffect` con `dep=[]` esegue al primo mount (durante idle), trova il ref nullo, e non riesegue mai più al rerender che monta il target. Pattern fix: `useLayoutEffect(dep=[state.status])` oppure wrapper component dedicato montato solo dopo lo status check.

2. **CP browser è discriminante per modifiche layout/scroll/sticky.** I test unit + jsdom + polyfill no-op non possono catturare regressioni di layout o scroll lock. CP1 §6.96 era 313/313 verde ma rotto in browser. Lesson: per modifiche su `position: sticky`, `top`, `overflow`, ResizeObserver, MutationObserver — CP browser obbligatorio prima di considerare il CP chiuso, non solo a fine sessione.

3. **Diagnosi-first paga.** §6.105 era stata ipotizzata come "race condition in useModalA11y" o "blur indotto da setState". Il code-reading di 15 min in CP2 Fase A ha rivelato la root cause vera (API gap in `ConfirmModal` shared) senza alcuna strumentazione. Il timebox 30 min reinvestito in scope esteso (3 consumer atomic invece che ProfiliTab-only). Pattern §6.105: per bug a11y modal-related, **leggere il codice a partire dall'hook condiviso prima di assumere bug nei consumer**.

4. **Falso negativo regression guard test §6.105.** I 2 test guard CP2 sono verdi in jsdom anche se in browser real ProfiliTab regredisce. Causa: `tabbableOptions: { displayCheck: 'none' }` in `useModalA11y` + interazione drawer-trap → modal-trap che jsdom non riproduce identicamente al browser. Lezione: i test guard a11y in jsdom sono **necessari ma non sufficienti**; CP browser obbligatorio per validare focus restore cross-trap.

5. **Asimmetria token semantica giustificata.** `subTabInactive` (nuovo, 5.27:1) e `navInactive` (esistente, 2.05:1) coesistono nel theme. La scelta non è "uniformità design system" ma "semantica per consumer": ConfigTabBar è label-only, NavBar è icon+label dove l'inactive può essere weak. §6.108 contesta questa asimmetria — eventuale ricomposizione in 8d-C con tokens unificati.

### File prodotti / modificati

**Modificati (code) — committati nel commit `eac185a`:**

- `src/components/shared/ConfirmModal.jsx` — prop `triggerRef` opt-in + doc API estesa (CP2).
- `src/components/config/ProfiliTab.jsx` — `deleteTriggerRef` su button Elimina + propagazione (CP2).
- `src/components/config/ProfiliTab.test.jsx` — +1 regression guard test §6.105 (CP2).
- `src/components/config/FarmaciTab.jsx` — 2 ref (`deleteTriggerRef`, `salvaTriggerRef`) + propagazione 2 ConfirmModal + refactor call-site UnsavedChangesModal con `open` prop (CP2 + CP3).
- `src/components/config/FarmaciTab.test.jsx` — +1 regression guard §6.105 (FarmaciTab) +1 regression guard §6.103 (UnsavedChangesModal Escape) (CP2 + CP3).
- `src/components/config/UnsavedChangesModal.jsx` — retrofit `useModalA11y` + API `open`/`triggerRef` (CP3).
- `src/components/config/ConfigView.jsx` — refactor call-site UnsavedChangesModal con `open` prop (CP3).
- `src/utils/theme.js` — nuovo token `subTabInactive` light/dark (CP4).
- `src/components/config/ConfigTabBar.jsx` — switch `navInactive` → `subTabInactive` (CP4).

**Rolled back (code) — non committati, ripristinati a baseline `67937e5` via `git checkout`:**

- `src/components/oggi/OggiView.jsx` (CP1 modifiche).
- `src/test/setup.js` (CP1 polyfill ResizeObserver).

**Modificati (docs):**

- `PharmaTimer_Changelog_Fase2.md` — v2.5.33 → **v2.5.34** (questo delivery).

**Nuovi:** nessuno.

### Azioni sul Mac post-Sessione 8d-B parziale

1. Stato git corrente: tree clean, commit top `eac185a` (CP2+CP3+CP4 atomic).

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.34** (questo delivery).

3. Commit Changelog separato (solo se il repo lo traccia — verificare convenzione progetto: il Changelog vive in KB, il repo traccia solo codice):
   ```
   cd ~/Sviluppo/pharmatimer
   echo 'Commit Changelog v2.5.34 (opzionale, dipende da convenzione progetto)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.34 (Sessione 8d-B impl parziale)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. Verifica finale stato git:
   ```
   git --no-pager log --oneline -5
   ```
   Atteso (top 5):
   - `<hash>` Changelog v2.5.34 (Sessione 8d-B impl parziale) — se Changelog tracciato in git
   - `eac185a` Sessione 8d-B impl parziale (CP2+CP3+CP4, CP1 rolled back)
   - `67937e5` Sessione 8d-A-continue-2 §6.104 (path absolute Navigate/NavLink dentro /config/*)
   - `264ab1c` Sessione 8d-A-continue CP6 §6.95 (updateProfilo proactive rebuildPlanFromFresh)
   - `f316e6c` Sessione 8d-A-continue CP5 §6.89+§6.92 (ProfiliTab retrofit ConfirmModal shared)

5. Aprire **Sessione 8d-C** (nuova conversazione Claude) con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8d-C).`

## 22.17 Stato post-Sessione 8d-C impl

**Data:** 25 aprile 2026 (sera).
**Baseline test pre-sessione:** 313/313 su 31 test files (§22.16 post-8d-B impl parziale).
**Baseline test post-sessione:** **313/313 su 31 test files** (Δ=0, target conservativo AMB-K' "313 ±2" centrato esatto).
**Bump:** v2.5.34 → v2.5.35.
**Esito:** ✅ **Completo** (5 CP eseguiti: CP1+CP3+CP4+CP5 chiusi con fix, CP2 archiviato post-diagnosi A/B).

### Scope consegnato

Sessione 8d-C impl aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 8d-C)` consumando prompt §11 v2.5.34. Eseguita Fase 1 analisi item-per-item su 5 candidate, ratifica AMB-8d-C.A÷E in un singolo turno ("decidi tu" in Fase 2), Fase 3 impl CP1-CP5, Fase 4 CP browser interleaved post-CP1/CP3/CP4, Fase 5 bump.

### Esiti CP0

| Gate | Scope | Esito |
|------|-------|-------|
| **Gate 1** | `git status` + `git log -3` | ✅ Tree clean su `step-8`. Top: `193b727` Changelog v2.5.34, parent `eac185a`. |
| **Gate 2** | `npm test -- --run` | ✅ **313/313 su 31 test files** in 6.19s. 4 warning React Router stderr persistenti (target CP5 §6.84). |
| **Gate 3** | sanity commit 8d-B impl parziale | ✅ 1 match `eac185a`. |

### AMB-8d-C.A÷E ratificate

| ID | Decisione | Razionale |
|----|-----------|-----------|
| **A** | §6.107 calibrazione statica `top-[149px]` (chiude §6.96) | Vincolo §11: no terzo tentativo dinamico per regressione bassa priorità |
| **B** | §6.109 diagnosi A/B + fix `requestAnimationFrame` condizionale | Test empirico h2 prima di refactor `useModalA11y` |
| **C** | §6.108 lift `navInactive` token (b vs raccomandazione provvisoria a §11) | Preserva pattern weak-helper iOS-like + risolve AA-ui |
| **D** | §6.85 strumentazione 30min + safety net `__pt.wipe()` | Terzo timebox finale, archiviazione ammissibile |
| **E** | §6.84 `onConsoleLog` filter vitest | Workaround zero-rischio vs §6.100 hang, future-proof |

Decisione split: **sessione atomica 8d-C** (no split 8d-D upfront; §6.109 hard-defer 8d-D solo se h2 falsificata in CP2).

### CP completati

| CP | §6.NN | AMB | Δ test | Note |
|----|-------|-----|--------|------|
| **CP1** | §6.110 (chiude §6.96 e §6.107) | A | 0 | Calibrazione statica `top-[180px]` → `top-[149px]` in OggiView.jsx DATE SEPARATOR. CP browser 5/5 (P1 scroll OK, P2 header=149px, P3 gap=0px, P4 visibility OK, P5 N/A dev mode). 1 commit `0283567`. |
| **CP2** | §6.111 (= §6.109 unresolved, hard-defer 8d-D) | B | 0 | Diagnosi A/B browser-only via DOM patch live. Punto A: bug riprodotto (`activeElement = INPUT id="profilo-nome"`). Punto B: span rimosso → focus ancora errato → **h2 falsificata**. h1 (drawer-trap re-grab) o h3 (mouse-no-focus) da investigare 8d-D. Zero modifiche file, zero commit. |
| **CP3** | §6.112 (chiude §6.108) | C | 0 | Lift `navInactive` light `#A8A29E` → `#888286` (3.60:1) e dark `#4A4854` → `#73686D` (3.43:1). Calcolo WCAG inline (`Python relative luminance`). CP browser 4/4 (dark/light/gerarchia/bonus subTab). 1 commit `3406e33`. |
| **CP4** | §6.113 (chiude §6.85 archiviazione) | D | 0 | Skip strumentazione (diagnosi grep convergente: `__pt.wipe = wipeDatabase` Console-accessible no confirm). Wrap `__pt.wipe` con `window.confirm` + auto-reload post-wipe in `devCheck.js`. Smoke 4/4. 1 commit `af147e0`. |
| **CP5** | §6.114 (chiude §6.84) | E | 0 | `onConsoleLog` filter in `vitest.config.js` sopprime 4 warning RR future flag stderr → 0. 313/313 invariati 6.29s no overhead. 1 commit `db30fae`. |

Target sessione: 313 → 313 (±2). Centrato.

### CP browser interleaved

Vincolo §11 v2.5.34 esplicito: "no CP §6.96 senza CP browser interleaved" + "track record 8d-B regressioni invisibili in jsdom". Eseguiti tutti i CP browser **prima** del commit del CP corrispondente:

- **CP1.4** (post-§6.110): 5 punti, scroll OK + header=149 misurato + gap=0px + visibility OK + DEV slider toggle N/A.
- **CP3.4** (post-§6.112): 4 punti, leggibilità dark + light + gerarchia + bonus subTab.
- **CP4.4** (post-§6.113): 4 punti smoke confirm prompt.

Pattern consolidato: il CP browser è blocker per il commit, non check post-hoc.

### Deviazioni §6.NN aperte / consumate / chiuse

**Nuove (5):**
- **§6.110** — sticky separator calibrazione statica `top-[149px]` (CP1, chiude §6.96 e §6.107).
- **§6.111** — h2 falsificata empiricamente per §6.109, hard-defer 8d-D investigation strumentata (CP2).
- **§6.112** — lift `navInactive` token a soglia AA-ui (CP3, chiude §6.108).
- **§6.113** — `__pt.wipe()` safety net + auto-reload (CP4, chiude §6.85 archiviazione).
- **§6.114** — `onConsoleLog` filter vitest sopprime warning RR future flag (CP5, chiude §6.84 parte test router).

**Chiuse:** §6.96, §6.107 (chiusa contestualmente in §6.110), §6.108, §6.85 (archiviazione), §6.84.

**Consumate:** §6.109 → assorbita in §6.111 carryforward 8d-D.

**Pending su 8d-D (se opzione A) OPPURE soft-defer Step 10/11 (se opzione B):**
- **§6.111** = §6.109 unresolved. Investigation strumentata h1/h3.

### Scoperte operative

1. **Diagnosi-first paga, replay del pattern §6.105 (8d-B CP2).** §6.85 era stata timeboxed 2 volte senza riproduzione. AMB-8d-C.D prescriveva strumentazione 30min. Diagnosi grep-based ha rivelato root cause in <5min (`__pt.wipe = wipeDatabase` Console-accessible no confirm). Skip strumentazione + fix safety net diretto. Tempo risparmiato: ~25min reinvestito in CP5 + bump. **Lezione:** per anomalie a confidence bassa cronica, leggere il codice prima di assumere bug runtime + strumentare.

2. **h2 falsification rapida via DOM patch live.** §6.109 aveva 3 hypothesis residue. AMB-8d-C.B prescriveva diagnosi A/B via `git stash`/branch temporaneo. Approccio alternativo browser-only via DOM patch (`span.parentElement.insertBefore(target, span); span.remove();`) ha falsificato h2 in <10min senza modifiche a file. **Lezione:** per test ipotesi DOM-related, DOM patch live è più veloce di branch + rebuild + retest.

3. **Drift §6.69 pregresso v2.5.34.** L'entry "Changelog versione 2.5.34" è **assente** dall'elenco introduttivo §1 (front-matter dichiara v2.5.34 ma manca il bullet summary). Drift §6.69 non rilevato al bump 8d-B impl parziale. **Non retrocorretto in 8d-C** per principio fatto-storico immutabile (§6.71 / v2.5.24 analoghi). Gap visibile come traccia in §1 (jump da v2.5.33 a v2.5.35). Roberto può recuperarlo in apertura Sessione 9 se ritiene utile per pulizia archivio.

4. **CP browser interleaved + vincolo §11 esplicito = regressione zero.** §6.107 (8d-B CP1) era 313/313 verde unit ma rotto in browser (scroll lock + var mai settata). CP1 8d-C ha rispettato vincolo §11 "verifica browser PRIMA del commit": il commit è avvenuto solo dopo CP1.4 5/5. Pattern di sicurezza confermato: per modifiche layout/scroll/sticky, CP browser PRE-commit obbligatorio.

5. **Calcolo contrast WCAG inline via Python.** Per §6.112 (lift `navInactive`), il calcolo dei valori candidati e validazione contrast è stato eseguito in-session con script Python (`relative luminance` formula sRGB → linear). Pattern utile per future modifiche al theme: fornire i valori esatti con ratio numerico anziché stime visive. Lo script può essere conservato come utility in skill personale "WCAG contrast calc" per riuso.

### File prodotti / modificati

**Modificati (code) — committati:**

- `src/components/oggi/OggiView.jsx` — `top-[180px]` → `top-[149px]` + commento §6.110 (CP1, commit `0283567`, 8 ins / 7 del).
- `src/utils/theme.js` — `navInactive` light `#888286` + dark `#73686D` + commento §6.112 (CP3, commit `3406e33`, 9 ins / 1 del).
- `src/data/devCheck.js` — wrap `__pt.wipe` con confirm + auto-reload + commento §6.113 (CP4, commit `af147e0`, 22 ins / 1 del).
- `vitest.config.js` — `onConsoleLog` filter + commento §6.114 (CP5, commit `db30fae`, 16 ins).

**Modificati (docs):**

- `PharmaTimer_Changelog_Fase2.md` — v2.5.34 → **v2.5.35** (questo delivery).

**Nuovi:** nessuno.

### Limitazioni note

1. **§6.110 trade-off statico.** Build production senza DEV slider avrà header più corto (probabile ~120-130px invece di 149) → gap residuo visibile. Documentato come acceptable in commento §6.110. Reflow header futuro (Step 8e+ o Step 11 polish) richiederà ricalibrazione manuale.

2. **§6.111 ProfiliTab a11y minore.** Focus restore va a `<input id="profilo-nome">` invece che button Elimina atteso. Non blocker funzionale (delete completo, modal chiude). Investigation strumentata 8d-D (opzione A) o soft-defer Step 10/11 (opzione B).

3. **§6.114 filter copre solo warning React Router future flag.** Future warning di altre librerie (es. React 18→19 deprecation) **non sono filtrati**. Pattern: aggiungere solo le condizioni richieste, evitare filter generic.

### Azioni sul Mac post-Sessione 8d-C

1. Stato git corrente: tree clean, top `db30fae` Sessione 8d-C CP5 §6.114 (parent: `af147e0` CP4 §6.113).

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.35** (questo delivery).

3. Commit Changelog separato (solo se il repo lo traccia — convenzione progetto: KB-only, repo tracks code only):
   ```
   echo 'Commit Changelog v2.5.35 (opzionale, dipende da convenzione progetto)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.35 (Sessione 8d-C impl)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. Verifica finale stato git:
   ```
   git --no-pager log --oneline -8
   ```
   Atteso top 8:
   - `<hash>` Changelog v2.5.35 (Sessione 8d-C impl) — se tracked
   - `db30fae` Sessione 8d-C CP5 §6.114
   - `af147e0` Sessione 8d-C CP4 §6.113
   - `3406e33` Sessione 8d-C CP3 §6.112
   - `0283567` Sessione 8d-C CP1 §6.110
   - `193b727` Changelog v2.5.34
   - `eac185a` Sessione 8d-B impl parziale
   - `67937e5` Sessione 8d-A-continue-2 §6.104

5. **Decisione Roberto in apertura prossima sessione:** opzione (A) Sessione 8d-D analisi-first (§6.111) oppure (B) Step 9 analisi-first (notifiche + §6.18). Riferimento §11 v2.5.35 per dettagli + raccomandazione.

6. Aprire prossima sessione (nuova conversazione Claude) con prompt naturale:
   - (A): `Apri Sessione 8d-D analisi-first per §6.111 (carryforward 8d-C).`
   - (B): `Apri Step 9 analisi-first (notifiche + fix dominio §6.18 cross-midnight).`

## 22.18 Stato post-Sessione 9 analisi-first

**Data:** 26 aprile 2026.
**Baseline test pre-sessione:** 313/313 su 31 test files (§22.17 post-8d-C impl).
**Baseline test post-sessione:** 313/313 invariato (analisi-first pura, zero codice scritto).
**Bump:** v2.5.35 → v2.5.36.
**Esito:** ✅ **Completo** — 10 AMB-9.A÷J ratificate, scope Step 9 congelato.

### Scope consegnato

Sessione 9 analisi-first aperta come prompt naturale `Apri Step 9 analisi-first (notifiche + fix dominio §6.18 cross-midnight).` (Opzione B raccomandata in §11 v2.5.35). Modalità Q&A iterativa con "decidi tu" da Q2 in poi (Q1 raccomandazione esplicita, Q2-Q10 delegate). 3 Wave (A dominio, B notifiche, C closing) ratificate in 10 AMB.

### Decisione strategica scope

Discussione approfondita su trade-off backend vs no-backend per notifiche iOS:
- **Vincolo iOS PWA installata:** `setTimeout` foreground-only, `TimestampTrigger` non disponibile (Chromium-only), Web Push richiede backend persistente.
- **Vincolo Mac Mini disponibile:** Web Push tecnicamente fattibile (Mac Mini emette push uscente HTTPS → APN → iPhone ovunque), ma costo 9-15 sessioni aggiuntive (fusion Step 9 + Fase 3).
- **Decisione:** Opzione 1 foreground-only per consegna Step 9 senza server, Web Push backend differito a **Fase 3 estesa post-Step 11** come scope autonomo. iPhone+Android entrambi a livello foreground-only (uniformità messaging).
- **Stima sessioni residue:** Step 9 (5-9 sessioni totali con 9-A + 9-B + Step 10 + Step 11), poi Fase 3 estesa opzionale (9-15 sessioni per Web Push completo).

### CP0 N/A (analisi-first pura)

Nessun gate eseguito (zero codice modificato in-session).

### AMB-9.A÷J ratificate

| ID | Wave | Decisione |
|----|------|-----------|
| **A** | A | `ora_ricalcolata` TIME → TEXT ISO `'YYYY-MM-DDTHH:MM'`, `ora_prevista` invariato HH:MM |
| **B** | A | Stesso nome campo, migration `length===5` self-heal, no rollback (`__pt.wipe()` escape hatch §6.113) |
| **C** | A | `db.version(2).stores({...})` invariato + `fake-indexeddb` test integrazione + grep gate seed/devCheck |
| **D** | A | 3 helper `utils/time.js` (`composeIsoDateTime`/`addMinutesToIso`/`parseIsoDateTime`), `new Date(iso)` interno, DST documentato fuori scope, tear-down §6.26 + `isEntryFutureDate` |
| **E** | B | `setTimeout` main thread, riuso `services/audio.js` per beep, limitazioni note documentate |
| **F** | B | Toggle `ImpostazioniTab` + chiave `notifiche_attive` boolean + hook `useNotifications` + vincolo `display-mode: standalone` uniforme |
| **G** | B | 8 trigger re-schedule (init/commit/rollover/profilo/Config/toggle on/off/visibility+focus), window cap 12h, rolling 30 tick |
| **H** | B | Singleton `services/notifications.js` 7+1 metodi + Map closure-private + tag-based + click `window.location` + `rescheduleAllNotifications` puro + test isolato |
| **I** | B | Title `farmaco.nome`, body `formatRelazionePastoCopy` in nuovo `utils/copy.js`, fallback `"Promemoria farmaco"`, defensive permission check, beep best-effort, notifica sempre OS-decides |
| **J** | C | Target +47 (313→360 ±5), split upfront 9-A (+16) + 9-B (+31), 4+5 CP impl + 2 CP browser totali |

### CP completati

N/A — analisi-first pura, zero CP impl. Sessione strutturata per ratificare scope, non per scrivere codice.

### Deviazioni §6.NN previste post-impl

5 deviazioni attese in continuità con §6.114 ultima 8d-C:

| ID | Wave | CP target | Scope |
|----|------|-----------|-------|
| **§6.115** | A | CP1+CP3 9-A | `ora_ricalcolata` ISO datetime — chiude §6.18 |
| **§6.116** | A | CP4 9-A | Tear-down workaround §6.26 + `isEntryFutureDate` — chiude §6.26 |
| **§6.117** | A | CP2 9-A | Dexie v1→v2 migration + dev-dep `fake-indexeddb` |
| **§6.118** | B | CP4 9-B | Chiave `impostazioni_app.notifiche_attive` (analoga §6.25 `tema`) |
| **§6.119** | B | Wave B globale | Opzione 1 foreground-only limitazioni note + roadmap Web Push Fase 3 estesa |

Numerazione effettiva attribuita alla scrittura nel CP impl corrispondente.

### Scoperte operative

1. **Discussione strategia notifiche iOS è il driver di scope di tutta la fase 2-finale.** L'analisi tecnica ha rivelato che il vincolo iOS WebKit (no `TimestampTrigger`) impone scelta binaria: o foreground-only (Opzione 1) o backend Web Push (Opzione 3). Non c'è "compromesso ragionevole intermedio" che valga la pena per iOS.
2. **Mac Mini disponibile NON cambia la decisione di Step 9, ma sblocca Fase 3 estesa.** Avere il backend pronto rende il pivot Web Push molto più realistico in seguito (vs partire da zero).
3. **Pattern "decidi tu" da Q2 in poi è efficace** quando le raccomandazioni Q1 stabiliscono il framework decisionale. Roberto ha delegato 9 risposte su 10, tutte raccomandate accettate inline. Tempo sessione ridotto del 50% rispetto a Q&A iterativo pieno.
4. **Drift §6.69 v2.5.34 perpetuato** in v2.5.36 (continuità principio fatto-storico immutabile). Pattern consolidato: gap visibile, non retrocorretto, documentato in entry §1 di ogni bump successivo.
5. **Split upfront 9-A + 9-B (vs split adattivo 8d → 8d-A...8d-C-continue-2)** ratificato come pattern da seguire (lezione 8d). Costo metodologico: +1 bump intermedio v2.5.37; beneficio: dimensionamento prevedibile, no overflow context.

### File prodotti / modificati

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.35 → **v2.5.36** (questo delivery): front-matter, §1 entry v2.5.36, §7 row Step 9 split 9-A+9-B, §11 sostituita con prompt esecutivo Sessione 9-A, §22.18 nuova.

**Modificati (code):** nessuno (analisi-first pura).

**Nuovi:** nessuno.

### Limitazioni note

1. **Fase 3 estesa Web Push backend NON pianificata in dettaglio.** Stima 9-15 sessioni è ordine di grandezza, da raffinare con analisi-first dedicata post-Step 11 quando il contesto è fresco.
2. **TimestampTrigger Android non implementato.** Coverage Android pieno (notifiche app chiusa) sacrificata per uniformità iOS+Android Opzione 1. Recovery via Fase 3 estesa che porterebbe entrambe a Web Push.
3. **DST handling in `addMinutesToIso`** documentato come fuori scope. Probabilità impatto reale per uso Roberto: trascurabile (DST 2 notti/anno, dose alle 02:30 caso raro).
4. **§6.111 ProfiliTab focus restore** soft-defer Step 11 confermato (out of scope Step 9, conferma raccomandazione §11 v2.5.35).

### Azioni sul Mac post-Sessione 9 analisi-first

1. Stato git corrente: tree clean, top `db30fae` Sessione 8d-C CP5 §6.114 (parent: `af147e0` CP4 §6.113).

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.36** (questo delivery).

3. Commit Changelog separato (solo se il repo lo traccia — convenzione progetto: KB-only, repo tracks code only):
   ```
   echo 'Commit Changelog v2.5.36 (opzionale, dipende da convenzione progetto)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.36 (Sessione 9 analisi-first)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. Verifica finale stato git:
   ```
   git --no-pager log --oneline -3
   ```
   Atteso top:
   - `<hash>` Changelog v2.5.36 (Sessione 9 analisi-first) — se tracked
   - `db30fae` Sessione 8d-C CP5 §6.114
   - `af147e0` Sessione 8d-C CP4 §6.113

5. **Eseguire CP0 sanity-light** del prompt §11 v2.5.36 prima di aprire Sessione 9-A:
   ```
   echo 'CP0 9-A sanity-light'
   git status
   git --no-pager log --oneline -3
   npm test -- --run
   git --no-pager log --oneline | grep '8d-C'
   grep -n 'ora_ricalcolata' src/data/seed.js src/data/devCheck.js || echo 'OK: zero hit ora_ricalcolata in seed/devCheck'
   ```

6. Aprire Sessione 9-A esecutiva (nuova conversazione Claude) con one-liner:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-A esecutiva).
   ```

## 22.19 Stato post-Sessione 9-A implementativa

**Data:** 26 aprile 2026.
**Baseline test pre-sessione:** 313/313 su 31 test files (§22.18 post-9 analisi).
**Baseline test post-sessione:** **328/328 su 32 test files** (+15, +1 file nuovo `db.migration.test.js`). Target AMB-9.J 329 ±3 → centrato a -1, in tolleranza.
**Bump:** v2.5.36 → v2.5.37.
**Esito:** ✅ **Completo con caveat** — Wave A consegnata, §6.18 chiusa a livello DATI (CP3 ISO propagation), §6.26 chiusa definitivamente (§6.118 ISO-aware detector). Caveat: §6.119 (bug visivo §6.18 sottostante) e §6.120 (`actions.presa` ignora `simulated_now` DEV) emersi in CP browser, deferred post-9-A. Severity entrambi bassa.

### Scope consegnato

Sessione 9-A esecutiva aperta con one-liner `Esegui il prompt al §11 del Changelog (Sessione 9-A esecutiva).`. 4 CP impl + CP browser 4 punti come da §11 v2.5.36. Modalità "decidi tu" da Q-CP4-1 in poi (Q&A intra-CP per ambiguità non risolte da §11).

### CP completati

- **CP1 — `utils/time.js` 3 helper ISO** ✅. 1 file modificato + 1 file nuovo (`utils/time.test.js`). +6 test (3 happy + 3 edge). Spec-conforme. Commit `d5248a0`. Δ baseline: 313 → 319.
- **CP2 — Dexie v1→v2 migration + `fake-indexeddb`** ✅. 2 file modificati (`db.js`, `package.json`) + 1 file nuovo (`db.migration.test.js`). +3 test. Pre-CP grep gate `seed.js`/`devCheck.js` zero hit confermato. Commit `d0d4e5e`. Δ baseline: 319 → 322.
- **CP3 — `recalc.js` ISO propagation + `planBuilder` invariante** ✅. 2 file modificati (`recalc.js`, `planBuilder.js`) + 2 test estesi (`recalc.test.js` +6, `planBuilder.test.js` +1 invariante, alcuni cross-test rinominati). +6 test. Commit `d5de70f`. Δ baseline: 322 → 328.
- **CP4 — Tear-down §6.26 + isCrossMidnightRecalc ISO-aware** ⚠️→✅. **2 commit** (split per finding ex-post). Prima iter `816a49f` con `isEntryFutureDate(entry, todayDateStr)` + prop `todayDateStr`. CP browser punto 2 ha rivelato semantica invertita. Fix `0e70a38` con `isCrossMidnightRecalc(entry)` ISO-aware self-contained, revert prop. Δ test net: 0 (3 rimossi + 3 nuovi nella prima iter, fixture aggiornate; nella fix-iter altri 3 rimossi + 3 nuovi). Δ baseline: 328 invariato.
- **CP browser** — 4 punti, esiti misti:
  - **P1 (recalc same-day)** ⚠️ ambiguo: scenario fallito per §6.120 pre-existing (`actions.presa` ignora `simulated_now`); recalc cross-midnight scattato invece di same-day. Non è fail di §6.116/§6.118 (logica corretta). Documentato §6.120.
  - **P2 (cross-midnight critico)** ✅ verde post-§6.118: card oggi ora_ricalcolata domani ha badge ON, card domani naturale ha badge OFF. Caveat §6.119 documentato (card oggi resta sotto separator oggi anziché migrare a domani).
  - **P3 (theme toggle)** — visivo manuale, non eseguito formalmente; non interagisce con scope CP4. Skip per pragmatismo (chiusura A).
  - **P4 (focus restore ALTRO)** ⚠️ ambiguo: helper console mostrato `activeElement = button[aria-label="Chiudi"] modal open: true` → modal era ancora aperto durante check. Retry implicato ma scope 7d-1 (focus restore già verificato lì), non CP4. Skip per pragmatismo.

### Deviazioni §6.NN introdotte

| ID | Stato | Tipo | Riferimento |
|----|-------|------|-------------|
| **§6.115a** | ✅ Chiusa | spec-conforme CP1 | 3 helper ISO |
| **§6.115b** | ✅ Chiusa | spec-conforme CP3 | recalc ISO propagation, chiude **§6.18** dati |
| **§6.116** | ⚠️ Sostituita da §6.118 | spec-conforme CP4 prima iter, semantica errata | tear-down §6.26 (mantenuta come storico) |
| **§6.116b** | ✅ Chiusa | finding analisi pre-CP4 | consumer drift uiState.js + OggiView |
| **§6.117** | ✅ Chiusa | spec-conforme CP2 | Dexie migration |
| **§6.117a** | ✅ Chiusa | drift documentale | types.js JSDoc |
| **§6.118** | ✅ Chiusa | fix ex-post post-CP browser | `isCrossMidnightRecalc` ISO-aware, chiude **§6.26** definitivamente |
| **§6.119** | ⏳ Deferred | bug visivo pre-existing emerso | planBuilder non bumpa entry.dateStr cross-midnight |
| **§6.120** | ⏳ Deferred | bug DEV pre-existing emerso | actions.presa ignora simulated_now |

### Drift numerazione vs piano §22.18

§22.18 prevedeva §6.115/§6.116/§6.117 per Wave A, §6.118/§6.119 per Wave B. Effetto reale:
- §6.115 split in §6.115a + §6.115b (CP1+CP3 separate iterations).
- §6.116 + §6.116b (sub-finding consumer drift).
- §6.117 + §6.117a (sub-drift JSDoc differito).
- §6.118 + §6.119 + §6.120 consumati da 9-A (CP4-fix + 2 deferred).

**Conseguenza Wave B 9-B:** numerazione spostata da §6.118-§6.119 a **§6.121-§6.122** per coerenza fatto-storico (no retrocorrezione, principio §6.71/§6.85). Patch 4 §7 roadmap aggiornata.

### Scoperte operative

1. **CP browser PRE-bump è il gate critico per fix ex-post.** Senza CP browser punto 2, §6.118 sarebbe stata mancata, il bump v2.5.37 sarebbe partito con bug semantico, e la prossima sessione avrebbe dovuto re-aprire §6.116 in modalità correttiva. Pattern lezione 8d-C §6.107 riconfermato. Tempo CP browser: ~5min. Risparmio: 1 sessione fix-only.
2. **"Decidi tu" autorità non è scudo per regola critica #2 (fermarsi su incongruenze).** Q-CP4-2 "trust §11 letterale" è stato un errore: la spec era semanticamente errata e Claude doveva proporre verifica concreta pre-codice. Lesson: anche con autorizzazione "decidi tu", validare 2-3 scenari concreti del helper PRIMA del codice.
3. **Consumer drift latent dopo cambio dominio = pattern.** §6.116b (`uiState.js` + OggiView) e §6.117a (types.js JSDoc) sono entrambi conseguenza del cambio tipo `ora_ricalcolata` HH:MM → ISO in CP3. Test passavano solo perché fixture ancora HH:MM. Pattern futuro: post-cambio-tipo, `grep -rn` esaustivo dei consumer + audit fixture.
4. **Pre-existing bugs emergono in CP browser, non in test unit.** §6.119 (planBuilder visual mis-placement) e §6.120 (actions.presa real-time) entrambi invisibili a test unit (fixture deterministiche, mock di `now`). Test unit verde ≠ behavior corretto in browser. CP browser è non-skippable pre-bump.
5. **Pattern "self-extracting deliverables in /home/claude → present_files" funziona** anche per fix-iter con 5 file. Roberto cp da Downloads, npm test, retry browser → ciclo iter ~5min per fix-iteration.

### File prodotti / modificati

**Modificati (code, 9-A in toto):**
- `src/utils/time.js` (CP1) — +3 funzioni
- `src/utils/time.test.js` (CP1, **nuovo file**) — 6 test
- `src/data/db.js` (CP2) — `db.version(2)` + upgrade hook
- `package.json` (CP2) — dev-dep `fake-indexeddb`
- `src/data/db.migration.test.js` (CP2, **nuovo file**) — 3 test
- `src/domain/recalc.js` (CP3) — `apply*` ISO compose
- `src/domain/recalc.test.js` (CP3) — +6 test cross-midnight
- `src/domain/planBuilder.test.js` (CP3) — +1 invariante
- `src/utils/uiState.js` (CP4) — rimosso isCrossMidnightRecalc HH:MM, aggiunto isCrossMidnightRecalc ISO-aware (post-§6.118), `effHHMM` helper, `parseIsoDateTime` import
- `src/utils/uiState.test.js` (CP4) — -3 vecchi + 3 nuovi test
- `src/components/oggi/DoseCard.jsx` (CP4) — recalc logic via parseIsoDateTime, badge gate via isCrossMidnightRecalc
- `src/components/oggi/DoseCard.test.jsx` (CP4) — badge test riscritto su nuova API + 1 fixture inline ISO
- `src/components/oggi/OggiView.jsx` (CP4) — `entryHHMM` helper per gap calc, parseIsoDateTime import
- `src/domain/types.js` (CP4) — JSDoc ora_ricalcolata HH:MM → ISO

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.36 → **v2.5.37** (questo delivery): front-matter, §1 entry v2.5.37, §6.115a/§6.115b/§6.116/§6.116b/§6.117/§6.117a/§6.118/§6.119/§6.120 nuove, §7 row 9-A ✅ + 9-B drift numerazione, §11 sostituita, §22.19 nuova.

**Nuovi (code):**
- `src/utils/time.test.js`
- `src/data/db.migration.test.js`

**Commit Mac-side branch `step-8`:**
1. `d5248a0` — 9-A CP1 §6.115a — utils/time.js 3 ISO helpers (AMB-9.A/D)
2. `d0d4e5e` — 9-A CP2 §6.117 — Dexie v1→v2 migration ora_ricalcolata ISO + fake-indexeddb (AMB-9.B/C)
3. `d5de70f` — 9-A CP3 §6.115b — recalc.js ISO propagation cross-midnight (AMB-9.A) + planBuilder invariante (§6.23 esteso)
4. `816a49f` — 9-A CP4 §6.116 tear-down §6.26 + isEntryFutureDate (poi sostituita da §6.118)
5. `0e70a38` — 9-A CP4-fix §6.118 — isCrossMidnightRecalc ISO-aware (revert §6.116a)

### Limitazioni note

1. **§6.119 (visual mis-placement) deferred.** Card cross-midnight resta sotto separator OGGI invece di migrare a DOMANI. Mitigation UI in place via badge §6.118. Fix proprio richiede analisi-first dedicata (opzioni A bump dateStr in planBuilder vs B raggruppare per effective_dateStr in vista).
2. **§6.120 (DEV simulated_now ignored) deferred.** `actions.presa` real-time, non riproducibile in production. Workaround test browser: passare override esplicito `actions.presa(key, { dataEffettiva, oraEffettiva })`.
3. **CP browser P3 (theme) e P4 (focus restore) non eseguiti formalmente.** P3 visivo low-risk fuori scope CP4. P4 retry-ambiguo, scope 7d-1 già verificato. Decisione (A) chiusura pragmatica.
4. **CP browser P1 (recalc same-day) ambiguo.** Bug §6.120 ha bloccato lo scenario; il critico P2 (cross-midnight) è stato verificato indipendentemente, sufficiente per validare §6.118.

### Azioni sul Mac post-Sessione 9-A impl

1. Stato git corrente: tree clean, top `0e70a38`, 5 commit 9-A su branch `step-8`.

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.37** (questo delivery).

3. Commit Changelog separato (opzionale, dipende da convenzione progetto KB-only):
   ```
   echo 'Commit Changelog v2.5.37 (opzionale)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.37 (Sessione 9-A impl)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. Verifica finale:
   ```
   git --no-pager log --oneline -7
   ```
   Atteso top:
   - `<hash>` Changelog v2.5.37 (Sessione 9-A impl) — se tracked
   - `0e70a38` 9-A CP4-fix §6.118 — isCrossMidnightRecalc ISO-aware
   - `816a49f` 9-A CP4 §6.116 tear-down §6.26 + isEntryFutureDate
   - `d5de70f` 9-A CP3 §6.115b — recalc.js ISO propagation
   - `d0d4e5e` 9-A CP2 §6.117 — Dexie migration
   - `d5248a0` 9-A CP1 §6.115a — utils/time.js helpers
   - `9c99471` Changelog v2.5.36 (Sessione 9 analisi-first)

5. **Eseguire CP0 sanity-light** del prompt §11 v2.5.37 prima di aprire Sessione 9-B:
   ```
   echo 'CP0 9-B sanity-light'
   git status
   git --no-pager log --oneline -5
   npm test -- --run
   git --no-pager log --oneline | grep '9-A'
   ```

6. Aprire Sessione 9-B (nuova conversazione Claude) con one-liner. **Raccomandato analisi-first:**
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-B analisi-first).
   ```
   Oppure, se preferisce esecutiva diretta:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-B esecutiva diretta — saltare analisi-first).
   ```


---

## 22.20 Stato post-Sessione 9-B analisi-first

**Data:** 26 aprile 2026.
**Baseline test pre-sessione:** 328/328 su 32 test files (§22.19 post-9-A impl).
**Baseline test post-sessione:** 328/328 invariato (analisi-first pura, zero codice scritto).
**Bump:** v2.5.37 → v2.5.38.
**Esito:** ✅ **Completo** — 5 AMB-9.E÷I confermate con 4 emendamenti E'/F'/G'/I', scope Sessione 9-B esecutiva congelato.

### Scope consegnato

Sessione 9-B analisi-first aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 9-B analisi-first).` (raccomandato vs esecutiva diretta dato lessons learned 9-A: spec semantics §6.118 + pre-existing browser bug §6.119/§6.120). Modalità Q&A pattern §11 v2.5.37: Q1-Q3 raccomandazioni esplicite (su AMB-9.E/F/G — decisioni nuove o emendamenti), Q4-Q5 "decidi tu" (su AMB-9.H/I — pattern stabilito). Tutte le 5 risposte: "decidi tu" (Roberto ha delegato, raccomandazioni adottate).

### Incongruenza segnalata pre-Q (regola critica #2)

AMB-9.G in §22.18 elencava "Config thunks" tra gli 8 trigger di re-schedule senza specificarne il sottoinsieme. I thunks Config sono ~9 (`addFarmaco`/`updateFarmaco`/`deleteFarmaco`/`addProfilo`/`updateProfilo`/`deleteProfilo`/`attivaProfilo`/`setSetting`/eventuali altri). Risolto in Q3 → AMB-9.G' nominativa: solo i **7 thunks rilevanti** (`add/update/deleteFarmaco`, `add/update/delete/attivaProfilo`) che mutano `farmaci`/`orari`/`profiloAttivo`. `setSetting('notifiche_attive')` ha path dedicato (toggle on/off); `setSetting('tema')` e altre chiavi NON triggerano.

### CP0 N/A (analisi-first pura)

Nessun gate eseguito (zero codice modificato in-session). CP0 sanity-light incluso nel prompt §11 esecutivo per Sessione 9-B impl successiva.

### AMB-9.E÷I confermate con emendamenti

| ID | Stato | Emendamento |
|----|-------|-------------|
| **E'** | ✅ confermata + emendata | `rescheduleAllNotifications(state, services)` **sincrona idempotente**, no debounce. Visibility flip rapido foreground→background→foreground produce N reschedules consecutivi senza leak (cancel-then-rebuild atomico, JS single-threaded). Alternative debounce 200ms / lock booleano scartate per complessità senza beneficio. |
| **F'** | ✅ confermata + emendata | Decision tree UI **4 stati esplicito** (`isStandalone × permission`): (1) `!isStandalone` → toggle nascosto + banner "Installa l'app sulla home per attivare le notifiche"; (2) `standalone+default` → toggle off + tap requestPermission; (3) `standalone+granted` → toggle abilitato gating `notifiche_attive`; (4) `standalone+denied` → toggle disabilitato + banner "Permesso negato — abilita dalle impostazioni di sistema". Defensive permission revocation check su mount + `visibilitychange` forza `notifiche_attive=0` se OS revoca. |
| **G'** | ✅ confermata + emendata | 8 trigger **nominati**: `init` / `commitApplyResult` / rollover mezzanotte / `cambiaProfilo` / **7 thunks rilevanti** (`add/update/deleteFarmaco`, `add/update/delete/attivaProfilo`) / toggle on / toggle off / `visibilitychange`+`focus`. `setSetting('notifiche_attive')` path dedicato; `setSetting('tema')` e altre chiavi escluse. Rolling 30 tick integrato in `useEffect` tick Provider §6.24. |
| **H** | ✅ confermata invariata | Test mocking pattern `globalThis.Notification` mock class in `beforeEach` + `vi.useFakeTimers()` + `vi.runOnlyPendingTimers()` + cleanup `afterEach`. Replicato da pattern `audio.js` test Sessione 7b-1. |
| **I'** | ✅ confermata + emendata | Body `formatRelazionePastoCopy` **stripped del prefisso "Assumere "** (drift voluto §6.124, copy nuda suona meglio in notifica). 13 test: 6 enum × {detail, null} + 1 fallback body vuoto. Fallback `"Promemoria farmaco"` gestito dal caller (`showDoseNotification` in CP2), non dal helper. |

### Decision tree AMB-9.F' (rendering toggle ImpostazioniTab)

| `isStandalone` | `permission` | UI |
|---|---|---|
| `false` | * | Toggle nascosto + banner "Installa sulla home per attivare le notifiche" |
| `true` | `default` | Toggle off + tap → `requestPermission()` → granted ⇒ `notifiche_attive=1` |
| `true` | `granted` | Toggle abilitato (utente controlla `notifiche_attive`) |
| `true` | `denied` | Toggle disabilitato + banner "Permesso negato — abilita dalle impostazioni di sistema" |

### CP completati

N/A — analisi-first pura, zero CP impl. Sessione strutturata per ratificare scope e congelare prompt §11 esecutivo, non per scrivere codice.

### Deviazioni §6.121-§6.124 previste post-impl

4 deviazioni attese (numerazione corretta post-9-A consumption §6.118-§6.120, in continuità con §6.71/§6.85 archive: numerazione non retrocorretta).

| ID | Wave | CP target | Scope |
|----|------|-----------|-------|
| **§6.121** | B | CP4 9-B | Chiave `impostazioni_app.notifiche_attive` boolean default 0 (analoga §6.25 `tema`) |
| **§6.122** | B | Wave B globale | Opzione 1 foreground-only limitazioni note + roadmap Web Push Fase 3 estesa |
| **§6.123** | B | CP3 9-B | `useNotifications` decision tree 4 stati + defensive permission revocation check |
| **§6.124** | B | CP1 9-B | `formatRelazionePastoCopy` body stripped (drift voluto UX notifica) |

Eventuali §6.125+ emergeranno come pre-existing scoperte in CP browser (analoga §6.119/§6.120 9-A).

### Tabella CP impl 9-B (5 CP)

Target AMB-9.J: 313 → 360 ±5. 9-A actual +15 (328). 9-B target +32 (a +1 dal centro split 31). Boundary 9-B: 28-37 nuovi test. Δ totale stimato +38 (boundary alta, margine assorbe edge case in CP3/CP4).

| CP | Scope | File modificati / nuovi | Δ test | Commit message |
|---|---|---|---|---|
| **CP1** | §6.124 — copy helper isolato | `utils/copy.js` (nuovo), `utils/copy.test.js` (nuovo) | **+13** | `9-B CP1 §6.124 — formatRelazionePastoCopy body stripped (AMB-9.I')` |
| **CP2** | AMB-9.H — singleton notifications | `services/notifications.js` (nuovo), `services/notifications.test.js` (nuovo) | **+10** | `9-B CP2 — services/notifications.js singleton 7+1 metodi (AMB-9.H)` |
| **CP3** | §6.123 — hook 4 stati | `hooks/useNotifications.js` (nuovo), `hooks/useNotifications.test.jsx` (nuovo) | **+6** | `9-B CP3 §6.123 — useNotifications 4-state decision tree (AMB-9.F')` |
| **CP4** | §6.121 + §6.122 — integration AppContext | `state/AppContext.jsx` (mod), `state/actions.js` (mod), `data/seed.js` (mod), `state/AppContext.test.jsx` (mod) | **+5** | `9-B CP4 §6.121+§6.122 — 8 trigger reschedule + foreground-only limits (AMB-9.E'/G')` |
| **CP5** | AMB-9.F' — UI toggle | `components/config/ImpostazioniTab.jsx` (mod), `components/config/ImpostazioniTab.test.jsx` (mod) | **+4** | `9-B CP5 — ImpostazioniTab toggle 4-state matrix (AMB-9.F')` |

**CP6 closing:** bump v2.5.38 → v2.5.39, §22.21 stato post-9-B impl, commit Changelog.

### CP browser 9-B (8 punti, non-skippable pre-bump)

Eseguibile in PWA installata Mac (Chrome installata con `display-mode: standalone`) e iPhone (PWA da Safari → Aggiungi a Home). Punti 1-5 obbligatori, 6-8 raccomandati.

1. **Permission flow** — tap toggle off→on in ImpostazioniTab → prompt OS → granted → `__pt.notifications.getPendingCount() > 0`.
2. **Schedule/cancel cycle** — `apply presa` su entry imminente → pending count decrementato → `cambia profilo` → cancelAll + reschedule fresh.
3. **Rollover overnight** — `__pt.simulatedNow.set('23:55')` → tick rollover → reschedule per nuovo `dateStr`.
4. **Beep simultaneity** — notifica fires app foreground → beep `audio.js` + `Notification.show` entrambi attivi senza eccezione.
5. **Visibility change** — hide/show 2s → pending count invariato. Flip rapido <500ms × 3 → invariato.
6. **Permission revocation defensive** — settings iOS revoca → riapri PWA → useNotifications mount detect → `notifiche_attive=0` forzato.
7. **Non-PWA fallback** — Safari mobile no Add-to-Home → toggle nascosto + banner "Installa".
8. **Tag-based replacement** — schedule 2 notifiche stesso `entryKey` → solo 1 in OS notification center.

### Q&A pattern utilizzato

Q1-Q5 (5 domande totali, allineate alla raccomandazione §11 v2.5.37 Q1-Q3 esplicite + Q4+ "decidi tu"):

| Q | AMB target | Tipo | Esito |
|---|---|---|---|
| Q1 | E (cancellation chain + visibility flip) | Raccomandazione esplicita 1° opzione + 2 alternative | "decidi tu" → AMB-9.E' raccomandazione consigliata |
| Q2 | F (UI decision tree) | Raccomandazione esplicita matrice 4 stati + 2 alternative | "decidi tu" → AMB-9.F' raccomandazione consigliata |
| Q3 | G (8 trigger precision + visibility race) | Raccomandazione esplicita 7 thunks nominati + 2 alternative + segnalazione incongruenza | "decidi tu" → AMB-9.G' raccomandazione consigliata, incongruenza risolta |
| Q4 | H (test mocking pattern) | "decidi tu" + raccomandazione breve | Raccomandazione adottata invariata |
| Q5 | I (copy enumeration) | "decidi tu" + raccomandazione breve | "decidi tu" → AMB-9.I' raccomandazione consigliata (body stripped) |

Pattern ratificato: Q1-Q3 raccomandazioni esplicite con alternative scartate, Q4-Q5 "decidi tu" su pattern già stabilito. Tempo sessione ~1.5h come previsto §11 v2.5.37.

### Scoperte operative

1. **Pattern §6.118 (validazione semantica pre-codice) internalizzato in tutti i CP impl 9-B.** Ogni CP impl ha sezione "Pre-codice" con 2-3 scenari concreti del codice contro AMB pre-codice (CP1: 2, CP2: 3, CP3: 3, CP4: 2). Costo metodologico: ~5 minuti per CP. Beneficio atteso: zero fix ex-post analoghi a §6.118.
2. **Drift numerazione §6.121-§6.124 vs piano §22.18 (era §6.118-§6.119) consolidato.** Risultato post-9-A consumption: §6.118 chiusa (CP4-fix), §6.119/§6.120 deferred. Wave B usa §6.121+ (no retrocorrezione, principio §6.71/§6.85).
3. **CP browser passato da 5+ punti (richiesti §11 v2.5.37) a 8 punti (5 obbligatori + 3 raccomandati).** Aggiunti: P6 permission revocation defensive (richiesto da AMB-9.F'), P7 non-PWA fallback (richiesto da AMB-9.F'), P8 tag-based replacement (richiesto da AMB-9.H). I 3 raccomandati coprono branch UI critici scoperti in analisi che non erano nel piano §22.18 originale.
4. **"Decidi tu" universale (5/5 risposte) accelera analisi quando raccomandazioni Q sono ben framed.** Pattern §22.18 già visto: framework di Q1-Q3 con raccomandazione esplicita stabilisce contesto, "decidi tu" su Q4+ accelera senza perdere rigore. Tempo sessione ridotto del 50% rispetto a Q&A pieno iterativo.
5. **Drift §6.69 v2.5.34 perpetuato in v2.5.38** (continuità principio fatto-storico immutabile). Pattern consolidato: gap visibile, non retrocorretto, documentato in entry §1 di ogni bump successivo.

### File prodotti / modificati

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.37 → **v2.5.38** (questo delivery): front-matter, §1 entry v2.5.38, §7 row 9-B aggiornata "Analisi-first ✅", §11 sostituita con prompt esecutivo Sessione 9-B, §22.20 nuova.

**Modificati (code):** nessuno (analisi-first pura).

**Nuovi:** nessuno.

### Limitazioni note

1. **Nessuna verifica concreta del codice esistente per AMB-E.** AMB-9.E' assume `setTimeout` cancellation atomico via `clearTimeout` + `Map.clear()`. Non è stato ispezionato `services/audio.js` reale per replicare il pattern test mock. Validazione completa demandata a CP2 pre-codice (3 scenari concreti).
2. **AMB-9.G' "rolling 30 tick" integrato in useEffect tick Provider §6.24** assume struttura compatibile. Non ispezionato `AppContext.jsx` corrente per confermare la struttura del tick. Validazione completa demandata a CP4 pre-codice (2 scenari concreti).
3. **Δ test stimato +38 vs target +32** (boundary AMB-9.J alta, +6 sopra target). Margine accettabile (lo scope CP3/CP4 ha edge case che possono richiedere test aggiuntivi). Se overflow finale, `it.skip` su test non critici per centrare ±5.
4. **CP browser 9-B punti 6-8 sono raccomandati ma non obbligatori.** Punti 1-5 coprono lo scope critico AMB-9.E'/F'/G'. Se Roberto vuole velocizzare il bump 9-B, può eseguire solo P1-P5 + skip P6-P8 (defensive coverage).

### Azioni sul Mac post-Sessione 9-B analisi-first

1. Stato git corrente: tree clean atteso, top `0e70a38` Sessione 9-A CP4-fix §6.118 (parent: `816a49f` 9-A CP4 §6.116). Convenzione progetto: KB-only, repo tracks code only.

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.38** (questo delivery).

3. Commit Changelog separato (solo se il repo lo traccia — convenzione progetto: KB-only, repo tracks code only):
   ```
   echo 'Commit Changelog v2.5.38 (opzionale, dipende da convenzione progetto)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.38 (Sessione 9-B analisi-first)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. **Eseguire CP0 sanity-light** del prompt §11 v2.5.38 prima di aprire Sessione 9-B esecutiva:
   ```
   echo 'CP0 9-B sanity-light'
   git status
   git --no-pager log --oneline -5
   npm test -- --run
   git --no-pager log --oneline | grep '9-A'
   ```
   Atteso: tree clean, top `0e70a38`, 328/328 in 32 files, 5 match `9-A`.

5. Aprire Sessione 9-B esecutiva (nuova conversazione Claude) con one-liner:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-B esecutiva).
   ```

## 22.21 Stato post-Sessione 9-B parte 1/2 implementativa

**Data:** 27 aprile 2026.
**Baseline test pre-sessione:** 328/328 su 32 test files (§22.20 post-9-B analisi-first, baseline invariato).
**Baseline test post-sessione:** 357/357 su 35 test files (Δ +29: +13 CP1 + +10 CP2 + +6 CP3).
**Bump:** v2.5.38 → v2.5.39.
**Esito:** ✅ **Parziale (3 CP su 5)** — CP1+CP2+CP3 verdi; CP4+CP5+CP browser+CP6 deferred a Sessione 9-B parte 2/2.

### Decisione split sessione (regola critica #5)

Sessione 9-B esecutiva originalmente pianificata come 5 CP unici (§22.20). Decisione split parte 1/2 vs parte 2/2 presa dopo CP3 verde:

- **Token consumati:** ~6.5K dopo CP1+CP2+CP3 (3 CP isolati con file nuovi).
- **CP4 ad alto rischio context-heavy:** modifica `AppContext.jsx` esistente (file non letto in sessione), 8 trigger reschedule, listener visibility/focus, adattamento interface per `services`/`actions` non-CP4-canonica, possibile rinomina `pianoOggi`. Stima ~15 LOC + 5 test, ma con expected_uncertainty alto.
- **Beneficio split:** parte 2/2 con context fresco permette lettura completa di `AppContext.jsx`, `actions.js`, `seed.js` reali e validazione 4 ambiguità Q-CP4 in pre-codice prima di scrivere wiring.
- **Costo split:** 1 sessione extra di setup (CP0 + lettura context).

Pattern coerente con principle §6.79 (Sessione 7d-2 split parte 1/2 + parte 2/2).

### CP completati

| CP | Scope | File nuovi | Δ test | Commit |
|----|-------|-----------|--------|--------|
| **CP1 §6.124** | helper isolato body stripped | `utils/copy.js`, `utils/copy.test.js` | **+13** | `f7ab6d5` |
| **CP2 AMB-9.H** | singleton notifications 7+1 metodi | `services/notifications.js`, `services/notifications.test.js` | **+10** | `fd2ab9a` |
| **CP3 §6.123** | hook decision tree 4 stati | `hooks/useNotifications.js`, `hooks/useNotifications.test.jsx` | **+6** | `c158496` |

**Totale parte 1/2:** 357/357 in 35 files. Top commit `c158496`.

### Decisioni pre-codice congelate

#### CP1 (§6.124 / AMB-9.I')

| Q | Decisione | Rationale |
|---|-----------|-----------|
| Q-CP1.1 | A — `indifferente` → `null` sempre (detail ignorato) | Replica semantica `getPastoText` early-return: detail ignorato per coerenza UX |
| Q-CP1.2 | C — enum sconosciuto → `null` defensive | Robustezza vs corruzione dati |
| Q-CP1.3 | ok — slice "Assumere " 9 char | Drift §6.124 voluto |

#### CP2 (AMB-9.H)

| Q | Decisione | Rationale |
|---|-----------|-----------|
| Q-CP2.1 | Signature 7+1 metodi via factory + singleton | Testabilità (fresh instances per test) |
| Q-CP2.2 | A — click handler URL `/oggi` | Atterraggio diretto su view dosi |
| Q-CP2.3 | A — `fireAt <= now` no-op silenzioso | Robustezza per `rescheduleAllNotifications` con entries marginalmente passate |
| Q-CP2.4 | A — defensive permission check al fire | Rileva revoche iOS post-schedule (AMB-9.I) |
| Q-CP2.5 | A — beep delegato a `useAutoBeep` esterno | Separazione responsabilità: notifications.js fa solo Notification API + scheduling |
| Q-CP2.6 | A — `state.pianoOggi || []` provvisorio | **Da confermare in CP4** (state shape reale) |

#### CP3 (§6.123 / AMB-9.F')

| Q | Decisione | Rationale |
|---|-----------|-----------|
| Q-CP3.1 | `useApp()` espone `services.notifications` + `actions.setSetting` | **Da confermare in CP4** (pattern Redux-like inferito) |
| Q-CP3.2 | `matchMedia('(display-mode: standalone)')` + `navigator.standalone` fallback | Pattern PWA standard combinato |
| Q-CP3.3 | requestEnable throw `'not_standalone'`/`'permission_denied'`; result `'default'` noop silenzioso | UX retry-friendly |
| Q-CP3.4 | disable noop se `!isStandalone` o `permission==='denied'` | Toggle non visibile/disabilitato |
| Q-CP3.5 | revocation check on mount + `visibilitychange` | AMB-9.F' literal |

### Decisioni pre-codice da confermare in CP4

1. **State shape `pianoOggi`** (Q-CP2.6): nome chiave reale dello state. Se diverso da `pianoOggi`, rinominare `services/notifications.js::rescheduleAllNotifications` (1 line change).
2. **`useApp()` shape** (Q-CP3.1): confermare se context espone `services.notifications` + `actions.setSetting` come usato in `useNotifications`. Se diverso, adattare hook + AppContext.
3. **Tick rolling 30 integration**: struttura `useEffect` tick Provider §6.24 corrente per integrazione reschedule.
4. **Thunks Config**: dei ~9 thunks totali, quali 7 triggerano reschedule. Default §22.20: `add/update/deleteFarmaco`, `add/update/delete/attivaProfilo`. `setSetting('notifiche_attive')` path dedicato; `setSetting('tema')` esclusa.

### Scoperte operative

1. **2 stub orfani scoperti durante install** (CP2 + CP3): `services/notifications.js` e `hooks/useNotifications.js` esistevano come stub di 2 righe da sessione precedente non documentata (rilevati via `git status` mostrando `modified` invece di `new file`). Installer ha sovrascritto correttamente; nessun comportamento runtime intaccato (gli stub erano placeholder vuoti). Da formalizzare come §6.NN al CP6 closing parte 2/2.
2. **Sandbox testing pattern** introdotto in CP2/CP3: prima di emettere installer, vitest 2.1.9 + happy-dom in sandbox `/home/claude/sandbox` per validare la suite mirata. Catch errori di mocking pattern (CP2 `globalThis.Notification` constructor) e ambiguità syntax pre-delivery. Costo ~30s setup, beneficio: zero round-trip Mac per fix mock pattern. Da formalizzare come §6.NN al CP6 closing parte 2/2.
3. **Pattern §6.118 internalizzato** con costo metodologico ~5min/CP per pre-codice + tabella Q-CP_N.M con default raccomandati. Beneficio: zero fix ex-post analoghi a §6.118 in tutti e 3 i CP.
4. **Decision tree CP3 4 stati** rappresentato come matrice (`isStandalone × permission`) con 4 percorsi UI distinti, copertura test 1:1 (un test per stato + 1 happy path requestEnable + 1 defensive revocation).
5. **Drift §6.69 v2.5.34 perpetuato in v2.5.39** (continuità principio fatto-storico immutabile).

### File prodotti / modificati parte 1/2

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.38 → **v2.5.39** (questo delivery): front-matter, §1 entry v2.5.39, §11 sostituita con prompt esecutivo Sessione 9-B parte 2/2, §22.21 nuova.

**Nuovi (code):** 6 file = 3 src + 3 test.
- `src/utils/copy.js` (nuovo, 36 righe) + `src/utils/copy.test.js` (nuovo, 84 righe, 13 test)
- `src/services/notifications.js` (nuovo, 152 righe) + `src/services/notifications.test.js` (nuovo, 165 righe, 10 test)
- `src/hooks/useNotifications.js` (nuovo, 124 righe) + `src/hooks/useNotifications.test.jsx` (nuovo, 145 righe, 6 test)

**Modificati (code):** nessuno (CP4-CP5 deferred).

### Limitazioni note

1. **CP4-CP5 deferred a parte 2/2.** Wiring AppContext, UI ImpostazioniTab, CP browser e CP6 closing fuori scope di questa sessione.
2. **Decisioni pre-codice CP4 (Q-CP2.6 + Q-CP3.1) sono inferenze, non verifiche.** Validazione effettiva su `state.pianoOggi` e `useApp()` shape avverrà in CP4 pre-codice.
3. **Δ test parte 1/2 +29 vs target §22.20 +29 (CP1+CP2+CP3 = 13+10+6).** Centro perfetto. Δ totale 9-B atteso +38 (parte 1/2 +29 + parte 2/2 +9), entro boundary AMB-9.J alta.

### Azioni sul Mac post-Sessione 9-B parte 1/2

1. Stato git corrente: tree clean, top `c158496` 9-B CP3 §6.123 (parent: `fd2ab9a` CP2 → `f7ab6d5` CP1 → `f8a2142` Changelog v2.5.38).

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.39** (questo delivery).

3. Commit Changelog separato (KB-only, repo non traccia il Changelog):
   ```
   echo 'Commit Changelog v2.5.39 (KB-only convention)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.39 (Sessione 9-B parte 1/2 implementativa)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. **Eseguire CP0 sanity-light** del prompt §11 v2.5.39 prima di aprire Sessione 9-B parte 2/2:
   ```
   echo 'CP0 9-B parte 2/2 sanity-light'
   git status
   git --no-pager log --oneline -5
   npm test -- --run
   git --no-pager log --oneline | grep '9-B CP'
   ```
   Atteso: tree clean, top `c158496`, 357/357 in 35 files, 3 match `9-B CP`.

5. Aprire Sessione 9-B parte 2/2 (nuova conversazione Claude) con one-liner:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-B parte 2/2 esecutiva).
   ```
## 22.22 Stato post-Sessione 9-B parte 2/2 + parte 3/3 implementativa (CP browser deferred)

**Data:** 27 aprile 2026 (entrambe le parti stessa giornata).
**Baseline test pre-sessione:** 357/357 su 35 test files (§22.21 post-9-B parte 1/2).
**Baseline test post-parte 2/2:** 367/367 su 35 test files (Δ +10, top commit `530e983`).
**Baseline test post-parte 3/3:** 371/371 su 35 test files (Δ +4, top commit `93c3d21` post-amend).
**Bump:** v2.5.39 → **v2.5.40-rc** (release candidate, NO bump definitivo a v2.5.40 fino a chiusura CP browser).
**Esito:** ✅ **Impl 4/5 CP completi (CP1-CP5)** — CP browser 8 punti deferred a Sessione 9-B parte 4/4 (regola critica #5: dimensionamento sessione, ~30-40min CP browser ininterrotto incompatibile con Q&A asincrono dopo 5 CP impl).

### Parte 2/2 (CP4) — riepilogo sintetico

CP4 wiring `AppContext.jsx` + `actions.js` + 8 trigger reschedule. Eseguita come sessione separata (parte 2/2) con context fresh per leggere file esistenti reali e validare 4 ambiguità Q-CP4 (state shape, useApp shape, tick integration, thunks Config). 8 deviazioni emerse durante implementazione, tutte già in codice al delivery (top `530e983`):

| ID | Scope | Lessons learned |
|----|-------|-----------------|
| **§6.125** | alias `useApp = useAppContext` | CP3 §6.123 importa `useApp`; CP4 ha aggiunto alias backward compat invece di rinominare 1 import (rischio diff broad) |
| **§6.126** | services injection retrofit | `createActions(repo, services)` + context value `{state, actions, services, tickMs}` + `__pt.notifications` window debug |
| **§6.127** | `rescheduleAllNotifications` usa selector | `selectEntriesForDay(state, selectToday(state))` invece di `state.pianoOggi || []` (Q-CP2.6 risolto) |
| **§6.128** | lookup farmaco via selector | `selectFarmacoById` invece di `state.farmaci[id]` (state.farmaci è array, non dict — bug latente CP2) |
| **§6.129** | NOTIFICHE_ATTIVE no schema bump | default off via missing-key (`selectImpostazione` ritorna `undefined` ⇒ AMB-9.F' `enabled=false` corretto) |
| **§6.130** | rolling-30-tick safety net | mitigazione iOS PWA `setTimeout` suspend dopo 30s background (re-arm idempotente in tick `useEffect` Provider) |
| **§6.131** | Δ test +10 effettivi | vs +5 stimato §22.20 (+5 pure `notifications.test.js` +5 wiring `AppContext.test.jsx`); boundary AMB-9.J alta assorbe |
| **§6.132** | bypass maybeReschedule gate | `setSetting('notifiche_attive', 1)`: stateRef-lag dopo optimistic dispatch, reschedule deve usare nuovo state, non stateRef stale (bug reale anche in produzione, non solo test) |

### Parte 3/3 (CP5) — riepilogo sintetico

CP5 `ImpostazioniTab.jsx` SezioneNotifiche 4-state + 4° campo `Notifiche pendenti` in SezioneAvanzate-DEV. Sandbox vitest pre-delivery (pattern §22.21 confermato): 13/13 verdi prima dell'emissione installer self-extracting. SHA-1 sandbox = SHA-1 post-install Mac (`9fc992bc...` jsx + `ff7f5b10...` test) = bit-perfect delivery. Δ test +4 effettivi, totale 367 → 371 (centro perfetto su target §11). 2 deviazioni emerse + §6.135 infra:

| ID | Scope | Lessons learned |
|----|-------|-----------------|
| **§6.133** | drift terminologico §11 vs AMB-9.F' | prompt §11 usava enum `{not-supported, denied, granted-off, granted-on}`; API reale `useNotifications` (CP3) espone `(isStandalone, permission, enabled)`. UI implementata segue AMB-9.F' literal (fonte autoritativa). `not-supported` collassato su `permission='denied'` da `readPermission` early-return |
| **§6.134** | pattern test mock-collaborator | `vi.mock('../../hooks/useNotifications.js')` in `ImpostazioniTab.test.jsx` con `DEFAULT_NOTIFICATIONS_MOCK` safe in `beforeEach`. Alternativa scartata: estendere `renderHelpers.jsx` per iniettare `services` (richiede ~15 LOC + tocco 13 callers esistenti). Mock-collaborator già stabilito in `useNotifications.test.jsx` parte 1/2 |
| **§6.135** | installer `.bak.cpN` pattern | l'installer crea backup `.bak.cpN` prima di sovrascrivere; `.gitignore` ha pattern `*.bak`. Convenzione: i backup sopravvivono alla sessione per rollback rapido locale, vengono eliminati manualmente al passaggio sessione successiva. Emerso quando l'amend del primo commit CP5 ha dovuto espungere 2 `.bak.cp5` finiti in stage per default |

### Decisione CP browser deferred (regola critica #5)

CP browser 8 punti pianificati in §22.20 non eseguiti in parte 3/3. Motivazione:

1. **Token consumati:** ~50K dopo CP4+CP5 + lettura file reali + sandbox
2. **CP browser è blocco discreto** ~30-40min ininterrotti (P1-P5 + P8), mal compatibile con Q&A asincrono in coda di 5 CP impl
3. **Rischio degrado qualità** se forzato in stessa sessione (regola critica #5 esplicita)

Decisione: **Sessione 9-B parte 4/4 dedicata** al CP browser + CP6 closing definitivo (bump v2.5.40-rc → v2.5.40). Pattern già visto: §6.79 / Sessione 7d-2 split in 3 parti.

### Decisione skip P6+P7 in parte 4/4

**Raccomandato P1-P5 (obbligatori) + P8 (tag-based replacement, OS-specific).** Skip P6 e P7:
- **P6 (revocation OS-side):** coperto da `useNotifications.test.jsx` test #6 (defensive revocation on mount). Re-test browser ridondante.
- **P7 (non-PWA fallback):** coperto da `useNotifications.test.jsx` test #1 (`!isStandalone` → toggle nascosto + banner). Re-test browser ridondante.

P8 invece testa comportamento OS-specifico (notification center dedup tag-based) non simulabile in jsdom.

### Decisione device parte 4/4

**Chrome PWA Mac soltanto.** iPhone PWA defer a Wave C se emergono regressioni iOS-specifiche. Razionale: stesso engine Notification API + setTimeout + visibilitychange, DevTools nativi solo su Mac per ispezione.

### CP completati

| Parte | CP | Scope | File modificati / nuovi | Δ test | Commit |
|-------|----|-------|------------------------|--------|--------|
| 2/2 | **CP4** | wiring + 8 trigger | `state/AppContext.jsx`, `state/actions.js`, `services/notifications.js`, `state/AppContext.test.jsx`, `services/notifications.test.js`, `data/seed.js` | **+10** | `530e983` |
| 3/3 | **CP5** | ImpostazioniTab UI 4-state | `components/config/ImpostazioniTab.jsx`, `components/config/ImpostazioniTab.test.jsx` | **+4** | `93c3d21` (post-amend, era `00cf71a` con .bak.cp5 espunti via §6.135) |

**Totale CP1-CP5:** 357 → 371 (Δ +14 in parte 2/2+3/3, totale 9-B impl Δ +43 vs target +38).

### Decisioni pre-codice CP5 congelate

| Q | Decisione | Rationale |
|---|-----------|-----------|
| Q-CP5.1 | Copy: 4 stati con label "Notifiche dosi" + hint contestuali | AMB-9.F' literal §22.20 (fonte autoritativa, ignora drift §11 §6.133) |
| Q-CP5.2 | Nuova sezione `<SezioneNotifiche>` tra Tema e Avanzate-DEV | parallelismo con SezioneTema, fieldset+legend pattern |
| Q-CP5.3 | `getPendingCount()` come 4° campo SezioneAvanzate-DEV (snapshot at mount) | Q-CP5.3 default §11 confermato; `services?.notifications?.getPendingCount() ?? 0` safe-navigation per test stub |
| Q-CP5.4 | Skip "Test notifica" button | Q-CP5.4 default §11 confermato; CP browser P1+P5 coprono già fire end-to-end |

### Sandbox testing pattern §6.134 confermato

Pattern §22.21 introdotto in CP2/CP3 parte 1/2 ri-applicato in CP5 parte 3/3:

1. `mkdir /home/claude/sandbox && npm install` (vitest 2.1.9 + happy-dom + react 18 + react-router-dom)
2. Stub minimi delle dipendenze (`AppContext.jsx`, `selectors.js`, `useTheme.js`, `db.js`, `useNotifications.js`, `renderHelpers.jsx`) replicati fedelmente da Mac-side
3. File CP5 modificati scritti in sandbox + test
4. `npx vitest run` → 13/13 verdi prima del delivery
5. Installer self-extracting con base64 payload + SHA-1 verification
6. Mac-side: `bash installer.sh` → SHA-1 match = bit-perfect delivery

Costo metodologico: ~5min setup + ~2min/iteration. Beneficio: zero round-trip Mac per fix sintassi/mock pattern.

### Scoperte operative

1. **Drift terminologico §11 vs AMB §22.X frequente** (CP5 §6.133, già visto 9-A §6.118 differente). Decisione perpetua: AMB §22.X = fonte autoritativa, §11 = sintesi operativa che può driftare. Documentare in §6.NN ogni drift scoperto a impl-time.
2. **Default mock-collaborator pattern testing UI con hook custom**: `vi.mock(hookPath)` + `DEFAULT_MOCK` in `beforeEach` (zero impatto sui test esistenti) > estendere `renderHelpers.jsx` (broad blast radius). Adottato come pattern progetto.
3. **Pattern installer + .bak.cpN** (§6.135): formalizzato come convenzione delivery. Da continuare per ogni CP futuro che modifica file esistenti.
4. **Amend post-commit per pulire stage default**: `git rm --cached <unwanted>` + `git commit --amend --no-edit` è zero-cost se branch locale non pushato. Pattern utile per `.bak.cpN` che entrano in stage automaticamente al primo `git add -A`.
5. **Drift §6.69 v2.5.34 perpetuato in v2.5.40-rc** (continuità principio fatto-storico immutabile).
6. **Decisione split parte 3/3 → parte 4/4**: pattern coerente con principio §6.79 (sessione 7d-2 split 3 parti). CP browser ben candidato a sessione dedicata: blocco discreto, runtime-driven, no Q&A pre-codice.

### File prodotti / modificati

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.39 → **v2.5.40-rc** (questo delivery): front-matter, §1 entry v2.5.40-rc, §7 row 9-B aggiornata "Impl 4/5 ✅, CP browser deferred a parte 4/4", §11 sostituita con prompt esecutivo Sessione 9-B parte 4/4, §22.22 nuova.

**Modificati (code) parte 2/2:**
- `src/state/AppContext.jsx` — services injection §6.126 + tick rolling-30 §6.130
- `src/state/actions.js` — createActions(repo, services) + 8 trigger §6.127-§6.132 + `setSetting` toggle bypass §6.132
- `src/services/notifications.js` — selector-based `rescheduleAllNotifications` §6.127/§6.128
- `src/state/AppContext.test.jsx` — 5 wiring test
- `src/services/notifications.test.js` — 5 pure test
- `src/data/seed.js` — chiave `notifiche_attive` §6.129

**Modificati (code) parte 3/3:**
- `src/components/config/ImpostazioniTab.jsx` — SezioneNotifiche +85 LOC + 4° campo Avanzate (339 righe totali)
- `src/components/config/ImpostazioniTab.test.jsx` — +4 test +60 LOC (268 righe totali, 13 test)

**Nuovi:** nessuno in CP4-CP5 (tutti nuovi files erano CP1-CP3 in parte 1/2).

**Backup su disco (untracked):**
- `src/components/config/ImpostazioniTab.jsx.bak.cp5`
- `src/components/config/ImpostazioniTab.test.jsx.bak.cp5`

### Limitazioni note

1. **CP browser 8 punti NON eseguiti.** Validazione end-to-end runtime deferred a parte 4/4. Stato impl coperto solo da unit test (371/371 verdi); regressioni browser-side possibili ma improbabili dato il pattern §6.118 internalizzato in tutti i CP.
2. **Bump definitivo v2.5.40 deferred.** v2.5.40-rc è release candidate; v2.5.40 finale solo dopo CP browser P1-P5+P8 verde.
3. **iPhone PWA non testato.** Defer a Wave C se emergono regressioni iOS-specifiche (`setTimeout` suspend, Notification API quirks).
4. **Δ test totale 9-B impl: +43 effettivi vs +38 stimato §22.20** (+5 sopra target). Boundary AMB-9.J alta superata di poco — accettabile, non richiede `it.skip`.

### Azioni sul Mac post-Sessione 9-B parte 3/3

1. Stato git corrente: tree clean (a parte Changelog modificato KB-only), top `93c3d21` 9-B CP5 (parent: `530e983` CP4 → `c158496` CP3 → `fd2ab9a` CP2 → `f7ab6d5` CP1).

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.40-rc** (questo delivery).

3. Commit Changelog separato (KB-only, repo non traccia il Changelog):
   ```
   echo 'Commit Changelog v2.5.40-rc (KB-only convention)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.40-rc (Sessione 9-B parte 3/3 implementativa)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. **NON eliminare i backup `.bak.cp5`** fino a chiusura CP browser parte 4/4 verde.

5. **Eseguire CP0 sanity-light** del prompt §11 v2.5.40-rc prima di aprire Sessione 9-B parte 4/4:
   ```
   echo 'CP0 9-B parte 4/4 sanity-light'
   git status
   git --no-pager log --oneline -5
   npm test -- --run
   git --no-pager log --oneline | grep '9-B CP'
   ```
   Atteso: tree clean, top `93c3d21`, 371/371 in 35 files, 5 match `9-B CP`.

6. Aprire Sessione 9-B parte 4/4 (nuova conversazione Claude) con one-liner:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-B parte 4/4 esecutiva).
   ```


## 22.23 Stato post-Sessione 9-B parte 4/4 esecutiva (esito misto)

**Data:** 27 aprile 2026 (sessione serale, ~21:00-21:10).
**Baseline test pre-sessione:** 371/371 su 35 test files (§22.22 post-9-B parte 3/3).
**Baseline test post-sessione:** 371/371 (Δ=0; hotfix §6.138 commit `fada4a6`, 13 fixture aligned in-place).
**Bump:** v2.5.40-rc → **v2.5.40-rc.1** (release candidate progressiva, NO bump definitivo a v2.5.40 fino a CP browser parte 5/5 verde).
**Esito:** ⚠️ **MISTO** — Setup PWA install ✅, hotfix latente §6.138 ✅, CP browser P1-P5+P8 ❌ bloccati su §6.141. Decisione: split a Sessione 9-B parte 5/5 analisi-first (regola critica #5).

### CP eseguiti / esito sintetico

| Step | Scope | Esito | Persistenza |
|------|-------|-------|-------------|
| CP0 sanity-light (4 gate) | git status, top commit, test 371/371, ref §6.13x | ⚠️ 2/4 mismatched (Gate 2 Changelog tracked drift, Gate 4 ≥3 vs effettivo 1) | annotato come drift §11 wording, non bug |
| §6.136 patch `__pt` gate | rimuovere `if (!import.meta.env.DEV) return` per esporre `__pt.notifications` in build | ✅ applicato Step 7, ✅ revertato Step 21a | working tree (no commit) |
| §6.137 install PWA | icone 1×1 placeholder → 3 PNG validi via Pillow + installer self-extracting SHA-1 | ✅ applicato Step 9, ✅ revertato Step 21a | working tree (no commit) |
| Hotfix §6.138 | `entry.farmaco_id`/`dose_numero` flat → `entry.orario?.X` nested + 13 fixture aligned | ✅ committed `fada4a6` | repo branch `step-8` |
| CP browser P1 (permission flow) | toggle ON → prompt OS accept → permission granted + notifiche_attive=1 + pending>0 | ⚠️ partial fail: granted+attive OK, pending=0 (cause: §6.140 init no-rearm + §6.141 wall-clock setTimeout filter) | runtime, non riproducibile in unit |
| CP browser P2-P5+P8 | non eseguiti (P1 bloccante) | ❌ deferred | parte 5/5 |
| CP6 closing | bump definitivo v2.5.40 NON eseguito | ❌ deferred | parte 5/5 |

### Scoperte session-level (deviazioni introdotte)

| § | Tipo | Stato | Sintesi |
|----|------|-------|---------|
| **§6.136** | workaround sessione | chiusa post-revert | gate `__pt` rimosso temporaneo per build production CP browser |
| **§6.137** | asset patch | chiusa post-revert | icone PWA 1×1 → 192/512/512 placeholder validi |
| **§6.138** | bug latente | **chiusa committed `fada4a6`** | path mismatch CP4 §6.128 incompleto |
| **§6.139** | drift UX | deferred Wave-C | SezioneNotifiche button-style vs slider 4-state |
| **§6.140** | bug minore | deferred Wave-C | `actions.init()` non re-arma reschedule al boot |
| **§6.141** | architecture blocker | active parte 5/5 | `simulatedNow` non propaga ai `setTimeout` wall-clock-bound |

### Catena decisionale CP browser P1 (per future referenze)

1. Pre-check tab Chrome dev: `standalone:false ptKeys:10 hasNotif:undefined permission:default` → tooling missing in dev (`__pt.notifications` esposto solo se §6.126 ha eseguito; verificato non gated da `isStandalone`)
2. HMR stale Vite (~25h running): patch §6.126 può non essere propagata a context provider — risolto con restart `rm -rf node_modules/.vite && npm run dev`
3. Tooling esposto, ma `vite-plugin-pwa` ha `devOptions.enabled: false` → PWA non installabile in dev → build production necessario
4. Build production gate `import.meta.env.DEV` blocca `__pt` → §6.136 patch
5. Build production manifest valido + SW activated, ma "No supplied icon ≥144 px square" (icone 1×1) → §6.137 patch
6. PWA installabile via Chrome menu ⋮ → "Install page as app...", finestra standalone OK, `__pt` esposto, permission granted post-toggle
7. P1 forced reschedule manuale → `pending:0` → diagnosi shape entry → §6.138 latent bug → patch + 13 fixture + commit
8. Post-§6.138 ri-validation: bundle stale residuo (workbox cache) → SW unregister + caches.delete + Cmd+Shift+R
9. Post-cache-clear: `pending:0` ancora → diagnosi `delay = fireAt - Date.now()` con wall clock → §6.141 architecture limit
10. Decisione: chiusura parte 4/4 con commit §6.138, split a parte 5/5 analisi-first per design workaround §6.141 + run CP browser P1-P5+P8 in finestra reale o via test-dose helper

### File modificati / committati

**Committed (commit `fada4a6` figlio di `f856b46`):**
- `src/services/notifications.js` — 2 path corrections + 5 righe comment §6.138 (172, 174, 192, 193, 195)
- `src/services/notifications.test.js` — 13 fixture aligned (11 single-line + 2 multi-line)
- `src/state/AppContext.test.jsx` — 1 fixture multi-line aligned

**Working tree post-revert (Step 21a, NO commit):**
- `src/state/AppContext.jsx` — restored from `.bak.cp-browser` (gate `__pt` re-attivato)
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — restored stub 1×1 da `.bak.cp-browser`

**Untracked rimasti (cleanup parte 5/5):**
- `src/components/config/ImpostazioniTab.jsx.bak.cp5` — Sessione 9-B parte 3/3 §6.135 backup
- `src/components/config/ImpostazioniTab.test.jsx.bak.cp5` — idem

### Decisioni di scope chiusura

| Decisione | Razionale |
|-----------|-----------|
| **Commit §6.138** in parte 4/4 (NON in parte 5/5) | unit-validated 371/371 sufficiente; fix ortogonale al CP browser blocker; commit pulito riduce delta di parte 5/5 |
| **Revert §6.136 + §6.137** working tree | mantenere working tree pulito per Changelog v2.5.40-rc.1 commit + ri-applicabili in parte 5/5 idempotentemente |
| **Non investigare §6.140** (init no-rearm) in-session | non bloccante (workaround forced reschedule funziona), defer Wave-C riduce scope parte 5/5 |
| **Non investigare §6.139** (button vs slider) in-session | UX rifinitura, defer Wave-C |
| **Modalità analisi-first parte 5/5** vs esecutiva | §6.141 è design decision (3 opzioni A/B/C); regola critica #1 si applica |

### Limitazioni note

1. **CP browser P1-P5+P8 NON eseguiti** runtime. §6.138 unit-validated ma non runtime-validated (P1 dipende da `pending > 0` ma a wall clock 21:00+ piano demo statico non ha dosi future).
2. **Bump definitivo v2.5.40 deferred** a parte 5/5 verde.
3. **iPhone PWA non testato** (defer Wave-C come §22.22).
4. **§6.140 + §6.141 + §6.139** aggiungono carico Wave-C; valutare in parte 5/5 chiusura se 3 deviazioni residue ammettono bump v2.5.40 o richiedono v2.5.40-rc.2 intermedio.

### Lessons learned

1. **CP browser è blocco runtime non assimilabile a unit test** — bug latenti come §6.138 sopravvivono unit test perché le fixture replicano lo shape sbagliato. Pattern di scoperta: dump `JSON.stringify(state.X[N], null, 2)` early in CP browser.
2. **Setup PWA install ha pre-condizioni multiple non auto-controllate** (gate `__pt`, icone valide, manifest, SW, devOptions). §11 line 3209 le presupponeva implicitamente; parte 5/5 deve esplicitarle nel CP0.
3. **`simulatedNow` ha scope UI, non tempo-globale** — limitazione architetturale che §6.141 documenta. Le sessioni future devono distinguere "test in ora simulata UI" vs "test che richiedono tempo reale" (`setTimeout`/`setInterval`/`Notification API`/`beforeinstallprompt`/`requestAnimationFrame`).
4. **Pattern §6.118 da estendere** a "validate concrete scenario AT EVERY data shape boundary, not just at AMB". §6.128 aveva fixato un livello (array-as-dict), §6.138 l'altro (path mismatch). Una review sistematica ai data shape boundary in CP4 avrebbe scoperto entrambi.
5. **Sessione split su blocker architecturale**: non confondere "esecuzione bloccata" con "fallimento sessione". Pattern §6.79 + §6.99 + ora §22.23: lo split è un esito accettabile, documentato, non punitivo.

### Azioni sul Mac post-Sessione 9-B parte 4/4

1. Stato git corrente: tree clean tranne `.bak.cp5` Sessione 9-B parte 3/3 (cleanup pendente parte 5/5). Top `fada4a6` 9-B parte 4/4 hotfix §6.138 (parent: `f856b46` Changelog v2.5.40-rc).

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.40-rc.1** (questo delivery).

3. Commit Changelog separato (KB-only convention, repo traccia il Changelog dalla v2.5.40-rc):
   ```
   echo 'Commit Changelog v2.5.40-rc.1'
   git add PharmaTimer_Changelog_Fase2.md && git commit -m 'Changelog v2.5.40-rc.1 (Sessione 9-B parte 4/4 esecutiva, esito misto)'
   ```

4. **NON eliminare i backup `.bak.cp5`** fino a chiusura CP browser parte 5/5 verde (pattern §6.135 esteso).

5. **Eseguire CP0 sanity-light** del prompt §11 v2.5.40-rc.1 prima di aprire Sessione 9-B parte 5/5:
   ```
   echo 'CP0 9-B parte 5/5 sanity-light'
   git status
   git --no-pager log --oneline -3
   npm test -- --run 2>&1 | tail -5
   grep -c '§6.138' src/services/notifications.js
   ```
   Atteso: tree clean (a parte `.bak.cp5`), top `fada4a6` (o `<hash>` Changelog v2.5.40-rc.1 se committato a step 3), 371/371 in 35 files, almeno 1 match `§6.138` nel codice.

6. Aprire Sessione 9-B parte 5/5 (nuova conversazione Claude) con one-liner:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-B parte 5/5 analisi-first).
   ```

## 22.24 Stato post-Sessione 9-B parte 6/6 implementativa parziale (sblocco §6.146 + scoperta §6.147+§6.148)

**Esito:** ⚠️ **PARZIALE** — §6.146 sbloccato ✅ (CP1 Tentativo A risolutivo), CP browser P1 ❌ ha rivelato due bug runtime indipendenti (§6.147 plan cross-day + §6.148 §6.145 disconnect bundle/runtime), CP browser P2-P5+P8 deferred Sessione 9-C analisi-first. Bump v2.5.40 NON eseguito. Bump cosmetico v2.5.40-rc.2 → **v2.5.40-rc.3**.

### Sintesi ottenuti

| CP | Scope | Esito | Riferimento |
|---|---|---|---|
| CP0 sanity-light | 4 gate (tree+commit+grep+test) | ✅ | 12 untracked invece di 10 (extra: `.bak2` Changelog user-safety + nessuna anomalia bloccante) |
| CP1 Tentativo A | rebuild radicale `rm -rf node_modules package-lock.json && npm install && npm run build:tooling` | ✅ | bundle `Ci2FlSxN` (405564b) → `Cd8Of8Q2` (405628b, +64b) |
| CP1.5 verifica falso positivo | check semantico bundle pre/post | ✅ | pattern `SET_PLAN",payload:Te` confermato (`Te=newPlan`, `Ce=freshState` minified). §6.146 falso positivo metodologico documentato |
| Setup CP browser | preview + Chrome + clear site data + dropdown context `top` | ✅ | richieste 2 iterazioni (SW residuo, dropdown `(no item select…)`); pattern stabilizzato |
| CP browser P1 | `scheduleTestDose(5)` → atteso `pending: 4` | ❌ | osservato `pending: 3` ad ore valide (delay > 0). §6.148 nuovo |
| CP browser P1 (collateral) | ispezione `state.plan` pristine | ❌ scoperta | 27 entries × 3 giorni (`2026-04-29 / 04-30 / 05-01`), keys univoche pattern intentional. §6.147 nuovo |
| CP browser P2-P5+P8 | restanti CP | ⏸️ deferred 9-C | bloccato da §6.147+§6.148 |
| CP6 closing v2.5.40 | bump definitivo | ⏸️ deferred 9-C+ | non possibile finché §6.147+§6.148 aperti |

### Deviazioni introdotte / chiuse

| Deviazione | Stato | Note |
|---|---|---|
| §6.146 | **CHIUSA** ✅ | Causa root candidata: cache nascosta in `node_modules`/`package-lock.json` non invalidata da pulizie targeted. Soluzione: rebuild radicale. Falso positivo metodologico documentato (canary marker su commenti = inconcludente; `grep <identifier>` su bundle minified = invalido per identificatori locali). Lessons-learned in §6.146 closing |
| §6.147 | **NUOVA — open** | Plan cross-day 27 entries (3 giorni). Intentional vs regression — verifica in 9-C |
| §6.148 | **NUOVA — open** | §6.145 fix presente nel bundle (verifica CP1.5) ma `pending_post=3` invece di 4 in runtime. Disconnect unit-test/bundle/runtime. 4 ipotesi root cause H-A÷H-D documentate, H-B esclusa via wall-clock. Investigazione in 9-C |

### Lessons-learned operative

1. **Cache Vite/Rollup cleaning affidabile** = `rm -rf node_modules package-lock.json && npm install`. Targeted clean (`node_modules/.vite`, `dist`, `node_modules/.cache`) **non sufficienti**. Documentare in §8 convenzioni come step di troubleshooting standard
2. **Mai canary marker su commenti** per verificare che un build legga il sorgente — i commenti sono sempre rimossi da minify, indipendentemente da cache
3. **Mai `grep <identifier-name>` su bundle production-minified** come prova di presenza di un fix — gli identificatori `const`/`let` locali sono rinominati. Patterns validi: confronto semantico pre/post, sourcemap, behavior runtime
4. **CP browser è scoperta-friendly per definizione** — può rivelare bug latenti invisibili agli unit test (375/375 verde non garantisce runtime sano). Pattern §6.138/§6.145/§6.147/§6.148 conferma: ogni sessione esecutiva post-implementativa ha rivelato almeno 1 bug nuovo. Da preventivare margine di scoperta in tutti i prompt CP browser futuri
5. **Service Worker su `vite preview`** può rubare il control del frame `top` lasciando dropdown DevTools `(no item select…)`. Workaround: Application → Storage → Clear site data **deselezionando IndexedDB** (preserva dati app), tab nuova, riapri DevTools. Documentare in §6.143+ doc CP browser come step preliminare standard
6. **Markdown autolink Console** — il client Claude.ai può autolinkare token simili a TLD (`pt.app` = TLD valido) in `[pt.app](http://pt.app)` markdown, rompendo JS incollato in DevTools Console. **Pattern operativo:** usare `window['__pt']['app']` (bracket notation) o equivalenti che evitino sintassi sensibile a markdown autolink

### Decisioni operative parte 6/6

| Decisione | Razionale |
|---|---|
| **Niente bump v2.5.40 definitivo** | §6.147+§6.148 open, behavior runtime non validato. Bump prematuro sarebbe regression pubblicizzata |
| **Bump cosmetico v2.5.40-rc.2 → v2.5.40-rc.3** | Documentazione changelog avanzata + §6.146 chiusura, ma niente release marker |
| **Cleanup `.bak.*` deferred 9-D+** | Pattern §6.135: backup sopravvivono fino al CP6 closing definitivo. Parte 6/6 non chiude scope |
| **§6.146 chiusura intra-sessione** | Causa root candidata + soluzione + lessons-learned già consolidati, no investigazione ulteriore richiesta |
| **§6.147+§6.148 a 9-C analisi-first** | Bug runtime con root cause non triviale — investigazione strutturata Q&A pattern, no quick-fix in-sessione (regola critica #1) |
| **Sessione 9-C analisi-first** vs esecutiva | §6.147 può essere intentional (no fix code) o regression (revert/fix); §6.148 richiede design del fix, non può essere implementato senza prima isolare root cause. Analisi-first appropriata |

### Stato git post-sessione

- Branch: `step-8`
- Top commit: `35fed4d` (invariato vs parte 5/5, no nuovi commit Mac-side in parte 6/6 — solo doc-side)
- Working tree: 2 modificati (`PharmaTimer_Changelog_Fase2.md`, `package-lock.json`) + 12 untracked (10 baseline §11 parte 5/5 + 1 `.bak2` user safety + 1 `package-lock.json.bak.cp1A` da CP1A)
- `package-lock.json` modificato come effetto collaterale di `npm install` post-`rm`. Idempotente da git perspective; opzionale committare se cambia versioni transitive significative — verifica in 9-C closing pre-bump
- Bundle `dist/assets/index-Cd8Of8Q2.js` su disco (405628 byte, post-CP1A)
- Preview spenta (kill PID 2413 fine sessione)

### Hand-off a Sessione 9-C analisi-first

§11 sostituita con prompt **Sessione 9-C analisi-first** dedicata a §6.147 + §6.148. Pattern Q&A 10 domande (Q1-Q5 §6.147, Q6-Q10 §6.148). Output atteso: AMB-9-C.A÷N congelate, decisione split implementativo (9-D singola o 9-D+9-E).

Aprire Sessione 9-C (nuova conversazione Claude) con one-liner:
```
Esegui il prompt al §11 del Changelog (Sessione 9-C analisi-first §6.147 + §6.148).
```


## 22.25 Stato post-Sessione 9-C analisi-first (chiusura §6.147 + §6.148 senza fix code)

**Data:** 30 aprile 2026.
**Baseline test pre-sessione:** 375/375 su 36 test files (§22.24 post-9-B parte 6/6 parziale).
**Baseline test post-sessione:** 375/375 invariato (analisi-first pura, zero codice scritto).
**Bump:** v2.5.40-rc.3 → **v2.5.40-rc.4**.
**Esito:** ✅ **Completo** — entrambe le deviazioni §6.147 + §6.148 chiuse senza fix code; pattern §6.149 reusabile introdotto; AMB-9-C.A+B congelate; decisione no-split (9-D singola sessione esecutiva snella).

### Scope consegnato

Sessione 9-C analisi-first aperta come one-liner `Esegui il prompt al §11 del Changelog (Sessione 9-C analisi-first §6.147 + §6.148).` (raccomandato in §11 v2.5.40-rc.3). Modalità Q&A iterativa con risposte deterministiche dirette dai DIAG (no Q&A pieno: dati DIAG univoci hanno risolto Q1-Q5 §6.147 in singola passata, e il runtime test DIAG-RT-1 ha risolto Q6-Q10 §6.148 in singolo CP browser).

### Decisione strategica

**Niente split implementativo 9-D + 9-E.** Le 3 opzioni del §11 v2.5.40-rc.3 ("split immediato in 9-D singola" / "9-D + 9-E split per regression" / "§6.148 sola in 9-D, §6.147 by-design in 9-C") **decadute tutte e tre** dato che entrambi i bug si rivelano non-bug:

- §6.147 = intentional by-design dal Step 5b-2 (no fix code, doc spec §3 in 9-D closing)
- §6.148 = falso-positivo metodologico (no fix code, pattern §6.149 reusabile)

→ Sessione 9-D pianificata come **esecutiva snella browser-heavy** dedicata ai CP browser P2-P5+P8 deferred di parte 6/6 + bump v2.5.40 + cleanup + closing.

### CP0 9-C verde (5/5)

| Gate | Esito | Valore |
|---|---|---|
| 1 | tree status | ✅ 12 untracked attesi (10 baseline parte 5/5 + `Changelog.bak2` + `package-lock.json.bak.cp1A`) |
| 2 | top commit chain | ✅ `35fed4d` (CP1.1 hotfix §6.145), parent `3de09ab`, parent `d7f252a` |
| 3 | test suite full run | ✅ 375 passed in 36 files (6.82s) |
| 4 | bundle on disk | ✅ `index-Cd8Of8Q2.js` 405628 byte |
| 5 | branch | ✅ `step-8` |

### Dataset diagnostico §6.147 (DIAG-1÷7 Mac-side)

| DIAG | File / scope | Output rilevante | Conclusione |
|---|---|---|---|
| DIAG-1 | `domain/planBuilder.js` (`addDays|today|dateStr|day.*range|forEach.*day|PLAN_DAYS`) | riga 101 itera `addDaysLocal(startDate, d)` su `d ∈ [0, PLAN_TOTAL_DAYS)` | Genera N giorni contigui by-design |
| DIAG-2 | `domain/constants.js` (`PLAN_DAYS_*`) | `PLAN_DAYS_BEFORE=1`, `PLAN_DAYS_AFTER=1`, `PLAN_TOTAL_DAYS=3` | Look-ahead 3-day **dichiarato esplicitamente** |
| DIAG-3 | `state/selectors.js` (`selectEntriesForDay`) | `state.plan.filter(e => e.dateStr === dateStr)` | Filtro day-scoped corretto, niente bug |
| DIAG-4 | `state/actions.js` (`scheduleTestDose`) | sintetica con `dateStr: today`, `orario.farmaco_id`, `dose_numero=999`, `stato='prevista'` | Shape canonica corretta |
| DIAG-5 | `services/notifications.js` (`rescheduleAllNotifications`) | usa `selectEntriesForDay(state, today)` (riga 170-171), filtri `stato ∈ {prevista,ricalcolata}` (173), lookup farmaco corretto (176) | Consumer notifiche day-scoped corretto |
| DIAG-6 | `git log` planBuilder/recalc/selectors | ultimo touch `d5de70f` (9-A CP3 §6.115b) "planBuilder invariante §6.23 esteso", precedenti commit di routine | Nessun drift cronologico recente |
| DIAG-7 | `git log -p --follow constants.js` | I 3 add `+export const PLAN_DAYS_*` sono il commit di **introduzione**, niente storia di drift | Costanti nascono già con valore 3 (Sessione 5b-2 §6.72) |

**Verdetto §6.147 (Q1-Q5 risolti):** intentional by-design → AMB-9-C.A.

### Dataset diagnostico §6.148 (DIAG-8÷20 Mac-side + DIAG-RT-1 Chrome-side)

**Mac-side (DIAG-8÷20):**

- DIAG-8 `showDoseNotification` body: `entryKey = dose-{farmaco.id}-{entry.orario?.dose_numero}-{dateStr}`; `fireAt` da `ora_ricalcolata` (ISO) o `composeIsoDateTime(dateStr, ora_prevista)`. Nessun branch latente.
- DIAG-9 `scheduleNotification`: tag-based replacement via `pending.has(entryKey)` + `clearTimeout`; `delay <= 0` early-return; `setTimeout` defensive `Notification.permission` check al fire.
- DIAG-10 factory `createNotificationsService` + `pending` Map closure-private.
- DIAG-11 body completo `scheduleTestDose`: `freshState = {...state, plan: newPlan}` esplicito post-dispatch (fix §6.145), no `getState()` lazy reread.
- DIAG-13 `AppContext.jsx` consumer `rescheduleAllNotifications`: chiamato da `maybeReschedule(s)` (riga 146-149) gated su `s.impostazioni?.notifiche_attive === 1`. Trigger 3 (riga 169 tick rolling/rebuild) + trigger 2 (riga 179 `onForegroundEvent` su `visibilitychange`+`focus`).
- DIAG-13b useEffect dependency arrays: stateRef update via `useEffect(() => { stateRef.current = state; }, [state])` (78-81), tick `setInterval(tick, TICK_INTERVAL_MS)` con cleanup.
- DIAG-14 `selectFarmacoById` (selectors.js:125): `(state.farmaci || []).find(f => f.id === id) ?? null`. Corretto.
- DIAG-15 4 test scheduleTestDose: (1) happy path canonical shape + showDoseNotification chiamato 1×, (2) NOT_READY rejection, (3) NO_FARMACI rejection, (4) state freshness §6.145 con dispatch mock no-mutate (verifica passing freshState esplicito).
- DIAG-16 `TICK_INTERVAL_MS = 60_000` (1 minuto).
- DIAG-17 reducer SET_PLAN: `return { ...state, plan: action.payload };` (preserva sintetica nel plan).
- DIAG-18 maybeReschedule chiamato in 2 path: tick (rolling/rebuild) + onForegroundEvent.
- DIAG-19 `actions.rebuildPlan`: ricostruisce plan da farmaci+orari via `buildMultiDayPlan` (NON preserva sintetica). Chiamato solo se `selectToday(s) !== s.lastBuiltForDay` (rollover detect).
- DIAG-20 tick body completo: legge `stateRef.current`, rebuild solo a rollover, reschedule solo su rebuild OR rolling 30 tick. `onForegroundEvent` su `focus` reschedula sempre se ready.

**Chrome-side (DIAG-RT-1, IIFE async pattern §6.149):**

```
{
  "before": 3,
  "afterAwait": 4,
  "after100ms": 4,
  "plan_total": 28,
  "plan_dates": ["2026-04-29", "2026-04-30", "2026-05-01"],
  "sint_present": true,
  "sint_dateStr": "2026-04-30",
  "sint_ora_prevista": "17:15",
  "sint_stato": "prevista",
  "sint_orario": {"farmaco_id": 1, "dose_numero": 999, "offset_minuti": 0},
  "result": {"ok": true, "ora_prevista": "17:15", "farmacoId": 1}
}
```

**Verdetto §6.148 (Q6-Q10 risolti):** falso-positivo metodologico → AMB-9-C.B + §6.149 nuova.

### Tabella ipotesi root cause §6.148 (7 totali, 6 escluse)

| Ipotesi | Stato | Evidenza esclusione |
|---|---|---|
| **H-A** plan cross-day filtra male sintetica | ❌ esclusa | DIAG-3 + DIAG-RT-1: selectEntriesForDay corretto, sint_dateStr === today, sintetica inclusa |
| **H-B** delay ≤ 0 no-op | ❌ esclusa | wall-clock delay ≈ 5 min > 0 |
| **H-C** entryKey collision sentinel 999 | ❌ esclusa | DIAG-8/9: dose_numero=999 non collide con dosi reali (1..N max) |
| **H-D** race dispatch+reschedule async | ❌ esclusa | DIAG-11 freshState esplicito + DIAG-RT-1 after100ms = afterAwait (no race) |
| **H-E** lookup farmaco fallisce | ❌ esclusa | DIAG-14 selectFarmacoById corretto, sint farmaco lookup match |
| **H-F** secondo reschedule async post-dispatch (TICK_INTERVAL_MS=60s o onForegroundEvent) sovrascrive | ❌ esclusa | DIAG-RT-1 after100ms = 4 invariato; tick non scatta in 100ms; focus rimane su Console durante test; H-F sarebbe stato evidente con drop pending=4 → pending=3 entro la finestra di osservazione |
| **H-G2** Promise non awaited (pattern Console) | ✅ **confermata** | DIAG-RT-1 before=3, afterAwait=4 mostra che il valore osservato in §6.148 originale era pre-microtask del thunk async |

### AMB-9-C congelate (2 totali, no AMB.C÷N)

| ID | Scope | Esito | Fix |
|---|---|---|---|
| **AMB-9-C.A** | §6.147 plan cross-day intentional vs regression | Intentional by-design (`PLAN_DAYS_TOTAL=3` da 5b-2 `buildMultiDayPlan` §6.72) | Zero codice. Doc spec §3 raccomandata in 9-D closing |
| **AMB-9-C.B** | §6.148 §6.145 disconnect bundle/runtime | Falso-positivo metodologico (Promise non awaited in CP browser parte 6/6) | Zero codice. Pattern §6.149 reusabile per CP browser future |

### Deviazioni introdotte / chiuse

| Deviazione | Stato | Note |
|---|---|---|
| §6.147 | **CHIUSA ✅ by-design** | DIAG-1÷7 univoci, AMB-9-C.A. Doc spec §3 update in 9-D closing (non bloccante) |
| §6.148 | **CHIUSA ✅ falso-positivo metodologico** | DIAG-RT-1 deterministico, AMB-9-C.B, 7 ipotesi H-A÷H-G2 (1 confermata, 6 escluse) |
| §6.149 | **NUOVA — chiusa** | Lessons-learned Console DevTools `await` mandatory. Pattern operativo IIFE async + `await` interno + `console.log` strutturato finale. Parallelo metodologico §6.146 (canary marker su commenti / `grep <identifier>` su bundle minified). Da formalizzare in §8 |

### Limitazioni note

1. **Doc spec §3 update non eseguito in 9-C.** AMB-9-C.A richiede che §3 di `PharmaTimer_Project_Spec.md` documenti esplicitamente lo scope multi-day (`PLAN_DAYS_TOTAL=3`, projection day-scoped via `selectEntriesForDay`). 9-C ha congelato la decisione ma non l'ha attuata: scheduled per 9-D closing pre-bump v2.5.40.
2. **CP browser P2-P5+P8 ancora deferred.** Validazione runtime AMB-9.E'/G'/H rimane a 9-D. Il pattern §6.149 (`await` mandatory) è ora formalizzato e va applicato a tutti i CP browser P2-P8.
3. **CP browser P6+P7 raccomandati ma non obbligatori per bump v2.5.40.** Coverage AMB-9.F' decision tree 4 stati (permission revocation defensive + non-PWA fallback) è coperto da unit test CP5 9-B parte 3/3; runtime validation è defensive, non blocking.
4. **`__pt.notifications` ancora esposto via `VITE_PT_TOOLING=1`.** Non da rimuovere prima del bump (CP browser P2-P8 lo richiedono). Possibile cleanup futuro Wave-C / Step 11 polish.

### Lessons-learned operative

1. **DIAG come strategia di compressione Q&A.** §6.147 è stato chiuso in singolo turno post-DIAG-1÷7 senza Q&A iterativa pulita: i dati DIAG erano univoci e convergenti. Pattern: quando 3+ DIAG concordano su una conclusione deterministica, scrivere il verdetto direttamente nelle AMB e chiedere conferma binaria all'utente, evitando il pattern Q1-Q5 sequenziale.
2. **Pattern §6.149 (IIFE async + `await`) è obbligatorio per CP browser future.** Internalizzato in §11 9-D scope. Costo: ~2 righe in più di Console boilerplate. Beneficio: zero falsi-positivi tipo §6.148 originale.
3. **Sessione 9-C ha esercitato pattern §6.118 (validare prima di concludere) senza scorciatoie.** 7 ipotesi indagate prima di chiudere §6.148, runtime test deterministico richiesto per dirimere H-G2 vs altre. Coerente con regola critica #2 (fermarsi su incongruenze).
4. **Decisione "no-split 9-D + 9-E" risparmia 1 sessione.** Quando sessione analisi-first scopre che bug originali sono non-bug, decisione split decade automaticamente. Pattern: aggiornare §11 next-step con scope ridotto invece di forzare scope inflato per "completare" il piano originale (regola critica #5 dimensionamento).
5. **Drift §6.69 v2.5.34 perpetuato in v2.5.40-rc.4.** Pattern fatto-storico immutabile §6.71/§6.85 conferma: gap v2.5.33 → v2.5.35 → ... → v2.5.40-rc.4 mantenuto, mai retrocorretto.

### File prodotti / modificati

**Modificati (docs):**
- `PharmaTimer_Changelog_Fase2.md` — v2.5.40-rc.3 → **v2.5.40-rc.4** (questo delivery): front-matter, §1 entry v2.5.40-rc.4 nuova, §6.147 promossa CHIUSA by-design, §6.148 promossa CHIUSA falso-positivo, §6.149 NUOVA, §7 row 9-B aggiornata + row 9-D nuova pianificata, §11 sostituita con prompt esecutivo Sessione 9-D, §22.25 nuova.

**Modificati (code):** nessuno (analisi-first pura).

**Nuovi:** nessuno.

### Azioni sul Mac post-Sessione 9-C analisi-first

1. Stato git corrente: tree clean tranne 12 untracked `.bak.*` attesi, top `35fed4d` invariato. Convenzione progetto: KB-only, repo tracks code only.

2. **Sostituire `PharmaTimer_Changelog_Fase2.md` nella KB Claude.ai** con la versione **v2.5.40-rc.4** (questo delivery).

3. Commit Changelog separato (solo se il repo lo traccia — convenzione progetto: KB-only):
   ```
   echo 'Commit Changelog v2.5.40-rc.4 (opzionale, dipende da convenzione progetto)'
   git add PharmaTimer_Changelog_Fase2.md 2>/dev/null && git commit -m 'Changelog v2.5.40-rc.4 (Sessione 9-C analisi-first)' || echo 'Changelog non tracciato in git, solo upload KB'
   ```

4. **Eseguire CP0 sanity-light** del prompt §11 v2.5.40-rc.4 prima di aprire Sessione 9-D:
   ```
   echo 'CP0 9-D sanity-light'
   git status --short
   git --no-pager log --oneline -3
   npm test -- --run 2>&1 | tail -8
   ls -la dist/assets/index-*.js
   git branch --show-current
   ```
   Atteso: 12 untracked `.bak.*` (invariati post-9-C), top `35fed4d`, 375/375 in 36 file, `Cd8Of8Q2.js` 405628 byte, branch `step-8`.

5. **Avviare preview con tooling esposto** prima di Sessione 9-D (richiesto per CP browser):
   ```
   echo 'Avvio preview con tooling esposto (richiesto per CP browser P2-P8 9-D)'
   VITE_PT_TOOLING=1 npm run preview
   ```
   Lasciare il terminale aperto durante 9-D.

6. Aprire Sessione 9-D (nuova conversazione Claude) con one-liner:
   ```
   Esegui il prompt al §11 del Changelog (Sessione 9-D esecutiva snella).
   ```
