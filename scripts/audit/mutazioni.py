#!/usr/bin/env python3
"""PharmaTimer -- collaudo per mutazione dei pin M1, M2 e M3 (`make mutazioni`).

Uso:  backend/venv/bin/python scripts/audit/mutazioni.py [--compatto]
      --compatto  il solo esito quando e verde, il dettaglio quando e rosso:
                  e la forma di make check.

Un pin verde non e un pin efficace (CLAUDE.md sezione 6). Per ogni riga della
tabella MUTAZIONI il blocco muta il codice che la riga nomina -- di prodotto, o
di un gate come il calcolo del livello di g21 --, lancia i file di test
veri e pretende il rosso dei test che la riga nomina. Il collaudo che prima si
faceva a mano e si dichiarava nei corpi di commit qui si misura a ogni gate.

NON TOCCA MAI L'ALBERO DI LAVORO. Le mutazioni si fanno su copie dell'albero
di lavoro -- file tracciati piu non tracciati non ignorati, cioe cio che si
sta per committare -- in una cartella temporanea, rimossa in uscita anche su
interruzione. node_modules e backend/.env.dev entrano nelle copie per link:
vitest gira con --no-cache, e il banco rifiuta di scrivere un file la cui
realpath esce dalla copia. Nessun gancio nel codice di prodotto: la mutazione
e una sostituzione di testo nella copia.

LA SEDE SI TROVA PER CONTENUTO: un'ancora che compare UNA volta sola nel file,
poi la prima occorrenza del testo da mutare dopo l'ancora. Ancora assente o
ripetuta, testo assente: ROSSO, mai saltato.

IL DB DI TEST. pytest nella copia legge backend/.env.dev relativo alla propria
cartella (config.py), e .env.dev e ignorato, quindi non viene copiato: entra
per link. Prima di ogni pytest il banco confronta la risoluzione della copia
con quella di backend/ dell'albero, cioe con quella di test-backend, e
pretende DB_NAME_TEST diverso da DB_NAME. Senza link la config non si risolve
e pytest si ferma alla raccolta, prima di ogni TRUNCATE.

Esiti che distingue, dichiarati prima della misura:
  VERDE  la harness e verificata e ogni riga MORDE: ogni test atteso e rosso
         sotto la sua mutazione. I rossi fuori attesa si stampano come INFO.
  ROSSO  NON MORDE: un test atteso resta verde, il pin non protegge la sede;
         BERSAGLIO: la sede non si trova piu per contenuto;
         HARNESS: baseline non verde, test atteso assente o ambiguo, DB di
         test della copia diverso da quello di test-backend, backend importato
         fuori dalla copia, rapporto illeggibile, ripristino non identico, o
         autoprova tradita.

AUTOPROVA, a ogni esecuzione: una mutazione dentro un commento deve dare NON
MORDE sia su pytest sia su vitest -- una harness che vedesse rosso ovunque
renderebbe verde ogni riga -- e un'ancora inesistente deve dare BERSAGLIO.

pytest gira in SERIE: il DB di test e condiviso e conftest.py fa TRUNCATE
autouse. vitest gira su piu copie in parallelo, in concorrenza con pytest.

Uscita 0 se VERDE, 1 altrimenti.
"""
from __future__ import annotations

import concurrent.futures as cf
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import xml.etree.ElementTree as ET

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COPIE_VITEST = 4
TIMEOUT_S = 300

LA = "backend/pharmatimer_api/routers/log_assunzioni.py"
SR = "src/data/repository/SyncRepository.js"
AH = "src/state/applyHelper.js"
SPLIT = "src/domain/outboxSplitter.js"
# pytest: percorsi relativi a backend/. vitest: relativi alla radice.
T_IM = "tests/test_intervallo_minimo.py"
T_CO = "tests/test_invariante_coppia.py"
T_SRIM = "src/data/repository/SyncRepository.intervalloMinimo.test.js"
T_SR = "src/data/repository/SyncRepository.test.js"
T_CT = "src/data/repository/ApiRepository.contratto.test.js"
T_OS = "src/domain/outboxSplitter.test.js"
T_AG = "src/state/applyHelper.opguard.test.js"
T_AS = "src/utils/avvisoScheda.test.js"
V7 = "backend/db/migrations/v07_push.sql"
T_V7 = "tests/test_v07_schema.py"
INV = "scripts/audit/inventario.py"
T_G21 = "tests/test_g21_livello.py"
DIP = "scripts/audit/dipendenze.py"
T_DIP = "tests/test_dipendenze.py"
CAN = "backend/pharmatimer_api/canale.py"
CFG = "backend/pharmatimer_api/config.py"
PU = "backend/pharmatimer_api/routers/push.py"
MPU = "backend/pharmatimer_api/models/promemoria.py"
T_CAN = "tests/test_canale.py"
T_CFG = "tests/test_config_validator.py"
T_PST = "tests/test_push_stato.py"
T_PIS = "tests/test_push_iscrizione.py"
T_PCA = "tests/test_push_calendario.py"
TRA = "backend/pharmatimer_api/invio.py"
T_TRA = "tests/test_invio.py"
PIAN = "backend/pharmatimer_api/pianificatore.py"
T_PIAN = "tests/test_pianificatore.py"
SW = "public/sw-push.js"
T_SW = "src/pwa/sw-push.test.js"
# Client del canale, passo 2: iscrizione e rinnovo.
CPU = "src/services/canalePush.js"
T_CPU = "src/services/canalePush.test.js"
UNO = "src/hooks/useNotifications.js"
T_UNO = "src/hooks/useNotifications.test.jsx"
NOTI = "src/services/notifications.js"
T_TOC = "src/services/notifications.tocco.test.js"
ACX = "src/state/AppContext.jsx"
T_ACX = "src/state/AppContext.test.jsx"
ACT = "src/state/actions.js"
T_ACAN = "src/state/actions.canale.test.js"
RCAN = "src/data/repository/canale.js"
T_RCAN = "src/data/repository/canale.test.js"
T_NOTI = "src/services/notifications.test.js"
T_ACR = "src/state/AppContext.riarmo.test.jsx"
# Client del canale, passo 3: il pubblicatore e il testo della dose.
PUB = "src/domain/pubblicatore.js"
T_PUB = "src/domain/pubblicatore.test.js"
PRO = "src/domain/promemoria.js"
T_PRO = "src/domain/promemoria.test.js"
# Client del canale, passo 4: lo stato del canale, la riga di Oggi, Impostazioni.
STC = "src/domain/statoCanale.js"
T_STC = "src/domain/statoCanale.test.js"
TES = "src/utils/testi.js"
T_TES = "src/utils/testi.canale.test.js"
RIGA = "src/components/shared/RigaCanale.jsx"
T_RIGA = "src/components/shared/RigaCanale.test.jsx"
IMP = "src/components/config/ImpostazioniTab.jsx"
T_IMP = "src/components/config/ImpostazioniTab.canale.test.jsx"
OGGI = "src/components/oggi/OggiView.jsx"
T_OGGI = "src/components/oggi/OggiView.canale.test.jsx"
T_IMPT = "src/components/config/ImpostazioniTab.test.jsx"
# PUT farmaci: l esistenza si legge dalla SELECT con scope, non da rowcount.
FA = "backend/pharmatimer_api/routers/farmaci.py"
T_FC = "tests/test_farmaci_crud.py"

# Il tocco del toggle (ratifica A del 2026-10-01): subscribe() primo atto del gesto.
SUBSCRIBE_NEL_GESTO = (
    "      promessa = p.registrazione.pushManager.subscribe({\n"
    "        userVisibleOnly: true,\n"
    "        applicationServerKey: p.chiave,\n"
    "      });"
)
SUBSCRIBE_DOPO_ATTESA = (
    "      promessa = Promise.resolve().then(() => p.registrazione.pushManager.subscribe({\n"
    "        userVisibleOnly: true,\n"
    "        applicationServerKey: p.chiave,\n"
    "      }));"
)

# Il ramo scartato "materializzare le previste" (M3), scritto dentro la
# rilettura del log: una riga 'prevista' quando il log non ne ha.
MATERIALIZZA_PREVISTA = (
    "    riga = cur.fetchone()\n"
    "    if riga is None:\n"
    "        cur.execute(\"INSERT INTO log_assunzioni (utente_id, farmaco_id, data, \"\n"
    "                    \"dose_numero, ora_prevista, stato) VALUES (%s, %s, %s, %s, \"\n"
    "                    \"'08:00:00', 'prevista')\", (voce[\"utente_id\"], voce[\"farmaco_id\"],\n"
    "                    voce[\"data\"], voce[\"dose_numero\"]))\n"
)

GUARDIA_VERBO = (
    "  if (opGuardActive && !OUTBOX_OPS.includes(op)) {\n"
    "    throw new Error(\n"
    "      'commitApplyResult: verbo di gesto non riconosciuto: ' + String(op)\n"
    "    );\n"
    "  }\n"
)
GUARDIA_VERBO_NEL_TRY = "".join("  " + r + "\n" for r in GUARDIA_VERBO.splitlines())


def riga(ident, fonte, invariante, edits, suite, files, attesi, openapi=False):
    """Una mutazione: edits e una lista di (file, ancora, testo, sostituto)."""
    return dict(id=ident, fonte=fonte, invariante=invariante, edits=edits,
                suite=suite, files=files, attesi=attesi, openapi=openapi)


