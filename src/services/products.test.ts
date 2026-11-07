import { describe, expect, it } from 'vitest';
import { createDatabaseStore, type KeyValueStorage } from '../data/database';
import { err } from '../domain/result';
import type { Product, ProductInput, Sale } from '../domain/types';
import { makeDatabase, makeProduct, makeSale, makeSettings } from '../testing/fixtures';
import { createMemoryStorage } from '../testing/memory-storage';
import { createProductsService, type ProductQuery } from './products';

const NOW = new Date('2026-11-06T12:00:00.000Z');
const NOW_ISO = '2026-11-06T12:00:00.000Z';

const validInput: ProductInput = {
  name: ' Monitor ',
  sku: 'mon-1',
  category: 'Periféricos',
  price: '1234,56',
  stock: '7',
};

interface SetupOptions {
  products?: readonly Product[];
  sales?: readonly Sale[];
  lowStockThreshold?: number;
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
        products: options.products ?? [],
        sales: options.sales ?? [],
        settings: {
          ...settings,
          preferences: {
            ...settings.preferences,
            lowStockThreshold: options.lowStockThreshold ?? 5,
          },
        },
      }),
  });

  let idCount = 0;
  const service = createProductsService({
    database,
    generateId: () => `id-${(idCount += 1)}`,
    now: () => NOW,
  });

  return {
    database,
    service,
    fillStorage() {
      isFull = true;
    },
    breakStorage() {
      isBroken = true;
    },
  };
}

const monitor = makeProduct({ id: 'p1', name: 'Monitor', sku: 'MON-1' });
const teclado = makeProduct({ id: 'p2', name: 'Teclado', sku: 'TEC-1' });

describe('create', () => {
  it('guarda el producto con los datos convertidos y normalizados', () => {
    const { service, database } = setup();

    const result = service.create(validInput);

    const expected: Product = {
      id: 'id-1',
      name: 'Monitor',
      sku: 'MON-1',
      category: 'Periféricos',
      priceCents: 123456,
      stock: 7,
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    };
    expect(result).toEqual({ ok: true, value: expected });
    expect(database.read().products).toEqual([expected]);
  });

  it('agrega el producto al principio', () => {
    const { service, database } = setup({ products: [teclado] });

    service.create(validInput);

    expect(database.read().products.map(({ id }) => id)).toEqual(['id-1', 'p2']);
  });

  it('registra la actividad, con su propio identificador', () => {
    const { service, database } = setup();

    service.create(validInput);

    expect(database.read().activity).toEqual([
      { id: 'id-2', type: 'product', message: 'Producto Monitor creado', createdAt: NOW_ISO },
    ]);
  });

  it.each(['1500,5', '1500.50'])('entiende el precio %s como $ 1.500,50', (price) => {
    const { service, database } = setup();

    service.create({ ...validInput, price });

    expect(database.read().products[0]?.priceCents).toBe(150050);
  });

  it.each(['1.500', '1.234,56', '$ 1500', '0'])(
    'rechaza el precio %s sin guardar otro importe',
    (price) => {
      const { service, database } = setup();

      const result = service.create({ ...validInput, price });

      expect(result.ok ? null : result.error).toMatchObject({
        kind: 'validation',
        errors: { price: expect.any(String) },
      });
      expect(database.read().products).toEqual([]);
      expect(database.read().activity).toEqual([]);
    },
  );

  it('rechaza un SKU ya usado, en otras mayúsculas', () => {
    const { service, database } = setup({ products: [monitor] });

    const result = service.create(validInput);

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { sku: expect.any(String) },
    });
    expect(database.read().products).toEqual([monitor]);
  });
});

