-- 02_create_user.sql -- PharmaTimer F3-S1-bis Docker init
-- Eseguito automaticamente da mysql:9.6 entrypoint al primo boot (skippato se volume gia popolato)
-- User pharmatimer@% (no host restriction, Docker network isolation gia presente)
-- Credenziale dev-only Studio-localhost, NON riusabile F3-S6 Mini prod (s.6.222 SD.1)
-- GRANT su pharmatimer_dev + pharmatimer_test, plugin caching_sha2_password

CREATE USER IF NOT EXISTS 'pharmatimer'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'pharmatimer_dev_2026';

GRANT ALL PRIVILEGES ON pharmatimer_dev.* TO 'pharmatimer'@'%';
GRANT ALL PRIVILEGES ON pharmatimer_test.* TO 'pharmatimer'@'%';

FLUSH PRIVILEGES;
