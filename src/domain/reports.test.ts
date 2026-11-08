import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSale, makeSaleItem } from '../testing/fixtures';
import {
  buildReport,
  compareWithPreviousMonth,
  currentMonthRange,
  grossByCategory,
  percentChange,
  periodRange,
  revenueSeries,
  salesInRange,
  summarizeSales,
  topCustomers,
  topProducts,
} from './reports';
import type { Sale } from './types';

// Jueves 5 de noviembre de 2026.
const now = new Date(2026, 10, 5, 12);

function saleAt(date: Date, totalCents = 1000, overrides: Partial<Sale> = {}): Sale {
  return makeSale({ createdAt: date.toISOString(), totalCents, ...overrides });
}

function revenueByKey(series: readonly { key: string; revenueCents: number }[]) {
  return Object.fromEntries(series.map(({ key, revenueCents }) => [key, revenueCents]));
}

function totalRevenue(series: readonly { revenueCents: number }[]): number {
  return series.reduce((sum, bucket) => sum + bucket.revenueCents, 0);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('zona horaria de los tests', () => {
  it('está fija en Argentina', () => {
    expect(new Date(2026, 10, 5, 23, 30).toISOString()).toBe('2026-11-06T02:30:00.000Z');
  });
});

describe('summarizeSales', () => {
  it('calcula ingresos, cantidad y ticket promedio sin contar las anuladas', () => {
    const summary = summarizeSales([
      makeSale({ totalCents: 1000 }),
      makeSale({ totalCents: 2001 }),
      makeSale({ totalCents: 5000, status: 'cancelled' }),
    ]);

    expect(summary).toMatchObject({
      revenueCents: 3001,
      salesCount: 2,
      averageTicketCents: 1501,
    });
  });

  it('suma las unidades sin contar las anuladas', () => {
    const summary = summarizeSales([
      makeSale({ items: [makeSaleItem({ quantity: 2 })] }),
      makeSale({ items: [makeSaleItem({ quantity: 3 })] }),
      makeSale({ items: [makeSaleItem({ quantity: 9 })], status: 'cancelled' }),
    ]);

    expect(summary.unitsSold).toBe(5);
  });

  it('da todo 0 sin ventas', () => {
    expect(summarizeSales([])).toEqual({
      revenueCents: 0,
      salesCount: 0,
      averageTicketCents: 0,
      unitsSold: 0,
    });
  });
});

describe('percentChange', () => {
  it.each([
    [150, 100, 50],
    [50, 100, -50],
    [0, 100, -100],
  ])('de %i contra %i da %i', (current, previous, expected) => {
    expect(percentChange(current, previous)).toBe(expected);
  });

  it.each([
    [100, 0],
    [0, 0],
  ])('de %i contra %i no se puede calcular', (current, previous) => {
    expect(percentChange(current, previous)).toBeNull();
  });
});

describe('rangos de fechas', () => {
  it('periodRange incluye hoy completo', () => {
    expect(periodRange('7d', now)).toEqual({
      start: new Date(2026, 9, 30),
      end: new Date(2026, 10, 5, 23, 59, 59, 999),
    });
  });

  it('currentMonthRange va del día 1 hasta el final de hoy', () => {
    expect(currentMonthRange(now)).toEqual({
      start: new Date(2026, 10, 1),
      end: new Date(2026, 10, 5, 23, 59, 59, 999),
    });
  });

  it('salesInRange incluye los extremos y filtra solo por fecha', () => {
    const range = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 5, 23, 59, 59, 999) };
    const atStart = saleAt(range.start);
    const atEnd = saleAt(range.end, 1000, { status: 'cancelled' });
    const before = saleAt(new Date(2026, 9, 31, 23, 59, 59, 999));
    const after = saleAt(new Date(2026, 10, 6));

    expect(salesInRange([before, atStart, atEnd, after], range)).toEqual([atStart, atEnd]);
  });
});

