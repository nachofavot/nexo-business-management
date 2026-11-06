import { describe, expect, it } from 'vitest';
import { createDatabaseStore, type KeyValueStorage } from '../data/database';
import { err } from '../domain/result';
import type { Customer, CustomerInput, Sale } from '../domain/types';
import { makeCustomer, makeDatabase, makeSale } from '../testing/fixtures';
import { createMemoryStorage } from '../testing/memory-storage';
import { createCustomersService, type CustomerQuery } from './customers';

const NOW = new Date('2026-11-06T12:00:00.000Z');
const NOW_ISO = '2026-11-06T12:00:00.000Z';

const validInput: CustomerInput = {
  name: ' Ana Gómez ',
  email: 'ANA@example.com',
  phone: '',
  company: 'Aurora Demo',
};

function setup(options: { customers?: readonly Customer[]; sales?: readonly Sale[] } = {}) {
  const memory = createMemoryStorage();
  let isFull = false;
  const storage: KeyValueStorage = {
    ...memory,
    setItem(key, value) {
      if (isFull) throw new DOMException('lleno', 'QuotaExceededError');
      memory.setItem(key, value);
    },
  };
  const database = createDatabaseStore({
    getStorage: () => storage,
    createSeed: () =>
      makeDatabase({
        customers: options.customers ?? [],
        sales: options.sales ?? [],
        nextSaleNumber: 100,
      }),
  });

  let idCount = 0;
  const service = createCustomersService({
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
  };
}

const ana = makeCustomer({ id: 'c1', name: 'Ana Gómez', email: 'ana@example.com' });
const bruno = makeCustomer({ id: 'c2', name: 'Bruno Paz', email: 'bruno@example.com' });

describe('create', () => {
  it('guarda el cliente con los datos normalizados', () => {
    const { service, database } = setup();

    const result = service.create(validInput);

    const expected: Customer = {
      id: 'id-1',
      name: 'Ana Gómez',
      email: 'ana@example.com',
      phone: '',
      company: 'Aurora Demo',
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    };
    expect(result).toEqual({ ok: true, value: expected });
    expect(database.read().customers).toEqual([expected]);
  });

  it('registra la actividad primero, con su propio identificador', () => {
    const { service, database } = setup();
    database.update((current) => ({
      ...current,
      activity: [{ id: 'a0', type: 'sale', message: 'Anterior', createdAt: NOW_ISO }],
    }));

    service.create(validInput);

    expect(database.read().activity).toEqual([
      { id: 'id-2', type: 'customer', message: 'Cliente Ana Gómez creado', createdAt: NOW_ISO },
      { id: 'a0', type: 'sale', message: 'Anterior', createdAt: NOW_ISO },
    ]);
  });

  it('rechaza datos inválidos sin cambiar nada', () => {
    const { service, database } = setup();

    const result = service.create({ ...validInput, name: 'A' });

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { name: expect.any(String) },
    });
    expect(database.read().customers).toEqual([]);
    expect(database.read().activity).toEqual([]);
  });

  it('rechaza un email ya usado, en otras mayúsculas', () => {
    const { service } = setup({ customers: [ana] });

    const result = service.create(validInput);

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { email: expect.any(String) },
    });
  });
});

describe('update', () => {
  const change: CustomerInput = {
    name: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '123456',
    company: '',
  };

  it('cambia los datos y conserva el identificador y la fecha de alta', () => {
    const { service, database } = setup({ customers: [ana, bruno] });

    const result = service.update('c1', change);

    const expected: Customer = {
      ...ana,
      name: 'Ana Pérez',
      phone: '123456',
      company: '',
      updatedAt: NOW_ISO,
    };
    expect(result).toEqual({ ok: true, value: expected });
    expect(database.read().customers).toEqual([expected, bruno]);
  });

  it('registra la actividad con el nombre nuevo', () => {
    const { service, database } = setup({ customers: [ana] });

    service.update('c1', change);

    expect(database.read().activity[0]).toMatchObject({
      type: 'customer',
      message: 'Cliente Ana Pérez actualizado',
    });
  });

  it('rechaza el email de otro cliente', () => {
    const { service } = setup({ customers: [ana, bruno] });

    const result = service.update('c1', { ...change, email: 'bruno@example.com' });

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { email: expect.any(String) },
    });
  });

  it('informa si el cliente no existe', () => {
    const { service } = setup();

    expect(service.update('nope', change)).toEqual(err({ kind: 'not-found' }));
  });
});

