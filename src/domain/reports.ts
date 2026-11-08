import { endOfDay } from './dates';
import type { ProductCategory, Sale } from './types';

export type ReportPeriod = '7d' | '30d' | '90d' | '12m';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SalesSummary {
  revenueCents: number;
  salesCount: number;
  averageTicketCents: number;
  unitsSold: number;
}

export interface MonthlyComparison {
  current: SalesSummary;
  previous: SalesSummary;
  revenueChange: number | null;
  salesCountChange: number | null;
  averageTicketChange: number | null;
}

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const;
const MONTHS_IN_YEAR_PERIOD = 12;

// Las fechas se construyen por calendario, con new Date(año, mes, día): así funcionan los días
// de 23 o 25 horas del horario de verano y los meses de distinta duración, sin sumar milisegundos.
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function mondayOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addDays(date, -daysSinceMonday);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date: Date): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

function completedSales(sales: readonly Sale[]): readonly Sale[] {
  return sales.filter((sale) => sale.status === 'completed');
}

export function periodRange(period: ReportPeriod, now: Date): DateRange {
  const end = endOfDay(now);
  if (period === '12m') {
    const firstMonth = now.getMonth() - (MONTHS_IN_YEAR_PERIOD - 1);
    return { start: new Date(now.getFullYear(), firstMonth, 1), end };
  }
  return { start: addDays(now, -(PERIOD_DAYS[period] - 1)), end };
}

export function currentMonthRange(now: Date): DateRange {
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
}

function previousMonthComparableRange(now: Date): DateRange {
  const year = now.getFullYear();
  const previousMonth = now.getMonth() - 1;
  const lastDayOfPreviousMonth = new Date(year, now.getMonth(), 0).getDate();
  const comparableDay = Math.min(now.getDate(), lastDayOfPreviousMonth);

  return {
    start: new Date(year, previousMonth, 1),
    end: endOfDay(new Date(year, previousMonth, comparableDay)),
  };
}

export function salesInRange(sales: readonly Sale[], range: DateRange): readonly Sale[] {
  const start = range.start.getTime();
  const end = range.end.getTime();

  return sales.filter((sale) => {
    const time = new Date(sale.createdAt).getTime();
    return time >= start && time <= end;
  });
}

