-- Script pentru crearea bazei de date și tabelelor Volta
-- Rulează acest script în MySQL pentru a crea structura completă

-- Creează baza de date (dacă nu există)
CREATE DATABASE IF NOT EXISTS volta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Folosește baza de date
USE volta_db;

-- Tabela users (utilizatori)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nume VARCHAR(100) NOT NULL,
  prenume VARCHAR(100) NOT NULL,
  telefon VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  parola VARCHAR(255) NOT NULL,
  data_nasterii DATE DEFAULT NULL,
  sex CHAR(1) DEFAULT NULL COMMENT 'M sau F',
  puncte INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_telefon (telefon),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela notifications (notificări)
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT NULL COMMENT 'tip notificare: info, warning, success, etc.',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela promotions_home (promoții pentru pagina Home)
CREATE TABLE IF NOT EXISTS promotions_home (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  link VARCHAR(500) DEFAULT NULL,
  deadline DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deadline (deadline),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela promotions (toate promoțiile)
CREATE TABLE IF NOT EXISTS promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  image VARCHAR(500) DEFAULT NULL,
  image_home VARCHAR(500) DEFAULT NULL COMMENT 'Imagine pentru pagina Home',
  deadline DATETIME NOT NULL,
  link VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deadline (deadline),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela blog (articole blog)
CREATE TABLE IF NOT EXISTS blog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  author VARCHAR(100) DEFAULT NULL,
  excerpt VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela messages (mesaje între utilizatori și admin)
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

-- Date de test (opțional - poți șterge aceste linii dacă nu vrei date de test)

-- Utilizator de test
INSERT INTO users (nume, prenume, telefon, email, parola, data_nasterii, sex, puncte) 
VALUES ('Test', 'User', '+37312345678', 'test@volta.md', 'test123', '1990-01-01', 'M', 100)
ON DUPLICATE KEY UPDATE nume=nume;

-- Notificări de test
INSERT INTO notifications (title, message, type) VALUES
('Bun venit!', 'Bine ai venit în aplicația Volta!', 'info'),
('Reducere specială', 'Ai 10% reducere la următoarea achiziție!', 'success'),
('Program nou', 'Volta Centru este deschis acum până la ora 20:00!', 'info')
ON DUPLICATE KEY UPDATE title=title;

-- Promoții de test pentru Home
INSERT INTO promotions_home (title, image_url, link, deadline) VALUES
('Reducere 20%', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Reducere+20%25', 'https://volta.md', DATE_ADD(NOW(), INTERVAL 7 DAY)),
('Oferta specială', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Oferta+Speciala', 'https://volta.md', DATE_ADD(NOW(), INTERVAL 3 DAY))
ON DUPLICATE KEY UPDATE title=title;

-- Promoții de test
INSERT INTO promotions (title, image, deadline) VALUES
('Reducere 20%', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Reducere+20%25', DATE_ADD(NOW(), INTERVAL 7 DAY)),
('Oferta specială', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Oferta+Speciala', DATE_ADD(NOW(), INTERVAL 3 DAY)),
('Black Friday', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Black+Friday', DATE_ADD(NOW(), INTERVAL 14 DAY))
ON DUPLICATE KEY UPDATE title=title;

-- Articole blog de test
INSERT INTO blog (title, content, image_url, author, excerpt) VALUES
('Bun venit la Volta!', 'Acesta este primul nostru articol despre Volta. Aici vei găsi toate noutățile și ofertele speciale.', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Blog+Post+1', 'Echipa Volta', 'Primul articol despre Volta'),
('Cum să folosești aplicația', 'În acest articol vei învăța cum să folosești aplicația Volta pentru a beneficia de toate ofertele.', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Blog+Post+2', 'Echipa Volta', 'Ghid pentru utilizarea aplicației')
ON DUPLICATE KEY UPDATE title=title;

-- Verifică structura
SHOW TABLES;

-- Afișează structura tabelelor
DESCRIBE users;
DESCRIBE notifications;
DESCRIBE promotions_home;
DESCRIBE promotions;
DESCRIBE blog;
DESCRIBE messages;

