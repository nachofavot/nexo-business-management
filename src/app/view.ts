import type { DatabaseStore } from '../data/database';
import type { Session } from './session';

export interface ViewContext {
  root: HTMLElement;
  /** Se aborta al salir de la vista: los eventos registrados con ella se quitan solos. */
  signal: AbortSignal;
  database: DatabaseStore;
  session: Session;
  navigate(path: string): void;
  now(): Date;
}

/** Monta una pantalla. Puede devolver una función de limpieza, por ejemplo para destruir gráficos. */
export type View = (context: ViewContext) => void | (() => void);
