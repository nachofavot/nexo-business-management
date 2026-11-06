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
// garantizar su forma. Estas guardas comprueban tipos y coherencia básica. No repiten las reglas
// de los formularios ni comprueban que los importes de una venta coincidan con sus líneas.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Exige el formato exacto de toISOString: los demás formatos varían según el navegador. */
function isIsoDate(value: unknown): boolean {
  if (!isString(value)) return false;

  const time = Date.parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString() === value;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
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

function hasUniqueValues<T>(items: readonly T[], getValue: (item: T) => unknown): boolean {
  return new Set(items.map(getValue)).size === items.length;
}

/** No exige que la anulación sea posterior a la venta: el reloj del usuario puede cambiar. */
function isCancellationConsistent(status: unknown, cancelledAt: unknown): boolean {
  return status === 'cancelled' ? isIsoDate(cancelledAt) : cancelledAt === null;
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
    value.items.length > 0 &&
    isMemberOf(value.paymentMethod, PAYMENT_METHODS) &&
    isPercent(value.discountPercent) &&
    isPercent(value.taxPercent) &&
    isNonNegativeInteger(value.subtotalCents) &&
    isNonNegativeInteger(value.discountCents) &&
    isNonNegativeInteger(value.taxCents) &&
    isNonNegativeInteger(value.totalCents) &&
    isMemberOf(value.status, SALE_STATUSES) &&
    isIsoDate(value.createdAt) &&
    isCancellationConsistent(value.status, value.cancelledAt)
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
  if (!isRecord(value)) return false;
  const { customers, products, sales, activity, settings, nextSaleNumber } = value;

  return (
    value.version === 1 &&
    isListOf(customers, isCustomer) &&
    isListOf(products, isProduct) &&
    isListOf(sales, isSale) &&
    isListOf(activity, isActivityEntry) &&
    isSettings(settings) &&
    isPositiveInteger(nextSaleNumber) &&
    hasUniqueValues(customers, ({ id }) => id) &&
    hasUniqueValues(products, ({ id }) => id) &&
    hasUniqueValues(sales, ({ id }) => id) &&
    hasUniqueValues(sales, ({ number }) => number) &&
    sales.every(({ number }) => number < nextSaleNumber)
  );
}
