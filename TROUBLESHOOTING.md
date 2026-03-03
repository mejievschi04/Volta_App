# Troubleshooting - Network Request Failed

## Problema: "Network request failed" sau "Eroare de conexiune"

Această eroare apare când aplicația nu se poate conecta la backend-ul API.

## Soluții:

### 1. Verifică că backend-ul rulează

```bash
cd backend
npm start
```

Ar trebui să vezi:
```
🚀 Server rulează pe portul 3000
📡 API disponibil la:
   - http://localhost:3000/api
```

### 2. Testează backend-ul în browser

Deschide în browser: `http://localhost:3000/api/health`

Ar trebui să vezi: `{"status":"OK","message":"Server is running"}`

### 3. Configurează URL-ul API în aplicație

#### Opțiunea A: Fișier .env (Recomandat)

Creează fișierul `volta_app/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**IMPORTANT pentru device-uri fizice:**
- Înlocuiește `localhost` cu IP-ul local al computerului
- Găsește IP-ul cu: `ipconfig` (Windows) sau `ifconfig` (Mac/Linux)
- Exemplu: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api`

#### Opțiunea B: Variabile de mediu sistem

Windows PowerShell:
```powershell
$env:EXPO_PUBLIC_API_URL="http://localhost:3000/api"
```

Mac/Linux:
```bash
export EXPO_PUBLIC_API_URL="http://localhost:3000/api"
```

### 4. Restart aplicația Expo

După ce ai setat variabilele de mediu:
1. Oprește aplicația (Ctrl+C)
2. Șterge cache-ul: `npx expo start -c`
3. Repornește aplicația

### 5. Verifică firewall-ul

Firewall-ul poate bloca conexiunile:
- Windows: Permite Node.js prin firewall
- Mac: Verifică System Preferences > Security & Privacy > Firewall

### 6. Verifică că serverul ascultă pe toate interfețele

Serverul este configurat să asculte pe `0.0.0.0`, ceea ce înseamnă că este accesibil din rețea.

### 7. Pentru device-uri fizice (telefon/tabletă)

1. **Asigură-te că device-ul și computerul sunt pe aceeași rețea WiFi**
2. **Folosește IP-ul local al computerului, NU localhost**
   - Găsește IP-ul: `ipconfig` (Windows) sau `ifconfig` (Mac/Linux)
   - Exemplu: Dacă IP-ul este `192.168.1.100`, folosește:
     ```
     EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
     ```
3. **Verifică că portul 3000 nu este blocat**

### 8. Debugging

Verifică console-ul aplicației pentru mesaje de tip:
```
[API Client] Base URL configurat: http://...
[API] Requesting: http://...
```

Dacă vezi erori, verifică:
- URL-ul este corect?
- Backend-ul rulează?
- Firewall-ul permite conexiuni?

### 9. Test rapid

Încearcă să accesezi API-ul direct din browser pe device:
- Deschide browser-ul pe telefon
- Accesează: `http://IP_COMPUTER:3000/api/health`
- Dacă funcționează, problema este în aplicație
- Dacă nu funcționează, problema este în rețea/firewall

## Exemple de configurare

### Development (Emulator/Simulator)
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Device fizic (același WiFi)
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```
### Production (server remote)
```env
EXPO_PUBLIC_API_URL=https://api.volta.app/api
```


