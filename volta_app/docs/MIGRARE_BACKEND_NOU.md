# Migrare la noul backend Volta (api.volta.md)

Document de referință: **ce s-a făcut deja** și **ce mai trebuie făcut** pentru trecerea completă la `https://api.volta.md/app/mobile`.

---

# Partea 1 – CE S-A FĂCUT (implementat în cod)

## 1.1 Specificația noului API (referință)

- **Base URL:** `https://api.volta.md/app/mobile`
- **Autentificare:** header `Authorization: Token <auth_token>` (nu `Bearer`)
- **Login:** `POST /auth/login` cu body `{ "username": "...", "password": "..." }` → răspuns conține `auth_token`
- **User curent:** `GET /auth/me` (cu token) → datele utilizatorului
- **Logout:** `POST /auth/logout` (cu token)
- **Carduri utilizator:** `GET /user/discount-cards?page=1` (cu token)

---

## 1.2 Modificări în `volta_app/lib/apiClient.ts`

### Base URL
- **Înainte:** `EXPO_PUBLIC_API_URL` sau `http://localhost:3000/api` / `http://10.0.2.2:3000/api`
- **Acum:** dacă nu există `EXPO_PUBLIC_API_URL`, se folosește implicit `https://api.volta.md/app/mobile`
- **Override:** poți seta în `.env` variabila `EXPO_PUBLIC_API_URL=https://api.volta.md/app/mobile` (sau alt URL de test)

### Header de autentificare
- **Înainte:** `Authorization: Bearer <token>`
- **Acum:** `Authorization: Token <token>` (conform noii specificații)

### Parsarea răspunsurilor
- S-a adăugat suport pentru răspunsuri care conțin `auth_token` (nu doar `user` + `token`), astfel încât login-ul pe noul backend să fie recunoscut corect.

### Metode noi adăugate

| Metodă | Endpoint | Scop |
|--------|---------|------|
| `loginWithUsername(username, password)` | `POST /auth/login` | Login cu email/username + parolă; returnează `{ auth_token }` |
| `getMe()` | `GET /auth/me` | Returnează utilizatorul curent (mapat la tipul `User` din app) |
| `logout()` | `POST /auth/logout` | Invalidare token pe server |
| `getUserDiscountCards(page?)` | `GET /user/discount-cards?page=1` | Lista cardurilor de reducere ale utilizatorului |

### Mapare răspuns `/auth/me` la `User`
- S-a introdus tipul `RawMeResponse` și funcția `mapMeToUser()` care transformă răspunsul de la `/auth/me` în structura așteptată de app (`User`).
- Se acceptă atât câmpuri în română (`nume`, `prenume`, `telefon`), cât și în engleză (`first_name`, `last_name`, `phone`, `email`), astfel încât app-ul să funcționeze indiferent de formatul exact al backend-ului.

### Metode păstrate (compatibilitate)
- `login(telefon, parola)` – încă există (folosit de fluxul de **signup** / vechiul flow).
- `getUser(id)`, `setSelectedCard()`, `updateUser()`, etc. – rămân pentru notificări, promoții, mesaje și pentru cazul în care backend-ul expune aceleași path-uri sub noul domeniu.

---

## 1.3 Modificări în `volta_app/app/Login.tsx`

### Formularul de login (ecranul „Bine ai revenit”)
- **Înainte:** câmp „Număr de telefon (+373...)” + parolă.
- **Acum:** câmp **„Email sau utilizator”** + parolă.
- Tipul tastaturii pentru acest câmp este `email-address`.
- Variabila de state folosită la login este `username` (nu `telefon`).

### Fluxul de login (pas cu pas)
1. Utilizatorul introduce username/email și parola, apasă „Autentifică-te”.
2. Se apelează `apiClient.loginWithUsername(username.trim(), password)`.
3. Din răspuns se citește `auth_token`; dacă lipsește, se afișează eroare.
4. Se salvează token-ul: `await setToken(auth_token)` (și în memorie, și în AsyncStorage sub cheia `auth_token`).
5. Se apelează `apiClient.getMe()` pentru a obține datele utilizatorului curent.
6. Dacă `getMe()` reușește, se apelează `setUser(meData)`; dacă eșuează, se setează un user minimal (id 0, prenume „Utilizator”, email/username).
7. Se afișează notificarea „Bun venit, …” și se navighează la `/Home`.

