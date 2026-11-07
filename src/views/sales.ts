import type { View } from '../app/view';
import { formatSaleNumber } from '../domain/sales';
import { SALE_STATUSES, type Sale, type SaleStatus } from '../domain/types';
import { isOneOf } from '../domain/validation/rules';
import type { CancelSaleFailure, SaleQuery } from '../services/sales';
import { confirmDialog } from '../ui/components/confirm-dialog';
import { dataTable, focusPageButton } from '../ui/components/data-table';
import { emptyState } from '../ui/components/empty-state';
import { showToast } from '../ui/components/toast';
import { requireElement, syncAttribute } from '../ui/dom';
import { html, setHtml } from '../ui/html';
import { icon } from '../ui/icons';
import { storageFailureMessage } from '../ui/messages';
import { saleColumns } from './sale-columns';
import { openSaleDetail } from './sale-detail-modal';

const PAGE_SIZE = 10;
// La tabla no se ordena por columnas: el servicio siempre da la venta más nueva primero.
const FIXED_SORT = { key: 'number', direction: 'desc' } as const;

function countLabel(total: number): string {
  return total === 1 ? '1 venta' : `${total} ventas`;
}

export const salesView: View = ({ root, signal, database, services }) => {
  const { sales } = services;
  const { currency } = database.read().settings.preferences;
  const columns = saleColumns({ currency });

  let search = '';
  let status: SaleStatus | null = null;
  let from = '';
  let to = '';
  let page = 1;

  setHtml(
    root,
    html`<div class="nx-toolbar">
        <div class="nx-toolbar__search">
          <label class="visually-hidden" for="sales-search">Buscar ventas</label>
          <input
            class="form-control"
            id="sales-search"
            type="search"
            placeholder="Buscar por número o cliente"
            autocomplete="off"
          />
        </div>
        <div class="nx-toolbar__select">
          <label class="visually-hidden" for="sales-status">Filtrar por estado</label>
          <select class="form-select" id="sales-status">
            <option value="">Todos los estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>
        <div class="nx-toolbar__date">
          <label class="form-label" for="sales-from">Desde</label>
          <input class="form-control" id="sales-from" type="date" />
        </div>
        <div class="nx-toolbar__date">
          <label class="form-label" for="sales-to">Hasta</label>
          <input class="form-control" id="sales-to" type="date" />
        </div>
        <a class="nx-btn nx-btn--primary nx-toolbar__action" id="sales-new" href="/ventas/nueva">
          ${icon('add')} Nueva venta
        </a>
      </div>
      <p class="visually-hidden" id="sales-count" role="status"></p>
      <div id="sales-table"></div>`,
  );

  const searchInput = requireElement('sales-search', HTMLInputElement);
  const statusSelect = requireElement('sales-status', HTMLSelectElement);
  const fromInput = requireElement('sales-from', HTMLInputElement);
  const toInput = requireElement('sales-to', HTMLInputElement);
  const count = requireElement('sales-count', HTMLElement);
  const tableRegion = requireElement('sales-table', HTMLElement);

  function listOptions(): Omit<SaleQuery, 'page'> {
    return { search, status, from, to, pageSize: PAGE_SIZE };
  }

  function hasFilters(): boolean {
    return search.trim() !== '' || status !== null || from !== '' || to !== '';
  }

  // Con el formato AAAA-MM-DD, comparar los textos es comparar las fechas.
  function isRangeInverted(): boolean {
    return from !== '' && to !== '' && from > to;
  }

  /**
   * El calendario no ofrece un rango invertido; escribiéndolo, igual se puede. Cada fecha limita
   * solo a la otra: tocar los límites del campo que se está escribiendo borraría lo tecleado.
   */
  function syncDateLimits(): void {
    syncAttribute(toInput, 'min', from);
    syncAttribute(fromInput, 'max', to);
  }

  function clearFilters(): void {
    search = '';
    status = null;
    from = '';
    to = '';
    page = 1;
    searchInput.value = '';
    statusSelect.value = '';
    fromInput.value = '';
    toInput.value = '';
    syncDateLimits();
  }

  /** Lleva la tabla hasta la venta: si un filtro la ocultara, desaparecería sin explicación. */
  function revealSale(id: string): void {
    let target = sales.pageOf(id, listOptions());
    if (target === null) {
      clearFilters();
      target = sales.pageOf(id, listOptions());
    }
    page = target ?? page;
  }

  function renderTable(): void {
    const result = sales.query({ ...listOptions(), page });
    page = result.page;
    count.textContent = countLabel(result.totalItems);

    if (result.totalItems > 0) {
      setHtml(
        tableRegion,
        dataTable({
          caption: 'Historial de ventas',
          columns,
          page: result,
          sort: FIXED_SORT,
          countLabel,
        }),
      );
    } else if (!hasFilters()) {
      setHtml(
        tableRegion,
        emptyState('Todavía no hay ventas', 'Registrá la primera con Nueva venta.'),
      );
    } else {
      setHtml(
        tableRegion,
        emptyState(
          'Sin resultados',
          isRangeInverted()
            ? 'La fecha Desde es posterior a la fecha Hasta.'
            : 'Probá con otra búsqueda o quitá los filtros.',
          html`<button class="nx-btn nx-btn--secondary" type="button" data-action="clear-filters">
            Limpiar filtros
          </button>`,
        ),
      );
    }
  }

  function showFailure(failure: CancelSaleFailure): void {
    const messages = {
      'not-found': 'Esta venta ya no existe.',
      'already-cancelled': 'Esta venta ya estaba anulada.',
    } as const;
    showToast(
      failure.kind === 'storage' ? storageFailureMessage(failure.failure) : messages[failure.kind],
      'error',
    );
  }

  function focusDetailButton(id: string): void {
    const button = tableRegion.querySelector<HTMLElement>(`[data-detail="${CSS.escape(id)}"]`);
    (button ?? searchInput).focus();
  }

  async function confirmCancel(sale: Sale): Promise<void> {
    const number = formatSaleNumber(sale.number);
    const confirmed = await confirmDialog(
      {
        title: `Anular venta ${number}`,
        message:
          'La venta queda en el historial como anulada y se devuelve el stock de los productos que todavía existen. No se puede deshacer.',
        confirmLabel: 'Anular venta',
      },
      signal,
    );
    if (!confirmed) return;

    const result = sales.cancel(sale.id);
    if (result.ok) {
      revealSale(sale.id);
      renderTable();
      showToast(`Venta ${number} anulada.`, 'success');
    } else {
      showFailure(result.error);
      renderTable();
    }
    focusDetailButton(sale.id);
  }

  function openDetail(id: string | null): void {
    const sale = id === null ? null : sales.find(id);
    if (!sale) {
      showFailure({ kind: 'not-found' });
      renderTable();
      return;
    }

    openSaleDetail(
      sale,
      {
        currency,
        onClosed(action) {
          if (action === 'cancel') void confirmCancel(sale);
        },
      },
      signal,
    );
  }

  function changePage(button: Element): void {
    const label = button.getAttribute('aria-label') ?? '';
    page = Number(button.getAttribute('data-page'));
    renderTable();
    focusPageButton(tableRegion, label);
  }

  root.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const { target } = event;

      const detailButton = target.closest('[data-detail]');
      if (detailButton) {
        openDetail(detailButton.getAttribute('data-detail'));
        return;
      }

      const pageButton = target.closest('[data-page]');
      if (pageButton) {
        changePage(pageButton);
        return;
      }

      if (target.closest('[data-action="clear-filters"]')) {
        clearFilters();
        renderTable();
        searchInput.focus();
      }
    },
    { signal },
  );

  searchInput.addEventListener(
    'input',
    () => {
      search = searchInput.value;
      page = 1;
      renderTable();
    },
    { signal },
  );

  statusSelect.addEventListener(
    'change',
    () => {
      const { value } = statusSelect;
      status = isOneOf(value, SALE_STATUSES) ? value : null;
      page = 1;
      renderTable();
    },
    { signal },
  );

  // Chrome avisa el cambio en cada parte completa de la fecha, mientras la persona escribe.
  fromInput.addEventListener(
    'change',
    () => {
      from = fromInput.value;
      page = 1;
      syncAttribute(toInput, 'min', from);
      renderTable();
    },
    { signal },
  );

  toInput.addEventListener(
    'change',
    () => {
      to = toInput.value;
      page = 1;
      syncAttribute(fromInput, 'max', to);
      renderTable();
    },
    { signal },
  );

  renderTable();
};
