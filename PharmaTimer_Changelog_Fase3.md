# PharmaTimer — Changelog Fase 3 (backend multi-tenant)

> Spin-off di `PharmaTimer_Changelog_Fase2.md` al closing milestone tecnico F3-S1-bis cumulativo (par.22.80 in Fase 2). Fase 3 = backend FastAPI 0.136 + MySQL 9.6 nativo Mac Studio + schema multi-tenant 8 tabelle (Spec v1.4 sez. 3) + endpoint REST scoped `utente_id` via `X-User-Token` SHA-256 hash check (Spec v1.4 sez. 9). Pivot strategy nativo Studio ratificato s.6.237 (par.22.79-ter Fase 2).

---

## 0. Provenienza

Questo file nasce come spin-off del Changelog Fase 2 al closing della Sessione **F3-S1-bis-delta parte 2/2** (par.22.80 di `PharmaTimer_Changelog_Fase2.md`). Tutte le sessioni F3-S1, F3-S1-bis (alpha/beta/gamma/delta parte 1/2 + parte 2/2) restano archiviate immutabili in Fase 2 (par.6.71/85). Da Sessione F3-S2 in poi tutti i closing e i pre-frozen vanno qui.

**Convenzione cross-file**:
- Riferimenti retroattivi a Fase 2: `par.NN-Fase2` (es. `par.22.80-Fase2`).
- Deviazioni `s.6.NN` continuano la numerazione progressiva globale (ultima emessa in Fase 2: s.6.240, prossime in Fase 3 a partire da s.6.241+).
- Pattern operativi cumulativi: lesson #8-#18 cumulative invariate da Fase 2.

**Stato baseline all'apertura Fase 3** (post-par.22.80-Fase2):
- Branch `fase-3-backend` HEAD = commit closing par.22.80-Fase2
- Tag `v3.2.0-alpha.1` LOCALE annotato (extend annotation cumulativa F3-S1-bis)
- package.json `3.1.0` invariato (frontend versioning separato, D3 ratificato)
- backend/pyproject.toml `0.1.0` (versionamento backend indipendente, D2 ratificato)
- 504/504 test PWA + 13/13 test backend = 517 totali

---

## 11. Roadmap sessioni F3

### 11.D-S2 Prompt Sessione F3-S2 esecutiva CRUD farmaci scoped utente_id (post-F3-S1-bis-delta parte 2/2 par.22.80-Fase2 closing milestone)

<!-- par.11.D-S2 R1 emit Fase 3 -->

**One-liner apertura:** `Esegui il prompt al par.11.D-S2 del Changelog Fase 3.`

**Scope alto livello.** Estensione router `farmaci.py` con POST / PUT / DELETE scoped `utente_id`, vocabolario `RepositoryError` cementato (404 NOT_FOUND, 409 CONSTRAINT_VIOLATION, 503 DB_UNAVAILABLE), Pydantic `FarmacoCreate` payload, smoke pytest 8-12 test CRUD aggiuntivi (target 21-25 backend cumulativo), CP browser smoke curl 5-7 scenari (happy CREATE 201 / UPDATE 200 / DELETE 204 + edge cases 404/409). Roadmap successiva F3-S3 router `orari_base` + `log_assunzioni` con stesso pattern.

**Modalita raccomandata.** Esecutiva mista con pattern split safety-first par.22.55-Fase2 applicabile se densita CRUD farmaci 4 endpoint + Pydantic constraints + integration tests >40K. Suggerimento apertura: CP0 baseline ridotto + analisi-first 3-5 Q (vocabolario RepositoryError mapping CRUD-specifico, idempotency PUT/DELETE, validation Pydantic vs DB constraints) prima di CP1 emit.

