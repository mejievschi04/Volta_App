/**
 * Tipuri partajate pentru utilizator (API + context)
 */
export interface DiscountCardItem {
  id: number;
  discount_value: 5 | 10;
  expires_at: string | null;
  created_at?: string;
}

export interface User {
  id: number;
  nume: string;
  prenume: string;
  telefon: string;
  email?: string | null;
  data_nasterii?: string | null;
  sex?: string | null;
  puncte?: number;
  /** Lista cardurilor de reducere (mai multe per user) */
  discount_cards?: DiscountCardItem[];
  /** ID-ul cardului selectat pentru barcode (doar unul activ) */
  selected_discount_card_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type UserOrNull = User | null;
