/**
 * API Client – comunicare cu backend-ul Volta
 * Noul backend: https://api.volta.md/app/mobile — login cu username/password, header Authorization: Token <auth_token>
 */
import type { User } from '../types/User';

/** Răspuns posibil de la GET /auth/me (câmpuri pot varia pe backend). */
export interface RawMeResponse {
  id: number;
  nume?: string;
  prenume?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  telefon?: string;
  phone?: string;
  mobile?: string;
  phone_number?: string;
  mobile_phone?: string;
  [key: string]: unknown;
}

function pickPhone(raw: RawMeResponse): string {
  const s = raw.telefon ?? raw.phone ?? raw.mobile ?? raw.phone_number ?? raw.mobile_phone;
  if (typeof s === 'string' && s.trim()) return s.trim();
  const r = raw as any;
  if (r && typeof r === 'object') {
    for (const key of ['telefon', 'phone', 'mobile', 'phone_number', 'mobile_phone', 'contact_phone']) {
      const v = r[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    if (r.profile && typeof r.profile === 'object') {
      const p = r.profile;
      const fromProfile = p.telefon ?? p.phone ?? p.mobile ?? p.phone_number ?? p.mobile_phone;
      if (typeof fromProfile === 'string' && fromProfile.trim()) return fromProfile.trim();
    }
    if (r.user_profile && typeof r.user_profile === 'object') {
      const p = r.user_profile;
      const v = p.telefon ?? p.phone ?? p.mobile ?? p.phone_number ?? p.mobile_phone;
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

/** Răspuns de la GET /user/discount-cards sau /app/mobile/user/discount-cards (listă sau paginat). */
export interface DiscountCardsResponse {
  results?: Array<{
    id: number;
    discount_value?: number;
    max_discount_percent?: number;
    expires_at?: string | null;
    barcode?: string;
    code?: string;
    [key: string]: unknown;
  }>;
  discount_cards?: { id: number; discount_value?: number; expires_at?: string | null }[];
}

function mapMeToUser(raw: RawMeResponse): User {
  const r = raw as any;
  const profile = r?.profile ?? r?.user_profile;
  const firstName = raw.prenume ?? raw.first_name ?? (profile?.name ?? '');
  const lastName = raw.nume ?? raw.last_name ?? (profile?.name_last ?? '');
  return {
    id: raw.id,
    nume: lastName,
    prenume: firstName,
    telefon: pickPhone(raw),
    email: raw.email ?? profile?.email ?? null,
    discount_cards: Array.isArray(r?.discount_cards) ? r.discount_cards : undefined,
    selected_discount_card_id: r?.selected_discount_card_id ?? null,
  };
}

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/$/, '');
  }
  // Noul backend Volta (app/mobile = auth, user, discount-cards, products mobile)
  return 'https://api.volta.md/app/mobile';
}

/** URL rădăcină pentru rutele site (main/*, shop/*) – fără /app/mobile */
function getSiteBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_SITE_API_URL) {
    return process.env.EXPO_PUBLIC_SITE_API_URL.trim().replace(/\/$/, '');
  }
  const base = getApiBaseUrl();
  return base.replace(/\/app\/mobile\/?$/i, '') || base;
}

/** Prefix opțional de limbă pentru API (ex: ro, ru). */
function getApiLocale(): string {
  const locale = process.env.EXPO_PUBLIC_API_LOCALE;
  return locale && /^[a-z]{2}$/i.test(locale) ? locale : '';
}

const API_BASE_URL = getApiBaseUrl();
const SITE_BASE_URL = getSiteBaseUrl();

/** URL-ul bazei API (pentru debug și verificare conexiune). */
export function getApiBaseUrlExport(): string {
  return getApiBaseUrl();
}

/** Baza pentru URL-uri uploads (același host ca API) – pentru imagini */
export function getUploadsBaseUrl(): string {
  const site = getSiteBaseUrl();
  return site.replace(/\/api\/?$/, '') || API_BASE_URL.replace(/\/api\/?$/, '');
}

