# PharmaTimer -- regole operative per Claude Code

PWA clinica per la gestione della terapia farmacologica quotidiana.
React + Vite, FastAPI + MySQL, Dexie/IndexedDB. Fase 3, percorso rc verso v3.2.0.
Pilota unico: Roberto (id=2). **Non esiste produzione con utenti terzi.**

Convenzione tipografica di TUTTI gli artefatti, codice compreso: **ASCII puro**.
Zero lettere accentate, zero virgolette o trattini tipografici, nessun apostrofo
di elisione. Vale anche per i messaggi di commit, parentesi tonde comprese.
Codice e commenti in inglese; UI, messaggi utente e documentazione in italiano.

---

## 1. IL METRO CLINICO -- i TRE MAI

Normativo, Spec sezione 14.0. Governa OGNI decisione di design.

- **M1** -- mai indurre una doppia assunzione.
- **M2** -- mai perdere una presa avvenuta. Nessuno scarto automatico silenzioso.
- **M3** -- mai falsificare il record. Orario del TAP preservato, valori congelati al tocco.

**Regola permanente:** in ratifica si sottopongono **solo opzioni clinicamente
sicure**. Le vie non sicure si citano unicamente come rationale scartato, a verbale.

**Fail-safe ereditato, non negoziabile:** assenza di informazione significa
**PROCEDERE**, mai sopprimere. Sopprimere una consegna perche un dato manca e M2.

---

## 2. LE CINQUE REGOLE CRITICHE

1. **Nessuna riga di codice prima della ratifica esplicita.** Se il prompt pone
   domande numerate, si risponde a tutte e si attende. Se il compito e complesso
   e non ci sono domande, si propone una struttura e si attende approvazione.
   **In Claude Code questa regola vale di piu, non di meno:** poter scrivere sul
   disco rende piu facile attraversare una ambiguita invece di aprirla.
2. **Su incongruenza, ambiguita o difetto di design: FERMARSI e segnalare.**
   Non inventare soluzioni autonome nemmeno se sembrano ovvie. Le fermate
   producono le decisioni migliori: verificato due volte a CS-4.26, ed entrambe
   hanno cambiato lesito.
3. **Ogni deviazione dalla specifica va numerata `s.6.NN` e documentata nel
   Changelog con la motivazione.** Nessuna deviazione silenziosa.
4. **Al termine di ogni step, riepilogo strutturato:** cosa e stato fatto, cosa
   NON e stato fatto (deferito o fuori scope), quali deviazioni sono state
   introdotte. Poi si attende approvazione.
5. **Sessione dimensionata.** Se uno step richiede troppo per restare di
   qualita, proporre di chiudere e riprendere a contesto fresco.

---

## 3. FONTI DI VERITA, in ordine di precedenza

1. `STATO_CORRENTE.md` -- puntatore live: ultima sessione chiusa, baseline,
   roadmap, one-liner di apertura pre-frozen.
2. `PharmaTimer_Changelog_Fase3.md` -- storia immutabile, **append-only**.
3. `PharmaTimer_Project_Spec_v1_17.md` -- dominio e algoritmi.
4. `LESSONS.md` -- lezioni MANDATORY (tracciato in git).

`scripts/session_state.env` e lo **ARBITRO** quando la prosa dello STATO e lo env
divergono (LC-91). Contiene perimetro, criterio di FATTO e attesa sul CP0.

`scripts/impegni.tsv` e il **testo normativo** degli impegni sotto guardia. Lo
indice nello STATO non lo sostituisce.

---

## 4. CONVENZIONE DI APERTURA -- primi atti di OGNI sessione

1. **DUMP DAL DISCO COME VERITA.** Leggere STATO e Changelog dal file, mai da
   memoria o da riassunto.
2. **ALLINEAMENTO env verso STATO.** `SENT_STATO` in `scripts/session_state.env`
   deve combaciare con la riga 1 dello STATO. Divergenza => STOP.
