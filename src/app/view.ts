import type { DatabaseStore } from '../data/database';
import type { Services } from '../services';
import type { Session } from './session';

export interface ViewContext {
  root: HTMLElement;
  /** Se aborta al salir de la vista: los eventos registrados con ella se quitan solos. */
  signal: AbortSignal;
  /** Solo para leer: las vistas modifican datos a través de `services`. */
  database: DatabaseStore;
  services: Services;
  session: Session;
  navigate(path: string): void;
  /** Vuelve a montar la pantalla actual, por ejemplo después de restaurar los datos. */
  refresh(): void;
  /** Vuelve a leer el perfil guardado y actualiza el menú de usuario. */
  refreshShell(): void;
  now(): Date;
}

/** Monta una pantalla. Puede devolver una función de limpieza, por ejemplo para destruir gráficos. */
export type View = (context: ViewContext) => void | (() => void);

/**
 * Ejecuta la limpieza de una vista sin dejar que un error la frene: si subiera, el router
 * quedaría a mitad de camino y no montaría la vista siguiente.
 */
export function runViewCleanup(cleanup: (() => void) | void): void {
  if (!cleanup) return;
  try {
    cleanup();
  } catch (error) {
    console.error('No se pudo limpiar la vista anterior', error);
  }
}
