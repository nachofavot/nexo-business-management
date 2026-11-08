import { parseDateInput } from '../domain/dates';
import type { ReportPeriod } from '../domain/reports';
import type { Currency, PaymentMethod } from '../domain/types';

const LOCALE = 'es-AR';

/** Separa un texto en lo que una persona ve como caracteres: un emoji compuesto es uno solo. */
const graphemes = new Intl.Segmenter(LOCALE, { granularity: 'grapheme' });

const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

export function formatPaymentMethod(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method];
}

/** El descuento se resta, pero 0 va sin signo: formatMoney(-0) mostraría "-$ 0,00". */
export function formatDiscount(cents: number, currency: Currency): string {
  return cents > 0 ? formatMoney(-cents, currency) : formatMoney(0, currency);
}

/** 21 → "21 %" y 10.5 → "10,5 %": el IVA admite hasta dos decimales. */
export function formatPercent(value: number): string {
  const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(value);
  return `${number} %`;
}

export function formatMoney(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(cents / 100);
}

export function formatPercentChange(change: number | null): string {
  if (change === null) return 'Sin datos previos';

  const number = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(change);
  return `${number} %`;
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(isoDate));
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(date);
}

function currencySymbol(currency: Currency): string {
  const parts = new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/**
 * Importe corto para un eje: "$ 950", "$ 12,5 mil" o "$ 5 M". No usa notation: 'compact', porque
 * en es-AR mezcla "k" y "K" y usa "B", que en español se confunde con billón.
 */
export function formatMoneyShort(cents: number, currency: Currency): string {
  const units = cents / 100;
  const size = Math.abs(units);
  const number = (value: number) =>
    new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value);

  if (size >= 1_000_000) return `${currencySymbol(currency)} ${number(units / 1_000_000)} M`;
  if (size >= 1_000) return `${currencySymbol(currency)} ${number(units / 1_000)} mil`;
  return `${currencySymbol(currency)} ${number(units)}`;
}

/** Entero con separador de miles: 9999 → "9.999". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}

/** Los días que cubre un punto de la serie de ingresos: claves "AAAA-MM-DD" o "AAAA-MM". */
export interface SeriesPoint {
  key: string;
  from: string;
  to: string;
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** "Del 7 al 9 de agosto", o "Del 28 de septiembre al 1 de octubre" si cruza de mes. */
function daysRange(from: Date, to: Date): string {
  const toText = formatDate(to, { day: 'numeric', month: 'long' });
  const fromText =
    from.getMonth() === to.getMonth()
      ? String(from.getDate())
      : formatDate(from, { day: 'numeric', month: 'long' });
  return `Del ${fromText} al ${toText}`;
}

/**
 * Etiqueta de un punto de la serie de ingresos: corta para el eje y larga para el tooltip y la
 * tabla. Una semana o un mes incompletos dicen qué días cubren, para que una caída no parezca real.
 */
export function formatSeriesLabel(
  point: SeriesPoint,
  period: ReportPeriod,
): { short: string; long: string } {
  const { key } = point;

  if (period === '12m') {
    const month = parseDateInput(`${key}-01`);
    const to = parseDateInput(point.to);
    if (!month || !to) return { short: key, long: key };

    const long = formatDate(month, { month: 'long', year: 'numeric' });
    const isComplete = to.getDate() === lastDayOfMonth(month);
    return {
      // El período cruza de año: enero lleva el año para que no quede ambiguo en el eje.
      short:
        month.getMonth() === 0
          ? `${formatDate(month, { month: 'short' })} ${month.getFullYear()}`
          : formatDate(month, { month: 'short' }),
      long: isComplete ? long : `${long} (hasta el ${to.getDate()})`,
    };
  }

  if (period === '90d') {
    const from = parseDateInput(point.from);
    const to = parseDateInput(point.to);
    if (!from || !to) return { short: key, long: key };

    const fromLong = formatDate(from, { day: 'numeric', month: 'long' });
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    let long = daysRange(from, to);
    if (days === 7) long = `Semana del ${fromLong}`;
    else if (days === 1) long = fromLong;
    return { short: formatDate(from, { day: 'numeric', month: 'short' }), long };
  }

  const date = parseDateInput(key);
  if (!date) return { short: key, long: key };
  return {
    short: formatDate(date, { day: 'numeric', month: 'short' }),
    long: formatDate(date, { day: 'numeric', month: 'long' }),
  };
}

/** Recorta un nombre para el eje de un gráfico; el tooltip y la tabla lo muestran completo. */
export function truncateLabel(text: string, maxLength: number): string {
  // Cuenta grafemas y no unidades de UTF-16: un emoji compuesto no queda partido en símbolos rotos.
  const characters = Array.from(graphemes.segment(text), ({ segment }) => segment);
  return characters.length <= maxLength ? text : `${characters.slice(0, maxLength - 1).join('')}…`;
}

function firstGrapheme(word: string): string {
  for (const { segment } of graphemes.segment(word)) return segment;
  return '';
}

/**
 * Iniciales de las dos primeras palabras, para el avatar. Toma grafemas y no caracteres sueltos:
 * así un emoji o una letra con tilde compuesta no quedan partidos en símbolos rotos.
 */
export function formatInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => firstGrapheme(word).toLocaleUpperCase('es'))
    .join('');
}

/** "1 unidad", "9.999 unidades". */
export function formatUnits(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'unidad' : 'unidades'}`;
}

/** Texto del umbral de stock bajo. Con 0, solo cuentan los productos sin stock. */
export function lowStockLabel(threshold: number): string {
  return threshold === 0 ? 'Sin stock' : `${formatUnits(threshold)} o menos`;
}