3. **LETTURA MACCHINA dallo env:** `PASSO`, `SOTTOPASSO`, `PROSSIMA_AZIONE`,
   `MODELLO`, `IMPEGNO`, `AVANZ_*`. Letti, non ri-dedotti dalla prosa.
4. **CP0:** `bash scripts/cp0.sh`. **Il numero delle sonde non si scrive qui.**
   E calcolato da `ck()`, che incrementa `N` a ogni sonda, e stampato dal solo
   ramo GREEN nella forma `CP0 VERDETTO: GREEN (<N> sonde)` -- un ramo RED non
   lo stampa affatto. Il totale dichiarato, con la partizione fra chiavi e
   non-chiave, sta in `scripts/cp0.expected` riga 1, che la GAMMA riscrive.
   **Non ricopiare i valori a mano: la fonte e il file.**

Ordine: allineamento PRIMA (costo nullo), CP0 DOPO (costoso).
**Il CP0 deve essere GREEN prima di qualunque lavoro di scopo.**

Due classi di RED: `DRIFT` = il mondo diverge dallo stato dichiarato;
`SCAD` = un impegno e scaduto. Un `WARN` lascia il CP0 GREEN.

---

## 5. DISCIPLINA DI MISURA

Sono le regole che questo progetto ha pagato per imparare. Si applicano sempre.

- **Una sede si trova per CONTENUTO, mai per numero di riga.** I numeri nel TSV e
  nel Changelog invecchiano a ogni commit.
- **Una riga restituita da `grep` non e una misura del suo significato.** Un token
  dentro un commento non e luso di quel token. Contare occorrenze non e misurare
  un ruolo.
- **Una asserzione negativa (*non esiste*) o di esaustivita (*sono tre*) ha per
  perimetro quello della sonda, non quello del repo.**
- **Una sonda dichiara PRIMA i due esiti che distingue.** Se un esito e
  compatibile con entrambe le ipotesi, non e una misura.
- **Un atteso derivato dalla stessa sorgente che il gate deve verificare non e un
  gate, e una tautologia.** Se un gate e tautologico, lo si DICHIARA tale e lo si
  priva del potere di abortire; non lo si spaccia per misura.
- **Un rilievo dedotto senza sonda non e un difetto finche una sonda non lo
  esercita.** Vale nei due sensi.
- **Prima di usare la parola *nuovo*:** sonda di duplicazione su Changelog E
  backlog, con almeno DUE chiavi indipendenti. Un rilievo gia censito si presenta
  come RICONFERMA, isolando il solo elemento nuovo.
- **Prima di comporre le opzioni di una ratifica su materia gia normata:** si
  dumpa LA FONTE che la norma -- sezione di Spec, sorgente, testo della
  deviazione, ratifica precedente, riga di TSV -- e mai un suo indice.
- **Un invariante corretto su un percorso va verificato su TUTTI i percorsi che
  quella causa tocca.** Correggerne uno solo e il difetto ricorrente numero uno.

---

## 6. COLLAUDO -- un pin verde non e un pin efficace

**Prima di considerare fatto un pin o un gate, si MUTA il codice che dovrebbe
proteggere e si PRETENDE il rosso.** Un gate mai visto rosso non e una guardia:
e una decorazione.

- Ogni gate deve essere visto rosso almeno una volta e **nominato** nel proprio
  messaggio. I gate irraggiungibili per costruzione si **dichiarano**, non si
  tacciono.
- **Una mutazione che muove piu di una variabile intercetta ma non isola.**
- **Ogni cancello si pinna nei DUE versi.** Un pin del solo verso restrittivo e
  soddisfatto anche da un meccanismo sempre chiuso, che e M2 a sua volta.
- Lo strumento di collaudo va verificato prima di fidarsene: una harness rotta
  maschera i gate e li fa sembrare efficaci.

**In Claude Code il collaudo si esegue sui file VERI con la suite VERA:** si muta
la sede, si lancia la suite, si pretende il rosso, si ripristina. Niente sagome
ricostruite. Questo e il guadagno principale rispetto alla chat.

---

## 7. VIETATI ATTIVI

Non modificare, per nessun motivo, senza una ratifica esplicita che sciolga il
vincolo:

