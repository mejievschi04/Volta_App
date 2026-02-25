/**
 * Tipuri partajate pentru utilizator (API + context)
 */
export interface User {
  id: number;
  nume: string;
  prenume: string;
  telefon: string;
  email?: string | null;
  data_nasterii?: string | null;
  sex?: string | null;
  puncte?: number;
  created_at?: string;
  updated_at?: string;
}

export type UserOrNull = User | null;
