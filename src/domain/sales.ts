import { percentOfCents } from './money';
import { err, ok, type Result } from './result';
import type { Sale, SaleItem, ValidatedSale } from './types';

export interface SaleTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
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
