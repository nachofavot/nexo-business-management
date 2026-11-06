import { describe, expect, it } from 'vitest';
import { isValidEmail, parseIntegerInRange, parsePercent } from './rules';

describe('isValidEmail', () => {
  it('acepta un email común', () => {
    expect(isValidEmail('ana@example.com')).toBe(true);
  });

  it.each(['', 'ana@example', 'ana example.com', 'a@b@c.com'])('rechaza "%s"', (value) => {
    expect(isValidEmail(value)).toBe(false);
  });
});

describe('parseIntegerInRange', () => {
  it.each([
    ['5', 5],
    [' 7 ', 7],
    ['0', 0],
    ['10', 10],
  ])('convierte "%s" a %i', (raw, expected) => {
    expect(parseIntegerInRange(raw, 0, 10)).toBe(expected);
  });

  it.each(['', '5.5', '1e3', '-1', '11', 'abc'])('rechaza "%s"', (raw) => {
    expect(parseIntegerInRange(raw, 0, 10)).toBeNull();
  });
});

describe('parsePercent', () => {
  it.each([
    ['21', 21],
    ['10,5', 10.5],
    ['10.55', 10.55],
    ['0', 0],
    ['100', 100],
  ])('convierte "%s" a %d', (raw, expected) => {
    expect(parsePercent(raw, 2)).toBe(expected);
  });

  it.each(['', '21.555', '100.01', '-1', 'abc'])('rechaza "%s"', (raw) => {
    expect(parsePercent(raw, 2)).toBeNull();
  });
});
