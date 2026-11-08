import { describe, expect, it } from 'vitest';
import {
  barChartConfig,
  fitLabel,
  lineChartConfig,
  MIN_TICK_SPACING,
  tickIndices,
  wrapTooltipTitle,
  type ChartOptions,
  type ChartPoint,
} from './config';

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
    expect(callbacks?.title?.call(undefined as never, [{ dataIndex: 1 } as never])).toEqual([
      'b larga',
    ]);
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
    expect(callbacks?.title?.call(undefined as never, [{ dataIndex: 0 } as never])).toEqual([
      'a larga',
    ]);
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

describe('marcas enteras', () => {
  it('con integerTicks el eje de valores no marca fracciones', () => {
    const config = barChartConfig(points, { ...options, integerTicks: true });

    expect(config.options?.scales?.x?.ticks).toMatchObject({ precision: 0 });
  });

  it('sin integerTicks no fija la precisión', () => {
    expect(barChartConfig(points, options).options?.scales?.x?.ticks).not.toHaveProperty(
      'precision',
    );
  });
});

// El tooltip de Chart.js no parte el texto: un nombre largo quedaba cortado contra el borde.
describe('wrapTooltipTitle', () => {
  it('deja en una línea un título corto', () => {
    expect(wrapTooltipTitle('Monitor', 32)).toEqual(['Monitor']);
  });

  it('parte entre palabras', () => {
    expect(wrapTooltipTitle('Cámara web 1080p con micrófono incorporado y tapa', 32)).toEqual([
      'Cámara web 1080p con micrófono',
      'incorporado y tapa',
    ]);
  });

  it('parte una palabra más larga que la línea', () => {
    expect(wrapTooltipTitle('X'.repeat(80), 32)).toEqual([
      'X'.repeat(32),
      'X'.repeat(32),
      'X'.repeat(16),
    ]);
  });

  it('el tooltip de los gráficos usa las líneas', () => {
    const long = { label: 'corto', title: 'Y'.repeat(40), value: 1 };
    const callbacks = barChartConfig([long], options).options?.plugins?.tooltip?.callbacks;

    expect(callbacks?.title?.call(undefined as never, [{ dataIndex: 0 } as never])).toEqual([
      'Y'.repeat(32),
      'Y'.repeat(8),
    ]);
  });
});

describe('interacción de las barras', () => {
  // Una barra corta es difícil de alcanzar: el tooltip aparece con el mouse en cualquier parte de
  // la fila.
  it('muestra el tooltip con el mouse en cualquier parte de la fila', () => {
    expect(barChartConfig(points, options).options?.interaction).toMatchObject({
      mode: 'index',
      axis: 'y',
      intersect: false,
    });
  });
});

// Chart.js le da al eje de nombres hasta la mitad del ancho y dibuja cortado lo que no entra: el
// nombre se recorta midiendo el texto, no contando caracteres.
describe('fitLabel', () => {
  const measure = (text: string) => text.length * 10;

  it('deja igual un nombre que entra', () => {
    expect(fitLabel('Redes', 100, measure)).toBe('Redes');
  });

  it('recorta con "…" hasta que entra', () => {
    expect(fitLabel('X'.repeat(40), 120, measure)).toBe(`${'X'.repeat(11)}…`);
  });

  it('con muy poco lugar deja solo "…"', () => {
    expect(fitLabel('Monitor', 5, measure)).toBe('…');
  });
});

describe('eje de nombres de las barras', () => {
  it('recorta el nombre completo según el ancho del gráfico', () => {
    const config = barChartConfig([{ label: 'x', title: 'Y'.repeat(40), value: 1 }], options);
    const scale = {
      ctx: {
        font: '',
        save() {},
        restore() {},
        measureText: (text: string) => ({ width: text.length * 10 }),
      },
      chart: { width: 300 },
    };

    expect(config.options?.scales?.y?.ticks?.callback?.call(scale as never, 0, 0, [])).toBe(
      `${'Y'.repeat(11)}…`,
    );
  });
});

describe('marcas del eje de valores de las barras', () => {
  // Centrada, la última marca quedaba cortada contra el borde derecho en 320 px.
  it('alinea la primera y la última marca dentro del gráfico', () => {
    expect(barChartConfig(points, options).options?.scales?.x?.ticks).toMatchObject({
      align: 'inner',
    });
  });
});

// Con autoSkip, Chart.js elegía las fechas por su cuenta y a veces omitía la de hoy, la última.
describe('tickIndices', () => {
  it.each([
    [5, 6, [0, 1, 2, 3, 4]],
    [30, 6, [0, 6, 12, 17, 23, 29]],
    [30, 2, [0, 29]],
    [1, 6, [0]],
    [0, 6, []],
  ])('con %i puntos y hasta %i marcas da %j', (count, maxTicks, expected) => {
    expect([...tickIndices(count, maxTicks)].sort((a, b) => a - b)).toEqual(expected);
  });
});

describe('eje de fechas de la línea', () => {
  const thirty = Array.from({ length: 30 }, (_, index) => ({
    label: `d${index}`,
    title: `día ${index}`,
    value: index,
  }));
  const x = lineChartConfig(thirty, options).options?.scales?.x;

  it('no saltea marcas por su cuenta y alinea las de los extremos hacia adentro', () => {
    expect(x?.ticks).toMatchObject({ autoSkip: false, align: 'inner' });
  });

  it('muestra la primera, la última y las repartidas según el ancho', () => {
    expect(MIN_TICK_SPACING).toBe(64);
    const scale = { chart: { width: 300 } };
    const labels = thirty.map((_, index) =>
      x?.ticks?.callback?.call(scale as never, index, index, []),
    );

    const shown = labels.flatMap((label, index) => (label === null ? [] : [[index, label]]));
    expect(shown).toEqual([
      [0, 'd0'],
      [10, 'd10'],
      [19, 'd19'],
      [29, 'd29'],
    ]);
  });

  // Con 6 marcas, enero (el índice 1) nunca se veía en "12 meses", y con él tampoco el año.
  it('puede mostrar más marcas, por ejemplo una por mes', () => {
    const twelve = thirty.slice(0, 12);
    const monthly = lineChartConfig(twelve, { ...options, maxDateTicks: 12 }).options?.scales?.x;
    const shown = twelve.filter(
      (_, index) =>
        monthly?.ticks?.callback?.call({ chart: { width: 900 } } as never, index, index, []) !==
        null,
    );

    expect(shown).toHaveLength(12);
  });

  it('en un gráfico muy angosto muestra igual la primera y la última fecha', () => {
    const scale = { chart: { width: 100 } };
    const shown = thirty.flatMap((_, index) =>
      x?.ticks?.callback?.call(scale as never, index, index, []) === null ? [] : [index],
    );

    expect(shown).toEqual([0, 29]);
  });

  it('en un gráfico ancho muestra hasta 6 fechas', () => {
    const scale = { chart: { width: 1200 } };
    const shown = thirty.filter(
      (_, index) => x?.ticks?.callback?.call(scale as never, index, index, []) !== null,
    );
    expect(shown).toHaveLength(6);
  });
});
