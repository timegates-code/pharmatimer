-- v04_ora_ricalcolata_datetime.sql
-- ora_ricalcolata TIME -> DATETIME (Spec v1.13 sez.3.6; cross-midnight ISO round-trip, par.22.137 s.6.247).
-- Idempotency + skip are handled by apply_v04 (DATA_TYPE check); these statements are no-op-safe.
-- Backfill (D1(a)): runs AFTER the MODIFY. TIME() extracts the time-of-day that survives the
-- ALTER TIME->DATETIME conversion, then TIMESTAMP(data, ...) re-anchors it to the row's own date,
-- correcting the date the ALTER would otherwise assume. No-op when no rows have ora_ricalcolata.
ALTER TABLE log_assunzioni MODIFY COLUMN ora_ricalcolata DATETIME NULL;
UPDATE log_assunzioni SET ora_ricalcolata = TIMESTAMP(data, TIME(ora_ricalcolata)) WHERE ora_ricalcolata IS NOT NULL;
