# Structura Backend Volta

Backend-ul este organizat ca o aplicație Node.js modernă: config, middleware, rute, controllere, job-uri.

## Arborescență

```
backend/
├── server.js              # Punct de intrare (Express, mount rute, start server)
├── config/
│   ├── index.js           # Variabile din .env (port, jwt, db, cors, uploads)
│   ├── database.js        # Pool PostgreSQL
│   └── multer.js          # Configurare upload imagini (storage, limite, fileFilter)
├── middleware/
│   ├── auth.js            # requireAuth – verifică JWT, setează req.userId
│   ├── errorHandler.js    # Eroare globală (log + JSON), tratare LIMIT_FILE_SIZE
│   ├── notFound.js        # 404 pentru rute API necunoscute
│   └── requestLogger.js   # Log request (doar în development)
├── routes/
│   ├── index.js           # Agregare: mount toate rutele sub /api
│   ├── auth.js            # POST /auth/login, POST /auth/signup
│   ├── users.js           # CRUD users (GET/POST/PUT/DELETE, GET :id cu auth)
│   ├── notifications.js   # CRUD notifications
│   ├── promotions.js      # Un model promoție, 2 imagini: GET ?home=1 (carousel), GET (toate), POST/PUT/DELETE
│   ├── blog.js            # CRUD blog (cu upload imagine)
│   ├── messages.js        # Mesaje (list, by user, create, reply, mark-read, delete)
│   ├── upload.js          # POST /upload (o imagine)
│   └── health.js          # GET /health
├── controllers/
│   ├── authController.js
│   ├── usersController.js
│   ├── notificationsController.js
│   ├── promotionsController.js
│   ├── blogController.js
│   ├── messagesController.js
│   └── uploadController.js
├── utils/
│   └── buildImageUrl.js    # URL complet pentru fișiere din uploads
├── jobs/
│   └── deleteOldMessages.js  # Șterge mesaje > 3 zile (la 1h)
├── public/
│   └── admin/
│       └── index.html      # Panou admin (static)
├── uploads/                # Fișiere încărcate (creat automat)
├── .env
└── .env.example
```

## Flux

1. **server.js** – încarcă config, pool, multer; aplică CORS, json, static (uploads, admin); mount `/api` → routes; 404 generic; errorHandler; test DB; start cleanup job; listen.
2. **Rute** – fiecare fișier din `routes/` definește un router Express și îl mountează în `routes/index.js` sub calea corespunzătoare (ex: `/auth`, `/users`).
3. **Controllere** – logica de business și acces la DB; primesc `req, res, next` și apelează `next(err)` la erori.
4. **Middleware** – `requireAuth` pe rutele protejate (users/:id, messages); `errorHandler` tratează toate erorile și răspunde cu JSON.

## Securitate

- **JWT** pe rutele care depind de user (GET/PUT /users/:id, toate /messages).
- **Parole** hash-uite cu bcrypt; parola nu este returnată niciodată în răspuns.
- **Upload** – doar imagini, max 10MB; nume de fișier unic.
- **CORS** – configurabil din `.env` (în producție setează `CORS_ORIGIN`).
- **Admin** – panoul este servit static la `/admin`; API-ul pentru admin (ex: GET/POST /api/users) nu folosește JWT (este pentru panou intern). Pentru securitate suplimentară poți adăuga autentificare dedicată admin (ex: API key sau session).

## Performanță

- Un singur pool PostgreSQL pentru toată aplicația.
- Logging redus în producție (`NODE_ENV=production`).
- Rute clare și controllere separate pentru ușurință în debugging și cache ulterior (ex: Redis) dacă e nevoie.

## Pornire

```bash
npm install
cp .env.example .env
# completează .env (DB_*, JWT_SECRET)
npm run dev
```

API: `http://localhost:3000/api`  
Admin: `http://localhost:3000/admin`
