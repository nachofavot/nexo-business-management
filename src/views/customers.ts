import type { View } from '../app/view';
import { err, ok } from '../domain/result';
import type { Customer } from '../domain/types';
import { isOneOf } from '../domain/validation/rules';
import type { CustomerFailure, CustomerQuery } from '../services/customers';
import { confirmDialog } from '../ui/components/confirm-dialog';
import {
  actionsColumn,
  dataTable,
  focusPageButton,
  focusSortButton,
  nextSort,
  type Column,
  type TableSort,
} from '../ui/components/data-table';
import { emptyState } from '../ui/components/empty-state';
import { openFormModal } from '../ui/components/form-modal';
import { showToast } from '../ui/components/toast';
import { requireElement } from '../ui/dom';
import { html, setHtml, type HtmlValue } from '../ui/html';
import { icon } from '../ui/icons';
import { storageFailureMessage } from '../ui/messages';
import { CUSTOMER_FIELDS, toCustomerInput } from './customer-form';

const PAGE_SIZE = 10;
const SORT_KEYS = ['name', 'email', 'company'] as const;

function orMissing(value: string): HtmlValue {
  return value === '' ? html`<span class="nx-muted">Sin datos</span>` : value;
}

function countLabel(total: number): string {
  return total === 1 ? '1 cliente' : `${total} clientes`;
}

const COLUMNS: readonly Column<Customer>[] = [
  { key: 'name', label: 'Nombre', sortable: true, cell: (customer) => customer.name },
  { key: 'email', label: 'Email', sortable: true, cell: (customer) => customer.email },
  {
    key: 'phone',
    label: 'Teléfono',
    className: 'nx-table__nowrap',
    cell: (customer) => orMissing(customer.phone),
  },
  {
    key: 'company',
    label: 'Empresa',
    sortable: true,
    cell: (customer) => orMissing(customer.company),
  },
  actionsColumn<Customer>(),
];

