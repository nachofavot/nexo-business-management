export const PRODUCT_CATEGORIES = [
  'Computación',
  'Periféricos',
  'Redes',
  'Almacenamiento',
  'Accesorios',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PAYMENT_METHODS = ['cash', 'card', 'transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALE_STATUSES = ['completed', 'cancelled'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const ACTIVITY_TYPES = ['customer', 'product', 'sale', 'settings', 'data'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const CURRENCIES = ['ARS', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const TABLE_DENSITIES = ['comfortable', 'compact'] as const;
export type TableDensity = (typeof TABLE_DENSITIES)[number];

export const ACCENTS = ['violet', 'blue'] as const;
export type Accent = (typeof ACCENTS)[number];

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  priceCents: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

/** Copia de los datos del producto al momento de vender. */
export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  category: ProductCategory;
  unitPriceCents: number;
  quantity: number;
}

export interface Sale {
  id: string;
  number: number;
  customerId: string;
  customerName: string;
  items: readonly SaleItem[];
  paymentMethod: PaymentMethod;
  discountPercent: number;
  taxPercent: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  status: SaleStatus;
  createdAt: string;
  cancelledAt: string | null;
}

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  message: string;
  createdAt: string;
}

export interface Settings {
  profile: { displayName: string; email: string; role: string };
  preferences: {
    currency: Currency;
    taxPercent: number;
    lowStockThreshold: number;
    tableDensity: TableDensity;
    accent: Accent;
  };
}

export interface Database {
  version: 1;
  customers: readonly Customer[];
  products: readonly Product[];
  sales: readonly Sale[];
  activity: readonly ActivityEntry[];
  settings: Settings;
  nextSaleNumber: number;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  company: string;
}
export type CustomerData = Pick<Customer, 'name' | 'email' | 'phone' | 'company'>;

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  price: string;
  stock: string;
}
export type ProductData = Pick<Product, 'name' | 'sku' | 'category' | 'priceCents' | 'stock'>;

export interface SaleLineInput {
  productId: string;
  quantity: string;
}

export interface SaleInput {
  customerId: string;
  lines: readonly SaleLineInput[];
  discountPercent: string;
  paymentMethod: string;
}

export interface ValidatedSale {
  customer: Customer;
  lines: readonly { product: Product; quantity: number }[];
  discountPercent: number;
  paymentMethod: PaymentMethod;
}

export type SaleErrors = FieldErrors<
  'customerId' | 'lines' | 'discountPercent' | 'paymentMethod'
> & {
  lineErrors?: Readonly<Record<number, string>>;
};

export interface PreferencesInput {
  currency: string;
  taxPercent: string;
  lowStockThreshold: string;
  tableDensity: string;
  accent: string;
}
