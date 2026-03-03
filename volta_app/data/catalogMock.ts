/**
 * Date MOCK pentru catalog – design și flux.
 * Mai târziu înlocuim cu apeluri API către backend.
 */

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface CatalogSubcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

export interface CatalogProduct {
  id: string;
  slug?: string;
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
  categoryId: string;
  subcategoryId: string;
  description?: string;
  inStock?: boolean;
  /** Cod produs / SKU (ex: VOLTA-001) */
  sku?: string;
  /** Brand / producător */
  brand?: string;
  /** Slug brand (pentru filtre API și potrivire) */
  brandSlug?: string;
  /** Preț înainte de reducere – pentru afișare „was X, now Y” */
  oldPrice?: number;
  /** Text disponibilitate: „În stoc”, „La comandă”, „Stoc limitat” */
  inStockLabel?: string;
  /** Garanție (ex: „24 luni”) */
  warranty?: string;
  /** Specificații tehnice: listă cheie – valoare */
  specs?: { key: string; value: string }[];
  /** Info scurtă livrare (ex: „Livrare 1–3 zile”) */
  deliveryInfo?: string;
}

/** Toate categoriile (nivel 1) – identic cu meniul din app */
export const MOCK_CATEGORIES: CatalogCategory[] = [
  { id: '1', name: 'Iluminare', slug: 'iluminare' },
  { id: '2', name: 'Cablu', slug: 'cablu' },
  { id: '3', name: 'Întreruptoare, prize și contactoare', slug: 'intreruptoare-prize-contactoare' },
  { id: '4', name: 'Panouri evidență și aparate de măsură', slug: 'panouri-evidenta-aparate-masura' },
  { id: '5', name: 'Scule electrice și echipament de sudat', slug: 'scule-electrice-sudat' },
  { id: '6', name: 'Generatoare, compresoare și pompe', slug: 'generatoare-compresoare-pompe' },
  { id: '7', name: 'Stabilizatoare, transformatoare și UPS', slug: 'stabilizatoare-transformatoare-ups' },
  { id: '8', name: 'Grădinărit și inventar agricol', slug: 'gradinarit-inventar-agricol' },
  { id: '9', name: 'Ventilare, climă și instalații sanitare', slug: 'ventilare-clima-instalatii-sanitare' },
  { id: '10', name: 'Motoare și utilaj pentru construcții', slug: 'motoare-utilaj-constructii' },
  { id: '11', name: 'Scule manuale', slug: 'scule-manuale' },
  { id: '12', name: 'Elemente de fixare și consumabile', slug: 'fixare-consumabile' },
  { id: '13', name: 'Haine și echipament de protecție', slug: 'haine-echipament-protectie' },
  { id: '14', name: 'Sisteme de securitate', slug: 'sisteme-securitate' },
  { id: '15', name: 'Transport și accesorii auto', slug: 'transport-accesorii-auto' },
  { id: '16', name: 'Marfuri și tehnică de uz casnic', slug: 'marfuri-tehnica-uz-casnic' },
  { id: '17', name: 'Panouri fotovoltaice și accesorii', slug: 'panouri-fotovoltaice' },
  { id: '18', name: 'Odihnă și camping', slug: 'odihna-camping' },
];

/** Subcategorii MOCK – doar pentru câteva categorii (test design) */
export const MOCK_SUBCATEGORIES: CatalogSubcategory[] = [
  { id: 's1', name: 'Becuri și LED', slug: 'becuri-led', categoryId: '1' },
  { id: 's2', name: 'Lustre și candelabre', slug: 'lustre-candelabre', categoryId: '1' },
  { id: 's3', name: 'Spoturi și proiectoare', slug: 'spoturi-proiectoare', categoryId: '1' },
  { id: 's4', name: 'Cablu de cupru', slug: 'cablu-cupru', categoryId: '2' },
  { id: 's5', name: 'Cablu flexibil', slug: 'cablu-flexibil', categoryId: '2' },
  { id: 's6', name: 'Prize și mufe', slug: 'prize-mufe', categoryId: '3' },
  { id: 's7', name: 'Întreruptoare', slug: 'intreruptoare', categoryId: '3' },
];

