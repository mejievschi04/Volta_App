# Analiză detaliată – Volta Mobile App

## Îmbunătățiri aplicate (post-analiză)

- ✅ Parole hash cu bcrypt; parola exclusă din răspunsuri API
- ✅ Autentificare JWT; rute protejate (users/:id, messages); app trimite token și gestionează 401
- ✅ Rute duplicate eliminate (un singur PUT users, un singur GET notifications)
- ✅ Backend restructurat: config, middleware, routes, controllers, jobs
- ✅ Un singur model promoții (2 imagini: listă + home); GET /promotions?home=1
- ✅ Feedback utilizator la Login/Signup (Alert)
- ✅ Tip `User` și UserContext tipizat
- ✅ apiClient: logging doar în __DEV__; fără IP hardcodat (EXPO_PUBLIC_API_URL)
- ✅ Notificări centralizate: useNotifications() în _layout; eliminat duplicat din Home/Profile
- ✅ README la root; .env.example backend + app
- ✅ CORS configurabil (CORS_ORIGIN listă domenii); Helmet; rate limit pe /api/auth

---

## Rezumat executiv (analiza inițială)

Aplicația Volta este un monorepo cu un frontend Expo/React Native și un backend Node/Express + PostgreSQL. Există funcționalități utile (auth, promoții, mesaje, notificări, blog, profil, card reducere), dar **securitatea**, **structura backend-ului** și **experiența utilizatorului la erori** sunt puncte slabe majore. Mai jos sunt evidențiate problemele și îmbunătățirile recomandate.

---

## 1. SECURITATE – Critic

### 1.1 Parole în clar

- **Backend:** Parolele sunt stocate și comparate **fără hash** (`user.parola !== parola` la login, INSERT/UPDATE cu `parola` în clar).
- **Risc:** La un dump al bazei de date sau la un breach, toate parolele sunt expuse. Este în conflict cu orice standard (GDPR, OWASP).
- **Îmbunătățire:** Folosește **bcrypt** (sau argon2) pe backend: la signup/update hash-uiești parola, la login compari cu `bcrypt.compare(parola, user.parola_hash)`. Nu stoca niciodată parola în clar.

### 1.2 Parola trimisă în răspunsul API

- **GET /api/users/:id** face `SELECT ... parola` și trimite `result.rows[0]` direct, deci **parola utilizatorului este expusă în JSON**.
- **Risc:** Orice client care apelează acest endpoint (sau care primește userul de la un alt endpoint) vede parola.
- **Îmbunătățire:** În query exclude coloana `parola` (ex: `SELECT id, nume, prenume, telefon, email, data_nasterii, sex FROM users WHERE id = $1`). Verifică că niciun alt endpoint nu returnează `parola`.

### 1.3 Lipsă autentificare și autorizare pe API

- Nu există token (JWT/session). După login se salvează **întregul obiect user** în AsyncStorage; **nu există header `Authorization`**.
- **Risc:** Orice client care știe URL-ul API poate apela `GET/PUT /api/users/:id`, `GET /api/messages`, etc. pentru orice id.
- **Îmbunătățire:** Introdu JWT la login; trimite-l în `Authorization: Bearer <token>`; middleware pe backend care verifică tokenul și protejează rutele (users, messages, etc.).

### 1.4 CORS deschis

- `cors({ origin: '*' })` permite oricărei origini.
- **Îmbunătățire:** În producție setează `origin` la domeniile tale (ex: `['https://app.volta.md']`).

### 1.5 Upload fără autentificare

- **POST /api/upload** și rutele de blog/promoții cu upload nu verifică autentificarea.
- **Îmbunătățire:** Aplică middleware de auth pe toate rutele de upload.

---

## 2. BACKEND – Structură și consistență

### 2.1 Un singur fișier mare

- **server.js** are peste ~1300 linii: auth, users, notifications, promotions, blog, messages, upload toate într-un singur fișier.
- **Îmbunătățire:** Împarte pe rute: `routes/auth.js`, `routes/users.js`, `routes/notifications.js`, `routes/promotions.js`, `routes/blog.js`, `routes/messages.js`. Un singur `server.js` care încarcă rutele.

### 2.2 Rute duplicate / suprascrise

- **PUT /api/users/:id** este definit de două ori (linia ~220 și ~826). În Express ultima definiție „câștigă”, deci prima **nu se execută niciodată**.
- **GET /api/notifications** este definit de două ori (linia ~259 și ~897).
- **Îmbunătățire:** Un singur handler pentru PUT `/api/users/:id` (diferențiere după rol/user); un singur GET `/api/notifications`.

### 2.3 Promoții „home” – două surse de adevăr

- Backend: **GET /api/promotions/home** (tabel `promotions_home`) și **GET /api/promotions**.
- App: **getPromotionsHome()** apelează `/promotions` și filtrează după `image_home_url`.
- **Îmbunătățire:** Alege o sursă: fie doar `GET /api/promotions/home` în app pentru carousel, fie un singur endpoint cu query `?home=1`. Elimină duplicarea logicii.

### 2.4 Erori și logging

- Nu există middleware global de eroare. Multe `console.log`/`console.error`; în producție pot expune informații.
- **Îmbunătățire:** Middleware de eroare; nivel de log configurabil; reducere log-uri verbose în producție.

---

## 3. FRONTEND (Expo / React Native)

