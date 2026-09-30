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
MPU = "backend/pharmatimer_api/models/push.py"
T_CAN = "tests/test_canale.py"
T_CFG = "tests/test_config_validator.py"
T_PST = "tests/test_push_stato.py"
T_PIS = "tests/test_push_iscrizione.py"
T_PCA = "tests/test_push_calendario.py"

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
