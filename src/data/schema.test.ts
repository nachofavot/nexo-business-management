import { describe, expect, it } from 'vitest';
import type { ActivityEntry } from '../domain/types';
import {
  makeCustomer,
  makeDatabase,
  makeProduct,
  makeSale,
  makeSaleItem,
  makeSettings,
} from '../testing/fixtures';
import { isDatabase } from './schema';

const activityEntry: ActivityEntry = {
  id: 'a1',
  type: 'sale',
  message: 'Venta V-000001 registrada',
  createdAt: '2026-11-05T12:00:00.000Z',
};

const loaded = makeDatabase({
  customers: [makeCustomer()],
  products: [makeProduct()],
  sales: [
    makeSale(),
    makeSale({
      id: 's2',
      number: 2,
      status: 'cancelled',
      cancelledAt: '2026-11-05T13:00:00.000Z',
    }),
  ],
  activity: [activityEntry],
  nextSaleNumber: 3,
});

function withoutKey(value: object, key: string): object {
  const copy: Record<string, unknown> = { ...value };
  delete copy[key];
  return copy;
}

describe('isDatabase', () => {
  it('acepta una base vacía', () => {
    expect(isDatabase(makeDatabase())).toBe(true);
  });

  it('acepta una base con datos y una venta anulada', () => {
    expect(isDatabase(loaded)).toBe(true);
  });

  it('acepta los datos después de pasar por JSON', () => {
    expect(isDatabase(JSON.parse(JSON.stringify(loaded)))).toBe(true);
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['un arreglo', []],
    ['un texto', 'texto'],
    ['otra versión', { ...loaded, version: 2 }],
    ['sin clientes', withoutKey(loaded, 'customers')],
    ['clientes que no son una lista', { ...loaded, customers: {} }],
    ['un cliente sin nombre', { ...loaded, customers: [withoutKey(makeCustomer(), 'name')] }],
    [
      'un cliente con fecha inválida',
      { ...loaded, customers: [makeCustomer({ createdAt: 'ayer' })] },
    ],
    ['stock negativo', { ...loaded, products: [makeProduct({ stock: -1 })] }],
    ['precio con decimales', { ...loaded, products: [makeProduct({ priceCents: 10.5 })] }],
    [
      'una categoría desconocida',
      { ...loaded, products: [{ ...makeProduct(), category: 'Inventada' }] },
    ],
    ['un estado de venta desconocido', { ...loaded, sales: [{ ...makeSale(), status: 'otro' }] }],
    ['un medio de pago desconocido', { ...loaded, sales: [{ ...makeSale(), paymentMethod: 'x' }] }],
    [
      'una línea con cantidad 0',
      { ...loaded, sales: [makeSale({ items: [makeSaleItem({ quantity: 0 })] })] },
    ],
    ['un total como texto', { ...loaded, sales: [{ ...makeSale(), totalCents: '100' }] }],
    ['un descuento mayor a 100', { ...loaded, sales: [makeSale({ discountPercent: 101 })] }],
    ['cancelledAt inválido', { ...loaded, sales: [{ ...makeSale(), cancelledAt: 5 }] }],
    ['una actividad sin mensaje', { ...loaded, activity: [withoutKey(activityEntry, 'message')] }],
    ['sin configuración', withoutKey(loaded, 'settings')],
    [
      'una moneda desconocida',
      {
        ...loaded,
        settings: {
          ...makeSettings(),
          preferences: { ...makeSettings().preferences, currency: 'BTC' },
        },
      },
    ],
    ['un perfil sin email', { ...loaded, settings: { ...makeSettings(), profile: {} } }],
    ['nextSaleNumber en 0', { ...loaded, nextSaleNumber: 0 }],
    ['nextSaleNumber con decimales', { ...loaded, nextSaleNumber: 1.5 }],
    ['nextSaleNumber ya usado por una venta', { ...loaded, nextSaleNumber: 2 }],
    ['una venta sin líneas', { ...loaded, sales: [makeSale({ items: [] })] }],
    [
      'una venta anulada sin fecha de anulación',
      { ...loaded, sales: [makeSale({ status: 'cancelled', cancelledAt: null })] },
    ],
    [
      'una venta completada con fecha de anulación',
      { ...loaded, sales: [makeSale({ cancelledAt: '2026-11-05T13:00:00.000Z' })] },
    ],
    [
      'números de venta repetidos',
      { ...loaded, sales: [makeSale({ id: 's1', number: 1 }), makeSale({ id: 's2', number: 1 })] },
    ],
    [
      'ventas con el mismo id',
      { ...loaded, sales: [makeSale({ id: 's1', number: 1 }), makeSale({ id: 's1', number: 2 })] },
    ],
    ['clientes con el mismo id', { ...loaded, customers: [makeCustomer(), makeCustomer()] }],
    ['productos con el mismo id', { ...loaded, products: [makeProduct(), makeProduct()] }],
    [
      'una fecha que es solo un número',
      { ...loaded, customers: [makeCustomer({ createdAt: '1' })] },
    ],
    ['una fecha sin hora', { ...loaded, customers: [makeCustomer({ createdAt: '2026-11-05' })] }],
    [
      'una fecha que no está en UTC',
      { ...loaded, sales: [makeSale({ createdAt: '2026-11-01T11:00:00-05:00' })] },
    ],
    ['un subtotal con decimales', { ...loaded, sales: [makeSale({ subtotalCents: 10.5 })] }],
    ['un descuento con decimales', { ...loaded, sales: [makeSale({ discountCents: 10.5 })] }],
    ['un IVA con decimales', { ...loaded, sales: [makeSale({ taxCents: 10.5 })] }],
    ['un total con decimales', { ...loaded, sales: [makeSale({ totalCents: 10.5 })] }],
    ['un total negativo', { ...loaded, sales: [makeSale({ totalCents: -1 })] }],
    ['un número de venta con decimales', { ...loaded, sales: [makeSale({ number: 1.5 })] }],
    ['un IVA mayor a 100', { ...loaded, sales: [makeSale({ taxPercent: 101 })] }],
    [
      'un precio de línea con decimales',
      { ...loaded, sales: [makeSale({ items: [makeSaleItem({ unitPriceCents: 10.5 })] })] },
    ],
    [
      'una cantidad con decimales',
      { ...loaded, sales: [makeSale({ items: [makeSaleItem({ quantity: 1.5 })] })] },
    ],
    ['un stock con decimales', { ...loaded, products: [makeProduct({ stock: 1.5 })] }],
    ['un precio negativo', { ...loaded, products: [makeProduct({ priceCents: -1 })] }],
    [
      'un IVA de preferencias mayor a 100',
      {
        ...loaded,
        settings: {
          ...makeSettings(),
          preferences: { ...makeSettings().preferences, taxPercent: 101 },
        },
      },
    ],
    [
      'un umbral de stock con decimales',
      {
        ...loaded,
        settings: {
          ...makeSettings(),
          preferences: { ...makeSettings().preferences, lowStockThreshold: 1.5 },
        },
      },
    ],
  ])('rechaza %s', (_description, value) => {
    expect(isDatabase(value)).toBe(false);
  });

  it('acepta una anulación anterior a la venta, porque el reloj del usuario puede cambiar', () => {
    const sale = makeSale({
      status: 'cancelled',
      createdAt: '2026-11-05T13:00:00.000Z',
      cancelledAt: '2026-11-05T12:00:00.000Z',
    });

    expect(isDatabase({ ...loaded, sales: [sale] })).toBe(true);
  });
});

