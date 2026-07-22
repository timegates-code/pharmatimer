#!/bin/bash
# ============================================================
# PharmaTimer CP0 auto-verificante (opzione A, par.22.198-ter).
# Uso: bash scripts/cp0.sh   (dalla root del repo, o da ovunque)
# Attesi letti da scripts/cp0.expected (gitignored, riscritto a
# ogni GAMMA dal patcher di chiusura). Exit 1 su qualsiasi DRIFT.
# Le sonde prod no-stop (conteggi mossi dal pilota) sono INFO.
# ============================================================
set -u
cd "$(dirname "$0")/.." || exit 1
EXP="scripts/cp0.expected"
if [ ! -f "$EXP" ]; then
  echo "ABORT: manca $EXP (viene scritto dalla GAMMA di chiusura)"
  exit 1
fi
. "$EXP"
umask 022
FAIL=0
N=0
ck() {
  N=$((N+1))
  if [ "$2" = "$3" ]; then
    echo "OK    $1 = $3"
  else
    echo "DRIFT $1 atteso=$2 trovato=$3"
    FAIL=1
  fi
}
case "$(umask)" in
  0022|022) N=$((N+1)); echo 'OK    umask = 022' ;;
  *) N=$((N+1)); echo "DRIFT umask trovato=$(umask)"; FAIL=1 ;;
esac
ck HEAD "$HEAD" "$(git rev-parse --short HEAD)"
ck DESCRIBE "$DESCRIBE" "$(git describe --tags)"
ck AHEAD "0" "$(git rev-list --count @{u}..HEAD)"
ck TREE "0" "$(git status --porcelain | wc -l | tr -d ' ')"
SENT_LIVE=$(head -1 STATO_CORRENTE.md | sed 's/<!-- //; s/ -->//')
# SENTINEL_CP0_FORMCHECK_PAR198QUATER -- sonda di FORMA, non di valore (opzione A par.198-quater):
# il sentinel STATO cambia a ogni GAMMA; pinnarlo in cp0.expected generava
# un DRIFT sistematico post-chiusura. SENT_COUNT (sotto) verifica la coerenza
# fra riga 1 e one-liner; qui si valida solo che la forma sia quella attesa.
N=$((N+1))
case "$SENT_LIVE" in
  SENTINEL_STATO_PAR_[0-9]*) echo "OK    SENTINEL = $SENT_LIVE (forma valida)" ;;
  *) echo "DRIFT SENTINEL forma inattesa trovato=$SENT_LIVE"; FAIL=1 ;;
