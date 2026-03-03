# Endpointuri app Volta Mobile – adaptare la API-ul Volta

**Doar aplicația mobilă.** Ne adaptăm la API-ul Volta (api.volta.md). Avem base URL și autentificare (`Authorization: Token <token>`).

---

## Din apisite.md – ce folosim pentru app

Rutele de mai jos există pe site; le vom folosi în app (path-urile pot avea prefix de locale, ex. `ro/`).

| Metodă | Ruta din apisite | Pentru ce în app |
|--------|-------------------|-------------------|
| POST | **app/mobile/auth/login** | Login → token |
| POST | **app/mobile/auth/logout** | Logout |
| GET | **app/mobile/auth/me** | User curent (profil, telefon) |
| GET | **app/mobile/user/discount-cards** | Lista cardurilor de reducere ale user-ului |
| GET | **app/mobile/products** | Catalog: listă produse (pentru mobile) |
| GET | **app/mobile/discount-cards** | Carduri (catalog/listă carduri – clarificat cu API) |
| GET | **main/slider-promotions** | Promoții pentru Home (carusel) |
| GET | **main/slider-promotions/{slug}** | Detaliu promoție |
| GET | **main/blog** | Lista articole blog |
| GET | **main/blog/{slug}** | Un articol blog |
| GET | **main/get-shops** | Magazine (harta) |
| GET | **shop/category-in-home_page** | Catalog: categorii |
| GET | **shop/category-in-home_page/{slug}** | Catalog: o categorie |
| GET | **shop/subcategory** | Catalog: subcategorii |
| GET | **shop/subcategory/{slug}** | Catalog: o subcategorie |
| GET | **shop/product** | Catalog: listă produse (filtre) |
| GET | **shop/product/{slug}** | Catalog: detaliu produs |
| GET | **shop/get-stores** | Magazine (lista magazinelor) |

**Auth site (dacă folosim pentru profil):**  
- GET **auth/users/me** (cu token), PUT/PATCH **auth/users/me** (update profil), POST **auth/users/set_password** (parolă).  
- Sau profilul se actualizează doar prin **app/mobile/auth/me** și un eventual PUT pe **auth/users/me** dacă există.

**Nu sunt în apisite (sau nu le-am găsit):** signup (posibil POST **accounts/users**), notificări, notificări/ids, users/:id selected-card, push-token, mesaje (chat). Pentru acestea rămânem pe ce oferă API-ul sau le omitem în app.

---

## Endpoint → pentru ce (referință app)

| Metodă | Endpoint | Pentru ce |
|--------|----------|-----------|
| POST | `/auth/login` | Login (username + parolă) → token |
| GET | `/auth/me` | User curent (profil, telefon, carduri) |
| POST | `/auth/logout` | Logout (invalidare token) |
| POST | `/auth/signup` | Înregistrare cont nou |
| GET | `/user/discount-cards?page=1` | Lista cardurilor de reducere |
| PUT | `/users/:id/selected-card` | Setare card selectat (barcode) |
| GET | `/users/:id` | Date user după ID |
| PUT | `/users/:id` | Actualizare profil (nume, email, parolă) |
| PUT | `/users/:id/push-token` | Token push pentru notificări |
| GET | `/notifications` | Lista notificărilor |
| GET | `/notifications/ids` | ID-uri notificări (badge) |
| GET | `/promotions?home=1` | Promoții pentru Home (carusel) |
| GET | `/promotions` | Lista promoții |
| GET | `/promotions/:id` | Detaliu promoție |
| GET | `/blog` | Lista articole blog |
| GET | `/blog/:id` | Un articol blog |
| GET | `/categories` sau echivalent | Catalog: toate categoriile (meniu) |
| GET | `/categories/:id` sau `/categories/:id/subcategories` | Catalog: subcategorii |
| GET | `/products` (query: category/subcategory) | Catalog: listă produse (preț, poză, stoc) |
| GET | `/products/:id` | Catalog: detaliu produs (descriere, stoc, preț, poză, specs, garanție) |
| GET | `/messages` sau `/messages/:userId` | Mesajele (chat/suport) |
| POST | `/messages` | Trimite mesaj |

*Path-urile din apisite le mapăm la base URL-ul app-ului (ex. api.volta.md + prefix aplicabil).*
