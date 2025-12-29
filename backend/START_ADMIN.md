# Cum să rulezi Admin Panel-ul Volta

## Pași pentru a porni Admin Panel-ul:

### 1. Instalează dependențele (dacă nu sunt instalate)
```bash
cd backend
npm install
```

### 2. Pornește serverul backend
```bash
npm start
```

Sau pentru development cu auto-reload:
```bash
npm run dev
```

### 3. Deschide Admin Panel-ul în browser

După ce serverul pornește, vei vedea în consolă:
```
🚀 Server rulează pe portul 3000
📡 API disponibil la:
   - http://localhost:3000/api
   - http://127.0.0.1:3000/api

🎨 Admin Panel disponibil la:
   - http://localhost:3000/admin
   - http://127.0.0.1:3000/admin
```

**Deschide în browser:**
- **Local:** http://localhost:3000/admin
- **Din rețea:** http://192.168.0.148:3000/admin (folosește IP-ul tău local)

## Funcționalități Admin Panel:

1. **Promoții Home** - Creează promoții pentru slideshow-ul de pe Home
2. **Toate Promoțiile** - Gestionează toate promoțiile
3. **Utilizatori** - Adaugă și gestionează utilizatori
4. **Notificări** - Creează și gestionează notificări
5. **Upload Imagine** - Upload imagini pentru promoții

## Notă importantă:

Asigură-te că:
- ✅ MySQL este pornit și baza de date `volta_db` există
- ✅ Variabilele de mediu sunt setate corect (`.env` sau default)
- ✅ Portul 3000 este liber

## Troubleshooting:

Dacă nu funcționează:
1. Verifică că serverul rulează (vezi mesajele în consolă)
2. Verifică că portul 3000 nu este ocupat
3. Verifică conexiunea la MySQL
4. Verifică că fișierul `admin.html` există în folderul `backend/`

