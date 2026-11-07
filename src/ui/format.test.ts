import { describe, expect, it } from 'vitest';
import type { Currency } from '../domain/types';
import {
  formatDateTime,
  formatDiscount,
  formatMoney,
  formatMonth,
  formatPaymentMethod,
  formatPercent,
  formatPercentChange,
} from './format';

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
    ['2026-03-02T12:05:00.000Z', '02/03/2026, 09:05'],
  ])('muestra %s en hora local como %s', (isoDate, expected) => {
    expect(withPlainSpaces(formatDateTime(isoDate))).toBe(expected);
  });
});

describe('formatMonth', () => {
  it('muestra el nombre del mes en español', () => {
    expect(formatMonth(new Date(2026, 10, 5))).toBe('noviembre');
  });
});

describe('formatPaymentMethod', () => {
  it.each([
    ['cash', 'Efectivo'],
    ['card', 'Tarjeta'],
    ['transfer', 'Transferencia'],
  ] as const)('muestra %s como %s', (method, expected) => {
    expect(formatPaymentMethod(method)).toBe(expected);
  });
});

describe('formatDiscount', () => {
  it('muestra el descuento en negativo', () => {
    expect(withPlainSpaces(formatDiscount(45000, 'ARS'))).toBe('-$ 450,00');
  });

  it('muestra un descuento de 0 sin signo menos', () => {
    expect(withPlainSpaces(formatDiscount(0, 'ARS'))).toBe('$ 0,00');
  });
});

describe('formatPercent', () => {
  it.each([
    [21, '21 %'],
    [10.5, '10,5 %'],
    [0, '0 %'],
    [100, '100 %'],
  ])('muestra %d como %s', (value, expected) => {
    expect(withPlainSpaces(formatPercent(value))).toBe(expected);
  });
});