**Sub-AMB F3-S2.A÷E candidate** (definizione effettiva in apertura F3-S2):
- **F3-S2.A**: PUT idempotency strategia (full replace vs partial JSON merge)
- **F3-S2.B**: DELETE soft (set `attivo=FALSE`) vs hard (DELETE row) — default raccomandato SOFT (`attivo=FALSE`) coerente con scope GET filtra `attivo=TRUE`
- **F3-S2.C**: validation `data_fine >= data_inizio` lato Pydantic vs DB CHECK constraint vs application-layer
- **F3-S2.D**: `intervallo_ore` vs `dosi_giornaliere` mutual exclusivity per `tipo_frequenza=intervallo` vs `=fisso` (validation cross-field Pydantic)
- **F3-S2.E**: response 201 Created body shape (full FarmacoResponse vs id-only vs Location header)

**Pre-letture obbligatorie F3-S2:**
1. `par.22.80-Fase2` integrale (closing F3-S1-bis-delta parte 2/2 + stato git baseline)
2. `par.22.79-ter-Fase2` (pivot strategy nativo Studio ratificato)
3. Questo Changelog Fase 3 § 0 + § 11.D-S2 scope
4. Spec v1.4 sez. 9 (endpoint REST CRUD) + sez. 3.4 (schema `farmaci` 18 colonne + ENUM `relazione_pasto` + ENUM `tipo_frequenza`)
5. `par.22.34-Fase2` (RepositoryError vocabulary cross-PWA/backend simmetrico)
6. `par.6.118-Fase2` (pre-code scenario validation MANDATORY pre-emit)

**Pattern operativi confermati per F3-S2:**
- Lesson #8-#18 cumulative Fase 2 invariate (#16 mysql redirect + #17 Python heredoc + #18 UUID match + #9 subshell wrapper)
- Pattern par.22.58-Fase2 patcher Python content-based con SENTINEL + assertion `count == 1` pre/post
- Bash zsh-safe (echo single-quoted, no `#`, no apostrofi italiani)
- AMB-11.B.7 / AMB-11.B.7-bis-Fase2: bump effettivo `pyproject.toml` 0.1.0 → 0.2.0 + tag `v3.2.0-alpha.2` a CP5 closing F3-S2 milestone CRUD completo (frontend package.json invariato fino F3-S6 deploy Mini)

**Decisioni in-session candidate F3-S2** (a CP5 closing):
1. Bump backend `pyproject.toml` 0.1.0 → 0.2.0 (raccomandato sì, CRUD = milestone funzionale)
2. Tag `v3.2.0-alpha.2` LOCALE annotato (raccomandato sì, AMB-11.B.7-bis pattern intermedi)
3. Branch `fase-3-backend` continuazione (no merge `main` fino F3-S7 smoke)
4. Eventuale ApiRepository PWA-side stub (deferred F3-S5 integration test cross-PWA/backend)

---

### 11.D-S3 Prompt Sessione F3-S3 esecutiva CRUD orari_base + log_assunzioni scoped utente_id (post-F3-S2 par.22.81 closing milestone)

<!-- par.11.D-S3 R1 emit Fase 3 -->

**One-liner apertura:** `Esegui il prompt al par.11.D-S3 del Changelog Fase 3.`

**Scope alto livello.** Estensione backend con 2 router NEW: `routers/orari.py` (CRUD `orari_base` scoped `utente_id` + `farmaco_id`) e `routers/log_assunzioni.py` (READ + POST atomic `assunzione` con state machine prevista/presa/saltata/sospesa/ricalcolata). Pydantic models `OrarioBase`/`OrarioCreate`/`OrarioResponse` + `LogAssunzioneCreate`/`LogAssunzioneResponse`. Smoke pytest 10-15 test aggiuntivi (target 35-40 backend cumulativo). CP browser smoke curl 6-8 scenari. Roadmap successiva F3-S4 caregiver permessi + Import/Export workflow.

**Modalita raccomandata.** Esecutiva mista con pattern split safety-first par.22.55-Fase2 applicabile (densita 2 router + bulk replace orari_base + state machine log_assunzioni potenzialmente >50K). Suggerimento apertura: CP0 baseline ridotto + analisi-first 4-6 Q (scope F3-S3.A nested vs flat, F3-S3.B atomic transaction, F3-S3.C algoritmo ricalcolo backend-side vs PWA-computed, F3-S3.D bulk replace strategy, F3-S3.E ora_prevista autoritativita) prima di CP1.

