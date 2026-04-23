# PharmaTimer — Changelog Fase 2 (PWA frontend)

**Versione:** 2.5.25
**Data inizio fase:** 16 aprile 2026
**Ultima modifica:** 23 aprile 2026
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
| **8c** | FarmaciTab: CRUD farmaci + form unico con orari inline (§6.66) + save atomico `withTransaction` + soft-delete (§6.67) + flip `GET_FARMACI_SOLO_ATTIVI=true` + date editabili (§6.68). CP0: verificare `DoseCard` usi delta storico del log (§6.64 nota) | | Target ~10-12 file, +25-35 test |
| **8d** | Polish Config + a11y (focus trap dei form, aria-labels, Escape semantics nei confirm dialog) + chiusura deviazioni emerse in 8a-8c | | Target ~3-5 file, +5-10 test |
| 9 | Notifiche locali (Notification API + scheduling) + **fix dominio §6.18 cross-midnight** (§6.26) | | |
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


## 11. Prossimo step — messaggio di apertura Sessione 8b (implementativa)

**Modalità:** implementativa blindata sulle 13 AMB-8b.A-M + 5 rettifiche F1-F5 congelate in §22.7. Nessuna Q aperta. Tutte le decisioni di design, shape action, firma thunk, selettori, CP breakdown sono già definitive — l'implementazione esegue il piano senza riaprire discussioni UX o architetturali.

**Contesto.** 8b analisi-first (23/04/2026, v2.5.24 → v2.5.25) ha consumato il dry-run CP0 sul codebase post-8a e prodotto le 13 AMB su ProfiliTab. **Scoperta architetturale principale (Rettifica F1):** l'hook `useUnsavedChanges` NON si estrae in 8b — il pattern dirty-lifted-to-parent con props opzionali, già attivo in ConfigView + ImpostazioniTab, soddisfa DRY-at-2 quando ProfiliTab aggancia lo stesso pattern. Estrazione deferita al 3° consumer naturale (8c o 8d). Conseguenza: CP breakdown scende da 7 a 6 CP, target test ricalibrato da +18-22 a **+14-18** (269 → 283-287).

**Foundation ereditata da 8a:** `/config/*` nested routing, ConfigTabBar click-intercept via `onTabClick`, `UnsavedChangesModal` inline, pattern `dirty={props?.dirty ?? localDirty}` in ImpostazioniTab. Repo layer profili **già completo** (`addProfilo`/`updateProfilo`/`deleteProfilo` con guard §6.5/`getProfili`/`setProfiloAttivoConCleanup`/`withTransaction`): zero modifiche repo necessarie in 8b.

---

### Prerequisiti di lettura KB (in ordine)

