-- F3-S3-beta CP1 idempotency_marker v01
-- v02_unique_log.sql
-- Adds UNIQUE constraint (utente_id, farmaco_id, data, dose_numero) to
-- log_assunzioni, enabling clean upsert semantics for /saltata, /sospesa
-- and well-defined slot identity for /undo, /recupero lookups.
--
-- Pre-condition: no duplicate slot rows (asserted in apply wrapper).
-- Idempotent: apply wrapper checks information_schema.STATISTICS first.

ALTER TABLE log_assunzioni
  ADD UNIQUE INDEX idx_log_slot_unique (utente_id, farmaco_id, data, dose_numero);
