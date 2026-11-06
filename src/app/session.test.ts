import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../data/database';
import { createMemoryStorage } from '../testing/memory-storage';
import { createSession } from './session';

const blocked = () => {
  throw new DOMException('bloqueado', 'SecurityError');
};

describe('createSession', () => {
  it('empieza inactiva', () => {
    const storage = createMemoryStorage();

    expect(createSession(() => storage).isActive()).toBe(false);
  });

  it('queda activa después de iniciarla, también al recargar', () => {
    const storage = createMemoryStorage();

    createSession(() => storage).start();

    expect(createSession(() => storage).isActive()).toBe(true);
  });

  it('queda inactiva después de cerrarla, también al recargar', () => {
    const storage = createMemoryStorage();
    const session = createSession(() => storage);

    session.start();
    session.end();

    expect(session.isActive()).toBe(false);
    expect(createSession(() => storage).isActive()).toBe(false);
  });

  it.each<[string, () => KeyValueStorage]>([
    ['no se puede acceder al almacenamiento', blocked],
    ['getItem falla', () => ({ ...createMemoryStorage(), getItem: blocked })],
    ['setItem falla', () => ({ ...createMemoryStorage(), setItem: blocked })],
    ['removeItem falla', () => ({ ...createMemoryStorage(), removeItem: blocked })],
  ])('si %s funciona en memoria', (_description, getStorage) => {
    const session = createSession(getStorage);

    expect(session.isActive()).toBe(false);
    session.start();
    expect(session.isActive()).toBe(true);
    session.end();
    expect(session.isActive()).toBe(false);
  });
});
