<!-- SENTINEL_LESSONS_REGISTRY_INIT_PAR_22_167 -->
# PharmaTimer -- Registro Lesson (canonico)

> File **TRACCIATO in git** (a differenza di STATO/Changelog, gitignored). Fonte canonica delle Lesson di progetto.
> Append-only. Numerazione monotona unica `#NN`; ogni voce ha uno slug mnemonico `L-*` come alias.
> Stato voce: `minted` (ratificata) | `candidate` (in attesa di mint esplicito).
> Inizializzato: par.22.167 (consolidamento post-F14).

## Criterio di mint
- Una candidate diventa `minted` solo per ratifica esplicita dellutente, ricevendo il numero `#NN` successivo.
- Ogni voce: regola azionabile in una frase + contesto di applicazione + origine (par.X.Y, s.6.NN se da deviazione).

## Back-port #16..#38 -- COMPLETATO (par.169)
- Le Lesson storiche #16..#38 sono trascritte in `## Minted` (back-port da Changelog F2/F3, ultima versione cementata, riga-fonte annotata).
- Criteri: versione canonica = ultima cementata; #15 esclusa (declassata); editable PEP660 resta candidate `L-editable-pep660-rsync-source` distinta da #31.

---

## Minted

### #39 -- L-frontend-mini-deploy-rsync-only
- Stato: minted
- Origine: par.22.166 (Step 4 deploy F14)
- Regola: il redeploy frontend su Mini e SOLO rsync della build (`npm run build:mini` -> `rsync -avi --delete dist-mini/ -> mini:PharmaTimer/web/`); NESSUN restart del backend.
- Contesto: smoke post-deploy = nuovo bundle 200 / vecchio 404 / openapi invariato. Il backend non si tocca perche il frontend e statico same-origin.

<!-- SENTINEL_BACKPORT_16_38_PAR_169 -->

### #16 -- L-mysql-redirect-cat
- Stato: minted
- Origine: F2 par.22.79-ter
- Regola: Output MySQL sempre via redirect su file (`>/tmp/out 2>/tmp/err; cat`), mai `| grep` ne `2>/dev/null` non documentato.
- Contesto: Ogni script bash che osserva output MySQL (baseline/diagnostico/delivery); self-audit pre-emit. Fonte: Changelog F2 riga ~17173.

### #17 -- L-python-heredoc-no-c
- Stato: minted
- Origine: F2 par.22.79-ter
- Regola: Python multi-riga via heredoc `PYEOF` o file dedicato, mai `python -c` con f-string e virgolette nidificate.
- Contesto: Evita la classe di errori quoting+nesting (SyntaxError, comandi residui mescolati). Fonte: Changelog F2 riga ~17174.

### #18 -- L-uuid-identity-baseline
- Stato: minted
- Origine: F2 par.22.79-ter
- Regola: CP0 baseline multi-target DEVE confrontare `@@server_uuid` per confermare che il target reale coincide col dichiarato.
- Contesto: Applicabile a stack MySQL/MariaDB/Postgres multi-host (host+container, host+remote). Fonte: Changelog F2 riga ~17175.

### #19 -- L-testclient-no-context
- Stato: minted
- Origine: F2 par.22.80
- Regola: FastAPI TestClient SENZA context manager (`yield TestClient(app)`): il lifespan re-inizializza il pool produzione sovrascrivendo quello test patchato.
- Contesto: Fixture pytest con pool/risorse globali patchati session-scope. Fonte: Changelog F2 riga ~17895.

### #20 -- L-patcher-idempotency-marker
- Stato: minted
- Origine: F3 par.22.84
- Regola: Patcher content-anchored: se `old` e sottostringa di `new` serve un `idempotency_marker` esplicito + self-check.
- Contesto: Re-exec del patcher = early-exit pulito. Fonte: Changelog F3 riga ~386.

### #21 -- L-db-baseline-python-venv
- Stato: minted
- Origine: F3 par.22.82
- Regola: Baseline DB del CP0 sempre via venv Python (`pharmatimer_api.config.settings`), mai `mysql -e -p` da CLI.
- Contesto: Garantisce stesso target/credenziali del runtime. Fonte: Changelog F3 riga ~235.

### #22 -- L-pydantic-timedelta-coerce
- Stato: minted
- Origine: F3 par.22.83
- Regola: Response Pydantic con campi `time` letti da MySQL: `field_validator(mode='before')` con `_coerce_timedelta_to_time`.
- Contesto: MySQL restituisce TIME come timedelta. Fonte: Changelog F3 riga ~1117 / models/orario.py riga ~2307.

### #23 -- L-schema-first-introspect
- Stato: minted
- Origine: F3 par.22.81
- Regola: `SHOW CREATE TABLE`/`information_schema` obbligatorio prima di SELECT con colonne specifiche su tabelle non toccate nella sessione (anche se il nome colonna sembra banale).
- Contesto: Ogni script CP0-ext che legge utenti/farmaci/orari/log fuori scope. Fonte: Changelog F3 riga ~281.

### #24 -- L-settings-uppercase-introspect
- Stato: minted
- Origine: F3 par.22.85
- Regola: Leggere empiricamente la classe `Settings` (attributi UPPERCASE, `case_sensitive=True`) prima di usare `settings.<ATTR>`; estende #23 dal DB al config.
- Contesto: Ogni script che importa `from pharmatimer_api.config import settings`. Fonte: Changelog F3 riga ~490.