export const customersView: View = ({ root, signal, services }) => {
  const { customers } = services;

  let search = '';
  let sort: TableSort = { key: 'name', direction: 'asc' };
  let page = 1;

  setHtml(
    root,
    html`<div class="nx-toolbar">
        <div class="nx-toolbar__search">
          <label class="visually-hidden" for="customers-search">Buscar clientes</label>
          <input
            class="form-control"
            id="customers-search"
            type="search"
            placeholder="Buscar por nombre, email o empresa"
            autocomplete="off"
          />
        </div>
        <button
          class="nx-btn nx-btn--primary"
          id="customers-new"
          type="button"
          aria-haspopup="dialog"
        >
          ${icon('add')} Nuevo cliente
        </button>
      </div>
      <p class="visually-hidden" id="customers-status" role="status"></p>
      <div id="customers-table"></div>`,
  );

  const searchInput = requireElement('customers-search', HTMLInputElement);
  const status = requireElement('customers-status', HTMLElement);
  const tableRegion = requireElement('customers-table', HTMLElement);

  function listOptions(): Omit<CustomerQuery, 'page'> {
    return {
      search,
      sortKey: isOneOf(sort.key, SORT_KEYS) ? sort.key : 'name',
      direction: sort.direction,
      pageSize: PAGE_SIZE,
    };
  }

  /** Lleva la tabla hasta el cliente guardado: si no, podría quedar en otra página sin verse. */
  function revealCustomer(id: string): void {
    let target = customers.pageOf(id, listOptions());
    if (target === null) {
      search = '';
      searchInput.value = '';
      target = customers.pageOf(id, listOptions());
    }
    page = target ?? page;
  }

  function renderTable(): void {
    const result = customers.query({ ...listOptions(), page });
    // La página puede cambiar: si se borró la última fila de la última página, pasa a la anterior.
    page = result.page;
    status.textContent = countLabel(result.totalItems);

    if (result.totalItems > 0) {
      setHtml(
        tableRegion,
        dataTable({
          caption: 'Lista de clientes',
          columns: COLUMNS,
          page: result,
          sort,
          countLabel,
        }),
      );
    } else if (search.trim() === '') {
      setHtml(
        tableRegion,
        emptyState('Todavía no hay clientes', 'Agregá el primero con Nuevo cliente.'),
      );
    } else {
      setHtml(
        tableRegion,
        emptyState(
          'Sin resultados',
          'Probá con otro nombre, email o empresa.',
          html`<button class="nx-btn nx-btn--secondary" type="button" data-action="clear-search">
            Limpiar búsqueda
          </button>`,
        ),
      );
    }
  }

  /** Las fallas de validación las muestra el formulario; las demás, un aviso. */
  function showFailure(failure: Exclude<CustomerFailure, { kind: 'validation' }>): void {
    showToast(
      failure.kind === 'not-found'
        ? 'Este cliente ya no existe.'
        : storageFailureMessage(failure.failure),
      'error',
    );
  }

  function focusEditButton(id: string): void {
    const button = tableRegion.querySelector<HTMLElement>(`[data-edit="${CSS.escape(id)}"]`);
    (button ?? searchInput).focus();
  }

  function openForm(customer: Customer | null): void {
    openFormModal(
      {
        title: customer ? 'Editar cliente' : 'Nuevo cliente',
        submitLabel: customer ? 'Guardar cambios' : 'Crear cliente',
        fields: CUSTOMER_FIELDS,
        values: toCustomerInput(customer),
        validate: (values) => customers.validate(values, customer?.id),
        onSubmit(values) {
          const result = customer
            ? customers.update(customer.id, values)
            : customers.create(values);

          if (result.ok) {
            revealCustomer(result.value.id);
            renderTable();
            showToast(customer ? 'Cambios guardados.' : 'Cliente creado.', 'success');
            return ok(undefined);
          }
          if (result.error.kind === 'validation') return err(result.error.errors);

          showFailure(result.error);
          if (result.error.kind === 'storage') return err({});

          // El cliente ya no existe: no tiene sentido seguir editándolo.
          renderTable();
          return ok(undefined);
        },
        // Al crear, el foco vuelve solo al botón; al editar, la fila se volvió a dibujar.
        onClosed(saved) {
          if (saved && customer) focusEditButton(customer.id);
        },
      },
      signal,
    );
  }

  async function deleteCustomer(customer: Customer): Promise<void> {
    const confirmed = await confirmDialog(
      {
        title: 'Eliminar cliente',
        message: `${customer.name} se quita de la lista. Sus ventas se conservan.`,
        confirmLabel: 'Eliminar cliente',
      },
      signal,
    );
    if (!confirmed) return;

    const result = customers.remove(customer.id);
    if (!result.ok) {
      if (result.error.kind !== 'validation') showFailure(result.error);
      renderTable();
      return;
    }

    renderTable();
    showToast('Cliente eliminado.', 'success');
    searchInput.focus();
  }

  function customerFrom(id: string | null): Customer | null {
    const customer = id === null ? null : customers.find(id);
    if (!customer) {
      showFailure({ kind: 'not-found' });
      renderTable();
    }
    return customer;
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
  }

  root.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const { target } = event;

      if (target.closest('#customers-new')) {
        openForm(null);
        return;
      }

      const editButton = target.closest('[data-edit]');
      if (editButton) {
        const customer = customerFrom(editButton.getAttribute('data-edit'));
        if (customer) openForm(customer);
        return;
      }

      const deleteButton = target.closest('[data-delete]');
      if (deleteButton) {
        const customer = customerFrom(deleteButton.getAttribute('data-delete'));
        if (customer) void deleteCustomer(customer);
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

      if (target.closest('[data-action="clear-search"]')) {
        searchInput.value = '';
        search = '';
        page = 1;
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

  renderTable();
};