export function summarizeSales(sales: readonly Sale[]): SalesSummary {
  const completed = completedSales(sales);
  const revenueCents = completed.reduce((sum, sale) => sum + sale.totalCents, 0);
  const unitsSold = completed.reduce(
    (sum, sale) => sum + sale.items.reduce((units, item) => units + item.quantity, 0),
    0,
  );

  return {
    revenueCents,
    salesCount: completed.length,
    averageTicketCents: completed.length > 0 ? Math.round(revenueCents / completed.length) : 0,
    unitsSold,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function compareWithPreviousMonth(sales: readonly Sale[], now: Date): MonthlyComparison {
  const current = summarizeSales(salesInRange(sales, currentMonthRange(now)));
  const previous = summarizeSales(salesInRange(sales, previousMonthComparableRange(now)));

  return {
    current,
    previous,
    revenueChange: percentChange(current.revenueCents, previous.revenueCents),
    salesCountChange: percentChange(current.salesCount, previous.salesCount),
    averageTicketChange: percentChange(current.averageTicketCents, previous.averageTicketCents),
  };
}

function seriesKeys(period: ReportPeriod, range: DateRange): readonly string[] {
  const { start, end } = range;

  if (period === '12m') {
    return Array.from({ length: MONTHS_IN_YEAR_PERIOD }, (_, index) =>
      monthKey(new Date(start.getFullYear(), start.getMonth() + index, 1)),
    );
  }
  if (period === '90d') {
    const keys: string[] = [];
    for (let monday = mondayOfWeek(start); monday <= end; monday = addDays(monday, 7)) {
      keys.push(dayKey(monday));
    }
    return keys;
  }
  return Array.from({ length: PERIOD_DAYS[period] }, (_, index) => dayKey(addDays(start, index)));
}

function seriesKeyOf(period: ReportPeriod, date: Date): string {
  if (period === '12m') return monthKey(date);
  if (period === '90d') return dayKey(mondayOfWeek(date));
  return dayKey(date);
}

/** Incluye todos los períodos, también los que no tienen ventas, para que el gráfico no salte. */
export function revenueSeries(
  sales: readonly Sale[],
  period: ReportPeriod,
  now: Date,
): readonly { key: string; revenueCents: number }[] {
  const range = periodRange(period, now);
  const revenueByKey = new Map(seriesKeys(period, range).map((key) => [key, 0]));

  for (const sale of completedSales(salesInRange(sales, range))) {
    const key = seriesKeyOf(period, new Date(sale.createdAt));
    revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + sale.totalCents);
  }
  return [...revenueByKey].map(([key, revenueCents]) => ({ key, revenueCents }));
}

export function grossByCategory(
  sales: readonly Sale[],
): readonly { category: ProductCategory; grossCents: number }[] {
  const grossByName = new Map<ProductCategory, number>();

  for (const sale of completedSales(sales)) {
    for (const item of sale.items) {
      const gross = item.unitPriceCents * item.quantity;
      grossByName.set(item.category, (grossByName.get(item.category) ?? 0) + gross);
    }
  }
  return [...grossByName]
    .map(([category, grossCents]) => ({ category, grossCents }))
    .sort((a, b) => b.grossCents - a.grossCents);
}

interface Ranked {
  name: string;
  value: number;
  latestAt: string;
}

/** Suma por identificador y conserva el nombre de la venta más reciente. */
function addToRanking(
  ranking: Map<string, Ranked>,
  id: string,
  name: string,
  value: number,
  createdAt: string,
): void {
  const existing = ranking.get(id);
  if (!existing) {
    ranking.set(id, { name, value, latestAt: createdAt });
    return;
  }
  existing.value += value;
  if (createdAt > existing.latestAt) {
    existing.name = name;
    existing.latestAt = createdAt;
  }
}

function topRanked(ranking: Map<string, Ranked>, limit: number): readonly [string, Ranked][] {
  return [...ranking]
    .sort(
      ([, a], [, b]) =>
        b.value - a.value || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
    )
    .slice(0, limit);
}

export function topProducts(
  sales: readonly Sale[],
  limit: number,
): readonly { productId: string; productName: string; units: number }[] {
  const ranking = new Map<string, Ranked>();

  for (const sale of completedSales(sales)) {
    for (const item of sale.items) {
      addToRanking(ranking, item.productId, item.productName, item.quantity, sale.createdAt);
    }
  }
  return topRanked(ranking, limit).map(([productId, { name, value }]) => ({
    productId,
    productName: name,
    units: value,
  }));
}

export function topCustomers(
  sales: readonly Sale[],
  limit: number,
): readonly { customerId: string; customerName: string; revenueCents: number }[] {
  const ranking = new Map<string, Ranked>();

  for (const sale of completedSales(sales)) {
    addToRanking(ranking, sale.customerId, sale.customerName, sale.totalCents, sale.createdAt);
  }
  return topRanked(ranking, limit).map(([customerId, { name, value }]) => ({
    customerId,
    customerName: name,
    revenueCents: value,
  }));
}

/** El diseño pide los 5 productos con más unidades y los 5 clientes con más ingresos. */
const REPORT_TOP = 5;

export interface Report {
  summary: SalesSummary;
  revenue: readonly { key: string; revenueCents: number }[];
  categories: readonly { category: ProductCategory; grossCents: number }[];
  topProducts: readonly { productId: string; productName: string; units: number }[];
  topCustomers: readonly { customerId: string; customerName: string; revenueCents: number }[];
}

/** Todo con las ventas del período: los rankings no mezclan ventas de otras fechas. */
export function buildReport(sales: readonly Sale[], period: ReportPeriod, now: Date): Report {
  const inPeriod = salesInRange(sales, periodRange(period, now));

  return {
    summary: summarizeSales(inPeriod),
    revenue: revenueSeries(sales, period, now),
    categories: grossByCategory(inPeriod),
    topProducts: topProducts(inPeriod, REPORT_TOP),
    topCustomers: topCustomers(inPeriod, REPORT_TOP),
  };
}
