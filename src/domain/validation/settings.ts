import { err, ok, type Result } from '../result';
import {
  ACCENTS,
  CURRENCIES,
  TABLE_DENSITIES,
  type FieldErrors,
  type PreferencesInput,
  type Settings,
} from '../types';
import {
  compactErrors,
  emailError,
  hasErrors,
  isOneOf,
  lengthError,
  parseIntegerInRange,
  parsePercent,
} from './rules';

const MAX_LOW_STOCK_THRESHOLD = 1_000;

export function validateProfile(
  input: Settings['profile'],
): Result<Settings['profile'], FieldErrors<keyof Settings['profile']>> {
  const data: Settings['profile'] = {
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role.trim(),
  };

  const errors = compactErrors<keyof Settings['profile']>({
    displayName: lengthError(data.displayName, 2, 60),
    email: emailError(data.email),
    role: lengthError(data.role, 0, 60),
  });

  return hasErrors(errors) ? err(errors) : ok(data);
}

export function validatePreferences(
  input: PreferencesInput,
): Result<Settings['preferences'], FieldErrors<keyof PreferencesInput>> {
  const currency = isOneOf(input.currency, CURRENCIES) ? input.currency : null;
  const taxPercent = parsePercent(input.taxPercent, 2);
  const lowStockThreshold = parseIntegerInRange(
    input.lowStockThreshold,
    0,
    MAX_LOW_STOCK_THRESHOLD,
  );
  const tableDensity = isOneOf(input.tableDensity, TABLE_DENSITIES) ? input.tableDensity : null;
  const accent = isOneOf(input.accent, ACCENTS) ? input.accent : null;

  const errors = compactErrors<keyof PreferencesInput>({
    currency: currency === null ? 'Elegí una moneda.' : undefined,
    taxPercent:
      taxPercent === null ? 'Ingresá un número de 0 a 100, con hasta 2 decimales.' : undefined,
    lowStockThreshold:
      lowStockThreshold === null
        ? `Ingresá un número entero de 0 a ${MAX_LOW_STOCK_THRESHOLD}.`
        : undefined,
    tableDensity: tableDensity === null ? 'Elegí una densidad.' : undefined,
    accent: accent === null ? 'Elegí un color de acento.' : undefined,
  });

  if (
    hasErrors(errors) ||
    currency === null ||
    taxPercent === null ||
    lowStockThreshold === null ||
    tableDensity === null ||
    accent === null
  ) {
    return err(errors);
  }
  return ok({ currency, taxPercent, lowStockThreshold, tableDensity, accent });
}
