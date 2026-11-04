import { describe, expect, it } from 'vitest';
import { err, ok } from './result';

describe('Result', () => {
  it('ok envuelve el valor', () => {
    expect(ok(5)).toEqual({ ok: true, value: 5 });
  });

  it('err envuelve el error', () => {
    expect(err('falló')).toEqual({ ok: false, error: 'falló' });
  });
});