- `src/data/repository/apiClient.js` -- LETTURA libera.
- `src/data/repository/ApiRepository.js` -- LETTURA libera.
- `vite.config.js` -- LOCKED.
- `backend/tests/test_invariante_coppia.py`: i marcatori `xfail` NON si tolgono
  se non **insieme** al fix della sede corrispondente. `SC-8` non diventa mai
  `xfail`. Il nome `test_n3_stato_destinazione_non_controllato` e STORICO e non
  si rinomina.
- `src/data/repository/WP6.probe.test.js` :234 va lasciato stare.
- **Vincolo append-only:** `OUTBOX_OPS`, `PARK_REASONS` e la lista `CLAUSOLE`
  non perdono e non riciclano mai un valore.
- Il Changelog e **append-only**. Una riga sbagliata resta; la rettifica vive nel
  Registro dello STATO.
- **Riscrivere una citazione storica e M3 applicato al record.** Vale per hash di
  commit, numeri di sessione e valori dichiarati in voci passate.

---

## 8. COMMIT

**Comando unico:** `bash scripts/close_step.sh "<messaggio>" <path1> [<path2> ...]`
Messaggio PRIMO, path DOPO. Ha un pre-gate di atomicita che rifiuta ogni voce di
albero estranea ai path passati.

- **Mai `git add -A`.** Mai `git commit` diretto. Solo `close_step.sh`.
- I file KB (`STATO_CORRENTE.md`, `PharmaTimer_Changelog_Fase3.md`,
  `PharmaTimer_Project_Spec_*.md`, `scripts/cp0.expected`,
  `scripts/session_state.env`) sono **IGNORED** e non si committano mai.
- `LESSONS.md`, `scripts/cp0.sh`, `scripts/close_step.sh`, `scripts/impegni.tsv`,
  `backend/tests/` sono **TRACCIATI**.
- `close_step.sh` e **fail-loud senza rollback**: su push fallito il commit resta
  in sede e il push si risolve a parte.
- **La rassegna degli impegni si fa PRIMA del commit**, perche `impegni.tsv` e
  tracciato: altrimenti resta fuori dal commit o sporca lalbero.

**Fra il commit e la GAMMA il CP0 e RED per costruzione**, perche `cp0.expected`
porta ancora i valori vecchi. **Non e un drift, e non si esegue `cp0.sh` in
quella finestra.** Il CP0 di chiusura si esegue SOLO dopo la GAMMA.

---

## 9. CHIUSURA -- la GAMMA

Scrive QUATTRO file, tutti IGNORED, quindi **dopo** il commit e senza alzare `TREE`:
`STATO_CORRENTE.md`, `PharmaTimer_Changelog_Fase3.md`,
`scripts/session_state.env`, `scripts/cp0.expected`.

Lo STATO si aggiorna in forma **chirurgica** (deviazione `s.6.270`), mai con un
full-overwrite: il full-overwrite garantisce che il testo sia NUOVO, non che sia
AGGIORNATO, ed espone 290 righe alla deriva di trascrizione.

**PRIMO ATTO DELLA GAMMA, prima di scrivere un solo byte:** copiare i
quattro file in `/tmp/pt_gamma_backup_<timestamp>/`. Sono IGNORED, quindi
**git non puo ripristinarli**: senza backup un errore si ripara solo da
Time Machine. Su qualunque gate rosso si RIPRISTINA dal backup e si
dichiara il fallimento, mai si prosegue.

**Gate obbligatori, da eseguire e di cui stampare lesito:**

1. `HEAD` e `DESCRIBE` **letti da git vivo**, mai da costanti. Una costante
   stantia deve arrossare, non passare.
2. Sentinel nello STATO su **esattamente 2 righe**, forma
   `SENTINEL_STATO_PAR_<sessione>`; il sentinel vecchio non sopravvive.
3. **Sezioni e clausole `LC-*` ESTRATTE dal vecchio e asserite nel nuovo.** Non
   trascritte: cosi la garanzia si calcola dalla fonte.
