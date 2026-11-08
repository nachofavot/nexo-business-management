import { formatSaleNumber } from '../domain/sales';
import type { Currency, Sale, SaleItem } from '../domain/types';
import {
  formatDateTime,
  formatDiscount,
  formatMoney,
  formatPaymentMethod,
  formatPercent,
} from '../ui/format';
import { html, type SafeHtml } from '../ui/html';

function itemRow(item: SaleItem, currency: Currency): SafeHtml {
  return html`<tr>
    <td data-label="Producto">
      <span class="nx-sale-detail__product">
        <span>${item.productName}</span>
        <span class="nx-sale-detail__sku">${item.sku}</span>
      </span>
    </td>
    <td class="nx-table__number" data-label="Cantidad">${item.quantity}</td>
    <td class="nx-table__number nx-table__nowrap" data-label="Precio unitario">
      ${formatMoney(item.unitPriceCents, currency)}
    </td>
    <td class="nx-table__number nx-table__nowrap" data-label="Subtotal">
      ${formatMoney(item.unitPriceCents * item.quantity, currency)}
    </td>
  </tr>`;
}

/** Lista de importes con el total al final. */
function saleTotals(sale: Sale, currency: Currency): SafeHtml {
  return html`<dl class="nx-totals">
    <div class="nx-totals__row">
      <dt>Subtotal</dt>
      <dd>${formatMoney(sale.subtotalCents, currency)}</dd>
    </div>
    <div class="nx-totals__row">
      <dt>Descuento (${formatPercent(sale.discountPercent)})</dt>
      <dd>${formatDiscount(sale.discountCents, currency)}</dd>
    </div>
    <div class="nx-totals__row">
      <dt>IVA (${formatPercent(sale.taxPercent)})</dt>
      <dd>${formatMoney(sale.taxCents, currency)}</dd>
    </div>
    <div class="nx-totals__row nx-totals__row--total">
      <dt>Total</dt>
      <dd>${formatMoney(sale.totalCents, currency)}</dd>
    </div>
  </dl>`;
}

/**
 * Contenido completo del modal de detalle. Es una función pura para poder probarla sin navegador:
 * quien abre el modal está en sale-detail-modal.ts, porque Bootstrap necesita el DOM.
 */
export function saleDetailContent(
  sale: Sale,
  options: { currency: Currency; titleId: string },
): SafeHtml {
  const { currency, titleId } = options;
  const isCancelled = sale.status === 'cancelled';

  return html`<div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title" id="${titleId}">Venta ${formatSaleNumber(sale.number)}</h2>
        ${isCancelled ? html`<span class="nx-tag nx-sale-detail__status">Anulada</span>` : null}
        <button
          class="btn-close"
          type="button"
          data-bs-dismiss="modal"
          aria-label="Cerrar"
        ></button>
      </div>
      <div class="modal-body">
        ${
          isCancelled && sale.cancelledAt
            ? html`<p class="nx-sale-detail__notice">
                Anulada el ${formatDateTime(sale.cancelledAt)}
              </p>`
            : null
        }
        <dl class="nx-sale-detail__meta">
          <div>
            <dt>Fecha</dt>
            <dd>${formatDateTime(sale.createdAt)}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>${sale.customerName}</dd>
          </div>
          <div>
            <dt>Medio de pago</dt>
            <dd>${formatPaymentMethod(sale.paymentMethod)}</dd>
          </div>
        </dl>
        <table class="nx-table nx-table--no-sort nx-sale-detail__items">
          <caption class="visually-hidden">
            Productos de la venta
          </caption>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th class="nx-table__number" scope="col">Cantidad</th>
              <th class="nx-table__number" scope="col">Precio unitario</th>
              <th class="nx-table__number" scope="col">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item) => itemRow(item, currency))}
          </tbody>
        </table>
        ${saleTotals(sale, currency)}
      </div>
      <div class="modal-footer">
        <button class="nx-btn nx-btn--ghost" type="button" data-bs-dismiss="modal">Cerrar</button>
        ${
          isCancelled
            ? null
            : html`<button
                class="nx-btn nx-btn--danger"
                type="button"
                data-action="cancel-sale"
                aria-haspopup="dialog"
              >
                Anular venta
              </button>`
        }
      </div>
    </div>
  </div>`;
}