**Sub-AMB F3-S3.A-E candidate** (definizione effettiva in apertura F3-S3):
- **F3-S3.A**: orari_base scope - nested router (`/api/farmaci/{id}/orari`) vs flat (`/api/orari?farmaco_id=N`)
- **F3-S3.B**: log_assunzioni POST atomic - 1 endpoint generico `/api/log` vs endpoint dedicato `/api/assunzioni` con state transitions
- **F3-S3.C**: ricalcolo gap Spec sez. 4 - backend transaction SQL (autoritativo) vs PWA-computed (backend solo persist)
- **F3-S3.D**: bulk replace `orari_base` per farmaco - DELETE+INSERT atomic vs UPDATE+UPSERT
- **F3-S3.E**: validation `ora_prevista` derivata da `profilo_utente` + offset - autoritativo backend vs PWA-computed

**Pre-letture obbligatorie F3-S3:**
1. `par.22.81-Fase3` integrale (closing F3-S2 + stato git baseline)
2. `par.22.80-Fase2` integrale (closing F3-S1-bis-delta parte 2/2 + baseline architetturale)
3. Questo Changelog Fase 3 § 0 + § 11.D-S3 scope + tabella riferimenti
4. Spec v1.4 sez. 3.5 (orari_base 9 colonne + ENUM ancora_riferimento) + sez. 3.6 (log_assunzioni 13 colonne + ENUM stato) + sez. 4 (algoritmo ricalcolo+recupero gap)
5. `par.22.34-Fase2` (RepositoryError vocabulary cross-PWA/backend simmetrico)
6. `par.6.118-Fase2` (pre-code scenario validation MANDATORY pre-emit)

**Pattern operativi confermati per F3-S3:**
- Lesson #8-#19 cumulative Fase 2+3 invariate
- Pattern par.22.58-Fase2 patcher Python content-based con SENTINEL + assertion `count == 1`
- Bash zsh-safe (echo single-quoted, no `#`, no apostrofi italiani)
- AMB-11.B.7 / AMB-11.B.7-bis-Fase2: bump effettivo `pyproject.toml` 0.2.0 -> 0.3.0 + tag `v3.2.0-alpha.3` a CP5 closing F3-S3 milestone

**Decisioni in-session candidate F3-S3** (a CP5 closing):
1. Bump backend `pyproject.toml` 0.2.0 -> 0.3.0 (raccomandato si)
2. Tag `v3.2.0-alpha.3` LOCALE annotato (raccomandato si, AMB-11.B.7-bis pattern intermedi)
3. Branch `fase-3-backend` continuazione (no merge `main` fino F3-S7 smoke)
4. Eventuale ApiRepository PWA-side stub (deferred F3-S5 integration test)

---

## Riferimenti immutabili a Fase 2

| Sezione Fase 2 | Tema | Note |
|---|---|---|
| par.22.80 | Closing F3-S1-bis-delta parte 2/2 milestone | Origine spin-off Fase 3 |
| par.22.79-quater | Closing F3-S1-bis-delta parte 1/2 (CP3 router farmaci READ) | 5 file backend CP3 emessi |
| par.22.79-ter | Pivot strategy (c) Docker → (a) nativo Studio empirico T4-T7 | Lesson #15-18 NEW |
| par.22.79-bis | F3-S1-bis-beta milestone /api/health verde | Container Docker bypass quirk MySQL 9.6 nativo |
| par.22.79 | F3-S1 R1 parziale + quirk auth nativo Studio diagnostica | 9 deviazioni s.6.222-230 |
| par.22.34 | RepositoryError vocabulary PWA + backend simmetrico | Mapping HTTP code+severity |
| par.6.71/85 | History immutability + gap s.6.NN preservato | Convention cross-fase |
| par.6.118 | Pre-code scenario validation MANDATORY | Pattern lesson learned |
| par.22.55 | Split safety-first preventivo | Pattern applicabile cross-fase |
| par.22.58 | Patcher Python content-based con SENTINEL | Pattern replicato N+ volte |
| AMB-11.B.7 / AMB-11.B.7-bis | Bump + tag a CP5 closing milestone | Tag intermedi LOCALE no push |

