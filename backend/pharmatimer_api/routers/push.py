"""
PharmaTimer -- Web Push reminder channel, branch A: the API half.
Decisions 2, 8, 9, 11, 12, 15 and 16 of STATO_CORRENTE.md.

GET    /api/push/chiave                  VAPID public key; 503 without a usable PEM (15)
PUT    /api/push/iscrizione              this phone's subscription, upserted (2, v07)
DELETE /api/push/iscrizione/{device_id}  this phone's subscription off (the toggle)
PUT    /api/push/calendario              the phone's resolved calendar, replaced whole (8, 11, 12)
GET    /api/push/stato                   key, heartbeat, subscriptions, publication, outcomes (9, 15, 16)

The server computes no time here (decision 8): it stores the instants the
phone computed, and reads its own clock only to stamp what it receives. The
sending is the planner's, a separate process (decision 9). SQL lives in the
router (CLAUDE.md section 13).

Two shapes are forced by apiClient.js, which is VIETATO. Every 5xx reaches
the client as DB_UNAVAILABLE and only the message survives (:123-130), so the
reason the channel is off travels in a 200, from /stato. apiClient.delete
sends no body (:143), so the subscription to turn off is named by device_id in
the path.
"""
import hashlib
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api import canale
from pharmatimer_api.config import settings
from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.push import (
    AvvisoFineResponse,
    BattitoResponse,
    CalendarioPayload,
    CanaleResponse,
    ChiaveResponse,
    InvioResponse,
    IscrizionePayload,
    IscrizioneResponse,
    PubblicazioneResponse,
    StatoCanaleResponse,
)

router = APIRouter(prefix="/api", tags=["push"])

# How much history /stato returns for the Impostazioni screen (I3).
ISCRIZIONI_MAX = 20
INVII_MAX = 50
AVVISI_FINE_MAX = 10

_COLONNE_ISCRIZIONE = (
    "device_id, device_label, attiva, confermata_ms, disattivata_ms, motivo_disattivazione"
)
_COLONNE_PUBBLICAZIONE = (
    "device_id, pubblicata_ms, orizzonte_fino_ms, avviso_fine_ms, avviso_fine_entro_ms, voci"
)


@router.get("/push/chiave", response_model=ChiaveResponse)
def chiave(current_user: CurrentUser = Depends(get_current_user)) -> ChiaveResponse:
    """The VAPID public key the phone passes to subscribe().

    Without a readable P-256 PEM the channel is off and says so with a 503
    (decision 15). DB_UNAVAILABLE is the only 503 of the cemented vocabulary,
    and the client collapses every 5xx onto it anyway; the reason is in the
    message here and, readable, in /stato.
    """
    stato = canale.stato_chiave(settings.VAPID_PEM_FILE, settings.VAPID_SUB)
    if stato.chiave_pubblica is None:
        raise RepositoryError(
            code=RepositoryErrorCode.DB_UNAVAILABLE,
            message=f"Canale dei promemoria spento: chiave VAPID assente ({stato.motivo})",
        )
    return ChiaveResponse(chiave_pubblica=stato.chiave_pubblica)


