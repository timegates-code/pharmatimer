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
3. **Ogni deviazione dalla Spec va motivata nel messaggio di commit che la
   introduce.** Nessuna deviazione silenziosa. La numerazione `s.6.NN` e
   STORICA: le deviazioni gia emesse conservano il numero, le nuove non lo
   prendono piu -- il registro che le contava e stato smontato.
4. **Al termine di ogni step, riepilogo strutturato:** cosa e stato fatto, cosa
   NON e stato fatto (deferito o fuori scope), quali deviazioni sono state
   introdotte. Poi si attende approvazione.
5. **Sessione dimensionata.** Se uno step richiede troppo per restare di
   qualita, proporre di chiudere e riprendere a contesto fresco.

---

## 3. FONTI DI VERITA, in ordine di precedenza

1. **Il codice e i test.** Cio che gira e la verita; tutto il resto lo descrive.
2. `STATO_CORRENTE.md` -- **tracciato e corto**: cosa ha fatto lultima sessione,
   la coda di rimedio, le decisioni che spettano a Roberto. Non porta contatori,
   non porta sentinel, non porta scadenze numeriche.
3. `PharmaTimer_Project_Spec_v1_18.md` -- dominio e algoritmi. **E la Spec
   corrente ed e tracciata.** Le versioni precedenti restano fuori dal repo.
4. `LESSONS.md` -- lezioni MANDATORY, tracciato. Non e contato da alcun gate.
5. **`git log` -- la storia.** `PharmaTimer_Changelog_Fase3.md` e archiviato in
   git e **CONGELATO**: si legge, non si scrive piu. Da qui la storia e il log.

Non esistono piu ne un arbitro macchina ne un registro di impegni con scadenze:
`session_state.env`, `impegni.tsv` e `cp0.expected` sono stati cancellati alla
sessione di smontaggio del gate, e il loro contenuto finale vive in git.

---

## 4. APERTURA

**`make check`, e nientaltro.** Il gate e uno solo e vale in apertura e in
chiusura. Non ci sono allineamenti da verificare, sentinel da contare o env da
leggere: erano l'apparato, e l'apparato non c'e piu.

`make check` esegue, in questo ordine: **lint** (ruff piu eslint, in modo
baseline), **test frontend** (vitest), **test backend** (pytest, con il MySQL di
dev come precondizione dichiarata), **inventario** (le diciannove voci), e
**albero** (`TREE` e `AHEAD` letti da git vivo).

**Se e verde si lavora. Se e rosso si legge quale blocco lo ha fatto arrossare
e si decide, prima di qualunque lavoro di scopo.**

Poi si legge `STATO_CORRENTE.md`, che e corto e dice cosa e successo per ultimo.

**Sotto Claude Code il gate E interamente eseguibile**, da quando
`.claude/settings.local.json` porta `sandbox.network` con `allowLocalBinding` e
`allowUnixSockets`. Prima non lo era: il sandbox negava il loopback con EPERM su
socket e su TCP, e `test-backend` arrossava per ambiente e non per mondo.
Il **Mini resta fuori**, ed e voluto: `allowLocalBinding` apre il solo loopback,
quindi `make prod-check` e `make g21`, che toccano la tailnet, restano da
eseguire dal Terminale.

Resta vero che `make check` non puo essere verde PRIMA di un commit: il blocco
`albero` misura `TREE` da git vivo e lo albero e sporco per costruzione finche
il commit non esiste. Prima del commit si pretendono verdi lint, frontend,
backend e inventario, e rosso il solo `albero` su `TREE`; dopo commit e push, il
gate e verde per intero.

---

## 5. DISCIPLINA DI MISURA

Sono le regole che questo progetto ha pagato per imparare. Si applicano sempre.

- **Una sede si trova per CONTENUTO, mai per numero di riga.** I numeri di riga
  citati nel Changelog archiviato e nello STATO invecchiano a ogni commit.
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
- **Prima di usare la parola *nuovo*:** sonda di duplicazione sul Changelog
  archiviato, sullo STATO e su `git log`, con almeno DUE chiavi indipendenti. Un
  rilievo gia censito si presenta come RICONFERMA, isolando il solo elemento nuovo.
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
- `PharmaTimer_Changelog_Fase3.md` e **CONGELATO**: archiviato in git e mai piu
  scritto, nemmeno in append. Una riga sbagliata resta: e un archivio, e
  riscriverlo e M3 applicato al record. Le rettifiche vivono nel commit che le
  misura.
- **Riscrivere una citazione storica e M3 applicato al record.** Vale per hash di
  commit, numeri di sessione e valori dichiarati in voci passate.

---

## 8. CHIUSURA

**Tre atti, in questo ordine, e nientaltro.**

1. **`make check` verde.** Se non lo e, la sessione non chiude: si dice cosa e
   rosso e perche.
2. **`git commit` e `git push`.** Comandi git normali. Non esiste piu un
   involucro con pre-gate: latomicita la garantisce chi compone il commit, e
   `make check` misura `TREE` e `AHEAD` da git vivo prima e dopo.