### #25 -- L-pool-autocommit-implicit
- Stato: minted
- Origine: F3 par.22.86
- Regola: Pool `autocommit=False`: la transazione e implicita alla prima query -> niente `conn.start_transaction()` esplicito, solo `conn.commit()` finale.
- Contesto: mysql-connector-python pool; `start_transaction()` da `ProgrammingError('Transaction already in progress')`. Fonte: Changelog F3 riga ~960.

### #26 -- L-pre-emit-static-analysis
- Stato: minted
- Origine: F3 par.22.87
- Regola: Static analysis dei file MOD (import structure / fixture pattern / scope semantics) PRIMA di emettere il patcher.
- Contesto: Riduce drift di import e scope su file modificati. Fonte: Changelog F3 riga ~1115.

### #27 -- L-doc-not-empirical
- Stato: minted
- Origine: F3 par.22.89
- Regola: Dichiarare una lesson 'applicata' senza `cat/grep/find/ls` reali e propaganda autoreferenziale: dump fisico dei source obbligatorio, mai assumere esistenza/path/contenuto da design draft.
- Contesto: CP0 di ogni sessione che cita #26 deve dumpare fisicamente i source. Fonte: Changelog F3 riga ~1603.

### #28 -- L-composition-over-inheritance
- Stato: minted
- Origine: F3 par.22.91
- Regola: `ApiRepository` (e ogni wrapper Repository) NON estende `LocalRepository`: possiede `this._local = local ?? new LocalRepository()` con injection opzionale via constructor.
- Contesto: Dexie mutation isolation + test granularity (`vi.spyOn(repo._local, X)`) + contract 31 metodi esplicito. Fonte: Changelog F3 riga ~2596.

### #29 -- L-file-based-delivery
- Stato: minted
- Origine: F3 par.22.94
- Regola: Artefatti documentali/script consegnati come FILE (mai inline shell-incollante): evita leak di ENV e hang del terminale.
- Contesto: Catalizzata da leak ANTHROPIC_API_KEY via heredoc Dockerfile. Fonte: Changelog F3 riga ~3233.

### #30 -- L-deferred-decisions-immutable
- Stato: minted
- Origine: F3 par.22.95
- Regola: Le decisioni architetturali ratificate sono immutabili: Claude non le sovrascrive con default; ri-verifica in apertura CP0 (es. vincolo deploy nativo gamma).
- Contesto: Proporre alternative gia scartate senza ri-ratifica = regola critica #2 violata. Fonte: Changelog F3 riga ~3569.

### #31 -- L-hidden-assumptions-install-state
- Stato: minted
- Origine: F3 par.22.99
- Regola: Pre-emit del patcher elencare le assunzioni nascoste di ogni MOD/file NEW e validarle empiricamente; CP0-ext Parte D = dump stato venv runtime (`pip list`/`pip show <pkg>|grep Location`) se il codice dipende dallo stato di installazione.
- Contesto: Per `importlib.metadata`, `pkg_resources`, entry_points, editable install. Applicazione: editable PEP660 (`pip install -e --no-deps`, metadati congelati) = candidate L-editable-pep660-rsync-source distinta. Estende #27. Fonte: Changelog F3 riga ~5056.

### #32 -- L-self-skepticism-checkpoint
- Stato: minted
- Origine: F3 par.22.99
- Regola: Al closing di ogni CP esecutivo elencare esplicitamente le assunzioni NON validate empiricamente; pre-emit del CP successivo validarle (INV check) o ratificarle come accettabili.
- Contesto: Cattura i drift sistemici nel turno corrente, non al CP successivo. Fonte: Changelog F3 riga ~5060.

### #33 -- L-subsystem-consumer-audit
- Stato: minted
- Origine: F3 par.22.101-bis
- Regola: Un refactor che cambia il contract di un sub-system (es. connection.py defaults-file vs credenziali dirette) richiede audit batch di TUTTI i consumer, non solo router/test.
- Contesto: Health endpoint, backup, script: stesso pattern hardcoded vs source-of-truth. Fonte: Changelog F3 riga ~5724.

### #34 -- L-stop-runtime-patching-rootcause
- Stato: minted
- Origine: F3 par.22.101
- Regola: Quando iterazioni di patch nello stesso cluster falliscono, STOP runtime-patching: analizza la root cause architetturale unificata ed emetti un refactor canonico in un singolo CP atomico.
- Contesto: Es. `--single-transaction` (RELOAD) e `--no-tablespaces` (PROCESS) entrambi richiedono privilegi globali che lapp-user least-privilege non ha. Fonte: Changelog F3 riga ~6346.

### #35 -- L-cli-symlink-verify
- Stato: minted
- Origine: F3 par.22.102
- Regola: App GUI/.pkg (Mac App Store) NON espongono il symlink CLI su host headless senza un run GUI: verificare empiricamente lesistenza del symlink prima di assumere il comando CLI.
- Contesto: Catalizzata CP1.2.5 Mini (Tailscale.app .pkg). Fonte: Changelog F3 riga ~6909.

### #36 -- L-tailscale-tag-autoapproval
- Stato: minted
- Origine: F3 par.22.102
- Regola: `--advertise-tags` con `tagOwners autogroup:admin` + utente admin del tailnet = tag auto-approvato server-side, senza approvazione manuale.
- Contesto: Default raccomandato 'manual approval' risulta pessimistico. Fonte: Changelog F3 riga ~6910.

### #37 -- L-tailscale-serve-persist
- Stato: minted
- Origine: F3 par.22.102
- Regola: `tailscale serve --bg` persiste la config Mini-side anche prima del feature-flag tailnet-side; all'enable la config diventa attiva (provisioning ACME asincrono possibile pre-enable).
- Contesto: Catalizzata CP2.2.x. Fonte: Changelog F3 riga ~6911.

