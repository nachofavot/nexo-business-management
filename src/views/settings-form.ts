import type { PreferencesInput, Settings } from '../domain/types';
import type { FieldDefinition } from '../ui/components/form-field';
import type { SegmentedOption } from '../ui/components/segmented';
import type { Accent, TableDensity } from '../domain/types';

// Sin autocompletado: en una demo con datos ficticios, el navegador ofrecería el nombre y el
// email reales de quien la usa.
export const PROFILE_FIELDS: readonly FieldDefinition<keyof Settings['profile']>[] = [
  { name: 'displayName', label: 'Nombre', required: true, autocomplete: 'off' },
  { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'off' },
  { name: 'role', label: 'Rol', autocomplete: 'off' },
];

export const PREFERENCE_FIELDS: readonly FieldDefinition<
  'currency' | 'taxPercent' | 'lowStockThreshold'
>[] = [
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
];

export const DENSITY_OPTIONS: readonly SegmentedOption<TableDensity>[] = [
  { value: 'comfortable', label: 'Cómoda' },
  { value: 'compact', label: 'Compacta' },
];

export const ACCENT_OPTIONS: readonly SegmentedOption<Accent>[] = [
  { value: 'violet', label: 'Violeta' },
  { value: 'blue', label: 'Azul' },
];

/** Los valores del formulario: el IVA se muestra con coma decimal, como se escribe en Argentina. */
export function preferencesToInput(preferences: Settings['preferences']): PreferencesInput {
  return {
    currency: preferences.currency,
    taxPercent: String(preferences.taxPercent).replace('.', ','),
    lowStockThreshold: String(preferences.lowStockThreshold),
    tableDensity: preferences.tableDensity,
    accent: preferences.accent,
  };
}