/** Produse MOCK – pentru test design */
export const MOCK_PRODUCTS: CatalogProduct[] = [
  {
    id: 'p1',
    name: 'Bec LED E27 10W 3000K',
    price: 45,
    currency: 'MDL',
    image_url: null,
    categoryId: '1',
    subcategoryId: 's1',
    description: 'Bec LED echivalent 80W, lumeni 1055, culoare caldă. Ideal pentru locuințe și birouri.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'LED-E27-10W',
    brand: 'Volta',
    oldPrice: 55,
    warranty: '24 luni',
    deliveryInfo: 'Livrare 1–3 zile în Chișinău',
    specs: [
      { key: 'Soclu', value: 'E27' },
      { key: 'Putere', value: '10 W' },
      { key: 'Echivalent incandescent', value: '80 W' },
      { key: 'Flux luminos', value: '1055 lm' },
      { key: 'Temperatură culoare', value: '3000 K (cald)' },
    ],
  },
  {
    id: 'p2',
    name: 'Bec LED E14 6W 4000K',
    price: 32,
    currency: 'MDL',
    image_url: null,
    categoryId: '1',
    subcategoryId: 's1',
    description: 'Pentru lustre și aplicații decorative.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'LED-E14-6W',
    brand: 'Volta',
    warranty: '24 luni',
    deliveryInfo: 'Livrare 1–3 zile',
    specs: [
      { key: 'Soclu', value: 'E14' },
      { key: 'Putere', value: '6 W' },
      { key: 'Temperatură culoare', value: '4000 K' },
    ],
  },
  {
    id: 'p3',
    name: 'Lustră plafon 5 brațe',
    price: 890,
    currency: 'MDL',
    image_url: null,
    categoryId: '1',
    subcategoryId: 's2',
    description: 'Design modern, finisaj crom.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'LUST-5B-CROM',
    brand: 'Lumex',
    warranty: '12 luni',
    deliveryInfo: 'Livrare 2–5 zile',
    specs: [
      { key: 'Număr brațe', value: '5' },
      { key: 'Finisaj', value: 'Crom' },
      { key: 'Tip montaj', value: 'Plafon' },
    ],
  },
  {
    id: 'p4',
    name: 'Spot LED incorporabil 5W',
    price: 185,
    currency: 'MDL',
    image_url: null,
    categoryId: '1',
    subcategoryId: 's3',
    description: 'Unghi 36°, D=75mm, 3000K.',
    inStock: true,
    inStockLabel: 'Stoc limitat',
    sku: 'SPOT-LED-5W-75',
    brand: 'Volta',
    oldPrice: 220,
    warranty: '24 luni',
    deliveryInfo: 'Livrare 1–3 zile',
    specs: [
      { key: 'Putere', value: '5 W' },
      { key: 'Diametru', value: '75 mm' },
      { key: 'Unghi', value: '36°' },
      { key: 'Temperatură culoare', value: '3000 K' },
    ],
  },
  {
    id: 'p5',
    name: 'Cablu NYM 3x1.5 mm²',
    price: 28,
    currency: 'MDL',
    image_url: null,
    categoryId: '2',
    subcategoryId: 's4',
    description: 'Metru liniar. Pentru instalații interioare.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'NYM-3x1.5',
    brand: 'Electrocable',
    warranty: '—',
    deliveryInfo: 'Livrare 1–3 zile',
    specs: [
      { key: 'Secțiune', value: '3 × 1,5 mm²' },
      { key: 'Tip', value: 'NYM' },
      { key: 'Unitate', value: 'metru liniar' },
    ],
  },
  {
    id: 'p6',
    name: 'Cablu flexibil 3G1.5',
    price: 35,
    currency: 'MDL',
    image_url: null,
    categoryId: '2',
    subcategoryId: 's5',
    description: 'Metru liniar. Flexibil, rezistent la încovoiere.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'FLEX-3G1.5',
    brand: 'Electrocable',
    deliveryInfo: 'Livrare 1–3 zile',
    specs: [
      { key: 'Secțiune', value: '3 × 1,5 mm²' },
      { key: 'Tip', value: 'Flexibil' },
    ],
  },
  {
    id: 'p7',
    name: 'Priză simplă 16A albă',
    price: 78,
    currency: 'MDL',
    image_url: null,
    categoryId: '3',
    subcategoryId: 's6',
    description: 'Montaj în perete, cu contact de protecție.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'PRIZ-16A-ALB',
    brand: 'Legrand',
    warranty: '24 luni',
    deliveryInfo: 'Livrare 1–3 zile',
    specs: [
      { key: 'Curent nominal', value: '16 A' },
      { key: 'Culoare', value: 'Albă' },
      { key: 'Montaj', value: 'În perete' },
    ],
  },
  {
    id: 'p8',
    name: 'Întrerupător unipolar 10A',
    price: 52,
    currency: 'MDL',
    image_url: null,
    categoryId: '3',
    subcategoryId: 's7',
    description: 'Montaj în cutie, finisaj alb.',
    inStock: true,
    inStockLabel: 'În stoc',
    sku: 'INTR-10A-ALB',
    brand: 'Legrand',
    warranty: '24 luni',
    deliveryInfo: 'Livrare 1–3 zile',
    specs: [
      { key: 'Curent nominal', value: '10 A' },
      { key: 'Poli', value: 'Unipolar' },
      { key: 'Finisaj', value: 'Alb' },
    ],
  },
];

/** Categorii care au date mock (subcategorii + produse) – pentru navigare */
export const CATEGORIES_WITH_MOCK_DATA = ['1', '2', '3'];

export function getCategoryBySlug(slug: string): CatalogCategory | undefined {
  return MOCK_CATEGORIES.find((c) => c.slug === slug);
}

export function getSubcategoriesByCategoryId(categoryId: string): CatalogSubcategory[] {
  return MOCK_SUBCATEGORIES.filter((s) => s.categoryId === categoryId);
}

export function getProductsByCategoryId(categoryId: string): CatalogProduct[] {
  return MOCK_PRODUCTS.filter((p) => p.categoryId === categoryId);
}

export function getProductsBySubcategoryId(subcategoryId: string): CatalogProduct[] {
  return MOCK_PRODUCTS.filter((p) => p.subcategoryId === subcategoryId);
}

export function getProductById(productId: string): CatalogProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === productId);
}
