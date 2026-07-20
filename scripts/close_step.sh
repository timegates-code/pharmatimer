#!/bin/bash
# ============================================================
# PharmaTimer close_step -- guardia di chiusura gated (LC-81).
# Uso: bash scripts/close_step.sh "<messaggio>" <path1> [<path2> ...]
# Unita all-or-nothing: pre-gate atomicita -> add -> commit ->
# push -> assert (AHEAD=0 && TREE=0). Fail-loud, nessun rollback:
# su push fallito il commit resta in sede (recupero = re-push o
# pull/rebase, piu facile col commit intatto).
# Il pre-gate rifiuta QUALSIASI voce di git status --porcelain
# estranea ai path passati (tracked-dirty O untracked-non-ignorato):
# stesso universo dell'assert TREE, cosi se il pre-gate passa e il
# commit consuma i path passati, l'assert e GREEN per costruzione.
# Le misure AHEAD/TREE sono IDENTICHE a scripts/cp0.sh.
# Exit 0 solo su VERDETTO GREEN.
# ============================================================
set -u
cd "$(dirname "$0")/.." || exit 1

# --- guardia argomenti: messaggio + almeno un path ---
if [ "$#" -lt 2 ]; then
  echo 'ABORT uso: bash scripts/close_step.sh "<messaggio>" <path1> [<path2> ...]'
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
MSG="$1"
shift
if [ -z "$MSG" ]; then
  echo "ABORT messaggio di commit vuoto"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi

# normalizza: rimuove un eventuale prefisso ./
norm() { printf '%s' "$1" | sed 's#^\./##'; }

# insieme dei path passati (uno per riga, normalizzati)
PASSED=""
for p in "$@"; do
  PASSED="$PASSED$(norm "$p")
"
done

# --- PRE-GATE atomicita: porcelain meno i path passati deve essere vuoto ---
EXTRANEOUS=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  ppath=$(printf '%s' "$line" | cut -c4-)
  ppath=$(norm "$ppath")
  if ! printf '%s\n' "$PASSED" | grep -qxF "$ppath"; then
    EXTRANEOUS="$EXTRANEOUS  $ppath
"
  fi
done <<PORCELAIN
$(git status --porcelain)
PORCELAIN
if [ -n "$EXTRANEOUS" ]; then
  echo "ABORT pre-gate atomicita: voci di albero estranee ai path passati:"
  printf '%s' "$EXTRANEOUS"
  echo "  committa solo i path nominati: ripulisci o passa anche questi"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
echo "STEP  pre-gate atomicita: OK (nessuna voce estranea)"

# --- PRE-GATE upstream ---
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)
if [ -z "$UPSTREAM" ]; then
  echo "ABORT nessun upstream configurato: impossibile garantire il push"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
echo "STEP  upstream: $UPSTREAM"

# --- ADD (solo i path passati, -- per sicurezza sui nomi) ---
if ! git add -- "$@"; then
  echo "RED   git add fallito"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
echo "STEP  add: $*"

# --- COMMIT (nothing-to-commit = ABORT esplicito, non falso GREEN) ---
if git diff --cached --quiet; then
  echo "ABORT nothing to commit: i path passati non hanno modifiche in stage"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
if ! git commit -m "$MSG"; then
  echo "RED   git commit fallito"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
SHORT=$(git rev-parse --short HEAD)
echo "STEP  commit: $SHORT"

# --- PUSH (fail-loud, nessun reset) ---
if ! git push; then
  echo "RED   git push fallito -- il commit $SHORT resta in sede (recupero: re-push o pull/rebase)"
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
echo "STEP  push: $UPSTREAM"

# --- ASSERT (misure IDENTICHE a scripts/cp0.sh) ---
AHEAD=$(git rev-list --count @{u}..HEAD)
TREE=$(git status --porcelain | wc -l | tr -d ' ')
FAIL=0
if [ "$AHEAD" = "0" ]; then echo "OK    AHEAD = 0"; else echo "DRIFT AHEAD atteso=0 trovato=$AHEAD"; FAIL=1; fi
if [ "$TREE" = "0" ]; then echo "OK    TREE = 0"; else echo "DRIFT TREE atteso=0 trovato=$TREE"; FAIL=1; fi

if [ "$FAIL" -eq 0 ]; then
  echo "CLOSE_STEP VERDETTO: GREEN"
  exit 0
else
  echo "CLOSE_STEP VERDETTO: RED"
  exit 1
fi