# La tabella. Un pin nuovo porta qui la sua riga nel commit che lo introduce
# (CLAUDE.md sezione 6). La fonte dice da dove viene la forma: dal corpo del
# commit, dal Changelog archiviato, o ricostruita.
MUTAZIONI = [
    # f5b7e88, decisione 2: intervallo minimo lato server. Forme dal corpo.
    riga("d2-minuti-reali", "f5b7e88 MS1", "M1",
         [("backend/pharmatimer_api/tempo.py", "def minuti_reali(",
           "(istante(a) - istante(b))", "(parete(a) - parete(b))")],
         "pytest", [T_IM], ["test_dst_la_guardia_misura_minuti_reali"]),
    riga("d2-vicina-successiva", "f5b7e88 MS2", "M1",
         [(LA, "def _avviso_intervallo_minimo(", "    if dopo is not None:\n", "    if False:\n")],
         "pytest", [T_IM], ["test_vicina_successiva_su_presa_retroattiva"]),
    riga("d2-rifiuto-mai", "f5b7e88 MS3", "M1",
         [(LA, "# SENTINEL_D2_AVVISO_PRESA",
           "and minuti_reali(ricalc.ora_ricalcolata, payload.ora_effettiva) < minimo_minuti",
           "and False")],
         "pytest", [T_IM], ["test_ricalcolo_sotto_minimo_rifiutato_presa_registrata"]),
    riga("d2-rifiuto-sempre", "f5b7e88 MS4", "M1",
         [(LA, "# SENTINEL_D2_AVVISO_PRESA",
           "and minuti_reali(ricalc.ora_ricalcolata, payload.ora_effettiva) < minimo_minuti",
           "and True")],
         "pytest", [T_IM], ["test_ricalcolo_regolare_applicato"]),
    riga("d2-avviso-ignorato", "f5b7e88 MC1", "M1",
         [(SR, "// SENTINEL_D2_AVVISO_INTERVALLO",
           'if (corpo && corpo.avviso && typeof corpo.avviso === "object") {', "if (false) {")],
         "vitest", [T_SRIM],
         ["A1 consegna con avviso: nota scritta PRIMA del drop, motivo INTERVALLO_MINIMO, "
          "numeri del server e ora della PRESA"]),
    riga("d2-drop-senza-nota", "f5b7e88 MC2", "M1",
         [(SR, "// SENTINEL_D2_AVVISO_INTERVALLO", '      if (!scritto) return "ritentabile";\n', "")],
         "vitest", [T_SRIM],
         ["A4 nota non scrivibile (farmaco ignoto nello specchio): lo elemento RESTA in coda, "
          "ne drop ne parcheggio ne tentativo speso"]),
    riga("d2-scheda-senza-ramo", "f5b7e88 MC3", "M1",
         [("src/utils/avvisoScheda.js", "export function componiScheda(",
           "  if (r.motivo === MOTIVO_INTERVALLO_MINIMO) {\n    return componiSchedaIntervalloMinimo(r);\n  }\n",
           "")],
         "vitest", [T_AS], ["I2 record completo -> COMPLETA, con la ora della PRESA e non del tocco"]),
    # 012e34a, decisione 3: contratto dei tipi. Forme dal corpo.
    riga("d3-scavalco-mezzanotte", "012e34a MD3", "M3",
         [("src/domain/recalc.js", "// Step 3: patch target",
           "const oraEffettivaIso = `${dataEffettiva}T${oraEffettiva}:00`;",
           "const oraEffettivaIso = `${target.dateStr}T${oraEffettiva}:00`;")],
         "vitest", [T_CT],
         ["T2 scavalco, client -> server: la dose delle 23:30 del 16 presa alle 00:30 del 17 "
          "viaggia con data 16 e ora_effettiva del 17, dal produttore al filo"]),
    riga("d3-targa-annidata", "012e34a MD5", "M3",
         [("backend/pharmatimer_api/models/log_assunzione.py",
           "class RicalcoloDoseSuccessivaPayload(BaseModel):",
           "    gap_minuti: int\n", "    gap_minuti: int\n    client_op_id: str | None = None\n")],
         "vitest", [T_CT],
         ["R4 DIVERGENZA VERA, in coda: il ponte manda client_op_id annidato e il server non lo "
          "dichiara (pydantic lo scarta in silenzio, misurato)"],
         openapi=True),
    # e2ac85a, pin d5: ritorno dalla fotografia del server. Forma dal corpo.
    riga("rilettura-specchio", "e2ac85a d5", "M1",
         [(SR, "  async getLogByRange(dataDa, dataA) {",
           "      await this._local.mirrorLogWindow(data, dataDa, dataA);\n      this._bumpFreshness();\n",
           "      await this._local.mirrorLogWindow(data, dataDa, dataA);\n      this._bumpFreshness();\n"
           "      return data;\n")],
         "vitest", [T_SR],
         ["successo: mirrorLogWindow(server, da, a) + ritorna lo specchio RILETTO",
          "clinico: il server dice prevista, lo specchio dice presa -- affiora presa"]),
    # 4228d48, guardia di livello 1 sul verbo e coppia atomica. Forme dal
    # Changelog archiviato, :13504 (LC-98): il corpo dice solo "provata".
    riga("verbo-guardia-sempre", "4228d48 MUT-1", "M1",
         [(AH, "// SENTINEL_S6261_L1_OP_GUARD",
           "const opGuardActive = Boolean(import.meta.env && import.meta.env.DEV);",
           "const opGuardActive = true;")],
         "vitest", [T_AG], ["PROD: NON solleva e il tocco viene persistito lo stesso"]),
    riga("verbo-guardia-mai", "4228d48 MUT-2", "M1",
         [(AH, "// SENTINEL_S6261_L1_OP_GUARD",
           "const opGuardActive = Boolean(import.meta.env && import.meta.env.DEV);",
           "const opGuardActive = false;")],
         "vitest", [T_AG],
         ["DEV: un verbo fuori vocabolario SOLLEVA",
          "DEV: solleva PRIMA di ogni dispatch e PRIMA di ogni persist"]),
    riga("verbo-guardia-spostata", "4228d48 guardia al sito di persist", "M1",
         [(AH, "// SENTINEL_S6261_L1_OP_GUARD", GUARDIA_VERBO, ""),
          (AH, "// 3. Persist atomically.", "  try {\n", "  try {\n" + GUARDIA_VERBO_NEL_TRY)],
         "vitest", [T_AG],
         ["DEV: un verbo fuori vocabolario SOLLEVA",
          "DEV: solleva PRIMA di ogni dispatch e PRIMA di ogni persist"]),
    riga("coppia-mai-riconosciuta", "4228d48 MUT-3", "M1",
         [(SPLIT, "export function isAtomicPresaPlusRicalc(logs) {",
           "logs.length !== 2) return false;", "logs.length !== 2 || true) return false;")],
         "vitest", [T_SR],
         ["s.6.259: la coppia atomica viaggia come UNA sola richiesta",
          "s.6.259: N elementi accodati in UNA transazione a due store"]),
    riga("coppia-farmaco-cieco", "4228d48 MUT-4", "M1",
         [(SPLIT, "export function isAtomicPresaPlusRicalc(logs) {",
           "first.farmaco_id === second.farmaco_id,", "first.farmaco_id === first.farmaco_id,")],
         "vitest", [T_OS], ["esige stesso farmaco_id e ordine [presa, ricalcolata]"]),
    # b6b4471, invariante di coppia ora_ricalcolata / recupero_minuti. Il
    # Changelog archiviato (:14036) conta le mutazioni sulle cinque sedi senza
    # scriverle: forma RICOSTRUITA, la sede torna al difetto riparato. Il
    # modulo di test gira intero, perche SC-8 conta la copertura.
    riga("coppia-presa", "b6b4471, ricostruita", "M1+M3",
         [(LA, "# SENTINEL_S6268_COPPIA_PRESA", "rec_old,\n", "rec_new,\n")],
         "pytest", [T_CO], ["test_s154_presa_ramo_update"]),
    riga("coppia-ricalcolo", "b6b4471, ricostruita", "M1+M3",
         [(LA, "# SENTINEL_S6268_COPPIA_RICALCOLO",
           "\"recupero_minuti = 0, stato = 'ricalcolata' \"", "\"stato = 'ricalcolata' \"")],
         "pytest", [T_CO], ["test_s205_ricalcolo_totale_residuo"]),
    riga("coppia-saltata", "b6b4471, ricostruita", "M1+M3",
         [(LA, "# SENTINEL_S6268_COPPIA_SALTATA", "rec_old,\n", "rec_new,\n")],
         "pytest", [T_CO], ["test_s346_saltata_intra_giorno", "test_s346_saltata_cross_midnight"]),
    riga("coppia-sospesa", "b6b4471, ricostruita", "M1+M3",
         [(LA, "# SENTINEL_S6268_COPPIA_SOSPESA", "rec_old,\n", "rec_new,\n")],
         "pytest", [T_CO], ["test_s443_sospesa"]),
    riga("coppia-undo", "b6b4471, ricostruita", "M1+M3",
         [(LA, "# SENTINEL_S6268_COPPIA_UNDO", "rec_old,\n", "rec_new,\n")],
         "pytest", [T_CO], ["test_s546_undo_su_totale_vivo"]),
    # v07, canale Web Push, decisioni 9, 11 e 12. I pin girano su oggetti usa
    # e getta (tabelle TEMPORARY in test_v07_schema.py), mai sulle tabelle
    # condivise del DB di test. Ogni chiave nei due versi: senza UNIQUE passa
    # il doppio (M1, due invii); con la chiave piu larga cade il distinto (M2
    # sul canale, un promemoria soppresso).
    riga("v07-calendario-doppio", "v07, questa sessione", "M1",
         [(V7, "UNIQUE INDEX uq_push_cal_slot", "UNIQUE INDEX", "INDEX")],
         "pytest", [T_V7], ["test_calendario_una_voce_per_dose"]),
    riga("v07-calendario-largo", "v07, questa sessione", "M2",
         [(V7, "UNIQUE INDEX uq_push_cal_slot", "(utente_id, farmaco_id, data, dose_numero)",
           "(utente_id, farmaco_id, data)")],
         "pytest", [T_V7], ["test_calendario_una_voce_per_dose"]),
    riga("v07-dispatch-doppio", "v07, questa sessione", "M1",
         [(V7, "UNIQUE INDEX uq_push_dispatch_slot", "UNIQUE INDEX", "INDEX")],
         "pytest", [T_V7], ["test_dispatch_una_decisione_per_dose_e_telefono"]),
    riga("v07-dispatch-largo", "v07, questa sessione", "M2",
         [(V7, "UNIQUE INDEX uq_push_dispatch_slot",
           "(subscription_id, farmaco_id, data, dose_numero)", "(farmaco_id, data, dose_numero)")],
         "pytest", [T_V7], ["test_dispatch_una_decisione_per_dose_e_telefono"]),
    riga("v07-avviso-doppio", "v07, questa sessione", "M1",
         [(V7, "UNIQUE INDEX uq_push_avviso_fine", "UNIQUE INDEX", "INDEX")],
         "pytest", [T_V7], ["test_avviso_fine_uno_per_istante_e_telefono"]),
    riga("v07-avviso-largo", "v07, questa sessione", "M2",
         [(V7, "UNIQUE INDEX uq_push_avviso_fine", "(subscription_id, avviso_fine_ms)",
           "(subscription_id)")],
         "pytest", [T_V7], ["test_avviso_fine_uno_per_istante_e_telefono"]),
    riga("v07-endpoint-doppio", "v07, questa sessione", "M1",
         [(V7, "ADD UNIQUE INDEX uq_push_sub_endpoint_hash", "ADD UNIQUE INDEX", "ADD INDEX")],
         "pytest", [T_V7], ["test_subscription_un_endpoint_una_riga"]),
    riga("v07-endpoint-su-endpoint", "v07, questa sessione", "M2",
         [(V7, "ADD UNIQUE INDEX uq_push_sub_endpoint_hash", "(endpoint_hash)", "(endpoint)")],
         "pytest", [T_V7], ["test_subscription_un_endpoint_una_riga"]),
    # g21 interroga il Mini sui marcatori del livello che l inventario calcola.
    # Un file o una cartella letti in silenzio come vuoti abbassano il livello:
    # g21 verde su un Mini sotto il livello del codice, cioe il deploy che la
    # migrazione PRIMA deve impedire (sulla v06, ogni insert di presa fallita:
    # M2). Una riga per via, lettura e cammino: ciascuna lascia stretta l altra.
    riga("g21-lettura-in-silenzio", "g21, sonda del 2026-09-29", "M2",
         [(INV, "def leggi_intero(p):",
           'raise LivelloNonCalcolabile("file non leggibile: %s (%s)" % (p, exc)) from exc',
           'return ""')],
         "pytest", [T_G21],
         ["test_unreadable_migration_never_lowers_the_level",
          "test_unreadable_product_file_never_lowers_the_level",
          "test_non_utf8_product_file_never_lowers_the_level"]),
    riga("g21-cartella-saltata", "g21, sonda del 2026-09-29", "M2",
         [(INV, "def _codice_di_prodotto():", "onerror=_cartella_illeggibile", "onerror=None")],
         "pytest", [T_G21], ["test_unlistable_product_dir_never_lowers_the_level"]),
    # Il blocco dipendenze: il venv contro backend/requirements.lock. Un venv
    # che diverge dal lock sul Mini e un servizio che non e quello provato
    # sullo Studio; con il canale, il pianificatore che non parte e un canale
    # che tace (M2 sul canale). Una riga per via, versione e presenza.
    riga("dipendenze-versione-ignorata", "lock, 2026-09-29", "M2",
         [(DIP, "def confronta(lock, presenti):",
           "if n in presenti and presenti[n] != lock[n])", "if n in presenti and False)")],
         "pytest", [T_DIP], ["test_version_other_than_the_lock_is_red"]),
    riga("dipendenze-mancante-ignorata", "lock, 2026-09-29", "M2",
         [(DIP, "def confronta(lock, presenti):",
           "mancanti = sorted(n for n in lock if n not in presenti)", "mancanti = []")],
         "pytest", [T_DIP], ["test_entry_missing_from_the_venv_is_red"]),
    # Canale Web Push, ramo A, passo 1: la meta API. Decisioni 2, 8, 11, 12,
    # 15 e 16 dello STATO. "--" dove l invariante non e uno dei TRE MAI e la
    # riga lo dice.
    # L API non carica pywebpush ne aiohttp (indicazione di Roberto, misurata
    # il 2026-09-30): la chiave pubblica si legge con la sola cryptography.
    riga("push-api-carica-pywebpush", "canale, passo 1", "--",
         [(CAN, "def leggi_chiave_privata(",
           "from cryptography.hazmat.primitives import serialization",
           "from pywebpush import serialization")],
         "pytest", [T_CAN], ["test_api_non_carica_pywebpush_ne_aiohttp"]),
    # Un PEM assente resta assente (decisione 15): un lettore che crea il file,
    # come Vapid.from_file di py_vapid, darebbe al canale una chiave nuova senza
    # custodia e ucciderebbe in silenzio le subscription legate alla vera.
    riga("push-pem-creato", "canale, passo 1", "M2",
         [(CAN, "def leggi_chiave_privata(", 'with open(pem_file, "rb") as fh:',
           'with open(pem_file, "a+b") as fh:')],
         "pytest", [T_CAN], ["test_pem_assente_resta_assente"]),
    # Il sub: senza, il canale si dice spento; con un sub valido, acceso.
    riga("push-sub-ignorato", "canale, passo 1", "M2",
         [(CAN, "def stato_chiave(", "if not sub:", "if False:")],
         "pytest", [T_CAN], ["test_sub_assente_o_non_valido_spegne_ma_la_chiave_si_legge"]),
    riga("push-sub-sempre-assente", "canale, passo 1", "M2",
         [(CAN, "def stato_chiave(", "if not sub:", "if True:")],
         "pytest", [T_CAN], ["test_sub_assente_o_non_valido_spegne_ma_la_chiave_si_legge"]),
    # Impostazioni VAPID mai validate all avvio (decisione 15): un sub validato
    # dal modello fermerebbe l API, e con essa la consegna della coda.
    riga("push-config-validata", "canale, passo 1", "M2",
         [(CFG, "Web Push reminder channel, decision 15", "VAPID_SUB: str | None = None",
           'VAPID_SUB: str | None = __import__("pydantic").Field('
           'default=None, pattern="^(mailto:|https://)")')],
         "pytest", [T_CFG], ["test_settings_vapid_facoltative_mai_validate"]),
    # GET /api/push/chiave nei due versi: 503 senza PEM, 200 con.
    riga("push-chiave-sempre-spenta", "router push, passo 1", "M2",
         [(PU, "def chiave(", "if stato.chiave_pubblica is None:", "if True:")],
         "pytest", [T_PST], ["test_chiave_con_pem_valido"]),
    riga("push-chiave-mai-spenta", "router push, passo 1", "M2",
         [(PU, "def chiave(", "if stato.chiave_pubblica is None:", "if False:")],
         "pytest", [T_PST], ["test_chiave_senza_pem_503_e_nessun_file_creato"]),
    # Un telefono, una subscription attiva (v07): due sullo stesso telefono
    # porterebbero ogni dose due volte (M1). Nell altro verso, gli altri
    # telefoni e gli altri utenti tengono la loro (M2 sul loro canale).
    riga("push-iscrizione-doppia", "router push, passo 1", "M1",
         [(PU, "motivo_disattivazione = 'sostituita'",
           "AND attiva = TRUE AND endpoint_hash <> %s",
           "AND attiva = TRUE AND FALSE AND endpoint_hash <> %s")],
         "pytest", [T_PIS], ["test_iscrizione_nuova_sostituisce_la_vecchia_dello_stesso_telefono",
                             "test_iscrizione_non_tocca_altri_telefoni_ne_altri_utenti"]),
    riga("push-iscrizione-altri-telefoni", "router push, passo 1", "M2",
         [(PU, "motivo_disattivazione = 'sostituita'",
           "AND device_id = %s AND attiva = TRUE AND endpoint_hash <> %s",
           "AND (device_id = %s OR TRUE) AND attiva = TRUE AND endpoint_hash <> %s")],
         "pytest", [T_PIS], ["test_iscrizione_non_tocca_altri_telefoni_ne_altri_utenti"]),
    riga("push-iscrizione-altri-utenti", "router push, passo 1", "M2",
         [(PU, "motivo_disattivazione = 'sostituita'",
           "WHERE utente_id = %s AND device_id = %s AND attiva = TRUE AND endpoint_hash",
           "WHERE (utente_id = %s OR TRUE) AND device_id = %s AND attiva = TRUE AND endpoint_hash")],
         "pytest", [T_PIS], ["test_iscrizione_non_tocca_altri_telefoni_ne_altri_utenti"]),
    # La revoca (il toggle spento) nei due versi: spegne quel telefono, e solo
    # quello. Continuare a spingere dopo la revoca e consenso, non un MAI.
    riga("push-revoca-muta", "router push, passo 1", "--",
         [(PU, "motivo_disattivazione = 'revocata'",
           "WHERE utente_id = %s AND device_id = %s AND attiva = TRUE",
           "WHERE utente_id = %s AND device_id = %s AND attiva = TRUE AND FALSE")],
         "pytest", [T_PIS], ["test_revoca_spegne_solo_quel_telefono_dell_utente"]),
    riga("push-revoca-larga", "router push, passo 1", "M2",
         [(PU, "motivo_disattivazione = 'revocata'",
           "AND device_id = %s AND attiva = TRUE", "AND (device_id = %s OR TRUE) AND attiva = TRUE")],
         "pytest", [T_PIS], ["test_revoca_spegne_solo_quel_telefono_dell_utente"]),
    # La pubblicazione sostituisce il calendario intero (decisioni 8 e 12): una
    # voce che il telefono ha ritirato resterebbe al pianificatore (M1); le voci
    # nuove devono esserci tutte (M2); il calendario degli altri non si tocca.
    riga("push-calendario-resti", "router push, passo 1", "M1",
         [(PU, "def pubblica(", '"DELETE FROM push_calendario WHERE utente_id = %s"',
           '"DELETE FROM push_calendario WHERE utente_id = %s AND FALSE"')],
         "pytest", [T_PCA], ["test_pubblicazione_sostituisce_il_calendario_intero"]),
    riga("push-calendario-vuoto", "router push, passo 1", "M2",
         [(PU, "def pubblica(", "        if payload.voci:\n", "        if False:\n")],
         "pytest", [T_PCA], ["test_pubblicazione_sostituisce_il_calendario_intero"]),
    riga("push-calendario-altri-utenti", "router push, passo 1", "M2",
         [(PU, "def pubblica(", '"DELETE FROM push_calendario WHERE utente_id = %s"',
           '"DELETE FROM push_calendario WHERE (utente_id = %s OR TRUE)"')],
         "pytest", [T_PCA], ["test_pubblicazione_non_tocca_il_calendario_di_un_altro_utente"]),
    # Il farmaco di un altro utente rifiuta la pubblicazione intera; i propri
    # passano. L isolamento fra utenti non e uno dei TRE MAI.
    riga("push-calendario-estraneo", "router push, passo 1", "--",
         [(PU, "def pubblica(", "            if estranei:\n", "            if False:\n")],
         "pytest", [T_PCA],
         ["test_pubblicazione_di_un_farmaco_altrui_e_rifiutata_e_non_tocca_il_calendario"]),
    riga("push-calendario-proprio-rifiutato", "router push, passo 1", "M2",
         [(PU, "def pubblica(", "estranei = [f for f in farmaci if f not in propri]",
           "estranei = [f for f in farmaci if f in propri]")],
         "pytest", [T_PCA], ["test_pubblicazione_sostituisce_il_calendario_intero"]),
    # ora_ricalcolata di parete, senza fuso e al secondo intero: il
    # pianificatore la confronta col log per uguaglianza (decisione 11), e un
    # valore convertito o arrotondato sposterebbe l esito. Nei due versi.
    riga("push-ricalcolata-con-fuso", "modelli push, passo 1", "M1",
         [(MPU, "def _parete_al_secondo(", "if v.tzinfo is not None:", "if False:")],
         "pytest", [T_PCA], ["test_ora_ricalcolata_con_fuso_e_rifiutata"]),
    riga("push-ricalcolata-sempre-rifiutata", "modelli push, passo 1", "M2",
         [(MPU, "def _parete_al_secondo(", "if v.tzinfo is not None:", "if True:")],
         "pytest", [T_PCA], ["test_pubblicazione_sostituisce_il_calendario_intero"]),
    riga("push-ricalcolata-frazioni", "modelli push, passo 1", "M1",
         [(MPU, "def _parete_al_secondo(", "if v.microsecond != 0:", "if False:")],
         "pytest", [T_PCA], ["test_ora_ricalcolata_con_frazioni_di_secondo_e_rifiutata"]),
    # L avviso di fine orizzonte dopo la finestra dell ultima dose (condizione
    # della 12), al confine esatto nei due versi.
    riga("push-avviso-fine-presto", "modelli push, passo 1", "--",
         [(MPU, "def _coerenza(", "if self.avviso_fine_ms < ultimo + canale.TOLLERANZA_PUSH_MS:",
           "if self.avviso_fine_ms < ultimo:")],
         "pytest", [T_PCA], ["test_avviso_fine_dopo_la_finestra_dell_ultima_dose"]),
    riga("push-avviso-fine-al-limite", "modelli push, passo 1", "--",
         [(MPU, "def _coerenza(", "if self.avviso_fine_ms < ultimo + canale.TOLLERANZA_PUSH_MS:",
           "if self.avviso_fine_ms <= ultimo + canale.TOLLERANZA_PUSH_MS:")],
         "pytest", [T_PCA], ["test_avviso_fine_dopo_la_finestra_dell_ultima_dose"]),
    # L eta del battito sul solo orologio del server (condizione della 9): un
    # pianificatore fermo che sembrasse vivo e un canale muto che non lo dice.
    riga("push-stato-eta-nascosta", "router push, passo 1", "M2",
         [(PU, "def stato(", 'eta_ms=adesso - battito["ultima_passata_ms"],', "eta_ms=0,")],
         "pytest", [T_PST], ["test_stato_eta_sul_solo_orologio_del_server"]),
    # Canale Web Push, passo 2. created_at e l inizio dell attivazione
    # corrente per l utente corrente (Roberto, 2026-09-30): la passata non
    # scrive 'scaduto' per una finestra chiusa prima. Nei due versi: se non
    # ripartisse, il registro del canale direbbe non inviate dosi di un
    # periodo in cui il canale era spento (M3 sul registro del canale); se
    # ripartisse a ogni conferma, le scadute fra due aperture tacerebbero
    # (M2, I3).
    riga("push-attivazione-mai-riparte", "router push, passo 2", "M3",
         [(PU, "created_at = IF(push_subscriptions.attiva ",
           "push_subscriptions.created_at, CURRENT_TIMESTAMP)",
           "push_subscriptions.created_at, push_subscriptions.created_at)")],
         "pytest", [T_PIS], ["test_attivazione_riparte_dopo_una_riattivazione_o_un_cambio_di_utente"]),
    riga("push-attivazione-utente-ignorato", "router push, passo 2", "M3",
         [(PU, "created_at = IF(push_subscriptions.attiva ",
           "AND push_subscriptions.utente_id = nuova.utente_id, ", ", ")],
         "pytest", [T_PIS], ["test_attivazione_riparte_dopo_una_riattivazione_o_un_cambio_di_utente"]),
    riga("push-attivazione-sempre-riparte", "router push, passo 2", "M2",
         [(PU, "created_at = IF(push_subscriptions.attiva ",
           "push_subscriptions.created_at, CURRENT_TIMESTAMP)",
           "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")],
         "pytest", [T_PIS], ["test_attivazione_resta_alla_conferma_di_una_riga_attiva"]),
    # Condizione 2 di Roberto (2026-09-30): si ritenta solo su cio che
    # certifica il rifiuto, per lista bianca; il resto non certificato e
    # esito_ignoto e non riparte. Nei due versi: un ritentativo dopo una
    # POST forse accettata e un secondo avviso per la stessa dose (M1); un
    # rifiuto certificato non ritentato e un promemoria perso (M2).
    riga("invio-generica-ritentata", "trasporto, passo 2", "M1",
         [(TRA, "def esito_di_eccezione(", "if connessione_mai_stabilita(exc):", "if True:")],
         "pytest", [T_TRA, T_PIAN],
         ["test_connection_error_generica_e_esito_ignoto",
          "test_connection_error_generica_da_esito_ignoto_e_nessun_secondo_tentativo"]),
    riga("invio-mai-stabilita-ignota", "trasporto, passo 2", "M2",
         [(TRA, "def esito_di_eccezione(", "if connessione_mai_stabilita(exc):", "if False:")],
         "pytest", [T_TRA, T_PIAN],
         ["test_connessione_mai_stabilita_si_ritenta",
          "test_passata_ritenta_la_connessione_mai_stabilita"]),
    riga("invio-gateway-ritentato", "trasporto, passo 2", "M1",
         [(TRA, "RITENTABILI = frozenset(", "frozenset({408, 429, 503})",
           "frozenset({408, 429, 500, 502, 503, 504, 507})")],
         "pytest", [T_TRA], ["test_500_502_504_non_certificano_e_non_si_ritentano"]),
    riga("invio-503-non-ritentato", "trasporto, passo 2", "M2",
         [(TRA, "RITENTABILI = frozenset(", "frozenset({408, 429, 503})", "frozenset({408, 429})")],
         "pytest", [T_TRA], ["test_408_429_503_certificano_il_rifiuto_e_si_ritentano"]),
    # 'accettato' solo su 201 e 202 (RFC 8030): chiamare accettato cio che
    # non lo certifica e M3 sul registro del canale (decisione 2).
    riga("invio-200-accettato", "trasporto, passo 2", "M3",
         [(TRA, "ACCETTATI = frozenset(", "frozenset({201, 202})", "frozenset({200, 201, 202})")],
         "pytest", [T_TRA], ["test_200_204_e_3xx_non_certificano_nulla"]),
    riga("invio-201-non-accettato", "trasporto, passo 2", "M2",
         [(TRA, "ACCETTATI = frozenset(", "frozenset({201, 202})", "frozenset({202})")],
         "pytest", [T_TRA], ["test_201_e_202_sono_accettati"]),
    # Una POST senza timeout appesa ferma la passata, e launchd salta gli
    # intervalli finche gira: canale muto (M2).
    riga("invio-timeout-assente", "trasporto, passo 2", "M2",
         [(TRA, "def post(self, url, **kwargs):",
           'kwargs["timeout"] = (TIMEOUT_CONNESSIONE_S, TIMEOUT_LETTURA_S)', 'kwargs["timeout"] = None')],
         "pytest", [T_TRA], ["test_la_post_porta_timeout_diviso_niente_redirect_ttl_urgency_e_niente_topic"]),
    # 404 e 410: la subscription e morta e si spegne, cosi le Impostazioni
    # non mostrano attivo un canale che non consegna (M2).
    riga("invio-410-non-spegne", "trasporto, passo 2", "M2",
         [(TRA, "SPENGONO = frozenset(", "frozenset({404, 410})", "frozenset()")],
         "pytest", [T_TRA], ["test_4xx_sono_rifiuti_definitivi_e_404_410_spengono"]),
    # Una richiesta mai partita e un rifiuto certificato: registrarla come
    # esito ignoto direbbe forse consegnata una notifica mai spedita (M3 sul
    # registro del canale).
    riga("invio-non-partita-ignota", "trasporto, passo 2", "M3",
         [(TRA, "def esito_di_eccezione(", "if not partita:", "if False:")],
         "pytest", [T_TRA], ["test_richiesta_mai_partita_e_un_rifiuto_non_un_esito_ignoto"]),
    # La firma di prova con la libreria: senza, un sub che py_vapid rifiuta
    # darebbe un canale acceso a vuoto, ogni POST respinta (M2).
    riga("firma-senza-prova", "trasporto, passo 2", "M2",
         [(TRA, "def prepara_firma(", 'vapid.sign({"sub": sub, "aud": "https://pharmatimer.invalid"})',
           "vapid")],
         "pytest", [T_TRA], ["test_prepara_firma_usa_la_regola_del_sub_della_libreria"]),
    # La passata (decisioni 8, 9, 11, 12, 15, 16 e 22; D2 A; condizione 1).
    # La finestra della 16: mai prima dell ora (M1); una dose dovuta parte (M2).
    riga("passata-prima-dell-ora", "passata, passo 2", "M1",
         [(PIAN, "_DOSI_DOVUTE = (", "WHERE c.istante_ms <= %(adesso)s",
           "WHERE c.istante_ms <= %(adesso)s + 60000")],
         "pytest", [T_PIAN], ["test_voce_futura_non_parte"]),
    riga("passata-sempre-muta", "passata, passo 2", "M2",
         [(PIAN, "_DOSI_DOVUTE = (", "WHERE c.istante_ms <= %(adesso)s",
           "WHERE c.istante_ms <= %(adesso)s - 86400000")],
         "pytest", [T_PIAN], ["test_voce_dovuta_parte_con_ttl_del_resto_della_finestra"]),
    # Il TTL e il resto della finestra, calcolato all invio: un TTL pieno, o
    # misurato all inizio della passata, lascerebbe arrivare un promemoria
    # oltre l ora piu venti minuti (M1).
    riga("passata-ttl-fisso", "passata, passo 2", "M1",
         [(PIAN, "def decidi_dose(", "ttl_s = (fine_ms - ora_ms) // 1000",
           "ttl_s = canale.TOLLERANZA_PUSH_MS // 1000")],
         "pytest", [T_PIAN], ["test_voce_dovuta_parte_con_ttl_del_resto_della_finestra"]),
    riga("passata-ttl-dall-inizio", "passata, passo 2", "M1",
         [(PIAN, "def passata(", "conteggi[_tenta_dose(conn, cur, voce, firma, invia, orologio)] += 1",
           "conteggi[_tenta_dose(conn, cur, voce, firma, invia, lambda: adesso)] += 1")],
         "pytest", [T_PIAN], ["test_ttl_calcolato_all_invio"]),
    riga("passata-oltre-la-finestra", "passata, passo 2", "M1",
         [(PIAN, "def decidi_dose(", "if ttl_s <= 0:", "if False:")],
         "pytest", [T_PIAN], ["test_finestra_al_confine"]),
    riga("passata-finestra-sempre-chiusa", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "if ttl_s <= 0:", "if True:")],
         "pytest", [T_PIAN], ["test_voce_dovuta_parte_con_ttl_del_resto_della_finestra"]),
    # La rilettura del log (8), nei due versi del rapporto :916-919.
    riga("passata-log-ignorato", "passata, passo 2", "M1",
         [(PIAN, "def decidi_dose(", "if letto_stato in STATI_CHIUSI:", "if False:")],
         "pytest", [T_PIAN], ["test_log_chiuso_non_invia[presa]", "test_log_chiuso_non_invia[saltata]",
                              "test_log_chiuso_non_invia[sospesa]"]),
    riga("passata-log-sempre-chiuso", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "if letto_stato in STATI_CHIUSI:", "if True:")],
         "pytest", [T_PIAN], ["test_senza_riga_o_prevista_invia[None]",
                              "test_senza_riga_o_prevista_invia[prevista]"]),
    # L uguaglianza della 11, vuote comprese: quella di SQL darebbe un avviso
    # neutro dove spetta il push di dose (M2); ignorarla darebbe il push di
    # dose dove il log smentisce la pubblicazione (M1); e il pin 1 della 22.
    riga("passata-uguaglianza-sql", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "uguale = letto_ora == pubblicata_ora",
           "uguale = letto_ora is not None and letto_ora == pubblicata_ora")],
         "pytest", [T_PIAN], ["test_senza_riga_o_prevista_invia[None]",
                              "test_senza_riga_o_prevista_invia[prevista]"]),
    riga("passata-divergenza-ignorata", "passata, passo 2", "M1",
         [(PIAN, "def decidi_dose(", "uguale = letto_ora == pubblicata_ora", "uguale = True")],
         "pytest", [T_PIAN], ["test_ricalcolata_non_pubblicata_da_avviso_neutro",
                              "test_ricalcolata_diversa_da_avviso_neutro"]),
    riga("passata-sempre-neutro", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "uguale = letto_ora == pubblicata_ora", "uguale = False")],
         "pytest", [T_PIAN], ["test_ricalcolata_uguale_da_push_di_dose"]),
    # L avviso neutro della 11 non porta farmaco ne ora.
    riga("passata-neutro-con-farmaco", "passata, passo 2", "M1",
         [(PIAN, "def _tenta_dose(", "dati = canale.payload_avviso_neutro()",
           'dati = canale.payload_dose(voce["titolo"], voce["corpo"], voce["istante_ms"], '
           'voce["farmaco_id"], voce["data"], voce["dose_numero"])')],
         "pytest", [T_PIAN], ["test_ricalcolata_non_pubblicata_da_avviso_neutro"]),
    # D2 A: farmaco e utente riletti a ogni tentativo. Un farmaco sospeso che
    # suona col suo nome e l errore clinico di Spec 14.4.3 (M1).
    riga("passata-farmaco-non-attivo", "passata, passo 2", "M1",
         [(PIAN, "def decidi_dose(", "if not farmaco_attivo:", "if False:")],
         "pytest", [T_PIAN], ["test_farmaco_non_attivo_non_invia"]),
    riga("passata-utente-non-attivo", "passata, passo 2", "M1",
         [(PIAN, "def decidi_dose(", "if not utente_attivo:", "if False:")],
         "pytest", [T_PIAN], ["test_utente_non_attivo_non_invia"]),
    riga("passata-d2-sempre-spento", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "if not farmaco_attivo:", "if True:")],
         "pytest", [T_PIAN], ["test_voce_dovuta_parte_con_ttl_del_resto_della_finestra"]),
    # Al piu una volta per dose e telefono (v07). La scrittura condizionata del
    # ritentativo si isola chiamando il tentativo su una riga letta da
    # ritentare e poi accettata. La selezione dei soli non decisi e sorretta
    # da quella scrittura: mutata da sola non morde, per costruzione, e la
    # riga che segue muta le due insieme -- intercetta, non isola.
    riga("passata-ritentativo-non-condizionato", "passata, passo 2", "M1",
         [(PIAN, "def _scrivi_dose(", "WHERE d.id = %s AND d.stato = 'da_ritentare' ", "WHERE d.id = %s ")],
         "pytest", [T_PIAN], ["test_riga_non_piu_da_ritentare_non_riparte"]),
    riga("passata-doppio-invio", "passata, passo 2", "M1",
         [(PIAN, "_DOSI_DOVUTE = (", "AND (d.id IS NULL OR d.stato = 'da_ritentare') ", "AND TRUE "),
          (PIAN, "def _scrivi_dose(", "WHERE d.id = %s AND d.stato = 'da_ritentare' ", "WHERE d.id = %s ")],
         "pytest", [T_PIAN], ["test_due_passate_un_solo_invio", "test_decisione_gia_presa_non_riparte"]),
    # Condizione 1: ogni tentativo rifa i controlli al fuoco. Nei due versi:
    # un ritentativo che non rilegge il log parte dopo una presa (M1); una
    # riga da ritentare che non riparte mai perde il promemoria (M2).
    riga("passata-ritentativo-senza-controlli", "passata, passo 2", "M1",
         [(PIAN, "def _tenta_dose(", "letto_stato, letto_ora = _rileggi_log(cur, voce)",
           'letto_stato, letto_ora = _rileggi_log(cur, voce) if voce["riga_id"] is None else (None, None)')],
         "pytest", [T_PIAN], ["test_ritentativo_rifa_i_controlli_e_non_parte_dopo_una_presa"]),
    riga("passata-mai-ritentato", "passata, passo 2", "M2",
         [(PIAN, "_DOSI_DOVUTE = (", "AND (d.id IS NULL OR d.stato = 'da_ritentare') ",
           "AND (d.id IS NULL OR FALSE) ")],
         "pytest", [T_PIAN], ["test_ritentativo_senza_presa_parte",
                              "test_passata_ritenta_la_connessione_mai_stabilita"]),
    # La voce ancora quella letta: una ripubblicazione fra lettura e decisione
    # non fa partire la voce vecchia (M1).
    riga("passata-voce-cambiata", "passata, passo 2", "M1",
         [(PIAN, "def _scrivi_dose(", "AND c.istante_ms = %s AND c.ora_ricalcolata <=> %s",
           "AND (c.istante_ms = %s OR TRUE) AND (c.ora_ricalcolata <=> %s OR TRUE)")],
         "pytest", [T_PIAN], ["test_voce_cambiata_fra_lettura_e_decisione_non_parte"]),
    # Il confine dell attivazione corrente (Roberto, 2026-09-30), nei due
    # versi: nessuno 'scaduto' prima (M3 sul registro del canale), e lo
    # 'scaduto' dopo (M2, I3).
    riga("passata-scaduto-prima-dell-attivazione", "passata, passo 2", "M3",
         [(PIAN, "_DOSI_DOVUTE = (",
           "AND c.istante_ms + %(tolleranza)s > UNIX_TIMESTAMP(s.created_at) * 1000 ", "AND TRUE ")],
         "pytest", [T_PIAN], ["test_finestra_chiusa_prima_dell_attivazione_non_da_scaduto"]),
    riga("passata-scaduto-taciuto", "passata, passo 2", "M2",
         [(PIAN, "_DOSI_DOVUTE = (",
           "AND c.istante_ms + %(tolleranza)s > UNIX_TIMESTAMP(s.created_at) * 1000 ",
           "AND c.istante_ms + %(tolleranza)s > UNIX_TIMESTAMP(s.created_at) * 1000 + 86400000 ")],
         "pytest", [T_PIAN], ["test_finestra_chiusa_dopo_l_attivazione_da_scaduto"]),
    # Senza chiave (15): nessuna POST, e la riga resta da ritentare dentro la
    # finestra; una riga definitiva perderebbe il promemoria alla chiave
    # tornata (M2).
    riga("passata-senza-chiave-invia", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "if not firma_pronta:", "if False:")],
         "pytest", [T_PIAN], ["test_chiave_assente_ritenta_dentro_la_finestra"]),
    riga("passata-chiave-assente-definitiva", "passata, passo 2", "M2",
         [(PIAN, "def decidi_dose(", "return Decisione(invio.DA_RITENTARE, CHIAVE_ASSENTE, forma, None)",
           "return Decisione(NON_INVIATO, CHIAVE_ASSENTE, forma, None)")],
         "pytest", [T_PIAN], ["test_chiave_assente_ritenta_dentro_la_finestra"]),
    riga("passata-morta-non-spenta", "passata, passo 2", "M2",
         [(PIAN, "def _tenta_dose(", "if esito.iscrizione_morta:", "if False:")],
         "pytest", [T_PIAN], ["test_iscrizione_morta_si_spegne"]),
    # L avviso di fine orizzonte (12): la sua finestra e il suo TTL.
    riga("passata-avviso-prima", "passata, passo 2", "--",
         [(PIAN, "_AVVISI_DOVUTI = (", "WHERE p.avviso_fine_ms <= %(adesso)s",
           "WHERE p.avviso_fine_ms <= %(adesso)s + 60000")],
         "pytest", [T_PIAN], ["test_avviso_fine_non_parte_prima"]),
    riga("passata-avviso-ttl-fisso", "passata, passo 2", "--",
         [(PIAN, "def decidi_avviso(", "ttl_s = (entro_ms - ora_ms) // 1000", "ttl_s = 20 * 60")],
         "pytest", [T_PIAN], ["test_avviso_fine_parte_nella_sua_finestra"]),
    riga("passata-avviso-oltre-entro", "passata, passo 2", "--",
         [(PIAN, "def decidi_avviso(", "if ttl_s <= 0:", "if False:")],
         "pytest", [T_PIAN], ["test_avviso_fine_oltre_entro_scade"]),
    riga("passata-avviso-utente-non-attivo", "passata, passo 2", "--",
         [(PIAN, "def decidi_avviso(", "if not utente_attivo:", "if False:")],
         "pytest", [T_PIAN], ["test_avviso_fine_utente_non_attivo"]),
    # Nessun silenzio (I3): cio che non si puo piu tentare si chiude col suo
    # motivo, e un in_invio orfano si dice esito_ignoto.
    riga("passata-avviso-superato-sospeso", "passata, passo 2", "--",
         [(PIAN, "def _chiudi_sospesi(", "WHERE a.stato = 'da_ritentare' AND p.utente_id IS NULL",
           "WHERE a.stato = 'da_ritentare' AND p.utente_id IS NULL AND FALSE")],
         "pytest", [T_PIAN], ["test_avviso_fine_superato_da_una_pubblicazione_piu_recente"]),
    riga("passata-spenta-sospesa", "passata, passo 2", "--",
         [(PIAN, "def _chiudi_sospesi(", "WHERE d.stato = 'da_ritentare' AND (s.attiva = FALSE OR",
           "WHERE d.stato = 'da_ritentare' AND FALSE AND (s.attiva = FALSE OR")],
         "pytest", [T_PIAN], ["test_ritentativo_su_iscrizione_spenta_si_chiude"]),
    riga("passata-orfano-muto", "passata, passo 2", "--",
         [(PIAN, "def _chiudi_sospesi(", "WHERE stato = 'in_invio' AND inviato_ms IS NULL AND deciso_ms < %s",
           "WHERE stato = 'in_invio' AND inviato_ms IS NULL AND deciso_ms < %s AND FALSE")],
         "pytest", [T_PIAN], ["test_in_invio_orfano_diventa_esito_ignoto_e_non_riparte"]),
    # I2: la passata non scrive il log. Il ramo scartato "materializzare le
    # previste" dentro la rilettura deve arrossare (M3).
    riga("passata-scrive-il-log", "passata, passo 2", "M3",
         [(PIAN, "def _rileggi_log(", "    riga = cur.fetchone()\n", MATERIALIZZA_PREVISTA)],
         "pytest", [T_PIAN], ["test_la_passata_non_scrive_il_log"]),
    # Il battito (9 e 15): scritto a ogni passata, col motivo della chiave, e
    # con l errore quando la passata cade. Un battito muto o sempre "ok" e un
    # canale fermo che non lo dice (M2).
    riga("passata-battito-assente", "passata, passo 2", "M2",
         [(PIAN, "def passata(", "_scrivi_battito(cur, orologio(), OK, _riassunto(conteggi))", "None")],
         "pytest", [T_PIAN], ["test_battito_a_ogni_passata"]),
    riga("passata-battito-sempre-ok", "passata, passo 2", "M2",
         [(PIAN, "def passata(", "_scrivi_battito(cur, orologio(), CHIAVE_ASSENTE, firma.motivo)",
           "_scrivi_battito(cur, orologio(), OK, None)")],
         "pytest", [T_PIAN], ["test_battito_a_ogni_passata", "test_chiave_assente_ritenta_dentro_la_finestra"]),
    riga("passata-errore-taciuto", "passata, passo 2", "M2",
         [(PIAN, "def main(", 'ERRORE, f"{type(exc).__name__}: {exc}"[:255])', "OK, None)")],
         "pytest", [T_PIAN], ["test_main_dice_l_errore_nel_battito"]),
    # Il worker del push (client, passo 1; decisioni 2, 14 e 31). Ogni push
    # mostra una notifica, nei due versi: la sua se leggibile, la neutra se no.
    riga("worker-illeggibile-muto", "client, passo 1", "M2",
         [(SW, "async function mostra(", "      notifica = notificaNeutra();\n", "      return;\n")],
         "vitest", [T_SW], ["un push illeggibile (senza dati) mostra il testo neutro, mai zero"]),
    riga("worker-sempre-neutro", "client, passo 1", "--",
         [(SW, "async function mostra(", "notifica = await componi(dati);", "notifica = null;")],
         "vitest", [T_SW],
         ["un push di dose leggibile mostra titolo e corpo pubblicati, col tag della dose"]),
    # Il taccuino all arrivo (31), nei due versi: una dose chiusa sul telefono
    # lo dice e la notifica parte (M1 se non si legge, M2 se si sopprime); una
    # dose aperta, di un altra dose o ambigua non si dice chiusa (M3 sul
    # promemoria).
    riga("worker-taccuino-mai-letto", "client, passo 1", "M1",
         [(SW, "async function componi(", "riga = await rigaNelTaccuino(messaggio.dose);", "riga = null;")],
         "vitest", [T_SW], ["dose presa nel taccuino: il corpo lo dice, e la notifica parte"]),
    riga("worker-chiusa-soppressa", "client, passo 1", "M2",
         [(SW, "async function mostra(",
           "    return self.registration.showNotification(notifica.titolo, notifica.opzioni);\n",
           "    if (/ come (presa|saltata|sospesa)/.test(notifica.opzioni.body)) return;\n"
           "    return self.registration.showNotification(notifica.titolo, notifica.opzioni);\n")],
         "vitest", [T_SW], ["dose presa nel taccuino: il corpo lo dice, e la notifica parte"]),
    riga("worker-sempre-riscritto", "client, passo 1", "M3",
         [(SW, "function statoChiuso(",
           "return Object.prototype.hasOwnProperty.call(CHIUSE, riga.stato) ? riga.stato : null;",
           'return "presa";')],
         "vitest", [T_SW], ["dose prevista nel taccuino: resta il testo pubblicato"]),
    riga("worker-altra-dose", "client, passo 1", "M3",
         [(SW, "function rigaNelTaccuino(", "r.dose_numero === dose.dose_numero", "true")],
         "vitest", [T_SW], ["la riga di un'altra dose non conta: resta il testo pubblicato"]),
    riga("worker-righe-ambigue", "client, passo 1", "M3",
         [(SW, "function rigaNelTaccuino(", "fine(righe.length === 1 ? righe[0] : null);",
           "fine(righe.length >= 1 ? righe[0] : null);")],
         "vitest", [T_SW], ["due righe per la stessa dose: nulla si afferma, resta il testo pubblicato"]),
    riga("worker-frase-minuscola", "client, passo 1", "--",
         [(SW, "function corpoRiscritto(", "return frase.charAt(0).toUpperCase() + frase.slice(1);",
           "return frase;")],
         "vitest", [T_SW], ["senza istante nel payload il corpo riscritto comincia dalla frase"]),
    # Il taccuino si legge e non si scrive (I2); non si crea e non resta aperto,
    # perche l app possa sempre aprirlo e aggiornarlo (M2); la lettura ha un
    # tempo massimo, perche un push che aspetta non mostri nulla (M2). La riga
    # che scrive muta due cose insieme: intercetta, non isola.
    riga("worker-scrive-il-taccuino", "client, passo 1", "M3",
         [(SW, "function rigaNelTaccuino(", '.transaction(TABELLA, "readonly")',
           '.transaction(TABELLA, "readwrite")'),
          (SW, "function rigaNelTaccuino(", "const lettura = archivio.index(INDICE).getAll(",
           "archivio.clear();\n          const lettura = archivio.index(INDICE).getAll(")],
         "vitest", [T_SW], ["il worker non scrive nel taccuino"]),
    riga("worker-crea-il-db", "client, passo 1", "M2",
         [(SW, "richiesta.onupgradeneeded = function () {", "richiesta.transaction.abort();", "void 0;")],
         "vitest", [T_SW], ["database assente: resta il testo pubblicato, e il worker non lo crea"]),
    riga("worker-blocca-schema", "client, passo 1", "M2",
         [(SW, "function chiudiConnessione() {", "connessione.close();", "void connessione;")],
         "vitest", [T_SW],
         ["il worker chiude il database: un aggiornamento dello schema non resta bloccato"]),
    riga("worker-senza-tempo-massimo", "client, passo 1", "M2",
         [(SW, "function rigaNelTaccuino(",
           "timer = setTimeout(function () { fine(null); }, ATTESA_TACCUINO_MS);", "timer = null;")],
         "vitest", [T_SW], ["una lettura che non risponde: allo scadere resta il testo pubblicato"]),
    # Il tocco (14): Oggi sotto lo scope, mai /oggi assoluto; una finestra
    # aperta viene avanti e basta.
    riga("worker-click-assoluto", "client, passo 1", "--",
         [(SW, "function urlOggi(", 'new URL("oggi", self.registration.scope)',
           'new URL("/oggi", self.registration.scope)')],
         "vitest", [T_SW],
         ["senza finestre aperte apre Oggi sotto lo scope del worker, non /oggi assoluto"]),
    riga("worker-tocco-doppio", "client, passo 1", "--",
         [(SW, "async function portaInPrimoPiano(", "        await finestra.focus();\n        return;\n",
           "        await finestra.focus();\n")],
         "vitest", [T_SW],
         ["con una finestra aperta la porta in primo piano, senza navigarla ne aprirne un'altra"]),
    # La domanda della pagina prima dell iscrizione, nei due versi.
    riga("worker-risposta-muta", "client, passo 1", "--",
         [(SW, 'self.addEventListener("message",',
           "porta.postMessage({ tipo: DOMANDA_PRONTO, versione: VERSIONE_PROTOCOLLO });", "void porta;")],
         "vitest", [T_SW], ["risponde sulla porta che riceve, con la versione del protocollo"]),
    riga("worker-risponde-a-tutto", "client, passo 1", "--",
         [(SW, 'self.addEventListener("message",', " || dati.tipo !== DOMANDA_PRONTO) return;", ") return;")],
         "vitest", [T_SW], ["non risponde ad altri messaggi"]),
    # Le copie che il test tiene: il testo neutro (27), il tag dei timer di
    # pagina, e la riga di vite.config.js che carica il worker (14). Senza la
    # riga il worker non c e, e un push non mostra nulla (M2).
    riga("worker-testo-neutro-divergente", "client, passo 1", "--",
         [(SW, "const TITOLO_NEUTRO", "Apri l'app per controllare i promemoria.", "Apri l'app.")],
         "vitest", [T_SW],
         ["il testo di un push illeggibile e quello dell'avviso neutro del server (decisione 27)"]),
    riga("worker-tag-divergente", "client, passo 1", "--",
         [(SW, "function tagDose(", '"dose-" + dose.farmaco_id + "-" + dose.dose_numero + "-" + dose.data',
           '"dose-" + dose.farmaco_id + "-" + dose.data + "-" + dose.dose_numero')],
         "vitest", [T_SW], ["il tag di una dose e quello dei timer di pagina (services/notifications.js)"]),
    riga("worker-non-incluso", "client, passo 1", "M2",
         [("vite.config.js", "workbox: {", 'importScripts: ["sw-push.js"],', "")],
         "vitest", [T_SW], ["vite.config.js carica il worker con una riga (decisione 14)"]),
    # Client del canale, passo 2: iscrizione e rinnovo. Ci si iscrive, o si
    # conferma, solo se il worker attivo risponde: un worker che non mostra i
    # push fa estinguere la subscription a iOS (S11). Nei due versi: un
    # canale che non si accende mai e anch esso M2.
    riga("canale-iscrive-senza-worker", "client, passo 2", "M2",
         [(CPU, "async function leggiPreparazione() {",
           "if (!(await chiediAlWorker(registrazione, attesaWorkerMs))) {", "if (false) {")],
         "vitest", [T_CPU],
         ["worker muto: nessuna iscrizione nel tocco", "worker muto: nessuna iscrizione e nessun PUT",
          "worker muto con una subscription gia presente: non la conferma"]),
    riga("canale-worker-mai-pronto", "client, passo 2", "M2",
         [(CPU, "export function chiediAlWorker(",
           "&& dati.tipo === DOMANDA_PRONTO && dati.versione === VERSIONE_PROTOCOLLO", "&& false")],
         "vitest", [T_CPU],
         ["il worker vero risponde alla domanda: pronto",
          "toggle acceso e nessuna subscription: nuova iscrizione, poi il PUT"]),
    # Senza chiave nessuna iscrizione (15): una subscription su una chiave
    # inventata sarebbe confermata e non riceverebbe nulla. Nei due versi.
    riga("canale-senza-chiave-iscrive", "client, passo 2", "M2",
         [(CPU, "async function leggiPreparazione() {",
           "return { registrazione, motivo: M.CHIAVE, dettaglio: dettaglioDi(errore) };",
           "testo = 'B' + 'A'.repeat(86);")],
         "vitest", [T_CPU],
         ["senza chiave nessuna iscrizione nel tocco", "senza chiave: nessuna iscrizione, e lo stato lo dice"]),
    riga("canale-chiave-mai-letta", "client, passo 2", "M2",
         [(CPU, "async function leggiPreparazione() {", "testo = await rete.leggiChiave();",
           "testo = await Promise.reject(new Error('mutazione'));")],
         "vitest", [T_CPU],
         ["toggle acceso e nessuna subscription: nuova iscrizione, poi il PUT",
          "dopo il tocco il PUT conferma la subscription, con il device_id"]),
    # La chiave della subscription: un altra chiave si rifa (una subscription
    # legata alla vecchia sarebbe confermata e muta), la stessa no.
    riga("canale-chiave-diversa-tenuta", "client, passo 2", "M2",
         [(CPU, "export function stessaChiave(", "if (legata[i] !== chiave[i]) return false;",
           "if (legata[i] !== chiave[i]) return true;")],
         "vitest", [T_CPU],
         ["subscription legata a un altra chiave: si disfa e se ne fa una nuova, poi il PUT"]),
    riga("canale-stessa-chiave-rifatta", "client, passo 2", "--",
         [(CPU, "async function eseguiRinnovo(voluto) {",
           "if (iscrizione && stessaChiave(iscrizione, p.chiave) === false) {", "if (iscrizione) {")],
         "vitest", [T_CPU],
         ["subscription legata alla stessa chiave: solo il PUT che la conferma",
          "subscription che non dice la sua chiave: si tiene e si conferma"]),
    # Toggle spento o permesso revocato: unsubscribe e DELETE. Nei due versi:
    # un rinnovo a toggle acceso non disfa la subscription.
    riga("canale-spento-resta-iscritto", "client, passo 2", "--",
         [(CPU, "async function annulla(iscrizione) {", "await iscrizione.unsubscribe();", "void iscrizione;")],
         "vitest", [T_CPU],
         ["toggle spento con una subscription sul telefono: unsubscribe e DELETE", "unsubscribe e DELETE",
          "permesso revocato con una subscription sul telefono: unsubscribe e DELETE, e il motivo"]),
    riga("canale-spento-senza-delete", "client, passo 2", "--",
         [(CPU, "async function annulla(iscrizione) {", "await rete.revocaIscrizione(id);", "void id;")],
         "vitest", [T_CPU],
         ["toggle spento con una subscription sul telefono: unsubscribe e DELETE", "unsubscribe e DELETE",
          "il DELETE anche senza subscription sul telefono: il server puo averne una attiva"]),
    riga("canale-permesso-ignorato", "client, passo 2", "--",
         [(CPU, "async function eseguiRinnovo(voluto) {",
           "if (!voluto || piattaforma.permesso() !== 'granted') {", "if (!voluto) {")],
         "vitest", [T_CPU],
         ["permesso revocato con una subscription sul telefono: unsubscribe e DELETE, e il motivo"]),
    riga("canale-acceso-disfatto", "client, passo 2", "M2",
         [(CPU, "async function eseguiRinnovo(voluto) {",
           "if (!voluto || piattaforma.permesso() !== 'granted') {", "if (true) {")],
         "vitest", [T_CPU],
         ["subscription legata alla stessa chiave: solo il PUT che la conferma",
          "toggle acceso e nessuna subscription: nuova iscrizione, poi il PUT"]),
    # Modalita locale: il canale non esiste, nessuna chiamata a /api/push.
    riga("canale-modalita-locale", "client, passo 2", "--",
         [(CPU, "function rinnova({ voluto } = {}) {",
           "if (!inModalitaApi()) return Promise.resolve(null);", "void inModalitaApi;")],
         "vitest", [T_CPU], ["nessuna chiamata a /api/push e nessuna iscrizione"]),
    # Un rinnovo alla volta: due richieste uguali in attesa sono una sola,
    # una diversa gira dopo. Nei due versi.
    riga("canale-rinnovo-doppio", "client, passo 2", "--",
         [(CPU, "function rinnova({ voluto } = {}) {",
           "if (rinnovoInAttesa !== null && rinnovoInAttesa.valore === valore) return rinnovoInAttesa.turno;",
           "void rinnovoInAttesa;")],
         "vitest", [T_CPU], ["due richieste uguali mentre una aspetta: un solo rinnovo"]),
    riga("canale-rinnovo-fuso-sempre", "client, passo 2", "--",
         [(CPU, "function rinnova({ voluto } = {}) {",
           "if (rinnovoInAttesa !== null && rinnovoInAttesa.valore === valore) return rinnovoInAttesa.turno;",
           "if (rinnovoInAttesa !== null) return rinnovoInAttesa.turno;")],
         "vitest", [T_CPU], ["una richiesta diversa non si fonde: gira dopo, nell ordine"]),
    # Ratifica A del 2026-10-01: subscribe() e il primo atto del tocco, la via
    # che S1 ha misurato. Nel servizio e nell hook.
    riga("canale-gesto-attende", "client, passo 2", "--",
         [(CPU, "function iscriviNelGesto() {", SUBSCRIBE_NEL_GESTO, SUBSCRIBE_DOPO_ATTESA)],
         "vitest", [T_CPU],
         ["a preparazione completa subscribe() parte dentro la chiamata, prima di ogni attesa"]),
    riga("toggle-gesto-attende", "client, passo 2", "--",
         [(UNO, "const requestEnable = useCallback(async () => {",
           "    const gesto = typeof canale?.iscriviNelGesto",
           "    await Promise.resolve();\n    const gesto = typeof canale?.iscriviNelGesto")],
         "vitest", [T_UNO],
         ["subscribe e il primo atto del tocco: prima di ogni attesa, e senza requestPermission"]),
    riga("toggle-senza-preparazione", "client, passo 2", "--",
         [(UNO, "// The channel gets ready before any tap needs it.", "      canale?.prepara?.();",
           "      void canale;")],
         "vitest", [T_UNO], ["all ingresso nella sezione il canale si prepara"]),
    riga("toggle-spento-resta-iscritto", "client, passo 2", "--",
         [(UNO, "const disable = useCallback(async () => {", "    await actions.spegniCanale?.();",
           "    void actions;")],
         "vitest", [T_UNO], ["toggle spento: anche il canale si spegne"]),
    riga("revoca-resta-iscritta", "client, passo 2", "--",
         [(UNO, "function checkRevocation() {", "        actions.spegniCanale?.();", "        void actions;")],
         "vitest", [T_UNO], ["permesso revocato: anche il canale si spegne"]),
    # Il cablaggio: rinnovo a ogni rientro e all apertura; l apertura non
    # aspetta il canale e il canale non la rompe mai (15): M2.
    riga("canale-rinnovo-al-rientro", "client, passo 2", "--",
         [(ACX, "const onForegroundEvent = () => {", "        actions.rinnovaCanale();", "        void actions;")],
         "vitest", [T_ACX], ["visibilitychange chiede un rinnovo, col valore del toggle"]),
    riga("canale-rinnovo-all-avvio", "client, passo 2", "--",
         [(ACT, "// Client of the reminder channel, step 2: the renewal at the opening.",
           "void rinnovaCanale({ voluto: impostazioni.notifiche_attive === 1 });", "void impostazioni;")],
         "vitest", [T_ACAN], ["dopo INIT_SUCCESS, col valore del toggle appena caricato"]),
    riga("canale-avvio-senza-guardia", "client, passo 2", "M2",
         [(ACT, "// Client of the reminder channel, step 2: the renewal at the opening.",
           "void rinnovaCanale({ voluto: impostazioni.notifiche_attive === 1 });",
           "await services.canale.rinnova({ voluto: impostazioni.notifiche_attive === 1 });")],
         "vitest", [T_ACAN], ["un canale che rifiuta o lancia non rompe l apertura: nessun INIT_ERROR"]),
    # L id del telefono: uno che non resta scritto non si usa.
    riga("canale-device-id-instabile", "client, passo 2", "--",
         [(RCAN, "export function deviceId() {", "return leggiDeviceId() === nuovo ? nuovo : null;",
           "return nuovo;")],
         "vitest", [T_RCAN], ["uno storage che non tiene la scrittura non da alcun id"]),
    # Decisione 10 A: il tocco di un timer di pagina porta avanti la finestra e
    # non la naviga. Nei due versi.
    riga("timer-tocco-naviga", "client, passo 2", "--",
         [(NOTI, "notif.onclick = () => {", "try { window.focus(); } catch { /* noop */ }",
           "try { window.focus(); } catch { /* noop */ }\n"
           "          try { window.location.href = '/oggi'; } catch { /* noop */ }")],
         "vitest", [T_TOC], ["non naviga la finestra: puo avere un modulo non salvato"]),
    riga("timer-tocco-senza-focus", "client, passo 2", "--",
         [(NOTI, "notif.onclick = () => {", "try { window.focus(); } catch { /* noop */ }", "void 0;")],
         "vitest", [T_TOC], ["porta avanti la finestra"]),
    # Ratifica A del 2026-10-01: i timer di pagina si riarmano sullo stato
    # applicato (effetto di AppContext). Le sedi di maybeReschedule leggono
    # stateRef un render indietro: misurato, all apertura a freddo non armano
    # nulla e dopo addFarmaco riarmano il piano senza il farmaco nuovo (M2).
    riga("effetto-apertura-non-arma", "client, passo 3", "M2",
         [(ACX, "// Ratification A of 2026-10-01 (client of the reminder channel, step 3):",
           "    rescheduleAllNotifications(state, services.notifications);", "    void state;")],
         "vitest", [T_ACR],
         ["all apertura a freddo la dose di oggi e armata, senza alcun evento",
          "un farmaco aggiunto ha la sua dose armata, senza alcun evento"]),
    # Condizione di Roberto alla ratifica A: un riarmo non fa ripartire
    # l avviso di una dose gia mostrata (M1), nei due versi: i riarmi prima
    # dello scatto non lo impediscono (M2), e una dose spostata a un istante
    # nuovo si arma per il nuovo (M2).
    riga("timer-riarmo-riparte", "client, passo 3", "M1",
         [(NOTI, "function scheduleNotification(",
           "    if (fired.has(firma)) return; // already shown: a re-arm never starts it again",
           "    void firma;")],
         "vitest", [T_NOTI],
         ["dopo lo scatto un riarmo non lo fa ripartire, nemmeno con l orologio un poco indietro"]),
    riga("timer-riarmo-bloccato", "client, passo 3", "M2",
         [(NOTI, "function scheduleNotification(", "    if (fired.has(firma)) return;", "    if (firma) return;")],
         "vitest", [T_NOTI], ["i riarmi prima dello scatto non lo impediscono: un solo avviso, all istante"]),
    riga("timer-riarmo-per-dose", "client, passo 3", "M2",
         [(NOTI, "function scheduleNotification(", "const firma = `${entryKey}|${fireAt}`;",
           "const firma = entryKey;")],
         "vitest", [T_NOTI], ["una dose spostata a un istante nuovo si arma per il nuovo"]),
    # Un solo avviso per dose anche quando due riarmi si susseguono, come
    # all accensione del toggle (il thunk e l effetto): lo tengono cancelAll,
    # che svuota i timer pendenti, e la sostituzione per tag. Ciascuno basta
    # da solo, quindi ciascuno ha la sua riga sul suo test, e il pin di
    # percorso arrossa solo se cadono entrambi: quella riga muove due
    # variabili, intercetta e non isola.
    riga("timer-cancelall-non-svuota", "client, passo 3", "M1",
         [(NOTI, "function cancelAll() {", "      clearTimeout(timeoutId);", "      void timeoutId;")],
         "vitest", [T_NOTI], ["cancelAll clears all pending timers, no leak"]),
    riga("timer-tag-non-sostituisce", "client, passo 3", "M1",
         [(NOTI, "function scheduleNotification(", "      clearTimeout(pending.get(entryKey));",
           "      void entryKey;")],
         "vitest", [T_NOTI], ["tag-based replacement: rescheduling same entryKey cancels previous timer"]),
    riga("timer-riarmo-doppio", "client, passo 3", "M1",
         [(NOTI, "function cancelAll() {", "      clearTimeout(timeoutId);", "      void timeoutId;"),
          (NOTI, "function scheduleNotification(", "      clearTimeout(pending.get(entryKey));",
           "      void entryKey;")],
         "vitest", [T_NOTI], ["i riarmi prima dello scatto non lo impediscono: un solo avviso, all istante"]),
    # Il calendario pubblicato (passo 3). La chiave e quella che buildLogWrite
    # proietta: la passata rilegge il log per quella chiave, e una chiave che
    # scivola legge la riga di un altra dose (M1). Le tre righe nominate dalla
    # struttura approvata.
    riga("calendario-data-dall-istante", "client, passo 3", "M1",
         [(PUB, "export function vociDelCalendario(", "data: entry.dateStr,",
           "data: localDateStr(new Date(istante)),")],
         "vitest", [T_PUB],
         ["dal calendario al log: ogni voce ha la chiave della riga che la sua transizione scrive",
          "la dose di ieri ricalcolata a oggi: la data e quella del log, l istante e oggi"]),
    riga("calendario-dose-numero", "client, passo 3", "M1",
         [(PUB, "export function vociDelCalendario(", "dose_numero: entry.orario.dose_numero,",
           "dose_numero: entry.orario.id,")],
         "vitest", [T_PUB],
         ["dal calendario al log: ogni voce ha la chiave della riga che la sua transizione scrive",
          "il numero della dose e quello del log, non dell orario"]),
    riga("calendario-ricalcolata-vuota", "client, passo 3", "--",
         [(PUB, "export function vociDelCalendario(",
           "ora_ricalcolata: oraRicalcolataAlSecondo(entry.ora_ricalcolata),",
           "ora_ricalcolata: oraRicalcolataAlSecondo(entry.ora_ricalcolata ?? `${entry.dateStr}T${entry.ora_prevista}`),")],
         "vitest", [T_PUB],
         ["una dose prevista pubblica ora_ricalcolata vuota",
          "dal calendario al log: ogni voce ha la chiave della riga che la sua transizione scrive"]),
    riga("calendario-chiusa-pubblicata", "client, passo 3", "M1",
         [(PUB, "function pubblicabile(entry) {",
           "if (!entry || (entry.stato !== 'prevista' && entry.stato !== 'ricalcolata')) return false;",
           "if (!entry) return false;")],
         "vitest", [T_PUB],
         ["le dosi chiuse sul telefono non entrano: presa, saltata, sospesa",
          "dal log al calendario: una dose chiusa esce, la ricalcolata resta con la sua riga"]),
    # L avviso di fine (12): fuori dal sonno, con la tolleranza del server e
    # mai una copia, e anche senza voci.
    riga("calendario-avviso-nel-sonno", "client, passo 3", "--",
         [(PUB, "export function fuoriDalSonno(",
           "if (avvisoMs < fine && avvisoMs + finestraMs > inizio) return fine;", "void inizio;")],
         "vitest", [T_PUB],
         ["un avviso la cui finestra tocca il sonno va alla sveglia",
          "senza voci l avviso parte dalla fine dell orizzonte, con la regola del sonno"]),
    riga("calendario-tolleranza-copiata", "client, passo 3", "--",
         [(PUB, "export function componiCalendario(", "const tolleranzaMs = tolleranzaMin * MINUTO_MS;",
           "const tolleranzaMs = 20 * MINUTO_MS;")],
         "vitest", [T_PUB],
         ["l avviso e l ultima voce piu la tolleranza letta dal server, e l entro altrettanto dopo"]),
    riga("calendario-senza-voci", "client, passo 3", "--",
         [(PUB, "export function componiCalendario(", ": orizzonte;", ": 1;")],
         "vitest", [T_PUB], ["senza voci l avviso parte dalla fine dell orizzonte, con la regola del sonno"]),
    # Il testo della dose (32 A): mai uno stato (I1), sempre l ora, nei limiti
    # del server, uguale sul timer di pagina.
    riga("testo-asserisce-stato", "client, passo 3", "M1",
         [(PRO, "const INVITO =", "\"Apri l'app per controllare.\"",
           "\"Non ancora presa: apri l'app per registrarla.\"")],
         "vitest", [T_PRO], ["non asserisce mai uno stato della dose (I1), qualunque esso sia"]),
    riga("testo-senza-ora", "client, passo 3", "--",
         [(PRO, "export function testoDose(",
           "`Dose delle ${dueCifre(quando.getHours())}:${dueCifre(quando.getMinutes())}`", "'Dose'")],
         "vitest", [T_PRO], ["titolo il nome, corpo l ora, la relazione col pasto e l invito"]),
    riga("testo-fuori-misura", "client, passo 3", "M2",
         [(PRO, "function tronca(", "return testo.length <= massimo ? testo : `${testo.slice(0, massimo - 3)}...`;",
           "return testo;")],
         "vitest", [T_PRO], ["i campi restano nei limiti del server, anche con dati fuori misura"]),
    riga("testo-timer-diverso", "client, passo 3", "--",
         [(NOTI, "function showDoseNotification(", "title: titolo, body: corpo",
           "title: titolo, body: 'Promemoria farmaco'")],
         "vitest", [T_NOTI], ["showDoseNotification builds dose-tag and uses the text of the push, with the meal relation"]),
    # Il ciclo di pubblicazione: l invariato non si ripubblica (Q-SYNC) e il
    # cambiato si; vince l ultimo stato; un errore non segna pubblicato; la
    # tolleranza e del server; in modalita locale nulla.
    riga("pubblica-invariato-ripubblicato", "client, passo 3", "--",
         [(CPU, "async function eseguiPubblicazione(stato) {",
           "if (giaPubblicata(firma)) return esitoPubblicazione(P.INVARIATA);", "void giaPubblicata;")],
         "vitest", [T_CPU], ["il contenuto invariato non si ripubblica, e non legge nemmeno lo stato"]),
    riga("pubblica-mai-ripubblicato", "client, passo 3", "M2",
         [(CPU, "async function eseguiPubblicazione(stato) {", "if (giaPubblicata(firma)) return",
           "if (ultimaFirma !== null) return")],
         "vitest", [T_CPU], ["un contenuto cambiato si ripubblica"]),
    riga("pubblica-vince-il-primo", "client, passo 3", "M2",
         [(CPU, "function pubblica(stato) {", "pubblicazioneInAttesa.stato = stato;", "void stato;")],
         "vitest", [T_CPU], ["mentre una aspetta vince l ultimo stato chiesto"]),
    riga("pubblica-errore-segna-pubblicato", "client, passo 3", "M2",
         [(CPU, "async function eseguiPubblicazione(stato) {",
           "      await rete.pubblicaCalendario({ device_id: id, ...calendario });",
           "      ricordaPubblicata(firma);\n      await rete.pubblicaCalendario({ device_id: id, ...calendario });")],
         "vitest", [T_CPU], ["un errore non riprova da solo: il record lo dice, e la richiesta dopo riprova"]),
    riga("pubblica-tolleranza-fissa", "client, passo 3", "--",
         [(CPU, "async function eseguiPubblicazione(stato) {", "tolleranzaMin: statoServer?.tolleranza_min,",
           "tolleranzaMin: 20,")],
         "vitest", [T_CPU], ["la tolleranza e quella del server, letta nello stesso ciclo"]),
    riga("pubblica-modalita-locale", "client, passo 3", "--",
         [(CPU, "function pubblica(stato) {", "if (!inModalitaApi()) return Promise.resolve(null);",
           "void inModalitaApi;")],
         "vitest", [T_CPU], ["nessuna chiamata a /api/push e nessuna iscrizione"]),
    # Le sedi della pubblicazione: l effetto sullo stato applicato (ratifica
    # A) e il rientro in primo piano; a toggle spento nulla.
    riga("effetto-non-pubblica", "client, passo 3", "M2",
         [(ACX, "// Ratification A of 2026-10-01 (client of the reminder channel, step 3):",
           "    actions.pubblicaCanale(state);", "    void state;")],
         "vitest", [T_ACR],
         ["all apertura a freddo il calendario si pubblica, senza alcun evento",
          "un farmaco aggiunto ripubblica il calendario con la sua dose, senza alcun evento"]),
    riga("rientro-non-pubblica", "client, passo 3", "--",
         [(ACX, "const onForegroundEvent = () => {", "        actions.pubblicaCanale(stateRef.current);",
           "        void stateRef;")],
         "vitest", [T_ACX], ["visibilitychange pubblica il calendario, sullo stato di adesso"]),
    riga("pubblica-senza-toggle", "client, passo 3", "--",
         [(ACT, "function pubblicaCanale(stato) {", "stato.impostazioni?.notifiche_attive !== 1", "false")],
         "vitest", [T_ACAN], ["a toggle spento o app non pronta nessuna pubblicazione"]),
    # Il battito (passo 4; condizione della 9, soglia della 33 B): mai un OK
    # vecchio. La soglia nei due versi; l eta cresce col tempo del telefono, il
    # maggiore dei due orologi; un valore che non si legge non e un OK (M2).
    riga("battito-soglia-larga", "client, passo 4", "M2",
         [(STC, "export const SOGLIA_BATTITO_MS", "5 * 60_000", "60 * 60_000")],
         "vitest", [T_STC], ["oltre la soglia: non verificati, dalle l ora dell ultima passata"]),
    riga("battito-soglia-stretta", "client, passo 4", "--",
         [(STC, "export const SOGLIA_BATTITO_MS", "5 * 60_000", "3 * 60_000")],
         "vitest", [T_STC], ["cinque minuti meno un secondo di eta: attivi"]),
    riga("battito-senza-trascorso", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(", "const eta = battito.eta_ms + trascorso(lettura, adesso);",
           "const eta = battito.eta_ms;")],
         "vitest", [T_STC],
         ["oltre la soglia: non verificati, dalle l ora dell ultima passata",
          "l eta cresce col tempo passato sul telefono dopo la lettura"]),
    riga("battito-solo-monotono", "client, passo 4", "M2",
         [(STC, "export function trascorso(",
           "[adesso?.mono - lettura?.lettoMono, adesso?.ms - lettura?.lettoMs]", "[adesso?.mono - lettura?.lettoMono]")],
         "vitest", [T_STC], ["un salto avanti della parete lo invecchia"]),
    riga("battito-solo-parete", "client, passo 4", "M2",
         [(STC, "export function trascorso(",
           "[adesso?.mono - lettura?.lettoMono, adesso?.ms - lettura?.lettoMs]", "[adesso?.ms - lettura?.lettoMs]")],
         "vitest", [T_STC], ["un salto indietro della parete non ringiovanisce il battito"]),
    riga("battito-illeggibile-ok", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(", "if (!(eta <= SOGLIA_BATTITO_MS))", "if (eta > SOGLIA_BATTITO_MS)")],
         "vitest", [T_STC], ["orologi che non si leggono non danno un OK"]),
    # Non attivi quando sappiamo che i promemoria non arrivano (Roberto,
    # 2026-10-01): ciascun motivo, e la parola che lo dice.
    riga("stato-spento-ignorato", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(",
           "if (risposta.canale?.attivo !== true) return esito(E.NON_ATTIVI, P.CANALE_SPENTO);", "void 0;")],
         "vitest", [T_STC],
         ["canale spento sul server", "cio che sappiamo vince su cio che non sappiamo: canale spento e battito vecchio"]),
    riga("stato-mai-partita-ignorata", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(",
           "if (battito === null) return esito(E.NON_ATTIVI, P.PASSATA_MAI_PARTITA);",
           "if (battito === null) return esito(E.ATTIVI);")],
         "vitest", [T_STC], ["passata mai partita"]),
    riga("stato-esito-ignorato", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(",
           "if (battito.esito !== 'ok') return esito(E.NON_ATTIVI, P.ESITO_PASSATA);", "void 0;")],
         "vitest", [T_STC], ["ultima passata con esito non ok"]),
    riga("stato-iscrizione-ignorata", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(", "if (!iscritto) return esito(E.NON_ATTIVI, P.NON_ISCRITTO);",
           "void iscritto;")],
         "vitest", [T_STC], ["questo telefono non iscritto: assente, spento, o senza id"]),
    riga("stato-noto-come-dubbio", "client, passo 4", "--",
         [(STC, "export function valutaCanale(", "return esito(E.NON_ATTIVI, P.CANALE_SPENTO);",
           "return esito(E.NON_VERIFICATI, P.CANALE_SPENTO);")],
         "vitest", [T_STC], ["canale spento sul server"]),
    # Non aggiornati (aggiunta di Roberto al passo 4), nei due versi.
    riga("stato-pubblicazione-ignorata", "client, passo 4", "M2",
         [(STC, "export function valutaCanale(", "if (pubblicazione?.esito === 'non_pubblicata') {", "if (false) {")],
         "vitest", [T_STC], ["una pubblicazione fallita accende, con l ora dell ultima riuscita"]),
    riga("stato-pubblicazione-perpetua", "client, passo 4", "--",
         [(STC, "export function valutaCanale(", "if (pubblicazione?.esito === 'non_pubblicata') {",
           "if (pubblicazione != null) {")],
         "vitest", [T_STC], ["una pubblicazione riuscita, o invariata, spegne"]),
    # Le parole: ciascuna nei due versi; un 201 e accettato, mai consegnato
    # (M3 sul registro del canale, decisione 2).
    riga("testo-non-attivi-sfumato", "client, passo 4", "--",
         [(TES, "export function testoStatoCanale(",
           "if (esito === 'non_attivi') return `${CANALE_TITOLO} non attivi.`;",
           "if (esito === 'non_attivi') return `${CANALE_TITOLO} non verificati.`;")],
         "vitest", [T_TES], ["non attivi: lo dice in chiaro, senza ora e senza dubbio"]),
    riga("testo-non-verificati-assertivo", "client, passo 4", "--",
         [(TES, "export function testoStatoCanale(", "      : `${CANALE_TITOLO} non verificati.`;",
           "      : `${CANALE_TITOLO} non attivi.`;")],
         "vitest", [T_TES], ["non verificati: solo quando non sappiamo, con l ora se la sappiamo"]),
    riga("testo-non-aggiornati-confuso", "client, passo 4", "--",
         [(TES, "export function testoStatoCanale(", "non aggiornati dalle", "non verificati dalle")],
         "vitest", [T_TES], ["non aggiornati: il server tiene il calendario di prima"]),
    riga("testo-consegnato", "client, passo 4", "M3",
         [(TES, "const STATI_INVIO = Object.freeze({", "accettato: 'accettato',", "accettato: 'consegnato',")],
         "vitest", [T_TES, T_IMP],
         ["un 201 e accettato, mai consegnato", "un 201 si legge accettato, mai consegnato"]),
    # La riga di Oggi: solo quando lo stato non e OK, nei due versi; il tocco
    # iscrive dentro il gesto (ratifica A).
    riga("riga-ok-mostrata", "client, passo 4", "--",
         [(TES, "export function testoRigaCanale(",
           "if (valutazione == null || valutazione.esito === 'attivi') return null;",
           "if (valutazione == null) return null;")],
         "vitest", [T_RIGA], ["attivi: nessuna riga"]),
    riga("riga-taciuta", "client, passo 4", "M2",
         [(RIGA, "export default function RigaCanale() {", "  if (testo === null) return null;", "  return null;")],
         "vitest", [T_RIGA],
         ["non attivi: la riga lo dice in chiaro", "non verificati: battito vecchio",
          "non aggiornati: l ultima pubblicazione non e arrivata"]),
    riga("riga-tocco-non-nel-gesto", "client, passo 4", "--",
         [(RIGA, "export default function RigaCanale() {",
           "        void verificaCanale({ services, actions, valutazione });",
           "        void Promise.resolve().then(() => verificaCanale({ services, actions, valutazione }));")],
         "vitest", [T_RIGA],
         ["telefono non iscritto: subscribe e il primo atto del tocco, poi la conferma e la rilettura"]),
    # Le letture dello stato: orologi prima della richiesta (mai un OK
    # vecchio), in coda dopo il rinnovo, una alla volta; all ingresso delle
    # viste, al rientro, dopo una pubblicazione col PUT; mai al tick (Q-SYNC);
    # a toggle spento nessuna.
    riga("lettura-orologi-dopo", "client, passo 4", "M2",
         [(CPU, "function leggiStato() {",
           "      const lettoMono = orologi.mono();\n      const lettoMs = orologi.ms();\n      try {\n"
           "        const risposta = await rete.leggiStato();\n",
           "      let lettoMono;\n      let lettoMs;\n      try {\n"
           "        const risposta = await rete.leggiStato();\n"
           "        lettoMono = orologi.mono();\n        lettoMs = orologi.ms();\n")],
         "vitest", [T_CPU], ["i due orologi si leggono prima che la richiesta parta"]),
    riga("lettura-fuori-coda", "client, passo 4", "--",
         [(CPU, "function leggiStato() {", "    attesa.turno = inCoda(async () => {",
           "    attesa.turno = Promise.resolve().then(async () => {")],
         "vitest", [T_CPU], ["una lettura chiesta dopo un rinnovo lo vede: viene dopo il PUT"]),
    riga("lettura-doppia", "client, passo 4", "--",
         [(CPU, "function leggiStato() {", "if (letturaInAttesa !== null) return letturaInAttesa.turno;",
           "void letturaInAttesa;")],
         "vitest", [T_CPU], ["due richieste mentre una aspetta: una lettura"]),
    riga("stato-non-riletto-al-rientro", "client, passo 4", "--",
         [(ACX, "const onForegroundEvent = () => {", "        actions.leggiStatoCanale();", "        void actions;")],
         "vitest", [T_ACX], ["visibilitychange rilegge lo stato del canale"]),
    riga("stato-letto-al-tick", "client, passo 4", "--",
         [(ACX, "const tick = () => {", "      actions.drainOutbox();\n    };",
           "      actions.drainOutbox();\n      actions.leggiStatoCanale();\n    };")],
         "vitest", [T_ACX], ["il tick non rilegge lo stato del canale: mai a intervalli (Q-SYNC)"]),
    riga("stato-non-riletto-dopo-pubblicazione", "client, passo 4", "--",
         [(ACT, "function pubblicaCanale(stato) {", "        void leggiStatoCanale({ voluto: true });", "        void 0;")],
         "vitest", [T_ACAN],
         ["dopo una pubblicazione che ha fatto il PUT lo stato si rilegge; dopo una invariata no"]),
    riga("stato-riletto-dopo-invariata", "client, passo 4", "--",
         [(ACT, "function pubblicaCanale(stato) {",
           "if (esito && (esito.esito === 'pubblicata' || esito.motivo === 'pubblicazione')) {", "if (esito) {")],
         "vitest", [T_ACAN],
         ["dopo una pubblicazione che ha fatto il PUT lo stato si rilegge; dopo una invariata no"]),
    riga("stato-letto-a-toggle-spento", "client, passo 4", "--",
         [(ACT, "async function leggiStatoCanale(", "    if (!vuole) return null;", "    void vuole;")],
         "vitest", [T_ACAN], ["a toggle spento nessuna lettura"]),
    riga("sezione-non-riletta", "client, passo 4", "--",
         [(IMP, "function SezioneCanale() {", "    actions?.leggiStatoCanale?.();", "    void actions;")],
         "vitest", [T_IMP], ["all ingresso rilegge lo stato; Verifica ora rinnova e rilegge"]),
    riga("oggi-non-riletta", "client, passo 4", "--",
         [(OGGI, "export default function OggiView() {", "    actions?.leggiStatoCanale?.();", "    void actions;")],
         "vitest", [T_OGGI], ["all ingresso nella vista rilegge lo stato del canale, una volta"]),
    # D4, parte client (passo 5): la copy del toggle dice il vero, l avviso
    # all ora della dose e ad app aperta; "poco prima" non lo era.
    riga("copia-avviso-poco-prima", "client, passo 5", "--",
         [(IMP, "{showActiveHint && (", "Avviso all'ora di ogni dose, con l'app aperta.",
           "Avviso poco prima di ogni dose.")],
         "vitest", [T_IMPT], ["standalone + granted + enabled=true \u2192 toggle on, click invoca disable"]),
    # PUT farmaci, nei due versi: valori invariati non sono "non trovato"
    # (rowcount conta le righe cambiate e bloccava il PUT degli orari), e un
    # id inesistente o di un altro utente resta 404.
    riga("farmaci-put-sempre-404", "router farmaci, 404 su valori invariati", "--",
         [(FA, "def update_farmaco(", "        if row is None:\n", "        if True:\n")],
         "pytest", [T_FC], ["test_put_identical_values_then_orari_saved", "test_put_happy_full_replace"]),
    riga("farmaci-put-mai-404", "router farmaci, 404 su valori invariati", "--",
         [(FA, "def update_farmaco(", "        if row is None:\n", "        if False:\n")],
         "pytest", [T_FC], ["test_put_not_found"]),
    riga("farmaci-put-altrui", "router farmaci, 404 su valori invariati", "--",
         [(FA, "def update_farmaco(", '"FROM farmaci WHERE id = %s AND utente_id = %s"',
           '"FROM farmaci WHERE id = %s AND (utente_id = %s OR TRUE)"')],
         "pytest", [T_FC], ["test_put_scope_violation_other_user"]),
]

