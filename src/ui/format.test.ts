import { describe, expect, it } from 'vitest';
import type { Currency } from '../domain/types';
import {
  formatDateTime,
  formatDiscount,
  formatInitials,
  formatMoney,
  formatMoneyShort,
  formatMonth,
  formatNumber,
  formatPaymentMethod,
  formatPercent,
  formatPercentChange,
  formatSeriesLabel,
  truncateLabel,
} from './format';

// Intl separa símbolo y número con un espacio duro, que no se distingue a simple vista.
const withPlainSpaces = (text: string) => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it.each<[number, Currency, string]>([
    [123456, 'ARS', '$ 1.234,56'],
    [0, 'ARS', '$ 0,00'],
    [9999999999, 'ARS', '$ 99.999.999,99'],
    [123456, 'USD', 'US$ 1.234,56'],
    [123456, 'EUR', 'EUR 1.234,56'],
  ])('%i centavos en %s se muestran como %s', (cents, currency, expected) => {
    expect(withPlainSpaces(formatMoney(cents, currency))).toBe(expected);
  });
});

describe('formatPercentChange', () => {
  it.each<[number | null, string]>([
    [50, '+50 %'],
    [-12.34, '-12,3 %'],
    [0, '0 %'],
    [962.56, '+962,6 %'],
    [null, 'Sin datos previos'],
  ])('%s se muestra como %s', (change, expected) => {
    expect(withPlainSpaces(formatPercentChange(change))).toBe(expected);
  });
});

describe('formatDateTime', () => {
  it.each([
    ['2026-11-06T02:30:00.000Z', '05/11/2026, 23:30'],
    // Día, mes y hora de un dígito llevan cero, y la medianoche se muestra como 00.
    ['2026-03-02T03:05:00.000Z', '02/03/2026, 00:05'],
    ['2026-03-02T12:05:00.000Z', '02/03/2026, 09:05'],
  ])('muestra %s en hora local como %s', (isoDate, expected) => {
    expect(withPlainSpaces(formatDateTime(isoDate))).toBe(expected);
  });
});

describe('formatMonth', () => {
  it('muestra el nombre del mes en español', () => {
    expect(formatMonth(new Date(2026, 10, 5))).toBe('noviembre');
  });
});

describe('formatPaymentMethod', () => {
  it.each([
    ['cash', 'Efectivo'],
    ['card', 'Tarjeta'],
    ['transfer', 'Transferencia'],
  ] as const)('muestra %s como %s', (method, expected) => {
    expect(formatPaymentMethod(method)).toBe(expected);
  });
});

describe('formatDiscount', () => {
  it('muestra el descuento en negativo', () => {
    expect(withPlainSpaces(formatDiscount(45000, 'ARS'))).toBe('-$ 450,00');
  });

  it('muestra un descuento de 0 sin signo menos', () => {
    expect(withPlainSpaces(formatDiscount(0, 'ARS'))).toBe('$ 0,00');
  });
});

describe('formatPercent', () => {
  it.each([
    [21, '21 %'],
    [10.5, '10,5 %'],
    [0, '0 %'],
    [100, '100 %'],
  ])('muestra %d como %s', (value, expected) => {
    expect(withPlainSpaces(formatPercent(value))).toBe(expected);
  });
});

describe('formatMoneyShort', () => {
  it.each<[number, Currency, string]>([
    [0, 'ARS', '$ 0'],
    [95_000, 'ARS', '$ 950'],
    [1_250_000, 'ARS', '$ 12,5 mil'],
    [500_000_000, 'ARS', '$ 5 M'],
    [18_100_000_000, 'ARS', '$ 181 M'],
    [500_000_000, 'USD', 'US$ 5 M'],
  ])('%i centavos en %s se muestran como %s', (cents, currency, expected) => {
    expect(withPlainSpaces(formatMoneyShort(cents, currency))).toBe(expected);
  });
});

