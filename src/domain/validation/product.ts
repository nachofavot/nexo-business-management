import { parseMoneyToCents } from '../money';
import { err, ok, type Result } from '../result';
import {
  PRODUCT_CATEGORIES,
  type FieldErrors,
  type Product,
  type ProductData,
  type ProductInput,
} from '../types';
import { compactErrors, hasErrors, isOneOf, lengthError, parseIntegerInRange } from './rules';

const SKU_PATTERN = /^[A-Z0-9-]{3,20}$/;
const MAX_PRICE_CENTS = 9_999_999_999;
const MAX_STOCK = 999_999;

// Dígitos, un separador y tres o más dígitos: "12,345" tiene decimales de más y "1.234" parece un
// separador de miles. En los dos casos el arreglo es el mismo.
const TOO_MANY_DECIMALS = /^\d+[.,]\d{3,}$/;
// Bien escrito, pero tan largo que no entra en un número exacto: es un precio demasiado alto.
const WELL_FORMED_PRICE = /^\d+(?:[.,]\d{1,2})?$/;

/** Cada error de precio dice qué corregir: un mensaje único no lo explicaba. */
function priceError(raw: string, cents: number | null): string | undefined {
  const text = raw.trim();
  if (text === '') return 'Ingresá el precio.';
  if (cents === null) {
    if (TOO_MANY_DECIMALS.test(text)) return 'Usá hasta 2 decimales, sin separador de miles.';
    if (WELL_FORMED_PRICE.test(text)) return 'El precio máximo es 99.999.999,99.';
    return 'Ingresá solo números, con coma o punto para los decimales. Por ejemplo, 1234,56.';
  }
  if (cents === 0) return 'El precio tiene que ser mayor que 0.';
  if (cents > MAX_PRICE_CENTS) return 'El precio máximo es 99.999.999,99.';
  return undefined;
}

function skuError(sku: string, isTaken: boolean): string | undefined {
  if (!SKU_PATTERN.test(sku)) return 'Usá de 3 a 20 caracteres: letras, dígitos y guiones.';
  return isTaken ? 'Ya hay un producto con este SKU.' : undefined;
}

export function validateProduct(
  input: ProductInput,
  existing: readonly Product[],
  currentId?: string,
): Result<ProductData, FieldErrors<keyof ProductInput>> {
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  const category = isOneOf(input.category, PRODUCT_CATEGORIES) ? input.category : null;
  const parsedPrice = parseMoneyToCents(input.price);
  const priceMessage = priceError(input.price, parsedPrice);
  const priceCents = priceMessage === undefined ? parsedPrice : null;
  const stock = parseIntegerInRange(input.stock, 0, MAX_STOCK);

  const isSkuTaken = existing.some(
    (product) => product.id !== currentId && product.sku.toUpperCase() === sku,
  );

  const errors = compactErrors<keyof ProductInput>({
    name: lengthError(name, 2, 80),
    sku: skuError(sku, isSkuTaken),
    category: category === null ? 'Elegí una categoría.' : undefined,
    price: priceMessage,
    stock: stock === null ? `Ingresá un número entero de 0 a ${MAX_STOCK}.` : undefined,
  });

  if (hasErrors(errors) || category === null || priceCents === null || stock === null) {
    return err(errors);
  }
  return ok({ name, sku, category, priceCents, stock });
}