describe('revenueSeries', () => {
  it('con 7 días incluye cada día, aunque no tenga ventas', () => {
    expect(revenueSeries([], '7d', now)).toEqual([
      { key: '2026-10-30', revenueCents: 0 },
      { key: '2026-10-31', revenueCents: 0 },
      { key: '2026-11-01', revenueCents: 0 },
      { key: '2026-11-02', revenueCents: 0 },
      { key: '2026-11-03', revenueCents: 0 },
      { key: '2026-11-04', revenueCents: 0 },
      { key: '2026-11-05', revenueCents: 0 },
    ]);
  });

  it('cuenta una venta de las 23:30 en su día local, aunque en UTC ya sea el siguiente', () => {
    const series = revenueByKey(
      revenueSeries([saleAt(new Date(2026, 10, 4, 23, 30), 1500)], '7d', now),
    );

    expect(series['2026-11-04']).toBe(1500);
    expect(series['2026-11-05']).toBe(0);
  });

  it('suma las ventas del mismo día', () => {
    const series = revenueByKey(
      revenueSeries(
        [saleAt(new Date(2026, 10, 3, 9), 100), saleAt(new Date(2026, 10, 3, 18), 200)],
        '7d',
        now,
      ),
    );

    expect(series['2026-11-03']).toBe(300);
  });

  it('no cuenta las anuladas ni las anteriores al período', () => {
    const series = revenueSeries(
      [
        saleAt(new Date(2026, 10, 3), 500, { status: 'cancelled' }),
        saleAt(new Date(2026, 9, 29, 23, 59), 700),
      ],
      '7d',
      now,
    );

    expect(totalRevenue(series)).toBe(0);
  });

  it('con 30 días tiene 30 claves', () => {
    const series = revenueSeries([], '30d', now);

    expect(series).toHaveLength(30);
    expect(series[0]?.key).toBe('2026-10-07');
    expect(series[29]?.key).toBe('2026-11-05');
  });

  it('con 90 días agrupa en semanas que empiezan el lunes', () => {
    const series = revenueSeries([], '90d', now);

    expect(series).toHaveLength(14);
    expect(series[0]?.key).toBe('2026-08-03');
    expect(series[13]?.key).toBe('2026-11-02');
  });

  it('cuenta el domingo en la semana del lunes anterior', () => {
    const series = revenueByKey(revenueSeries([saleAt(new Date(2026, 7, 9), 300)], '90d', now));

    expect(series['2026-08-03']).toBe(300);
  });

  it('cuenta el lunes en su propia semana', () => {
    const series = revenueByKey(revenueSeries([saleAt(new Date(2026, 7, 10), 300)], '90d', now));

    expect(series['2026-08-10']).toBe(300);
  });

  it('no cuenta una venta de la primera semana anterior al inicio del período', () => {
    const series = revenueSeries(
      [saleAt(new Date(2026, 7, 5), 300), saleAt(new Date(2026, 7, 8), 400)],
      '90d',
      now,
    );

    expect(totalRevenue(series)).toBe(400);
  });

  it('con 12 meses incluye el actual y los 11 anteriores', () => {
    const series = revenueSeries([], '12m', now);

    expect(series.map(({ key }) => key)).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('con 12 meses no repite meses si hoy es día 31', () => {
    const keys = revenueSeries([], '12m', new Date(2026, 9, 31, 12)).map(({ key }) => key);

    expect(new Set(keys).size).toBe(12);
    expect(keys[0]).toBe('2025-11');
    expect(keys[11]).toBe('2026-10');
  });

  it('con 12 meses cuenta el primer día del período, no el anterior', () => {
    const series = revenueSeries(
      [saleAt(new Date(2025, 11, 1), 900), saleAt(new Date(2025, 10, 30, 23), 800)],
      '12m',
      now,
    );

    expect(totalRevenue(series)).toBe(900);
  });

  it('no repite ni saltea días cuando un día dura 25 horas', () => {
    vi.stubEnv('TZ', 'America/New_York');

    const keys = revenueSeries([], '7d', new Date(2026, 10, 5, 12)).map(({ key }) => key);

    expect(keys).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ]);
  });

  it('no repite ni saltea días cuando un día dura 23 horas', () => {
    vi.stubEnv('TZ', 'America/New_York');

    const keys = revenueSeries([], '7d', new Date(2026, 2, 10, 12)).map(({ key }) => key);

    expect(keys).toEqual([
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
    ]);
  });
});

