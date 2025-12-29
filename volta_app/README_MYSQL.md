# Configurare MySQL pentru Volta Mobile App

Aplicația a fost actualizată să folosească MySQL în loc de Supabase.

## Pași de configurare

### 1. Backend Server

1. Navighează în folderul `backend`:
```bash
cd backend
```

2. Instalează dependențele:
```bash
npm install
```

3. Creează fișierul `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=volta_db
PORT=3000
```

4. Asigură-te că MySQL rulează și că baza de date `volta_db` există.

5. Pornește serverul:
```bash
npm start
# sau pentru development cu auto-reload:
npm run dev
```

### 2. Aplicația Mobile

1. În folderul `volta_app`, creează un fișier `.env` (sau actualizează-l dacă există):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Important:** Pentru device-uri fizice (telefon/tabletă), înlocuiește `localhost` cu IP-ul computerului tău pe rețeaua locală:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

2. Restart aplicația Expo pentru a încărca noile variabile de mediu.

### 3. Structura Tabelelor MySQL

Asigură-te că ai următoarele tabele în baza de date:

#### `users`
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nume VARCHAR(100) NOT NULL,
  prenume VARCHAR(100) NOT NULL,
  telefon VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  parola VARCHAR(255) NOT NULL,
  data_nasterii DATE,
  sex CHAR(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `notifications`
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `promotions_home`
```sql
CREATE TABLE promotions_home (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(500),
  link VARCHAR(500),
  deadline DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `promotions`
```sql
CREATE TABLE promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  image VARCHAR(500),
  deadline DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `blog`
```sql
CREATE TABLE blog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testare

1. Verifică că backend-ul rulează: deschide `http://localhost:3000/api/health` în browser
2. Pornește aplicația mobile
3. Încearcă să te loghezi sau să creezi un cont nou

## Troubleshooting

### Eroare de conexiune
- Verifică că MySQL este pornit
- Verifică că datele din `.env` sunt corecte
- Verifică că portul 3000 nu este ocupat de alt proces

### Eroare "Network request failed" pe device fizic
- Asigură-te că device-ul și computerul sunt pe aceeași rețea WiFi
- Verifică că firewall-ul permite conexiuni pe portul 3000
- Folosește IP-ul local al computerului în loc de `localhost`

### Eroare "Table doesn't exist"
- Verifică că toate tabelele au fost create
- Verifică că numele bazei de date este corect în `.env`

