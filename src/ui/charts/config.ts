import type { ChartConfiguration, Scale } from 'chart.js';
import { truncateLabel } from '../format';

/** Los colores salen de los tokens de diseño; ver readChartTheme en mount.ts. */
export interface ChartTheme {
  series: string;
  grid: string;
  text: string;
  tooltipBackground: string;
  tooltipText: string;
  fontFamily: string;
}

export interface ChartPoint {
  /** Para el eje: corta o recortada. */
  label: string;
  /** Para el tooltip y la tabla: completa. */
  title: string;
  value: number;
}

export interface ChartOptions {
  theme: ChartTheme;
  reducedMotion: boolean;
  formatValue(value: number): string;
  formatTick(value: number): string;
  /** Para cantidades: el eje no marca fracciones como 0,5 unidades. */
  integerTicks?: boolean;
  /** Máximo de fechas con etiqueta en el eje de la línea, si hay lugar. Por defecto, 6. */
  maxDateTicks?: number;
}

const TICK_FONT_SIZE = 12;

/** Chart.js puede dar null si a un punto le falta el valor. */
interface ParsedPoint {
  x: number | null;
  y: number | null;
}

/** Caracteres por línea del título del tooltip: entra en el gráfico más angosto, de 300 px. */
const TOOLTIP_LINE_LENGTH = 32;

/**
 * Parte el título del tooltip en líneas, porque Chart.js no lo hace solo: un nombre largo quedaba
 * cortado contra el borde. Corta entre palabras, y una palabra más larga que la línea se parte.
 */
export function wrapTooltipTitle(text: string, maxLength: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(' ')) {
    const pieces =
      word.length > maxLength
        ? (word.match(new RegExp(`.{1,${maxLength}}`, 'gu')) ?? [word])
        : [word];
    for (const piece of pieces) {
      if (current === '') current = piece;
      else if (current.length + 1 + piece.length <= maxLength) current += ` ${piece}`;
      else {
        lines.push(current);
        current = piece;
      }
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

/**
 * Parte del ancho del gráfico para los nombres del eje. Chart.js les da hasta la mitad y dibuja
 * cortado lo que no entra; con el resto queda margen para el relleno de las marcas.
 */
const AXIS_LABEL_SHARE = 0.4;

/** Recorta un nombre con "…" hasta que entre en el ancho, midiendo el texto con la fuente real. */
export function fitLabel(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string {
  if (measure(text) <= maxWidth) return text;
  for (let length = text.length - 1; length > 1; length -= 1) {
    const candidate = truncateLabel(text, length);
    if (measure(candidate) <= maxWidth) return candidate;
  }
  return '…';
}

/** Espacio mínimo, en píxeles, entre las etiquetas del eje de fechas: en 320 px se tocaban. */
export const MIN_TICK_SPACING = 64;
const DEFAULT_MAX_DATE_TICKS = 6;

/**
 * Índices del eje de fechas con etiqueta: siempre el primero y el último (hoy), y el resto
 * repartido. Con autoSkip, Chart.js elegía por su cuenta y a veces omitía la última fecha.
 */
export function tickIndices(count: number, maxTicks: number): ReadonlySet<number> {
  if (count <= maxTicks) return new Set(Array.from({ length: count }, (_, index) => index));

  const step = (count - 1) / (maxTicks - 1);
  return new Set(Array.from({ length: maxTicks }, (_, index) => Math.round(index * step)));
}

function integerTicks(options: ChartOptions) {
  return options.integerTicks ? { precision: 0 } : {};
}

function tickStyle(theme: ChartTheme) {
  return { color: theme.text, font: { family: theme.fontFamily, size: TICK_FONT_SIZE } };
}

/**
 * Lo que comparten los dos gráficos: se adaptan al alto del contenedor, no tienen leyenda (un
 * solo color, nombrado por el título o por el eje) y el tooltip muestra el dato completo.
 */
function commonOptions(
  points: readonly ChartPoint[],
  options: ChartOptions,
  valueOf: (parsed: ParsedPoint) => number | null,
) {
  const { theme, reducedMotion, formatValue } = options;

  return {
    responsive: true,
    maintainAspectRatio: false,
    ...(reducedMotion ? { animation: false as const } : {}),
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.tooltipBackground,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        titleFont: { family: theme.fontFamily },
        bodyFont: { family: theme.fontFamily },
        displayColors: false,
        callbacks: {
          title: (items: readonly { dataIndex: number }[]) =>
            wrapTooltipTitle(points[items[0]?.dataIndex ?? -1]?.title ?? '', TOOLTIP_LINE_LENGTH),
          label: (item: { parsed: ParsedPoint }) => formatValue(valueOf(item.parsed) ?? 0),
        },
      },
    },
  };
}

export function lineChartConfig(
  points: readonly ChartPoint[],
  options: ChartOptions,
): ChartConfiguration<'line', number[], string> {
  const { theme, formatTick, maxDateTicks = DEFAULT_MAX_DATE_TICKS } = options;

  return {
    type: 'line',
    data: {
      labels: points.map((point) => point.label),
      datasets: [
        {
          data: points.map((point) => point.value),
          borderColor: theme.series,
          backgroundColor: theme.series,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
          tension: 0,
        },
      ],
    },
    options: {
      ...commonOptions(points, options, (parsed) => parsed.y),
      // El tooltip aparece con el mouse en cualquier altura del día, no solo sobre la línea.
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          border: { color: theme.grid },
          ticks: {
            ...tickStyle(theme),
            maxRotation: 0,
            autoSkip: false,
            // La primera y la última fecha se alinean hacia adentro: centradas, quedaban cortadas.
            align: 'inner',
            // Cuántas fechas entran depende del ancho real del gráfico, que cambia al girar el
            // celular o achicar la ventana. Las demás marcas no llevan texto.
            callback(this: Pick<Scale, 'chart'>, _value: string | number, index: number) {
              const maxTicks = Math.min(
                maxDateTicks,
                Math.max(2, Math.floor(this.chart.width / MIN_TICK_SPACING)),
              );
              return tickIndices(points.length, maxTicks).has(index)
                ? (points[index]?.label ?? null)
                : null;
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.grid },
          border: { display: false },
          ticks: {
            ...tickStyle(theme),
            maxTicksLimit: 5,
            ...integerTicks(options),
            callback: (value) => formatTick(Number(value)),
          },
        },
      },
    },
  };
}

