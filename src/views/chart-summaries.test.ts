import { describe, expect, it } from 'vitest';
import type { ChartPoint } from '../ui/charts/config';
import { formatMoney } from '../ui/format';
import {
  categoryPoints,
  leaderSummary,
  pointRows,
  productPoints,
  revenuePoints,
  revenueSummary,
} from './chart-summaries';

// Intl separa símbolo y número con un espacio duro, que no se distingue a simple vista.
const withPlainSpaces = (text: string) => text.replace(/\s/g, ' ');
const point = (title: string, value: number): ChartPoint => ({ label: title, title, value });

describe('revenueSummary', () => {
  it('da el total y el punto con más ingresos', () => {
    const points = [
      point('4 de noviembre', 10_000),
      point('5 de noviembre', 20_000),
      point('6 de noviembre', 15_000),
    ];

    expect(withPlainSpaces(revenueSummary(points, 'ARS'))).toBe(
      'Total: $ 450,00. Mayor ingreso: 5 de noviembre, con $ 200,00.',
    );
  });

  it.each([['Semana del 2 de noviembre'], ['noviembre de 2026']])(
    'usa el título largo del punto: %s',
    (title) => {
      expect(revenueSummary([point(title, 500)], 'ARS')).toContain(`Mayor ingreso: ${title}, con`);
    },
  );

  it('con dos máximos iguales elige el más reciente', () => {
    const points = [point('primero', 5_000), point('segundo', 5_000)];

    expect(revenueSummary(points, 'ARS')).toContain('Mayor ingreso: segundo');
  });

  it('sin ingresos da solo el total', () => {
    expect(withPlainSpaces(revenueSummary([point('a', 0), point('b', 0)], 'ARS'))).toBe(
      'Total: $ 0,00.',
    );
  });
});

describe('leaderSummary', () => {
  it('nombra al primero con su valor', () => {
    const points = [point('Computación', 123_456), point('Redes', 1_000)];

    expect(withPlainSpaces(leaderSummary(points, (value) => formatMoney(value, 'ARS')))).toBe(
      'Computación encabeza con $ 1.234,56.',
    );
  });

  it('sin datos devuelve una cadena vacía', () => {
    expect(leaderSummary([], String)).toBe('');
  });
});

describe('revenuePoints', () => {
  it('arma cada punto con la etiqueta corta, la larga y el importe', () => {
    expect(revenuePoints([{ key: '2026-11-05', revenueCents: 100 }], '30d')).toEqual([
      { label: '5 nov', title: '5 de noviembre', value: 100 },
    ]);
  });

  it('usa la etiqueta del período', () => {
    expect(revenuePoints([{ key: '2026-11', revenueCents: 1 }], '12m')[0]?.title).toBe(
      'noviembre de 2026',
    );
  });
});

describe('categoryPoints', () => {
  it('usa el nombre de la categoría en el eje y en el tooltip', () => {
    expect(categoryPoints([{ category: 'Redes', grossCents: 500 }])).toEqual([
      { label: 'Redes', title: 'Redes', value: 500 },
    ]);
  });
});

describe('pointRows', () => {
  it('arma las filas de la tabla con el título completo y el valor formateado', () => {
    expect(
      pointRows([{ label: 'corto', title: 'completo', value: 7 }], (value) => `v${value}`),
    ).toEqual([['completo', 'v7']]);
  });
});

describe('productPoints', () => {
  it('recorta el nombre del eje y conserva el completo para el tooltip', () => {
    const name = 'X'.repeat(80);

    expect(productPoints([{ productId: 'p1', productName: name, units: 7 }])).toEqual([
      { label: `${'X'.repeat(23)}…`, title: name, value: 7 },
    ]);
  });
});