### Signup (înregistrare)
- **Neschimbat:** formularul în 3 pași (nume, prenume → data nașterii, sex → telefon, parolă) și apelul `apiClient.signup(...)`.
- Request-urile de signup merg către **același base URL** ca și login-ul (implicit `https://api.volta.md/app/mobile`). Dacă noul backend nu expune încă `POST /auth/signup`, acest request va eșua (404/501) până când endpoint-ul va fi adăugat.

---

## 1.4 Modificări în `volta_app/app/Profile.tsx`

### Încărcarea datelor utilizatorului
- **Înainte:** `apiClient.getUser(user.id)` cu ID-ul din context.
- **Acum:** `apiClient.getMe()` – nu mai este nevoie de ID, utilizatorul este identificat prin token.

### Cardurile de reducere
- Dacă răspunsul de la `getMe()` **nu** conține `discount_cards` (sau lista e goală), se apelează în plus `apiClient.getUserDiscountCards(1)`.
- Rezultatul este normalizat (id, discount_value 5 sau 10, expires_at) și atașat la obiectul user afișat în profil (`setUserData(merged)`).
- Se acceptă atât răspuns de forma `{ results: [...] }`, cât și `{ discount_cards: [...] }` sau array direct, pentru flexibilitate cu diferite variante de backend.

### Selectarea cardului (butonul „Selectează”)
- După apăsarea „Selectează” se apelează în continuare `apiClient.setSelectedCard(displayUserData.id, card.id)`.
- După succes, în loc de `getUser(id)` se apelează `apiClient.getMe()` și se actualizează atât `userData`, cât și contextul (`setUser`), păstrând lista de carduri deja încărcată.

### Logout
- **Înainte:** doar curățare locală: `setUser(null)` și redirect la Login.
- **Acum:** se apelează întâi `await apiClient.logout()` (pentru invalidarea token-ului pe server), apoi `setUser(null)` și `router.replace("/Login")`. Eroarea la logout (ex.: token deja invalid) este ignorată, astfel încât utilizatorul să fie oricum deconectat local.

---

## 1.5 Ce nu s-a schimbat (dar este relevant)

### `volta_app/app/_context/UserContext.tsx`
- Cheia din AsyncStorage pentru token este deja `auth_token` – potrivită pentru noul API.
- Nu a fost nevoie de modificări; user-ul vine din `getMe()` iar token-ul este setat la login.

### `volta_app/app/Loading.tsx`
- Verifică dacă există user salvat în AsyncStorage; dacă da, navighează la Home.
- Token-ul este încărcat în `UserContext` la pornire; la primul request care primește 401, `setOnUnauthorized` din `_layout.tsx` face logout și redirect la Login.

### Notificări, promoții, blog, mesaje
- Apelurile rămân către path-urile actuale (ex.: `/notifications`, `/promotions`, `/blog`, `/messages`) relative la **același base URL**.
- Dacă noul backend le expune sub alte path-uri (ex. `/app/mobile/notifications`), va trebui actualizat `apiClient` cu aceste path-uri (vezi Partea 2).

---

# Partea 2 – CE MAI TREBUIE FĂCUT

## 2.1 Clarificări obligatorii cu backend-ul

### A) Structura răspunsului `GET /auth/me`
- **Situație:** În app există deja maparea `RawMeResponse` → `User` (nume, prenume, telefon, email, id, discount_cards, selected_discount_card_id).
- **Ce trebuie:** Confirmarea cu echipa de backend a câmpurilor exacte returnate (numele câmpurilor și tipurile). Dacă backend-ul folosește alte nume (ex. `first_name` în loc de `prenume`), maparea din `mapMeToUser()` din `apiClient.ts` le acoperă; dacă apar câmpuri noi necesare în app, acestea trebuie adăugate în `RawMeResponse` și în tipul `User` din `types/User.ts`.

### B) Selectarea cardului de reducere
- **Situație:** În Profile există butonul „Selectează” care apelează `apiClient.setSelectedCard(userId, cardId)` (endpoint vechi: `PUT /users/:id/selected-card`).
- **Ce trebuie:** Fie noul backend expune un endpoint echivalent (ex. `PUT /user/selected-card` sau `PATCH /user` cu `selected_card_id`), fie se confirmă că nu există. Dacă **nu** există:
  - Opțiunea 1: se ascunde sau se dezactivează butonul „Selectează” în Profile până există endpoint.
  - Opțiunea 2: se implementează pe backend endpoint-ul și se actualizează în app path-ul (și eventual body-ul) în `apiClient.setSelectedCard`.

