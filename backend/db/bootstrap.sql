-- bootstrap.sql -- PharmaTimer F3-S1 R1 (CP1-bis post user-collapse)
-- Cleanup DB residui par.22.36 + collapse user pharmatimer_app -> pharmatimer (no suffisso)
-- s.6.222: rename sub-decisione naming β.1.a' -> β.1.a'' (coerente Mini prod F3-S6 par.22.78-bis)
-- s.6.223: cleanup user residuo pharmatimer@localhost par.22.36 (post-5-mesi)
-- Credenziale pharmatimer_dev_2026: dev-only Studio-localhost, NON riusabile F3-S6 Mini prod (SD.1)
-- Eseguito come MySQL root su Studio, distrugge dati esistenti pharmatimer_dev + pharmatimer_test

DROP DATABASE IF EXISTS pharmatimer_dev;
DROP DATABASE IF EXISTS pharmatimer_test;

CREATE DATABASE pharmatimer_dev
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE pharmatimer_test
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'pharmatimer'@'localhost';
DROP USER IF EXISTS 'pharmatimer_app'@'localhost';

CREATE USER 'pharmatimer'@'localhost'
  IDENTIFIED WITH caching_sha2_password BY 'pharmatimer_dev_2026';

GRANT ALL PRIVILEGES ON pharmatimer_dev.* TO 'pharmatimer'@'localhost';
GRANT ALL PRIVILEGES ON pharmatimer_test.* TO 'pharmatimer'@'localhost';

FLUSH PRIVILEGES;
