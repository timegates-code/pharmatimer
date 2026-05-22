"""Seed owner user — first-run CLI script (F3-S1-bis-gamma CP2).

Usage:
    OWNER_NAME=Roberto venv/bin/python seed_owner.py

Generates 32-byte URL-safe token (printed once), stores SHA-256 hash in DB.
Idempotent: aborts with exit 1 if owner already exists.
"""
import hashlib
import os
import secrets
import sys

import mysql.connector

from pharmatimer_api.config import settings


def main() -> int:
    owner_name = os.environ.get("OWNER_NAME", "Owner")

    conn = mysql.connector.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        charset="utf8mb4",
        autocommit=False,
    )
    try:
        cur = conn.cursor()

        # Idempotency check: refuse if any owner already exists.
        cur.execute("SELECT COUNT(*) FROM utenti WHERE ruolo = 'owner'")
        (count,) = cur.fetchone()
        if count > 0:
            print("ERROR: Owner gia esistente, no-op (vincolo applicativo 1 owner per DB).", file=sys.stderr)
            return 1

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        cur.execute(
            "INSERT INTO utenti (nome_visualizzato, ruolo, token_hash, attivo) "
            "VALUES (%s, 'owner', %s, TRUE)",
            (owner_name, token_hash),
        )
        owner_id = cur.lastrowid

        # Self-permission: caregiver = paziente = owner, admin, no self-notifications.
        cur.execute(
            "INSERT INTO permessi (caregiver_id, paziente_id, permesso, notifiche_caregiver_attive) "
            "VALUES (%s, %s, 'admin', FALSE)",
            (owner_id, owner_id),
        )

        conn.commit()

        print(f"Owner creato: id={owner_id} nome='{owner_name}'")
        print("Token utente (copia ORA, non sara mostrato di nuovo):")
        print(token)
        print("Usa questo valore come VITE_USER_TOKEN nel build PWA.")
        return 0
    except Exception as exc:
        conn.rollback()
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