### #38 -- L-patcher-no-inline-fence-heredoc
- Stato: minted
- Origine: F3 par.22.102
- Regola: Patcher con heredoc `PYEOF` contenente code-fence triple-backtick destabilizza il parsing zsh (modalita continuazione heredoc>): consegnare il patcher come file + `mv` in /tmp, mai inline cat heredoc. Estende #17.
- Contesto: Catalizzata CP6.2 hang Roberto-side. Fonte: Changelog F3 riga ~6912.

### #40 -- L-baseline-total-vs-active
- Stato: minted
- Origine: par.22.167
- Regola: un conteggio baseline di record va sempre qualificato totali-vs-attivi (vivi vs soft-deleted).
- Contesto: in par.166 il "5 farmaci" era un TOTALE; la stessa query con attivo=TRUE dava 0. Disambiguazione read-only previene falsi-RED in CP0 e falsi allarmi di perdita dati. Fonte: Changelog F3 riga ~9750.

### #41 -- L-unknown-tree-change-halt
- Stato: minted
- Origine: par.22.167
- Regola: una modifica nel working tree di provenienza ignota impone STOP; identificare lautore via mtime/artefatti prima di committare o scartare.
- Contesto: es. M .gitignore non attribuibile alla sessione -> indagine (.claude/, settings, mtime) prima di assumere benignita. Fonte: Changelog F3 riga ~9763.

### #42 -- L-gitignore-not-delete
- Stato: minted
- Origine: par.22.167
- Regola: preferire gitignore alla cancellazione fisica di un file: lignore e reversibile, il rm e distruttivo.
- Contesto: es. CLAUDE.md ignorato e non cancellato; default quando il file potrebbe ancora servire. Fonte: Changelog F3 riga ~9764.

### #43 -- L-inventory-before-destructive
- Stato: minted
- Origine: par.22.168
- Regola: inventario fisico read-only del filesystem prima di ogni rm; i path ricostruiti da memoria/DEFERITI possono driftare.
- Contesto: in par.168 i dump DB e .last_predeploy_v05 stavano in ~/PharmaTimer/backups/, non in root come da memoria. Estende #27. Fonte: Changelog F3 righe ~9785/9800/9808.

<!-- SENTINEL_MINT_40_43_PAR_22_170 -->

### #44 -- L-attivo-guard-orari
- Stato: minted
- Origine: par.22.166
- Regola: loader orari e DELETE farmaco filtrano `attivo = TRUE`.
- Contesto: un farmaco inattivo e invisibile a /orari e non hard-cancellabile via API; per e2e usare attivo=true, per cleanup completo SQL diretto.

### #45 -- L-soft-delete-api
- Stato: minted
- Origine: par.22.166
- Regola: `DELETE /api/farmaci/{id}` e soft-delete (attivo=0), preserva storia/log.
- Contesto: il ripristino baseline richiede hard-delete SQL guardato per nome.

### #46 -- L-e2e-prod-self-cleaning
- Stato: minted
- Origine: par.22.166
- Regola: un e2e prod che scrive dati di test deve essere auto-pulente con guard sul nome + verifica baseline prima di dichiararsi chiuso.
- Contesto: verifica righe + precondizione rollback (es. enum a 0) prima del GO.

### #47 -- L-editable-pep660-rsync-source
- Stato: minted
- Origine: par.22.165
- Regola: con editable PEP 660 limport risolve alla sorgente in-repo; rsync della sorgente aggiorna il runtime, `pip install -e --no-deps` refresha solo i metadati.
- Contesto: deploy backend su Mini.

### #48 -- L-kb-snapshot-staleness
- Stato: minted
- Origine: par.22.165
- Regola: lo snapshot KB del progetto puo restare indietro rispetto al disco, generando un CP0 falso-drift.
- Contesto: diagnosi via recent_chats + sentinel su disco; rimedio = ricaricare la KB dalla versione su disco.

### #49 -- L-implicit-commit-ddl
- Stato: minted
- Origine: par.22.164
- Regola: in MySQL ogni ALTER fa commit implicito.
- Contesto: affidarsi a guard + idempotenza per-statement + backup verificato, non alle transazioni.

<!-- SENTINEL_MINT_44_49_PAR_22_170 -->

### #50 -- L-pipestatus-capture
- Stato: minted
- Origine: par.22.164
- Regola: `${PIPESTATUS[n]}` va catturato in un colpo solo (`arr=("${PIPESTATUS[@]}")`) subito dopo la pipe.
- Contesto: gate atomici sui rc di una pipe (es. mysqldump | gzip).

### #51 -- L-identity-on-writing-conn
- Stato: minted
- Origine: par.22.164
- Regola: il guard `@@server_uuid` piu forte e quello asserito sulla stessa connessione che esegue gli ALTER.
- Contesto: applier prod a doppia fase con guard di identita.

### #52 -- L-applier-minimal-derivation
- Stato: minted
- Origine: par.22.164
- Regola: un applier prod si deriva da quello dev gia provato, con differenze minime ratificate.
- Contesto: riduce il rischio introdotto da codice nuovo su prod.

### #53 -- L-gtid-restorability
- Stato: minted
- Origine: par.22.163
- Regola: `mysqldump` default su `gtid_mode=ON` emette GTID_PURGED + SQL_LOG_BIN=0; usare `--set-gtid-purged=OFF`.
- Contesto: backup ripristinabili senza privilegi elevati.

