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
