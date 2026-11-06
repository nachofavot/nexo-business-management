import type { View } from '../app/view';
import { emptyState } from '../ui/components/empty-state';
import { setHtml } from '../ui/html';

/** Vista temporal para los módulos que todavía no se construyeron. Cada etapa la reemplaza. */
export function createUpcomingView(moduleName: string, stage: number): View {
  return ({ root }) => {
    setHtml(
      root,
      emptyState(
        `${moduleName} todavía no está disponible`,
        `Este módulo llega en la Etapa ${stage}.`,
      ),
    );
  };
}
