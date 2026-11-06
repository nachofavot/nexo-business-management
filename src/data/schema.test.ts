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
    makeSale({ id: 's2', status: 'cancelled', cancelledAt: '2026-11-05T13:00:00.000Z' }),
  ],
  activity: [activityEntry],
});

function withoutKey<T extends object>(value: T, key: keyof T): object {
  const copy = { ...value };
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
  ])('rechaza %s', (_description, value) => {
    expect(isDatabase(value)).toBe(false);
  });
});
