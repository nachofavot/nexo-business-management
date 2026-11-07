import { formatSaleNumber } from '../domain/sales';
import type { Currency, Sale } from '../domain/types';
import type { Column } from '../ui/components/data-table';
import { formatDateTime, formatMoney, formatPaymentMethod } from '../ui/format';
import { html, type SafeHtml } from '../ui/html';

/**
 * Una venta anulada lleva la etiqueta y el total tachado, porque no cuenta en las métricas.
 * Las completadas no llevan etiqueta: serían casi todas las filas.
 */
function totalCell(sale: Sale, currency: Currency): SafeHtml | string {
  const total = formatMoney(sale.totalCents, currency);
  if (sale.status === 'completed') return total;

  return html`<span class="nx-table__tagged">
    <span class="nx-tag">Anulada</span><span class="nx-table__void">${total}</span>
  </span>`;
}

/**
 * El historial tiene un orden fijo, de la venta más nueva a la más vieja, así que ninguna columna
 * es ordenable. Solo se parte el nombre del cliente, el único dato sin un largo acotado.
 */
export function saleColumns(options: { currency: Currency }): readonly Column<Sale>[] {
  const { currency } = options;

  return [
    {
      key: 'number',
      label: 'Número',
      className: 'nx-table__nowrap nx-num',
      cell: (sale) => formatSaleNumber(sale.number),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      className: 'nx-table__nowrap nx-num',
      cell: (sale) =>
        html`<time datetime="${sale.createdAt}">${formatDateTime(sale.createdAt)}</time>`,
    },
    { key: 'customerName', label: 'Cliente', cell: (sale) => sale.customerName },
    {
      key: 'paymentMethod',
      label: 'Medio de pago',
      className: 'nx-table__nowrap',
      cell: (sale) => formatPaymentMethod(sale.paymentMethod),
    },
    {
      key: 'totalCents',
      label: 'Total',
      numeric: true,
      className: 'nx-table__nowrap',
      cell: (sale) => totalCell(sale, currency),
    },
    {
      key: 'actions',
      label: 'Acciones',
      className: 'nx-table__actions',
      // El nombre accesible empieza con el texto visible, como pide WCAG 2.5.3.
      cell: (sale) =>
        html`<button
          class="nx-btn nx-btn--ghost"
          type="button"
          data-detail="${sale.id}"
          aria-haspopup="dialog"
          aria-label="Ver detalle de la venta ${formatSaleNumber(sale.number)}"
        >
          Ver detalle
        </button>`,
    },
  ];
}