### C) Înregistrare (signup)
- **Situație:** Formularul de signup trimite la același base URL; noul API nu este documentat cu `POST /auth/signup`.
- **Ce trebuie:** Confirmare dacă va exista signup pe noul backend și cu ce câmpuri (nume, prenume, email, telefon, parolă, etc.). După ce există:
  - Se poate adăuga în `apiClient` o metodă `signupNewApi(...)` cu body-ul corect.
  - În Login se poate comuta signup-ul să folosească noul endpoint (sau se păstrează un singur flux după ce vechiul backend este scos).

### D) Notificări, promoții, blog, mesaje
- **Situație:** App-ul apelează în continuare `/notifications`, `/promotions`, `/blog`, `/messages` etc. (relative la base URL).
- **Ce trebuie:** Lista exactă de path-uri pe noul backend (ex. `GET /notifications`, `GET /promotions`, etc.). Dacă path-urile sunt diferite (ex. `/app/mobile/notifications`), trebuie actualizate în `apiClient.ts` toate metodele care le folosesc, astfel încât să nu mai depindă de vechiul backend.

---

## 2.2 Pași opționali (îmbunătățiri)

- **Refresh user la pornire:** În `Loading.tsx` sau în `_layout.tsx`, dacă există token dar nu există user (sau vrei mereu date proaspete), poți apela o dată `getMe()` la start și actualiza user-ul în context.
- **Gestionare 404 la setSelectedCard:** În Profile, la apăsarea „Selectează”, dacă răspunsul este 404 (endpoint inexistent), poți afișa un mesaj de tip „Funcționalitatea va fi disponibilă în curând” și/sau ascunde butonul pentru utilizatorii care primesc eroare.
- **Variabilă de mediu pentru „vechi vs nou” backend:** Poți introduce o variabilă (ex. `EXPO_PUBLIC_USE_LEGACY_API=true`) și în funcție de ea să folosești fie `login` + `getUser(id)`, fie `loginWithUsername` + `getMe()`, pentru tranziție graduală sau rollback rapid.

---

## 2.3 Checklist final (ce mai rămâne de făcut)

- [ ] **Backend:** Confirmare structură răspuns `GET /auth/me` (câmpuri și nume).
- [ ] **Backend:** Confirmare dacă există endpoint pentru selectare card; dacă da, path și body.
- [ ] **Backend:** Confirmare dacă există signup și cu ce câmpuri; actualizare app după caz.
- [ ] **Backend:** Lista path-uri pentru notificări, promoții, blog, mesaje pe noul domeniu.
- [ ] **App (dacă e cazul):** Actualizare path-uri pentru notificări/promoții/blog/mesaje în `apiClient.ts`.
- [ ] **App (dacă e cazul):** Adaptare/ascundere buton „Selectează” card dacă endpoint-ul nu există.
- [ ] **App (opțional):** Refresh user la pornire cu `getMe()`; tratare 404 la setSelectedCard; flag legacy/new API.

---

## 2.4 Testare

1. Setează în `.env` (dacă vrei override):  
   `EXPO_PUBLIC_API_URL=https://api.volta.md/app/mobile`
2. Pornește app-ul și mergi la Login.
3. Introdu **email/username** și parola (cont valid pe noul backend).
4. După login ar trebui să vezi Home; la Profil, datele și cardurile ar trebui să se încarce prin `getMe()` și `getUserDiscountCards(1)`.
5. La Logout, request-ul `POST /auth/logout` trebuie să fie trimis (poți verifica în Network tab / logging).

---

**Rezumat:** Modificările pentru **login (username + parolă), token (Token …), getMe, logout și carduri utilizator** sunt implementate. Rămân de clarificat cu backend-ul: structura exactă a răspunsului `/auth/me`, endpoint pentru selectare card, signup și path-urile pentru notificări, promoții, blog și mesaje; după ce acestea sunt stabilite, se pot face ultimele ajustări în document și în cod.
