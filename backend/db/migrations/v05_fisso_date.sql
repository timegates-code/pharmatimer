-- v05_fisso_date.sql
-- F14 Blocco 2 (Spec v1.15 sez. 3.1 + 3.5; modello fisso_date, par.22.148).
-- Idempotency + per-statement skip are handled by apply_v05 (COLUMN_TYPE / column-exists checks);
-- these statements are no-op-safe to re-run only via the wrapper (a bare re-run of ADD COLUMN errors 1060).
--
-- Statement 1 (farmaci.tipo_frequenza): add the 'fisso_date' enum value. Pure widening of the
-- ENUM domain, retro-compatible: existing 'intervallo'/'fisso' rows are untouched.
-- Statement 2 (orari_base.data_specifica): NULL = recurring row (preexisting fisso/intervallo
-- behaviour); valued = single occurrence on that date (tipo_frequenza='fisso_date',
-- ancora_riferimento='assoluto'). No existing row is modified (default NULL).
ALTER TABLE farmaci MODIFY COLUMN tipo_frequenza ENUM('intervallo','fisso','fisso_date') NOT NULL;
ALTER TABLE orari_base ADD COLUMN data_specifica DATE NULL AFTER descrizione_momento;
