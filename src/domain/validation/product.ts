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

function parsePriceCents(raw: string): number | null {
  const cents = parseMoneyToCents(raw);
  return cents !== null && cents > 0 && cents <= MAX_PRICE_CENTS ? cents : null;
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
  const priceCents = parsePriceCents(input.price);
  const stock = parseIntegerInRange(input.stock, 0, MAX_STOCK);

  const isSkuTaken = existing.some(
    (product) => product.id !== currentId && product.sku.toUpperCase() === sku,
  );

  const errors = compactErrors<keyof ProductInput>({
    name: lengthError(name, 2, 80),
    sku: skuError(sku, isSkuTaken),
    category: category === null ? 'Elegí una categoría.' : undefined,
    price:
      priceCents === null ? 'Ingresá un precio mayor que 0, sin separador de miles.' : undefined,
    stock: stock === null ? `Ingresá un número entero de 0 a ${MAX_STOCK}.` : undefined,
  });

  if (hasErrors(errors) || category === null || priceCents === null || stock === null) {
    return err(errors);
  }
  return ok({ name, sku, category, priceCents, stock });
}
