"""
PharmaTimer -- Web Push reminder channel, branch A: the planner.

    python -m pharmatimer_api.pianificatore

One pass, idempotent, started every 60 s by its own LaunchAgent (decision 9 of
STATO_CORRENTE.md): it restarts from the DB and keeps nothing in memory, and
launchd never starts a second instance while one runs. It never computes a
time (decision 8): it compares the instants the phone published with the
server clock, epoch milliseconds on both sides (v07_push.sql, header).

For every calendar entry due and every active subscription of its user, AT
EVERY ATTEMPT, the first and each retry (condition 1 of Roberto, 2026-09-30):
  1. the log is re-read by slot key: presa, saltata or sospesa -> no push and
     a row with that reason (decision 8); no row -> push (fail-safe);
  2. farmaco and utente are re-read: not active -> no push (D2 A,
     2026-10-01);
  3. the window is [istante, istante + 20 min): nothing leaves before it, the
     TTL is what is left of it at the POST, and at zero or less there is no
     POST but a row 'scaduto' (decision 16);
  4. ora_ricalcolata of the log equals the published one, NULLs included ->
     dose push; otherwise a neutral notice, no farmaco and no time, reason
     'divergenza' (decision 11);
  5. the decision is written only if the calendar entry is still the one
     read, and committed BEFORE the POST: at most once per dose and phone
     (v07). Only a certified refusal is attempted again (condition 2,
     pharmatimer_api/invio.py).
The end-of-horizon notice goes through the same steps minus the dose ones
(decision 12). Its publication is one row per user, so a newer publication
replaces it by construction.

No 'scaduto' row for a window that closed before the subscription's current
activation, push_subscriptions.created_at (Roberto, 2026-09-30).

Writes push_dispatch, push_avvisi_fine, push_pianificatore, and
push_subscriptions only to switch a dead one off (404, 410). Reads
log_assunzioni and never writes it (I2). With routers/*.py, the second and
last seat of SQL (CLAUDE.md section 13, D1 A of 2026-09-30).
"""
from __future__ import annotations

import sys
import time
import traceback
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass

from mysql.connector import IntegrityError

from pharmatimer_api import canale, invio
from pharmatimer_api.config import settings
from pharmatimer_api.db import connection

STATI_CHIUSI = ("presa", "saltata", "sospesa")

# An 'in_invio' row this old without an outcome was left by an interrupted
# pass: its POST may or may not have left, so it is an unknown outcome and it
# is never attempted again.
IN_INVIO_ORFANO_MS = 120_000

NON_INVIATO = "non_inviato"
DOSE = "dose"
AVVISO_NEUTRO = "avviso_neutro"

SCADUTO = "scaduto"
DIVERGENZA = "divergenza"
CHIAVE_ASSENTE = "chiave_assente"
FARMACO_NON_ATTIVO = "farmaco_non_attivo"
UTENTE_NON_ATTIVO = "utente_non_attivo"
VOCE_RITIRATA = "voce_ritirata"
ISCRIZIONE_SPENTA = "iscrizione_spenta"
SUPERATO = "superato"
ERRORE = "errore"
OK = "ok"
CAMBIATA = "cambiata"

# Every entry due whose window closed after the subscription's current
# activation, and that has no decision yet or a certified refusal to retry.
_DOSI_DOVUTE = (
    "SELECT s.id AS sub_id, s.utente_id, s.endpoint, s.p256dh_key, s.auth_key, "
    "c.farmaco_id, c.data, c.dose_numero, c.istante_ms, c.ora_ricalcolata, c.titolo, c.corpo, "
    "d.id AS riga_id "
    "FROM push_calendario c "
    "JOIN push_subscriptions s ON s.utente_id = c.utente_id AND s.attiva = TRUE "
    "LEFT JOIN push_dispatch d ON d.subscription_id = s.id AND d.farmaco_id = c.farmaco_id "
    "AND d.data = c.data AND d.dose_numero = c.dose_numero "
    "WHERE c.istante_ms <= %(adesso)s "
    "AND c.istante_ms + %(tolleranza)s > UNIX_TIMESTAMP(s.created_at) * 1000 "
    "AND (d.id IS NULL OR d.stato = 'da_ritentare') "
    "ORDER BY c.istante_ms, s.id"
)

