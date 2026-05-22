#!/usr/bin/env python3
"""
PharmaTimer N+5.B closing — par.11.G-S3 pre-freezing appender.

Idempotent content-based patcher (pattern par.22.58-Fase2 + Lesson #20).

Appends '### 11.G-S3' prefrozen prompt section to
PharmaTimer_Changelog_Fase3.md after the last horizontal rule that
closes par.11.F-S3.

Idempotency strategy:
- SENTINEL token '<!-- par.11.G-S3 R1 emit Fase 3 -->' checked pre-append
- Backup created as PharmaTimer_Changelog_Fase3.md.bak.n5b
- Univocity assertion: anchor match must be exactly 1 occurrence
- Post-condition: SENTINEL must be present exactly 1x after write

Run from repo root: ~/Sviluppo/pharmatimer
    python3 cp_n5b_changelog_g_s3_append.py
"""
from pathlib import Path
import shutil
import sys

CHANGELOG_PATH = Path("PharmaTimer_Changelog_Fase3.md")
BACKUP_PATH = Path("PharmaTimer_Changelog_Fase3.md.bak.n5b")
SENTINEL = "<!-- par.11.G-S3 R1 emit Fase 3 -->"

# Anchor: closing '---' separator at the very end of par.11.F-S3.
# The F-S3 section ends with a line containing exactly '---' as the file
# terminator. We anchor on the final '---\n' occurrence in the file body
# unique to the file tail (validated by univocity check below).
ANCHOR = """6. Eventuale Lesson #24 candidate emergente in sessione

---
"""

