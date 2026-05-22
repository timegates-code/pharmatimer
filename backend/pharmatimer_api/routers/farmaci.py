"""
PharmaTimer F3-S1-bis-delta CP3
GET /api/farmaci endpoint (auth scoped per utente).

Returns active farmaci of authenticated user only.
Filter: WHERE utente_id = current_user.id AND attivo = TRUE.
Order: nome ASC.
"""
from fastapi import APIRouter, Depends
from mysql.connector.pooling import PooledMySQLConnection

from pharmatimer_api.db.dependencies import CurrentUser, get_current_user, get_db
from pharmatimer_api.models.farmaco import FarmacoResponse


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
