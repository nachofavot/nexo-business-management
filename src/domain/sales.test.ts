import { describe, expect, it } from 'vitest';
import { makeCustomer, makeProduct, makeSale } from '../testing/fixtures';
import { err } from './result';
import { buildSale, calculateTotals, cancelSale, formatSaleNumber, previewSale } from './sales';
import type { SaleInput } from './types';

const line = (unitPriceCents: number, quantity: number) => ({ unitPriceCents, quantity });

describe('calculateTotals', () => {
  it('suma las líneas y aplica descuento e IVA', () => {
    expect(calculateTotals([line(1000, 2), line(550, 1)], 10, 21)).toEqual({
      subtotalCents: 2550,
      discountCents: 255,
      taxCents: 482,
      totalCents: 2777,
    });
  });

  it('calcula el IVA después del descuento', () => {
    expect(calculateTotals([line(1000, 1)], 50, 21)).toEqual({
      subtotalCents: 1000,
      discountCents: 500,
      taxCents: 105,
      totalCents: 605,
    });
  });

  it('redondea las mitades hacia arriba', () => {
    expect(calculateTotals([line(1005, 1)], 50, 0)).toEqual({
      subtotalCents: 1005,
      discountCents: 503,
      taxCents: 0,
      totalCents: 502,
    });
  });

  it('no descuenta nada con 0 %', () => {
    expect(calculateTotals([line(1000, 3)], 0, 21)).toEqual({
      subtotalCents: 3000,
      discountCents: 0,
      taxCents: 630,
      totalCents: 3630,
    });
  });

  it('deja el total en 0 con un descuento de 100 %', () => {
    expect(calculateTotals([line(1000, 3)], 100, 21)).toEqual({
      subtotalCents: 3000,
      discountCents: 3000,
      taxCents: 0,
      totalCents: 0,
    });
  });

  it('da todo 0 sin líneas', () => {
    expect(calculateTotals([], 10, 21)).toEqual({
      subtotalCents: 0,
      discountCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });
});

describe('buildSale', () => {
  it('copia los datos del cliente y del producto y calcula los totales', () => {
    const sale = buildSale(
      {
        customer: makeCustomer({ id: 'c1', name: 'Ana Gómez' }),
        lines: [
          {
            product: makeProduct({
              id: 'p1',
              name: 'Monitor',
              sku: 'MON-1',
              category: 'Periféricos',
              priceCents: 1000,
            }),
            quantity: 2,
          },
        ],
        discountPercent: 0,
        paymentMethod: 'card',
      },
      { id: 's1', number: 7, taxPercent: 21, now: new Date('2026-11-05T12:00:00.000Z') },
    );

    expect(sale).toEqual({
      id: 's1',
      number: 7,
      customerId: 'c1',
      customerName: 'Ana Gómez',
      items: [
        {
          productId: 'p1',
          productName: 'Monitor',
          sku: 'MON-1',
          category: 'Periféricos',
          unitPriceCents: 1000,
          quantity: 2,
        },
      ],
      paymentMethod: 'card',
      discountPercent: 0,
      taxPercent: 21,
      subtotalCents: 2000,
      discountCents: 0,
      taxCents: 420,
      totalCents: 2420,
      status: 'completed',
      createdAt: '2026-11-05T12:00:00.000Z',
      cancelledAt: null,
    });
  });
});

describe('buildSale con otro IVA', () => {
  it('guarda y aplica el IVA recibido', () => {
    const sale = buildSale(
      {
        customer: makeCustomer(),
        lines: [{ product: makeProduct({ priceCents: 1000 }), quantity: 2 }],
        discountPercent: 0,
        paymentMethod: 'cash',
      },
      { id: 's1', number: 1, taxPercent: 10.5, now: new Date('2026-11-05T12:00:00.000Z') },
    );

    expect(sale).toMatchObject({ taxPercent: 10.5, taxCents: 210, totalCents: 2210 });
  });
});

describe('cancelSale', () => {
  const now = new Date('2026-11-05T15:00:00.000Z');

  it('marca la venta como anulada y conserva los importes', () => {
    const sale = makeSale({ totalCents: 1210 });

    const result = cancelSale(sale, now);

    expect(result).toEqual({
      ok: true,
      value: { ...sale, status: 'cancelled', cancelledAt: '2026-11-05T15:00:00.000Z' },
    });
  });

  it('no modifica la venta original', () => {
    const sale = makeSale();

    cancelSale(sale, now);

    expect(sale.status).toBe('completed');
    expect(sale.cancelledAt).toBeNull();
  });

  it('rechaza anular dos veces', () => {
    const sale = makeSale({ status: 'cancelled', cancelledAt: '2026-11-01T10:00:00.000Z' });

    expect(cancelSale(sale, now)).toEqual(err('already-cancelled'));
  });
});

describe('formatSaleNumber', () => {
  it.each([
    [123, 'V-000123'],
    [1234567, 'V-1234567'],
  ])('muestra %i como %s', (number, expected) => {
    expect(formatSaleNumber(number)).toBe(expected);
  });
});

describe('previewSale', () => {
  const products = [
    makeProduct({ id: 'p1', priceCents: 1000, stock: 5 }),
    makeProduct({ id: 'p2', priceCents: 2500, stock: 10 }),
  ];
  const zero = { subtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 0 };

  function input(lines: SaleInput['lines'], discountPercent = '0'): SaleInput {
    return { customerId: 'c1', lines, discountPercent, paymentMethod: 'card' };
  }

  it('da todo en 0 sin líneas', () => {
    expect(previewSale(input([]), products, 21)).toEqual({
      lines: [],
      discountPercent: 0,
      totals: zero,
    });
  });

  it('calcula una línea con IVA', () => {
    expect(previewSale(input([{ productId: 'p1', quantity: '2' }]), products, 21)).toEqual({
      lines: [{ availableStock: 5, subtotalCents: 2000 }],
      discountPercent: 0,
      totals: { subtotalCents: 2000, discountCents: 0, taxCents: 420, totalCents: 2420 },
    });
  });

  it('aplica el descuento antes del IVA', () => {
    const lines = [
      { productId: 'p1', quantity: '2' },
      { productId: 'p2', quantity: '1' },
    ];

    expect(previewSale(input(lines, '10'), products, 21)).toEqual({
      lines: [
        { availableStock: 5, subtotalCents: 2000 },
        { availableStock: 10, subtotalCents: 2500 },
      ],
      discountPercent: 10,
      totals: { subtotalCents: 4500, discountCents: 450, taxCents: 851, totalCents: 4901 },
    });
  });

  it('no suma una línea sin producto', () => {
    const lines = [
      { productId: 'p1', quantity: '2' },
      { productId: '', quantity: '3' },
    ];
    const preview = previewSale(input(lines), products, 21);

    expect(preview.lines[1]).toEqual({ availableStock: null, subtotalCents: null });
    expect(preview.totals.subtotalCents).toBe(2000);
  });

  it.each(['abc', '0', '10000'])('no suma la cantidad "%s"', (quantity) => {
    const preview = previewSale(input([{ productId: 'p1', quantity }]), products, 21);

    expect(preview).toEqual({
      lines: [{ availableStock: 5, subtotalCents: null }],
      discountPercent: 0,
      totals: zero,
    });
  });

  it('suma una sola vez el producto repetido, igual que la validación', () => {
    const lines = [
      { productId: 'p1', quantity: '2' },
      { productId: 'p1', quantity: '3' },
    ];
    const preview = previewSale(input(lines), products, 21);

    expect(preview.lines).toEqual([
      { availableStock: 5, subtotalCents: 2000 },
      { availableStock: 5, subtotalCents: null },
    ]);
    expect(preview.totals.subtotalCents).toBe(2000);
  });

  it('suma aunque supere el stock, porque eso lo controla la validación', () => {
    const preview = previewSale(input([{ productId: 'p1', quantity: '9' }]), products, 21);

    expect(preview.lines).toEqual([{ availableStock: 5, subtotalCents: 9000 }]);
  });

  it.each(['abc', '150'])('cuenta el descuento "%s" como 0', (discountPercent) => {
    const preview = previewSale(
      input([{ productId: 'p1', quantity: '2' }], discountPercent),
      products,
      21,
    );

    expect(preview.discountPercent).toBe(0);
    expect(preview.totals).toEqual({
      subtotalCents: 2000,
      discountCents: 0,
      taxCents: 420,
      totalCents: 2420,
    });
  });

  it('usa el IVA recibido', () => {
    const preview = previewSale(input([{ productId: 'p1', quantity: '2' }]), products, 0);

    expect(preview.totals).toEqual({
      subtotalCents: 2000,
      discountCents: 0,
      taxCents: 0,
      totalCents: 2000,
    });
  });
});