### #54 -- L-additive-migration-rollback-layered
- Stato: minted
- Origine: par.22.162
- Regola: migration additiva applicata PRIMA del backend; layer di rollback indipendenti; reverse-ALTER enum richiede count(valore_nuovo)=0.
- Contesto: sequenza deploy multi-layer.

### #55 -- L-backup-privilege-aware
- Stato: minted
- Origine: par.22.162-163
- Regola: la modalita di backup dipende dai privilegi reali del ruolo E dallemissione GTID/SQL_LOG_BIN.
- Contesto: pharmatimer_app senza *_VARIABLES_ADMIN ne RELOAD.

<!-- SENTINEL_MINT_50_55_PAR_22_170 -->

### #56 -- L-discriminant-not-version
- Stato: minted
- Origine: par.22.162
- Regola: quando `info.version` non viene bumpato (RC), il discriminante del deploy backend e lo SCHEMA openapi.
- Contesto: verifica presenza marker (fisso_date/data_specifica) invece della versione.

### #57 -- L-prod-data-not-dev
- Stato: minted
- Origine: par.22.162
- Regola: lo stato dei dati prod NON si inferisce dallo stato dev.
- Contesto: baseline dati va sempre letto sul prod reale.

### #58 -- L-memory-vs-grounding
- Stato: minted
- Origine: par.22.157
- Regola: le ipotesi di design basate sulla memoria vanno verificate contro il dump fisico del file.
- Contesto: prima di emettere deviazioni o patch.

### #59 -- L-single-parent-no-remount
- Stato: minted
- Origine: par.22.157
- Regola: figli React keyed che cambiano parent vengono remountati; usare liste di sibling piatte.
- Contesto: raggruppamenti UI (es. occorrenze per data) a parent singolo.

### #60 -- L-enumeration-canon
- Stato: minted
- Origine: par.22.156
- Regola: una sigla collettiva (es. UX-a..g) va sostenuta da enumerazione esplicita lettera->voce, non da ricostruzione posizionale.
- Contesto: mappe lettera->item canoniche.

### #61 -- L-expected-output-calc
- Stato: minted
- Origine: par.22.153
- Regola: calcolare loutput esatto + pattern grep ANCORATI prima di dichiarare un atteso; mai `tail` per i conteggi quando il rumore puo spostare le righe di summary.
- Contesto: CP0 e verifiche empiriche.

### #62 -- L-defaults-file-host-specific
- Stato: minted
- Origine: par.22.161
- Regola: i path di config MySQL sono host-specific (`~/.my-pharmatimer.cnf` su Mini vs `~/.my.cnf` su dev).
- Contesto: ogni comando mysql deve puntare al defaults-file giusto per host.

<!-- SENTINEL_MINT_56_62_PAR_22_170 -->

### #63 -- L-backslashG-no-e-local
- Stato: minted
- Origine: par.22.171
- Regola: `\G` non sopravvive a `mysql -e` nemmeno in locale (Studio); per output verticale usare `--table`/`--vertical` o query su `information_schema`, mai `\G` con `-e`.
- Contesto: comandi mysql diagnostici/CP0 che vogliono colonne verticali; con `-e` il terminatore `\G` resta letterale e rompe la query.

### #64 -- L-paste-echo-mismatch-halt
- Stato: minted
- Origine: par.22.170
- Regola: se l'output incollato non corrisponde al comando emesso (hash o echo-attesi divergenti), STOP e richiedi la ri-esecuzione del blocco corretto; non assumere.
- Contesto: sessioni multi-batch in cui si re-incolla per errore l'output di un batch al posto di un altro; riconoscimento via mismatch hash/echo vs comando emesso.

<!-- SENTINEL_MINT_63_64_PAR_22_173 -->

### #67 -- L-perimetro-sonda-integrale
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-55, LC-56, LC-58, LC-59, LC-62, LC-67, LC-71, LC-72, LC-73, LC-74
- Nota: LC-62 e CONSERVATO senza enunciato (Q-REGI-2=A) -- compare solo in righe di sole `Basi` (Changelog Fase 3 :12035 e :12144) e nella riga meta :14128; contenuto da rimisurare. LC-55 e LC-56 sono enunciati RICOSTRUITI dallo uso e restano ricostruzioni (LC-99).
- Regola: il perimetro di una sonda si enuncia PER INTERO -- path esclusi, CASE, quoting, forma del glob, famiglia lessicale dello identificatore -- o non e enunciato; `grep -r` esclude sempre `node_modules`, `venv`, `__pycache__` e `*.bak*` censiti contro le varianti reali con `find`, lo output multi-file porta sempre `-H`, e i glob si quotano sempre perche zsh aborta il comando se anche uno solo non matcha e la assenza di output viene letta come assenza del file.
- Contesto: ogni sonda di censimento e ogni gate di patcher. Cardinalita ritirate per perimetro incompleto: `*.bak` non escluso ha raddoppiato i conteggi, un pattern case-sensitive ha dato 5 invece di 6, un glob non quotato ha impedito la esecuzione, e il pattern di uno stato React non matchava il proprio setter.

### #68 -- L-riga-non-e-misura
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-63, LC-68, LC-89, LC-105, LC-106
- Regola: una riga restituita da uno strumento non e una misura del suo significato; una sonda dichiara PRIMA i due esiti che distingue, e se un esito e compatibile con entrambe le ipotesi non e una misura; una asserzione negativa o di esaustivita ha per perimetro quello della sonda e non quello del repo; una sonda CLI non misura mai il comportamento del path applicativo, e una config che ESISTE non e la config che GOVERNA.
- Contesto: ogni conclusione tratta da `grep`, da un client a riga di comando o dalla presenza di un file. Un token dentro un commento non e la riga che quel token apre; un blocco di configurazione morto puo coesistere con quello vivo e mentire.

