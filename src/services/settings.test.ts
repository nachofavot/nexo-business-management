import { describe, expect, it } from 'vitest';
import { createDatabaseStore, type KeyValueStorage } from '../data/database';
import { createSeedDatabase } from '../data/seed';
import { err, ok } from '../domain/result';
import type { PreferencesInput, Settings } from '../domain/types';
import { makeCustomer, makeDatabase, makeSale, makeSettings } from '../testing/fixtures';
import { createMemoryStorage } from '../testing/memory-storage';
import { createSettingsService } from './settings';

// 2026-11-08 12:00 en Buenos Aires.
const NOW = new Date('2026-11-08T15:00:00.000Z');
const NOW_ISO = '2026-11-08T15:00:00.000Z';

const savedSettings: Settings = makeSettings({
  profile: { displayName: 'Ana Gómez', email: 'ana@example.com', role: '' },
  preferences: {
    currency: 'USD',
    taxPercent: 10.5,
    lowStockThreshold: 3,
    tableDensity: 'compact',
    accent: 'blue',
  },
});

function setup(settings: Settings = makeSettings()) {
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
        customers: [makeCustomer()],
        sales: [makeSale({ number: 7 })],
        activity: [{ id: 'a0', type: 'sale', message: 'Anterior', createdAt: NOW_ISO }],
        settings,
        nextSaleNumber: 8,
      }),
  });

  let idCount = 0;
  const service = createSettingsService({
    database,
    generateId: () => `id-${(idCount += 1)}`,
    now: () => NOW,
  });

  return {
    database,
    service,
    storedText: () => memory.getItem('nexo:db'),
    fillStorage() {
      isFull = true;
    },
  };
}

const preferencesInput: PreferencesInput = {
  currency: 'USD',
  taxPercent: '10,5',
  lowStockThreshold: '3',
  tableDensity: 'compact',
  accent: 'blue',
};

describe('read', () => {
  it('devuelve la configuración guardada', () => {
    const { service } = setup(savedSettings);

    expect(service.read()).toEqual(savedSettings);
  });
});

describe('updateProfile', () => {
  it('guarda el perfil normalizado y registra la actividad', () => {
    const { service, database } = setup();

    const result = service.updateProfile({
      displayName: '  Ana Gómez ',
      email: 'ANA@Example.com',
      role: '',
    });

    expect(result).toEqual(ok('saved'));
    expect(database.read().settings.profile).toEqual({
      displayName: 'Ana Gómez',
      email: 'ana@example.com',
      role: '',
    });
    expect(database.read().activity[0]).toEqual({
      id: 'id-1',
      type: 'settings',
      message: 'Perfil actualizado',
      createdAt: NOW_ISO,
    });
  });

  it('con el perfil guardado no escribe nada', () => {
    const { service, database, storedText } = setup(savedSettings);
    const before = database.read();
    const text = storedText();

    expect(service.updateProfile({ ...savedSettings.profile, displayName: ' Ana Gómez' })).toEqual(
      ok('unchanged'),
    );
    expect(database.read()).toBe(before);
    expect(storedText()).toBe(text);
  });

  it('rechaza datos inválidos sin cambiar nada', () => {
    const { service, database } = setup();
    const before = database.read();

    const result = service.updateProfile({ ...savedSettings.profile, displayName: 'A' });

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { displayName: expect.any(String) },
    });
    expect(database.read()).toBe(before);
  });

  it('no cambia las preferencias', () => {
    const { service, database } = setup(savedSettings);

    service.updateProfile({ displayName: 'Bruno Paz', email: 'bruno@example.com', role: 'Ventas' });

    expect(database.read().settings.preferences).toEqual(savedSettings.preferences);
  });
});

