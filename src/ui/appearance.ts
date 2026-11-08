import type { Settings } from '../domain/types';

export type AppearancePreferences = Pick<Settings['preferences'], 'accent' | 'tableDensity'>;

/**
 * Escribe data-accent y data-density en el elemento raíz. Los estilos hacen el resto: los colores
 * siguen viviendo solo en el CSS, y la CSP no permite escribir estilos desde JavaScript.
 */
export function applyAppearance(
  target: { dataset: DOMStringMap },
  preferences: AppearancePreferences,
): void {
  target.dataset.accent = preferences.accent;
  target.dataset.density = preferences.tableDensity;
}
