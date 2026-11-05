import { describe, expect, it } from 'vitest';
import { parseMoneyToCents, percentOfCents } from './money';

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
    [1005, 50, 503],
    [0, 21, 0],
    [12345, 100, 12345],
    [12345, 0, 0],
    [1000, 10.5, 105],
  ])('el %d %% de %i centavos da %i', (cents, percent, expected) => {
    expect(percentOfCents(cents, percent)).toBe(expected);
  });
});
