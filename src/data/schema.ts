import {
  ACCENTS,
  ACTIVITY_TYPES,
  CURRENCIES,
  PAYMENT_METHODS,
  PRODUCT_CATEGORIES,
  SALE_STATUSES,
  TABLE_DENSITIES,
  type ActivityEntry,
  type Customer,
  type Database,
  type Product,
  type Sale,
  type SaleItem,
  type Settings,
} from '../domain/types';

// LocalStorage es texto que cualquiera puede editar desde el navegador: TypeScript no puede
// garantizar su forma. Estas guardas la comprueban al leer, para que el resto de la app confíe.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isIsoDate(value: unknown): boolean {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isPositiveInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isPercent(value: unknown): boolean {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

function isMemberOf(value: unknown, options: readonly string[]): boolean {
  return isString(value) && options.includes(value);
}

function isListOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is readonly T[] {
  return Array.isArray(value) && value.every(isItem);
}

function isCustomer(value: unknown): value is Customer {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.email) &&
    isString(value.phone) &&
    isString(value.company) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.sku) &&
    isMemberOf(value.category, PRODUCT_CATEGORIES) &&
    isNonNegativeInteger(value.priceCents) &&
    isNonNegativeInteger(value.stock) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function isSaleItem(value: unknown): value is SaleItem {
  return (
    isRecord(value) &&
    isString(value.productId) &&
    isString(value.productName) &&
    isString(value.sku) &&
    isMemberOf(value.category, PRODUCT_CATEGORIES) &&
    isNonNegativeInteger(value.unitPriceCents) &&
    isPositiveInteger(value.quantity)
  );
}

function isSale(value: unknown): value is Sale {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isPositiveInteger(value.number) &&
    isString(value.customerId) &&
    isString(value.customerName) &&
    isListOf(value.items, isSaleItem) &&
    isMemberOf(value.paymentMethod, PAYMENT_METHODS) &&
    isPercent(value.discountPercent) &&
    isPercent(value.taxPercent) &&
    isNonNegativeInteger(value.subtotalCents) &&
    isNonNegativeInteger(value.discountCents) &&
    isNonNegativeInteger(value.taxCents) &&
    isNonNegativeInteger(value.totalCents) &&
    isMemberOf(value.status, SALE_STATUSES) &&
    isIsoDate(value.createdAt) &&
    (value.cancelledAt === null || isIsoDate(value.cancelledAt))
  );
}

function isActivityEntry(value: unknown): value is ActivityEntry {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isMemberOf(value.type, ACTIVITY_TYPES) &&
    isString(value.message) &&
    isIsoDate(value.createdAt)
  );
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.preferences)) return false;
  const { profile, preferences } = value;

  return (
    isString(profile.displayName) &&
    isString(profile.email) &&
    isString(profile.role) &&
    isMemberOf(preferences.currency, CURRENCIES) &&
    isPercent(preferences.taxPercent) &&
    isNonNegativeInteger(preferences.lowStockThreshold) &&
    isMemberOf(preferences.tableDensity, TABLE_DENSITIES) &&
    isMemberOf(preferences.accent, ACCENTS)
  );
}

export function isDatabase(value: unknown): value is Database {
  return (
    isRecord(value) &&
    value.version === 1 &&
    isListOf(value.customers, isCustomer) &&
    isListOf(value.products, isProduct) &&
    isListOf(value.sales, isSale) &&
    isListOf(value.activity, isActivityEntry) &&
    isSettings(value.settings) &&
    isPositiveInteger(value.nextSaleNumber)
  );
}
