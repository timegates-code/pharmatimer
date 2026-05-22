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
