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

/** Crea el gráfico y devuelve la función que lo destruye, para la limpieza de la vista. */
export function mountChart<TType extends ChartType, TData, TLabel>(
  canvas: HTMLCanvasElement,
  config: ChartConfiguration<TType, TData, TLabel>,
): () => void {
  const chart = new Chart(canvas, config);
  return () => chart.destroy();
}
