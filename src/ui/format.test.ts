import { describe, expect, it } from 'vitest';
import type { Currency } from '../domain/types';
import { formatDateTime, formatMoney, formatMonth, formatPercentChange } from './format';

// Intl separa símbolo y número con un espacio duro, que no se distingue a simple vista.
const withPlainSpaces = (text: string) => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it.each<[number, Currency, string]>([
    [123456, 'ARS', '$ 1.234,56'],
    [0, 'ARS', '$ 0,00'],
    [9999999999, 'ARS', '$ 99.999.999,99'],
    [123456, 'USD', 'US$ 1.234,56'],
    [123456, 'EUR', 'EUR 1.234,56'],
  ])('%i centavos en %s se muestran como %s', (cents, currency, expected) => {
    expect(withPlainSpaces(formatMoney(cents, currency))).toBe(expected);
  });
});

describe('formatPercentChange', () => {
  it.each<[number | null, string]>([
    [50, '+50 %'],
    [-12.34, '-12,3 %'],
    [0, '0 %'],
    [962.56, '+962,6 %'],
    [null, 'Sin datos previos'],
  ])('%s se muestra como %s', (change, expected) => {
    expect(withPlainSpaces(formatPercentChange(change))).toBe(expected);
  });
});

describe('formatDateTime', () => {
  it.each([
    ['2026-11-06T02:30:00.000Z', '05/11/2026, 23:30'],
    // Día, mes y hora de un dígito llevan cero, y la medianoche se muestra como 00.
    ['2026-03-02T03:05:00.000Z', '02/03/2026, 00:05'],
  ])('muestra %s en hora local como %s', (isoDate, expected) => {
    expect(withPlainSpaces(formatDateTime(isoDate))).toBe(expected);
  });
});

describe('formatMonth', () => {
  it('muestra el nombre del mes en español', () => {
    expect(formatMonth(new Date(2026, 10, 5))).toBe('noviembre');
  });
});
