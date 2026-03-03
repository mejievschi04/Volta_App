/**
 * API 1C pentru carduri de reducere Volta (HTTP Basic Auth).
 * Base: http://212.56.193.250/VOLTA_SQL/hs/SiteExchange
 * Auth: Basic user=HTTPService, parola din .env (EXPO_PUBLIC_VOLTA_1C_BASIC_PASSWORD).
 * Pune parola în .env și asigură-te că .env este în .gitignore.
 */

const BASE_URL = 'http://212.56.193.250/VOLTA_SQL/hs/SiteExchange';
const BASIC_USER = 'HTTPService';

function getBasicPass(): string {
  const env = typeof process !== 'undefined' && process.env;
  const pass = env?.EXPO_PUBLIC_VOLTA_1C_BASIC_PASSWORD;
  return typeof pass === 'string' ? pass : '';
}

function getBasicAuthHeader(): string {
  const pass = getBasicPass();
  const credentials = `${BASIC_USER}:${pass}`;
  if (typeof btoa !== 'undefined') {
    return 'Basic ' + btoa(credentials);
  }
  return 'Basic ' + base64Encode(credentials);
}

function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    result += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < str.length ? chars[((b & 15) << 2) | (c >> 6)] : '=') +
      (i + 2 < str.length ? chars[c & 63] : '=');
  }
  return result;
}

/** Normalizează telefonul: fără +373, fără 0 în față (conform doc: "без 0 и без +373") */
export function normalizePhoneForApi(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('373')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/** Răspuns 200 de la GetDiscountCardStatus */
export interface DiscountCardStatusResponse {
  barcode: string;
  max_discount_percent: number;
  cashback_percent: number;
  card_owner: string;
  card_owner_phone: string;
  card_type: string;
  bonus_type: string;
}

/** Item trimis la CalculateDiscounts */
export interface CalculateDiscountsItemInput {
  ProductID: string;
  Quantity: number;
  Price: number;
}

/** Item returnat de CalculateDiscounts */
export interface CalculateDiscountsItemOutput {
  ProductID: string;
  Quantity: number;
  Price: number;
  Sum: number;
  PriceWithDiscount: number;
  DiscountSum: number;
}

/** Răspuns 200 de la CalculateDiscounts */
export interface CalculateDiscountsResponse {
  Items: CalculateDiscountsItemOutput[];
}

/** Răspuns eroare 400 (ambele endpoint-uri) */
export interface DiscountApiErrorResponse {
  Error: string;
}

export interface DiscountCardApiResult<T> {
  data?: T;
  error?: string;
}

/**
 * Verifică dacă cardul cu codul dat este activ și legat de numărul de telefon.
 * GET GetDiscountCardStatus/?code=...&phone=...
 * phone: se trimite fără 0 și fără +373 (se normalizează automat dacă trimiți +373...).
 */
export async function getDiscountCardStatus(
  code: string,
  phone: string
): Promise<DiscountCardApiResult<DiscountCardStatusResponse>> {
  const normalizedPhone = normalizePhoneForApi(phone);
  const params = new URLSearchParams({ code: code.trim(), phone: normalizedPhone });
  const url = `${BASE_URL}/GetDiscountCardStatus/?${params.toString()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: getBasicAuthHeader(),
      },
    });
    const text = await response.text();
    let json: DiscountCardStatusResponse | DiscountApiErrorResponse;
    try {
      json = JSON.parse(text);
    } catch {
      return { error: 'Răspuns invalid de la server' };
    }
    if (!response.ok) {
      const err = json as DiscountApiErrorResponse;
      return { error: err.Error || text || `HTTP ${response.status}` };
    }
    return { data: json as DiscountCardStatusResponse };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Eroare de conexiune';
    return { error: message };
  }
}

/**
 * Recalculează prețurile cu reducerea pentru cardul dat.
 * POST CalculateDiscounts, body: { DiscountCard, Items: [{ ProductID, Quantity, Price }] }.
 */
export async function calculateDiscounts(
  discountCard: string,
  items: CalculateDiscountsItemInput[]
): Promise<DiscountCardApiResult<CalculateDiscountsResponse>> {
  const url = `${BASE_URL}/CalculateDiscounts`;
  const body = JSON.stringify({
    DiscountCard: String(discountCard).trim(),
    Items: items.map((item) => ({
      ProductID: item.ProductID,
      Quantity: item.Quantity,
      Price: item.Price,
    })),
  });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body,
    });
    const text = await response.text();
    let json: CalculateDiscountsResponse | DiscountApiErrorResponse;
    try {
      json = JSON.parse(text);
    } catch {
      return { error: 'Răspuns invalid de la server' };
    }
    if (!response.ok) {
      const err = json as DiscountApiErrorResponse;
      return { error: err.Error || text || `HTTP ${response.status}` };
    }
    return { data: json as CalculateDiscountsResponse };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Eroare de conexiune';
    return { error: message };
  }
}
