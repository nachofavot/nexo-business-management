import type { Customer, Database, Product, Sale, SaleItem, Settings } from '../domain/types';

const BASE_DATE = '2026-01-01T12:00:00.000Z';

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'c1',
    name: 'Ana Gómez',
    email: 'ana@example.com',
    phone: '+54 11 5555-0101',
    company: 'Aurora Demo',
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Monitor',
    sku: 'MON-1',
    category: 'Periféricos',
    priceCents: 1000,
    stock: 5,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export function makeSaleItem(overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    productId: 'p1',
    productName: 'Monitor',
    sku: 'MON-1',
    category: 'Periféricos',
    unitPriceCents: 1000,
    quantity: 1,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    profile: { displayName: 'Usuario Demo', email: 'demo@example.com', role: 'Administrador' },
    preferences: {
      currency: 'ARS',
      taxPercent: 21,
      lowStockThreshold: 5,
      tableDensity: 'comfortable',
      accent: 'violet',
    },
    ...overrides,
  };
}

export function makeDatabase(overrides: Partial<Database> = {}): Database {
  return {
    version: 1,
    customers: [],
    products: [],
    sales: [],
    activity: [],
    settings: makeSettings(),
    nextSaleNumber: 1,
    ...overrides,
  };
}

export function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 's1',
    number: 1,
    customerId: 'c1',
    customerName: 'Ana Gómez',
    items: [makeSaleItem()],
    paymentMethod: 'card',
    discountPercent: 0,
    taxPercent: 21,
    subtotalCents: 1000,
    discountCents: 0,
    taxCents: 210,
    totalCents: 1210,
    status: 'completed',
    createdAt: BASE_DATE,
    cancelledAt: null,
    ...overrides,
  };
}
