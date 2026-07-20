-- v06_client_op_id.sql
-- OFFLINE-3 CS-2 (Spec v1.17 sez. 3.6 + sez. 14.6; deviazione s.6.257).
-- Idempotency + per-statement skip are handled by apply_v06_* (COLUMN / STATISTICS
-- checks); a bare re-run of these ADDs would error (1060 duplicate column /
-- 1061 duplicate key), so run ONLY via the wrapper.
--
-- Statement 1 (log_assunzioni.client_op_id): the client-op plate, a UUID v4 generated
-- by the client at touch time (Spec sez. 14.6). NULL for all existing rows (no
-- backfill), fully backward compatible: payloads without a plate stay valid.
-- Statement 2 (unique index on client_op_id): enables first-gesture dedupe of the 5
-- log verbs. MySQL UNIQUE admits multiple NULLs, so pre-v06 rows coexist untouched.
ALTER TABLE log_assunzioni ADD COLUMN client_op_id CHAR(36) NULL AFTER created_at;
ALTER TABLE log_assunzioni ADD UNIQUE INDEX idx_log_client_op_unique (client_op_id);
