# Analiză UI/UX – Verificare post-îmbunătățiri (februarie 2025)

Document de verificare a stării UI/UX după implementarea priorităților P0–P3 din analiza inițială. Identifică ce a fost rezolvat și ce probleme mai rămân.

---

## 1. Status îmbunătățiri implementate (P0–P3)

| Prioritate | Îmbunătățire | Status |
|------------|--------------|--------|
| **P0** | Login/Signup: respectarea temei dark | ✅ Parțial – container și pași folosesc `colors` din theme; **StyleSheet-ul static** din Login conține încă multe valori hardcodate (#FFFFFF, #E8E8E8, #1a1a1a) pentru inputContainer, modal, butoane sex, navButton etc., deci pe dark unele zone rămân cu aspect light. |
| **P0** | Erori API: banner + Retry | ✅ Implementat – ApiErrorView pe Home, Promotii, Notifications, Mesaje. |
| **P1** | Buton Notificări mereu activ | ✅ Implementat. |
| **P1** | Mesaje: optimistic update | ✅ Implementat. |
| **P1** | Componentă PrimaryButton | ✅ Implementat – folosit pe Profile (Deconectare). |
| **P2** | Validare inline login/signup | ✅ Implementat – fieldErrors + mesaje sub câmpuri și sub data/sex. |
| **P2** | EmptyState reutilizabil + mesaje diferențiate | ✅ Implementat – Promotii (inclusiv „Toate au expirat”), Notifications, Mesaje, Blog. |
| **P2** | Accesibilitate (Label/Hint/Role) | ✅ Implementat – ApiErrorView, PrimaryButton, BottomMenu, Login inputs, Profile (Notificări, Setări), Mesaje (info). |
| **P3** | Skeleton loaders | ✅ Implementat – Home (SkeletonPromoSlide), Promotii (SkeletonCard). |
| **P3** | Grupare notificări pe dată | ✅ Implementat – „Astăzi”, „Ieri”, „Mai devreme”. |
| **P3** | Buton info Mesaje | ✅ Implementat – Alert cu program L–V 9–18 și text support. |
| **P3** | Scale tipografică (textVariants) | ✅ Parțial – `textVariants` și componenta `Typography` există; folosire **doar în EmptyState**. Restul aplicației nu folosește încă variantele (H1–H4, Body, Caption). |

---

## 2. Probleme rămase și noi identificate

### 2.1 Culori hardcodate (consistență temă)

- **Login.tsx**  
  - StyleSheet creat o singură dată conține: `backgroundColor: '#FFFFFF'`, `borderColor: '#E8E8E8'`, `color: '#1a1a1a'` în inputContainer, inputContainerFocused, modal, datePickerOption, sexButton, navButtonPrimary, etc.  
  - Pe tema dark aceste stiluri nu se schimbă (sunt statice).  
  - **Recomandare**: fie mutare în `getStyles(theme)` / stiluri inline pe baza de `colors`, fie înlocuire valorilor cu `colors.background`, `colors.border`, `colors.text`.

- **Alte ecrane**  
  - **Promotii**: `#1a1a1a`, `#333`, `#FFEE00` în StyleSheet – unele sunt brand (galben), altele ar trebui `colors.surface`, `colors.text`.  
  - **Notifications, Profile, Home, Mesaje, Blog, Harta, Settings, EditProfil, BottomMenu**: utilizare extensivă de `#FFEE00`, `#333`, `#FFFFFF`, `#F5F5F5`, `#1a1a1a`.  
  - **Recomandare**: unde nu e strict brand (galben Volta), folosire `colors.primaryButton`, `colors.surface`, `colors.background`, `colors.text`, `colors.textMuted`.

- **Loading.tsx**  
  - Ecran splash: `LinearGradient colors={['#FFFFFF', '#FAFAFA']}` – mereu alb.  
  - **Recomandare**: citire theme din ThemeContext (sau AsyncStorage) și gradient/background în funcție de temă, sau păstrare alb dacă splash-ul e intenționat neutru.

### 2.2 Tipografie – folosire consecventă

- **textVariants** și **Typography** există; sunt folosite **doar în EmptyState** (titlu H4, descriere Caption).  
- Titlurile, subtitlurile și textele de pe Home, Profile, Promotii, Notifications, Mesaje, Blog, Settings etc. au în continuare `fontSize` și `fontWeight` definite local.  
- **Recomandare**: extindere treptată a folosirii `<Typography variant="H2">`, `Body`, `Caption` pe ecrane cheie (titluri secțiuni, liste, butoane text) pentru consistență și mentenanță.

### 2.3 Mesaje – stare de încărcare la prima deschidere

- **useMessages** expune `isLoading` / `isFetching`, dar ecranul nu le folosește.  
- La prima deschidere utilizatorul vede imediat empty state „Începe conversația” până vin mesajele de la server.  
- **Recomandare**: când `isLoading && messages.length === 0` afișați un indicator discret (skeleton sau spinner mic) în zona listei, sau text „Se încarcă conversația...”.

### 2.4 Login – scroll la focus parolă

- La focus pe câmpul parolă se apelează `scrollViewRef.current?.scrollTo({ y: 280, animated: true })`.  
- Poziția 280px este fixă (cu variantă pentru isSmallScreen tot 280). Pe ecrane foarte mici sau foarte mari poate fi nepotrivită.  
- **Recomandare**: calcul dinamic (ex. `measure` pe containerul formular sau pe input) sau folosire `scrollTo` cu offset relativ la poziția câmpului.

### 2.5 Butoane – reutilizare PrimaryButton

- **PrimaryButton** este folosit doar pe Profile (Deconectare).  
- Notifications (Înapoi, Închide), Login (Continuă, Finalizează, Autentifică-te), Settings, EditProfil, Blog, blog/[id] folosesc în continuare `TouchableOpacity` + `LinearGradient` cu stiluri locale.  
- **Recomandare**: înlocuire treptată cu `<PrimaryButton title="..." onPress={...} icon="..." />` pentru consistență și accesibilitate (componenta are deja accessibilityLabel/Role).

### 2.6 EditProfil – feedback la eroare

- În `handleSave`, la `catch` se face doar `console.error` – utilizatorul nu vede niciun mesaj.  
- **Recomandare**: `Alert.alert('Eroare', err.message || 'Nu s-a putut salva. Încearcă din nou.')` sau mesaj inline lângă buton.

### 2.7 Harta – permisiune locație și temă

- La refuzul permisiunii locației se folosește `alert('...')` – diferit de restul app-ului care folosește `Alert.alert`.  
- **Recomandare**: `Alert.alert('Locație', 'Permisiunea pentru locație este necesară.')` pentru consistență.  
- Stilurile hărții (Google Maps) folosesc culori fixe (#333, #FFFFFF, #F5F5F5) – pe dark mode harta rămâne cu aspect light. Opțional: paletă map pentru dark (dacă react-native-maps o suportă).

### 2.8 Blog – încărcare și cache

- Blog și blog/[id] încarcă datele manual (useState + useEffect), fără React Query.  
- Nu există cache la navigare înapoi; loading-ul este ActivityIndicator, nu skeleton.  
- **Recomandare** (opțional): migrare la React Query pentru cache și refetch; skeleton pe listă/detalii pentru consistență cu Home/Promotii.

### 2.9 Accesibilitate – acoperire

- **Settings**: butoane (Profil, Aparență) și switch fără `accessibilityLabel` / `accessibilityRole`.  
- **EditProfil**: buton Salvează și câmpuri fără accessibility.  
- **Harta**: butoane (centrare, listă magazine) și elemente interactive fără label/hint.  
- **Recomandare**: adăugare `accessibilityLabel`, `accessibilityRole="button"` și eventual `accessibilityHint` pe toate elementele interactive din aceste ecrane.

### 2.10 Font scaling (accesibilitate)

- Dimensiunile de font sunt setate în numere fixe (px); nu se folosește `allowFontScaling` sau scale bazat pe setarea „Mărime text” din OS.  
- **Recomandare**: verificare dacă este nevoie de suport pentru mărime text mărită (ex. `maxFontSizeMultiplier` sau scale din dimensions) conform ghidurilor de accesibilitate.

### 2.11 Stiluri duplicate – Profile

- În Profile există atât `getStyles(isSmallScreen, scale)` cât și `styles` (StyleSheet.create) cu chei duplicate: `actionsSection`, `actionButton`, `actionIconContainer`, `badge`, `badgeText`.  
- **Recomandare**: unificare într-o singură sursă (fie toate în getStyles, fie toate în styles) pentru a evita divergențe la modificări.

### 2.12 Promoții – performanță timer

- Timer-ul de pe fiecare card se actualizează la interval de 1s; pe listă lungă poate implica multe re-render-uri.  
- **Recomandare** (opțional): actualizare doar pentru cardurile vizibile (ex. cu IntersectionObserver / onViewableItemsChanged) sau interval mai mare (ex. 10–30s) pentru cardurile expirate.

---

## 3. Rezumat priorități actuale

| Prioritate | Problemă | Efort estimat |
|------------|----------|----------------|
| **P1** | Login StyleSheet – înlocuire culori hardcodate cu theme (sau getStyles(theme)) pentru dark corect pe tot ecranul | Mediu |
| **P1** | EditProfil – afișare eroare la salvare (Alert sau inline) | Mic |
| **P2** | Loading.tsx – respectare temă (splash dark/light) | Mic |
| **P2** | Mesaje – indicator încărcare la prima deschidere când isLoading | Mic |
| **P2** | Harta – Alert.alert pentru permisiune locație | Mic |
| **P2** | Extindere PrimaryButton pe Notifications, Login, Settings, EditProfil, Blog | Mediu |
| **P2** | Accesibilitate Settings, EditProfil, Harta | Mic–Mediu |
| **P3** | Reducere culori hardcodate pe Promotii, Notifications, Home, etc. (trecere la colors.*) | Mare |
| **P3** | Folosire Typography / textVariants pe mai multe ecrane | Mediu |
| **P3** | Login – scroll dinamic la focus parolă | Mic |
| **P3** | Profile – unificare getStyles vs styles | Mic |
| **P3** | Blog – React Query + skeleton (opțional) | Mediu |
| **P3** | Promoții – optimizare timer (carduri vizibile / interval mai mare) | Mic |

---

## 4. Concluzie

Îmbunătățirile P0–P3 au rezolvat majoritatea punctelor critice: erori API cu Retry, optimistic update la mesaje, notificări grupate, empty states, accesibilitate de bază, skeleton-uri și scale tipografică (parțial).  

**Problemele principale rămase** sunt:  
1) **consistența temei dark** (în special Login StyleSheet și Loading splash),  
2) **feedback la erori** (EditProfil),  
3) **reutilizarea PrimaryButton** și **extinderea accesibilității** pe restul ecranelor,  
4) **reducerea culorilor hardcodate** în favoarea `colors.*` pentru mentenanță și temă corectă peste tot.

O dată rezolvate acestea, UI/UX este într-o formă foarte bună pentru producție și ușor de extins (tipografie, temă, accesibilitate).
