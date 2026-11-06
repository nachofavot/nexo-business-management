import type { Currency } from '../domain/types';

const LOCALE = 'es-AR';

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
