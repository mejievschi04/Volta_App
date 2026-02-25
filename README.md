# Volta Mobile App

Aplicație mobilă (Expo / React Native) + backend Node.js + panou admin pentru gestionarea promoțiilor, utilizatori, notificări, blog și mesaje.

## Structura proiectului

```
VoltaMobileApp/
├── backend/          # API Node.js + Express + PostgreSQL
│   ├── config/       # Env, DB, Multer, CORS
│   ├── middleware/   # Auth (JWT), errorHandler, notFound, requestLogger
│   ├── routes/       # auth, users, notifications, promotions, blog, messages, upload, health
│   ├── controllers/
│   ├── utils/
│   ├── jobs/         # Cleanup mesaje vechi
│   ├── public/admin/ # Panou admin (static)
│   ├── uploads/
│   ├── server.js
│   ├── .env.example
│   └── STRUCTURA.md
├── volta_app/        # Aplicația mobilă (Expo)
│   ├── app/          # Ecrane (Expo Router), context, components
│   ├── lib/          # apiClient
│   ├── hooks/
│   ├── types/
│   └── .env.example
├── ANALIZA_APLICATIE.md
└── README.md
```

## Cerințe

- **Node.js** 18+
- **PostgreSQL** (pentru backend)
- **Expo CLI** (pentru app: `npx expo start`)

## Pornire rapidă

### 1. Backend

```bash
cd backend
cp .env.example .env
# Completează .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET (obligatoriu în producție)
npm install
npm run dev
```

- API: http://localhost:3000/api  
- Admin: http://localhost:3000/admin  
- Uploads: http://localhost:3000/uploads  

Baza de date trebuie creată și migrată (vezi `backend/README_POSTGRES.md` și `backend/database_postgres.sql`).

### 2. Aplicația mobilă

```bash
cd volta_app
cp .env.example .env
# Setează EXPO_PUBLIC_API_URL=http://IP_TAU:3000/api (pentru device/emulator Android)
npm install
npx expo start
```

Pe **Android** (emulator sau device) este necesar `EXPO_PUBLIC_API_URL` cu IP-ul mașinii (ex: `http://192.168.1.100:3000/api`). Pe iOS simulator poate fi folosit `http://localhost:3000/api` dacă nu e setat.

### 3. Admin

Deschide în browser: http://localhost:3000/admin (după ce backend-ul rulează). În header poți seta URL-ul API dacă admin-ul rulează pe alt domeniu.

## Securitate

- **JWT** pentru autentificare; rutele protejate: `GET/PUT /api/users/:id`, toate `/api/messages/*`.
- **Parole** hash-uite cu bcrypt; parola nu este returnată niciodată în răspuns.
- **CORS**: în producție setează în backend `.env`:  
  `CORS_ORIGIN=https://app.volta.md,https://admin.volta.md`
- **Rate limit** pe `/api/auth`: max 20 cereri / 15 minute.
- **Helmet** activat pe backend pentru headere de securitate.

## Documentație suplimentară

- **Backend:** `backend/STRUCTURA.md` – structură, rute, securitate.
- **Analiză și îmbunătățiri:** `ANALIZA_APLICATIE.md`.
