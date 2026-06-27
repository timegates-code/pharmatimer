<!-- SENTINEL_LESSONS_REGISTRY_INIT_PAR_22_167 -->
# PharmaTimer -- Registro Lesson (canonico)

> File **TRACCIATO in git** (a differenza di STATO/Changelog, gitignored). Fonte canonica delle Lesson di progetto.
> Append-only. Numerazione monotona unica `#NN`; ogni voce ha uno slug mnemonico `L-*` come alias.
> Stato voce: `minted` (ratificata) | `candidate` (in attesa di mint esplicito).
> Inizializzato: par.22.167 (consolidamento post-F14).

## Criterio di mint
- Una candidate diventa `minted` solo per ratifica esplicita dellutente, ricevendo il numero `#NN` successivo.
- Ogni voce: regola azionabile in una frase + contesto di applicazione + origine (par.X.Y, s.6.NN se da deviazione).

## Back-port pendente (DEFERITO -- follow-up dedicato)
- Le Lesson storiche #16..#38 (gia mintate in sessioni precedenti) NON sono ancora trascritte qui.
- Vanno portate dalla loro sede autoritativa attuale per evitare divergenza; richiede turno dedicato.

---

## Minted

### #39 -- L-frontend-mini-deploy-rsync-only
- Stato: minted
- Origine: par.22.166 (Step 4 deploy F14)
- Regola: il redeploy frontend su Mini e SOLO rsync della build (`npm run build:mini` -> `rsync -avi --delete dist-mini/ -> mini:PharmaTimer/web/`); NESSUN restart del backend.
- Contesto: smoke post-deploy = nuovo bundle 200 / vecchio 404 / openapi invariato. Il backend non si tocca perche il frontend e statico same-origin.

---

## Candidate (pronte al mint, sbloccate dalla creazione del registro -- par.130)

### L-attivo-guard-orari
- Origine: par.22.166
- Regola: loader orari e DELETE farmaco filtrano `attivo = TRUE`.
- Contesto: un farmaco inattivo e invisibile a /orari e non hard-cancellabile via API; per e2e usare attivo=true, per cleanup completo SQL diretto.

### L-soft-delete-api
- Origine: par.22.166
- Regola: `DELETE /api/farmaci/{id}` e soft-delete (attivo=0), preserva storia/log.
- Contesto: il ripristino baseline richiede hard-delete SQL guardato per nome.

### L-e2e-prod-self-cleaning
- Origine: par.22.166
- Regola: un e2e prod che scrive dati di test deve essere auto-pulente con guard sul nome + verifica baseline prima di dichiararsi chiuso.
- Contesto: verifica righe + precondizione rollback (es. enum a 0) prima del GO.

### L-editable-pep660-rsync-source
- Origine: par.22.165
- Regola: con editable PEP 660 limport risolve alla sorgente in-repo; rsync della sorgente aggiorna il runtime, `pip install -e --no-deps` refresha solo i metadati.
- Contesto: deploy backend su Mini.

### L-kb-snapshot-staleness
- Origine: par.22.165
- Regola: lo snapshot KB del progetto puo restare indietro rispetto al disco, generando un CP0 falso-drift.
- Contesto: diagnosi via recent_chats + sentinel su disco; rimedio = ricaricare la KB dalla versione su disco.

### L-implicit-commit-ddl
- Origine: par.22.164
- Regola: in MySQL ogni ALTER fa commit implicito.
- Contesto: affidarsi a guard + idempotenza per-statement + backup verificato, non alle transazioni.

### L-pipestatus-capture
- Origine: par.22.164
- Regola: `${PIPESTATUS[n]}` va catturato in un colpo solo (`arr=("${PIPESTATUS[@]}")`) subito dopo la pipe.
- Contesto: gate atomici sui rc di una pipe (es. mysqldump | gzip).

### L-identity-on-writing-conn
- Origine: par.22.164
- Regola: il guard `@@server_uuid` piu forte e quello asserito sulla stessa connessione che esegue gli ALTER.
- Contesto: applier prod a doppia fase con guard di identita.

### L-applier-minimal-derivation
- Origine: par.22.164
- Regola: un applier prod si deriva da quello dev gia provato, con differenze minime ratificate.
- Contesto: riduce il rischio introdotto da codice nuovo su prod.

### L-gtid-restorability
- Origine: par.22.163
- Regola: `mysqldump` default su `gtid_mode=ON` emette GTID_PURGED + SQL_LOG_BIN=0; usare `--set-gtid-purged=OFF`.
- Contesto: backup ripristinabili senza privilegi elevati.

### L-additive-migration-rollback-layered
- Origine: par.22.162
- Regola: migration additiva applicata PRIMA del backend; layer di rollback indipendenti; reverse-ALTER enum richiede count(valore_nuovo)=0.
- Contesto: sequenza deploy multi-layer.

### L-backup-privilege-aware
- Origine: par.22.162-163
- Regola: la modalita di backup dipende dai privilegi reali del ruolo E dallemissione GTID/SQL_LOG_BIN.
- Contesto: pharmatimer_app senza *_VARIABLES_ADMIN ne RELOAD.

### L-discriminant-not-version
- Origine: par.22.162
- Regola: quando `info.version` non viene bumpato (RC), il discriminante del deploy backend e lo SCHEMA openapi.
- Contesto: verifica presenza marker (fisso_date/data_specifica) invece della versione.

### L-prod-data-not-dev
- Origine: par.22.162
- Regola: lo stato dei dati prod NON si inferisce dallo stato dev.
- Contesto: baseline dati va sempre letto sul prod reale.

### L-memory-vs-grounding
- Origine: par.22.157
- Regola: le ipotesi di design basate sulla memoria vanno verificate contro il dump fisico del file.
- Contesto: prima di emettere deviazioni o patch.

### L-single-parent-no-remount
- Origine: par.22.157
- Regola: figli React keyed che cambiano parent vengono remountati; usare liste di sibling piatte.
- Contesto: raggruppamenti UI (es. occorrenze per data) a parent singolo.

### L-enumeration-canon
- Origine: par.22.156
- Regola: una sigla collettiva (es. UX-a..g) va sostenuta da enumerazione esplicita lettera->voce, non da ricostruzione posizionale.
- Contesto: mappe lettera->item canoniche.

### L-expected-output-calc
- Origine: par.22.153
- Regola: calcolare loutput esatto + pattern grep ANCORATI prima di dichiarare un atteso; mai `tail` per i conteggi quando il rumore puo spostare le righe di summary.
- Contesto: CP0 e verifiche empiriche.

### L-defaults-file-host-specific
- Origine: par.22.161
- Regola: i path di config MySQL sono host-specific (`~/.my-pharmatimer.cnf` su Mini vs `~/.my.cnf` su dev).
- Contesto: ogni comando mysql deve puntare al defaults-file giusto per host.