NEW_SECTION = """6. Eventuale Lesson #24 candidate emergente in sessione

---

### 11.G-S3 (Fase 3, prompt pre-frozen F3-S3-beta CP1 emit esecutivo monolitico)

<!-- par.11.G-S3 R1 emit Fase 3 -->

**One-liner apertura:** `Esegui il prompt al par.11.G-S3 del Changelog Fase 3.`

**Origine.** Closing sessione N+5.B (opzione A meta-decisione session sizing par.22.55-Fase2). N+5.B = solo CP0 baseline empirico + ratifica Q1-Q6 + ratifica Q-RES-1/2/3 + CP1 design draft approvato (0 source change, 0 commit, 0 tag). Cementazione finale (Changelog par.22.84 + bump 0.4.0 + tag v3.2.0-alpha.4 LOCALE) a CP5 N+5.C.

**Scope alto livello.** Emit CP1 patcher Python monolitico content-based con SENTINEL idempotency_marker (pattern par.22.58-Fase2 + Lesson #20) che implementa: (1) `db/migrations/v02_unique_log.sql` ALTER TABLE UNIQUE `(utente_id, farmaco_id, data, dose_numero)` + wrapper Python idempotent `apply_v02_unique_log.py`; (2) 5 Pydantic models NEW in `pharmatimer_api/models/log_assunzione.py` (`LogAssunzioneSlotPayload` + `LogAssunzioneCreateSaltata` + `LogAssunzioneCreateSospesa` + `LogAssunzioneUndoPayload` + `LogAssunzioneRecuperoPayload`); (3) 4 endpoint NEW in `pharmatimer_api/routers/log_assunzioni.py` (`POST /api/log/saltata` 201, `POST /api/log/sospesa` 201, `POST /api/log/undo` 200, `POST /api/log/recupero` 200); (4) 4 pytest file NEW (`tests/test_log_transitions_saltata.py` + `_sospesa.py` + `_undo.py` + `_recupero.py`) target +12-15 test (cumulativo backend 45-48); (5) 12 curl smoke uvicorn nativo Studio porta 8001 (S0 setup + S1-S11 transitions); (6) Spec v1.5 update (KB-only) sez. 3.1 farmaci + `demo BOOLEAN`, sez. 3.6 nota UNIQUE, sez. 4.7 NEW endpoint transitions, sez. 9 + 4 endpoint rows; (7) closing CP5: bump `pyproject 0.3.0 -> 0.4.0` + Changelog par.22.84 + tag annotato `v3.2.0-alpha.4` LOCALE NO push.

**Modalita.** Esecutiva monolitica (alternativa A meta-decisione). Pattern split safety-first par.22.55-Fase2 NON applicato a priori (stima emit ~28-32K bytes patcher sotto soglia 50K). Se in CP1 design pre-emit emerge densita >40K -> split tecnico interno beta-pre (migration + Pydantic + `/saltata`+`/sospesa`+test) / beta-post (`/undo`+`/recupero`+test + Spec + closing).

**Ratifiche cementate da N+5.B** (NO ri-validazione richiesta in N+5.C):

| Q | Decisione ratificata |
|---|---|
| Q1 transitions matrix | Matrice integrale (vedi reference chat N+5.B) |
| Q2 ALTER TABLE UNIQUE | Apply in CP1 via `v02_unique_log.sql` |
| Q3 `/undo` semantica | Rollback in-place + audit `note` append `[undo timestamp]` |
| Q4 Spec v1.5 | Minor bump v1.4 -> v1.5 KB-only |
| Q5 `/recupero` scope | Minimal: 1 dose target, no cascata D+1..D+N |
| Q6 split pattern | Monolitico (decisione finale post-emit CP1 design) |
| Q-RES-1 `/saltata` D+1 | NO propagazione side effect; propagazione implicita via `/presa` |
| Q-RES-2 `/recupero` vincoli | Solo `recupero <= gap` + `no anticipo oltre ora_prevista`; `intervallo_minimo_ore` deferred F3-S3-gamma+ con TODO esplicito |
| Q-RES-3 transizioni laterali | `saltata <-> sospesa` bloccate 409, richiedono `/undo` intermedio |
| Status code | 201 per `/saltata`+`/sospesa` (UPSERT uniforme); 200 per `/undo`+`/recupero` |

**Pre-letture obbligatorie F3-S3-beta CP1 N+5.C:**
1. Questo Changelog Fase 3 § 0 + § 11.G-S3 scope + § 11.F-S3 (riferimento sub-AMB candidate)
2. `par.22.83-Fase3` integrale (closing F3-S3-alpha-post + 4 drift N40-N43 + Lesson #23)
3. `par.22.82-Fase3` integrale (closing F3-S3-alpha-pre + Lesson #20-#22)
4. Spec v1.4 sez. 3.1 farmaci + 3.5 orari_base + 3.6 log_assunzioni + sez. 4 algoritmo ricalcolo+recupero gap + sez. 9 endpoint REST
5. `par.22.34-Fase2` (RepositoryError vocabulary cross-PWA/backend simmetrico)
6. `par.22.58-Fase2` (pattern patcher Python content-based SENTINEL)
7. `par.6.118-Fase2` (pre-code scenario validation MANDATORY pre-emit)
8. CP1 design draft chat N+5.B recuperabile via `conversation_search query="F3-S3-beta CP1 design draft endpoint transitions"` (architettura 4 endpoint + payload Pydantic + SQL pseudocode + smoke test plan)
9. `pharmatimer_oggi_v5.jsx` mockup (UI transitions saltata/sospesa/undo per riferimento semantica)

**Pattern operativi confermati per N+5.C CP1:**
- Lesson #8-#23 cumulative Fase 2+3 MANDATORY
- Lesson #24 candidate da ratificare in N+5.C (auto-segnalazione N+5.B: pre-Python-introspection MANDATORY anche su classi Pydantic Settings di config, non solo su tabelle DB - estende Lesson #23 schema-first introspection da DB a config)
- Pattern par.22.58-Fase2 patcher Python content-based con SENTINEL + Lesson #20 idempotency_marker + Lesson #21 R2 Python venv pre-DB-access
- Bash zsh-safe (echo single-quoted, no commenti `#`, no apostrofi italiani, heredoc PYEOF per Python multi-line, Settings attributi UPPERCASE `settings.DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`)
- CP0 ridotto N+5.C: gia coperto baseline empirico 10/10 in N+5.B, verifica solo git HEAD + ahead origin + pytest count + working tree clean (no schema re-introspection necessaria - schema gia mappato nel design draft)

**Schema empirico ratificato N+5.B (NO re-introspect in N+5.C):**
- `farmaci` 18 col includes `demo TINYINT(1) NOT NULL DEFAULT 0` (chiude drift-N38)
- `orari_base` 8 col matches Spec sez. 3.5
- `log_assunzioni` 14 col, ENUM `stato` 5 valori (`prevista|presa|saltata|sospesa|ricalcolata`), INDEX corrente `idx_log_utente_farmaco_data` NON-UNIQUE senza `dose_numero` -> conferma necessita UNIQUE NEW
- AUTO_INCREMENT post-trap S12 N+5.A: farmaci=5, orari_base=4, log_assunzioni=4

**Decisioni in-session candidate N+5.C** (a CP5 closing):
1. Bump backend `pyproject.toml` 0.3.0 -> 0.4.0 (raccomandato si, transitions = milestone state machine completa)
2. Tag `v3.2.0-alpha.4` LOCALE annotato NO push (raccomandato si, AMB-11.B.7-bis sesta applicazione cumulativa Fase 3)
3. Spec v1.5 emit KB-only (raccomandato si, chiude drift-N37/N38 + documenta 4 endpoint NEW sez. 9 + sez. 4.7 NEW transitions semantics)
4. Eventuale ratifica Lesson #24 (Settings UPPERCASE pre-introspection) se sub-AMB confermata in apertura
5. Branch `fase-3-backend` continuazione (no merge `main` fino F3-S7 smoke)

**Sub-AMB residue carry-forward N+5.B -> N+5.C:**
- **Lesson #24 candidate**: pre-Python-introspection MANDATORY anche su classi Pydantic Settings (auto-segnalazione N+5.B CP0.4-bis errore mio `settings.db_host` lowercase vs reale `settings.DB_HOST` UPPERCASE). Decisione: ratificare in apertura N+5.C come Lesson #24 MANDATORY o solo annotazione cumulativa.
- **Q-RES residua sospesa stato sorgente `presa`**: Q-RES-3 ha ratificato laterali `saltata <-> sospesa` 409 ma resta da definire se `/sospesa` accetta `presa` come sorgente. Mockup `SospesaCorrectModal` non chiarisce esplicitamente. Raccomandazione: in CP1 emit accettare solo `prevista`+`ricalcolata` come stato sorgente per `/sospesa` (semantica "decisione intenzionale pre-assunzione"), bloccare `presa` con 409 richiedendo `/undo` -> `/sospesa` due step.

---
"""

