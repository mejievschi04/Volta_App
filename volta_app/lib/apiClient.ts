/**
 * API Client – comunicare cu backend-ul Volta
 * Pe device Android fizic: setează EXPO_PUBLIC_API_URL în .env (ex: http://192.168.1.100:3000/api).
 */
import { Platform } from 'react-native';
import type { User } from '../types/User';

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/$/, '');
  }
  // Android emulator: 10.0.2.2 = host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }
  return 'http://localhost:3000/api';
}

const API_BASE_URL = getApiBaseUrl();

/** Baza pentru URL-uri uploads (același host ca API, fără /api) – pentru imagini pe device/emulator */
export function getUploadsBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/?$/, '');
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    optionsMeta?: { skipLogBody?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
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
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: { error?: string; message?: string } = { error: 'Eroare necunoscută' };
        try {
          const text = await response.text();
          if (text) errorData = JSON.parse(text);
        } catch {
          // ignore
        }
        if (response.status === 401 && onUnauthorized) onUnauthorized();
        logError('Error', response.status, errorData);
        return { error: errorData.error || errorData.message || `HTTP ${response.status}` };
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

      if (data && typeof data === 'object' && 'user' in data && 'token' in data) {
        return { data: data as T };
      }
      if (data && typeof data === 'object' && 'user' in data) {
        return { data: (data as { user: T }).user };
      }
      if (data && typeof data === 'object' && 'data' in data) {
        return { data: (data as { data: T }).data };
      }
      return { data: data as T };
    } catch (error: unknown) {
      const err = error as Error;
      const isAborted = err.name === 'AbortError' || err.message?.toLowerCase().includes('abort');
      if (isAborted) {
        logError('Request expirat (timeout 15s). Verifică că backend-ul rulează pe portul 3000.');
      } else {
        logError('Network', err.message);
      }
      let errorMessage = 'Eroare de conexiune';
      if (isAborted) {
        errorMessage = 'Request expirat. Verifică că backend-ul rulează.';
      } else if (err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'Nu se poate conecta la server. Pe device fizic setează EXPO_PUBLIC_API_URL în .env (ex: http://IP_TA:3000/api).';
      } else if (err.message) {
        errorMessage = err.message;
      }
      return { error: errorMessage };
    }
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
}

export const apiClient = new ApiClient(API_BASE_URL);