/** Barras horizontales: los nombres de categorías y productos se leen en el eje. */
export function barChartConfig(
  points: readonly ChartPoint[],
  options: ChartOptions,
): ChartConfiguration<'bar', number[], string> {
  const { theme, formatTick } = options;

  return {
    type: 'bar',
    data: {
      labels: points.map((point) => point.label),
      datasets: [
        {
          data: points.map((point) => point.value),
          backgroundColor: theme.series,
          hoverBackgroundColor: theme.series,
          borderRadius: 4,
          // Redondeadas en la punta y rectas sobre el eje.
          borderSkipped: 'start',
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      ...commonOptions(points, options, (parsed) => parsed.x),
      indexAxis: 'y',
      // Una barra corta es difícil de alcanzar: el tooltip aparece en cualquier parte de la fila.
      interaction: { mode: 'index', axis: 'y', intersect: false },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: theme.grid },
          border: { display: false },
          ticks: {
            // Centrada, la última marca quedaba cortada contra el borde derecho en 320 px.
            align: 'inner',
            ...tickStyle(theme),
            maxTicksLimit: 5,
            ...integerTicks(options),
            callback: (value) => formatTick(Number(value)),
          },
        },
        y: {
          grid: { display: false },
          border: { color: theme.grid },
          ticks: {
            ...tickStyle(theme),
            // Recorta el nombre completo según el ancho real del gráfico, midiendo el texto.
            callback(this: Scale, _value: string | number, index: number) {
              const { ctx } = this;
              ctx.save();
              ctx.font = `${TICK_FONT_SIZE}px ${theme.fontFamily}`;
              const label = fitLabel(
                points[index]?.title ?? '',
                this.chart.width * AXIS_LABEL_SHARE,
                (text) => ctx.measureText(text).width,
              );
              ctx.restore();
              return label;
            },
          },
        },
      },
    },
  };
}