@router.put("/push/iscrizione", response_model=IscrizioneResponse)
def iscrivi(
    payload: IscrizionePayload,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> IscrizioneResponse:
    """Upsert this phone's subscription and confirm it (decision 2: at every opening).

    The row is found by the hash of the endpoint (v07: the endpoint column is
    case-insensitive, a push endpoint is not). An endpoint belongs to the user
    who confirms it last: one browser holds one token at a time. Any other
    active subscription of the same phone is turned off as 'sostituita', so a
    phone never holds two and a dose never reaches it twice (v07).
    created_at keeps the row's first creation.
    """
    adesso = canale.adesso_ms()
    endpoint_hash = hashlib.sha256(payload.endpoint.encode("utf-8")).hexdigest()
    device_id = str(payload.device_id)
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "INSERT INTO push_subscriptions ("
            "utente_id, endpoint, p256dh_key, auth_key, device_label, attiva, "
            "endpoint_hash, device_id, confermata_ms"
            ") VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, %s) AS nuova "
            "ON DUPLICATE KEY UPDATE "
            "utente_id = nuova.utente_id, endpoint = nuova.endpoint, "
            "p256dh_key = nuova.p256dh_key, auth_key = nuova.auth_key, "
            "device_label = COALESCE(nuova.device_label, push_subscriptions.device_label), "
            "attiva = TRUE, device_id = nuova.device_id, disattivata_ms = NULL, "
            "motivo_disattivazione = NULL, confermata_ms = nuova.confermata_ms",
            (
                current_user.id,
                payload.endpoint,
                payload.keys.p256dh,
                payload.keys.auth,
                payload.device_label,
                endpoint_hash,
                device_id,
                adesso,
            ),
        )
        cur.execute(
            "UPDATE push_subscriptions SET attiva = FALSE, disattivata_ms = %s, "
            "motivo_disattivazione = 'sostituita' "
            "WHERE utente_id = %s AND device_id = %s AND attiva = TRUE AND endpoint_hash <> %s",
            (adesso, current_user.id, device_id, endpoint_hash),
        )
        cur.execute(
            f"SELECT {_COLONNE_ISCRIZIONE} FROM push_subscriptions WHERE endpoint_hash = %s",
            (endpoint_hash,),
        )
        riga = cur.fetchone()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
    return IscrizioneResponse(**riga)


