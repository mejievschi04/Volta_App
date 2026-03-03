# Volta Mobile App

Aplicație mobilă (Expo / React Native) care folosește API-ul Volta (api.volta.md). Opțional: panou admin în folderul `admin/` (build → `admin/dist`).

## Structura proiectului

```
VoltaMobileApp/
├── volta_app/        # Aplicația mobilă (Expo)
│   ├── app/          # Ecrane (Expo Router), context, components
│   ├── lib/          # apiClient
│   ├── hooks/
│   ├── types/
│   └── .env.example
├── admin/            # Panou admin (Vite + React), build → admin/dist
├── ANALIZA_APLICATIE.md
├── apisite.md        # Rute API site (main/*, shop/*)
├── api_endpoints_request_fields.txt
└── README.md
```

## Cerințe

- **Node.js** 18+
- **Expo CLI** (pentru app: `npx expo start`)

## Pornire rapidă – Aplicația mobilă

```bash
cd volta_app
cp .env.example .env
# Setează EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SITE_API_URL dacă e cazul (implicit: api.volta.md)
npm install
npx expo start
```

App-ul folosește API-ul Volta (auth, catalog, promoții, blog etc.). Vezi `volta_app/docs/ENDPOINTURI_BACKEND_VOLTA.md` pentru endpointuri.

## Admin (opțional)

```bash
cd admin
npm install
npm run build
```

Build-ul se generează în `admin/dist`. Poți servi acest folder cu orice server static sau îl poți deploya unde ai nevoie.

## Documentație

- **Endpointuri API:** `volta_app/docs/ENDPOINTURI_BACKEND_VOLTA.md`
- **Analiză:** `ANALIZA_APLICATIE.md`