---


---

## 22. Stati cumulativi sessioni F3

### 22.81 Stato post-Sessione F3-S2 esecutiva CRUD farmaci CP1-CP5 (25/25 backend test 1.27s + 4 smoke uvicorn nativo + 1 implicito + bump pyproject 0.2.0 + tag v3.2.0-alpha.2 LOCALE no push)

<!-- par.22.81 emit closing -->

**Data:** 22 maggio 2026 sera.

**Modalita:** esecutiva mista 5 CP unica sessione + CP0 baseline empirico ampliato 3 round + CP1 patcher Python content-based 22833 bytes 3 file + CP2 pytest 25/25 verde + CP3 smoke uvicorn nativo Studio 4 scenari espliciti + 1 implicito + CP4 commit cumulativo selective + CP5 closing dedicato (bump + Changelog + tag LOCALE). Pattern par.22.55-Fase2 split safety-first NON applicato (densita contenuta singola sessione). Token spesi ~60K. Wall-clock ~2.5h.

**Esito:** OK 5/5 CP verdi al primo colpo, zero diagnostica preventiva attivata. 25/25 backend test (1.27s, +12 vs baseline F3-S1-bis-delta). 4 smoke uvicorn verdi espliciti (S1-S4) + 1 verde implicito (S5 via T12 pytest, drift-doc-NEW-S2 pipe `json.tool` consuma `-w` body). 2 commit (CP4 cumulativo CP1-CP3 + CP5 closing dedicato) + tag annotato `v3.2.0-alpha.2` LOCALE no push (AMB-11.B.7-bis quarta applicazione cumulativa Fase 3).

#### Scope consegnato

**CP0 baseline empirico ampliato 3 round:**
- CP0 iniziale: pytest 13/13 NON eseguito per pytest globale assente Python 3.13 system - anomalia A2
- CP0-ext: discovery anomalie A1 path backend (`pharmatimer_api/` NON `app/`) + A2 venv (`backend/venv/`) + A3 credenziali MySQL deferred
- CP0-ext-2: 13/13 pytest verde con venv attivato + sorgenti 5 file CP1 target (models/farmaci/exceptions/dependencies/conftest)
- CP0-ext-3: DDL `farmaci` da `db/migrations/v01_init.sql` - rivela discrepanza sub-AMB F3-S2.D mal-formulata

**Discrepanza DDL vs prompt par.11.D-S2 risolta:**
- Sub-AMB F3-S2.D nel prompt par.11.D-S2: "`intervallo_ore` vs `dosi_giornaliere` mutual exclusivity"
- DDL `v01_init.sql`: `dosi_giornaliere INT NOT NULL` + `intervallo_ore DECIMAL(4,1) NULL`
- Spec sez. 3.1: `dosi_giornaliere` = "Numero di somministrazioni/die" sempre valorizzato
- Mockup `pharmatimer_oggi_v5.jsx`: farmaci `tipo_frequenza='intervallo'` hanno `dosi_giornaliere=2/3` valorizzato (NON null)
- Riformulazione F3-S2.D-bis: condizionalita solo su `intervallo_ore`+`intervallo_minimo_ore`, `dosi_giornaliere` sempre obbligatorio

**CP1 patcher Python idempotente content-based** `cp1_s2_patch.py` 22833 bytes, esecuzione 5 replace + 1 write_new tutti verdi:
- `pharmatimer_api/models/farmaco.py` MOD: import esteso `model_validator` + 2 `@model_validator(mode='after')` (`_validate_frequenza_consistency` + `_validate_data_range`) + NEW `class FarmacoUpdate(FarmacoBase)` eredita validators. 1705 -> 3478 bytes (+1773).
- `pharmatimer_api/routers/farmaci.py` MOD: import esteso (`Response`, `status`, `RepositoryError`, `RepositoryErrorCode`, `FarmacoCreate`, `FarmacoUpdate`) + 3 endpoint NEW (`POST /api/farmaci` -> 201 + `Location` header + body `FarmacoResponse`; `PUT /api/farmaci/{id}` -> 200 + body; `DELETE /api/farmaci/{id}` -> 204 SOFT `attivo=FALSE` scoped + idempotency 404 NOT_FOUND). 1441 -> 7132 bytes (+5691).
- `tests/test_farmaci_crud.py` NEW: 12 test scenari pytest (5 POST + 3 PUT + 4 DELETE). 9317 bytes.