1. `PharmaTimer_Changelog_Fase2.md` §22.7 — **fonte autoritaria** delle 13 AMB e 5 rettifiche. Tutto il resto è supporto.
2. `PharmaTimer_Changelog_Fase2.md`:
   - §6.5 (delete profilo attivo rifiutato — riferimento AMB-F)
   - §6.20 (`setProfiloAttivoConCleanup` + `cambiaProfilo` shape — riferimento AMB-D/F3)
   - §6.64 (rebuildPlan reattivo post-edit — riferimento AMB-D)
   - §6.77 (pattern cleanup mirror — riferimento per absence di mirror in 8b)
   - §6.78 (`config-tab-profili` testid stabile CP2→8c — invariante)
   - §6.82 (hotfix §8a — motivazione AMB-I useTheme pervasivo)
   - §22.6 (stato post-8a, scoperte operative 1-5, in particolare #5)
3. `PharmaTimer_Project_Spec.md` §3.4 (tabella `profilo_utente` campi — invariata) + §10.1 (profili esempio Nottambulo come motivazione AMB-B sonno-wrap).
4. Codebase post-8a (riferimento per assunzioni — già verificate in dry-run CP0):
   - `src/components/config/ConfigView.jsx` (dirty lifting pattern, UnsavedChangesModal wire)
   - `src/components/config/ImpostazioniTab.jsx` (pattern `dirty/setDirty` opt-props + useTheme + focus effect)
   - `src/components/config/ProfiliTab.jsx` (placeholder CP2, testid `config-tab-profili` — outer wrapper invariante)
   - `src/state/actions.js` (`cambiaProfilo(profilo)` shape oggetto-intero, pattern pessimistico `APPLY_CAMBIO_PROFILO`)
   - `src/state/reducer.js` (16 action cases, pattern `SET_FARMACI`/`SET_ORARI` come template per 2 nuove)
   - `src/state/selectors.js` (selettori esistenti come template — zero selettori profilo attuali)
   - `src/data/repository/LocalRepository.js` (7 metodi profili già implementati)
   - `src/hooks/useModalA11y.js` (focus trap drawer edit + ConfirmDeleteProfiloModal)

---

### Deliverable atteso

Sessione 8b implementativa produce:

1. **7-9 file (±1):**
   - *Nuovi:* `ProfiliTab.test.jsx`, `ConfirmDeleteProfiloModal` inline dentro `ProfiliTab.jsx` (non file separato per AMB-H)
   - *Modificati:* `ProfiliTab.jsx` (da placeholder a componente funzionale completo), `ConfigView.jsx` (passa `dirty`/`setDirty` a ProfiliTab), `state/actions.js` (4 nuovi thunk), `state/reducer.js` (2 nuove action), `state/selectors.js` (3 nuovi selettori), `reducer.test.js` (regression 2 action), `actions.test.js` (test thunk — se file esistente, altrimenti inline in test suite più vicina), `selectors.test.js` (regression 3 selettori).
2. **Target test: 269 → 283-287** (+14-18, bound AMB-L). Se a CP5 si è fuori bound: rettifica inline, no escalation.
3. **CP browser 6 punti** (dettaglio in §CP5 sotto).
4. **Chiusura con script `cp_close.sh`:** aggiorna §22.8 "Stato post-Sessione 8b implementativa" + consuma §11 → prompt Sessione 8c (FarmaciTab) + bump v2.5.25 → v2.5.26.

---

### CP breakdown (6 CP, blindato AMB-L)

**CP0 — Sanity gate pre-implementazione**

- Baseline: `git status` pulito, `npm test -- --run` = **269/269 su 26 test files**.
- 4 gate ispettivi:
  1. `grep -n "state\.profili\b\|state\.profiloAttivo\b" src/` → consumer attesi: OggiView (via `state.profiloAttivo` per render saluto/dose), `state/actions.js` (già noti: `init`, `cambiaProfilo`). Se emergono consumer imprevisti (7b/7c/7d), **rettifica inline** — probabile zero-impact ma da confermare.
  2. `grep -n "SET_PROFILI\|SET_PROFILO_ATTIVO" src/` → atteso **0 match**. Se >0: naming clash, rinominare le nuove action con suffisso dedicato.
  3. `grep -n "selectProfili\b\|selectProfiloAttivo\b\|selectProfiloById" src/` → atteso **0 match**. Se >0: naming clash, prefix `select…` comunque riservato per selettori.
  4. `ls src/hooks/useModalA11y*` → atteso esistente. Se assente (non ricordato da memories): branch alternativo senza focus trap drawer (comunque non-blocker per AMB-I/B, solo deferral a 8d).

**CP1 — ProfiliTab lista + card + "+ Nuovo" (read-only)**

- Trasformare `ProfiliTab.jsx` da placeholder a componente funzionale con lista profili letta da `selectProfili(state)`.
- Outer wrapper invariante: `<section data-testid="config-tab-profili">` (§6.78 convention).
- Ogni profilo: card con nome + orari (colazione/pranzo/cena preview), badge "Attivo" verde se `profilo.attivo===1`, bordo sinistro colorato (riuso token theme dal mockup v5 DoseCard language).
- Header tab: pulsante "+ Nuovo" top-right, opens drawer vuoto (wire in CP2).
- `useTheme` applicato da subito (AMB-I).
- **Test attesi (CP1):** +3 (lista render / badge attivo visibile / pulsante Nuovo presente).

**CP2 — Drawer edit profilo + form 6 campi**

- Drawer bottom-sheet full-height. Apertura via click su card (edit) o pulsante "+ Nuovo" (create-mode, campi vuoti).
- Form 6 campi: `nome_profilo` (text) + `ora_sveglia`/`ora_colazione`/`ora_pranzo`/`ora_cena`/`ora_sonno` (5 `<input type="time">`).
- Tutti required (client-side gate sul bottone Salva).
- Validazione ordine monotonica soft come warning non-blocker (AMB-B): `sveglia < colazione < pranzo < cena`, **escluso sonno** per wrap-mezzanotte (Nottambulo).
- Focus trap via `useModalA11y` (AMB-I).
- Dirty flag wired: `props?.dirty ?? localDirty` + `setDirty(true)` su ogni onChange field (pattern ImpostazioniTab).
- Bottoni: Salva (disabled se invalid o !dirty), Annulla (ripristina valori iniziali), nel profilo esistente + non-attivo: Elimina (apre ConfirmDeleteProfiloModal in CP4).
- **Test attesi (CP2):** +3 (drawer apre su click card con campi popolati / drawer apre vuoto su "+ Nuovo" / validation warning ordine appare).

**CP3 — Thunk add/update + selectors + reducer cases**

- **Selectors nuovi** (AMB-K) in `src/state/selectors.js`:
  ```js
  export function selectProfili(state) { return state.profili; }
  export function selectProfiloAttivo(state) { return state.profiloAttivo; }
  export function selectProfiloById(state, id) {
    return state.profili.find(p => p.id === id) ?? null;
  }
  ```
- **Reducer cases nuovi** (AMB-C) in `src/state/reducer.js`:
  ```js
  case 'SET_PROFILI':
    return { ...state, profili: action.payload };
  case 'SET_PROFILO_ATTIVO':
    return { ...state, profiloAttivo: action.payload };
  ```
- **Thunks nuovi** (AMB-D) in `src/state/actions.js`:
  - `addProfilo(data)`: pessimistico. `await repo.addProfilo({...data, attivo: 0})` → ottenuto id → `const profiliAggiornati = [...state.profili, {...data, id, attivo: 0}]` → `dispatch SET_PROFILI`. Return `{ok: true, id}`. Catch: `SET_ERROR kind:'repo'`, return `{ok: false}`.
  - `updateProfilo(id, patch)`: pessimistico. **AMB-E guard:** `const { attivo: _drop, ...safePatch } = patch`. `await repo.updateProfilo(id, safePatch)` → `profiliAggiornati = state.profili.map(p => p.id===id ? {...p, ...safePatch} : p)` → `dispatch SET_PROFILI`. Se `id === state.profiloAttivo?.id`: `dispatch SET_PROFILO_ATTIVO {...state.profiloAttivo, ...safePatch}` + `await rebuildPlan()` (AMB-D / §6.64). Return `{ok: true}`. Catch come sopra.
- Wire: drawer CP2 submit → `actions.addProfilo` (create) o `actions.updateProfilo` (edit) con `safePatch` dai campi form.
- **Test attesi (CP3):** +5 (selectProfili / selectProfiloAttivo / selectProfiloById / addProfilo thunk success / updateProfilo thunk con rebuildPlan su attivo). Eventualmente +1-2 se serve copertura error path.

**CP4 — Thunk deleteProfilo + ConfirmDeleteProfiloModal + UX guard**

- **Thunk deleteProfilo(id)** (AMB-D/F) pessimistico. `try { await repo.deleteProfilo(id); } catch (err) { dispatch SET_ERROR kind:'repo', message: err.message; return {ok: false}; }`. Se ok: `profiliAggiornati = state.profili.filter(p => p.id !== id)` → `dispatch SET_PROFILI`. Il repo già solleva l'Error giusto se profilo attivo (§6.5), il thunk non ripete la guard.
- **ConfirmDeleteProfiloModal inline** dentro `ProfiliTab.jsx` (AMB-H). Shape: backdrop `modalOverlay` + box con titolo "Elimina profilo?" + body "Questa azione non può essere annullata. {nome_profilo} verrà rimosso." + 2 bottoni (Annulla / Elimina red-bordered). Zero focus trap (deferred 8d coerente con UnsavedChangesModal attuale).
- **UI guard §6.5 (AMB-F):** bottone Elimina nel drawer **visibile per tutti i profili**, **disabled + tooltip "Non puoi eliminare il profilo attivo. Attiva un altro profilo prima."** quando `profilo.attivo===1`. Click su Elimina (non-attivo) → apre ConfirmDeleteProfiloModal → Conferma → `actions.deleteProfilo(id)` → su success: chiude modal + drawer, torna alla lista.
- **Test attesi (CP4):** +3 (deleteProfilo thunk success non-attivo / deleteProfilo thunk error guard §6.5 / UI modal confirm render e wire).

**CP5 — Thunk attivaProfilo wrapper + wire bottone "Attiva" + CP browser**

- **Thunk attivaProfilo(id)** (AMB-D/F3) wrapper: `const profilo = selectProfiloById(getState(), id)`. Se `profilo == null`: `dispatch SET_ERROR kind:'domain', message:'Profilo non trovato'`, return `{ok: false}`. Altrimenti: `return this.cambiaProfilo(profilo)` (delega + return passthrough). Documentare come wrapper esplicitamente.
- Wire bottone "Attiva" dentro drawer edit (profilo non-attivo): disabled durante operazione; su click chiama `actions.attivaProfilo(id)`; su success chiude drawer e mostra flash toast (se presente in codebase — altrimenti reliance sul badge "Attivo" che flippa).
- **Full test suite: `npm test -- --run`**. Atteso range 283-287 (bound AMB-L). Se out-of-bound: rettifica inline documentata come §6.86 (pattern §6.74 "non consumata" se azione errata).
- **Test attesi (CP5):** +1-2 (attivaProfilo wrapper happy path; eventualmente error path id-non-trovato).
- **CP browser (6 punti):**
  1. Apri `/config/profili` → lista 2 profili (Standard attivo + Nottambulo) + pulsante "+ Nuovo" visibile.
  2. Click su card Standard → drawer apre con 6 campi popolati. Bottone Elimina disabled, tooltip preventivo visibile.
  3. Modifica `ora_colazione` da 07:30 a 08:00 → dirty → click tab "Impostazioni" → UnsavedChangesModal → Annulla → torna drawer dirty → Salva → drawer chiude, card mostra 08:00. Cmd+R → persistito.
  4. Apri `/oggi` → tutti gli orari colazione-ancorati scalati di 30 min (Pantorc 07:30, non più 07:00). Conferma rebuildPlan triggered (AMB-D).
  5. `/config/profili` → click "+ Nuovo" → drawer vuoto → compila "Weekend" 09:00/09:30/13:00/20:30/23:30 → Salva → nuova card in lista, non attiva. Click card Weekend → drawer → bottone "Attiva" → click → badge "Attivo" flippa da Standard a Weekend. Apri `/oggi` → orari cambiati di nuovo. 
  6. `/config/profili` → click card Standard (ora non-attivo) → bottone Elimina attivo → click → ConfirmDeleteProfiloModal → Conferma → card scompare. Ripristino: crea profilo "Standard-rip" per safety net cleanup manuale, oppure `window.__pt.seed(true)` via DevTools se disponibile.

---

### Out-of-scope 8b (dichiarati ora, eseguiti dopo)

- Estrazione `useUnsavedChanges` hook → 8c o 8d (AMB-G).
- Promozione `ConfirmDeleteProfiloModal` a componente standalone → al 2° consumer (AMB-H).
- Estensione `renderWithRealProvider` con `initialEntries` → mai in 8b; se serve in futuro (AMB-J).
- Rettifica token dark ConfigTabBar (§6.81) → 8d polish.
- Investigation anomalia `nome_utente` azzerato (§6.85) → 8d polish.
- FarmaciTab form → 8c.

---

### Azioni sul Mac prima di Sessione 8b implementativa

1. Verificare baseline: `git status` pulito sul branch `step-8` + `npm test -- --run` → atteso **269/269 su 26 test files**.
2. Aggiornare KB progetto Claude con `PharmaTimer_Changelog_Fase2.md` v2.5.25 (output di questa sessione analisi-first).
3. Opzionale ma raccomandato: commit Changelog v2.5.25 in repo (coerente con §6.70 — drift = 1, sotto soglia, ma meglio allineare prima di avviare implementativa).
4. Aprire sessione 8b implementativa con one-liner:
   `Esegui il prompt al §11 del Changelog (Sessione 8b implementativa).`

## 12. File prodotti in Step 4a + 4b + 5a + 5b-1 + 5b-2 + 6 + 7a + 7b-1 + 7b-2 + 7c-1 + 7c-2 + 7d-1 + 7d-2p1 + 7d-2p2 + 7d-2p3

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

