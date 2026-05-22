-- 01_create_databases.sql -- PharmaTimer F3-S1-bis Docker init
-- Eseguito automaticamente da mysql:9.6 entrypoint al primo boot (skippato se volume gia popolato)
-- Crea 2 DB pharmatimer_dev + pharmatimer_test, charset utf8mb4 unicode_ci
-- Schema 8 tabelle multi-tenant applicato post-init via mysql client (v01_init.sql Step 3)

CREATE DATABASE IF NOT EXISTS pharmatimer_dev
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS pharmatimer_test
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
