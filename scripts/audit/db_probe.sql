-- PharmaTimer -- sonda di audit sul DB. SOLA LETTURA: nessuna DDL, nessuna DML.
-- Uso dal Terminale (Studio, dev):
--   /usr/local/mysql/bin/mysql --defaults-file="$HOME/.my.cnf" pharmatimer_dev \
--     < scripts/audit/db_probe.sql > /tmp/pt_db_probe.txt 2>&1 ; cat /tmp/pt_db_probe.txt
-- Per la produzione, via ssh mini, sostituire il binario e il DB come da CLAUDE.md sez. 11.
-- Ogni blocco stampa una intestazione, cosi un salto si vede invece di doversi sospettare.
-- Ogni blocco di anomalia stampa anche il proprio DENOMINATORE: uno zero senza
-- il totale righe non distingue i due esiti e quindi non e una misura.

SELECT '=== P0 CENSIMENTO: righe per tabella (DENOMINATORE di ogni blocco che segue) ===' AS blocco;
-- Un conteggio di anomalie senza il totale righe NON e una misura: su una tabella
-- vuota lo zero e compatibile sia con dati puliti sia con dati sporchi mai scritti.
-- Misurato a par.22.198-unoctogies: il dev aveva log_assunzioni VUOTA e sei blocchi
-- a zero sembravano una promozione. Da qui in poi ogni blocco porta il proprio totale.
SELECT 'utenti' AS tabella, COUNT(*) AS righe FROM utenti
UNION ALL SELECT 'farmaci', COUNT(*) FROM farmaci
UNION ALL SELECT 'orari_base', COUNT(*) FROM orari_base
UNION ALL SELECT 'log_assunzioni', COUNT(*) FROM log_assunzioni
UNION ALL SELECT 'profilo_utente', COUNT(*) FROM profilo_utente
UNION ALL SELECT 'impostazioni_app', COUNT(*) FROM impostazioni_app
UNION ALL SELECT 'permessi', COUNT(*) FROM permessi
UNION ALL SELECT 'push_subscriptions', COUNT(*) FROM push_subscriptions;

SELECT '=== P0b STATO DELLE MIGRAZIONI: quali sono applicate su QUESTO DB ===' AS blocco;
-- Derivato per FIRMA (colonna o indice) e non da una tabella di versioni, che
-- non esiste. Misurato a par.22.198-unoctogies: il Mini di PRODUZIONE non aveva
-- v06, e la sonda se ne accorgeva solo abortendo a P3g su colonna assente.
-- Un difetto di schieramento deve comparire come DATO in testa, non come crash.
SELECT 'v02 -- UNIQUE slot' AS migrazione,
       IF((SELECT COUNT(*) FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='log_assunzioni'
             AND INDEX_NAME='idx_log_slot_unique') > 0, 'APPLICATA', 'ASSENTE') AS stato
UNION ALL
SELECT 'v04 -- ora_ricalcolata DATETIME',
       IF((SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='log_assunzioni'
             AND COLUMN_NAME='ora_ricalcolata' AND DATA_TYPE='datetime') > 0, 'APPLICATA', 'ASSENTE')
UNION ALL
SELECT 'v05 -- orari_base.data_specifica',
       IF((SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orari_base'
             AND COLUMN_NAME='data_specifica') > 0, 'APPLICATA', 'ASSENTE')
UNION ALL
SELECT 'v06 -- log_assunzioni.client_op_id',
       IF((SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='log_assunzioni'
             AND COLUMN_NAME='client_op_id') > 0, 'APPLICATA', 'ASSENTE')
UNION ALL
SELECT 'v06 -- UNIQUE targa',
       IF((SELECT COUNT(*) FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='log_assunzioni'
             AND INDEX_NAME='idx_log_client_op_unique') > 0, 'APPLICATA', 'ASSENTE');

SELECT '=== P1 SCHEMA REALE: colonne di log_assunzioni ===' AS blocco;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'log_assunzioni'
ORDER BY ORDINAL_POSITION;

SELECT '=== P1b SCHEMA REALE: tutte le tabelle e il conteggio colonne ===' AS blocco;
SELECT TABLE_NAME, COUNT(*) AS n_colonne
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
GROUP BY TABLE_NAME ORDER BY TABLE_NAME;

SELECT '=== P2a VINCOLI: indici unici su log_assunzioni ===' AS blocco;
SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS colonne
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'log_assunzioni'
GROUP BY INDEX_NAME, NON_UNIQUE ORDER BY NON_UNIQUE, INDEX_NAME;

SELECT '=== P2b VINCOLI: tutte le chiavi esterne del DB ===' AS blocco;
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

SELECT '=== P2c VINCOLI: regole ON DELETE / ON UPDATE ===' AS blocco;
SELECT CONSTRAINT_NAME, TABLE_NAME, DELETE_RULE, UPDATE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() ORDER BY TABLE_NAME;