# Validate working directory
if not CHANGELOG_PATH.exists():
    print(f"FAIL: {CHANGELOG_PATH} not found in current directory.")
    print(f"      Run from repo root (~/Sviluppo/pharmatimer).")
    sys.exit(1)

# Read file
text = CHANGELOG_PATH.read_text(encoding="utf-8")

# Idempotency check (Lesson #20: explicit marker check before mutation)
if SENTINEL in text:
    print(f"NOOP: SENTINEL '{SENTINEL}' already present in file.")
    print(f"      File: {CHANGELOG_PATH} ({len(text)} bytes)")
    print(f"      No changes applied.")
    sys.exit(0)

# Univocity assertion (pattern par.22.58 + Lesson #20 self-check)
anchor_count = text.count(ANCHOR)
if anchor_count != 1:
    print(f"FAIL: ANCHOR pattern matched {anchor_count} times (expected exactly 1).")
    print(f"      Anchor head: {ANCHOR[:80]!r}")
    sys.exit(2)

# Backup
shutil.copy2(CHANGELOG_PATH, BACKUP_PATH)
print(f"OK: Backup created -> {BACKUP_PATH}")

# Apply replacement
new_text = text.replace(ANCHOR, NEW_SECTION, 1)

# Post-condition checks
if SENTINEL not in new_text:
    print(f"FAIL: SENTINEL missing from output after replace.")
    sys.exit(3)
if new_text.count(SENTINEL) != 1:
    print(f"FAIL: SENTINEL appears {new_text.count(SENTINEL)} times in output (expected 1).")
    sys.exit(4)
if len(new_text) <= len(text):
    print(f"FAIL: output length {len(new_text)} <= input length {len(text)}, no growth detected.")
    sys.exit(5)

# Write
CHANGELOG_PATH.write_text(new_text, encoding="utf-8")
delta = len(new_text) - len(text)
print(f"OK: par.11.G-S3 appended to {CHANGELOG_PATH}")
print(f"    Input bytes : {len(text)}")
print(f"    Output bytes: {len(new_text)} (+{delta})")
print(f"    SENTINEL    : present 1x")
print(f"    Backup      : {BACKUP_PATH}")
print()
print("Next manual step (Roberto):")
print("  1. Inspect diff:  git --no-pager diff PharmaTimer_Changelog_Fase3.md")
print("  2. Optional commit (no tag, no push):")
print("     git add PharmaTimer_Changelog_Fase3.md")
print("     git commit -m 'N+5.B closing par.11.G-S3 pre-frozen F3-S3-beta CP1 monolitico esecutivo - ratifiche Q1-Q6 + Q-RES-1/2/3 + Lesson #24 candidate Settings UPPERCASE + sub-AMB sospesa stato sorgente carry-forward - 0 source change 0 tag (cementazione finale a CP5 N+5.C)'")
print("  3. Cleanup backup when satisfied: rm PharmaTimer_Changelog_Fase3.md.bak.n5b")
print("  4. Re-upload PharmaTimer_Changelog_Fase3.md to Claude KB project")
print("  5. Open N+5.C with one-liner: 'Esegui il prompt al par.11.G-S3 del Changelog Fase 3.'")
