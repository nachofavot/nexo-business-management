import { describe, expect, it, vi } from 'vitest';
import { err } from '../domain/result';
import { makeCustomer, makeDatabase } from '../testing/fixtures';
import { createMemoryStorage } from '../testing/memory-storage';
import { createDatabaseStore, type KeyValueStorage } from './database';

const DATABASE_KEY = 'nexo:db';
const BACKUP_KEY = 'nexo:db:backup';

const seed = makeDatabase({ nextSaleNumber: 351 });
const createSeed = () => seed;

function storeOver(storage: KeyValueStorage) {
  return createDatabaseStore({ getStorage: () => storage, createSeed });
}

function savedDatabase(storage: KeyValueStorage): unknown {
  return JSON.parse(storage.getItem(DATABASE_KEY) ?? 'null');
}

describe('al crear el store', () => {
  it('en el primer ingreso carga y guarda los datos demo', () => {
    const storage = createMemoryStorage();

    const store = storeOver(storage);

    expect(store.read()).toEqual(seed);
    expect(savedDatabase(storage)).toEqual(seed);
    expect(store.mode).toBe('persistent');
    expect(store.notice).toBeNull();
  });

  it('con datos válidos los devuelve sin generar datos demo', () => {
    const saved = makeDatabase({ nextSaleNumber: 42 });
    const storage = createMemoryStorage({ [DATABASE_KEY]: JSON.stringify(saved) });
    const seedSpy = vi.fn(createSeed);

    const store = createDatabaseStore({ getStorage: () => storage, createSeed: seedSpy });

    expect(store.read()).toEqual(saved);
    expect(seedSpy).not.toHaveBeenCalled();
    expect(store.notice).toBeNull();
  });

  it.each([
    ['JSON inválido', '{no es json'],
    ['un cliente sin nombre', JSON.stringify({ ...seed, customers: [{ id: 'c1' }] })],
    ['una versión desconocida', JSON.stringify({ ...seed, version: 2 })],
  ])('con %s respalda el texto, carga datos demo y avisa', (_description, damaged) => {
    const storage = createMemoryStorage({ [DATABASE_KEY]: damaged });

    const store = storeOver(storage);

    expect(storage.getItem(BACKUP_KEY)).toBe(damaged);
    expect(store.read()).toEqual(seed);
    expect(savedDatabase(storage)).toEqual(seed);
    expect(store.notice).toBe('recovered');
    expect(store.mode).toBe('persistent');
  });

  it('si falla la copia de respaldo igual carga los datos demo', () => {
    const memory = createMemoryStorage({ [DATABASE_KEY]: '{no es json' });
    const storage: KeyValueStorage = {
      ...memory,
      setItem(key, value) {
        if (key === BACKUP_KEY) throw new DOMException('lleno', 'QuotaExceededError');
        memory.setItem(key, value);
      },
    };

    const store = storeOver(storage);

    expect(store.read()).toEqual(seed);
    expect(store.notice).toBe('recovered');
  });

  it.each<[string, () => KeyValueStorage]>([
    [
      'no se puede acceder al almacenamiento',
      () => {
        throw new DOMException('bloqueado', 'SecurityError');
      },
    ],
    [
      'getItem falla',
      () => ({
        ...createMemoryStorage(),
        getItem() {
          throw new DOMException('bloqueado', 'SecurityError');
        },
      }),
    ],
    [
      'setItem falla al guardar el primer ingreso',
      () => ({
        ...createMemoryStorage(),
        setItem() {
          throw new DOMException('bloqueado', 'SecurityError');
        },
      }),
    ],
  ])('si %s funciona en memoria', (_description, getStorage) => {
    const store = createDatabaseStore({ getStorage, createSeed });

    expect(store.mode).toBe('memory');
    expect(store.read()).toEqual(seed);

    const updated = store.update((current) => ({ ...current, nextSaleNumber: 400 }));

    expect(updated.ok).toBe(true);
    expect(store.read().nextSaleNumber).toBe(400);
  });
});

describe('update', () => {
  it('guarda el nuevo estado, también para otro store sobre el mismo almacenamiento', () => {
    const storage = createMemoryStorage();
    const store = storeOver(storage);
    const customer = makeCustomer();

    const result = store.update((current) => ({ ...current, customers: [customer] }));

    expect(result).toEqual({ ok: true, value: { ...seed, customers: [customer] } });
    expect(store.read().customers).toEqual([customer]);
    expect(storeOver(storage).read().customers).toEqual([customer]);
  });

  it('recibe el estado actual', () => {
    const store = storeOver(createMemoryStorage());

    store.update((current) => ({ ...current, nextSaleNumber: current.nextSaleNumber + 1 }));
    store.update((current) => ({ ...current, nextSaleNumber: current.nextSaleNumber + 1 }));

    expect(store.read().nextSaleNumber).toBe(353);
  });

  it.each<[string, Error, string]>([
    ['QuotaExceededError', new DOMException('lleno', 'QuotaExceededError'), 'quota-exceeded'],
    [
      'el error de Firefox',
      new DOMException('lleno', 'NS_ERROR_DOM_QUOTA_REACHED'),
      'quota-exceeded',
    ],
    ['otro error', new Error('falló'), 'write-failed'],
  ])('con %s informa la falla y no cambia el estado', (_description, error, failure) => {
    const memory = createMemoryStorage();
    let shouldFail = false;
    const storage: KeyValueStorage = {
      ...memory,
      setItem(key, value) {
        if (shouldFail) throw error;
        memory.setItem(key, value);
      },
    };
    const store = storeOver(storage);
    shouldFail = true;

    const result = store.update((current) => ({ ...current, nextSaleNumber: 999 }));

    expect(result).toEqual(err(failure));
    expect(store.read()).toEqual(seed);
    expect(savedDatabase(memory)).toEqual(seed);
  });
});

describe('replace', () => {
  it('reemplaza todos los datos y los guarda', () => {
    const storage = createMemoryStorage();
    const store = storeOver(storage);
    const next = makeDatabase({ nextSaleNumber: 7 });

    expect(store.replace(next)).toEqual({ ok: true, value: next });
    expect(store.read()).toEqual(next);
    expect(savedDatabase(storage)).toEqual(next);
  });
});
