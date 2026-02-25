# Setup Baza de Date PostgreSQL

## Cerințe

- PostgreSQL instalat pe sistemul tău
- Acces la linia de comandă (Terminal/PowerShell)

## Metoda 1: Script automat (Windows)

Rulează fișierul `setup_database_postgres.bat`:
```bash
setup_database_postgres.bat
```

## Metoda 2: Script automat (Mac/Linux)

Dă permisiuni de execuție și rulează:
```bash
chmod +x setup_database_postgres.sh
./setup_database_postgres.sh
```

## Metoda 3: Manual (Recomandat pentru prima dată)

### Pasul 1: Creează baza de date

Deschide terminalul și conectează-te la PostgreSQL:
```bash
psql -U postgres
```

Sau pe Windows (dacă PostgreSQL este instalat):
```bash
psql -U postgres
```

### Pasul 2: Creează baza de date

În terminalul PostgreSQL:
```sql
CREATE DATABASE volta_db;
\q
```

### Pasul 3: Rulează scriptul SQL

Din linia de comandă:
```bash
psql -U postgres -d volta_db -f database_postgres.sql
```

Sau copiază și lipește conținutul din `database_postgres.sql` în psql.

### Pasul 4: Verifică

După ce rulezi scriptul, verifică că totul este OK:
```sql
psql -U postgres -d volta_db
\dt
```

Ar trebui să vezi:
- users
- notifications
- promotions_home
- promotions
- blog
- messages

## Configurare Variabile de Mediu

Creează un fișier `.env` în folderul `backend` (poți copia `.env.example`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=volta_db
PORT=3000
```

## Structura Bazei de Date

### `users` - Utilizatori
- `id` - ID unic (SERIAL)
- `nume` - Nume
- `prenume` - Prenume
- `telefon` - Telefon (UNIQUE)
- `email` - Email
- `parola` - Parolă (în clar - pentru development)
- `data_nasterii` - Data nașterii
- `sex` - Sex (M/F)
- `puncte` - Puncte acumulate
- `created_at` - Data creării
- `updated_at` - Data actualizării (actualizat automat)

### `notifications` - Notificări
- `id` - ID unic (SERIAL)
- `title` - Titlu
- `message` - Mesaj
- `type` - Tip (info, warning, success)
- `created_at` - Data creării

### `promotions_home` - Promoții pentru Home
- `id` - ID unic (SERIAL)
- `title` - Titlu
- `image_url` - URL imagine
- `link` - Link (opțional)
- `deadline` - Data limită (TIMESTAMP)
- `created_at` - Data creării

### `promotions` - Toate promoțiile
- `id` - ID unic (SERIAL)
- `title` - Titlu
- `image` - URL imagine
- `image_home` - Imagine pentru pagina Home
- `deadline` - Data limită (TIMESTAMP)
- `link` - Link (opțional)
- `created_at` - Data creării

### `blog` - Articole blog
- `id` - ID unic (SERIAL)
- `title` - Titlu
- `content` - Conținut
- `image_url` - URL imagine
- `author` - Autor
- `excerpt` - Rezumat
- `created_at` - Data creării
- `updated_at` - Data actualizării (actualizat automat)

### `messages` - Mesaje
- `id` - ID unic (SERIAL)
- `user_id` - ID utilizator (NULL pentru mesaje anonime)
- `message` - Mesaj
- `is_from_admin` - TRUE dacă mesajul este de la admin
- `read` - TRUE dacă mesajul a fost citit
- `created_at` - Data creării

## Date de Test

Scriptul include date de test:
- 1 utilizator: `+37312345678` / `test123`
- 3 notificări
- 2 promoții pentru Home
- 3 promoții
- 2 articole blog

## Verificare Rapidă

După setup, testează conexiunea:
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM notifications;
SELECT COUNT(*) FROM promotions_home;
SELECT COUNT(*) FROM promotions;
SELECT COUNT(*) FROM blog;
```

## Instalare Dependențe

După ce ai configurat baza de date, instalează dependențele Node.js:
```bash
npm install
```

## Pornire Server

După ce totul este configurat:
```bash
npm start
```

Sau pentru development cu auto-reload:
```bash
npm run dev
```

## Probleme Comune

### "password authentication failed"
- Verifică parola în fișierul `.env`
- Verifică că utilizatorul `postgres` există

### "database does not exist"
- Rulează scriptul de creare a bazei de date
- Verifică numele bazei de date în `.env`

### "relation does not exist"
- Rulează scriptul SQL `database_postgres.sql`
- Verifică că ai rulat scriptul pe baza de date corectă

### "permission denied"
- Verifică că utilizatorul are permisiuni pentru a crea baze de date
- Pe unele sisteme, poți avea nevoie de drepturi de administrator

## Diferențe față de MySQL

- **SERIAL** în loc de **AUTO_INCREMENT**
- **TIMESTAMP** în loc de **DATETIME**
- **$1, $2, $3...** în loc de **?** pentru parametri
- **RETURNING id** pentru a obține ID-ul inserat
- **result.rows** în loc de **rows** direct
- **result.rowCount** în loc de **result.affectedRows**
- **"read"** (cu ghilimele duble) în loc de **`read`** (backticks)