describe('compareWithPreviousMonth', () => {
  it('compara contra los mismos días transcurridos del mes anterior', () => {
    const inside = saleAt(new Date(2026, 9, 5, 23), 1000);
    const outside = saleAt(new Date(2026, 9, 6, 0), 2000);

    const { previous } = compareWithPreviousMonth([inside, outside], now);

    expect(previous.revenueCents).toBe(1000);
    expect(previous.salesCount).toBe(1);
  });

  it('el 31 de marzo compara hasta el 28 de febrero, sin pasarse a marzo', () => {
    const lastDayOfMarch = new Date(2026, 2, 31, 12);
    const february = saleAt(new Date(2026, 1, 28, 12), 1000);
    const march = saleAt(new Date(2026, 2, 1, 0), 2000);

    const result = compareWithPreviousMonth([february, march], lastDayOfMarch);

    expect(result.previous.revenueCents).toBe(1000);
    expect(result.current.revenueCents).toBe(2000);
  });

  it('en enero compara contra diciembre del año anterior', () => {
    const { previous } = compareWithPreviousMonth(
      [saleAt(new Date(2025, 11, 15), 1000)],
      new Date(2026, 0, 15, 12),
    );

    expect(previous.revenueCents).toBe(1000);
  });

  it('no cuenta en el mes actual una venta posterior a hoy', () => {
    const { current } = compareWithPreviousMonth([saleAt(new Date(2026, 10, 6), 1000)], now);

    expect(current.salesCount).toBe(0);
  });

  it('calcula los cambios porcentuales', () => {
    const result = compareWithPreviousMonth(
      [saleAt(new Date(2026, 10, 2), 1500), saleAt(new Date(2026, 9, 2), 1000)],
      now,
    );

    expect(result).toMatchObject({
      revenueChange: 50,
      salesCountChange: 0,
      averageTicketChange: 50,
    });
  });

  it('cada cambio porcentual usa su propia métrica', () => {
    const saleWithUnits = (date: Date, totalCents: number, quantity: number) =>
      saleAt(date, totalCents, { items: [makeSaleItem({ quantity })] });

    const result = compareWithPreviousMonth(
      [
        saleWithUnits(new Date(2026, 10, 2), 1000, 3),
        saleWithUnits(new Date(2026, 10, 3), 2000, 3),
        saleWithUnits(new Date(2026, 9, 2), 1000, 1),
      ],
      now,
    );

    expect(result).toMatchObject({
      revenueChange: 200,
      salesCountChange: 100,
      averageTicketChange: 50,
    });
  });

  it('no calcula cambios si el mes anterior no tiene ventas', () => {
    const result = compareWithPreviousMonth([saleAt(new Date(2026, 10, 2), 1500)], now);

    expect(result).toMatchObject({
      revenueChange: null,
      salesCountChange: null,
      averageTicketChange: null,
    });
  });
});

describe('grossByCategory', () => {
  it('suma precio por cantidad de mayor a menor, sin descuento ni IVA ni anuladas', () => {
    const result = grossByCategory([
      makeSale({
        items: [makeSaleItem({ category: 'Redes', unitPriceCents: 1000, quantity: 2 })],
      }),
      makeSale({
        discountPercent: 50,
        items: [makeSaleItem({ category: 'Periféricos', unitPriceCents: 5000, quantity: 1 })],
      }),
      makeSale({
        status: 'cancelled',
        items: [makeSaleItem({ category: 'Almacenamiento', unitPriceCents: 9000, quantity: 1 })],
      }),
    ]);

    expect(result).toEqual([
      { category: 'Periféricos', grossCents: 5000 },
      { category: 'Redes', grossCents: 2000 },
    ]);
  });
});

describe('topProducts', () => {
  const saleWith = (productId: string, productName: string, quantity: number, createdAt: string) =>
    makeSale({ createdAt, items: [makeSaleItem({ productId, productName, quantity })] });

  it('ordena por unidades y respeta el límite', () => {
    const result = topProducts(
      [
        saleWith('p1', 'Monitor', 5, '2026-11-01T12:00:00.000Z'),
        saleWith('p2', 'Teclado', 8, '2026-11-01T12:00:00.000Z'),
      ],
      1,
    );

    expect(result).toEqual([{ productId: 'p2', productName: 'Teclado', units: 8 }]);
  });

  it('suma las unidades y usa el nombre más reciente, en cualquier orden', () => {
    const older = saleWith('p1', 'Monitor viejo', 2, '2026-10-01T12:00:00.000Z');
    const newer = saleWith('p1', 'Monitor nuevo', 3, '2026-11-01T12:00:00.000Z');
    const expected = [{ productId: 'p1', productName: 'Monitor nuevo', units: 5 }];

    expect(topProducts([older, newer], 5)).toEqual(expected);
    expect(topProducts([newer, older], 5)).toEqual(expected);
  });

  it('con las mismas unidades ordena por nombre', () => {
    const result = topProducts(
      [
        saleWith('p2', 'Teclado', 1, '2026-11-01T12:00:00.000Z'),
        saleWith('p1', 'Monitor', 1, '2026-11-01T12:00:00.000Z'),
      ],
      5,
    );

    expect(result.map(({ productName }) => productName)).toEqual(['Monitor', 'Teclado']);
  });

  it('no cuenta las ventas anuladas', () => {
    const cancelled = makeSale({ status: 'cancelled' });

    expect(topProducts([cancelled], 5)).toEqual([]);
  });
});

