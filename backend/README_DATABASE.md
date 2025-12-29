# Setup Baza de Date MySQL

## Metoda 1: Script automat (Windows)

Rulează fișierul `setup_database.bat`:
```bash
setup_database.bat
```

## Metoda 2: Script automat (Mac/Linux)

Dă permisiuni de execuție și rulează:
```bash
chmod +x setup_database.sh
./setup_database.sh
```

## Metoda 3: Manual (Recomandat pentru prima dată)

### Pasul 1: Deschide MySQL

Windows:
```bash
mysql -u root -p
```

Mac/Linux:
```bash
mysql -u root -p
```

### Pasul 2: Rulează scriptul SQL

În terminalul MySQL sau din linia de comandă:
```bash
mysql -u root -p < database.sql
```

Sau copiază și lipește conținutul din `database.sql` în MySQL.

### Pasul 3: Verifică

După ce rulezi scriptul, verifică că totul este OK:
```sql
USE volta_db;
SHOW TABLES;
```

Ar trebui să vezi:
- users
- notifications
- promotions_home
- promotions
- blog

## Structura Bazei de Date

### `users` - Utilizatori
- `id` - ID unic
- `nume` - Nume
- `prenume` - Prenume
- `telefon` - Telefon (UNIQUE)
- `email` - Email
- `parola` - Parolă (în clar - pentru development)
- `data_nasterii` - Data nașterii
- `sex` - Sex (M/F)
- `puncte` - Puncte acumulate
- `created_at` - Data creării
- `updated_at` - Data actualizării

### `notifications` - Notificări
- `id` - ID unic
- `title` - Titlu
- `message` - Mesaj
- `type` - Tip (info, warning, success)
- `created_at` - Data creării

### `promotions_home` - Promoții pentru Home
- `id` - ID unic
- `title` - Titlu
- `image_url` - URL imagine
- `link` - Link (opțional)
- `deadline` - Data limită
- `created_at` - Data creării

### `promotions` - Toate promoțiile
- `id` - ID unic
- `title` - Titlu
- `image` - URL imagine
- `deadline` - Data limită
- `created_at` - Data creării

### `blog` - Articole blog
- `id` - ID unic
- `title` - Titlu
- `content` - Conținut
- `image_url` - URL imagine
- `author` - Autor
- `excerpt` - Rezumat
- `created_at` - Data creării
- `updated_at` - Data actualizării

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

## Probleme Comune

### "Access denied for user"
- Verifică utilizatorul și parola
- Verifică că utilizatorul are permisiuni

### "Database already exists"
- Nu este o problemă, scriptul folosește `IF NOT EXISTS`
- Baza de date va fi folosită dacă există deja

### "Table already exists"
- Nu este o problemă, scriptul folosește `IF NOT EXISTS`
- Tabelele existente nu vor fi modificate