### #69 -- L-bash-forma-eseguibile
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-61, LC-77, LC-78, LC-79, LC-80
- Regola: ogni blocco bash gira in subshell, con `cd` gated da `|| exit 1`, glob quotati, e `;` e mai `&&` fra sonde di conteggio; i path assoluti dei tool sono per-host e si misurano con `command -v` sullo host bersaglio, mai ereditati da un altro host; i comandi one-shot destinati al browser o alla clipboard si consegnano file-backed in `/tmp`.
- Contesto: ogni blocco incollato in Terminale su Studio o via `ssh` sul Mini. Un `&&` fra conteggi ferma la catena al primo esito falsy e produce una misura parziale letta come completa; un `mv` non gated ha gia fermato una GAMMA in silenzio.

### #70 -- L-attesi-misurati-non-dedotti
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-76, LC-83, LC-86, LC-90, LC-96, LC-109
- Regola: lo atteso di un gate si MISURA sul file POST in sandbox e si verifica come POST == PRE + DELTA dichiarato; non si deduce, non si scrive a memoria, e non si deriva MAI dalla stessa sorgente che il gate deve verificare, perche quello non e un gate ma una TAUTOLOGIA; quando `old` e sottostringa di `new` lo atteso POST di `old` e 1 e non 0, dichiarato per-anchor e mai in ciclo uniforme.
- Contesto: ogni self-check di patcher. Un `DELTA_RIGHE` tenuto come intero scritto a mano ha intercettato due conteggi sbagliati su due patcher indipendenti; derivato dal composto sarebbe passato in silenzio in entrambi i casi.

### #71 -- L-collaudo-per-mutazione
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-70, LC-75, LC-93, LC-95, LC-98, LC-108
- Regola: un pin o un gate verde non e efficace finche una mutazione non lo ha visto ROSSO NOMINANDOLO; la harness deve asserire che la mutazione abbia davvero cambiato il sorgente e dichiarare MUTAZIONE NON APPLICATA invece di stampare verde; una mutazione che muove piu di una variabile intercetta ma non isola; il patcher si collauda in sandbox sul COMPORTAMENTO con sagoma fedele, backup FUORI dal repo e rollback dal backup su ogni POST rosso, catturando `Exception` e non solo `AssertionError`.
- Contesto: ogni patcher e ogni pin di suite. Un pin si progetta sulla configurazione dove il rischio vive: se la configurazione scelta non puo mostrare il difetto, il pin certifica il vuoto. Un gate `grep`-0 su un simbolo morto e violato anche da una sua citazione in commento.

### #72 -- L-fonte-e-il-file
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-87, LC-88, LC-91, LC-92, LC-97, LC-99, LC-100, LC-104, LC-107
- Regola: prima di comporre una ratifica o un piano si dumpa LA FONTE che norma -- sezione di Spec, sorgente di produzione, testo della deviazione, riga di TSV -- e mai un suo indice, riassunto o mappa di riga; i file si citano col path completo dalla radice del repo; una fonte che vive in due copie si certifica per IMPRONTA prima di usarne la lettura come misura; una ricostruzione ratificata resta una ricostruzione, salvo prova di identita per md5; fra la prosa dello STATO e `scripts/session_state.env` lo arbitro e lo env; le ratifiche si rileggono contro la fonte a chiusura, con esito DICHIARATO anche quando conferma.
- Contesto: apertura e chiusura di ogni sessione. Un binario documentato per un host non si riusa su un altro senza misurarne il path; e prima di dichiarare perduto un file si interroga il versionamento del sistema operativo.

### #73 -- L-errore-non-rettificato-diventa-premessa
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-57, LC-60, LC-64, LC-66, LC-69, LC-82
- Nota: LC-57, LC-60 e LC-82 sono enunciati RICOSTRUITI dallo uso e restano ricostruzioni (LC-99).
- Regola: il rischio di un errore non e lo errore in se, ma che entri nella storia come fatto misurato e diventi premessa futura, quindi ogni ritiro si verbalizza a Registro; il ritiro di una asserzione per vizio di metodo NON equivale alla sua negazione, la conclusione torna incognita e va rimisurata; nessun rilievo si presenta come NUOVO prima di una sonda di duplicazione a due chiavi su Changelog e backlog; un design dichiarato chiuso ha una scadenza, perche il codice scritto fra design-close e code-step puo invalidarlo; e una dimostrazione su aritmetica temporale resta ipotesi finche una sonda non ha CERCATO il contro-esempio.
- Contesto: Registro rettifiche, Convenzione di rilievo, e ogni conclusione tratta da un pattern-match senza averne verificato la precondizione.

### #74 -- L-invariante-su-tutti-i-percorsi
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-84, LC-94, LC-101
- Regola: un invariante ratificato su UNA superficie, o espresso in UNO spazio di chiavi, si enumera e si verifica su TUTTE le superfici che espongono lo stesso dato e in OGNI spazio di chiavi in cui la scrittura avviene, prima di dichiararlo realizzato; e la collocazione della guardia e essa stessa parte dello invariante.
- Contesto: rafforza il pattern par.6.205. Ogni invariante clinico dei TRE MAI, ogni guardia di livello 1, e ogni upsert che convive con una seconda sequenza di identita.