esac
ck SENT_COUNT "2" "$(grep -c "$SENT_LIVE" STATO_CORRENTE.md)"
ck LESSONS "$LESSONS" "$(grep -cE '^### #[0-9]+' LESSONS.md)"
echo '...vitest in esecuzione (attendere)...'
npx vitest run > /tmp/cp0_vitest.log 2>&1
ck VITEST_TESTS "$VITEST_TESTS" "$(grep -Eo 'Tests  [0-9]+ passed' /tmp/cp0_vitest.log | grep -Eo '[0-9]+' | head -1)"
ck VITEST_FILES "$VITEST_FILES" "$(grep -Eo 'Test Files  [0-9]+ passed' /tmp/cp0_vitest.log | grep -Eo '[0-9]+' | head -1)"
echo '...pytest in esecuzione...'
( cd backend && venv/bin/python -m pytest -q > /tmp/cp0_pytest.log 2>&1 )
ck PYTEST "$PYTEST" "$(grep -Eo '[0-9]+ passed' /tmp/cp0_pytest.log | grep -Eo '[0-9]+' | head -1)"
ck DEV_UUID "$DEV_UUID" "$(mysql -N -B -e 'SELECT LEFT(@@server_uuid,9)')"
BASE="https://marketreader-server.taila127de.ts.net"
ck ROOT "200" "$(curl -s -o /tmp/cp0_root.html -w '%{http_code}' "$BASE/")"
ck BUNDLE "$BUNDLE" "$(grep -oE 'index-[A-Za-z0-9_-]*\.js' /tmp/cp0_root.html | sort -u | head -1 | sed 's/\.js$//')"
curl -s "$BASE/openapi.json" -o /tmp/cp0_openapi.json
ck OPENAPI_BYTES "$OPENAPI_BYTES" "$(wc -c < /tmp/cp0_openapi.json | tr -d ' ')"
ck OPENAPI_VER "$OPENAPI_VER" "$(grep -oE '"version":"[^"]*"' /tmp/cp0_openapi.json | cut -d'"' -f4)"
ssh mini '/opt/homebrew/bin/mysql --defaults-file=/Users/marketreader/.my-pharmatimer.cnf -N -B' <<'SQLEOF' > /tmp/cp0_prod.txt 2>&1
SELECT LEFT(@@server_uuid,9);
SELECT COUNT(*) FROM utenti;
SELECT COUNT(*) FROM permessi;
SELECT COUNT(*) FROM farmaci WHERE attivo=1;
SELECT COUNT(*) FROM orari_base;
SELECT COUNT(*) FROM log_assunzioni;
SELECT COUNT(*) FROM orari_base WHERE data_specifica IS NOT NULL;
SELECT COUNT(*) FROM farmaci WHERE tipo_frequenza='fisso_date';
SQLEOF
ck PROD_UUID "$PROD_UUID" "$(sed -n '1p' /tmp/cp0_prod.txt)"
ck UTENTI "$UTENTI" "$(sed -n '2p' /tmp/cp0_prod.txt)"
ck PERMESSI "$PERMESSI" "$(sed -n '3p' /tmp/cp0_prod.txt)"
echo "INFO  prod no-stop (verbalizzare): farmaci_attivi=$(sed -n '4p' /tmp/cp0_prod.txt) orari_base=$(sed -n '5p' /tmp/cp0_prod.txt) log_assunzioni=$(sed -n '6p' /tmp/cp0_prod.txt) data_specifica=$(sed -n '7p' /tmp/cp0_prod.txt) farmaci_fisso_date=$(sed -n '8p' /tmp/cp0_prod.txt)"
# --- avanzamento (INFO no-stop, calcolato da session_state.env; SENTINEL_CP0_AVANZAMENTO) ---
ENV_SS="scripts/session_state.env"
if [ -f "$ENV_SS" ]; then
  . "$ENV_SS"
  BSUM=$(( ${BLOCCO_TOT_MIN:-0} + ${BLOCCO_TOT_MAX:-0} ))
  RSUM=$(( ${FONDOSCALA_MIN:-0} + ${FONDOSCALA_MAX:-0} ))
  if [ "$BSUM" -gt 0 ] && [ "$RSUM" -gt 0 ]; then
    BPCT=$(( (${BLOCCO_FATTI:-0} * 200 + BSUM / 2) / BSUM ))
    RPCT10=$(( (${CONSUNTIVO:-0} * 2000 + RSUM / 2) / RSUM ))
    RPCTS="$((RPCT10 / 10)),$((RPCT10 % 10))"  # SENTINEL_CP0_ROADMAP_DECIMO
    BMID="$((BSUM / 2))"; [ $((BSUM % 2)) -ne 0 ] && BMID="${BMID},5"
    RMID="$((RSUM / 2))"; [ $((RSUM % 2)) -ne 0 ] && RMID="${RMID},5"
    BLAB="Blocco (${BLOCCO:-?}) [range ${BLOCCO_TOT_MIN:-0}-${BLOCCO_TOT_MAX:-0}]:"
    RLAB="Roadmap (v3.2.0) [range ${FONDOSCALA_MIN:-0}-${FONDOSCALA_MAX:-0}]:"
    echo 'INFO  === STATI DI AVANZAMENTO ==='
    printf 'INFO  %-36s %3s / ~%-6s = ~%d%%\n' "$BLAB" "${BLOCCO_FATTI:-0}" "$BMID" "$BPCT"
    printf 'INFO  %-36s %3s / ~%-6s = ~%s%%\n' "$RLAB" "${CONSUNTIVO:-0}" "$RMID" "$RPCTS"
  fi
fi
if [ "$FAIL" -eq 0 ]; then
  echo "CP0 VERDETTO: GREEN ($N sonde)"
  exit 0
else
  echo "CP0 VERDETTO: RED -- STOP-ON-DRIFT (regola par.197-ter: fermarsi e verbalizzare)"
  exit 1
fi