_AVVISI_DOVUTI = (
    "SELECT s.id AS sub_id, s.utente_id, s.endpoint, s.p256dh_key, s.auth_key, "
    "p.avviso_fine_ms, p.avviso_fine_entro_ms, a.id AS riga_id "
    "FROM push_pubblicazioni p "
    "JOIN push_subscriptions s ON s.utente_id = p.utente_id AND s.attiva = TRUE "
    "LEFT JOIN push_avvisi_fine a ON a.subscription_id = s.id "
    "AND a.avviso_fine_ms = p.avviso_fine_ms "
    "WHERE p.avviso_fine_ms <= %(adesso)s "
    "AND p.avviso_fine_entro_ms > UNIX_TIMESTAMP(s.created_at) * 1000 "
    "AND (a.id IS NULL OR a.stato = 'da_ritentare') "
    "ORDER BY p.avviso_fine_ms, s.id"
)


@dataclass(frozen=True)
class Decisione:
    """What one attempt decides. stato 'in_invio' means: POST now, with ttl_s."""

    stato: str
    motivo: str | None
    forma: str | None
    ttl_s: int | None


def decidi_dose(
    letto_stato: str | None,
    letto_ora,
    pubblicata_ora,
    farmaco_attivo: bool,
    utente_attivo: bool,
    fine_ms: int,
    ora_ms: int,
    firma_pronta: bool,
) -> Decisione:
    """Steps 1-4 of the module docstring, on values already re-read. Pure."""
    if letto_stato in STATI_CHIUSI:
        return Decisione(NON_INVIATO, letto_stato, None, None)
    if not farmaco_attivo:
        return Decisione(NON_INVIATO, FARMACO_NON_ATTIVO, None, None)
    if not utente_attivo:
        return Decisione(NON_INVIATO, UTENTE_NON_ATTIVO, None, None)
    ttl_s = (fine_ms - ora_ms) // 1000
    if ttl_s <= 0:
        return Decisione(NON_INVIATO, SCADUTO, None, None)
    uguale = letto_ora == pubblicata_ora
    forma = DOSE if uguale else AVVISO_NEUTRO
    motivo = None if uguale else DIVERGENZA
    if not firma_pronta:
        return Decisione(invio.DA_RITENTARE, CHIAVE_ASSENTE, forma, None)
    return Decisione(invio.IN_INVIO, motivo, forma, ttl_s)


def decidi_avviso(utente_attivo: bool, entro_ms: int, ora_ms: int, firma_pronta: bool) -> Decisione:
    """The same steps for the end-of-horizon notice, which carries no dose. Pure."""
    if not utente_attivo:
        return Decisione(NON_INVIATO, UTENTE_NON_ATTIVO, None, None)
    ttl_s = (entro_ms - ora_ms) // 1000
    if ttl_s <= 0:
        return Decisione(NON_INVIATO, SCADUTO, None, None)
    if not firma_pronta:
        return Decisione(invio.DA_RITENTARE, CHIAVE_ASSENTE, None, None)
    return Decisione(invio.IN_INVIO, None, None, ttl_s)


def _rileggi_log(cur, voce) -> tuple:
    """(stato, ora_ricalcolata) of the slot in the log, (None, None) with no row."""
    cur.execute(
        "SELECT stato, ora_ricalcolata FROM log_assunzioni "
        "WHERE utente_id = %s AND farmaco_id = %s AND data = %s AND dose_numero = %s",
        (voce["utente_id"], voce["farmaco_id"], voce["data"], voce["dose_numero"]),
    )
    riga = cur.fetchone()
    return (None, None) if riga is None else (riga["stato"], riga["ora_ricalcolata"])


def _rileggi_attivi(cur, utente_id: int, farmaco_id: int | None) -> tuple[bool, bool]:
    """(farmaco attivo, utente attivo), as the record says now (D2 A)."""
    cur.execute(
        "SELECT (SELECT attivo FROM farmaci WHERE id = %s AND utente_id = %s) AS farmaco, "
        "(SELECT attivo FROM utenti WHERE id = %s) AS utente",
        (farmaco_id, utente_id, utente_id),
    )
    riga = cur.fetchone()
    return bool(riga["farmaco"]), bool(riga["utente"])


