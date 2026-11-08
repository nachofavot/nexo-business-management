import type { ChartConfiguration } from 'chart.js';

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
}

const TICK_FONT_SIZE = 12;

/** Chart.js puede dar null si a un punto le falta el valor. */
interface ParsedPoint {
  x: number | null;
  y: number | null;
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
            points[items[0]?.dataIndex ?? -1]?.title ?? '',
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
  const { theme, formatTick } = options;

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
          ticks: { ...tickStyle(theme), maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
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
      scales: {
        x: {
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
        y: {
          grid: { display: false },
          border: { color: theme.grid },
          ticks: tickStyle(theme),
        },
      },
    },
  };
}
