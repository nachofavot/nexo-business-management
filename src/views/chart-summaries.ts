import type { ReportPeriod } from '../domain/reports';
import type { Currency, ProductCategory } from '../domain/types';
import type { ChartPoint } from '../ui/charts/config';
import { formatMoney, formatSeriesLabel, type SeriesPoint } from '../ui/format';

/**
 * "Total: $ X. Mayor ingreso: 5 de noviembre, con $ Y." Con un empate gana el más reciente,
 * porque los puntos vienen en orden cronológico.
 */
export function revenueSummary(points: readonly ChartPoint[], currency: Currency): string {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const totalText = `Total: ${formatMoney(total, currency)}.`;

  const best = points.reduce<ChartPoint | null>(
    (max, point) => (point.value > 0 && (max === null || point.value >= max.value) ? point : max),
    null,
  );
  if (!best) return totalText;

  return `${totalText} Mayor ingreso: ${best.title}, con ${formatMoney(best.value, currency)}.`;
}

/** "Computación encabeza con $ X." Los puntos ya vienen de mayor a menor. */
export function leaderSummary(
  points: readonly ChartPoint[],
  formatValue: (value: number) => string,
): string {
  const [first] = points;
  return first ? `${first.title} encabeza con ${formatValue(first.value)}.` : '';
}

export function revenuePoints(
  series: readonly (SeriesPoint & { revenueCents: number })[],
  period: ReportPeriod,
): ChartPoint[] {
  return series.map((point) => {
    const { short, long } = formatSeriesLabel(point, period);
    return { label: short, title: long, value: point.revenueCents };
  });
}

export function categoryPoints(
  categories: readonly { category: ProductCategory; grossCents: number }[],
): ChartPoint[] {
  return categories.map(({ category, grossCents }) => ({
    label: category,
    title: category,
    value: grossCents,
  }));
}

/** Filas de la tabla oculta: el nombre completo, nunca el recortado del eje. */
export function pointRows(
  points: readonly ChartPoint[],
  formatValue: (value: number) => string,
): [string, string][] {
  return points.map((point) => [point.title, formatValue(point.value)]);
}

export function productPoints(
  products: readonly { productId: string; productName: string; units: number }[],
): ChartPoint[] {
  return products.map(({ productName, units }) => ({
    // El eje lo recorta según el ancho real del gráfico (fitLabel, en la configuración).
    label: productName,
    title: productName,
    value: units,
  }));
}
