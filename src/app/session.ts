import type { KeyValueStorage } from '../data/database';

const SESSION_KEY = 'nexo:session';
const ACTIVE_VALUE = 'active';

export interface Session {
  isActive(): boolean;
  start(): void;
  end(): void;
}

function readStoredSession(getStorage: () => KeyValueStorage): boolean {
  try {
    return getStorage().getItem(SESSION_KEY) === ACTIVE_VALUE;
  } catch {
    return false;
  }
}

function tryWrite(write: () => void): void {
  try {
    write();
  } catch {
    // Con el almacenamiento bloqueado, la sesión dura hasta recargar la página.
  }
}

/** Sesión de demostración: no autentica a nadie, solo recuerda que se entró a la demo. */
export function createSession(getStorage: () => KeyValueStorage): Session {
  let active = readStoredSession(getStorage);

  return {
    isActive: () => active,
    start() {
      active = true;
      tryWrite(() => getStorage().setItem(SESSION_KEY, ACTIVE_VALUE));
    },
    end() {
      active = false;
      tryWrite(() => getStorage().removeItem(SESSION_KEY));
    },
  };
}
