import { isLowStock, isOutOfStock } from '../domain/stock';
import type { Currency, Product } from '../domain/types';
import { actionsColumn, type Column } from '../ui/components/data-table';
import { formatMoney } from '../ui/format';
import { html, type SafeHtml } from '../ui/html';

function stockTag(product: Product, lowStockThreshold: number): SafeHtml | null {
  if (isOutOfStock(product)) return html`<span class="nx-tag nx-tag--danger">Sin stock</span>`;
  if (isLowStock(product, lowStockThreshold)) {
    return html`<span class="nx-tag nx-tag--warning">Stock bajo</span>`;
  }
  return null;
}

/** Solo el nombre puede partirse: si cediera otra columna, un nombre largo partiría sus datos. */
export function productColumns(options: {
  currency: Currency;
  lowStockThreshold: number;
}): readonly Column<Product>[] {
  const { currency, lowStockThreshold } = options;

  return [
    { key: 'name', label: 'Nombre', sortable: true, cell: (product) => product.name },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      className: 'nx-table__nowrap',
      cell: (product) => product.sku,
    },
    {
      key: 'category',
      label: 'Categoría',
      sortable: true,
      className: 'nx-table__nowrap',
      cell: (product) => product.category,
    },
    {
      key: 'priceCents',
      label: 'Precio',
      sortable: true,
      numeric: true,
      className: 'nx-table__nowrap',
      cell: (product) => formatMoney(product.priceCents, currency),
    },
    {
      key: 'stock',
      label: 'Stock',
      sortable: true,
      numeric: true,
      className: 'nx-table__nowrap',
      // El número va a la derecha para que las cifras queden alineadas, con o sin etiqueta.
      cell: (product) =>
        html`<span class="nx-table__tagged">
          ${stockTag(product, lowStockThreshold)}<span>${product.stock}</span>
        </span>`,
    },
    actionsColumn<Product>(),
  ];
}
