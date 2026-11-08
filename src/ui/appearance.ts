import type { Settings } from '../domain/types';

export type AppearancePreferences = Pick<Settings['preferences'], 'accent' | 'tableDensity'>;

/**
 * Escribe data-accent y data-density en el elemento raíz. Los estilos hacen el resto: los colores
 * viven solo en el CSS, y cambiar un atributo alcanza para que toda la app cambie, sin recorrer
 * elementos. La CSP de la app bloquea el atributo style escrito en el HTML, pero no element.style;
 * acá no hace falta ninguno de los dos.
 */
export function applyAppearance(
  target: { dataset: DOMStringMap },
  preferences: AppearancePreferences,
): void {
  target.dataset.accent = preferences.accent;
  target.dataset.density = preferences.tableDensity;
}
