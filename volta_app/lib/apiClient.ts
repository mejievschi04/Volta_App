// API Client pentru comunicarea cu backend-ul MySQL
import { Platform } from 'react-native';

// Obține URL-ul API din variabilele de mediu
// Pentru Expo, variabilele de mediu trebuie să înceapă cu EXPO_PUBLIC_
// Setează EXPO_PUBLIC_API_URL în fișierul .env sau în variabilele de mediu

// Funcție pentru a obține URL-ul API corect în funcție de platformă
function getApiBaseUrl(): string {
  // Dacă este setat explicit, folosește-l
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Pentru Android emulator, folosește 10.0.2.2 în loc de localhost
  // Pentru iOS simulator, localhost ar trebui să funcționeze
  // Pentru web, localhost funcționează normal
  // Pentru dispozitive fizice, va trebui să folosești IP-ul mașinii tale (ex: http://192.168.1.X:3000/api)
  
  if (Platform.OS === 'android') {
    // Android emulator: folosește IP-ul local al mașinii
    // 10.0.2.2 nu funcționează în toate cazurile, deci folosim IP-ul local direct
    // Poți seta EXPO_PUBLIC_API_URL în .env pentru a forța un IP specific
    // IP-ul local al acestei mașini este: 192.168.0.148
    // Dacă IP-ul tău este diferit, creează un fișier .env în volta_app/ cu:
    // EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api
    return 'http://192.168.0.148:3000/api';
  } else if (Platform.OS === 'ios') {
    // iOS simulator poate folosi localhost
    return 'http://localhost:3000/api';
  } else {
    // Web sau alte platforme
    return 'http://localhost:3000/api';
  }
}

const API_BASE_URL = getApiBaseUrl();

// Log URL-ul folosit pentru debugging
console.log('[API Client] Platform:', Platform.OS);
console.log('[API Client] Base URL configurat:', API_BASE_URL);

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`[API] Requesting: ${url}`);
      console.log(`[API] Method: ${options.method || 'GET'}`);
      console.log(`[API] Body:`, options.body);
      
      // Adaugă timeout pentru request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secunde timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);

      // Verifică tipul conținutului
      const contentType = response.headers.get('content-type');
      console.log(`[API] Content-Type: ${contentType}`);
      
      if (!response.ok) {
        let errorData: any = { error: 'Eroare necunoscută' };
        try {
          const text = await response.text();
          console.log(`[API] Error response text:`, text);
          if (text) {
            errorData = JSON.parse(text);
          }
        } catch (e) {
          console.error(`[API] Nu s-a putut parsa răspunsul de eroare:`, e);
        }
        console.error(`[API] Error ${response.status}:`, errorData);
        return { error: errorData.error || errorData.message || `HTTP ${response.status}` };
      }

      // Încearcă să parseze răspunsul
      let data: any;
      try {
        const text = await response.text();
        console.log(`[API] Response text:`, text);
        if (text) {
          data = JSON.parse(text);
        } else {
          console.warn(`[API] Răspuns gol de la ${url}`);
          return { error: 'Răspuns gol de la server' };
        }
      } catch (e) {
        console.error(`[API] Eroare la parsarea JSON:`, e);
        return { error: 'Răspuns invalid de la server' };
      }
      
      console.log(`[API] Success: ${url}`);
      console.log(`[API] Response data:`, JSON.stringify(data, null, 2));
      
      // Dacă backend-ul returnează datele într-un obiect wrapper (ex: { user: {...} })
      // sau direct, normalizăm răspunsul
      if (data.user) {
        data = data.user;
      } else if (data.data) {
        data = data.data;
      }
      
      return { data };
    } catch (error: any) {
      console.error('[API] Network Error:', error);
      console.error('[API] Error type:', error.constructor.name);
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
      console.error('[API] URL attempted:', `${this.baseUrl}${endpoint}`);
      console.error('[API] Base URL:', this.baseUrl);
      
      // Mesaj de eroare mai descriptiv
      let errorMessage = 'Eroare de conexiune';
      
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        const platformHint = Platform.OS === 'android'
          ? '\n\nPentru Android emulator:\n1. Verifică că backend-ul rulează (cd backend && npm start)\n2. Dacă 10.0.2.2 nu funcționează, obține IP-ul local al mașinii (ipconfig) și setează EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api în .env\n3. Repornește aplicația după modificarea .env'
          : '\n\nPentru iOS simulator:\n1. Verifică că backend-ul rulează\n2. localhost ar trebui să funcționeze automat';
        errorMessage = `Request-ul a expirat. Backend-ul nu răspunde în 10 secunde.${platformHint}`;
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        const platformHint = Platform.OS === 'android' 
          ? '\n\nPentru Android emulator:\n1. Verifică că backend-ul rulează (cd backend && npm start)\n2. Dacă 10.0.2.2 nu funcționează, obține IP-ul local (ipconfig) și setează EXPO_PUBLIC_API_URL=http://YOUR_IP:3000/api în .env\n3. Repornește aplicația'
          : '\n\nPentru iOS simulator:\n1. Verifică că backend-ul rulează\n2. Pentru dispozitiv fizic, folosește IP-ul mașinii (ex: http://192.168.1.X:3000/api)';
        errorMessage = `Nu se poate conecta la server. Verifică că backend-ul rulează pe portul 3000.${platformHint}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { error: errorMessage };
    }
  }
  
  // Metodă pentru testarea conectivității
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Auth methods
  async login(telefon: string, parola: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ telefon, parola }),
    });
  }

  async signup(data: {
    nume: string;
    prenume: string;
    telefon: string;
    data_nasterii?: string;
    sex?: string;
    parola: string;
  }) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User methods
  async getUser(id: string | number) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string | number, updates: {
    nume?: string;
    prenume?: string;
    email?: string;
    parola?: string;
  }) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Notifications methods
  async getNotifications() {
    return this.request('/notifications');
  }

  async getNotificationIds() {
    return this.request('/notifications/ids');
  }

  // Promotions methods
  async getPromotionsHome() {
    // Returnează promoțiile care au image_home_url pentru pagina Home
    const { data, error } = await this.request('/promotions');
    if (error) return { error };
    
    // Filtrează doar promoțiile care au image_home_url
    const homePromotions = (data || []).filter((promo: any) => promo.image_home_url);
    return { data: homePromotions };
  }

  async getPromotions() {
    return this.request('/promotions');
  }

  // Blog methods
  async getBlogPosts() {
    return this.request('/blog');
  }

  async getBlogPost(id: string | number) {
    return this.request(`/blog/${id}`);
  }

  // Messages methods
  async getMessages(userId?: string | number) {
    if (userId) {
      return this.request(`/messages/${userId}`);
    }
    return this.request('/messages');
  }

  async sendMessage(userId: string | number | null, message: string) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        message: message,
      }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

