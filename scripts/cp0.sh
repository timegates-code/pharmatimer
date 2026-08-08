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
# LC-103 / G-1 (par.22.198-quadragies-sexies). Il DESCRIBE dello expected
# deve comparire NELLO STATO. Chiude la famiglia del valore stantio (voce 59)
# per questo campo: la partizione assegna baseline e git allo expected, quindi
# finora la prosa dello STATO poteva invecchiare senza che nulla lo vedesse
# -- ed e successo, voce 59. Riusa $DESCRIBE e NON aggiunge una chiave, cosi
# cp0.expected resta a 14 e `set -u` non accoppia un file TRACKED con uno
# IGNORED scritto dalla GAMMA dopo il commit (trappola di -quinquies).
# Nessuna cardinalita: si asserisce la PRESENZA, perche citare il describe
# due volte nello STATO e legittimo e non deve arrossare il gate.
# SENTINEL_CP0_LC103_DESCRIBE_STATO
ck DESCRIBE_STATO "$DESCRIBE" "$(grep -oF "$DESCRIBE" STATO_CORRENTE.md | head -1)"
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
PYTEST_RC_LIVE=$?
ck PYTEST_RC "0" "$PYTEST_RC_LIVE"
ck PYTEST "$PYTEST" "$(grep -Eo '[0-9]+ passed' /tmp/cp0_pytest.log | grep -Eo '[0-9]+' | head -1)"
# SENTINEL_CP0_XFAILED_ZERO -- Q-COPPIA-1=A. Con s.6.268 estinta la suite non
# porta piu alcun marcatore, e pytest OMETTE il token dalla riga di sommario
# invece di stamparne zero: lo estrattore tornerebbe VUOTO e un atteso di 0
# darebbe DRIFT per sempre. Misurato, non dedotto. La normalizzazione rende il
# gate leggibile e gli lascia il morso nel verso che oggi conta -- nella suite
# backend non esiste alcun xfail -- cosi nessuno puo parcheggiare un test rosso
# sotto un marcatore senza che il CP0 lo veda.
XFAILED_LIVE=$(grep -Eo '[0-9]+ xfailed' /tmp/cp0_pytest.log | grep -Eo '[0-9]+' | head -1)
ck XFAILED "$XFAILED" "${XFAILED_LIVE:-0}"
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
# --- SONDA 20: impegni sotto guardia (SENTINEL_CP0_IMPEGNI_SONDA20; par.198-quattuortriginties-bis) ---
# CLASSE 2 di RED, distinta dal DRIFT per ratifica Q-P3=A: non e il mondo che
# diverge dallo stato dichiarato, e una DECISIONE DOVUTA che nessuno ha preso.
# Contatore FAIL_IMP separato da FAIL; vocabolario SCAD/WARN mai DRIFT.
# Semantica SCADE_A (Q-P2=A): valore di CONSUNTIVO ENTRO IL QUALE il lavoro
# deve essere fatto. >= SCADE_A -> SCAD; == SCADE_A - 1 -> WARN; sotto -> silente.
# Unica via di uscita da uno SCAD: fare il lavoro (riga rimossa) OPPURE
# rinviare esplicitamente (SCADE_A nuovo e RINVII+1), atto visibile in git log -p.
TSV_IMP="scripts/impegni.tsv"
FAIL_IMP=0
N=$((N+1))
if [ ! -f "$TSV_IMP" ]; then
  echo "DRIFT IMPEGNI atteso=$TSV_IMP trovato=assente (la guardia stessa e sparita)"
  FAIL=1
elif [ -z "${CONSUNTIVO:-}" ]; then
  echo "DRIFT IMPEGNI atteso=CONSUNTIVO valorizzato trovato=vuoto"
  FAIL=1
else
  IMP_TOT=0
  IMP_SCAD=0
  IMP_WARN=0
  IMP_BAD=0
  IMP_TAB="$(printf '\t')"
  while IFS="$IMP_TAB" read -r I_TOK I_SCADE I_RINV I_NOTA || [ -n "${I_TOK:-}" ]; do
    case "${I_TOK:-}" in
      ""|"#"*|"TOKEN") continue ;;
    esac
    case "${I_SCADE:-}" in
      ""|*[!0-9]*)
        echo "DRIFT IMPEGNI riga malformata token=$I_TOK SCADE_A=${I_SCADE:-vuoto}"
        IMP_BAD=$((IMP_BAD+1))
        FAIL=1
        continue
        ;;
    esac
    IMP_TOT=$((IMP_TOT+1))
    if [ "$CONSUNTIVO" -ge "$I_SCADE" ]; then
      IMP_SCAD=$((IMP_SCAD+1))
      FAIL_IMP=1
      echo "SCAD  IMPEGNO $I_TOK SCADUTO (SCADE_A=$I_SCADE, CONSUNTIVO=$CONSUNTIVO, RINVII=${I_RINV:-?})"
    elif [ "$CONSUNTIVO" -eq "$((I_SCADE-1))" ]; then
      IMP_WARN=$((IMP_WARN+1))
      echo "WARN  IMPEGNO $I_TOK in scadenza (SCADE_A=$I_SCADE, CONSUNTIVO=$CONSUNTIVO, RINVII=${I_RINV:-?})"
    fi
  done < "$TSV_IMP"
  IMP_LINE="IMPEGNI = $IMP_TOT in guardia, $IMP_SCAD scaduti, $IMP_WARN in scadenza, $IMP_BAD malformate"
  if [ "$IMP_SCAD" -gt 0 ]; then
    echo "SCAD  $IMP_LINE"
  elif [ "$IMP_BAD" -gt 0 ]; then
    echo "DRIFT $IMP_LINE"
  else
    echo "OK    $IMP_LINE"
  fi
