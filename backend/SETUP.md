# Setup Backend - Ghid Rapid

## 1. Instalează dependențele (DEJA FĂCUT ✅)
```bash
npm install
```

## 2. Creează fișierul .env

Creează un fișier `.env` în folderul `backend` cu următoarele:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=volta_db
PORT=3000
```

**Înlocuiește:**
- `your_mysql_password` cu parola ta MySQL
- `volta_db` cu numele bazei de date (dacă este diferit)

## 3. Asigură-te că MySQL rulează

- Verifică că serviciul MySQL este pornit
- Verifică că baza de date `volta_db` există
- Verifică că tabelele sunt create (vezi README.md)

## 4. Pornește serverul

```bash
npm start
```

Sau pentru development cu auto-reload:
```bash
npm run dev
```

## 5. Verifică că serverul rulează

Deschide în browser: `http://localhost:3000/api/health`

Ar trebui să vezi:
```json
{"status":"OK","message":"Server is running"}
```

## Probleme comune

### "Cannot find module 'express'"
**Soluție:** Rulează `npm install` în folderul `backend`

### "Eroare la conectare MySQL"
**Soluție:** 
- Verifică că MySQL rulează
- Verifică că datele din `.env` sunt corecte
- Verifică că baza de date există

### "Port 3000 already in use"
**Soluție:** 
- Schimbă portul în `.env`: `PORT=3001`
- Sau oprește procesul care folosește portul 3000

