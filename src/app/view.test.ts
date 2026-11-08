import { afterEach, describe, expect, it, vi } from 'vitest';
import { runViewCleanup } from './view';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runViewCleanup', () => {
  it('ejecuta la limpieza de la vista', () => {
    const cleanup = vi.fn();

    runViewCleanup(cleanup);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('acepta una vista sin limpieza', () => {
    expect(() => runViewCleanup(undefined)).not.toThrow();
  });

  // Si el error subiera, el router quedaría a mitad de camino y no montaría la vista siguiente.
  it('registra un error de la limpieza sin propagarlo', () => {
    const error = new Error('falló destroy');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      runViewCleanup(() => {
        throw error;
      }),
    ).not.toThrow();
    expect(log).toHaveBeenCalledWith('No se pudo limpiar la vista anterior', error);
  });
});