describe('updatePreferences', () => {
  it('guarda las preferencias convertidas y registra la actividad', () => {
    const { service, database } = setup();

    expect(service.updatePreferences(preferencesInput)).toEqual(ok('saved'));
    expect(database.read().settings.preferences).toEqual({
      currency: 'USD',
      taxPercent: 10.5,
      lowStockThreshold: 3,
      tableDensity: 'compact',
      accent: 'blue',
    });
    expect(database.read().activity[0]).toMatchObject({
      type: 'settings',
      message: 'Preferencias actualizadas',
    });
  });

  it('con las preferencias guardadas no escribe nada', () => {
    const { service, database, storedText } = setup(savedSettings);
    const before = database.read();
    const text = storedText();

    expect(service.updatePreferences({ ...preferencesInput, taxPercent: '10.50' })).toEqual(
      ok('unchanged'),
    );
    expect(database.read()).toBe(before);
    expect(storedText()).toBe(text);
  });

  it('rechaza un IVA con más de 2 decimales sin cambiar nada', () => {
    const { service, database } = setup();
    const before = database.read();

    const result = service.updatePreferences({ ...preferencesInput, taxPercent: '21,555' });

    expect(result.ok ? null : result.error).toMatchObject({
      kind: 'validation',
      errors: { taxPercent: expect.any(String) },
    });
    expect(database.read()).toBe(before);
  });

  it('no cambia el perfil', () => {
    const { service, database } = setup(savedSettings);

    service.updatePreferences({ ...preferencesInput, currency: 'EUR' });

    expect(database.read().settings.profile).toEqual(savedSettings.profile);
  });
});

describe('validate', () => {
  it('valida sin guardar', () => {
    const { service, database } = setup();
    const before = database.read();

    expect(service.validateProfile({ displayName: 'A', email: 'x', role: '' })).toEqual({
      displayName: expect.any(String),
      email: expect.any(String),
    });
    expect(service.validateProfile(savedSettings.profile)).toEqual({});
    expect(service.validatePreferences({ ...preferencesInput, lowStockThreshold: '-1' })).toEqual({
      lowStockThreshold: expect.any(String),
    });
    expect(service.validatePreferences(preferencesInput)).toEqual({});
    expect(database.read()).toBe(before);
  });
});

describe('restoreDemo', () => {
  it('regenera los datos demo con la fecha de hoy', () => {
    const { service, database } = setup(savedSettings);
    const seed = createSeedDatabase(NOW);

    expect(service.restoreDemo()).toEqual(ok(undefined));

    const restored = database.read();
    expect(restored.customers).toEqual(seed.customers);
    expect(restored.products).toEqual(seed.products);
    expect(restored.sales).toEqual(seed.sales);
    expect(restored.nextSaleNumber).toBe(seed.nextSaleNumber);
  });

  it('conserva el perfil y las preferencias', () => {
    const { service, database } = setup(savedSettings);

    service.restoreDemo();

    expect(database.read().settings).toEqual(savedSettings);
  });

  it('registra la restauración primero, sobre la actividad de los datos nuevos', () => {
    const { service, database } = setup();
    const seed = createSeedDatabase(NOW);

    service.restoreDemo();

    expect(database.read().activity).toEqual([
      { id: 'id-1', type: 'data', message: 'Datos demo restaurados', createdAt: NOW_ISO },
      ...seed.activity,
    ]);
  });
});

describe('con el almacenamiento lleno', () => {
  const failure = err({ kind: 'storage', failure: 'quota-exceeded' });

  it('updateProfile informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup();
    const before = database.read();
    fillStorage();

    expect(service.updateProfile(savedSettings.profile)).toEqual(failure);
    expect(service.read()).toEqual(before.settings);
    expect(database.read()).toBe(before);
  });

  it('updatePreferences informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup();
    const before = database.read();
    fillStorage();

    expect(service.updatePreferences(preferencesInput)).toEqual(failure);
    expect(database.read()).toBe(before);
  });

  it('restoreDemo informa la falla y no cambia nada', () => {
    const { service, database, fillStorage } = setup();
    const before = database.read();
    fillStorage();

    expect(service.restoreDemo()).toEqual(err('quota-exceeded'));
    expect(database.read()).toBe(before);
  });
});