4. **Elenco dei LETTERALI STANTII che devono essere spariti**, ciascuno ancorato
   alla RIGA CHE APRE e mai al token nudo.
5. **Elenco delle CITAZIONI STORICHE che devono essere RIMASTE.** Un rastrello
   cieco le corromperebbe.
6. Changelog **append-only**: il vecchio deve essere prefisso del nuovo. Terna di
   giunzione: commento `<!-- ... R1 emit ... -->`, heading `###` con prefisso
   `par.` obbligatorio, bullet finale `- SENTINEL_..._GAMMA`.
7. `session_state.env` allineato al sentinel nuovo; `CONSUNTIVO` e
   `BLOCCO_FATTI` incrementati.
8. `cp0.expected` resta a **14 chiavi**; il `DESCRIBE` deve comparire anche nella
   prosa dello STATO, perche la sonda `DESCRIBE_STATO` lo verifica.
9. **Rassegna degli impegni riga per riga sul TSV, con risposta obbligatoria
   anche negativa.** Una rettifica non e un rinvio: `RINVII` sale solo se il
   ritardo lo ha causato limpegno.
10. **Il RECAP di chat si COPIA VERBATIM dalla riga `## AVANZAMENTO`**, mai
    ricomposto a mano.

**Solo dopo la GAMMA:** `bash scripts/cp0.sh`. Atteso GREEN.

---

## 10. CONSEGNA A CLAUDE.AI

Al termine, dopo il CP0 di chiusura GREEN, stampare un blocco di consegna con:

- verdetto del CP0 e conteggio delle sonde;
- riga `## AVANZAMENTO` copiata verbatim;
- deviazioni emesse e prossima `s.6.NN` libera;
- voci di Registro aggiunte;
- **i due file da ricaricare nella KB di Claude.ai**:
  `STATO_CORRENTE.md` e `PharmaTimer_Changelog_Fase3.md`
  (la Spec solo se ne e cambiata la versione);
- il nome della sessione successiva e il modello consigliato.

**Il ricarico in KB e manuale e non e automatizzabile:** i file di progetto di
Claude.ai non si sincronizzano dal disco. La sessione successiva si apre in
Claude.ai con `Esegui il prompt nel STATO_CORRENTE.md`.

---

## 11. AMBIENTE

- Repo: `~/Sviluppo/pharmatimer`, branch `fase-3-backend`. macOS, zsh.
- **PERIMETRO DEL DISCO.** Ogni file utile a PharmaTimer sta nel ramo
  `~/Sviluppo/pharmatimer`. **NON accedere a
  `~/Sviluppo/pharmatimer-archive`**: e la versione precedente, NON e un repo
  git e NON ha alcun backup, quindi un errore la distrugge in via definitiva.
  Ne agli altri progetti sotto `~/Sviluppo` -- StockFusion,
  marketdata-service, Haarness. Non creare cartelle fuori dal repo senza
  avere verificato che il nome sia libero e senza avere chiesto a Roberto.
- Backend venv in `backend/venv/`, NON in `.venv/`. **Non si attiva: si invoca
  per percorso esplicito** -- `venv/bin/python` da `backend/` -- perche una
  attivazione non sopravvive fra due comandi (stessa proprieta della umask,
  sezione 13).
- MySQL Studio: `/usr/local/mysql/bin/mysql --defaults-file="$HOME/.my.cnf"` (con lo UGUALE).
- MySQL Mini: `/opt/homebrew/bin/mysql --defaults-file=/Users/marketreader/.my-pharmatimer.cnf`, via `ssh mini`.
- Output MySQL **sempre** via redirect su file piu `cat`, mai in pipe a `grep`.
- Su macOS: `md5 -q` sta in `/sbin`; `sed -i ''` e forma BSD.
- DB distinti: `pharmatimer_dev` e `pharmatimer_test`. Il `conftest` punta a
  `DB_NAME_TEST` e fa TRUNCATE autouse: **non tocca dev**.
- pytest: `backend/tests/__init__.py` ESISTE, quindi `tests` e un package e gli
  import fra file di test vanno in forma relativa.