@router.delete("/push/iscrizione/{device_id}", status_code=204)
def revoca(
    device_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> Response:
    """Turn off this phone's active subscription: the toggle off.

    204 whether or not one was active: afterwards none is, which is what the
    toggle asks. Only the rows of the current user and of this phone.
    """
    adesso = canale.adesso_ms()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE push_subscriptions SET attiva = FALSE, disattivata_ms = %s, "
            "motivo_disattivazione = 'revocata' "
            "WHERE utente_id = %s AND device_id = %s AND attiva = TRUE",
            (adesso, current_user.id, str(device_id)),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
    return Response(status_code=204)


@router.put("/push/calendario", response_model=PubblicazioneResponse)
def pubblica(
    payload: CalendarioPayload,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> PubblicazioneResponse:
    """Replace the user's calendar with the phone's, in one transaction.

    Decisions 8 and 12: the phone builds the plan and publishes the window the
    app shows, by effective instant; the server keeps the last publication
    only. A dose the new calendar does not carry is gone for the planner too.
    Every farmaco must be the user's; one that is not refuses the whole
    publication with 404 (security by obscurity, as in routers/orari.py) and
    the previous calendar stays as it was. pubblicata_ms is the server's
    receipt time.
    """
    adesso = canale.adesso_ms()
    farmaci = sorted({v.farmaco_id for v in payload.voci})
    cur = conn.cursor(dictionary=True)
    try:
        if farmaci:
            segnaposto = ", ".join(["%s"] * len(farmaci))
            cur.execute(
                f"SELECT id FROM farmaci WHERE utente_id = %s AND id IN ({segnaposto})",
                (current_user.id, *farmaci),
            )
            propri = {r["id"] for r in cur.fetchall()}
            estranei = [f for f in farmaci if f not in propri]
            if estranei:
                raise RepositoryError(
                    code=RepositoryErrorCode.NOT_FOUND,
                    message=f"Farmaco {estranei[0]} non trovato",
                )
        cur.execute("DELETE FROM push_calendario WHERE utente_id = %s", (current_user.id,))
        if payload.voci:
            cur.executemany(
                "INSERT INTO push_calendario ("
                "utente_id, farmaco_id, data, dose_numero, istante_ms, ora_ricalcolata, "
                "titolo, corpo"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                [
                    (
                        current_user.id,
                        v.farmaco_id,
                        v.data,
                        v.dose_numero,
                        v.istante_ms,
                        v.ora_ricalcolata,
                        v.titolo,
                        v.corpo,
                    )
                    for v in payload.voci
                ],
            )
        cur.execute(
            "INSERT INTO push_pubblicazioni ("
            "utente_id, device_id, pubblicata_ms, orizzonte_fino_ms, avviso_fine_ms, "
            "avviso_fine_entro_ms, voci"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s) AS nuova "
            "ON DUPLICATE KEY UPDATE "
            "device_id = nuova.device_id, pubblicata_ms = nuova.pubblicata_ms, "
            "orizzonte_fino_ms = nuova.orizzonte_fino_ms, avviso_fine_ms = nuova.avviso_fine_ms, "
            "avviso_fine_entro_ms = nuova.avviso_fine_entro_ms, voci = nuova.voci",
            (
                current_user.id,
                str(payload.device_id),
                adesso,
                payload.orizzonte_fino_ms,
                payload.avviso_fine_ms,
                payload.avviso_fine_entro_ms,
                len(payload.voci),
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
    return PubblicazioneResponse(
        device_id=str(payload.device_id),
        pubblicata_ms=adesso,
        orizzonte_fino_ms=payload.orizzonte_fino_ms,
        avviso_fine_ms=payload.avviso_fine_ms,
        avviso_fine_entro_ms=payload.avviso_fine_entro_ms,
        voci=len(payload.voci),
    )


@router.get("/push/stato", response_model=StatoCanaleResponse)
def stato(
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> StatoCanaleResponse:
    """Everything the app needs to tell the channel's state, always as a 200.

    The heartbeat's age is measured on the server clock only, both ends from
    the Mini: no skew with the phone's clock. When the planner never wrote
    its row, pianificatore is None. The threshold of an old heartbeat and its
    rendering belong to the client (condition of decision 9).
    """
    adesso = canale.adesso_ms()
    chiave_ = canale.stato_chiave(settings.VAPID_PEM_FILE, settings.VAPID_SUB)
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT ultima_passata_ms, esito, dettaglio FROM push_pianificatore WHERE nome = %s",
            (canale.NOME_PIANIFICATORE,),
        )
        battito = cur.fetchone()
        cur.execute(
            f"SELECT {_COLONNE_ISCRIZIONE} FROM push_subscriptions "
            "WHERE utente_id = %s ORDER BY id DESC LIMIT %s",
            (current_user.id, ISCRIZIONI_MAX),
        )
        iscrizioni = cur.fetchall()
        cur.execute(
            f"SELECT {_COLONNE_PUBBLICAZIONE} FROM push_pubblicazioni WHERE utente_id = %s",
            (current_user.id,),
        )
        pubblicazione = cur.fetchone()
        cur.execute(
            "SELECT s.device_id, d.farmaco_id, d.data, d.dose_numero, d.istante_ms, d.forma, "
            "d.stato, d.motivo, d.http_status, d.deciso_ms, d.inviato_ms "
            "FROM push_dispatch d JOIN push_subscriptions s ON s.id = d.subscription_id "
            "WHERE d.utente_id = %s ORDER BY d.deciso_ms DESC, d.id DESC LIMIT %s",
            (current_user.id, INVII_MAX),
        )
        invii = cur.fetchall()
        cur.execute(
            "SELECT s.device_id, a.avviso_fine_ms, a.entro_ms, a.stato, a.motivo, "
            "a.http_status, a.deciso_ms, a.inviato_ms "
            "FROM push_avvisi_fine a JOIN push_subscriptions s ON s.id = a.subscription_id "
            "WHERE a.utente_id = %s ORDER BY a.deciso_ms DESC, a.id DESC LIMIT %s",
            (current_user.id, AVVISI_FINE_MAX),
        )
        avvisi = cur.fetchall()
    finally:
        cur.close()
    return StatoCanaleResponse(
        ora_server_ms=adesso,
        tolleranza_min=canale.TOLLERANZA_PUSH_MIN,
        canale=CanaleResponse(attivo=chiave_.attivo, motivo=chiave_.motivo),
        pianificatore=None
        if battito is None
        else BattitoResponse(
            ultima_passata_ms=battito["ultima_passata_ms"],
            eta_ms=adesso - battito["ultima_passata_ms"],
            esito=battito["esito"],
            dettaglio=battito["dettaglio"],
        ),
        iscrizioni=[IscrizioneResponse(**r) for r in iscrizioni],
        pubblicazione=None if pubblicazione is None else PubblicazioneResponse(**pubblicazione),
        ultimi_invii=[InvioResponse(**r) for r in invii],
        ultimi_avvisi_fine=[AvvisoFineResponse(**r) for r in avvisi],
    )
