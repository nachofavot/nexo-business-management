import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type ChartType,
} from 'chart.js';
import type { ChartTheme } from './config';
import { remountWhenReady, type Destroyable } from './lifecycle';

// Se registra solo lo que se usa, para que el build no incluya todo Chart.js.
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

/** Lee los colores de los tokens de diseño: así hay una sola fuente de verdad, _tokens.scss. */
export function readChartTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();

  return {
    series: token('--nx-blue'),
    grid: token('--nx-border'),
    text: token('--nx-text-muted'),
    tooltipBackground: token('--nx-surface-2'),
    tooltipText: token('--nx-text'),
    fontFamily: getComputedStyle(document.body).fontFamily,
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Crea el gráfico y devuelve cómo destruirlo, para la limpieza de la vista. */
export function mountChart<TType extends ChartType, TData, TLabel>(
  canvas: HTMLCanvasElement,
  config: ChartConfiguration<TType, TData, TLabel>,
): Destroyable {
  // Al recargar la página, Geist puede no estar lista y Chart.js mediría con la fuente de respaldo.
  const font = `12px ${getComputedStyle(document.body).fontFamily}`;
  const ready = document.fonts.check(font) ? null : document.fonts.load(font);

  const destroy = remountWhenReady(() => {
    const chart = new Chart(canvas, config);
    return () => chart.destroy();
  }, ready);
  return { destroy };
}

/**
 * Monta el gráfico en el canvas con ese id. Las vistas montan solo los gráficos con datos: si el
 * canvas no está, es un error de la vista y no se oculta.
 */
export function mountChartById<TType extends ChartType, TData, TLabel>(
  canvasId: string,
  config: ChartConfiguration<TType, TData, TLabel>,
): Destroyable {
  const canvas = document.getElementById(canvasId);
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`No existe el lienzo #${canvasId}`);
  return mountChart(canvas, config);
}