### #75 -- L-numero-dal-massimo-e-dal-gate
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-54, LC-65, LC-103
- Nota: la clausola finale non porta token e nasce da un rilievo di sessione (Q-REGI-5=A).
- Regola: il primo numero libero si misura sul MASSIMO assegnato e non si deriva dal conteggio; una sonda di baseline non pinna un valore che la chiusura stessa e destinata a cambiare, ma ne verifica forma e coerenza interna; e ogni valore gia gate-ato altrove si GENERA dalla fonte invece di essere trascritto, perche una lista di coordinate scritta nel record invecchia a ogni sessione che la registra -- si esclude per PREDICATO, mai per coordinata.
- Contesto: numerazione del registro, `scripts/cp0.expected`, tabella degli impegni, liste di esclusione dei censimenti. Misurato a quinquagies-ter: una lista che dichiarava TRE sedi ne aveva SEI, perche la chiusura che registra un censimento crea nuove sedi-meta.

### #76 -- L-invariante-non-vive-nella-memoria
- Stato: minted
- Origine: par.22.198-quinquagies-ter (deferito 39; forma Q-LEX-1=A, composizione Q-REGI-3=A). Token: LC-52, LC-53, LC-81, LC-85
- Regola: un invariante che dipende dalla memoria non e un invariante e va automatizzato in uno script o in un self-check di chiusura; il file si censisce per INTERO prima di patcharlo, mai per `grep` troncati; la terna di giunzione del Changelog -- commento `R1 emit`, heading `###` col prefisso `par.`, bullet `SENTINEL_..._GAMMA` -- e asserita dal patcher GAMMA; e lo `outDir` del deploy si deriva da `package.json` con verifica dello output di build PRIMA del rsync.
- Contesto: `scripts/close_step.sh`, la riga INFO di avanzamento in `scripts/cp0.sh`, e i self-check POST di ogni GAMMA.

<!-- SENTINEL_MINT_67_76_PAR_22_198_QUINQUAGIES_TER -->

### #77 -- L-triare-per-posta-prima-di-spendere
- Stato: minted
- Origine: par.22.198-octosexagies (tranche 1 della voce 223; forma Q-LEX-1=A, collocazione Q-ZOCCOLO-5=A)
- Nota: non porta token LC-*, e nasce da una misura di sessione e non dal corpus storico; il precedente di una clausola senza token e la riga finale di #75.
- Regola: prima di spendere righe su un reperto se ne stabilisce la POSTA. Un reperto a zero posta clinica e zero effetto sul prodotto vale UNA RIGA e un parcheggio, qualunque sia la sua eleganza. In FASE 0 non si aprono rilievi: il cancello passa o non passa, e cio che si nota si tria DOPO il CP0.
- Contesto: apertura di sessione, CP0, composizione dei verbali. Misurato a septsexagies: nove errori da quattro cause, e tre asserzioni ritirate in apertura -- voci 216, 217 e 218 -- nate tutte dallo spendere prima di triare, dentro la fase che esiste per far passare un cancello. E la sola contromisura che agisca a monte, e la sola non presidiabile da una macchina.

### #78 -- L-sonda-vuota-porta-controllo-positivo
- Stato: minted
- Origine: par.22.198-octosexagies (tranche 1 della voce 223; forma Q-LEX-1=A, collocazione Q-ZOCCOLO-5=A)
- Nota: non porta token LC-*; ha per parenti stretti LC-89, LC-105 e LC-106, che presidiano il perimetro e la discriminazione ma non la VITALITA dello strumento.
- Regola: ogni sonda che puo tornare vuota porta nello STESSO giro un controllo positivo, cioe un pattern che DEVE matchare sullo stesso perimetro. Se tace anche quello, e rotta la sonda e non assente il dato. Il controllo va puntato su un bersaglio la cui presenza il record afferma davvero, altrimenti misura la propria omissione. Corollario: contare non e leggere, e un verdetto di appartenenza si dimostra citando la voce e non il numero.
- Contesto: sonde di duplicazione, censimenti di prefisso, gate di patcher. Voce 217, dove G-16 fu contata undici volte e letta zero mentre la voce 208 gia censiva il reperto; voce 212, dove una sonda malformata per costruzione fu letta come smentita invece che come strumento rotto; voce 153, dove un glob non quotato sotto nomatch di zsh abortiva il comando e la sonda usciva muta; voce 201 e il suo seguito a octosexagies, dove il controllo positivo era puntato su un bersaglio che il corpus non conteneva.

<!-- SENTINEL_MINT_77_78_PAR_22_198_OCTOSEXAGIES -->

### #79 -- L-lc90-si-verifica-non-si-presume
- Stato: minted
- Origine: par.22.198-terseptuagies (mint DOVUTO, ANCORATO da `Q-TRABEAZIONE-11=A` a biseptuagies; forma `Q-LEX-1=A`, collocazione `Q-ZOCCOLO-5=A` per il precedente, `Q-METOPA-6=A` per questo atto)
- Nota: porta il token `LC-90` e ne e lo ENUNCIATO. Fino a qui `LC-90` viveva come clausola della Convenzione di chiusura e dentro il corpo dei patcher, senza una sede nel registro.
- Regola: quando `old` e sottostringa di `new`, lo atteso POST di `old` e **1** e non 0. Ma la relazione di sottostringa **si VERIFICA per ogni ancora e non si presume**, e non si dichiara mai in un ciclo uniforme: fra due ancore che sembrano identiche una riga vuota, un rientro o una riga interposta rompono la sottostringa e ribaltano lo atteso. COROLLARIO: la relazione non e una proprieta STATICA delle ancore ma una proprieta che una MUTAZIONE puo creare, quindi un gate POST costruito sul verso opposto puo risultare IRRAGGIUNGIBILE, e va riconosciuto come tale invece che contato buono.
- Contesto: patcher content-anchored. A terseptuagies sei ancore su due file hanno preteso attesi DIVERSI riga per riga -- due a 1, perche lo import si appende sotto se stesso, e quattro a 0, perche il blocco nuovo si interpone -- e il gate `POST-6` di `P-METOPA-1` e risultato DOMINATO dal gate di residuo: ogni mutazione che lo avrebbe fatto arrossare ricostruiva `old` dentro `new`. Rimosso col numero lasciato vacante. Precedenti: voce 112, un gate morto spostato a PRE; voce 92, un gate tautologico privato del potere di abortire invece che rimosso.

