# 🔧 Fix Rapid - Eroare ECONNREFUSED PostgreSQL

## Problema
```
❌ Eroare la conectare PostgreSQL: ECONNREFUSED
```

Aceasta înseamnă că serverul nu se poate conecta la PostgreSQL.

## Soluții Rapide

### 1. Verifică dacă PostgreSQL este instalat

**Windows:**
```bash
check_postgres.bat
```

**Mac/Linux:**
```bash
chmod +x check_postgres.sh
./check_postgres.sh
```

Sau manual:
```bash
psql --version
```

### 2. Dacă PostgreSQL NU este instalat

**Windows:**
1. Descarcă de la: https://www.postgresql.org/download/windows/
2. Instalează PostgreSQL (păstrează parola master!)
3. Adaugă `C:\Program Files\PostgreSQL\XX\bin` în PATH

**Mac:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Dacă PostgreSQL ESTE instalat dar nu rulează

**Windows:**
1. Deschide **Services** (Win+R → `services.msc`)
2. Caută **PostgreSQL**
3. Click dreapta → **Start**

Sau din PowerShell (ca Administrator):
```powershell
Start-Service postgresql-x64-14
```

**Mac:**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### 4. Creează baza de date

După ce PostgreSQL rulează, creează baza de date:

**Windows:**
```bash
setup_database_postgres.bat
```

**Mac/Linux:**
```bash
chmod +x setup_database_postgres.sh
./setup_database_postgres.sh
```

### 5. Creează fișierul .env

Creează un fișier `.env` în folderul `backend`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=parola_ta_postgres
DB_NAME=volta_db
PORT=3000
```

**⚠️ IMPORTANT:** Înlocuiește `parola_ta_postgres` cu parola reală setată la instalarea PostgreSQL!

### 6. Verifică conexiunea manuală

Testează manual conexiunea:

```bash
psql -U postgres -d volta_db
```

Dacă funcționează, vei vedea prompt-ul PostgreSQL.

### 7. Repornește serverul Node.js

După ce ai făcut toate modificările:
```bash
npm start
```

Ar trebui să vezi:
```
✅ Conectat la PostgreSQL!
   Database: volta_db
   Host: localhost:5432
```

## Verificare Rapidă

1. ✅ PostgreSQL instalat? → `psql --version`
2. ✅ PostgreSQL rulează? → `check_postgres.bat` sau `check_postgres.sh`
3. ✅ Baza de date există? → `psql -U postgres -l` (caută `volta_db`)
4. ✅ Fișier .env configurat? → Verifică `backend/.env`
5. ✅ Server repornit? → Oprește și pornește din nou

## Probleme Comune

### "psql: command not found"
- PostgreSQL nu este instalat sau nu este în PATH
- Adaugă PostgreSQL/bin în PATH

### "password authentication failed"
- Parola din `.env` este greșită
- Verifică parola setată la instalarea PostgreSQL

### "database does not exist"
- Rulează `setup_database_postgres.bat` sau `setup_database_postgres.sh`

### "connection refused" chiar dacă PostgreSQL rulează
- Verifică portul în `.env` (default: 5432)
- Verifică firewall-ul
- Verifică că PostgreSQL ascultă pe localhost (nu doar pe 127.0.0.1)

## Ajutor Suplimentar

Vezi `README_POSTGRES.md` pentru instrucțiuni detaliate.
