import type { StorageFailure } from '../data/database';

export function storageFailureMessage(failure: StorageFailure): string {
  return failure === 'quota-exceeded'
    ? 'No se pudo guardar. El almacenamiento del navegador está lleno.'
    : 'No se pudo guardar.';
}
