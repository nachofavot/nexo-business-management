import { describe, expect, it } from 'vitest';
import { makeProduct } from '../testing/fixtures';
import { err } from './result';
import { decreaseStock, isLowStock, isOutOfStock, restoreStock } from './stock';

const now = new Date('2026-11-05T12:00:00.000Z');
const products = [makeProduct({ id: 'p1', stock: 5 }), makeProduct({ id: 'p2', stock: 2 })];

describe('decreaseStock', () => {
  it('descuenta cada línea y actualiza la fecha', () => {
    const result = decreaseStock(
      products,
      [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 2 },
      ],
      now,
    );

    expect(result).toEqual({
      ok: true,
      value: [
        { ...products[0], stock: 3, updatedAt: '2026-11-05T12:00:00.000Z' },
        { ...products[1], stock: 0, updatedAt: '2026-11-05T12:00:00.000Z' },
      ],
    });
  });

  it('no modifica los productos originales', () => {
    decreaseStock(products, [{ productId: 'p1', quantity: 2 }], now);

    expect(products[0]?.stock).toBe(5);
  });

  it('rechaza toda la operación si una línea no alcanza', () => {
    const result = decreaseStock(
      products,
      [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 3 },
      ],
      now,
    );

    expect(result).toEqual(err({ productId: 'p2', requested: 3, available: 2 }));
  });

  it('suma las cantidades de un producto repetido', () => {
    const result = decreaseStock(
      products,
      [
        { productId: 'p1', quantity: 3 },
        { productId: 'p1', quantity: 3 },
      ],
      now,
    );

    expect(result).toEqual(err({ productId: 'p1', requested: 6, available: 5 }));
  });

  it('rechaza un producto inexistente', () => {
    const result = decreaseStock(products, [{ productId: 'x', quantity: 1 }], now);

    expect(result).toEqual(err({ productId: 'x', requested: 1, available: 0 }));
  });
});

describe('restoreStock', () => {
  it('devuelve el stock e ignora los productos borrados', () => {
    const result = restoreStock(
      products,
      [
        { productId: 'p1', quantity: 2 },
        { productId: 'x', quantity: 1 },
      ],
      now,
    );

    expect(result).toEqual([
      { ...products[0], stock: 7, updatedAt: '2026-11-05T12:00:00.000Z' },
      products[1],
    ]);
  });
});

describe('isLowStock', () => {
  it.each([
    [5, true],
    [0, true],
    [6, false],
  ])('con umbral 5 y stock %i da %s', (stock, expected) => {
    expect(isLowStock(makeProduct({ stock }), 5)).toBe(expected);
  });
});

describe('isOutOfStock', () => {
  it.each([
    [0, true],
    [1, false],
  ])('con stock %i da %s', (stock, expected) => {
    expect(isOutOfStock(makeProduct({ stock }))).toBe(expected);
  });
});
