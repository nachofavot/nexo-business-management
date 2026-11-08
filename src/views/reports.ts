import type { View } from '../app/view';
import {
  buildReport,
  hasCompletedSales,
  periodRange,
  type Report,
  type ReportPeriod,
} from '../domain/reports';
import { isOneOf } from '../domain/validation/rules';
import { barChartConfig, lineChartConfig, type ChartOptions } from '../ui/charts/config';
import { chartFigure } from '../ui/charts/figure';
import { createAll, type Destroyable } from '../ui/charts/lifecycle';
import { mountChartById, prefersReducedMotion, readChartTheme } from '../ui/charts/mount';
import { emptyState } from '../ui/components/empty-state';
import { metric } from '../ui/components/metric';
import { segmented } from '../ui/components/segmented';
import { requireElement } from '../ui/dom';
import { formatMoney, formatMoneyShort, formatNumber } from '../ui/format';
import { html, setHtml, type SafeHtml } from '../ui/html';
import {
  categoryPoints,
  leaderSummary,
  pointRows,
  productPoints,
  revenuePoints,
  revenueSummary,
} from './chart-summaries';

const PERIOD_VALUES = ['7d', '30d', '90d', '12m'] as const satisfies readonly ReportPeriod[];
const PERIOD_LABELS: Readonly<Record<ReportPeriod, string>> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  '12m': '12 meses',
};
// El nombre de cada punto de la serie de ingresos, según cómo se agrupa el período.
const REVENUE_POINT_NAMES: Readonly<Record<ReportPeriod, string>> = {
  '7d': 'Día',
  '30d': 'Día',
  '90d': 'Semana',
  '12m': 'Mes',
};
const DEFAULT_PERIOD: ReportPeriod = '30d';

function formatUnits(units: number): string {
  return `${formatNumber(units)} ${units === 1 ? 'unidad' : 'unidades'}`;
}

function customersTable(
  customers: Report['topCustomers'],
  money: (cents: number) => string,
): SafeHtml {
  return html`<table class="nx-table nx-table--no-sort">
    <caption class="visually-hidden">
      Los clientes con más ingresos del período
    </caption>
    <thead>
      <tr>
        <th scope="col">Cliente</th>
        <th class="nx-table__number" scope="col">Ingresos</th>
      </tr>
    </thead>
    <tbody>
      ${customers.map(
        (customer) =>
          html`<tr>
            <td data-label="Cliente">${customer.customerName}</td>
            <td class="nx-table__number nx-table__nowrap" data-label="Ingresos">
              ${money(customer.revenueCents)}
            </td>
          </tr>`,
      )}
    </tbody>
  </table>`;
}

export const reportsView: View = ({ root, signal, database, now }) => {
  const { currency } = database.read().settings.preferences;
  const money = (cents: number) => formatMoney(cents, currency);
  const moneyOptions: ChartOptions = {
    theme: readChartTheme(),
    reducedMotion: prefersReducedMotion(),
    formatValue: money,
    formatTick: (cents) => formatMoneyShort(cents, currency),
  };
  const unitOptions: ChartOptions = {
    ...moneyOptions,
    formatValue: formatUnits,
    formatTick: formatNumber,
    integerTicks: true,
  };

  let period: ReportPeriod = DEFAULT_PERIOD;
  let charts: Destroyable[] = [];

  setHtml(
    root,
    html`<div class="nx-reports">
      ${segmented({
        name: 'report-period',
        legend: 'Período',
        idPrefix: 'report-period',
        options: PERIOD_VALUES.map((value) => ({ value, label: PERIOD_LABELS[value] })),
        value: period,
      })}
      <div id="report-content"></div>
    </div>`,
  );

  const content = requireElement('report-content', HTMLElement);

  function destroyCharts(): void {
    for (const chart of charts) chart.destroy();
    charts = [];
  }

  /** Vuelve a dibujar todo salvo el selector, para que el foco siga en la opción elegida. */
  function render(): void {
    destroyCharts();

    const { sales } = database.read();
    const today = now();
    const report = buildReport(sales, period, today);
    // El mismo criterio que el Dashboard: una venta de $ 0 también es una venta.
    const hasSales = hasCompletedSales(sales, periodRange(period, today));
    const { summary } = report;
    const revenue = revenuePoints(report.revenue, period);
    const categories = categoryPoints(report.categories);
    const products = productPoints(report.topProducts);
    const empty = hasSales
      ? undefined
      : { title: 'Sin ventas en este período', description: 'Probá con un período más largo.' };

    setHtml(
      content,
      html`<section class="nx-reports__strip" aria-label="Resumen del período">
          ${metric({ label: 'Ingresos', value: money(summary.revenueCents) })}
          ${metric({ label: 'Ventas', value: formatNumber(summary.salesCount) })}
          ${metric({ label: 'Ticket promedio', value: money(summary.averageTicketCents) })}
          ${metric({ label: 'Unidades vendidas', value: formatNumber(summary.unitsSold) })}
        </section>

        <div class="nx-reports__revenue">
          ${chartFigure({
            id: 'report-revenue',
            title: 'Ingresos',
            summary: revenueSummary(revenue, currency),
            table: {
              headers: [REVENUE_POINT_NAMES[period], 'Ingresos'],
              rows: pointRows(revenue, money),
            },
            empty,
          })}
        </div>

        <div class="row nx-reports__charts">
          <div class="col-lg-6">
            ${chartFigure({
              id: 'report-categories',
              title: 'Ventas brutas por categoría',
              summary: leaderSummary(categories, money),
              table: {
                headers: ['Categoría', 'Ventas brutas'],
                rows: pointRows(categories, money),
              },
              empty,
            })}
          </div>
          <div class="col-lg-6">
            ${chartFigure({
              id: 'report-products',
              title: 'Productos más vendidos',
              summary: leaderSummary(products, formatUnits),
              table: { headers: ['Producto', 'Unidades'], rows: pointRows(products, formatUnits) },
              empty,
            })}
          </div>
        </div>

        <section class="nx-reports__customers" aria-labelledby="report-customers-title">
          <h2 id="report-customers-title">Mejores clientes</h2>
          ${
            hasSales
              ? customersTable(report.topCustomers, money)
              : emptyState('Sin ventas en este período', 'Probá con un período más largo.')
          }
        </section>`,
    );

    if (!hasSales) return;
    charts = createAll([
      () =>
        mountChartById(
          'report-revenue-canvas',
          // En 12 meses, una etiqueta por mes si hay lugar: así se ve enero, con el año.
          lineChartConfig(revenue, { ...moneyOptions, maxDateTicks: period === '12m' ? 12 : 6 }),
        ),
      () => mountChartById('report-categories-canvas', barChartConfig(categories, moneyOptions)),
      () => mountChartById('report-products-canvas', barChartConfig(products, unitOptions)),
    ]);
  }

  root.addEventListener(
    'change',
    (event) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.name !== 'report-period') {
        return;
      }
      const { value } = event.target;
      if (!isOneOf(value, PERIOD_VALUES)) return;
      period = value;
      render();
    },
    { signal },
  );

  render();
  return destroyCharts;
};
