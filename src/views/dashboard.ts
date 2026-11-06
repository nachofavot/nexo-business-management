import type { View } from '../app/view';
import { sortItems } from '../domain/list';
import { compareWithPreviousMonth } from '../domain/reports';
import { isLowStock, isOutOfStock } from '../domain/stock';
import type { ActivityEntry, Product } from '../domain/types';
import { emptyState } from '../ui/components/empty-state';
import { metric } from '../ui/components/metric';
import { formatDateTime, formatMoney, formatMonth } from '../ui/format';
import { html, setHtml, type SafeHtml } from '../ui/html';

const VISIBLE_ACTIVITY = 8;
const VISIBLE_LOW_STOCK = 5;

function activityList(activity: readonly ActivityEntry[]): SafeHtml {
  if (activity.length === 0) {
    return emptyState('Todavía no hay actividad', 'Lo que hagas en la demo aparece en esta lista.');
  }

  return html`<ul class="nx-rows">
    ${activity.slice(0, VISIBLE_ACTIVITY).map(
      (entry) =>
        html`<li class="nx-rows__row">
          <span class="nx-rows__main">${entry.message}</span>
          <time class="nx-rows__side nx-num" datetime="${entry.createdAt}">
            ${formatDateTime(entry.createdAt)}
          </time>
        </li>`,
    )}
  </ul>`;
}

function lowStockList(products: readonly Product[], threshold: number): SafeHtml {
  if (products.length === 0) {
    return emptyState(
      'No hay productos con stock bajo',
      `Los productos con ${threshold} unidades o menos aparecen en esta lista.`,
    );
  }

  return html`<ul class="nx-rows">
    ${products.slice(0, VISIBLE_LOW_STOCK).map(
      (product) =>
        html`<li class="nx-rows__row">
          <span class="nx-rows__main">${product.name}</span>
          <span class="nx-rows__side">
            ${
              isOutOfStock(product)
                ? html`<span class="nx-tag nx-tag--danger">Sin stock</span>`
                : html`<span class="nx-tag nx-tag--warning">
                    ${product.stock} ${product.stock === 1 ? 'unidad' : 'unidades'}
                  </span>`
            }
          </span>
        </li>`,
    )}
  </ul>`;
}

export const dashboardView: View = ({ root, database, now }) => {
  const { sales, products, activity, settings } = database.read();
  const { currency, lowStockThreshold } = settings.preferences;

  const today = now();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const { current, revenueChange, salesCountChange, averageTicketChange } =
    compareWithPreviousMonth(sales, today);
  const lowStock = sortItems(
    products.filter((product) => isLowStock(product, lowStockThreshold)),
    (product) => product.stock,
    'asc',
  );

  setHtml(
    root,
    html`<div class="nx-dashboard">
      <section class="nx-dashboard__lead" aria-label="Ingresos del mes">
        ${metric({
          label: `Ingresos de ${formatMonth(today)}`,
          value: formatMoney(current.revenueCents, currency),
          change: revenueChange,
          helper: `contra el mismo período de ${formatMonth(previousMonth)}`,
          lead: true,
        })}
      </section>

      <section class="nx-dashboard__strip" aria-label="Otras métricas del mes">
        ${metric({
          label: 'Ventas',
          value: String(current.salesCount),
          change: salesCountChange,
        })}
        ${metric({
          label: 'Ticket promedio',
          value: formatMoney(current.averageTicketCents, currency),
          change: averageTicketChange,
        })}
        ${metric({
          label: 'Productos con stock bajo',
          value: String(lowStock.length),
          helper: `${lowStockThreshold} unidades o menos`,
        })}
      </section>

      <div class="row nx-dashboard__lists">
        <section class="col-lg-7" aria-labelledby="activity-title">
          <h2 id="activity-title">Actividad reciente</h2>
          ${activityList(activity)}
        </section>
        <section class="col-lg-5" aria-labelledby="low-stock-title">
          <div class="nx-section-header">
            <h2 id="low-stock-title">Stock bajo</h2>
            <a href="/productos">Ver productos</a>
          </div>
          ${lowStockList(lowStock, lowStockThreshold)}
        </section>
      </div>
    </div>`,
  );
};
