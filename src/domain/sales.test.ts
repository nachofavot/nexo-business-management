import { describe, expect, it } from 'vitest';
import { makeCustomer, makeProduct, makeSale } from '../testing/fixtures';
import { err } from './result';
import { buildSale, calculateTotals, cancelSale, formatSaleNumber } from './sales';

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