describe.each<[string, object, (entity: object) => object]>([
  ['el cliente', makeCustomer(), (customer) => ({ ...loaded, customers: [customer] })],
  ['el producto', makeProduct(), (product) => ({ ...loaded, products: [product] })],
  ['la venta', makeSale(), (sale) => ({ ...loaded, sales: [sale] })],
  [
    'la línea de venta',
    makeSaleItem(),
    (item) => ({ ...loaded, sales: [{ ...makeSale(), items: [item] }] }),
  ],
  ['la actividad', activityEntry, (entry) => ({ ...loaded, activity: [entry] })],
  [
    'el perfil',
    makeSettings().profile,
    (profile) => ({ ...loaded, settings: { ...makeSettings(), profile } }),
  ],
  [
    'las preferencias',
    makeSettings().preferences,
    (preferences) => ({ ...loaded, settings: { ...makeSettings(), preferences } }),
  ],
  ['la base', loaded, (database) => database],
])('isDatabase con %s', (_name, entity, wrap) => {
  it('acepta todos los campos', () => {
    expect(isDatabase(wrap(entity))).toBe(true);
  });

  it.each(Object.keys(entity))('rechaza que falte %s', (field) => {
    expect(isDatabase(wrap(withoutKey(entity, field)))).toBe(false);
  });
});