### 3.1 Gestionarea erorilor și feedback utilizator

- **Login/Signup:** La validare (telefon, parolă, nume) se folosește doar `console.error`; **utilizatorul nu vede niciun mesaj**.
- La eroare de rețea sau API, de multe ori nu există Alert/toast.
- **Îmbunătățire:** Afișează mesaje clare: `Alert.alert('Eroare', '...')` sau toast. La login: „Telefon sau parolă incorecte”, „Completează telefonul și parola”. La orice request eșuat: mesaj generic + „Încearcă din nou” dacă e cazul.

### 3.2 Configurare și IP hardcodat

- **apiClient:** Pe Android, dacă `EXPO_PUBLIC_API_URL` nu e setat, se folosește `http://192.168.0.148:3000/api` (IP hardcodat).
- **Îmbunătățire:** Nu hardcoda IP-ul; folosește doar `EXPO_PUBLIC_API_URL`. Adaugă **.env.example** în repo (volta_app și backend) cu toate variabilele.

### 3.3 Duplicare logică

- Configurarea notificărilor push (permisiuni, listener) este atât în **Home** cât și în **Profile**.
- **Îmbunătățire:** Un singur hook sau provider (ex: `useNotifications`) care face setup-ul la pornire; Home și Profile doar îl folosesc.

### 3.4 Date de la server – fără cache centralizat

- Fiecare ecran face fetch cu `useState`/`useEffect`; nu există cache partajat (ex: React Query).
- **Îmbunătățire:** Introdu React Query (sau similar) pentru listele principale (promoții, notificări, mesaje) pentru cache și stări consistente.

### 3.5 Fișiere foarte mari

- **Login.tsx** (~900 linii) și **Home.tsx** (~1180 linii) conțin mult JSX și logică în același fișier.
- **Îmbunătățire:** Extrage componente (ex: `DatePickerModal`, `StepIndicator`) și hook-uri (ex: `useLoginForm`, `usePromoCarousel`).

### 3.6 Tipizare

- **UserContext** folosește `any` pentru `user` și `setUser`.
- **Îmbunătățire:** Definește tipul `User` (id, nume, prenume, telefon, email?, etc.) și folosește-l în context și apiClient.

---

## 4. BAZĂ DE DATE ȘI SCHEMĂ

### 4.1 Trigger-uri PostgreSQL

- În **database_postgres.sql** sintaxa pentru trigger-uri poate fi incompatibilă cu unele versiuni (EXECUTE FUNCTION vs EXECUTE PROCEDURE).
- **Îmbunătățire:** Verifică documentația pentru versiunea ta de PostgreSQL și ajustează; documentează versiunea minimă.

### 4.2 Două tabele pentru promoții

- `promotions` și `promotions_home` + două moduri de a servi „home”.
- **Îmbunătățire:** Clarifică modelul (un tabel cu `is_home` sau două tabele cu un singur API pentru home) și documentează.

---

## 5. TESTE ȘI DOCUMENTAȚIE

### 5.1 Teste

- Nu există teste automate (nici backend, nici app).
- **Îmbunătățire:** Backend: teste de integrare pentru auth, GET user fără parolă, mesaje. Frontend: teste pentru fluxuri critice (login, promoții).

### 5.2 Documentație și env

- Nu există README la rădăcină; nu există **.env.example** în repo.
- **Îmbunătățire:** README la root cu structura proiectului și pași pentru backend + volta_app. Fișiere `.env.example` în `backend/` și `volta_app/` cu variabilele necesare și comentarii.

---

## 6. API CLIENT ȘI LOGGING

- **apiClient:** Multe `console.log` la fiecare request (URL, body, response). În producție expune date.
- **Îmbunătățire:** Loghează doar în development (`if (__DEV__)`) sau cu nivel configurabil; nu loga body-uri care conțin parole.

---

## 7. Priorizare recomandată

| Prioritate | Acțiune |
|------------|--------|
| **P0** | Elimină expunerea parolei: hash (bcrypt) + excludere `parola` din orice răspuns API (în special GET /api/users/:id). |
| **P0** | Introdu autentificare (JWT) și protejează rutele (users, messages, etc.). |
| **P1** | Repară rutele duplicate: un singur PUT /api/users/:id, un singur GET /api/notifications. |
| **P1** | Feedback utilizator la Login/Signup și la erori API (Alert/toast). |
| **P2** | Împarte server.js în rute/controllers; un singur endpoint pentru promoții home. |
| **P2** | .env.example + README la root; eliminare IP hardcodat din apiClient. |
| **P3** | Centralizare notificări push; React Query; tipizare User; reducere logging în producție. |
| **P3** | Teste de integrare backend și teste critice frontend. |

---

## Concluzie

Aplicația are o bază funcțională clară (auth, promoții, mesaje, notificări, profil, theme), dar **securitatea** (parole în clar, parolă în răspuns, lipsă auth pe API) trebuie tratată imediat. Apoi, repararea ruteleur duplicate, îmbunătățirea feedback-ului utilizatorului și refactorizarea backend-ului și a ecranelor mari vor face aplicația mai sigură, mai ușor de întreținut și mai plăcută de folosit.

Dacă vrei, putem parcurge pas cu pas implementarea pentru P0 (parole + GET user) și apoi pentru JWT și protejarea ruteleur.
