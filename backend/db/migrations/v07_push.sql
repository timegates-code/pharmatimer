-- v07_push.sql
-- Web Push reminder channel, branch A: decisions 8, 9, 11 and 12 of
-- STATO_CORRENTE.md, ratified 2026-09-17 (8) and 2026-09-29 (9, 11, 12).
-- ADDITIVE ONLY: five new tables, five new columns on push_subscriptions and
-- their indexes. log_assunzioni and the other v01-v06 tables are not touched.
--
-- Instants the channel compares with a clock are BIGINT milliseconds since the
-- Unix epoch, UTC (suffix _ms). The rest of the schema holds naive wall-clock
-- DATETIME values (backend/pharmatimer_api/tempo.py): a UTC instant kept in a
-- DATETIME next to them, read or written with NOW(), would move a push by one
-- or two hours, and an early push is M1. The only wall-clock DATETIME here is
-- ora_ricalcolata, a copy of log_assunzioni.ora_ricalcolata that decision 11
-- compares with the log by equality, never converts.
--
-- Applied by apply_v07_push.py (Studio: dev and test) and apply_v07_prod.py
-- (Mini), one statement at a time with an idempotency probe each. CI runs this
-- file as is on a fresh database (.github/workflows/gate.yml): keep one
-- statement per ALTER and plain SQL only.

-- 1. push_subscriptions (v01): additive columns.
-- endpoint_hash is the SHA-256 hex of endpoint. The endpoint column has a
-- case-insensitive collation while a push endpoint is case-sensitive, so the
-- uniqueness lives on the hash. NOT NULL without a default: both appliers
-- refuse to add it while push_subscriptions holds rows.
ALTER TABLE push_subscriptions ADD COLUMN endpoint_hash CHAR(64) NOT NULL;
ALTER TABLE push_subscriptions ADD UNIQUE INDEX uq_push_sub_endpoint_hash (endpoint_hash);
-- device_id: the phone's own id, so that one phone keeps one active subscription.
ALTER TABLE push_subscriptions ADD COLUMN device_id CHAR(36) NULL;
ALTER TABLE push_subscriptions ADD INDEX idx_push_sub_utente_device (utente_id, device_id);
-- When and why the channel went off, and when the phone last confirmed it (I3).
ALTER TABLE push_subscriptions ADD COLUMN disattivata_ms BIGINT NULL;
ALTER TABLE push_subscriptions ADD COLUMN motivo_disattivazione VARCHAR(40) NULL;
ALTER TABLE push_subscriptions ADD COLUMN confermata_ms BIGINT NULL;

-- 2. push_pubblicazioni: the last calendar publication the server received,
-- one row per user, rewritten at every publication. avviso_fine_ms is the
-- end-of-horizon notice instant and avviso_fine_entro_ms its deadline, both
-- computed by the phone outside the sleep window (decision 12).
CREATE TABLE IF NOT EXISTS push_pubblicazioni (
  utente_id INT NOT NULL,
  device_id CHAR(36) NULL,
  pubblicata_ms BIGINT NOT NULL,
  orizzonte_fino_ms BIGINT NOT NULL,
  avviso_fine_ms BIGINT NOT NULL,
  avviso_fine_entro_ms BIGINT NOT NULL,
  voci INT NOT NULL,
  PRIMARY KEY (utente_id),
  CONSTRAINT fk_push_pub_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. push_calendario: the current calendar of a user, replaced as a whole at
-- every publication. Same key as idx_log_slot_unique (v02). ora_ricalcolata is
-- the wall-clock value the phone computed istante_ms from, NULL for a dose that
-- is only prevista (decision 11).
CREATE TABLE IF NOT EXISTS push_calendario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  farmaco_id INT NOT NULL,
  data DATE NOT NULL,
  dose_numero INT NOT NULL,
  istante_ms BIGINT NOT NULL,
  ora_ricalcolata DATETIME NULL,
  titolo VARCHAR(100) NOT NULL,
  corpo VARCHAR(255) NOT NULL,
  UNIQUE INDEX uq_push_cal_slot (utente_id, farmaco_id, data, dose_numero),
  INDEX idx_push_cal_istante (istante_ms),
  CONSTRAINT fk_push_cal_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_push_cal_farmaco FOREIGN KEY (farmaco_id) REFERENCES farmaci(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. push_dispatch: one decision per dose and per phone, inserted BEFORE the
-- POST, so a dose reaches a phone at most once. A 201 is 'accettato', never
-- delivered: the channel register does not call a 201 'consegnato' (decision
-- 2). letto_* is what the re-read of the log saw at fire time; forma says
-- whether a dose push or a neutral notice left (decision 11). Once a dose has
-- its row, a later republication does not send it again.
CREATE TABLE IF NOT EXISTS push_dispatch (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  utente_id INT NOT NULL,
  farmaco_id INT NOT NULL,
  data DATE NOT NULL,
  dose_numero INT NOT NULL,
  istante_ms BIGINT NOT NULL,
  pubblicata_ora_ricalcolata DATETIME NULL,
  letto_stato ENUM('prevista','presa','saltata','sospesa','ricalcolata') NULL,
  letto_ora_ricalcolata DATETIME NULL,
  forma ENUM('dose','avviso_neutro') NULL,
  stato ENUM('in_invio','accettato','da_ritentare','respinto','non_inviato') NOT NULL,
  motivo VARCHAR(40) NULL,
  http_status SMALLINT NULL,
  dettaglio VARCHAR(255) NULL,
  ttl_s INT NULL,
  deciso_ms BIGINT NOT NULL,
  inviato_ms BIGINT NULL,
  UNIQUE INDEX uq_push_dispatch_slot (subscription_id, farmaco_id, data, dose_numero),
  INDEX idx_push_dispatch_utente (utente_id, deciso_ms),
  CONSTRAINT fk_push_dispatch_sub FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_push_dispatch_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_push_dispatch_farmaco FOREIGN KEY (farmaco_id) REFERENCES farmaci(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. push_avvisi_fine: end-of-horizon notices (decision 12), one decision per
-- notice instant and per phone. A table of its own because a MySQL UNIQUE
-- admits many NULLs (v06_client_op_id.sql): a dose-less row inside
-- push_dispatch would escape its at-most-once key.
CREATE TABLE IF NOT EXISTS push_avvisi_fine (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  utente_id INT NOT NULL,
  avviso_fine_ms BIGINT NOT NULL,
  entro_ms BIGINT NOT NULL,
  stato ENUM('in_invio','accettato','da_ritentare','respinto','non_inviato') NOT NULL,
  motivo VARCHAR(40) NULL,
  http_status SMALLINT NULL,
  dettaglio VARCHAR(255) NULL,
  ttl_s INT NULL,
  deciso_ms BIGINT NOT NULL,
  inviato_ms BIGINT NULL,
  UNIQUE INDEX uq_push_avviso_fine (subscription_id, avviso_fine_ms),
  CONSTRAINT fk_push_avviso_sub FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_push_avviso_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. push_pianificatore: the planner's heartbeat (decision 9), one row per
-- planner. No row is seeded: an empty table reads as 'never started'.
CREATE TABLE IF NOT EXISTS push_pianificatore (
  nome VARCHAR(40) NOT NULL,
  ultima_passata_ms BIGINT NOT NULL,
  esito VARCHAR(40) NOT NULL,
  dettaglio VARCHAR(255) NULL,
  PRIMARY KEY (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