describe('update', () => {
  const change: ProductInput = {
    name: ' Monitor 27 ',
    sku: 'mon-27',
    category: 'Redes',
    price: '20,00',
    stock: '3',
  };

  it('cambia los datos y conserva el identificador y la fecha de alta', () => {
    const { service, database } = setup({ products: [monitor, teclado] });

    const result = service.update('p1', change);

    const expected: Product = {
      ...monitor,
      name: 'Monitor 27',
      sku: 'MON-27',
      category: 'Redes',
      priceCents: 2000,
      stock: 3,
      updatedAt: NOW_ISO,
    };
    expect(result).toEqual({ ok: true, value: expected });
    expect(database.read().products).toEqual([expected, teclado]);
  });

  it('registra la actividad con el nombre nuevo', () => {
    const { service, database } = setup({ products: [monitor] });

    service.update('p1', change);

    expect(database.read().activity[0]).toMatchObject({
      type: 'product',
      message: 'Producto Monitor 27 actualizado',
    });
  });

  it('permite conservar su propio SKU', () => {
    const { service } = setup({ products: [monitor] });

    expect(service.update('p1', { ...change, sku: 'mon-1' }).ok).toBe(true);
  });

  it('rechaza el SKU de otro producto', () => {
    const { service, database } = setup({ products: [monitor, teclado] });

    const result = service.update('p1', { ...change, sku: 'tec-1' });

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { sku: expect.any(String) },
    });
    expect(database.read().products).toEqual([monitor, teclado]);
  });

  it('informa si el producto no existe, sin tocar a los demás', () => {
    const { service, database } = setup({ products: [monitor] });
    const before = database.read();

    expect(service.update('nope', change)).toEqual(err({ kind: 'not-found' }));
    expect(database.read()).toEqual(before);
  });
});

describe('remove', () => {
  it('quita el producto, lo devuelve y registra la actividad', () => {
    const { service, database } = setup({ products: [monitor, teclado] });

    expect(service.remove('p1')).toEqual({ ok: true, value: monitor });
    expect(database.read().products).toEqual([teclado]);
    expect(database.read().activity[0]).toMatchObject({
      type: 'product',
      message: 'Producto Monitor eliminado',
    });
  });

  it('conserva las ventas del producto', () => {
    const sale = makeSale();
    const { service, database } = setup({ products: [monitor], sales: [sale] });

    service.remove('p1');

    expect(database.read().sales).toEqual([sale]);
  });

  it('informa si el producto no existe, sin tocar a los demás', () => {
    const { service, database } = setup({ products: [monitor] });
    const before = database.read();

    expect(service.remove('nope')).toEqual(err({ kind: 'not-found' }));
    expect(database.read()).toEqual(before);
  });
});

describe('find', () => {
  it('devuelve el producto, o null si no existe', () => {
    const { service } = setup({ products: [monitor] });

    expect(service.find('p1')).toEqual(monitor);
    expect(service.find('nope')).toBeNull();
  });
});

describe('validate', () => {
  it('no marca como repetido el SKU del propio producto', () => {
    const { service } = setup({ products: [monitor] });

    expect(service.validate(validInput, 'p1')).toEqual({});
  });

  it('marca el SKU de otro producto', () => {
    const { service } = setup({ products: [monitor] });

    expect(service.validate(validInput)).toHaveProperty('sku');
  });
});