fi
# --- SONDA 24: consegne depositate e non dichiarate (G-20; SENTINEL_CP0_CONSEGNE_G20) ---
# CLASSE 1 di RED. Chiude il verso scoperto di G-17 -- esiste -> citato -- sulla
# sede delle CONSEGNE. Movente misurato e non prudenziale: due sessioni di solo
# disegno hanno colliso sullo stesso slot 154 senza che alcuna delle 23 sonde
# potesse vederlo, perche una sessione che non committa e non chiude non muove
# ne git ne sentinel. Il rilevatore fu una persona, ed e la voce 241.
# PERIMETRO DERIVATO E NON MANTENUTO (G-16 applicata al rimedio): i file si
# leggono dal disco per mtime contro STATO_CORRENTE.md, che la GAMMA riscrive,
# quindi lo insieme si SVUOTA DA SOLO a ogni chiusura e nessun elenco invecchia.
# Il suffisso .SUPERATO ritira una consegna senza cancellarla: riscrivere o
# cancellare un record e M3. CONSEGNA vive in session_state.env, gia sorgente
# a :102; si legge come ${CONSEGNA:-} perche cp0.sh e TRACKED e la chiave e
# IGNORED, che e la trappola di -quinquies gia pagata da LC-103.
# LIMITE DICHIARATO (LC-105): intercetta la SECONDA consegna e le successive,
# mai la prima -- nessuna guardia puo -- e il perimetro e la sola cartella
# nominata. Nomi con spazio non sono supportati e il gate G20_NF/G20_NW li
# fa arrossare invece di lasciarli splittare in silenzio.
G20_DIR="$HOME/PharmaTimer_recovery"
G20_RAW=""
N=$((N+1))
if [ -d "$G20_DIR" ]; then
  G20_RAW=$(find "$G20_DIR" -maxdepth 1 -type f -newer STATO_CORRENTE.md ! -name '.*' ! -name '*.SUPERATO' 2>/dev/null | sed 's#.*/##' | sort)
fi
G20_DER=$(printf '%s\n' "$G20_RAW" | grep -v '^$' | sort | tr '\n' ' ')
G20_DIC=$(printf '%s' "${CONSEGNA:-}" | tr ' ' '\n' | grep -v '^$' | sort | tr '\n' ' ')
G20_NF=$(printf '%s' "$G20_RAW" | grep -c .)
G20_NW=$(printf '%s' "$G20_DER" | wc -w | tr -d ' ')
if [ "$G20_NF" -ne "$G20_NW" ]; then
  echo "DRIFT CONSEGNE nome con spazio in $G20_DIR (file=$G20_NF parole=$G20_NW)"
  FAIL=1
elif [ "$G20_DER" = "$G20_DIC" ]; then
  echo "OK    CONSEGNE = $G20_NF pendenti, derivate = dichiarate"
else
  for G20_F in $G20_DER; do
    case " $G20_DIC " in *" $G20_F "*) ;; *) echo "DRIFT CONSEGNA depositata e NON dichiarata: $G20_F" ;; esac
  done
  for G20_F in $G20_DIC; do
    case " $G20_DER " in *" $G20_F "*) ;; *) echo "DRIFT CONSEGNA dichiarata e NON trovata: $G20_F" ;; esac
  done
  FAIL=1
fi
if [ "$FAIL" -eq 0 ] && [ "$FAIL_IMP" -eq 0 ]; then
  echo "CP0 VERDETTO: GREEN ($N sonde)"
  exit 0
elif [ "$FAIL" -eq 0 ]; then
  echo "CP0 VERDETTO: RED -- IMPEGNO SCADUTO (decisione dovuta, non e un drift)"
  exit 1
elif [ "$FAIL_IMP" -eq 0 ]; then
  echo "CP0 VERDETTO: RED -- STOP-ON-DRIFT (regola par.197-ter: fermarsi e verbalizzare)"
  exit 1
else
  echo "CP0 VERDETTO: RED -- DRIFT piu IMPEGNO SCADUTO"
  exit 1
fi