def _scrivi_dose(cur, voce, d: Decisione, letto_stato, letto_ora, ora: int) -> int | None:
    """Write the decision if the calendar entry is still the one read.

    The row id, or None when the entry changed or was withdrawn since it was
    read, or another pass decided first: the next pass reads again.
    """
    valori = (letto_stato, letto_ora, d.forma, d.stato, d.motivo, d.ttl_s, ora)
    voce_letta = (voce["istante_ms"], voce["ora_ricalcolata"])
    if voce["riga_id"] is None:
        try:
            cur.execute(
                "INSERT INTO push_dispatch (subscription_id, utente_id, farmaco_id, data, "
                "dose_numero, istante_ms, pubblicata_ora_ricalcolata, letto_stato, "
                "letto_ora_ricalcolata, forma, stato, motivo, ttl_s, deciso_ms) "
                "SELECT %s, c.utente_id, c.farmaco_id, c.data, c.dose_numero, c.istante_ms, "
                "c.ora_ricalcolata, %s, %s, %s, %s, %s, %s, %s FROM push_calendario c "
                "WHERE c.utente_id = %s AND c.farmaco_id = %s AND c.data = %s "
                "AND c.dose_numero = %s AND c.istante_ms = %s AND c.ora_ricalcolata <=> %s",
                (
                    voce["sub_id"],
                    *valori,
                    voce["utente_id"],
                    voce["farmaco_id"],
                    voce["data"],
                    voce["dose_numero"],
                    *voce_letta,
                ),
            )
        except IntegrityError:
            return None
        return cur.lastrowid if cur.rowcount == 1 else None
    cur.execute(
        "UPDATE push_dispatch d JOIN push_calendario c ON c.utente_id = d.utente_id "
        "AND c.farmaco_id = d.farmaco_id AND c.data = d.data AND c.dose_numero = d.dose_numero "
        "SET d.istante_ms = c.istante_ms, d.pubblicata_ora_ricalcolata = c.ora_ricalcolata, "
        "d.letto_stato = %s, d.letto_ora_ricalcolata = %s, d.forma = %s, d.stato = %s, "
        "d.motivo = %s, d.ttl_s = %s, d.deciso_ms = %s, d.http_status = NULL, "
        "d.dettaglio = NULL, d.inviato_ms = NULL "
        "WHERE d.id = %s AND d.stato = 'da_ritentare' "
        "AND c.istante_ms = %s AND c.ora_ricalcolata <=> %s",
        (*valori, voce["riga_id"], *voce_letta),
    )
    return voce["riga_id"] if cur.rowcount == 1 else None


def _scrivi_avviso(cur, avviso, d: Decisione, ora: int) -> int | None:
    """The same for the end-of-horizon notice: written only if still the published one."""
    letto = (avviso["avviso_fine_ms"], avviso["avviso_fine_entro_ms"])
    if avviso["riga_id"] is None:
        try:
            cur.execute(
                "INSERT INTO push_avvisi_fine (subscription_id, utente_id, avviso_fine_ms, "
                "entro_ms, stato, motivo, ttl_s, deciso_ms) "
                "SELECT %s, p.utente_id, p.avviso_fine_ms, p.avviso_fine_entro_ms, %s, %s, %s, %s "
                "FROM push_pubblicazioni p WHERE p.utente_id = %s "
                "AND p.avviso_fine_ms = %s AND p.avviso_fine_entro_ms = %s",
                (avviso["sub_id"], d.stato, d.motivo, d.ttl_s, ora, avviso["utente_id"], *letto),
            )
        except IntegrityError:
            return None
        return cur.lastrowid if cur.rowcount == 1 else None
    cur.execute(
        "UPDATE push_avvisi_fine a JOIN push_pubblicazioni p ON p.utente_id = a.utente_id "
        "AND p.avviso_fine_ms = a.avviso_fine_ms "
        "SET a.entro_ms = p.avviso_fine_entro_ms, a.stato = %s, a.motivo = %s, a.ttl_s = %s, "
        "a.deciso_ms = %s, a.http_status = NULL, a.dettaglio = NULL, a.inviato_ms = NULL "
        "WHERE a.id = %s AND a.stato = 'da_ritentare' "
        "AND p.avviso_fine_ms = %s AND p.avviso_fine_entro_ms = %s",
        (d.stato, d.motivo, d.ttl_s, ora, avviso["riga_id"], *letto),
    )
    return avviso["riga_id"] if cur.rowcount == 1 else None


def _iscrizione(riga) -> dict:
    return {"endpoint": riga["endpoint"], "keys": {"p256dh": riga["p256dh_key"], "auth": riga["auth_key"]}}


def _registra_esito(cur, tabella: str, riga_id: int, esito: invio.Esito, motivo, ora: int) -> None:
    """The outcome of the POST. An accepted neutral notice keeps its reason 'divergenza'."""
    cur.execute(
        f"UPDATE {tabella} SET stato = %s, motivo = %s, http_status = %s, dettaglio = %s, "
        "inviato_ms = %s WHERE id = %s",
        (esito.stato, esito.motivo or motivo, esito.http_status, esito.dettaglio, ora, riga_id),
    )