describe('remove', () => {
  it('quita el cliente, lo devuelve y registra la actividad', () => {
    const { service, database } = setup({ customers: [ana, bruno] });

    expect(service.remove('c1')).toEqual({ ok: true, value: ana });
    expect(database.read().customers).toEqual([bruno]);
    expect(database.read().activity[0]).toMatchObject({
      type: 'customer',
      message: 'Cliente Ana Gómez eliminado',
    });
  });

  it('informa si el cliente no existe', () => {
    const { service } = setup();

    expect(service.remove('nope')).toEqual(err({ kind: 'not-found' }));
  });

  it('conserva las ventas del cliente, con su nombre copiado', () => {
    const sale = makeSale({ customerId: 'c1', customerName: 'Ana Gómez' });
    const { service, database } = setup({ customers: [ana], sales: [sale] });

    service.remove('c1');

    expect(database.read().sales).toEqual([sale]);
  });
});

describe('find', () => {
  it('devuelve el cliente, o null si no existe', () => {
    const { service } = setup({ customers: [ana] });

    expect(service.find('c1')).toEqual(ana);
    expect(service.find('nope')).toBeNull();
  });
});

describe('validate', () => {
  it('no da errores con datos válidos y no guarda nada', () => {
    const { service, database } = setup();

    expect(service.validate(validInput)).toEqual({});
    expect(database.read().customers).toEqual([]);
    expect(database.read().activity).toEqual([]);
  });

  it('marca un email ya usado, salvo para su dueño', () => {
    const { service } = setup({ customers: [ana] });

    expect(service.validate(validInput)).toHaveProperty('email');
    expect(service.validate(validInput, 'c1')).toEqual({});
  });
});

describe('query', () => {
  const baseQuery: CustomerQuery = {
    search: '',
    sortKey: 'name',
    direction: 'asc',
    page: 1,
    pageSize: 10,
  };

  function names(options: Partial<CustomerQuery>, customers: readonly Customer[]) {
    const { service } = setup({ customers });
    return service.query({ ...baseQuery, ...options }).items.map(({ name }) => name);
  }

  const people = [
    makeCustomer({ id: 'c1', name: 'García', email: 'g@example.com', company: 'Zeta Demo' }),
    makeCustomer({ id: 'c2', name: 'Núñez', email: 'hola@example.com', company: 'Aurora Demo' }),
    makeCustomer({ id: 'c3', name: 'Álvarez', email: 'z@example.com', company: 'Mitre Demo' }),
  ];

  it.each([
    ['garcia', ['García']],
    ['HOLA@', ['Núñez']],
    ['aurora', ['Núñez']],
    ['+54', []],
  ])('busca "%s" en nombre, email y empresa', (search, expected) => {
    expect(names({ search }, people)).toEqual(expected);
  });

  it('ordena por nombre de forma ascendente', () => {
    expect(names({}, people)).toEqual(['Álvarez', 'García', 'Núñez']);
  });

  it('ordena por empresa de forma descendente', () => {
    expect(names({ sortKey: 'company', direction: 'desc' }, people)).toEqual([
      'García',
      'Álvarez',
      'Núñez',
    ]);
  });

  it('ordena por email', () => {
    expect(names({ sortKey: 'email' }, people)).toEqual(['García', 'Núñez', 'Álvarez']);
  });

  const twelve = Array.from({ length: 12 }, (_, index) =>
    makeCustomer({ id: `c${index}`, name: `Cliente ${String(index).padStart(2, '0')}` }),
  );

  it('devuelve la página pedida con los totales', () => {
    const { service } = setup({ customers: twelve });

    const page = service.query({ ...baseQuery, page: 2 });

    expect(page.items).toHaveLength(2);
    expect(page).toMatchObject({ page: 2, pageCount: 2, totalItems: 12 });
  });

  it('devuelve la última página si la pedida ya no existe', () => {
    const { service } = setup({ customers: twelve });

    expect(service.query({ ...baseQuery, page: 9 }).page).toBe(2);
  });
});

describe('con el almacenamiento lleno', () => {
  const failure = err({ kind: 'storage', failure: 'quota-exceeded' });

  it('create informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup({ customers: [bruno] });
    const before = database.read();
    fillStorage();

    expect(service.create(validInput)).toEqual(failure);
    expect(database.read()).toEqual(before);
  });

  it('update informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup({ customers: [ana] });
    const before = database.read();
    fillStorage();

    expect(service.update('c1', validInput)).toEqual(failure);
    expect(database.read()).toEqual(before);
  });

  it('remove informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup({ customers: [ana] });
    const before = database.read();
    fillStorage();

    expect(service.remove('c1')).toEqual(failure);
    expect(database.read()).toEqual(before);
  });
});