**CP2 pytest backend 25/25 verde 1.27s** = 13 ereditati F3-S1-bis-delta parte 2/2 + 12 nuovi F3-S2 CP1. Distribuzione: `test_auth_middleware` 5 + `test_farmaci_crud` 12 + `test_farmaci_read` 4 + `test_health` 2 + `test_seed_owner` 2.

**CP3 smoke uvicorn nativo Studio porta 8001:**
- S1 POST happy fisso (`tipo_frequenza='fisso'`, `dosi_giornaliere=1`, no intervallo) -> **201 Created** + `Location: /api/farmaci/2` + body 18 campi serializzati Decimal/date/datetime/bool con `id=2`, `utente_id=2`, `created_at`, `updated_at`
- S2 PUT full replace (`nome=SmokeF3S2_updated`, `dosi_giornaliere=2`, `funzione=Smoke updated`) -> **200 OK** + body `FarmacoResponse` aggiornato
- S3 DELETE -> **204 No Content** (SOFT `attivo=FALSE`)
- S4 re-DELETE stesso id -> **404 Not Found** + `{"error":{"code":"NOT_FOUND","severity":"warning","message":"Farmaco 2 non trovato o gia inattivo"}}` (F3-S2.B-bis idempotency-by-obscurity ratificato)
- S5 GET filtra inattivi -> implicit verde via T12 pytest `test_delete_then_get_filters_out` (drift-doc-NEW-S2: pipe `python3 -m json.tool 2>/dev/null` consuma silenziosamente body poiche curl `-w` HTTP code appende a JSON invalidandolo)

**CP4 selective git add** 3 file MOD/NEW (`.bak.cp1-s2` NON staged) + commit cumulativo `decec9e` 478 insertions / 4 deletions. Branch `fase-3-backend` 1 commit ahead `origin/fase-3-backend`.

**CP5 closing dedicato:**
- cleanup 2 `.bak.cp1-s2` rimossi pre-closing (CP1 backup non piu necessari post-pytest+smoke verdi)
- bump `backend/pyproject.toml` 0.1.0 -> 0.2.0 (AMB-11.B.7 milestone CRUD funzionale)
- Changelog Fase 3 append par.22.81 + par.11.D-S3 pre-frozen via patcher Python content-based
- commit closing CP5 dedicato (separato da `decec9e` per cleanliness pyproject+Changelog vs codice)
- tag annotato `v3.2.0-alpha.2` LOCALE NO push su HEAD post-commit-closing (AMB-11.B.7-bis pattern intermedi)

#### Deviazioni s.6.NN nuove (1 doc-only)

- **s.6.241** doc-only: sub-AMB F3-S2.D in par.11.D-S2 R1 (`intervallo_ore` vs `dosi_giornaliere` mutual exclusivity) mal-formulata vs DDL `v01_init.sql` (`dosi_giornaliere INT NOT NULL`) + Spec sez. 3.1 + mockup `pharmatimer_oggi_v5.jsx`. Riformulata F3-S2.D-bis in apertura F3-S2: validation Pydantic enforce condizionalita SOLO su `intervallo_ore`/`intervallo_minimo_ore` (NULL per `fisso`, NOT NULL >0 per `intervallo`); `dosi_giornaliere` sempre obbligatorio. Nessuna deviazione codice da par.11.D-S2: allineamento con fonte di verita DDL+Spec+mockup convergenti. Pattern par.6.118-Fase2 pre-code scenario validation ha catalizzato l'emergere della discrepanza al CP0-ext-3.

#### Drift-doc-NEW Fase 3 cumulativi