describe('búsqueda, filtros y orden', () => {
  const NOTEBOOK = 'Notebook 14';
  const CAMARA = 'Cámara web';
  const ROUTER = 'Router';
  const NAS = 'NAS';

  // Están desordenados a propósito, para que el orden lo tenga que poner el servicio.
  const products = [
    makeProduct({
      id: 'notebook',
      name: NOTEBOOK,
      sku: 'NB-14',
      category: 'Computación',
      priceCents: 900,
      stock: 12,
    }),
    makeProduct({
      id: 'camara',
      name: CAMARA,
      sku: 'CAM-1',
      category: 'Periféricos',
      priceCents: 10000,
      stock: 5,
    }),
    makeProduct({
      id: 'router',
      name: ROUTER,
      sku: 'ROU-1',
      category: 'Redes',
      priceCents: 5000,
      stock: 6,
    }),
    makeProduct({
      id: 'nas',
      name: NAS,
      sku: 'NAS-2',
      category: 'Computación',
      priceCents: 50000,
      stock: 0,
    }),
  ];

  const DEFAULTS: ProductQuery = {
    search: '',
    category: null,
    lowStockOnly: false,
    sortKey: 'name',
    direction: 'asc',
    page: 1,
    pageSize: 10,
  };

  function namesFor(options: Partial<ProductQuery>, lowStockThreshold = 5): readonly string[] {
    const { service } = setup({ products, lowStockThreshold });
    return service.query({ ...DEFAULTS, ...options }).items.map(({ name }) => name);
  }

  it('por defecto ordena por nombre', () => {
    expect(namesFor({})).toEqual([CAMARA, NAS, NOTEBOOK, ROUTER]);
  });

  it.each<[string, Partial<ProductQuery>, readonly string[]]>([
    ['por nombre, sin tildes', { search: 'camara' }, [CAMARA]],
    ['por SKU, sin distinguir mayúsculas', { search: 'rou-1' }, [ROUTER]],
    ['no por categoría', { search: 'Redes' }, []],
    ['por categoría', { category: 'Computación' }, [NAS, NOTEBOOK]],
    ['por stock bajo', { lowStockOnly: true }, [CAMARA, NAS]],
    ['por categoría y stock bajo', { category: 'Computación', lowStockOnly: true }, [NAS]],
    ['los tres a la vez', { search: 'notebook', category: 'Computación', lowStockOnly: true }, []],
  ])('filtra %s', (_case, options, expected) => {
    expect(namesFor(options)).toEqual(expected);
  });

  it.each<[number, readonly string[]]>([
    [6, [CAMARA, NAS, ROUTER]],
    [0, [NAS]],
  ])('el stock bajo usa el umbral configurado, aquí %i', (threshold, expected) => {
    expect(namesFor({ lowStockOnly: true }, threshold)).toEqual(expected);
  });

  it.each<[string, Partial<ProductQuery>, readonly string[]]>([
    ['precio, como número', { sortKey: 'priceCents' }, [NOTEBOOK, ROUTER, CAMARA, NAS]],
    [
      'stock, de mayor a menor',
      { sortKey: 'stock', direction: 'desc' },
      [NOTEBOOK, ROUTER, CAMARA, NAS],
    ],
    ['SKU', { sortKey: 'sku' }, [CAMARA, NAS, NOTEBOOK, ROUTER]],
    ['categoría', { sortKey: 'category' }, [NOTEBOOK, NAS, CAMARA, ROUTER]],
    ['nombre, de la Z a la A', { direction: 'desc' }, [ROUTER, NOTEBOOK, NAS, CAMARA]],
  ])('ordena por %s', (_case, options, expected) => {
    expect(namesFor(options)).toEqual(expected);
  });

  it('pagina el resultado', () => {
    const { service } = setup({ products });

    const page = service.query({ ...DEFAULTS, page: 2, pageSize: 2 });

    expect(page.items.map(({ name }) => name)).toEqual([NOTEBOOK, ROUTER]);
    expect(page).toMatchObject({ page: 2, pageCount: 2, totalItems: 4 });
  });

  describe('pageOf', () => {
    const options = {
      search: '',
      category: null,
      lowStockOnly: false,
      sortKey: 'name',
      direction: 'asc',
      pageSize: 2,
    } as const;

    it('indica en qué página queda el producto', () => {
      const { service } = setup({ products });

      expect(service.pageOf('camara', options)).toBe(1);
      expect(service.pageOf('router', options)).toBe(2);
    });

    it('respeta el orden', () => {
      const { service } = setup({ products });

      expect(service.pageOf('router', { ...options, direction: 'desc' })).toBe(1);
    });

    it('devuelve null si los filtros lo ocultan', () => {
      const { service } = setup({ products });

      expect(service.pageOf('router', { ...options, category: 'Computación' })).toBeNull();
      expect(service.pageOf('router', { ...options, lowStockOnly: true })).toBeNull();
      expect(service.pageOf('router', { ...options, search: 'notebook' })).toBeNull();
    });

    it('devuelve null si no existe', () => {
      const { service } = setup({ products });

      expect(service.pageOf('nope', options)).toBeNull();
    });
  });
});

describe('con el almacenamiento lleno', () => {
  const failure = err({ kind: 'storage', failure: 'quota-exceeded' });

  it('create informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup({ products: [teclado] });
    const before = database.read();
    fillStorage();

    expect(service.create(validInput)).toEqual(failure);
    expect(database.read()).toEqual(before);
  });

  it('update informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup({ products: [monitor] });
    const before = database.read();
    fillStorage();

    expect(service.update('p1', validInput)).toEqual(failure);
    expect(database.read()).toEqual(before);
  });

  it('remove informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup({ products: [monitor] });
    const before = database.read();
    fillStorage();

    expect(service.remove('p1')).toEqual(failure);
    expect(database.read()).toEqual(before);
  });
});

describe('con otra falla del almacenamiento', () => {
  it('informa la falla que ocurrió y no cambia nada', () => {
    const { service, database, breakStorage } = setup({ products: [monitor] });
    const before = database.read();
    breakStorage();

    expect(service.update('p1', validInput)).toEqual(
      err({ kind: 'storage', failure: 'write-failed' }),
    );
    expect(database.read()).toEqual(before);
  });
});
