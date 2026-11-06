import { err, ok, type Result } from '../domain/result';
import type { Database } from '../domain/types';
import { isDatabase } from './schema';

const DATABASE_KEY = 'nexo:db';
const BACKUP_KEY = 'nexo:db:backup';

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type StorageFailure = 'quota-exceeded' | 'write-failed';

export interface DatabaseStore {
  read(): Database;
  update(change: (current: Database) => Database): Result<Database, StorageFailure>;
  replace(next: Database): Result<Database, StorageFailure>;
  readonly mode: 'persistent' | 'memory';
  readonly notice: 'recovered' | null;
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function writeDatabase(storage: KeyValueStorage, database: Database): StorageFailure | null {
  try {
    storage.setItem(DATABASE_KEY, JSON.stringify(database));
    return null;
  } catch (error) {
    return isQuotaError(error) ? 'quota-exceeded' : 'write-failed';
  }
}

function parseDatabase(raw: string): Database | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDatabase(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function backupDamagedData(storage: KeyValueStorage, raw: string): void {
  try {
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    // El respaldo es un intento: si falla, igual hay que recuperar la app.
  }
}

/** Devuelve null si el navegador bloquea el almacenamiento, para seguir funcionando en memoria. */
function readStoredText(
  getStorage: () => KeyValueStorage,
): { storage: KeyValueStorage; raw: string | null } | null {
  try {
    const storage = getStorage();
    return { storage, raw: storage.getItem(DATABASE_KEY) };
  } catch {
    return null;
  }
}

export function createDatabaseStore(options: {
  getStorage: () => KeyValueStorage;
  createSeed: () => Database;
}): DatabaseStore {
  const stored = readStoredText(options.getStorage);
  const saved = stored?.raw != null ? parseDatabase(stored.raw) : null;

  let storage = stored?.storage ?? null;
  let notice: DatabaseStore['notice'] = null;
  let current: Database;

  if (saved) {
    current = saved;
  } else {
    if (stored?.raw != null) {
      backupDamagedData(stored.storage, stored.raw);
      notice = 'recovered';
    }
    current = options.createSeed();
    if (storage && writeDatabase(storage, current) !== null) storage = null;
  }

  // El estado en memoria cambia solo después de guardar, para que nunca difiera de lo guardado.
  function commit(next: Database): Result<Database, StorageFailure> {
    const failure = storage ? writeDatabase(storage, next) : null;
    if (failure) return err(failure);

    current = next;
    return ok(next);
  }

  return {
    read: () => current,
    update: (change) => commit(change(current)),
    replace: commit,
    mode: storage ? 'persistent' : 'memory',
    notice,
  };
}