# L'autoprova: righe il cui esito e FISSATO, e che il banco pretende.
CONTROLLI = [
    dict(riga("controllo-commento-pytest", "autoprova", "--",
              [("backend/pharmatimer_api/tempo.py", "def minuti_reali(",
                "positive when `a` is later", "positive when `a` is LATER")],
              "pytest", [T_IM], ["test_dst_la_guardia_misura_minuti_reali"]),
         deve="NON MORDE"),
    dict(riga("controllo-commento-vitest", "autoprova", "--",
              [(SR, "// SENTINEL_D2_AVVISO_INTERVALLO", "the presa IS", "the presa is")],
              "vitest", [T_SRIM],
              ["A1 consegna con avviso: nota scritta PRIMA del drop, motivo INTERVALLO_MINIMO, "
               "numeri del server e ora della PRESA"]),
         deve="NON MORDE"),
    dict(riga("controllo-ancora-assente", "autoprova", "--",
              [(SR, "// ANCORA_CHE_NESSUN_FILE_PORTA", "x", "y")],
              "vitest", [T_SRIM],
              ["A1 consegna con avviso: nota scritta PRIMA del drop, motivo INTERVALLO_MINIMO, "
               "numeri del server e ora della PRESA"]),
         deve="BERSAGLIO"),
]

