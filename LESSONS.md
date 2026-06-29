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

---

## Candidate (pronte al mint, sbloccate dalla creazione del registro -- par.130)

> Vuota: le 2 candidate seedate in par.172 sono state mintate in par.173 (#63 L-backslashG-no-e-local, #64 L-paste-echo-mismatch-halt).

<!-- SENTINEL_SEED_CANDIDATE_PAR_22_172 -->
