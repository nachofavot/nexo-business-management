import type { FieldErrors } from '../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 120;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function parseIntegerInRange(raw: string, min: number, max: number): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;

  const value = Number(trimmed);
  return value >= min && value <= max ? value : null;
}

export function parsePercent(raw: string, maxDecimals: number): number | null {
  const trimmed = raw.trim();
  if (!new RegExp(`^\\d+(?:[.,]\\d{1,${maxDecimals}})?$`).test(trimmed)) return null;

  const value = Number(trimmed.replace(',', '.'));
  return value <= 100 ? value : null;
}

export function lengthError(value: string, min: number, max: number): string | undefined {
  if (value.length >= min && value.length <= max) return undefined;
  return min === 0
    ? `Debe tener hasta ${max} caracteres.`
    : `Debe tener entre ${min} y ${max} caracteres.`;
}

export function emailError(value: string): string | undefined {
  if (!isValidEmail(value)) return 'Ingresá un email válido.';
  if (value.length > EMAIL_MAX_LENGTH) return `Debe tener hasta ${EMAIL_MAX_LENGTH} caracteres.`;
  return undefined;
}

export function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

/** Deja solo los campos con error, para saber si hay alguno contando las claves. */
export function compactErrors<K extends string>(
  candidates: Record<K, string | undefined>,
): FieldErrors<K> {
  const errors: FieldErrors<K> = {};
  for (const field of Object.keys(candidates) as K[]) {
    const message = candidates[field];
    if (message !== undefined) errors[field] = message;
  }
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
