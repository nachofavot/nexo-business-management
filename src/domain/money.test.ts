import { describe, expect, it } from 'vitest';
import { formatCentsForInput, parseMoneyToCents, percentOfCents } from './money';

describe('formatCentsForInput', () => {
  it.each([
    [123456, '1234,56'],
    [100, '1,00'],
    [5, '0,05'],
    [1999, '19,99'],
    [9_999_999_999, '99999999,99'],
  ])('escribe %i centavos como %s, y se puede volver a leer', (cents, text) => {
    expect(formatCentsForInput(cents)).toBe(text);
    expect(parseMoneyToCents(text)).toBe(cents);
  });
});

describe('parseMoneyToCents', () => {
  it.each([
    ['1234', 123400],
    ['19.99', 1999],
    ['19,99', 1999],
    ['1.5', 150],
    ['0.07', 7],
    [' 100 ', 10000],
    ['99999999.99', 9999999999],
  ])('convierte %s a %i centavos', (raw, cents) => {
    expect(parseMoneyToCents(raw)).toBe(cents);
  });

  it.each([
    '',
    'abc',
    '-5',
    '1e5',
    '.5',
    '5.',
    '1.234,56',
    '1.234',
    '12.345',
    '1,234.56',
    '99999999999999999999',
  ])('rechaza el formato %s', (raw) => {
    expect(parseMoneyToCents(raw)).toBeNull();
  });
});

describe('percentOfCents', () => {
  it.each([
    [100, 21, 21],
    [1000, 1.15, 12],
    [5000, 1.13, 57], // 5000 * 1.13 da 5649.999999999999 si se calcula con decimales
    [1005, 50, 503],
    [0, 21, 0],
    [12345, 100, 12345],
    [12345, 0, 0],
    [1000, 10.5, 105],
  ])('%i centavos al %d por ciento dan %i', (cents, percent, expected) => {
    expect(percentOfCents(cents, percent)).toBe(expected);
  });

  it('es exacto aunque la multiplicación supere Number.MAX_SAFE_INTEGER', () => {
    // El 21 % da exactamente 7.427.952.202.828,5. Con decimales, 35.371.200.965.850 × 2100
    // pierde precisión y la mitad no se redondeaba hacia arriba: daba 7.427.952.202.828.
    expect(percentOfCents(35_371_200_965_850, 21)).toBe(7_427_952_202_829);
  });
});