def _spegni(cur, sub_id: int, ora: int) -> None:
    cur.execute(
        "UPDATE push_subscriptions SET attiva = FALSE, disattivata_ms = %s, "
        "motivo_disattivazione = %s WHERE id = %s AND attiva = TRUE",
        (ora, invio.ISCRIZIONE_MORTA, sub_id),
    )


def _tenta_dose(conn, cur, voce, firma: invio.Firma, invia, orologio) -> str:
    # Condition 1: every attempt, the first and each retry, re-reads the record.
    letto_stato, letto_ora = _rileggi_log(cur, voce)
    farmaco_attivo, utente_attivo = _rileggi_attivi(cur, voce["utente_id"], voce["farmaco_id"])
    ora = orologio()
    d = decidi_dose(
        letto_stato,
        letto_ora,
        voce["ora_ricalcolata"],
        farmaco_attivo,
        utente_attivo,
        voce["istante_ms"] + canale.TOLLERANZA_PUSH_MS,
        ora,
        firma.motivo is None,
    )
    riga_id = _scrivi_dose(cur, voce, d, letto_stato, letto_ora, ora)
    conn.commit()
    if riga_id is None:
        return CAMBIATA
    if d.stato != invio.IN_INVIO:
        return d.motivo or d.stato
    if d.forma == DOSE:
        dati = canale.payload_dose(
            voce["titolo"],
            voce["corpo"],
            voce["istante_ms"],
            voce["farmaco_id"],
            voce["data"],
            voce["dose_numero"],
        )
    else:
        dati = canale.payload_avviso_neutro()
    esito = invia(_iscrizione(voce), dati, d.ttl_s, firma.vapid, firma.sub)
    _registra_esito(cur, "push_dispatch", riga_id, esito, d.motivo, ora)
    if esito.iscrizione_morta:
        _spegni(cur, voce["sub_id"], ora)
    conn.commit()
    return esito.motivo or esito.stato


def _tenta_avviso(conn, cur, avviso, firma: invio.Firma, invia, orologio) -> str:
    # Condition 1 again: the publication is re-checked by the conditional write.
    _, utente_attivo = _rileggi_attivi(cur, avviso["utente_id"], None)
    ora = orologio()
    d = decidi_avviso(utente_attivo, avviso["avviso_fine_entro_ms"], ora, firma.motivo is None)
    riga_id = _scrivi_avviso(cur, avviso, d, ora)
    conn.commit()
    if riga_id is None:
        return CAMBIATA
    if d.stato != invio.IN_INVIO:
        return d.motivo or d.stato
    esito = invia(_iscrizione(avviso), canale.payload_avviso_fine(), d.ttl_s, firma.vapid, firma.sub)
    _registra_esito(cur, "push_avvisi_fine", riga_id, esito, d.motivo, ora)
    if esito.iscrizione_morta:
        _spegni(cur, avviso["sub_id"], ora)
    conn.commit()
    return esito.motivo or esito.stato


