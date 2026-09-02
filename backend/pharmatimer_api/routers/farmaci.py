"""
PharmaTimer F3-S1-bis-delta CP3
GET /api/farmaci endpoint (auth scoped per utente).

Returns active farmaci of authenticated user only.
Filter: WHERE utente_id = current_user.id AND attivo = TRUE.
Order: nome ASC.
"""
from fastapi import APIRouter, Depends, Response, status
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.exceptions import RepositoryError, RepositoryErrorCode
from pharmatimer_api.models.farmaco import (
    FarmacoCreate,
    FarmacoResponse,
    FarmacoUpdate,
)

router = APIRouter(prefix="/api", tags=["farmaci"])


@router.get("/farmaci", response_model=list[FarmacoResponse])
def list_farmaci(
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> list[FarmacoResponse]:
    """List active farmaci of authenticated user, ordered by nome ASC."""
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, utente_id, nome, principio_attivo, funzione, tipo_frequenza, "
            "intervallo_ore, intervallo_minimo_ore, dosi_giornaliere, relazione_pasto, "
            "dettaglio_pasto, note, data_inizio, data_fine, attivo, demo, "
            "created_at, updated_at "
            "FROM farmaci "
            "WHERE utente_id = %s AND attivo = TRUE "
            "ORDER BY nome ASC",
            (current_user.id,),
        )
        rows = cur.fetchall()
    finally:
        cur.close()

    return [FarmacoResponse(**row) for row in rows]


@router.post(
    "/farmaci",
    response_model=FarmacoResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_farmaco(
    payload: FarmacoCreate,
    response: Response,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> FarmacoResponse:
    """Create new farmaco scoped to authenticated user (F3-S2 CP1).

    Returns 201 Created + Location header + full FarmacoResponse body
    (RFC 7231 sez. 6.3.2; Q-E ratified par.11.D-S2).
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "INSERT INTO farmaci ("
            "utente_id, nome, principio_attivo, funzione, tipo_frequenza, "
            "intervallo_ore, intervallo_minimo_ore, dosi_giornaliere, relazione_pasto, "
            "dettaglio_pasto, note, data_inizio, data_fine, attivo, demo"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                current_user.id,
                payload.nome,
                payload.principio_attivo,
                payload.funzione,
                payload.tipo_frequenza,
                payload.intervallo_ore,
                payload.intervallo_minimo_ore,
                payload.dosi_giornaliere,
                payload.relazione_pasto,
                payload.dettaglio_pasto,
                payload.note,
                payload.data_inizio,
                payload.data_fine,
                payload.attivo,
                payload.demo,
            ),
        )
        farmaco_id = cur.lastrowid
        cur.execute(
            "SELECT id, utente_id, nome, principio_attivo, funzione, tipo_frequenza, "
            "intervallo_ore, intervallo_minimo_ore, dosi_giornaliere, relazione_pasto, "
            "dettaglio_pasto, note, data_inizio, data_fine, attivo, demo, "
            "created_at, updated_at "
            "FROM farmaci WHERE id = %s",
            (farmaco_id,),
        )
        row = cur.fetchone()
        conn.commit()
    finally:
        cur.close()

    response.headers["Location"] = f"/api/farmaci/{farmaco_id}"
    return FarmacoResponse(**row)


@router.put("/farmaci/{farmaco_id}", response_model=FarmacoResponse)
def update_farmaco(
    farmaco_id: int,
    payload: FarmacoUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> FarmacoResponse:
    """Full-replace update farmaco scoped to authenticated user (F3-S2 CP1).

    RFC 7231 PUT semantics. Raises RepositoryError NOT_FOUND when farmaco_id
    does not exist OR belongs to another user (security-by-obscurity).
    """
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "UPDATE farmaci SET "
            "nome = %s, principio_attivo = %s, funzione = %s, tipo_frequenza = %s, "
            "intervallo_ore = %s, intervallo_minimo_ore = %s, dosi_giornaliere = %s, "
            "relazione_pasto = %s, dettaglio_pasto = %s, note = %s, "
            "data_inizio = %s, data_fine = %s, attivo = %s, demo = %s "
            "WHERE id = %s AND utente_id = %s",
            (
                payload.nome,
                payload.principio_attivo,
                payload.funzione,
                payload.tipo_frequenza,
                payload.intervallo_ore,
                payload.intervallo_minimo_ore,
                payload.dosi_giornaliere,
                payload.relazione_pasto,
                payload.dettaglio_pasto,
                payload.note,
                payload.data_inizio,
                payload.data_fine,
                payload.attivo,
                payload.demo,
                farmaco_id,
                current_user.id,
            ),
        )
        if cur.rowcount == 0:
            conn.rollback()
            raise RepositoryError(
                code=RepositoryErrorCode.NOT_FOUND,
                message=f"Farmaco {farmaco_id} non trovato",
            )
        cur.execute(
            "SELECT id, utente_id, nome, principio_attivo, funzione, tipo_frequenza, "
            "intervallo_ore, intervallo_minimo_ore, dosi_giornaliere, relazione_pasto, "
            "dettaglio_pasto, note, data_inizio, data_fine, attivo, demo, "
            "created_at, updated_at "
            "FROM farmaci WHERE id = %s",
            (farmaco_id,),
        )
        row = cur.fetchone()
        conn.commit()
    finally:
        cur.close()

    return FarmacoResponse(**row)


@router.delete(
    "/farmaci/{farmaco_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_farmaco(
    farmaco_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    conn: PooledMySQLConnection = Depends(get_db),
) -> Response:
    """Soft delete: set attivo=FALSE scoped to authenticated user (F3-S2 CP1).

    F3-S2.B + F3-S2.B-bis ratified par.11.D-S2: returns 404 NOT_FOUND when farmaco
    does not exist OR is already inactive (coherent with GET scope attivo=TRUE).
    """
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE farmaci SET attivo = FALSE "
            "WHERE id = %s AND utente_id = %s AND attivo = TRUE",
            (farmaco_id, current_user.id),
        )
        if cur.rowcount == 0:
            conn.rollback()
            raise RepositoryError(
                code=RepositoryErrorCode.NOT_FOUND,
                message=f"Farmaco {farmaco_id} non trovato o gia inattivo",
            )
        conn.commit()
    finally:
        cur.close()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