### #80 -- L-gate-condannato-dalla-propria-prosa
- Stato: minted
- Origine: par.22.198-terseptuagies (mint DOVUTO, ANCORATO da `Q-TRABEAZIONE-11=A` a biseptuagies; forma `Q-LEX-1=A`, collocazione `Q-ZOCCOLO-5=A` per il precedente, `Q-METOPA-6=A` per questo atto)
- Nota: non porta token `LC-*`; e la forma STRETTA di `LC-89` e della voce 99 applicata al patcher che SCRIVE il gate, e ha per parente stretto `#68`.
- Regola: un gate che conta un token nello INTERO file puo essere condannato dalla prosa del patcher che lo scrive. Se il commento appena inserito CITA il token, il conteggio sale e il gate arrossa sulla passata PULITA; se lo stesso commento vive nel file dove il gate pretende ASSENZA, il gate diventa CIECO. Si restringe SEMPRE il conteggio al corpo che il gate pretende di misurare -- le sole righe di codice, il solo blocco aggiunto, il predicato vero -- perche **contare un token non e misurare il suo ruolo**.
- Contesto: gate di patcher e sonde di censimento. A terseptuagies DUE ricorrenze nella stessa sessione, su gate miei e una per verso: `POST-5` contava `mb-2.5` su tutto il file ed e uscito ROSSO sulla passata pulita, perche il commento che il patcher stesso inserisce lo cita; `POST-10` cercava `<IndicatoreCoda` nel file di test ed era CIECO, perche due commenti lo citano. Riparati contando `mb-2.5` sulle sole righe con `className=` e ancorando `POST-10` al predicato vero `/<IndicatoreCoda/g`. Precedenti: voci 84, 99, 100 e 102, piu la clausola 4 della Convenzione di rilievo sugli ATTESI di una sonda.

<!-- SENTINEL_MINT_79_80_PAR_22_198_TERSEPTUAGIES -->

### #81 -- L-consegna-in-sede-non-gattata-e-archivio
- Stato: minted
- Origine: par.22.198-novemseptuagies (mint DOVUTO, deciso in sessione con `Q-ECHINO-7=A`; forma `Q-LEX-1=A`, collocazione `Q-ZOCCOLO-5=A`)
- Nota: non porta token `LC-*`; e la forma OPERATIVA di `G-17` sul verso *esiste -> citato*, e ha per parenti stretti `#72` e la voce 241.
- Regola: una consegna depositata in una sede che nessun gate legge non e una consegna, e un archivio. Il rilevamento di cio che vi si accumula dipende allora dalla ATTENZIONE di una persona, e cio che dipende dalla attenzione prima o poi non accade. Il rimedio non e ENUMERARE i file in un documento -- una enumerazione trascritta e stantia PER COSTRUZIONE gia nello istante in cui la sessione deposita -- ma DERIVARE lo insieme dal disco contro un riferimento che la chiusura stessa muove, cosi lo insieme si svuota da solo e nessun elenco invecchia. Il ritiro si fa per SUFFISSO e mai per cancellazione, perche cancellare un record e M3. COROLLARIO: una guardia di questa forma intercetta la SECONDA occorrenza e mai la prima, e il limite si DICHIARA invece di lasciarlo scoprire.
- Contesto: sedi fuori dal repo, verbali di consegna, corredi di sessione. A novemseptuagies DUE sessioni di solo disegno hanno colliso sullo STESSO slot 154 senza che alcuna delle 23 sonde potesse vederlo, perche una sessione che non committa e non chiude non muove ne git ne sentinel: il rilevatore fu una persona. Misurato allora e non dedotto: `cp0.sh` e `close_step.sh` portavano ZERO occorrenze di `recovery`, mentre Changelog e STATO ne portavano 13 e 5, cioe la cartella era DESCRITTA in abbondanza e LETTA da nessuno. Rimedio `G-20`, sonda 24 del CP0, perimetro derivato per mtime contro `STATO_CORRENTE.md` e ritiro per suffisso `.SUPERATO`. Precedenti: `G-17` alle voci 82 e 154, la voce 241 sulla dichiarazione dello slot, `G-16` sulla lista dei path mantenuta invece che derivata.

<!-- SENTINEL_MINT_81_PAR_22_198_NOVEMSEPTUAGIES -->