/** Resolve URL imagine din API (localhost → host din .env) ca pe device să încarce corect */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      return getUploadsBaseUrl() + parsed.pathname;
    } catch {
      return url;
    }
  }
  if (url.startsWith('/')) return getUploadsBaseUrl() + url;
  return url;
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}
export function getAuthToken(): string | null {
  return authToken;
}

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(callback: (() => void) | null) {
  onUnauthorized = callback;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/** Item coș din API GET /orders/temporary-cart (răspuns raw array) */
export interface TemporaryCartItemRaw {
  id: number;
  user?: number;
  product: {
    id: number;
    name?: string;
    slug?: string;
    price?: string | number;
    promotion_price?: string | null;
    product_gallery?: Array<{ id?: number; image?: string; image_order?: number }>;
    [key: string]: unknown;
  };
  quantity: number;
  cart_promotion_price?: string | number;
  [key: string]: unknown;
}

/** Payload pentru POST /orders/orders */
export interface CreateOrderPayload {
  user_id: number;
  name: string;
  phone: string;
  email: string;
  delivery_type: string;
  pay_method: string;
  address: string;
  city: string;
  suburb?: string;
  comment?: string;
  total_price: string;
  total_discount: string;
  cost_of_delivery: string;
  pickup_address_id?: number;
  order_products: Array<{
    product_id: number;
    quantity: number;
    unit_price: string;
    total_price: string;
    discount?: string;
    promo_discount?: string;
  }>;
  lang?: string;
  [key: string]: unknown;
}

/** Răspuns POST /orders/orders (comandă creată) */
export interface CreateOrderResponse {
  id: number;
  status?: string;
  total_price?: string;
  [key: string]: unknown;
}

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function log(...args: unknown[]) {
  if (isDev) console.log('[API]', ...args);
}

function logError(...args: unknown[]) {
  if (isDev) console.error('[API]', ...args);
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Request la rutele site (main/*, shop/*) – folosește SITE_BASE_URL + eventual locale */
  private async requestSite<T>(path: string, options: RequestInit = {}, optionsMeta?: { skipDataUnwrap?: boolean }): Promise<ApiResponse<T>> {
    const locale = getApiLocale();
    const base = getSiteBaseUrl();
    const pathNorm = path.startsWith('/') ? path.slice(1) : path;
    const url = locale ? `${base}/${locale}/${pathNorm}` : `${base}/${pathNorm}`;
    return this.requestWithUrl<T>(url, options, optionsMeta);
  }

  private async requestWithUrl<T>(url: string, options: RequestInit = {}, optionsMeta?: { skipLogBody?: boolean; skipDataUnwrap?: boolean }): Promise<ApiResponse<T>> {
    try {
      if (isDev) {
        log('Request:', options.method || 'GET', url);
        if (!optionsMeta?.skipLogBody && options.body) log('Body:', options.body);
      }
      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        let errorData: { error?: string; message?: string; detail?: string; non_field_errors?: string[] } = { error: 'Eroare necunoscută' };
        try {
          const text = await response.text();
          if (text) errorData = JSON.parse(text);
        } catch { /* ignore */ }
        if (response.status === 401 && onUnauthorized) onUnauthorized();
        if (response.status === 404 && isDev) console.warn('[API] Not found', response.status, errorData);
        else if (response.status !== 404) logError('Error', response.status, errorData);
        const message =
          (typeof errorData.detail === 'string' && errorData.detail) ||
          (Array.isArray(errorData.non_field_errors) && errorData.non_field_errors[0]) ||
          errorData.error || errorData.message || `HTTP ${response.status}`;
        return { error: message };
      }
      let data: unknown;
      try {
        const text = await response.text();
        if (!text) {
          logError('Răspuns gol', url);
          return { error: 'Răspuns gol de la server' };
        }
        data = JSON.parse(text);
      } catch (e) {
        logError('Parse JSON', e);
        return { error: 'Răspuns invalid de la server' };
      }
      if (!optionsMeta?.skipDataUnwrap && data && typeof data === 'object' && 'data' in data) return { data: (data as { data: T }).data };
      return { data: data as T };
    } catch (error: unknown) {
      const err = error as Error;
      const isAborted = err.name === 'AbortError' || err.message?.toLowerCase().includes('abort');
      if (isAborted) logError('Request expirat (timeout 15s).');
      else logError('Network', err.message);
      return { error: isAborted ? 'Request expirat.' : (err.message || 'Eroare de conexiune') };
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    optionsMeta?: { skipLogBody?: boolean }
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    if (isDev && this.baseUrl.includes('10.0.2.2') && endpoint.includes('notifications')) {
      logError('Pe device fizic 10.0.2.2 nu este PC-ul tău. Setează EXPO_PUBLIC_API_URL în .env.');
    }
    const res = await this.requestWithUrl<T>(url, options, optionsMeta);
    if (res.error) return res;
    const data = res.data as any;
    if (data && typeof data === 'object' && 'user' in data && 'token' in data) return { data: data as T };
    if (data && typeof data === 'object' && 'auth_token' in data) return { data: data as T };
    if (data && typeof data === 'object' && 'user' in data) return { data: data.user };
    return res;
  }

  async testConnection(): Promise<boolean> {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 5000);
      const r = await fetch(`${this.baseUrl}/health`, { signal: c.signal });
      clearTimeout(t);
      return r.ok;
    } catch {
      return false;
    }
  }

  async login(telefon: string, parola: string) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ telefon, parola }),
    }, { skipLogBody: true });
  }

  /** Noul backend: login cu username (sau email) + password, răspuns conține auth_token. */
  async loginWithUsername(username: string, password: string) {
    const body: Record<string, string> = { username: username.trim(), password };
    if (username.includes('@')) {
      body.email = username.trim();
    }
    return this.request<{ auth_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }, { skipLogBody: true });
  }

  /** Noul backend: user curent (după login). */
  async getMe() {
    const res = await this.request<RawMeResponse>('/auth/me');
    if (res.error) return res;
    if (res.data) {
      return { data: mapMeToUser(res.data) };
    }
    return res;
  }

  /** Noul backend: logout (invalidare token). */
  async logout() {
    return this.request<unknown>('/auth/logout', { method: 'POST' });
  }

  /** Noul backend: cardurile de reducere ale utilizatorului curent. Răspuns poate fi { results: [...] } sau { results: [ { user, profile, discount_cards: [...] } ] } – normalizăm la listă plată. */
  async getUserDiscountCards(page: number = 1) {
    const res = await this.request<DiscountCardsResponse & { results?: Array<{ discount_cards?: unknown[] }> }>(`/user/discount-cards?page=${page}`);
    if (res.error || !res.data) return res;
    const raw = res.data as any;
    let cards: unknown[] = raw?.results ?? raw?.discount_cards ?? [];
    if (Array.isArray(cards) && cards.length > 0 && cards[0] != null && typeof cards[0] === 'object' && 'discount_cards' in (cards[0] as object)) {
      cards = (cards as Array<{ discount_cards?: unknown[] }>).flatMap((r) => Array.isArray(r?.discount_cards) ? r.discount_cards : []);
    }
    return { data: { results: cards } as DiscountCardsResponse };
  }

  async signup(data: {
    nume: string;
    prenume: string;
    telefon: string;
    data_nasterii?: string;
    sex?: string;
    parola: string;
  }) {
    return this.request<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }, { skipLogBody: true });
  }

  async getUser(id: string | number) {
    return this.request<User>(`/users/${id}`);
  }

  /** Setează cardul selectat pentru barcode (doar unul poate fi activ). */
  async setSelectedCard(userId: string | number, cardId: number | null) {
    return this.request<{ success: boolean; selected_discount_card_id: number | null }>(`/users/${userId}/selected-card`, {
      method: 'PUT',
      body: JSON.stringify({ card_id: cardId }),
    });
  }

  /** Înregistrează token-ul push Expo pentru notificări. */
  async setPushToken(userId: string | number, pushToken: string | null) {
    return this.request<{ success: boolean }>(`/users/${userId}/push-token`, {
      method: 'PUT',
      body: JSON.stringify({ push_token: pushToken }),
    });
  }

  async updateUser(id: string | number, updates: {
    nume?: string;
    prenume?: string;
    email?: string;
    parola?: string;
  }) {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, { skipLogBody: true });
  }

  async getNotifications() {
    return this.request<unknown[]>('/notifications');
  }

  async getNotificationIds() {
    return this.request<{ id: number }[]>('/notifications/ids');
  }

  async getPromotionsHome() {
    return this.request<unknown[]>('/promotions?home=1');
  }

  async getPromotions() {
    return this.request<unknown[]>('/promotions');
  }

  async getPromotion(id: string | number) {
    return this.request<unknown>(`/promotions/${id}`);
  }

  async getBlogPosts() {
    return this.request<unknown[]>('/blog');
  }

  async getBlogPost(id: string | number) {
    return this.request<unknown>(`/blog/${id}`);
  }

  async getMessages(userId?: string | number) {
    if (userId) return this.request<unknown[]>(`/messages/${userId}`);
    return this.request<unknown[]>('/messages');
  }

  async sendMessage(userId: string | number | null, message: string) {
    return this.request<unknown>('/messages', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message }),
    });
  }

  // —— Rute site (main/*, shop/*) din apisite.md ——

  /** main/slider-promotions – toate promoțiile. Acceptă array, obiect cu results/data/slider_promotions, sau structură imbricată (ex. data.results). */
  async getSliderPromotions(params?: { page_size?: number }) {
    const locale = getApiLocale();
    const base = getSiteBaseUrl();
    const pathBase = `main/slider-promotions`;
    const pageSize = params?.page_size ?? 100;
    const url = locale
      ? `${base}/${locale}/${pathBase}?page_size=${pageSize}`
      : `${base}/${pathBase}?page_size=${pageSize}`;

    const all: unknown[] = [];
    let nextUrl: string | null = url;
    const maxPages = 50;
    let pages = 0;

    while (nextUrl && pages < maxPages) {
      const res = await this.requestWithUrl<unknown>(nextUrl, {}, { skipDataUnwrap: true });
      if (res.error) return res;
      const d = res.data as any;

      let pageResults: unknown[] = [];
      let next: string | null = null;

      function extractList(obj: any): unknown[] {
        if (!obj || typeof obj !== 'object') return [];
        if (Array.isArray(obj)) return obj;
        if (Array.isArray(obj.results)) return obj.results;
        if (Array.isArray(obj.data)) return obj.data;
        if (Array.isArray(obj.slider_promotions)) return obj.slider_promotions;
        if (Array.isArray(obj.items)) return obj.items;
        if (Array.isArray(obj.promotions)) return obj.promotions;
        if (obj.data && typeof obj.data === 'object') {
          const inner = extractList(obj.data);
          if (inner.length > 0) return inner;
        }
        if (obj.products && typeof obj.products === 'object' && Array.isArray(obj.products.results)) return obj.products.results;
        return [];
      }

      pageResults = extractList(d);
      if (d && typeof d === 'object' && typeof d.next === 'string' && d.next.trim()) next = d.next.trim();

      if (pageResults.length > 0) {
        all.push(...pageResults);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[Promoții] API: primit', pageResults.length, 'iteme, total:', all.length);
        }
      }
      nextUrl = next && pageResults.length > 0 ? next : null;
      pages++;
    }

    return { data: all };
  }

  /** main/slider-promotions/{slug} – detaliu promoție */
  async getSliderPromotionBySlug(slug: string) {
    return this.requestSite<unknown>(`main/slider-promotions/${encodeURIComponent(slug)}`);
  }

  /** main/blog – lista articole blog */
  async getMainBlogPosts() {
    return this.requestSite<unknown[]>('main/blog');
  }

  /** main/blog/{slug} – un articol blog */
  async getMainBlogPostBySlug(slug: string) {
    return this.requestSite<unknown>(`main/blog/${encodeURIComponent(slug)}`);
  }

  /** main/get-shops – magazine (hartă) */
  async getShops() {
    return this.requestSite<unknown[]>('main/get-shops');
  }

  /** shop/category-in-home_page – categorii catalog */
  async getShopCategories() {
    return this.requestSite<unknown[]>('shop/category-in-home_page');
  }

  /** shop/category-in-home_page/{slug} */
  async getShopCategoryBySlug(slug: string) {
    return this.requestSite<unknown>(`shop/category-in-home_page/${encodeURIComponent(slug)}`);
  }

  /** shop/subcategory – subcategorii (query params după nevoie) */
  async getShopSubcategories(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.requestSite<unknown[]>(`shop/subcategory${q}`);
  }

  /** shop/subcategory/{slug} */
  async getShopSubcategoryBySlug(slug: string) {
    return this.requestSite<unknown>(`shop/subcategory/${encodeURIComponent(slug)}`);
  }

  /** shop/product – listă produse. Query: category__slug, subcategory__slug, page, page_size, ordering, search, brand__slug, discount__gt, price__gte, price__lte. Returnează { data, next, count } pentru paginare. */
  async getShopProducts(params?: Record<string, string | number>) {
    const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
    const res = await this.requestSite<unknown>(`shop/product${q}`);
    if (res.error) return res as ApiResponse<unknown[]>;
    const d = res.data as any;
    let list: unknown[] = [];
    let next: string | null = null;
    let count: number | undefined;
    if (d && typeof d === 'object' && Array.isArray(d?.products?.results)) {
      list = d.products.results;
      next = d.products?.next ?? d.next ?? null;
      count = d.products?.count ?? d.count;
    } else if (d && typeof d === 'object' && Array.isArray(d?.results)) {
      list = d.results;
      next = d.next ?? null;
      count = d.count;
    }
    if (next && typeof next !== 'string') next = null;
    return { data: list as unknown[], next, count } as ApiResponse<unknown[]> & { next: string | null; count?: number };
  }

  /** shop/brand – listă branduri (pentru filtre). Acceptă array direct, { data: [...] } sau { results: [...] }. */
  async getShopBrands() {
    const res = await this.requestSite<unknown>('shop/brand');
    if (res.error) return res;
    const d = res.data as any;
    let list: unknown[] = [];
    if (Array.isArray(d)) list = d;
    else if (d && typeof d === 'object' && Array.isArray(d.results)) list = d.results;
    else if (d && typeof d === 'object' && Array.isArray(d.data)) list = d.data;
    return { data: list } as ApiResponse<unknown[]>;
  }

  /** shop/product/attributes – atribute pentru filtre (brands, min_price, max_price în contextul categoriei) */
  async getShopProductAttributes(params?: Record<string, string | number>) {
    const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.requestSite<unknown>(`shop/product/attributes${q}`);
  }

  /** shop/product/{slug} – detaliu produs */
  async getShopProductBySlug(slug: string) {
    return this.requestSite<unknown>(`shop/product/${encodeURIComponent(slug)}`);
  }

  /** shop/get-stores – magazine (listă) */
  async getStores() {
    return this.requestSite<unknown[]>('shop/get-stores');
  }

  /** app/mobile/products – produse pentru mobile (ruta sub base URL app/mobile) */
  async getMobileProducts(params?: Record<string, string | number>) {
    const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<unknown[]>(`/products${q}`);
  }

  async getTemporaryCart(): Promise<ApiResponse<TemporaryCartItemRaw[]>> {
    return this.requestSite<TemporaryCartItemRaw[]>('orders/temporary-cart', {}, { skipDataUnwrap: true });
  }

  async addToTemporaryCart(productId: number, quantity: number = 1): Promise<ApiResponse<unknown>> {
    return this.requestSite('orders/temporary-cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  async updateTemporaryCartItem(cartItemId: number, quantity: number): Promise<ApiResponse<unknown>> {
    return this.requestSite(`orders/temporary-cart/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeTemporaryCartItem(cartItemId: number): Promise<ApiResponse<unknown>> {
    return this.requestSite(`orders/temporary-cart/${cartItemId}`, { method: 'DELETE' });
  }

  async deleteTemporaryCartAll(): Promise<ApiResponse<unknown>> {
    return this.requestSite<unknown>('orders/cart-delete-all', {}, { skipDataUnwrap: true });
  }

  createOrderPayload(p: {
    userId: number;
    name: string;
    phone: string;
    email: string;
    deliveryType: 'courier' | 'pickup';
    payMethod: 'cash' | 'card';
    address: string;
    city: string;
    suburb?: string;
    comment?: string;
    pickupAddressId?: number;
    totalPrice: number;
    totalDiscount?: number;
    costOfDelivery?: number;
    orderProducts: Array<{ product_id: number; quantity: number; unit_price: number; total_price: number }>;
    lang?: string;
  }): CreateOrderPayload {
    const payload: CreateOrderPayload = {
      user_id: p.userId,
      name: p.name.trim(),
      phone: p.phone.trim(),
      email: p.email.trim(),
      delivery_type: p.deliveryType,
      pay_method: p.payMethod,
      address: p.deliveryType === 'courier' ? p.address.trim() : '',
      city: p.deliveryType === 'courier' ? p.city.trim() : '',
      ...(p.suburb ? { suburb: p.suburb.trim() } : {}),
      ...(p.comment ? { comment: p.comment.trim() } : {}),
      total_price: p.totalPrice.toFixed(2),
      total_discount: (p.totalDiscount ?? 0).toFixed(2),
      cost_of_delivery: (p.costOfDelivery ?? 0).toFixed(2),
      order_products: p.orderProducts.map((op) => ({
        product_id: op.product_id,
        quantity: op.quantity,
        unit_price: op.unit_price.toFixed(2),
        total_price: op.total_price.toFixed(2),
      })),
      lang: p.lang ?? 'ro',
    };
    if (p.deliveryType === 'pickup' && p.pickupAddressId != null) {
      payload.pickup_address_id = p.pickupAddressId;
    }
    return payload;
  }

  async createOrder(payload: CreateOrderPayload): Promise<ApiResponse<CreateOrderResponse>> {
    return this.requestSite<CreateOrderResponse>('orders/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