describe('topCustomers', () => {
  it('suma los ingresos y usa el nombre más reciente, en cualquier orden', () => {
    const older = makeSale({
      customerId: 'c1',
      customerName: 'Ana',
      totalCents: 1000,
      createdAt: '2026-10-01T12:00:00.000Z',
    });
    const newer = makeSale({
      customerId: 'c1',
      customerName: 'Ana Gómez',
      totalCents: 500,
      createdAt: '2026-11-01T12:00:00.000Z',
    });
    const expected = [{ customerId: 'c1', customerName: 'Ana Gómez', revenueCents: 1500 }];

    expect(topCustomers([older, newer], 5)).toEqual(expected);
    expect(topCustomers([newer, older], 5)).toEqual(expected);
  });

  it('ordena por ingresos, respeta el límite y no cuenta las anuladas', () => {
    const result = topCustomers(
      [
        makeSale({ customerId: 'c1', customerName: 'Ana', totalCents: 1000 }),
        makeSale({ customerId: 'c2', customerName: 'Bruno', totalCents: 3000 }),
        makeSale({
          customerId: 'c3',
          customerName: 'Carla',
          totalCents: 9000,
          status: 'cancelled',
        }),
      ],
      1,
    );

    expect(result).toEqual([{ customerId: 'c2', customerName: 'Bruno', revenueCents: 3000 }]);
  });
});

describe('buildReport', () => {
  // Sábado 7 de noviembre de 2026, mediodía.
  const reportNow = new Date(2026, 10, 7, 12);

  function saleOf(id: string, date: Date, overrides: Partial<Sale> = {}): Sale {
    return makeSale({
      id,
      customerId: `c-${id}`,
      customerName: `Cliente ${id}`,
      items: [makeSaleItem({ productId: `p-${id}`, productName: `Producto ${id}` })],
      createdAt: date.toISOString(),
      totalCents: 1000,
      ...overrides,
    });
  }

  const today = saleOf('hoy', new Date(2026, 10, 7, 23, 59), {
    items: [makeSaleItem({ productId: 'p-hoy', productName: 'Producto hoy', category: 'Redes' })],
  });
  const firstDay = saleOf('primero', new Date(2026, 10, 1, 0, 0));
  const dayBefore = saleOf('antes', new Date(2026, 9, 31, 23, 59), {
    items: [
      makeSaleItem({
        productId: 'p-antes',
        productName: 'Producto antes',
        category: 'Almacenamiento',
      }),
    ],
  });
  const cancelled = saleOf('anulada', new Date(2026, 10, 6, 12), {
    status: 'cancelled',
    cancelledAt: new Date(2026, 10, 6, 13).toISOString(),
    items: [
      makeSaleItem({
        productId: 'p-anulada',
        productName: 'Producto anulado',
        category: 'Accesorios',
      }),
    ],
  });
  const report = buildReport([today, firstDay, dayBefore, cancelled], '7d', reportNow);

  it('cuenta solo las ventas completadas de los 7 días, hoy incluido', () => {
    expect(report.summary).toMatchObject({ salesCount: 2, revenueCents: 2000 });
    expect(totalRevenue(report.revenue)).toBe(2000);
  });

  it('las categorías no mezclan ventas de otras fechas ni anuladas', () => {
    expect(report.categories.map(({ category }) => category).sort()).toEqual([
      'Periféricos',
      'Redes',
    ]);
  });

  it('los rankings usan solo las ventas del período', () => {
    expect(report.topProducts.map(({ productId }) => productId).sort()).toEqual([
      'p-hoy',
      'p-primero',
    ]);
    expect(report.topCustomers.map(({ customerId }) => customerId).sort()).toEqual([
      'c-hoy',
      'c-primero',
    ]);
  });

  it('los rankings usan los nombres guardados en la venta, aunque ya no existan', () => {
    expect(report.topCustomers.map(({ customerName }) => customerName)).toContain('Cliente hoy');
    expect(report.topProducts.map(({ productName }) => productName)).toContain('Producto hoy');
  });

  it('los rankings muestran hasta 5', () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      saleOf(`v${index}`, new Date(2026, 10, 6, 10 + index)),
    );
    const manyReport = buildReport(many, '7d', reportNow);

    expect(manyReport.topProducts).toHaveLength(5);
    expect(manyReport.topCustomers).toHaveLength(5);
  });

  it('12 meses incluye el mes actual y los 11 anteriores', () => {
    const december = saleOf('diciembre', new Date(2025, 11, 1, 0, 0));
    const november = saleOf('noviembre', new Date(2025, 10, 30, 23, 59));

    expect(buildReport([december, november], '12m', reportNow).summary.salesCount).toBe(1);
  });
});
