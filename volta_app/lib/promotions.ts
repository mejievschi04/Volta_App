/**
 * Utilitare comune pentru promoții: normalizare câmpuri API și filtru (doar neexpirate).
 * Folosit în Home (slider) și Promotii (listă).
 */

export type PromoRaw = Record<string, unknown> & {
  id?: string | number;
  slug?: string;
  title?: string;
  date_finish?: string;
  deadline?: string;
  date_start?: string;
  image_mobile?: string;
  image_pc?: string;
  image_url?: string;
  image?: string;
  image_home_url?: string;
  created_at?: string;
};

export type PromoNormalized = PromoRaw & {
  id: string;
  deadline: string;
  date_start?: string;
  image_url: string;
  image: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Extrage data de expirare din obiectul promo (API folosește date_finish sau deadline). */
export function getPromoDeadline(promo: PromoRaw): string | null {
  const raw = promo?.date_finish ?? promo?.deadline;
  if (raw == null || typeof raw !== 'string') return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : raw;
}

/** Verifică dacă promoția nu e expirată: deadline >= now (sau lipsă deadline = afișăm). */
export function isPromoNotExpired(promo: PromoRaw, now: number = Date.now()): boolean {
  const deadlineStr = getPromoDeadline(promo);
  if (!deadlineStr) return true;
  const end = new Date(deadlineStr).getTime();
  if (Number.isNaN(end)) return true;
  return end >= now;
}

/** Normalizează un item primit de la API: deadline, imagine, id. */
export function normalizePromo(promo: PromoRaw): PromoNormalized {
  const deadline = getPromoDeadline(promo) ?? '';
  const image_url =
    (promo?.image_mobile ?? promo?.image_pc ?? promo?.image_home_url ?? promo?.image_url ?? promo?.image) as string | undefined ?? '';
  const id = promo?.id != null ? String(promo.id) : (promo?.slug ? String(promo.slug) : `promo-${Math.random().toString(36).slice(2)}`);
  return {
    ...promo,
    id,
    deadline,
    date_start: promo?.date_start as string | undefined,
    image_url,
    image: image_url,
  } as PromoNormalized;
}

/** Filtrează doar promoțiile neexpirate și le sortează după deadline (cele care expiră mai devreme primele). */
export function filterAndSortPromotions(rawList: PromoRaw[]): PromoNormalized[] {
  const now = Date.now();
  const normalized = (rawList ?? []).map(normalizePromo);
  const filtered = normalized.filter((p) => isPromoNotExpired(p, now));

  /** Timestamp pentru sortare; deadline gol sau invalid → Infinity (la final). */
  const getSortTime = (p: PromoNormalized): number => {
    if (!p.deadline || typeof p.deadline !== 'string' || p.deadline.trim() === '') return Infinity;
    const t = new Date(p.deadline.trim()).getTime();
    return Number.isNaN(t) ? Infinity : t;
  };

  const getSortOrder = (p: PromoNormalized): number => {
    const s = (p as any).sort;
    if (typeof s === 'number' && !Number.isNaN(s)) return s;
    return 0;
  };

  return filtered.sort((a, b) => {
    const endA = getSortTime(a);
    const endB = getSortTime(b);
    if (endA !== endB) return endA - endB;
    // La același deadline: după câmpul "sort" din API (ordine admin)
    return getSortOrder(a) - getSortOrder(b);
  });
}

/** Calculează timp rămas până la deadline (pentru afișare countdown). */
export function getTimeLeftUntil(deadlineStr: string, now: number = Date.now()): { days: number; hours: number; minutes: number } {
  const end = new Date(deadlineStr).getTime();
  const diff = end - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / MS_PER_DAY);
  const hours = Math.floor((diff % MS_PER_DAY) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return { days, hours, minutes };
}

/** Verifică dacă o promoție e expirată (pentru badge „EXPIRATĂ”). */
export function isPromoExpired(promo: PromoRaw | PromoNormalized, now: number = Date.now()): boolean {
  return !isPromoNotExpired(promo as PromoRaw, now);
}