- `grep -r` esclude sempre `node_modules`, `venv`, `__pycache__` e `*.bak*`.
- Backup e file transitori in `/tmp`, **mai** in `scripts/`: un untracked non
  ignorato in directory tracciata produce DRIFT.
  Sotto Claude Code il sandbox nega `mkdir` in `/tmp` nudo (misurato,
  `Operation not permitted`): i file di lavoro e i backup vanno in `$TMPDIR`.
  Non e un ripiego -- e per utente e isolato, coerente con la lezione #66
  sulle permission. La prescrizione `/tmp` nasce dal regime in cui i comandi
  erano lanciati a mano dal Terminale.

---

## 12. RATIFICA -- come si chiede una decisione

Una domanda alla volta. Opzione consigliata **per prima**, con il movente
esplicito. Roberto risponde con una lettera.

Ogni ratifica porta la **scheda a quattro campi**:
**(a)** FONTE misurata, con path e righe;
**(b)** PERIMETRO;
**(c)** SEDI toccate, enumerate;
**(d)** cosa lo atto NON tocca.

Se Roberto delega (*decidi tu*), si procede sui default consigliati e lo si
registra a verbale.

Separare sempre le azioni **tue** (Roberto) da quelle **mie** (Claude).

---

## 13. COMANDI

**Precondizione a ogni suite: `umask 022` nella STESSA invocazione che lancia
la suite** (lezione #66). Claude Code apre una shell nuova per ogni comando,
quindi una umask impostata in un comando precedente NON sopravvive: si scrive
`umask 022 && npx vitest run`, mai due comandi separati. Con umask diversa
vitest riporta N unhandled errors con 0 test eseguiti e pytest da
`PermissionError` dentro `$TMPDIR`: il guasto e di ambiente, non di codice.

**Il CP0 e gate di APERTURA e di CHIUSURA di ogni sessione** (sezioni 4 e 9).
La sonda G-20 confronta gli mtime contro `STATO_CORRENTE.md` preso come path
RELATIVO (`cp0.sh` :193), quindi misura correttamente solo con `cwd` alla
radice del repo. Invocato come `bash scripts/cp0.sh` il vincolo e **gia
soddisfatto**, perche `cp0.sh` :10 fa `cd "$(dirname "$0")/.."` e si riporta
da solo alla radice. **Il vincolo morde altrove:** e di INVOCAZIONE e non una
proprieta della logica (STATO :239), quindi ogni banco che RIPRODUCE la logica
di G-20 fuori da `cp0.sh` -- una mutazione di collaudo, un `find` rilanciato a
mano -- deve riprodurre anche il `cwd`. Se non lo fa, `find` fallisce con
stderr soppresso, l'insieme derivato risulta VUOTO, e con `CONSEGNA` vuota il
gate passa in VERDE proprio sul caso che esiste per intercettare.

Frontend, dalla root:

- `npm run dev` -- Vite su :5173, proxy `/api` verso `http://localhost:8000`.
- `npm run build` -- statico in `dist/`, base `/pharmatimer/` (GitHub Pages).
- `npm run build:mini` -- `dist-mini/`, base `/`, piu
  `scripts/fix-mini-pwa-base.mjs`.
- `npm test` -- vitest in WATCH. Per un run singolo: `npx vitest run`, che e
  la forma usata da `cp0.sh`.
- Un file solo: `npx vitest run src/domain/recalc.test.js`.
- Un test solo: `npx vitest run src/domain/recalc.test.js -t "<nome>"`.

Backend, da `backend/`:

- `venv/bin/python -m pytest -q` -- forma usata da `cp0.sh`.
- Un file: `venv/bin/python -m pytest tests/test_farmaci_crud.py -q`.
- Un test: aggiungere `-k "<espressione>"`.
- Server dev:
  `venv/bin/uvicorn pharmatimer_api.app:app --host 127.0.0.1 --port 8000`.
- Config da `backend/.env.dev` via pydantic-settings. `DB_NAME` e obbligatorio
  e senza default; le credenziali sono o `DB_DEFAULTS_FILE`, o `DB_USER` piu
  `DB_PASSWORD`, e un validator cross-field pretende una delle due vie.

Config di test:

- `vitest.config.js` e la fonte: jsdom di default, `setupFiles`
  `src/test/setup.js`, `globals: false`, include `src/**/*.{test,spec}.*`.
  Un test DOM-free porta `// @vitest-environment node` in PRIMA riga.
- `vite.config.js` porta un blocco `test:` residuo con `globals: true` che
  NON e in vigore: `vitest.config.js` lo sovrascrive. Il file e LOCKED
  (sezione 7), quindi il residuo resta; non se ne deduca il contratto.

La root del repo contiene decine di `patch_*.py`, `apply_*.py` e `*.bak*`:
sono one-shot storici, tutti IGNORED. Non sono la toolchain e non si imitano.

---

## 14. ARCHITETTURA

Frontend React 18 piu Vite, PWA via vite-plugin-pwa
(`registerType: "prompt"`).

Il perno e la **catena repository**, in `src/data/repository/`:

- `IRepository.js` -- contratto in soli JSDoc; le typedef rispecchiano la
  sezione 3 della Spec, con nomi di campo in italiano.
- `LocalRepository.js` -- Dexie/IndexedDB. Schema in `src/data/db.js`,
  `DB_VERSION 5`.
- `ApiRepository.js` -- FastAPI via `apiClient.js`. Per composizione tiene un
  LocalRepository come delegate per profili e impostazioni.
- `SyncRepository.js` -- guardia della via di LETTURA sul percorso API
  (CS-3, Spec 14.4). Le tre letture server-backed rinfrescano lo specchio
  locale; su `DB_UNAVAILABLE` cadono sullo specchio SENZA alzare la
  freschezza, perche la staleness e parte del dato; ogni altro codice
  PROPAGA. Tiene il latch `_unreachable` e la via di SCRITTURA offline
  (`upsertLogsBatch`: taccuino-prima anche online, tocco indivisibile,
  consegna FIFO). Composizione e NON ereditarieta: `getAllOrari` e
  `getLogByRange` di ApiRepository fanno fan-out su `this.getFarmaci()`, e
  un override ereditato raddoppierebbe la scrittura sullo specchio.
- `index.js` -- factory a istanza unica, valutata UNA VOLTA SOLA, nessun
  hot-swap. `shouldUseApiRepo()` e la fonte unica: `VITE_USE_API === "1"` a
  build, oppure `localStorage['pharmatimer.useApiRepo'] === "1"` con reload.
  Flag spento: LocalRepository nudo. Flag acceso:
  `SyncRepository(ApiRepository(local), local)`, con UNA sola
  LocalRepository condivisa fra delegate e specchio.

Dominio puro, `src/domain/`: `planBuilder` (piano multi-giorno), `recalc`
(transizioni presa / saltata / sospesa / recupero / ripristino),
`orarioResolver` (offset dagli ancoraggi del profilo), `outboxSplitter`
(`OUTBOX_OPS` e `PARK_REASONS`, append-only per sezione 7). Zero I/O.

Stato, `src/state/`: reducer puro piu thunk. `actions.js` orchestra lo I/O
sul repo e le transizioni via dispatch, mentre il dominio resta puro.
`AppContext.jsx` possiede il reducer e un solo `setInterval(TICK_INTERVAL_MS)`
che serve tick, rollover di giornata e reschedule delle notifiche; lo stesso
handler gira su `visibilitychange` per riallineare al rientro da background.

Backend, `backend/pharmatimer_api/`: FastAPI, MySQL nativo con
mysql-connector-python in pool, NESSUN ORM. Router per farmaci, orari,
log_assunzioni, utenti, permessi, health; `RepositoryError` mappato a
exception handler. Multi-tenant con permessi caregiver; pilota id=2.
`backend/tests/conftest.py` punta a `DB_NAME_TEST` e fa TRUNCATE autouse in
ordine FK-safe: non tocca mai `pharmatimer_dev`.