SONDA_DB = (
    "import hashlib, json\n"
    "from pharmatimer_api.config import settings as s\n"
    "print(json.dumps({'host': s.DB_HOST, 'porta': s.DB_PORT, 'utente': s.DB_USER,\n"
    "    'password': hashlib.sha256((s.DB_PASSWORD or '').encode()).hexdigest(),\n"
    "    'defaults_file': s.DB_DEFAULTS_FILE, 'db': s.DB_NAME, 'db_test': s.DB_NAME_TEST}))\n"
)
SONDA_IMPORT = "import os, pharmatimer_api; print(os.path.realpath(pharmatimer_api.__file__))"

FERMO = threading.Event()


class Rosso(Exception):
    """La harness non regge: il blocco arrossa senza misurare le righe."""


def lancia(cmd, cwd):
    """Un sottoprocesso con tempo massimo; None se non termina."""
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=TIMEOUT_S)
    except subprocess.TimeoutExpired:
        return None


def leggi_byte(p):
    with open(p, "rb") as fh:
        return fh.read()


def copia(dest):
    """Fotografa l'albero di lavoro in dest: tracciati piu non tracciati non ignorati."""
    ls = subprocess.run(["git", "ls-files", "-z", "-co", "--exclude-standard"], cwd=RADICE,
                        capture_output=True)
    if ls.returncode != 0:
        raise Rosso("git ls-files fallito: " + ls.stderr.decode("utf-8", "replace").strip())
    elenco = ls.stdout.decode("utf-8")
    nomi = [n for n in elenco.split("\0") if n and os.path.lexists(os.path.join(RADICE, n))]
    os.makedirs(dest)
    crea = subprocess.Popen(["tar", "--null", "-T", "-", "-cf", "-"], cwd=RADICE,
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    estrai = subprocess.Popen(["tar", "-xf", "-", "-C", dest], stdin=crea.stdout)
    crea.stdout.close()
    crea.stdin.write(("\0".join(nomi) + "\0").encode("utf-8"))
    crea.stdin.close()
    if estrai.wait() != 0 or crea.wait() != 0:
        raise Rosso("copia dell'albero di lavoro fallita in " + dest)
    os.symlink(os.path.join(RADICE, "node_modules"), os.path.join(dest, "node_modules"))
    env_dev = os.path.join(RADICE, "backend", ".env.dev")
    if os.path.exists(env_dev):
        os.symlink(env_dev, os.path.join(dest, "backend", ".env.dev"))


def risoluzione_db(cartella_backend):
    r = lancia([sys.executable, "-c", SONDA_DB], cartella_backend)
    if r is None or r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return None


def esporta_openapi(radice):
    r = lancia([sys.executable, "export_openapi.py", "openapi.json"], os.path.join(radice, "backend"))
    return r is not None and r.returncode == 0


def prepara_copia(radice, con_openapi):
    """Verifica che il backend della copia sia quello della copia; esporta openapi."""
    r = lancia([sys.executable, "-c", SONDA_IMPORT], os.path.join(radice, "backend"))
    if r is None:
        raise Rosso("import del backend nella copia oltre il tempo massimo: " + radice)
    percorso = r.stdout.strip()
    if r.returncode != 0 or not percorso.startswith(os.path.realpath(radice) + os.sep):
        raise Rosso("il backend non si importa dalla copia %s: %s"
                    % (radice, percorso or r.stderr.strip()[-200:]))
    if con_openapi and not esporta_openapi(radice):
        raise Rosso("export di openapi.json fallito nella copia " + radice)


def esegui(radice, suite, files, tmp):
    """Lancia i file di test; ritorna la lista di (nome, stato), o None se illeggibile."""
    if suite == "vitest":
        rapporto = os.path.join(tmp, "vitest.json")
        if os.path.exists(rapporto):
            os.remove(rapporto)
        # Lo exit code e 1 PER COSTRUZIONE quando un test arrossa: si legge il rapporto.
        if lancia(["npx", "vitest", "run", *files, "--no-cache", "--reporter=json",
                   "--outputFile=" + rapporto], radice) is None:
            return None
        try:
            with open(rapporto, encoding="utf-8") as fh:
                dati = json.load(fh)
        except (OSError, ValueError):
            return None
        return [(a.get("title"), a.get("status")) for r in dati.get("testResults", [])
                for a in r.get("assertionResults", [])]
    rapporto = os.path.join(tmp, "pytest.xml")
    if os.path.exists(rapporto):
        os.remove(rapporto)
    if lancia([sys.executable, "-m", "pytest", *files, "-q", "-p", "no:cacheprovider",
               "--junitxml=" + rapporto], os.path.join(radice, "backend")) is None:
        return None
    try:
        albero = ET.parse(rapporto)
    except (OSError, ET.ParseError):
        return None
    esiti = []
    for caso in albero.iter("testcase"):
        stato = "passed"
        for figlio in caso:
            if figlio.tag in ("failure", "error"):
                stato = "failed"
            elif figlio.tag == "skipped":
                stato = "skipped"
        esiti.append((caso.get("name"), stato))
    return esiti


def stato_di(esiti, nome):
    trovati = [s for (n, s) in esiti if n == nome]
    return trovati[0] if len(trovati) == 1 else None


def muta(radice, r, tmp):
    """Applica la riga nella copia, misura, ripristina. Ritorna un dict di esito."""
    originali = {}
    openapi = os.path.join(radice, "backend", "openapi.json")
    openapi_prima = leggi_byte(openapi) if r["openapi"] else None
    try:
        sedi = []
        for (f, ancora, testo_vecchio, testo_nuovo) in r["edits"]:
            p = os.path.join(radice, f)
            if not os.path.realpath(p).startswith(os.path.realpath(radice) + os.sep):
                return dict(esito="HARNESS", nota="scrittura fuori dalla copia rifiutata: " + f, sedi=sedi)
            with open(p, encoding="utf-8") as fh:
                testo = fh.read()
            originali.setdefault(p, testo)
            n = testo.count(ancora)
            if n != 1:
                return dict(esito="BERSAGLIO", nota="ancora trovata %d volte in %s: %r" % (n, f, ancora),
                            sedi=sedi)
            j = testo.find(testo_vecchio, testo.index(ancora))
            if j < 0:
                return dict(esito="BERSAGLIO", nota="testo assente dopo l'ancora in %s: %r"
                            % (f, testo_vecchio), sedi=sedi)
            sedi.append("%s:%d" % (f, testo.count("\n", 0, j) + 1))
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(testo[:j] + testo_nuovo + testo[j + len(testo_vecchio):])
        if r["openapi"] and not esporta_openapi(radice):
            return dict(esito="HARNESS", nota="export di openapi.json fallito sotto mutazione", sedi=sedi)
        t0 = time.monotonic()
        esiti = esegui(radice, r["suite"], r["files"], tmp)
        secondi = time.monotonic() - t0
        if esiti is None:
            return dict(esito="HARNESS", nota="rapporto di %s illeggibile" % r["suite"], sedi=sedi)
        # Un atteso che SPARISCE sotto mutazione non e un pin che morde: la
        # mutazione ha rotto il caricamento del file, cioe intercetta ma non isola.
        assenti = [a for a in r["attesi"] if stato_di(esiti, a) is None]
        if assenti:
            return dict(esito="HARNESS", nota="test atteso assente sotto mutazione, il file non si "
                        "carica: la riga non isola -- " + "; ".join(assenti), sedi=sedi)
        caduti = [n for (n, s) in esiti if s == "failed"]
        verdi = [a for a in r["attesi"] if stato_di(esiti, a) != "failed"]
        fuori = [c for c in caduti if c not in r["attesi"]]
        if verdi:
            return dict(esito="NON MORDE", nota="attesi rimasti verdi: " + "; ".join(verdi),
                        sedi=sedi, fuori=fuori, secondi=secondi)
        return dict(esito="MORDE", sedi=sedi, fuori=fuori, secondi=secondi)
    finally:
        for p, testo in originali.items():
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(testo)
            with open(p, encoding="utf-8") as fh:
                if fh.read() != testo:
                    raise Rosso("ripristino NON identico nella copia: " + p)
        if originali and r["openapi"]:
            if not esporta_openapi(radice) or leggi_byte(openapi) != openapi_prima:
                raise Rosso("openapi.json della copia non torna identico dopo " + r["id"])


def lavora(radice, coda):
    """Un lavoratore: una copia, una coda di righe, in serie."""
    tmp = tempfile.mkdtemp(dir=os.path.dirname(radice))
    esiti = {}
    for r in coda:
        if FERMO.is_set():
            break
        try:
            esiti[r["id"]] = muta(radice, r, tmp)
        except Rosso as e:
            esiti[r["id"]] = dict(esito="HARNESS", nota=str(e), sedi=[])
    return esiti


def main():
    compatto = "--compatto" in sys.argv
    os.umask(0o022)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    t0 = time.monotonic()
    righe_out = []  # dettaglio, stampato per intero solo se rosso o non compatto
    rossi = []

    ids = [r["id"] for r in MUTAZIONI + CONTROLLI]
    doppi = sorted({i for i in ids if ids.count(i) > 1})
    print("== MUTAZIONI: collaudo per mutazione dei pin M1, M2 e M3, su copie fuori dall albero ==")
    if doppi:
        print("ROSSO  identificativi ripetuti nella tabella: " + ", ".join(doppi))
        return 1
    if not os.path.isdir(os.path.join(RADICE, "node_modules")):
        print("ROSSO  node_modules assente: npm ci")
        return 1

    base = tempfile.mkdtemp(prefix="mutazioni-")
    try:
        radici = [os.path.join(base, "copia%d" % i) for i in range(COPIE_VITEST + 1)]
        for r in radici:
            copia(r)

        # Il DB di test della copia e quello di test-backend, e non e DB_NAME.
        vera = risoluzione_db(os.path.join(RADICE, "backend"))
        della_copia = risoluzione_db(os.path.join(radici[0], "backend"))
        if vera is None or della_copia is None:
            raise Rosso("la config del backend non si risolve (%s): senza DB di test pytest non gira"
                        % ("albero" if vera is None else "copia"))
        if vera != della_copia:
            diversi = sorted(k for k in vera if vera.get(k) != della_copia.get(k))
            raise Rosso("il DB della copia NON e quello di test-backend: differiscono " + ", ".join(diversi))
        if della_copia["db_test"] == della_copia["db"]:
            raise Rosso("DB_NAME_TEST coincide con DB_NAME (%s): il TRUNCATE autouse colpirebbe il DB di sviluppo"
                        % della_copia["db"])
        righe_out.append("   DB di test   %s su %s:%s come %s: uguale a test-backend, diverso da DB_NAME"
                         % (della_copia["db_test"], della_copia["host"], della_copia["porta"],
                            della_copia["utente"]))

        with cf.ThreadPoolExecutor(max_workers=len(radici)) as ex:
            list(ex.map(lambda i: prepara_copia(radici[i], i > 0), range(len(radici))))
        righe_out.append("   copie        %d, backend importato da ciascuna copia" % len(radici))

        # Baseline: ogni file bersaglio, non mutato, verde; ogni atteso presente
        # UNA volta e verde. Un nome atteso sbagliato renderebbe vuoto il confronto.
        tutte = MUTAZIONI + CONTROLLI
        f_py = sorted({f for r in tutte if r["suite"] == "pytest" for f in r["files"]})
        f_vi = sorted({f for r in tutte if r["suite"] == "vitest" for f in r["files"]})
        tmp_b = tempfile.mkdtemp(dir=base)
        tmp_b2 = tempfile.mkdtemp(dir=base)
        with cf.ThreadPoolExecutor(max_workers=2) as ex:
            fut_py = ex.submit(esegui, radici[0], "pytest", f_py, tmp_b)
            fut_vi = ex.submit(esegui, radici[1], "vitest", f_vi, tmp_b2)
            base_py, base_vi = fut_py.result(), fut_vi.result()
        if base_py is None or base_vi is None:
            raise Rosso("baseline illeggibile (%s)" % ("pytest" if base_py is None else "vitest"))
        non_verdi = [n for (n, s) in base_py + base_vi if s != "passed"]
        if non_verdi:
            raise Rosso("baseline NON verde, prima di ogni mutazione: " + "; ".join(non_verdi[:5]))
        for r in tutte:
            esiti = base_py if r["suite"] == "pytest" else base_vi
            for a in r["attesi"]:
                if stato_di(esiti, a) != "passed":
                    raise Rosso("%s: test atteso assente o ripetuto nella baseline: %s" % (r["id"], a))
        righe_out.append("   baseline     pytest %d file %d test, vitest %d file %d test: verdi, attesi presenti"
                         % (len(f_py), len(base_py), len(f_vi), len(base_vi)))

        # Righe: pytest in serie sulla copia 0, vitest ripartite sulle altre.
        code = [[r for r in tutte if r["suite"] == "pytest"]] + [[] for _ in range(COPIE_VITEST)]
        for i, r in enumerate(r for r in tutte if r["suite"] == "vitest"):
            code[1 + i % COPIE_VITEST].append(r)
        esiti = {}
        with cf.ThreadPoolExecutor(max_workers=len(radici)) as ex:
            futuri = [ex.submit(lavora, radici[i], code[i]) for i in range(len(radici))]
            try:
                for f in futuri:
                    esiti.update(f.result())
            except BaseException:
                FERMO.set()
                raise

        auto = []
        for c in CONTROLLI:
            e = esiti.get(c["id"], dict(esito="HARNESS", nota="non eseguito"))
            auto.append("%s %s" % (c["id"], e["esito"]))
            if e["esito"] != c["deve"]:
                rossi.append("%s: autoprova tradita, atteso %s, misurato %s" % (c["id"], c["deve"], e["esito"]))
        righe_out.append("   autoprova    " + ", ".join(auto))

        conteggio = {}
        for r in MUTAZIONI:
            e = esiti.get(r["id"], dict(esito="HARNESS", nota="non eseguito", sedi=[]))
            riga_txt = "   %-24s %-5s %-50s %s" % (r["id"], r["invariante"], ",".join(e.get("sedi", [])) or "-",
                                                    e["esito"])
            if e.get("nota"):
                riga_txt += " -- " + e["nota"]
            righe_out.append(riga_txt)
            if e.get("fuori"):
                righe_out.append("      INFO rossi fuori attesa: " + "; ".join(x[:60] for x in e["fuori"]))
            if e["esito"] == "MORDE":
                conteggio[r["invariante"]] = conteggio.get(r["invariante"], 0) + 1
            else:
                rossi.append("%s %s" % (r["id"], e["esito"]))
    except Rosso as e:
        rossi.append("HARNESS " + str(e))
    finally:
        FERMO.set()
        shutil.rmtree(base, ignore_errors=True)

    secondi = time.monotonic() - t0
    if rossi or not compatto:
        for t in righe_out:
            print(t)
    elif righe_out:
        print(righe_out[0])
        print(next((t for t in righe_out if t.startswith("   autoprova")), ""))
    if rossi:
        print("ROSSO  il collaudo per mutazione non regge:")
        for t in rossi:
            print("       " + t)
        return 1
    dettaglio = ", ".join("%s %d" % (k, v) for k, v in sorted(conteggio.items()))
    print("VERDE  %d mutazioni su %d mordono (%s), %.1f s" % (sum(conteggio.values()), len(MUTAZIONI),
                                                            dettaglio, secondi))
    return 0


if __name__ == "__main__":
    sys.exit(main())
