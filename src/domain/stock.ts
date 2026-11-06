import { err, ok, type Result } from './result';
import type { Product } from './types';

export interface StockChange {
  productId: string;
  quantity: number;
}

export interface StockShortage {
  productId: string;
  requested: number;
  available: number;
}

function sumByProduct(changes: readonly StockChange[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const { productId, quantity } of changes) {
    totals.set(productId, (totals.get(productId) ?? 0) + quantity);
  }
  return totals;
}

function applyStockDeltas(
  products: readonly Product[],
  deltas: Map<string, number>,
  now: Date,
): readonly Product[] {
  return products.map((product) => {
    const delta = deltas.get(product.id);
    if (delta === undefined) return product;
    return { ...product, stock: product.stock + delta, updatedAt: now.toISOString() };
  });
}

/** Comprueba todas las líneas antes de cambiar nada: o se descuentan todas o ninguna. */
export function decreaseStock(
  products: readonly Product[],
  changes: readonly StockChange[],
  now: Date,
): Result<readonly Product[], StockShortage> {
  const requestedByProduct = sumByProduct(changes);

  for (const [productId, requested] of requestedByProduct) {
    const available = products.find((product) => product.id === productId)?.stock ?? 0;
    if (requested > available) return err({ productId, requested, available });
  }

  const deltas = new Map(
    [...requestedByProduct].map(([productId, requested]) => [productId, -requested]),
  );
  return ok(applyStockDeltas(products, deltas, now));
}

/** Los productos que ya no existen se ignoran: no hay dónde devolver su stock. */
export function restoreStock(
  products: readonly Product[],
  changes: readonly StockChange[],
  now: Date,
): readonly Product[] {
  return applyStockDeltas(products, sumByProduct(changes), now);
}

export function isLowStock(product: Product, threshold: number): boolean {
  return product.stock <= threshold;
}

export function isOutOfStock(product: Product): boolean {
  return product.stock === 0;
}