describe('formatNumber', () => {
  it.each([
    [9999, '9.999'],
    [5, '5'],
  ])('muestra %i como %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});

describe('formatSeriesLabel', () => {
  it('muestra un día con su fecha corta y larga', () => {
    expect(
      formatSeriesLabel({ key: '2026-11-05', from: '2026-11-05', to: '2026-11-05' }, '30d'),
    ).toEqual({
      short: '5 nov',
      long: '5 de noviembre',
    });
  });

  it('nombra la semana que empieza ese lunes', () => {
    expect(
      formatSeriesLabel({ key: '2026-11-02', from: '2026-11-02', to: '2026-11-08' }, '90d'),
    ).toEqual({
      short: '2 nov',
      long: 'Semana del 2 de noviembre',
    });
  });

  it('muestra un mes con su año', () => {
    expect(
      formatSeriesLabel({ key: '2026-11', from: '2026-11-01', to: '2026-11-30' }, '12m'),
    ).toEqual({
      short: 'nov',
      long: 'noviembre de 2026',
    });
  });
});

describe('truncateLabel', () => {
  it('deja igual un nombre corto', () => {
    expect(truncateLabel('Monitor', 24)).toBe('Monitor');
  });

  it('recorta un nombre largo al máximo, con "…" al final', () => {
    expect(truncateLabel('X'.repeat(80), 24)).toBe(`${'X'.repeat(23)}…`);
  });

  it('deja igual un nombre justo en el máximo', () => {
    expect(truncateLabel('Y'.repeat(24), 24)).toBe('Y'.repeat(24));
  });
});

describe('formatSeriesLabel con una clave inválida', () => {
  it('la muestra tal cual', () => {
    expect(
      formatSeriesLabel({ key: 'sin-fecha', from: 'sin-fecha', to: 'sin-fecha' }, '7d'),
    ).toEqual({ short: 'sin-fecha', long: 'sin-fecha' });
  });
});

// Un punto que cubre solo parte de su semana o de su mes no se nombra como si estuviera completo:
// con "Semana del 3 de agosto", una caída de ingresos parecería real.
describe('formatSeriesLabel con períodos parciales', () => {
  it('nombra los días de una semana incompleta', () => {
    expect(
      formatSeriesLabel({ key: '2026-08-03', from: '2026-08-07', to: '2026-08-09' }, '90d'),
    ).toEqual({
      short: '7 ago',
      long: 'Del 7 al 9 de agosto',
    });
  });

  it('nombra los dos meses si la semana incompleta los cruza', () => {
    expect(
      formatSeriesLabel({ key: '2026-09-28', from: '2026-09-28', to: '2026-10-01' }, '90d').long,
    ).toBe('Del 28 de septiembre al 1 de octubre');
  });

  it('una semana de un solo día se nombra como ese día', () => {
    expect(
      formatSeriesLabel({ key: '2026-08-03', from: '2026-08-09', to: '2026-08-09' }, '90d').long,
    ).toBe('9 de agosto');
  });

  it('dice hasta qué día llega el mes en curso', () => {
    expect(
      formatSeriesLabel({ key: '2026-11', from: '2026-11-01', to: '2026-11-04' }, '12m'),
    ).toEqual({
      short: 'nov',
      long: 'noviembre de 2026 (hasta el 4)',
    });
  });
});

describe('formatInitials', () => {
  it.each([
    ['Usuario Demo', 'UD'],
    ['ana', 'A'],
    ['  ana   gómez  ', 'AG'],
    ['😀 Ana', '😀A'],
    ['ñandú élite', 'ÑÉ'],
    ['👩‍💻 Programadora', '👩‍💻P'],
    ['Ana María Gómez', 'AM'],
    ['', ''],
  ])('"%s" da "%s"', (name, expected) => {
    expect(formatInitials(name)).toBe(expected);
  });
});

describe('formatSeriesLabel en 12 meses', () => {
  // El período cruza de año: sin el año, "ene" quedaba ambiguo en el eje.
  it('enero lleva el año en la etiqueta corta', () => {
    expect(
      formatSeriesLabel({ key: '2026-01', from: '2026-01-01', to: '2026-01-31' }, '12m').short,
    ).toBe('ene 2026');
    expect(
      formatSeriesLabel({ key: '2026-11', from: '2026-11-01', to: '2026-11-30' }, '12m').short,
    ).toBe('nov');
  });
});

describe('truncateLabel con emojis', () => {
  it('cuenta grafemas: no parte un emoji compuesto', () => {
    expect(truncateLabel('👩‍💻'.repeat(30), 5)).toBe(`${'👩‍💻'.repeat(4)}…`);
  });

  it('no recorta un nombre corto con emojis', () => {
    expect(truncateLabel('👩‍💻 Ana', 5)).toBe('👩‍💻 Ana');
  });
});
