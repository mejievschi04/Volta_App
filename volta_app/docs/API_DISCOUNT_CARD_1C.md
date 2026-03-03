# API 1C – Carduri de reducere (discount card)

Serviciul **`lib/discountCardApi.ts`** comunică cu API-ul 1C pentru:
- validarea unui card (cod + telefon)
- recalcularea prețurilor din coș cu reducerea cardului

**Base URL:** `http://212.56.193.250/VOLTA_SQL/hs/SiteExchange`  
**Autentificare:** HTTP Basic — user: `HTTPService`, parolă: (gol)

---

## 1. Verificare status card — `getDiscountCardStatus(code, phone)`

**Request:** `GET GetDiscountCardStatus/?code=121717&phone=69796349`

- `code` — codul cardului (obligatoriu)
- `phone` — număr de telefon legat de card; se trimite **fără 0** și **fără +373** (funcția `normalizePhoneForApi()` face asta automat)

**Succes (200):** obiect cu `barcode`, `max_discount_percent`, `cashback_percent`, `card_owner`, `card_owner_phone`, `card_type`, `bonus_type`.

**Eroare (400):** `{ "Error": "The phone number does not match the registered discount card!" }` sau alt mesaj.

**În app:** poți apela la „Verifică card” / „Leagă card” când utilizatorul introduce codul și telefonul (ex. în Profil sau ecran dedicat „Adaugă card”). La succes afișezi datele cardului; la eroare afișezi `data.error`.

---

## 2. Recalculare reduceri coș — `calculateDiscounts(discountCard, items)`

**Request:** `POST CalculateDiscounts`  
**Body:**
```json
{
  "DiscountCard": "121717",
  "Items": [
    { "ProductID": "aaa26fb7-36ba-11e6-aa5a-0030489f37dc", "Quantity": 2, "Price": 884 },
    { "ProductID": "aaa26fb9-36ba-11e6-aa5a-0030489f37dc", "Quantity": 3, "Price": 1562 }
  ]
}
```

- `DiscountCard` — codul cardului
- `Items` — lista din coș: `ProductID` (UID-ul produsului în 1C), `Quantity`, `Price` (preț unitar în coș)

**Succes (200):** același `Items` cu câmpuri adăugate: `Sum`, `PriceWithDiscount`, `DiscountSum` per produs.

**Eroare (400):** ex. `{ "Error": "Discount card with code: 121717 is disabled!" }`.

**În app:** în ecranul **Coș (Cos.tsx)**:
- când utilizatorul are un card selectat (cod din Profil / UserContext), construiești `items` din `CartContext` cu `ProductID` = identificatorul produsului în sistemul 1C (dacă catalogul din app are un câmp `product_uid` sau similar, îl folosești; altfel trebuie mapare produse app → UID 1C).
- apelezi `calculateDiscounts(codCard, items)`.
- la succes afișezi totalul redus și, eventual, prețul redus per linie; la eroare afișezi mesajul din `data.error`.

**Important:** `ProductID` trebuie să fie UID-ul produsului din 1C (ex. `aaa26fb7-36ba-11e6-aa5a-0030489f37dc`). Dacă în catalogul din app ai doar `id` intern, trebuie să existe o mapare sau un câmp `product_uid` furnizat de backend.

---

## Exemplu apel din cod

```ts
import {
  getDiscountCardStatus,
  calculateDiscounts,
  normalizePhoneForApi,
} from '../lib/discountCardApi';

// Verificare card
const { data, error } = await getDiscountCardStatus('121717', '+373 69 796 349');
if (error) {
  Alert.alert('Eroare', error);
  return;
}
// data.barcode, data.card_owner, data.max_discount_percent, etc.

// Recalculare coș
const { data: calc, error: calcError } = await calculateDiscounts('121717', [
  { ProductID: 'uuid-1c-produs-1', Quantity: 2, Price: 884 },
]);
if (calcError) {
  Alert.alert('Eroare reducere', calcError);
  return;
}
// calc.Items[0].PriceWithDiscount, .DiscountSum, .Sum
```

---

## Checklist integrare

- [ ] **Profil / „Adaugă card”:** ecran sau modal unde user introduce cod + telefon → apel `getDiscountCardStatus` → la succes salvezi/afișezi cardul; la eroare afișezi mesajul.
- [ ] **Coș:** la afișare coș, dacă există card selectat și produse au UID 1C, apel `calculateDiscounts` și afișare total redus + detalii per linie (opțional).
- [ ] **Catalog/backend:** asigură-te că produsele au (sau vor avea) un câmp echivalent cu `ProductID` (UID 1C) pentru `CalculateDiscounts`.
