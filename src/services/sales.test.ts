import { describe, expect, it } from 'vitest';
import { createDatabaseStore, type KeyValueStorage } from '../data/database';
import { err } from '../domain/result';
import type { Customer, Product, Sale, SaleInput } from '../domain/types';
import {
  makeCustomer,
  makeDatabase,
  makeProduct,
  makeSale,
  makeSaleItem,
  makeSettings,
} from '../testing/fixtures';
import { createMemoryStorage } from '../testing/memory-storage';
import { createServices } from '.';
import type { SaleQuery } from './sales';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const NOW_ISO = '2026-11-07T12:00:00.000Z';

const ana = makeCustomer({ id: 'c1', name: 'Ana Gómez' });
const monitor = makeProduct({
  id: 'p1',
  name: 'Monitor',
  sku: 'MON-1',
  priceCents: 1000,
  stock: 5,
});
const teclado = makeProduct({
  id: 'p2',
  name: 'Teclado',
  sku: 'TEC-1',
  priceCents: 2500,
  stock: 10,
});
const saleSeven = makeSale({
  id: 's7',
  number: 7,
  items: [makeSaleItem({ productId: 'p1', quantity: 2 })],
});

const validInput: SaleInput = {
  customerId: 'c1',
  lines: [
    { productId: 'p1', quantity: '2' },
    { productId: 'p2', quantity: '1' },
  ],
  discountPercent: '10',
  paymentMethod: 'card',
};

interface SetupOptions {
  customers?: readonly Customer[];
  products?: readonly Product[];
  sales?: readonly Sale[];
  nextSaleNumber?: number;
  taxPercent?: number;
}

function setup(options: SetupOptions = {}) {
  const memory = createMemoryStorage();
  let isFull = false;
  let isBroken = false;
  const storage: KeyValueStorage = {
    ...memory,
    setItem(key, value) {
      if (isFull) throw new DOMException('lleno', 'QuotaExceededError');
      if (isBroken) throw new Error('El navegador bloqueó el almacenamiento');
      memory.setItem(key, value);
    },
  };
  const settings = makeSettings();
  const database = createDatabaseStore({
    getStorage: () => storage,
    createSeed: () =>
      makeDatabase({
        customers: options.customers ?? [ana],
        products: options.products ?? [monitor, teclado],
        sales: options.sales ?? [saleSeven],
        nextSaleNumber: options.nextSaleNumber ?? 8,
        settings: {
          ...settings,
          preferences: { ...settings.preferences, taxPercent: options.taxPercent ?? 21 },
        },
      }),
  });

  let idCount = 0;
  const services = createServices({
    database,
    generateId: () => `id-${(idCount += 1)}`,
    now: () => NOW,
  });

  return {
    database,
    services,
    service: services.sales,
    fillStorage() {
      isFull = true;
    },
    breakStorage() {
      isBroken = true;
    },
  };
}

function stockOf(products: readonly Product[], id: string): number | undefined {
  return products.find((product) => product.id === id)?.stock;
}

