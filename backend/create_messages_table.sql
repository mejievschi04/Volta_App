-- Script pentru crearea tabelei messages
-- Rulează acest script în MySQL dacă tabelul messages nu există

USE volta_db;

-- Creează tabelul messages dacă nu există
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL COMMENT 'ID utilizator (NULL pentru mesaje anonime)',
  message TEXT NOT NULL,
  is_from_admin BOOLEAN DEFAULT FALSE COMMENT 'TRUE dacă mesajul este de la admin, FALSE dacă este de la utilizator',
  `read` BOOLEAN DEFAULT FALSE COMMENT 'TRUE dacă mesajul a fost citit de admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_from_admin (is_from_admin),
  INDEX idx_read (`read`),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verifică dacă tabelul a fost creat
SELECT 'Tabelul messages a fost creat cu succes!' AS Status;
DESCRIBE messages;