SELECT '=== P3a ORFANI: log verso farmaci inesistenti (atteso 0) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM log_assunzioni) AS righe_esaminate,
       COUNT(*) AS orfani_log_farmaco
FROM log_assunzioni l LEFT JOIN farmaci f ON f.id = l.farmaco_id WHERE f.id IS NULL;

SELECT '=== P3b ORFANI: log verso utenti inesistenti (atteso 0) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM log_assunzioni) AS righe_esaminate,
       COUNT(*) AS orfani_log_utente
FROM log_assunzioni l LEFT JOIN utenti u ON u.id = l.utente_id WHERE u.id IS NULL;

SELECT '=== P3c ORFANI: orari_base verso farmaci inesistenti (atteso 0) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM orari_base) AS righe_esaminate,
       COUNT(*) AS orfani_orari
FROM orari_base o LEFT JOIN farmaci f ON f.id = o.farmaco_id WHERE f.id IS NULL;

SELECT '=== P3d COERENZA CLINICA: righe presa senza ora_effettiva (M3, atteso 0) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM log_assunzioni WHERE stato = 'presa') AS righe_presa_esaminate,
       COUNT(*) AS presa_senza_ora
FROM log_assunzioni WHERE stato = 'presa' AND ora_effettiva IS NULL;

SELECT '=== P3e COERENZA CLINICA: doppio slot (M1, atteso 0 -- lo indice unico lo vieta) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM log_assunzioni) AS righe_esaminate,
       (SELECT COUNT(*) FROM (SELECT 1 FROM log_assunzioni
          GROUP BY utente_id, farmaco_id, data, dose_numero HAVING COUNT(*) > 1) d)
       AS slot_duplicati;
SELECT utente_id, farmaco_id, data, dose_numero, COUNT(*) AS n
FROM log_assunzioni GROUP BY utente_id, farmaco_id, data, dose_numero
HAVING n > 1;

SELECT '=== P3f COERENZA CLINICA: ricalcolata senza ora_ricalcolata (atteso 0) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM log_assunzioni WHERE stato = 'ricalcolata') AS righe_ricalcolata_esaminate,
       COUNT(*) AS ricalcolata_senza_ora
FROM log_assunzioni WHERE stato = 'ricalcolata' AND ora_ricalcolata IS NULL;

SELECT '=== P3g TARGA: quante righe senza client_op_id (TOLLERANTE) ===' AS blocco;
-- La colonna esiste solo dove v06 e applicata. Senza questa guardia il client
-- mysql abortisce e TUTTI i blocchi successivi non vengono eseguiti: un difetto
-- di schieramento cancellava le misure sul fuso, che non ne dipendono.
SET @ha_targa := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'log_assunzioni'
    AND COLUMN_NAME = 'client_op_id');
SET @q := IF(@ha_targa > 0,
  'SELECT SUM(client_op_id IS NULL) AS senza_targa, SUM(client_op_id IS NOT NULL) AS con_targa, COUNT(*) AS totale FROM log_assunzioni',
  'SELECT ''v06 NON APPLICATA: colonna client_op_id assente'' AS esito, (SELECT COUNT(*) FROM log_assunzioni) AS totale_righe, ''nessuna presa e idempotente per targa su questo DB'' AS conseguenza');
PREPARE st FROM @q; EXECUTE st; DEALLOCATE PREPARE st;

SELECT '=== P4a FUSO: fuso della sessione e del sistema ===' AS blocco;
SELECT @@global.time_zone AS tz_globale, @@session.time_zone AS tz_sessione, NOW() AS adesso, UTC_TIMESTAMP() AS adesso_utc;

SELECT '=== P4b FUSO: prese cadute nelle ore di cambio ora legale (2026) ===' AS blocco;
-- Non dipende da v06: usa solo colonne presenti in ogni versione dello schema.
SELECT (SELECT COUNT(*) FROM log_assunzioni) AS righe_esaminate,
       (SELECT COUNT(*) FROM log_assunzioni
         WHERE data IN ('2026-03-29','2026-10-25','2025-03-30','2025-10-26')) AS righe_in_finestra;
SELECT id, data, dose_numero, ora_prevista, ora_effettiva, stato
FROM log_assunzioni
WHERE data IN ('2026-03-29','2026-10-25','2025-03-30','2025-10-26')
ORDER BY data, ora_prevista;

SELECT '=== P4c FUSO: ora_effettiva fuori dal giorno dichiarato in data (atteso 0) ===' AS blocco;
SELECT (SELECT COUNT(*) FROM log_assunzioni WHERE ora_effettiva IS NOT NULL) AS righe_con_ora_esaminate,
       COUNT(*) AS effettiva_fuori_giorno
FROM log_assunzioni WHERE ora_effettiva IS NOT NULL AND DATE(ora_effettiva) <> data;

SELECT '=== FINE SONDA ===' AS blocco;
