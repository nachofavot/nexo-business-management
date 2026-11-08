import type { View } from '../app/view';
import { err, ok } from '../domain/result';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../domain/types';
import { isOneOf } from '../domain/validation/rules';
import type { ProductFailure, ProductQuery } from '../services/products';
import { confirmDialog } from '../ui/components/confirm-dialog';
import {
  dataTable,
  focusPageButton,
  focusSortButton,
  nextSort,
  type TableSort,
} from '../ui/components/data-table';
import { emptyState } from '../ui/components/empty-state';
import { openFormModal } from '../ui/components/form-modal';
import { showToast } from '../ui/components/toast';
import { requireElement } from '../ui/dom';
import { html, setHtml } from '../ui/html';
import { icon } from '../ui/icons';
import { announce } from '../ui/announce';
import { pageAnnouncement, storageFailureMessage } from '../ui/messages';
import { productColumns } from './product-columns';
import { PRODUCT_FIELDS, toProductInput } from './product-form';

const PAGE_SIZE = 10;
const SORT_KEYS = ['name', 'sku', 'category', 'priceCents', 'stock'] as const;

function countLabel(total: number): string {
  return total === 1 ? '1 producto' : `${total} productos`;
}

export const productsView: View = ({ root, signal, database, services }) => {
  const { products } = services;
  const { currency, lowStockThreshold } = database.read().settings.preferences;
  const columns = productColumns({ currency, lowStockThreshold });

  let search = '';
  let category: ProductCategory | null = null;
  let lowStockOnly = false;
  let sort: TableSort = { key: 'name', direction: 'asc' };
  let page = 1;
  let pageCount = 1;

  setHtml(
    root,
    html`<div class="nx-toolbar">
        <div class="nx-toolbar__search">
          <label class="visually-hidden" for="products-search">Buscar productos</label>
          <input
            class="form-control"
            id="products-search"
            type="search"
            placeholder="Buscar por nombre o SKU"
            autocomplete="off"
          />
        </div>
        <div class="nx-toolbar__select">
          <label class="visually-hidden" for="products-category">Filtrar por categoría</label>
          <select class="form-select" id="products-category">
            <option value="">Todas las categorías</option>
            ${PRODUCT_CATEGORIES.map((name) => html`<option value="${name}">${name}</option>`)}
          </select>
        </div>
        <button
          class="nx-btn nx-btn--secondary"
          id="products-low-stock"
          type="button"
          aria-pressed="false"
        >
          <span class="nx-btn__off">${icon('unchecked')}</span>
          <span class="nx-btn__on">${icon('success')}</span>
          Solo stock bajo
        </button>
        <button
          class="nx-btn nx-btn--primary nx-toolbar__action"
          id="products-new"
          type="button"
          aria-haspopup="dialog"
        >
          ${icon('add')} Nuevo producto
        </button>
      </div>
      <p class="visually-hidden" id="products-status" role="status"></p>
      <div id="products-table"></div>`,
  );

  const searchInput = requireElement('products-search', HTMLInputElement);
  const categorySelect = requireElement('products-category', HTMLSelectElement);
  const lowStockButton = requireElement('products-low-stock', HTMLButtonElement);
  const status = requireElement('products-status', HTMLElement);
  const tableRegion = requireElement('products-table', HTMLElement);

  function listOptions(): Omit<ProductQuery, 'page'> {
    return {
      search,
      category,
      lowStockOnly,
      sortKey: isOneOf(sort.key, SORT_KEYS) ? sort.key : 'name',
      direction: sort.direction,
      pageSize: PAGE_SIZE,
    };
  }

  function clearFilters(): void {
    search = '';
    category = null;
    lowStockOnly = false;
    page = 1;
    searchInput.value = '';
    categorySelect.value = '';
    lowStockButton.setAttribute('aria-pressed', 'false');
  }

  /** Lleva la tabla hasta el producto guardado: si no, podría quedar oculto sin explicación. */
  function revealProduct(id: string): void {
    let target = products.pageOf(id, listOptions());
    if (target === null) {
      clearFilters();
      target = products.pageOf(id, listOptions());
    }
    page = target ?? page;
  }

  function renderTable(): void {
    const result = products.query({ ...listOptions(), page });
    // La página puede cambiar: si se borró la última fila de la última página, pasa a la anterior.
    page = result.page;
    pageCount = result.pageCount;
    status.textContent = countLabel(result.totalItems);

    if (result.totalItems > 0) {
      setHtml(
        tableRegion,
        dataTable({
          caption: 'Lista de productos',
          columns,
          page: result,
          sort,
          countLabel,
        }),
      );
    } else if (search.trim() === '' && category === null && !lowStockOnly) {
      setHtml(
        tableRegion,
        emptyState('Todavía no hay productos', 'Agregá el primero con Nuevo producto.'),
      );
    } else {
      setHtml(
        tableRegion,
        emptyState(
          'Sin resultados',
          'Probá con otra búsqueda o quitá los filtros.',
          html`<button class="nx-btn nx-btn--secondary" type="button" data-action="clear-filters">
            Limpiar filtros
          </button>`,
        ),
      );
    }
  }

  /** Las fallas de validación las muestra el formulario; las demás, un aviso. */
  function showFailure(failure: Exclude<ProductFailure, { kind: 'validation' }>): void {
    showToast(
      failure.kind === 'not-found'
        ? 'Este producto ya no existe.'
        : storageFailureMessage(failure.failure),
      'error',
    );
  }

  /** El botón de la fila, o la búsqueda si la fila ya no está en la página. */
  function focusRowButton(action: 'edit' | 'delete', id: string): void {
    const button = tableRegion.querySelector<HTMLElement>(`[data-${action}="${CSS.escape(id)}"]`);
    (button ?? searchInput).focus();
  }

  function openForm(product: Product | null): void {
    openFormModal(
      {
        title: product ? 'Editar producto' : 'Nuevo producto',
        submitLabel: product ? 'Guardar cambios' : 'Crear producto',
        fields: PRODUCT_FIELDS,
        values: toProductInput(product),
        validate: (values) => products.validate(values, product?.id),
        onSubmit(values) {
          const result = product ? products.update(product.id, values) : products.create(values);

          if (result.ok) {
            revealProduct(result.value.id);
            renderTable();
            showToast(product ? 'Cambios guardados.' : 'Producto creado.', 'success');
            return ok(undefined);
          }
          if (result.error.kind === 'validation') return err(result.error.errors);

          showFailure(result.error);
          if (result.error.kind === 'storage') return err({});

          // El producto ya no existe: no tiene sentido seguir editándolo.
          renderTable();
          return ok(undefined);
        },
        // Al crear, el foco vuelve solo al botón; al editar, la fila se volvió a dibujar.
        onClosed(saved) {
          if (saved && product) focusRowButton('edit', product.id);
        },
      },
      signal,
    );
  }

  async function deleteProduct(product: Product): Promise<void> {
    const confirmed = await confirmDialog(
      {
        title: 'Eliminar producto',
        message: `${product.name} se quita de la lista. Las ventas ya registradas lo conservan.`,
        confirmLabel: 'Eliminar producto',
      },
      signal,
    );
    if (!confirmed) return;

    const result = products.remove(product.id);
    if (!result.ok) {
      if (result.error.kind !== 'validation') showFailure(result.error);
      renderTable();
      // La lista se volvió a dibujar: sin esto, el foco quedaría en body.
      focusRowButton('delete', product.id);
      return;
    }

    renderTable();
    showToast('Producto eliminado.', 'success');
    searchInput.focus();
  }

  function productFrom(id: string | null): Product | null {
    const product = id === null ? null : products.find(id);
    if (!product) {
      showFailure({ kind: 'not-found' });
      renderTable();
    }
    return product;
  }

  function changeSort(key: string): void {
    sort = nextSort(sort, key);
    page = 1;
    renderTable();
    focusSortButton(tableRegion, key);
  }

  function changePage(button: Element): void {
    const label = button.getAttribute('aria-label') ?? '';
    page = Number(button.getAttribute('data-page'));
    renderTable();
    focusPageButton(tableRegion, label);
    // El foco sigue en el botón y la tabla cambió: sin el aviso, un lector de pantalla no se entera.
    announce(pageAnnouncement(page, pageCount));
  }

  root.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const { target } = event;

      if (target.closest('#products-new')) {
        openForm(null);
        return;
      }

      if (target.closest('#products-low-stock')) {
        lowStockOnly = !lowStockOnly;
        lowStockButton.setAttribute('aria-pressed', String(lowStockOnly));
        page = 1;
        renderTable();
        return;
      }

      const editButton = target.closest('[data-edit]');
      if (editButton) {
        const product = productFrom(editButton.getAttribute('data-edit'));
        if (product) openForm(product);
        return;
      }

      const deleteButton = target.closest('[data-delete]');
      if (deleteButton) {
        const product = productFrom(deleteButton.getAttribute('data-delete'));
        if (product) void deleteProduct(product);
        return;
      }

      const sortButton = target.closest('[data-sort]');
      if (sortButton) {
        changeSort(sortButton.getAttribute('data-sort') ?? sort.key);
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

  categorySelect.addEventListener(
    'change',
    () => {
      const { value } = categorySelect;
      category = isOneOf(value, PRODUCT_CATEGORIES) ? value : null;
      page = 1;
      renderTable();
    },
    { signal },
  );

  renderTable();
};
