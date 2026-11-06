import { describe, expect, it } from 'vitest';
import { addActivity } from './activity';
import type { ActivityEntry } from './types';

const makeEntry = (id: string): ActivityEntry => ({
  id,
  type: 'sale',
  message: `Evento ${id}`,
  createdAt: '2026-11-05T12:00:00.000Z',
});

describe('addActivity', () => {
  it('pone la entrada nueva primero', () => {
    const result = addActivity([makeEntry('vieja')], makeEntry('nueva'));

    expect(result.map((entry) => entry.id)).toEqual(['nueva', 'vieja']);
  });

  it('conserva 100 entradas y descarta la más antigua', () => {
    const full = Array.from({ length: 100 }, (_, index) => makeEntry(`e${index + 1}`));

    const result = addActivity(full, makeEntry('nueva'));

    expect(result).toHaveLength(100);
    expect(result[0]?.id).toBe('nueva');
    expect(result[99]?.id).toBe('e99');
  });

  it('no modifica la lista original', () => {
    const original = [makeEntry('vieja')];

    addActivity(original, makeEntry('nueva'));

    expect(original).toHaveLength(1);
  });
});
