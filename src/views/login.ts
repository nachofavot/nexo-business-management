import type { View } from '../app/view';
import { formatSaleNumber } from '../domain/sales';
import type { Currency, Sale } from '../domain/types';
import { brand } from '../ui/components/brand';
import { formatMoney } from '../ui/format';
import { html, setHtml, type SafeHtml } from '../ui/html';

const MAX_VISIBLE_ITEMS = 3;

/** Muestra lo que hace NEXO con un dato real: un cliente unido a productos en una venta. */
function latestSale(sale: Sale, currency: Currency): SafeHtml {
  const hiddenItems = sale.items.length - MAX_VISIBLE_ITEMS;

  return html`<section class="nx-login__sale" aria-label="Última venta de la demo">
    <ol class="nx-link">
      <li class="nx-link__node">
        <span class="nx-link__label">Cliente</span>
        <span class="nx-link__value">${sale.customerName}</span>
      </li>
      <li class="nx-link__node">
        <span class="nx-link__label">Productos</span>
        <ul class="nx-link__items">
          ${sale.items
            .slice(0, MAX_VISIBLE_ITEMS)
            .map((item) => html`<li>${item.productName} × ${item.quantity}</li>`)}
          ${hiddenItems > 0 ? html`<li class="nx-muted">y ${hiddenItems} más</li>` : null}
        </ul>
      </li>
      <li class="nx-link__node nx-link__node--total">
        <span class="nx-link__label">Venta ${formatSaleNumber(sale.number)}</span>
        <span class="nx-link__total">${formatMoney(sale.totalCents, currency)}</span>
      </li>
    </ol>
  </section>`;
}

export const loginView: View = ({ root, signal, database, session, navigate }) => {
  const { sales, settings } = database.read();
  const sale = sales.find(({ status }) => status === 'completed');

  setHtml(
    root,
    html`<main class="nx-login">
      <div class="nx-login__intro">
        ${brand()}
        <h1 class="nx-login__title" tabindex="-1">Clientes, productos y ventas en un lugar</h1>
        <button class="nx-btn nx-btn--primary" type="button" data-action="enter">
          Entrar a la demo
        </button>
        <p class="nx-login__note">
          ${
            database.mode === 'memory'
              ? 'Los datos son ficticios. Tu navegador no permite guardarlos: los cambios se pierden al recargar.'
              : 'Los datos son ficticios y solo se guardan en este navegador.'
          }
        </p>
      </div>
      ${sale ? latestSale(sale, settings.preferences.currency) : null}
    </main>`,
  );

  root.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="enter"]')) {
        session.start();
        navigate('/dashboard');
      }
    },
    { signal },
  );
};
