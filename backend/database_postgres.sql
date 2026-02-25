-- Script pentru crearea bazei de date și tabelelor Volta în PostgreSQL
-- Rulează acest script în PostgreSQL pentru a crea structura completă

-- Creează baza de date (rulează acest lucru separat, deoarece nu poți folosi CREATE DATABASE într-un bloc de tranzacție)
-- psql -U postgres -c "CREATE DATABASE volta_db;"

-- Conectează-te la baza de date volta_db înainte de a rula restul scriptului
-- psql -U postgres -d volta_db -f database_postgres.sql

-- Tabela users (utilizatori)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nume VARCHAR(100) NOT NULL,
  prenume VARCHAR(100) NOT NULL,
  telefon VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  parola VARCHAR(255) NOT NULL,
  data_nasterii DATE DEFAULT NULL,
  sex CHAR(1) DEFAULT NULL,
  puncte INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN users.sex IS 'M sau F';
COMMENT ON COLUMN users.telefon IS 'Număr de telefon unic';

-- Creează indexuri pentru users
CREATE INDEX IF NOT EXISTS idx_users_telefon ON users(telefon);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Funcție trigger pentru actualizarea automată a updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pentru actualizarea automată a updated_at în users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabela notifications (notificări)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN notifications.type IS 'tip notificare: info, warning, success, etc.';

-- Creează indexuri pentru notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Tabela promotions_home (promoții pentru pagina Home)
CREATE TABLE IF NOT EXISTS promotions_home (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  link VARCHAR(500) DEFAULT NULL,
  deadline TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN promotions_home.deadline IS 'Data limită a promoției';

-- Creează indexuri pentru promotions_home
CREATE INDEX IF NOT EXISTS idx_promotions_home_deadline ON promotions_home(deadline);
CREATE INDEX IF NOT EXISTS idx_promotions_home_created_at ON promotions_home(created_at);

-- Tabela promotions (toate promoțiile)
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image VARCHAR(500) DEFAULT NULL,
  image_home VARCHAR(500) DEFAULT NULL,
  deadline TIMESTAMP NOT NULL,
  link VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN promotions.image_home IS 'Imagine pentru pagina Home';

-- Creează indexuri pentru promotions
CREATE INDEX IF NOT EXISTS idx_promotions_deadline ON promotions(deadline);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON promotions(created_at);

-- Tabela blog (articole blog)
CREATE TABLE IF NOT EXISTS blog (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  author VARCHAR(100) DEFAULT NULL,
  excerpt VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creează indexuri pentru blog
CREATE INDEX IF NOT EXISTS idx_blog_created_at ON blog(created_at);

-- Trigger pentru actualizarea automată a updated_at în blog
DROP TRIGGER IF EXISTS update_blog_updated_at ON blog;
CREATE TRIGGER update_blog_updated_at
    BEFORE UPDATE ON blog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabela messages (mesaje între utilizatori și admin)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER DEFAULT NULL,
  message TEXT NOT NULL,
  is_from_admin BOOLEAN DEFAULT FALSE,
  "read" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON COLUMN messages.user_id IS 'ID utilizator (NULL pentru mesaje anonime)';
COMMENT ON COLUMN messages.is_from_admin IS 'TRUE dacă mesajul este de la admin, FALSE dacă este de la utilizator';
COMMENT ON COLUMN messages."read" IS 'TRUE dacă mesajul a fost citit de admin';

-- Creează indexuri pentru messages
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_from_admin ON messages(is_from_admin);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages("read");

-- Date de test (opțional - poți șterge aceste linii dacă nu vrei date de test)

-- Utilizator de test
INSERT INTO users (nume, prenume, telefon, email, parola, data_nasterii, sex, puncte) 
VALUES ('Test', 'User', '+37312345678', 'test@volta.md', 'test123', '1990-01-01', 'M', 100)
ON CONFLICT (telefon) DO UPDATE SET nume = EXCLUDED.nume;

-- Notificări de test
INSERT INTO notifications (title, message, type) VALUES
('Bun venit!', 'Bine ai venit în aplicația Volta!', 'info'),
('Reducere specială', 'Ai 10% reducere la următoarea achiziție!', 'success'),
('Program nou', 'Volta Centru este deschis acum până la ora 20:00!', 'info')
ON CONFLICT DO NOTHING;

-- Promoții de test pentru Home
INSERT INTO promotions_home (title, image_url, link, deadline) VALUES
('Reducere 20%', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Reducere+20%25', 'https://volta.md', NOW() + INTERVAL '7 days'),
('Oferta specială', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Oferta+Speciala', 'https://volta.md', NOW() + INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Promoții de test
INSERT INTO promotions (title, image, deadline) VALUES
('Reducere 20%', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Reducere+20%25', NOW() + INTERVAL '7 days'),
('Oferta specială', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Oferta+Speciala', NOW() + INTERVAL '3 days'),
('Black Friday', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Black+Friday', NOW() + INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Articole blog de test
INSERT INTO blog (title, content, image_url, author, excerpt) VALUES
('Bun venit la Volta!', 'Acesta este primul nostru articol despre Volta. Aici vei găsi toate noutățile și ofertele speciale.', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Blog+Post+1', 'Echipa Volta', 'Primul articol despre Volta'),
('Cum să folosești aplicația', 'În acest articol vei învăța cum să folosești aplicația Volta pentru a beneficia de toate ofertele.', 'https://via.placeholder.com/800x400/FFEE00/000000?text=Blog+Post+2', 'Echipa Volta', 'Ghid pentru utilizarea aplicației')
ON CONFLICT DO NOTHING;

-- Verifică structura
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Afișează structura tabelelor
\d users;
\d notifications;
\d promotions_home;
\d promotions;
\d blog;
\d messages;