describe('register', () => {
  it('guarda la venta con los datos copiados y los totales calculados', () => {
    const { service } = setup();

    expect(service.register(validInput)).toEqual({
      ok: true,
      value: {
        id: 'id-1',
        number: 8,
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
          {
            productId: 'p2',
            productName: 'Teclado',
            sku: 'TEC-1',
            category: 'Periféricos',
            unitPriceCents: 2500,
            quantity: 1,
          },
        ],
        paymentMethod: 'card',
        discountPercent: 10,
        taxPercent: 21,
        subtotalCents: 4500,
        discountCents: 450,
        taxCents: 851,
        totalCents: 4901,
        status: 'completed',
        createdAt: NOW_ISO,
        cancelledAt: null,
      },
    });
  });

  it('la agrega primera, descuenta el stock, avanza el número y registra la actividad', () => {
    const { service, database } = setup();

    service.register(validInput);

    const { sales, products, nextSaleNumber, activity } = database.read();
    expect(sales.map((sale) => sale.number)).toEqual([8, 7]);
    expect(products.map(({ id, stock, updatedAt }) => ({ id, stock, updatedAt }))).toEqual([
      { id: 'p1', stock: 3, updatedAt: NOW_ISO },
      { id: 'p2', stock: 9, updatedAt: NOW_ISO },
    ]);
    expect(nextSaleNumber).toBe(9);
    expect(activity[0]).toMatchObject({
      type: 'sale',
      message: 'Venta V-000008 registrada',
      createdAt: NOW_ISO,
    });
  });

  it('da los mismos importes que mostró el resumen previo', () => {
    const { service } = setup();

    const preview = service.preview(validInput);
    const result = service.register(validInput);

    if (!result.ok) throw new Error('La venta debía registrarse');
    const { subtotalCents, discountCents, taxCents, totalCents } = result.value;
    expect({ subtotalCents, discountCents, taxCents, totalCents }).toEqual(preview.totals);
  });

  it('numera seguidas dos ventas y deja la más nueva primera', () => {
    const { service, database } = setup();

    service.register(validInput);
    service.register(validInput);

    expect(database.read().sales.map((sale) => sale.number)).toEqual([9, 8, 7]);
  });

  it('usa el IVA de la configuración, también en el resumen previo', () => {
    const { service } = setup({ taxPercent: 0 });

    const result = service.register(validInput);

    expect(result).toMatchObject({ ok: true, value: { taxPercent: 0, taxCents: 0 } });
    expect(service.preview(validInput).totals.taxCents).toBe(0);
  });

  it('rechaza toda la venta si una línea no tiene stock, sin tocar las demás', () => {
    const { service, database } = setup();
    const before = database.read();

    const result = service.register({
      ...validInput,
      lines: [
        { productId: 'p1', quantity: '2' },
        { productId: 'p2', quantity: '11' },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'validation', errors: { lineErrors: { 1: { field: 'quantity' } } } },
    });
    expect(database.read()).toBe(before);
  });

  it('rechaza un cliente inexistente sin guardar nada', () => {
    const { service, database } = setup();
    const before = database.read();

    const result = service.register({ ...validInput, customerId: 'nope' });

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { customerId: expect.any(String) },
    });
    expect(database.read()).toBe(before);
  });

  it('no guarda nada ni gasta el número si el almacenamiento está lleno', () => {
    const { service, database, fillStorage } = setup();
    const before = database.read();
    fillStorage();

    expect(service.register(validInput)).toEqual(
      err({ kind: 'storage', failure: 'quota-exceeded' }),
    );
    expect(database.read()).toBe(before);
    expect(database.read().nextSaleNumber).toBe(8);
  });

  it('informa otra falla de escritura', () => {
    const { service, breakStorage } = setup();
    breakStorage();

    expect(service.register(validInput)).toEqual(err({ kind: 'storage', failure: 'write-failed' }));
  });

  it('conserva la venta si después se borran el cliente y los productos', () => {
    const { service, services } = setup();
    const result = service.register(validInput);
    if (!result.ok) throw new Error('La venta debía registrarse');

    services.customers.remove('c1');
    services.products.remove('p1');
    services.products.remove('p2');

    expect(service.find(result.value.id)).toEqual(result.value);
  });
});

describe('cancel', () => {
  it('anula la venta, devuelve el stock y registra la actividad', () => {
    const { service, database } = setup();

    const result = service.cancel('s7');

    expect(result).toMatchObject({
      ok: true,
      value: { status: 'cancelled', cancelledAt: NOW_ISO },
    });
    const { sales, products, activity } = database.read();
    expect(sales[0]).toMatchObject({ id: 's7', status: 'cancelled' });
    expect(stockOf(products, 'p1')).toBe(7);
    expect(activity[0]).toMatchObject({ type: 'sale', message: 'Venta V-000007 anulada' });
  });

  it('devuelve el stock solo de los productos que todavía existen', () => {
    const sale = makeSale({
      id: 's7',
      number: 7,
      items: [
        makeSaleItem({ productId: 'gone', quantity: 3 }),
        makeSaleItem({ productId: 'p1', quantity: 2 }),
      ],
    });
    const { service, database } = setup({ sales: [sale] });

    expect(service.cancel('s7').ok).toBe(true);

    const { products } = database.read();
    expect(products.map((product) => product.id)).toEqual(['p1', 'p2']);
    expect(stockOf(products, 'p1')).toBe(7);
    expect(stockOf(products, 'p2')).toBe(10);
  });

  it('no anula dos veces ni devuelve el stock otra vez', () => {
    const { service, database } = setup();
    service.cancel('s7');
    const before = database.read();

    expect(service.cancel('s7')).toEqual(err({ kind: 'already-cancelled' }));
    expect(database.read()).toBe(before);
    expect(stockOf(database.read().products, 'p1')).toBe(7);
  });

  it('informa una venta inexistente sin cambiar las guardadas', () => {
    const { service, database } = setup();
    const before = database.read();

    expect(service.cancel('nope')).toEqual(err({ kind: 'not-found' }));
    expect(database.read()).toBe(before);
  });

  it('deja la venta completada y el stock igual si el almacenamiento está lleno', () => {
    const { service, database, fillStorage } = setup();
    fillStorage();

    expect(service.cancel('s7')).toEqual(err({ kind: 'storage', failure: 'quota-exceeded' }));
    expect(database.read().sales[0]?.status).toBe('completed');
    expect(stockOf(database.read().products, 'p1')).toBe(5);
  });

  it('informa otra falla de escritura', () => {
    const { service, breakStorage } = setup();
    breakStorage();

    expect(service.cancel('s7')).toEqual(err({ kind: 'storage', failure: 'write-failed' }));
  });
});

