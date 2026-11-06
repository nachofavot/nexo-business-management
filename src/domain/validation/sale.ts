import { err, ok, type Result } from '../result';
import {
  PAYMENT_METHODS,
  type Customer,
  type Product,
  type SaleErrors,
  type SaleInput,
  type SaleLineInput,
  type ValidatedSale,
} from '../types';
import { compactErrors, hasErrors, isOneOf, parseIntegerInRange } from './rules';

const MAX_QUANTITY = 9_999;

function validateLines(
  inputLines: readonly SaleLineInput[],
  products: readonly Product[],
): { lines: ValidatedSale['lines']; lineErrors: Record<number, string> } {
  const lines: { product: Product; quantity: number }[] = [];
  const lineErrors: Record<number, string> = {};
  const seenProductIds = new Set<string>();

  inputLines.forEach(({ productId, quantity: rawQuantity }, index) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) {
      lineErrors[index] = 'Elegí un producto.';
      return;
    }
    if (seenProductIds.has(productId)) {
      lineErrors[index] = 'Este producto ya está en la venta.';
      return;
    }
    seenProductIds.add(productId);

    const quantity = parseIntegerInRange(rawQuantity, 1, MAX_QUANTITY);
    if (quantity === null) {
      lineErrors[index] = `Ingresá una cantidad entera de 1 a ${MAX_QUANTITY}.`;
    } else if (quantity > product.stock) {
      lineErrors[index] = `Solo hay ${product.stock} unidades disponibles.`;
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

  const fieldErrors = compactErrors<'customerId' | 'lines' | 'discountPercent' | 'paymentMethod'>({
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
