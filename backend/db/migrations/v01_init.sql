-- v01_init.sql -- PharmaTimer F3-S1 R1 schema multi-tenant
-- Applicato 2 volte: --database=pharmatimer_dev e --database=pharmatimer_test (parametrizzato chiamante)
-- 8 tabelle (F3-S1.I=a estende prompt letterale 7: s.6.220 impostazioni_app scoped multi-tenant)
-- Spec v1.4 sez. 3.1/3.4/3.5/3.6 (4 esistenti scoped utente_id) + 3.9/3.10/3.11 (3 NEW) + Changelog Fase 2 sez. 6.1 (impostazioni_app)
-- Charset utf8mb4 / Engine InnoDB / FK ON DELETE RESTRICT ON UPDATE CASCADE

-- =========================================================
-- 1. utenti (Spec sez. 3.9)
-- =========================================================
CREATE TABLE IF NOT EXISTS utenti (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_visualizzato VARCHAR(50) NOT NULL,
  ruolo ENUM('owner','paziente') NOT NULL,
  token_hash CHAR(64) NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_utenti_token_hash (token_hash),
  INDEX idx_utenti_ruolo (ruolo),
  INDEX idx_utenti_attivo (attivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 2. permessi (Spec sez. 3.10)
-- =========================================================
CREATE TABLE IF NOT EXISTS permessi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caregiver_id INT NOT NULL,
  paziente_id INT NOT NULL,
  permesso ENUM('read','write','admin') NOT NULL,
  notifiche_caregiver_attive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_permessi_pair (caregiver_id, paziente_id),
  INDEX idx_permessi_paziente (paziente_id),
  CONSTRAINT fk_permessi_caregiver FOREIGN KEY (caregiver_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_permessi_paziente FOREIGN KEY (paziente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 3. push_subscriptions (Spec sez. 3.11)
-- =========================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh_key VARCHAR(200) NOT NULL,
  auth_key VARCHAR(100) NOT NULL,
  device_label VARCHAR(100) NULL,
  attiva BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_push_utente_attiva (utente_id, attiva),
  CONSTRAINT fk_push_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 4. profilo_utente (Spec sez. 3.4 scoped utente_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS profilo_utente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  nome_profilo VARCHAR(50) NOT NULL,
  ora_sveglia TIME NOT NULL,
  ora_colazione TIME NOT NULL,
  ora_pranzo TIME NOT NULL,
  ora_cena TIME NOT NULL,
  ora_sonno TIME NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT FALSE,
  demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_profilo_utente_attivo (utente_id, attivo),
  CONSTRAINT fk_profilo_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 5. farmaci (Spec sez. 3.1 scoped utente_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS farmaci (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  principio_attivo VARCHAR(100) NULL,
  funzione VARCHAR(200) NULL,
  tipo_frequenza ENUM('intervallo','fisso') NOT NULL,
  intervallo_ore DECIMAL(4,1) NULL,
  intervallo_minimo_ore DECIMAL(4,1) NULL,
  dosi_giornaliere INT NOT NULL,
  relazione_pasto ENUM('prima','durante','dopo','stomaco_pieno','lontano','indifferente') NOT NULL,
  dettaglio_pasto VARCHAR(100) NULL,
  note TEXT NULL,
  data_inizio DATE NOT NULL,
  data_fine DATE NULL,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_farmaci_utente_attivo (utente_id, attivo),
  INDEX idx_farmaci_utente_periodo (utente_id, data_inizio, data_fine),
  CONSTRAINT fk_farmaci_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 6. orari_base (Spec sez. 3.5 scoped utente_id + farmaco_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS orari_base (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  farmaco_id INT NOT NULL,
  dose_numero INT NOT NULL,
  offset_minuti INT NOT NULL,
  ancora_riferimento ENUM('sveglia','colazione','pranzo','cena','sonno','assoluto') NOT NULL,
  ora_prevista TIME NOT NULL,
  descrizione_momento VARCHAR(100) NULL,
  INDEX idx_orari_utente_farmaco (utente_id, farmaco_id),
  INDEX idx_orari_utente_farmaco_dose (utente_id, farmaco_id, dose_numero),
  CONSTRAINT fk_orari_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orari_farmaco FOREIGN KEY (farmaco_id) REFERENCES farmaci(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 7. log_assunzioni (Spec sez. 3.6 scoped utente_id + farmaco_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS log_assunzioni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  farmaco_id INT NOT NULL,
  data DATE NOT NULL,
  dose_numero INT NOT NULL,
  ora_prevista TIME NOT NULL,
  ora_effettiva DATETIME NULL,
  delta_minuti INT NULL,
  ora_ricalcolata TIME NULL,
  gap_minuti INT NOT NULL DEFAULT 0,
  recupero_minuti INT NOT NULL DEFAULT 0,
  stato ENUM('prevista','presa','saltata','sospesa','ricalcolata') NOT NULL,
  note VARCHAR(200) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_utente_data (utente_id, data),
  INDEX idx_log_utente_farmaco_data (utente_id, farmaco_id, data),
  CONSTRAINT fk_log_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_log_farmaco FOREIGN KEY (farmaco_id) REFERENCES farmaci(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 8. impostazioni_app (Changelog Fase 2 sez. 6.1, scoped F3-S1.I=a s.6.220 NEW)
-- =========================================================
CREATE TABLE IF NOT EXISTS impostazioni_app (
  utente_id INT NOT NULL,
  chiave VARCHAR(100) NOT NULL,
  valore TEXT NULL,
  PRIMARY KEY (utente_id, chiave),
  CONSTRAINT fk_impost_utente FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
