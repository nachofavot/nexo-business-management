import { describe, expect, it } from 'vitest';
import type { PreferencesInput, Settings } from '../types';
import { validatePreferences, validateProfile } from './settings';

const validProfile: Settings['profile'] = {
  displayName: 'Usuario Demo',
  email: 'demo@example.com',
  role: '',
};

const validPreferences: PreferencesInput = {
  currency: 'USD',
  taxPercent: '10,5',
  lowStockThreshold: '0',
  tableDensity: 'compact',
  accent: 'blue',
};

describe('validateProfile', () => {
  it('recorta los textos y guarda el email en minúsculas', () => {
    const result = validateProfile({
      displayName: ' Usuario ',
      email: 'DEMO@Example.com',
      role: ' Administrador ',
    });

    expect(result).toEqual({
      ok: true,
      value: { displayName: 'Usuario', email: 'demo@example.com', role: 'Administrador' },
    });
  });

  it.each([
    ['displayName', 'A'],
    ['displayName', 'x'.repeat(61)],
    ['email', 'demo@example'],
    ['role', 'x'.repeat(61)],
  ])('marca error en %s con "%s"', (field, value) => {
    const result = validateProfile({ ...validProfile, [field]: value });

    expect(result.ok ? {} : result.error).toHaveProperty(field);
  });

  it('acepta un rol vacío', () => {
    expect(validateProfile(validProfile).ok).toBe(true);
  });
});

describe('validatePreferences', () => {
  it('convierte los números', () => {
    expect(validatePreferences(validPreferences)).toEqual({
      ok: true,
      value: {
        currency: 'USD',
        taxPercent: 10.5,
        lowStockThreshold: 0,
        tableDensity: 'compact',
        accent: 'blue',
      },
    });
  });

  it.each([
    ['currency', 'BTC'],
    ['taxPercent', ''],
    ['taxPercent', '-1'],
    ['taxPercent', '21.555'],
    ['taxPercent', '100.01'],
    ['lowStockThreshold', '1.5'],
    ['lowStockThreshold', '1001'],
    ['tableDensity', 'enorme'],
    ['accent', 'rojo'],
  ])('marca error en %s con "%s"', (field, value) => {
    const result = validatePreferences({ ...validPreferences, [field]: value });

    expect(result.ok ? {} : result.error).toHaveProperty(field);
  });

  it.each([
    ['taxPercent', '100'],
    ['taxPercent', '0'],
    ['lowStockThreshold', '1000'],
  ])('acepta %s con "%s"', (field, value) => {
    expect(validatePreferences({ ...validPreferences, [field]: value }).ok).toBe(true);
  });
});