- **N34** (Fase 3): commit-msg cumulativi F3-S1-bis-delta (5a9e60b parte 1/2, fe212ad parte 2/2) citano path `backend/app/routers/farmaci.py` ma package effettivo Mac-side e' `backend/pharmatimer_api/`. Pattern par.6.71/85 immutabilita: no retro-correzione commit-msg, drift documentato solo qui par.22.81.
- **N35** (Fase 3, NEW-S2): bash CP3 pipe `curl -s -w '\nHTTP_%{http_code}\n' ... | python3 -m json.tool 2>/dev/null` consuma silenziosamente il body JSON poiche `-w` appende `HTTP_200` al body invalidando il JSON parsing. Stderr soppresso da `2>/dev/null` -> output muto. API ha funzionato (verificato implicit via T12 pytest verde). No retro-correzione bash CP3.

#### Stato git post-F3-S2 CP5

- branch `fase-3-backend` HEAD `<TBD-cp5-commit>` 2 commit ahead `origin/fase-3-backend` (decec9e CP4 + closing CP5)
- tag annotato `v3.2.0-alpha.2` LOCALE NO push su HEAD CP5 closing (AMB-11.B.7-bis pattern intermedi quarta applicazione cumulativa Fase 3)
- tag `v3.2.0-alpha.1` su `fe212ad` invariato (closing F3-S1-bis-delta parte 2/2)
- `backend/pyproject.toml` `0.2.0`
- `package.json` `3.1.0` invariato (D3-Fase2 ratificata: frontend versioning separato fino F3-S6 deploy Mini)
- 504/504 PWA + **25/25 backend** = **529 test totali cumulativi**
- working tree clean post-closing

#### Findings cumulativi carry-forward F3-S3+

- 17 findings registry Fase 2 polish invariati carry-forward par.22.60-Fase2
- 12 residual UX findings v3.1.0 invariati carry-forward par.22.73-Fase2
- 4 drift-doc-NEW F3-S1-bis-delta (N30/N31/N32/N33) chiusi par.22.80-Fase2
- **cleanup-N3 Fase 3 NEW**: smoke S1+S2 hanno lasciato 1 row `farmaci.id=2` `attivo=FALSE` in `pharmatimer_dev` (`SmokeF3S2_updated`). NO interferenza runtime (GET filtra `attivo=TRUE`). Hard cleanup deferito opportunistico F3-S3+.
- 2 `.bak.cp1-s2` rimossi in CP5 closing (no carry-forward).
- sub-AMB carry-forward post-F3-S2: addFarmaco undefined fields literal persistence PWA-side (deferred F3-S5+ integration) + cleanup-N1 IndexedDB test row dev-only browser-side

#### Riferimenti par.22.81

- **par.22.80-Fase2** (closing F3-S1-bis-delta parte 2/2): origine spin-off Fase 3, baseline pre-F3-S2, 13/13 backend cumulativo
- **par.22.79-quater-Fase2** (closing F3-S1-bis-delta parte 1/2): scope ereditato CP3 5 file backend, lesson #18 UUID match nativo
- **par.22.79-ter-Fase2**: pivot strategy nativo Studio ratificato T4-T7 (origine s.6.237-Fase2)
- **par.22.34-Fase2**: RepositoryError vocabulary cross-PWA/backend simmetrico applicato PUT/DELETE NOT_FOUND
- **par.22.58-Fase2**: pattern patcher Python content-based SENTINEL + assertion count==1 replicato 2x (CP1 + CP5)
- **par.22.55-Fase2**: pattern split safety-first NON applicato (densita F3-S2 contenuta)
- **par.6.118-Fase2**: pre-code scenario validation 12 scenari validati pre-emit CP1 + ha catalizzato discrepanza F3-S2.D
- **par.6.71/85-Fase2**: history immutability + gap s.6.NN preservato (s.6.241 prima emit Fase 3)
- **AMB-11.B.7 / AMB-11.B.7-bis-Fase2**: bump effettivo + tag annotation applicato CP5 closing F3-S2 milestone

#### Sessione successiva post-F3-S2

**F3-S3 esecutiva CRUD `orari_base` + `log_assunzioni` scoped `utente_id`**. Pre-frozen prompt sezione `### 11.D-S3` sopra.

One-liner apertura: `Esegui il prompt al par.11.D-S3 del Changelog Fase 3.`
