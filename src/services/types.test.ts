import { describe, expect, it } from 'vitest';
import { hasChanges } from './types';

describe('hasChanges', () => {
  it('es false si los campos nuevos valen lo mismo', () => {
    expect(hasChanges({ a: 1, b: 'x' }, { b: 'x' })).toBe(false);
  });

  it('es true si algún campo cambia', () => {
    expect(hasChanges({ a: 1, b: 'x' }, { b: 'y' })).toBe(true);
    expect(hasChanges({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toBe(true);
  });

  it('es false sin campos nuevos', () => {
    expect(hasChanges({ a: 1 }, {})).toBe(false);
  });
});
