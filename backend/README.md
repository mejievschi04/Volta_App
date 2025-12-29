# Volta Backend API

Backend API pentru aplicația Volta Mobile, folosind Express.js și MySQL.

## Instalare

1. Instalează dependențele:
```bash
npm install
```

2. Creează fișierul `.env` (vezi `.env.example`):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volta_db
PORT=3000
```

3. Asigură-te că MySQL este pornit și că baza de date există.

## Pornire

Pentru development:
```bash
npm run dev
```

Pentru production:
```bash
npm start
```

Serverul va rula pe `http://localhost:3000`

## Structura Tabelelor MySQL

Aplicația așteaptă următoarele tabele în MySQL:

### `users`
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `nume` (VARCHAR)
- `prenume` (VARCHAR)
- `telefon` (VARCHAR, UNIQUE)
- `email` (VARCHAR, nullable)
- `parola` (VARCHAR)
- `data_nasterii` (DATE, nullable)
- `sex` (CHAR(1), nullable)

### `notifications`
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `title` (VARCHAR)
- `message` (TEXT)
- `type` (VARCHAR, nullable)
- `created_at` (TIMESTAMP)

### `promotions_home`
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `title` (VARCHAR)
- `image_url` (VARCHAR)
- `link` (VARCHAR, nullable)
- `deadline` (DATETIME)
- `created_at` (TIMESTAMP)

### `promotions`
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `title` (VARCHAR)
- `image` (VARCHAR)
- `deadline` (DATETIME)
- `created_at` (TIMESTAMP)

### `blog`
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `title` (VARCHAR)
- `content` (TEXT)
- `image_url` (VARCHAR, nullable)
- `author` (VARCHAR, nullable)
- `created_at` (TIMESTAMP)

## Endpoints API

### Autentificare
- `POST /api/auth/login` - Login utilizator
- `POST /api/auth/signup` - Înregistrare utilizator nou

### Utilizatori
- `GET /api/users/:id` - Obține utilizator după ID
- `PUT /api/users/:id` - Actualizează utilizator

### Notificări
- `GET /api/notifications` - Obține toate notificările
- `GET /api/notifications/ids` - Obține doar ID-urile notificărilor

### Promoții
- `GET /api/promotions/home` - Promoții pentru pagina Home
- `GET /api/promotions` - Toate promoțiile

### Blog
- `GET /api/blog` - Toate articolele
- `GET /api/blog/:id` - Articol după ID

### Health Check
- `GET /api/health` - Verifică statusul serverului

## Configurare Aplicație Mobile

În aplicația mobile, setează variabila de mediu:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

Pentru device-uri fizice, înlocuiește `localhost` cu IP-ul computerului tău.