describe('find y validate', () => {
  it('find devuelve la venta, o null si no existe', () => {
    const { service } = setup();

    expect(service.find('s7')).toEqual(saleSeven);
    expect(service.find('nope')).toBeNull();
  });

  it('validate no guarda nada y devuelve los errores', () => {
    const { service, database } = setup();
    const before = database.read();

    expect(service.validate(validInput)).toEqual({});
    expect(service.validate({ ...validInput, customerId: 'nope' })).toHaveProperty('customerId');
    expect(database.read()).toBe(before);
  });
});

describe('query', () => {
  // Hora local de Buenos Aires: 1 de noviembre 12:00, 3 de noviembre 23:30, 5 de noviembre 00:00
  // y 5 de noviembre 23:59:59.999.
  const s1 = makeSale({
    id: 's1',
    number: 1,
    customerName: 'Ana Gómez',
    createdAt: '2026-11-01T15:00:00.000Z',
  });
  const s2 = makeSale({
    id: 's2',
    number: 2,
    customerName: 'Bruno Díaz',
    status: 'cancelled',
    createdAt: '2026-11-04T02:30:00.000Z',
    cancelledAt: '2026-11-04T03:00:00.000Z',
  });
  const s3 = makeSale({
    id: 's3',
    number: 3,
    customerName: 'Ana Gómez',
    createdAt: '2026-11-05T03:00:00.000Z',
  });
  const s12 = makeSale({
    id: 's12',
    number: 12,
    customerName: 'Carla Ruiz',
    createdAt: '2026-11-06T02:59:59.999Z',
  });
  // Desordenadas a propósito: el servicio debe ordenarlas.
  const history = [s3, s1, s12, s2];
  const defaults: SaleQuery = { search: '', status: null, from: '', to: '', page: 1, pageSize: 10 };

  function serviceWithHistory() {
    return setup({ sales: history, nextSaleNumber: 13 }).service;
  }

  it.each<{ name: string; options: Partial<SaleQuery>; expected: number[] }>([
    { name: 'sin filtros, por número de mayor a menor', options: {}, expected: [12, 3, 2, 1] },
    { name: 'busca el número completo', options: { search: 'V-000003' }, expected: [3] },
    { name: 'sin distinguir mayúsculas', options: { search: 'v-000001' }, expected: [1] },
    { name: 'busca parte del número', options: { search: '12' }, expected: [12] },
    { name: 'busca el cliente sin tildes', options: { search: 'gomez' }, expected: [3, 1] },
    { name: 'no busca por producto', options: { search: 'Monitor' }, expected: [] },
    { name: 'filtra las anuladas', options: { status: 'cancelled' }, expected: [2] },
    { name: 'filtra las completadas', options: { status: 'completed' }, expected: [12, 3, 1] },
    { name: 'Desde usa la medianoche local', options: { from: '2026-11-04' }, expected: [12, 3] },
    { name: 'Hasta incluye todo el día local', options: { to: '2026-11-03' }, expected: [2, 1] },
    {
      name: 'un solo día incluye sus dos bordes',
      options: { from: '2026-11-05', to: '2026-11-05' },
      expected: [12, 3],
    },
    { name: 'Desde sin ventas posteriores', options: { from: '2026-11-06' }, expected: [] },
    {
      name: 'un rango invertido no da resultados',
      options: { from: '2026-11-05', to: '2026-11-01' },
      expected: [],
    },
    {
      name: 'una fecha imposible no limita',
      options: { from: '2026-02-30' },
      expected: [12, 3, 2, 1],
    },
    {
      name: 'combina búsqueda, estado y fecha',
      options: { search: 'ana', status: 'completed', from: '2026-11-05' },
      expected: [3],
    },
  ])('$name', ({ options, expected }) => {
    const items = serviceWithHistory().query({ ...defaults, ...options }).items;

    expect(items.map((sale) => sale.number)).toEqual(expected);
  });

  it('pagina el resultado', () => {
    const page = serviceWithHistory().query({ ...defaults, pageSize: 2, page: 2 });

    expect(page.items.map((sale) => sale.number)).toEqual([2, 1]);
    expect(page).toMatchObject({ page: 2, pageCount: 2, totalItems: 4 });
  });

  it('pageOf indica la página de una venta, o null si no aparece', () => {
    const service = serviceWithHistory();
    const options: Omit<SaleQuery, 'page'> = {
      search: '',
      status: null,
      from: '',
      to: '',
      pageSize: 2,
    };

    expect(service.pageOf('s1', options)).toBe(2);
    expect(service.pageOf('s2', { ...options, status: 'completed' })).toBeNull();
    expect(service.pageOf('nope', options)).toBeNull();
  });
});