def _chiudi_sospesi(cur, adesso: int) -> None:
    """Close what a pass can no longer attempt, with its reason (I3): never a silence.

    A retry whose subscription went off, moved to another user, or started a
    new activation after the window; a retry whose entry or notice the phone
    withdrew; an 'in_invio' left without outcome by an interrupted pass,
    which stays 'in_invio' as esito_ignoto, never attempted again.
    """
    cur.execute(
        "UPDATE push_dispatch d JOIN push_subscriptions s ON s.id = d.subscription_id "
        "SET d.stato = 'non_inviato', d.motivo = %s "
        "WHERE d.stato = 'da_ritentare' AND (s.attiva = FALSE OR s.utente_id <> d.utente_id "
        "OR d.istante_ms + %s <= UNIX_TIMESTAMP(s.created_at) * 1000)",
        (ISCRIZIONE_SPENTA, canale.TOLLERANZA_PUSH_MS),
    )
    cur.execute(
        "UPDATE push_dispatch d LEFT JOIN push_calendario c ON c.utente_id = d.utente_id "
        "AND c.farmaco_id = d.farmaco_id AND c.data = d.data AND c.dose_numero = d.dose_numero "
        "SET d.stato = 'non_inviato', d.motivo = %s "
        "WHERE d.stato = 'da_ritentare' AND c.id IS NULL",
        (VOCE_RITIRATA,),
    )
    cur.execute(
        "UPDATE push_avvisi_fine a JOIN push_subscriptions s ON s.id = a.subscription_id "
        "SET a.stato = 'non_inviato', a.motivo = %s "
        "WHERE a.stato = 'da_ritentare' AND (s.attiva = FALSE OR s.utente_id <> a.utente_id "
        "OR a.entro_ms <= UNIX_TIMESTAMP(s.created_at) * 1000)",
        (ISCRIZIONE_SPENTA,),
    )
    cur.execute(
        "UPDATE push_avvisi_fine a LEFT JOIN push_pubblicazioni p ON p.utente_id = a.utente_id "
        "AND p.avviso_fine_ms = a.avviso_fine_ms "
        "SET a.stato = 'non_inviato', a.motivo = %s "
        "WHERE a.stato = 'da_ritentare' AND p.utente_id IS NULL",
        (SUPERATO,),
    )
    for tabella in ("push_dispatch", "push_avvisi_fine"):
        cur.execute(
            f"UPDATE {tabella} SET motivo = %s, dettaglio = 'passata interrotta prima dell esito' "
            "WHERE stato = 'in_invio' AND inviato_ms IS NULL AND deciso_ms < %s",
            (invio.ESITO_IGNOTO, adesso - IN_INVIO_ORFANO_MS),
        )


def _scrivi_battito(cur, ora: int, esito: str, dettaglio: str | None) -> None:
    cur.execute(
        "INSERT INTO push_pianificatore (nome, ultima_passata_ms, esito, dettaglio) "
        "VALUES (%s, %s, %s, %s) AS nuova ON DUPLICATE KEY UPDATE "
        "ultima_passata_ms = nuova.ultima_passata_ms, esito = nuova.esito, "
        "dettaglio = nuova.dettaglio",
        (canale.NOME_PIANIFICATORE, ora, esito, dettaglio),
    )


def _riassunto(conteggi: Counter) -> str | None:
    if not conteggi:
        return None
    testo = ", ".join(f"{chiave} {n}" for chiave, n in sorted(conteggi.items()))
    return testo if len(testo) <= 255 else testo[:252] + "..."


def passata(
    conn,
    firma: invio.Firma,
    invia: Callable = invio.invia,
    orologio: Callable[[], int] | None = None,
) -> Counter:
    """One pass over doses and end notices, then the heartbeat (decision 9).

    orologio defaults to canale.adesso_ms, looked up at call time.
    """
    orologio = orologio or canale.adesso_ms
    conteggi: Counter = Counter()
    adesso = orologio()
    cur = conn.cursor(dictionary=True)
    try:
        _chiudi_sospesi(cur, adesso)
        conn.commit()
        cur.execute(_DOSI_DOVUTE, {"adesso": adesso, "tolleranza": canale.TOLLERANZA_PUSH_MS})
        voci = cur.fetchall()
        conn.commit()
        for voce in voci:
            conteggi[_tenta_dose(conn, cur, voce, firma, invia, orologio)] += 1
        cur.execute(_AVVISI_DOVUTI, {"adesso": adesso})
        avvisi = cur.fetchall()
        conn.commit()
        for avviso in avvisi:
            conteggi["avviso " + _tenta_avviso(conn, cur, avviso, firma, invia, orologio)] += 1
        if firma.motivo is None:
            _scrivi_battito(cur, orologio(), OK, _riassunto(conteggi))
        else:
            _scrivi_battito(cur, orologio(), CHIAVE_ASSENTE, firma.motivo)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
    return conteggi


def main() -> int:
    """The LaunchAgent's entry point: one pass, exit 0; 1 on error, said in the heartbeat."""
    try:
        conn = connection.apri_connessione()
    except Exception:
        traceback.print_exc()
        return 1
    try:
        firma = invio.prepara_firma(settings.VAPID_PEM_FILE, settings.VAPID_SUB)
        conteggi = passata(conn, firma)
    except Exception as exc:
        traceback.print_exc()
        try:
            cur = conn.cursor()
            _scrivi_battito(cur, canale.adesso_ms(), ERRORE, f"{type(exc).__name__}: {exc}"[:255])
            conn.commit()
            cur.close()
        except Exception:
            traceback.print_exc()
        return 1
    finally:
        conn.close()
    if conteggi:
        print(time.strftime("%Y-%m-%d %H:%M:%S"), _riassunto(conteggi), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
