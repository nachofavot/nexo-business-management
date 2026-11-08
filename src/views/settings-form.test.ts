import { describe, expect, it } from 'vitest';
import type { Settings } from '../domain/types';
import { validatePreferences } from '../domain/validation/settings';
import {
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  PREFERENCE_FIELDS,
  PROFILE_FIELDS,
  preferencesToInput,
} from './settings-form';

const preferences: Settings['preferences'] = {
  currency: 'USD',
  taxPercent: 10.5,
  lowStockThreshold: 3,
  tableDensity: 'compact',
  accent: 'blue',
};

describe('preferencesToInput', () => {
  it('convierte las preferencias en los valores del formulario', () => {
    expect(preferencesToInput(preferences)).toEqual({
      currency: 'USD',
      taxPercent: '10,5',
      lowStockThreshold: '3',
      tableDensity: 'compact',
      accent: 'blue',
    });
  });

  it.each([0, 21, 10.5, 99.99, 100])('el IVA %d vuelve igual al validarlo', (taxPercent) => {
    const saved = { ...preferences, taxPercent };

    expect(validatePreferences(preferencesToInput(saved))).toEqual({ ok: true, value: saved });
  });
});

describe('PROFILE_FIELDS', () => {
  it('tiene Nombre y Email obligatorios y Rol opcional, sin autocompletado', () => {
    expect(PROFILE_FIELDS).toEqual([
      { name: 'displayName', label: 'Nombre', required: true, autocomplete: 'off' },
      { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'off' },
      { name: 'role', label: 'Rol', autocomplete: 'off' },
    ]);
  });
});

describe('PREFERENCE_FIELDS', () => {
  it('tiene moneda, IVA y umbral, obligatorios, con sus ayudas y sin autocompletado', () => {
    expect(PREFERENCE_FIELDS).toEqual([
      {
        name: 'currency',
        label: 'Moneda',
        type: 'select',
        required: true,
        autocomplete: 'off',
        options: [
          { value: 'ARS', label: 'Peso argentino (ARS)' },
          { value: 'USD', label: 'Dólar estadounidense (USD)' },
          { value: 'EUR', label: 'Euro (EUR)' },
        ],
        hint: 'Cambia el formato de los importes. No convierte valores.',
      },
      {
        name: 'taxPercent',
        label: 'IVA (%)',
        required: true,
        autocomplete: 'off',
        inputMode: 'decimal',
        hint: 'Se aplica a las ventas nuevas. Las registradas conservan el suyo.',
      },
      {
        name: 'lowStockThreshold',
        label: 'Umbral de stock bajo',
        required: true,
        autocomplete: 'off',
        inputMode: 'numeric',
        hint: 'Un producto con esta cantidad o menos se marca con stock bajo.',
      },
    ]);
  });
});

describe('opciones de apariencia', () => {
  it('ofrecen las densidades y los acentos', () => {
    expect(DENSITY_OPTIONS).toEqual([
      { value: 'comfortable', label: 'Cómoda' },
      { value: 'compact', label: 'Compacta' },
    ]);
    expect(ACCENT_OPTIONS).toEqual([
      { value: 'violet', label: 'Violeta' },
      { value: 'blue', label: 'Azul' },
    ]);
  });
});
