import { parseDateInput } from '../domain/dates';
import type { ReportPeriod } from '../domain/reports';
import type { Currency, PaymentMethod } from '../domain/types';

const LOCALE = 'es-AR';

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

/**
 * Etiqueta de un punto de la serie de ingresos: corta para el eje y larga para el tooltip y la
 * tabla. Las claves son "AAAA-MM-DD" (días y semanas) o "AAAA-MM" (meses).
 */
export function formatSeriesLabel(
  key: string,
  period: ReportPeriod,
): { short: string; long: string } {
  const date = parseDateInput(period === '12m' ? `${key}-01` : key);
  if (!date) return { short: key, long: key };

  if (period === '12m') {
    return {
      short: formatDate(date, { month: 'short' }),
      long: formatDate(date, { month: 'long', year: 'numeric' }),
    };
  }

  const long = formatDate(date, { day: 'numeric', month: 'long' });
  return {
    short: formatDate(date, { day: 'numeric', month: 'short' }),
    long: period === '90d' ? `Semana del ${long}` : long,
  };
}

/** Recorta un nombre para el eje de un gráfico; el tooltip y la tabla lo muestran completo. */
export function truncateLabel(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