3. **`STATO_CORRENTE.md` riscritto**, corto: cosa ha fatto questa sessione, cosa
   resta in coda, cosa spetta a Roberto decidere. E tracciato, quindi entra nel
   commit come qualunque altro file.

**Non esiste piu la GAMMA.** Niente backup rituali di file ignorati, niente dieci
gate, niente sentinel su due righe, niente rassegna di impegni, niente
`cp0.expected` da riscrivere, niente ordinali di sessione e niente nomi di
sessione. **Niente ricarico in KB:** i file si leggono dal disco e sono correnti
per costruzione.

**Prima di un deploy, e solo allora: `make prod-check`.** Tocca il Mini via rete,
asserisce che il servizio risponde e che **`make g21`** e verde -- cioe che il
livello di migrazione applicato in produzione non e sotto quello che il codice
richiede. Il resto lo stampa come `INFO` e dice che e INFO.

**Ordine vincolante di schieramento: migrazione PRIMA, codice DOPO.**

---

## 9. AMBIENTE

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
  sezione 11).
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

## 10. RATIFICA -- come si chiede una decisione

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

## 11. COMANDI

**Precondizione a ogni suite: `umask 022` nella STESSA invocazione che lancia
la suite** (lezione #66). Claude Code apre una shell nuova per ogni comando,
quindi una umask impostata in un comando precedente NON sopravvive: si scrive
`umask 022 && npx vitest run`, mai due comandi separati. Con umask diversa
vitest riporta N unhandled errors con 0 test eseguiti e pytest da
`PermissionError` dentro `$TMPDIR`: il guasto e di ambiente, non di codice.

**Il gate e `make check`**, e vale in apertura e in chiusura (sezioni 4 e 8).
Esegue lint, test frontend, test backend, inventario e albero, e stampa un
verdetto unico. **Prima di un deploy, e solo allora, `make prod-check`**, che
tocca il Mini e include `make g21`.

Sotto Claude Code il gate gira per intero: la precondizione MySQL di
`test-backend` passa perche il sandbox ammette il loopback. Cio che resta fuori
e la tailnet, quindi `make prod-check` e `make g21`. La configurazione che lo
permette sta in `.claude/settings.local.json`, non e tracciata, e va rimessa a
mano su una macchina nuova.

Frontend, dalla root:

- `npm run dev` -- Vite su :5173, proxy `/api` verso `http://localhost:8000`.
- `npm run build` -- statico in `dist/`, base `/pharmatimer/` (GitHub Pages).
- `npm run build:mini` -- `dist-mini/`, base `/`, piu
  `scripts/fix-mini-pwa-base.mjs`.
- `npm test` -- vitest in WATCH. Per un run singolo: `npx vitest run`, che e
  la forma usata da `make test-frontend`.
- Un file solo: `npx vitest run src/domain/recalc.test.js`.
- Un test solo: `npx vitest run src/domain/recalc.test.js -t "<nome>"`.

Backend, da `backend/`:

- `venv/bin/python -m pytest -q` -- forma usata da `make test-backend`.
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

## 12. ARCHITETTURA

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

---

## 13. CONVENZIONE DI CARTELLE

Derivata dalla struttura viva e verificata con sonda, non imposta a priori.
Dice dove mettere il PROSSIMO file; cio che non la rispetta si dichiara qui.

- Cartelle di radice tracciate: `src/`, `backend/`, `scripts/`, `deploy/`,
  `docs/`, `public/`, e `.github/` per il solo workflow del gate. Non se ne
  aprono altre senza ratifica.
- `src/domain/` e `src/utils/` sono PURI. Verificato: zero React, zero Dexie,
  zero rete.
- `src/data/` e la SOLA sede che tocca IndexedDB o la rete, e la catena
  repository vive in `src/data/repository/`. Verificato: fuori di li il nome
  `apiClient` compare soltanto dentro commenti.
- `src/state/` possiede reducer e thunk; `src/hooks/` e `src/services/` stanno
  fra stato e piattaforma. Verificato: nessuno dei tre importa da `components/`.
- `src/components/<vista>/`, una cartella per vista -- `auth`, `config`,
  `cronologia`, `oggi`, `onboarding` -- piu `shared/` per cio che due viste
  usano davvero. Un componente usato da una sola vista sta nella sua vista.
- Il test sta ACCANTO al file che prova, stesso nome piu `.test.js` o
  `.test.jsx`. `src/test/` porta solo setup, finti condivisi e i pin di suite.
- `backend/pharmatimer_api/` ha un solo strato: **il SQL sta nel router**.
  Verificato con 67 `cur.execute` nei cinque router. Le due impalcature vuote
  `repository/` e `services/`, che portavano il solo `__init__.py` e che
  nessuno importava, sono state rimosse alla sessione di rimedio: non si
  ricreano se non insieme al codice che le abita.
- `backend/db/migrations/` e append-only: un file per migrazione, mai riscritto.
- Una cartella che resta senza file si rimuove nello stesso commit che la svuota.
