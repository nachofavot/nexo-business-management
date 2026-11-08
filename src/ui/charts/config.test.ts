import { describe, expect, it } from 'vitest';
import { barChartConfig, lineChartConfig, type ChartOptions, type ChartPoint } from './config';

const theme = {
  series: '#2e9bff',
  grid: 'rgba(255, 255, 255, 0.08)',
  text: '#9aa3b5',
  tooltipBackground: '#1b2130',
  tooltipText: '#e8eaf0',
  fontFamily: 'Geist Variable',
};

const points: readonly ChartPoint[] = [
  { label: 'a', title: 'a larga', value: 100 },
  { label: 'b', title: 'b larga', value: 2500 },
  { label: 'c', title: 'c larga', value: 0 },
];

const options: ChartOptions = {
  theme,
  reducedMotion: false,
  formatValue: (value) => `valor ${value}`,
  formatTick: (value) => `marca ${value}`,
};

describe('lineChartConfig', () => {
  const config = lineChartConfig(points, options);
  const dataset = config.data.datasets[0];

  it('dibuja una línea fina del color de los datos, sin puntos', () => {
    expect(config.type).toBe('line');
    expect(config.data.labels).toEqual(['a', 'b', 'c']);
    expect(dataset).toMatchObject({
      data: [100, 2500, 0],
      borderColor: theme.series,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0,
    });
  });

  it('el eje de valores empieza en 0, con grilla tenue y marcas formateadas', () => {
    const y = config.options?.scales?.y;
    expect(y).toMatchObject({ beginAtZero: true, grid: { color: theme.grid } });
    const callback = y?.ticks?.callback;
    expect(callback?.call(undefined as never, 2500, 0, [])).toBe('marca 2500');
  });

  it('el eje horizontal no tiene grilla', () => {
    expect(config.options?.scales?.x).toMatchObject({ grid: { display: false } });
  });

  it('el tooltip muestra el título largo y el valor formateado', () => {
    const callbacks = config.options?.plugins?.tooltip?.callbacks;
    expect(callbacks?.title?.call(undefined as never, [{ dataIndex: 1 } as never])).toBe('b larga');
    expect(callbacks?.label?.call(undefined as never, { parsed: { x: 1, y: 2500 } } as never)).toBe(
      'valor 2500',
    );
  });
});

describe('barChartConfig', () => {
  const config = barChartConfig(points, options);
  const dataset = config.data.datasets[0];

  it('dibuja barras horizontales del color de los datos, en el orden recibido', () => {
    expect(config.type).toBe('bar');
    expect(config.options?.indexAxis).toBe('y');
    expect(config.data.labels).toEqual(['a', 'b', 'c']);
    expect(dataset).toMatchObject({
      data: [100, 2500, 0],
      backgroundColor: theme.series,
      borderRadius: 4,
    });
  });

  it('el eje de valores es el horizontal, empieza en 0 y usa las marcas formateadas', () => {
    const x = config.options?.scales?.x;
    expect(x).toMatchObject({ beginAtZero: true, grid: { color: theme.grid } });
    expect(x?.ticks?.callback?.call(undefined as never, 100, 0, [])).toBe('marca 100');
    expect(config.options?.scales?.y).toMatchObject({ grid: { display: false } });
  });

  it('el tooltip muestra el nombre completo y el valor del eje horizontal', () => {
    const callbacks = config.options?.plugins?.tooltip?.callbacks;
    expect(callbacks?.title?.call(undefined as never, [{ dataIndex: 0 } as never])).toBe('a larga');
    expect(callbacks?.label?.call(undefined as never, { parsed: { x: 100, y: 0 } } as never)).toBe(
      'valor 100',
    );
  });
});

describe('opciones comunes', () => {
  it.each([
    ['línea', lineChartConfig],
    ['barras', barChartConfig],
  ] as const)('%s: se adapta al contenedor, sin leyenda y con la fuente del tema', (_, build) => {
    const config = build(points, options);

    expect(config.options).toMatchObject({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { font: { family: theme.fontFamily } } } },
    });
    expect(config.options?.animation).toBeUndefined();
  });

  it.each([
    ['línea', lineChartConfig],
    ['barras', barChartConfig],
  ] as const)('%s: sin animaciones si se pide menos movimiento', (_, build) => {
    expect(build(points, { ...options, reducedMotion: true }).options?.animation).toBe(false);
  });
});