### #82 -- L-allowlist-path-risolto
- Stato: minted
- Origine: sessione di rimedio con gate nuovo (ratifica esplicita in sessione)
- Nota: non porta token `LC-*`; e parente stretto di `#66`, che pure e un guasto di AMBIENTE scambiabile per guasto di CODICE.
- Regola: un path scritto in una allowlist di sandbox va dato RISOLTO. Il motore confronta il path dopo avere sciolto i symlink, quindi allowlistare un symlink NON allowlista il suo bersaglio: la voce entra, la configurazione si legge bene, e il permesso non arriva. Il sintomo e il peggiore possibile -- una configurazione che SEMBRA giusta e un accesso che resta negato -- e induce a cercare il difetto ovunque tranne che nella forma del path. Si isola tenendo UNA voce per volta.
- Contesto: `sandbox.network.allowUnixSockets` di Claude Code su macOS, dove `/tmp` e un symlink a `private/tmp`. Misurato e non dedotto: con la sola voce `/tmp/mysql.sock` il client MySQL restava a `ERROR 2002 ... (1)`, cioe EPERM, mentre il socket esisteva; aggiunta `/private/tmp/mysql.sock` il client si e connesso; tenuta la SOLA `/private/tmp/mysql.sock` la connessione via `/tmp/mysql.sock` funziona lo stesso, il che isola la voce efficace e dimostra che la prima era un no-op. Vale per qualunque allowlist di path che sciolga i symlink, non per il solo sandbox.

<!-- SENTINEL_MINT_82_SESSIONE_RIMEDIO -->

---

## Candidate (pronte al mint, sbloccate dalla creazione del registro -- par.130)

> Vuota: le 2 candidate seedate in par.172 sono state mintate in par.173 (#63 L-backslashG-no-e-local, #64 L-paste-echo-mismatch-halt).

<!-- SENTINEL_SEED_CANDIDATE_PAR_22_172 -->

### #65 -- Verifica identita multi-utente PWA = hash-match SHA-256, non UI
**Contesto:** par.179, esecuzione §B (attivazione `Roberto | paziente | id=2` su prod). La verifica e2e "quale utente e loggato nella PWA" via interfaccia e risultata inaffidabile: per due volte la sessione Safari era loggata come **owner id=1** invece del paziente id=2.

**Causa:** (1) la PWA persiste il token in `localStorage` (`pharmatimer.userToken`) + cache service-worker -> una sessione preesistente entra diretta senza LoginGate; (2) l'header "Ciao <nome>" e ambiguo quando owner e paziente sono **omonimi**, e "0 farmaci" e coerente con entrambi per via del self-scope; (3) in Safari la **finestra privata non e pulita** se altre tab private sono aperte (storage condiviso); (4) `clipboard.readText()` da console e bloccato senza gesto utente.

**Regola:** la prova autoritativa di identita e l'**hash-match SHA-256**, non l'UI. Procedura:
1. `localStorage.getItem('pharmatimer.userToken')` -> `crypto.subtle.digest('SHA-256', ...)` -> prefix esadecimale.
2. confronto con `SELECT LEFT(token_hash,12) FROM utenti WHERE id=<atteso>` sul DB.
3. l'UI ("Ciao ...", conteggio farmaci) vale solo come segnale collaterale, **mai** come prova.

**Corollari operativi:**
- per un test isolato della sessione: chiudere tutte le tab private oppure `localStorage.removeItem('pharmatimer.userToken')` prima del paste del token atteso;
- quando serve confrontare un token, leggerlo dal **Keychain** (`security find-generic-password -s 'pharmatimer-token-<id>' -w`), non dalla clipboard;
- inversione d'ordine: prima hash-match, poi (eventuale) conferma visiva.

**Natura:** rimedio di processo/runbook, non di prodotto. Nessuna modifica a codice/schema/VIETATO, nessuna deviazione `s.6`. Aggancio: il passo di verifica e2e del runbook §B (DESIGN §7) cita esplicitamente l'hash-match come gate.

### #66 -- umask != 022 rompe vitest/pytest via $TMPDIR
**Contesto:** apertura par.184, CP0 RED su Studio: vitest 74 unhandled errors (0 test eseguiti), pytest 6 errors in `test_static_serve_guard.py`. Codice tracciato identico a baseline (HEAD 45715ff), prod (Mini) integro. Il guasto era solo lato ambiente dev.

**Causa:** la shell corrente aveva `umask 0177`. Con 0177 ogni file/dir nasce senza permessi di gruppo/altri e, per le dir, **senza bit di esecuzione** (`x`) per il proprietario a valle della creazione ricorsiva -> la dir viene creata ma non e attraversabile/scrivibile. Sia vitest (mkdir `.../ssr` dentro la propria base temp) sia pytest (`.lock` in `pytest-of-<user>/pytest-NN`) creano una dir e subito dopo scrivono al suo interno -> `EACCES` / `PermissionError` dentro `$TMPDIR`.

**Diagnosi decisiva:** `mkdir` a un livello passa, ma creare un **file dentro** una sottodir appena creata fallisce; `umask` risulta `0177`. La sorgente non era in alcun dotfile zsh, launchd o MDM: `zsh -c 'umask'` e `zsh -ic 'umask'` restituiscono `022` -> la 0177 era **transitoria alla singola finestra**, non ereditata all'avvio (fantasma non riproducibile).

**Regola:** all'inizio di CP0 (blocco Studio) imporre e verificare la umask:
```
umask 022
case "$(umask)" in 0022|022) echo OK ;; *) echo DRIFT ;; esac
```
Se vitest riporta "N unhandled errors" con 0 test eseguiti, o pytest da `PermissionError`/`EACCES` su path in `/var/folders/.../T/`, sospettare **subito** la umask prima di ipotizzare codice/dipendenze/git. Rimedio: `umask 022` nella shell + rimozione temp corrotti (`rm -rf "$TMPDIR/pytest-of-<user>" "$TMPDIR"/vitest-*`), poi ri-run nella **stessa** shell.

**Natura:** rimedio di processo/ambiente, non di prodotto. Nessuna modifica a codice/schema/VIETATO, nessuna deviazione `s.6`.
