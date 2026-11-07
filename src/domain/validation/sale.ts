import { err, ok, type Result } from '../result';
import {
  PAYMENT_METHODS,
  type Customer,
  type LineError,
  type Product,
  type SaleErrors,
  type SaleField,
  type SaleInput,
  type SaleLineInput,
  type ValidatedSale,
} from '../types';
import { compactErrors, hasErrors, isOneOf, parseIntegerInRange } from './rules';

export const MAX_SALE_QUANTITY = 9_999;

function availableMessage(stock: number): string {
  return stock === 1 ? 'Solo hay 1 unidad disponible.' : `Solo hay ${stock} unidades disponibles.`;
}

function validateLines(
  inputLines: readonly SaleLineInput[],
  products: readonly Product[],
): { lines: ValidatedSale['lines']; lineErrors: Record<number, LineError> } {
  const lines: { product: Product; quantity: number }[] = [];
  const lineErrors: Record<number, LineError> = {};
  const seenProductIds = new Set<string>();

  inputLines.forEach(({ productId, quantity: rawQuantity }, index) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) {
      lineErrors[index] = { field: 'productId', message: 'Elegí un producto.' };
      return;
    }
    if (seenProductIds.has(productId)) {
      lineErrors[index] = { field: 'productId', message: 'Este producto ya está en la venta.' };
      return;
    }
    seenProductIds.add(productId);

    // Sin stock, ninguna cantidad sirve: el problema es el producto elegido.
    if (product.stock === 0) {
      lineErrors[index] = { field: 'productId', message: 'Este producto no tiene stock.' };
      return;
    }

    const quantity = parseIntegerInRange(rawQuantity, 1, MAX_SALE_QUANTITY);
    if (quantity === null) {
      lineErrors[index] = {
        field: 'quantity',
        message: 'Ingresá una cantidad entera de 1 a 9.999.',
      };
    } else if (quantity > product.stock) {
      lineErrors[index] = { field: 'quantity', message: availableMessage(product.stock) };
    } else {
      lines.push({ product, quantity });
    }
  });

  return { lines, lineErrors };
}

export function validateSale(
  input: SaleInput,
  context: { customers: readonly Customer[]; products: readonly Product[] },
): Result<ValidatedSale, SaleErrors> {
  const customer = context.customers.find((candidate) => candidate.id === input.customerId);
  const discountPercent = parseIntegerInRange(input.discountPercent, 0, 100);
  const paymentMethod = isOneOf(input.paymentMethod, PAYMENT_METHODS) ? input.paymentMethod : null;
  const { lines, lineErrors } = validateLines(input.lines, context.products);

  const fieldErrors = compactErrors<SaleField>({
    customerId: customer ? undefined : 'Elegí un cliente.',
    lines: input.lines.length > 0 ? undefined : 'Agregá al menos un producto.',
    discountPercent: discountPercent === null ? 'Ingresá un entero de 0 a 100.' : undefined,
    paymentMethod: paymentMethod === null ? 'Elegí un medio de pago.' : undefined,
  });

  if (
    hasErrors(fieldErrors) ||
    hasErrors(lineErrors) ||
    !customer ||
    discountPercent === null ||
    paymentMethod === null
  ) {
    return err(hasErrors(lineErrors) ? { ...fieldErrors, lineErrors } : fieldErrors);
  }
  return ok({ customer, lines, discountPercent, paymentMethod });
}
