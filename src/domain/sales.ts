import { percentOfCents } from './money';
import { err, ok, type Result } from './result';
import type { Product, Sale, SaleInput, SaleItem, ValidatedSale } from './types';
import { parseIntegerInRange } from './validation/rules';
import { MAX_SALE_QUANTITY } from './validation/sale';

export interface SaleTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export interface SalePreview {
  /** Una por cada línea de la entrada, en el mismo orden. */
  lines: readonly { availableStock: number | null; subtotalCents: number | null }[];
  /** El descuento que se aplicó: uno inválido cuenta como 0. */
  discountPercent: number;
  totals: SaleTotals;
}

/** El descuento se aplica antes del IVA, y cada importe se redondea al centavo. */
export function calculateTotals(
  lines: readonly { unitPriceCents: number; quantity: number }[],
  discountPercent: number,
  taxPercent: number,
): SaleTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const discountCents = percentOfCents(subtotalCents, discountPercent);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = percentOfCents(taxableCents, taxPercent);

  return { subtotalCents, discountCents, taxCents, totalCents: taxableCents + taxCents };
}

/**
 * Calcula los totales mientras se completa una venta. Solo suma lo que la validación aceptaría,
 * salvo el stock, y usa calculateTotals: para una entrada válida, da los mismos importes que la
 * venta que se registra.
 */
export function previewSale(
  input: SaleInput,
  products: readonly Product[],
  taxPercent: number,
): SalePreview {
  const seenProductIds = new Set<string>();
  const counted: { unitPriceCents: number; quantity: number }[] = [];

  const lines = input.lines.map(({ productId, quantity: rawQuantity }) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return { availableStock: null, subtotalCents: null };

    const isRepeated = seenProductIds.has(productId);
    seenProductIds.add(productId);
    const quantity = parseIntegerInRange(rawQuantity, 1, MAX_SALE_QUANTITY);
    if (isRepeated || quantity === null) {
      return { availableStock: product.stock, subtotalCents: null };
    }

    counted.push({ unitPriceCents: product.priceCents, quantity });
    return { availableStock: product.stock, subtotalCents: product.priceCents * quantity };
  });

  const discountPercent = parseIntegerInRange(input.discountPercent, 0, 100) ?? 0;
  return { lines, discountPercent, totals: calculateTotals(counted, discountPercent, taxPercent) };
}

/**
 * Crea la venta copiando nombre, SKU, categoría y precio: si después cambia un producto
 * o se borra un cliente, el historial sigue mostrando lo que se vendió.
 */
export function buildSale(
  validated: ValidatedSale,
  meta: { id: string; number: number; taxPercent: number; now: Date },
): Sale {
  const items: readonly SaleItem[] = validated.lines.map(({ product, quantity }) => ({
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    category: product.category,
    unitPriceCents: product.priceCents,
    quantity,
  }));

  return {
    id: meta.id,
    number: meta.number,
    customerId: validated.customer.id,
    customerName: validated.customer.name,
    items,
    paymentMethod: validated.paymentMethod,
    discountPercent: validated.discountPercent,
    taxPercent: meta.taxPercent,
    ...calculateTotals(items, validated.discountPercent, meta.taxPercent),
    status: 'completed',
    createdAt: meta.now.toISOString(),
    cancelledAt: null,
  };
}

export function cancelSale(sale: Sale, now: Date): Result<Sale, 'already-cancelled'> {
  if (sale.status === 'cancelled') return err('already-cancelled');
  return ok({ ...sale, status: 'cancelled', cancelledAt: now.toISOString() });
}

export function formatSaleNumber(number: number): string {
  return `V-${String(number).padStart(6, '0')}`;
}
