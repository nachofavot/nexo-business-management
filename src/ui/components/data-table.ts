import type { Page, SortDirection } from '../../domain/list';
import { html, type HtmlValue, type SafeHtml } from '../html';
import { icon } from '../icons';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  numeric?: boolean;
  className?: string;
  cell(row: T): HtmlValue;
}

export interface TableSort {
  key: string;
  direction: SortDirection;
}

/** Al tocar la misma columna se invierte el sentido; con otra, se empieza en ascendente. */
export function nextSort(current: TableSort, key: string): TableSort {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** Sirve para cualquier fila con id y nombre: Clientes y Productos. */
export function actionsColumn<T extends { id: string; name: string }>(): Column<T> {
  return {
    key: 'actions',
    label: 'Acciones',
    className: 'nx-table__actions',
    cell: (row) =>
      html`<div class="nx-table__row-actions">
        <button
          class="nx-btn nx-btn--ghost nx-btn--icon"
          type="button"
          data-edit="${row.id}"
          aria-haspopup="dialog"
          aria-label="Editar ${row.name}"
        >
          ${icon('edit')}
        </button>
        <button
          class="nx-btn nx-btn--ghost nx-btn--icon"
          type="button"
          data-delete="${row.id}"
          aria-haspopup="dialog"
          aria-label="Eliminar ${row.name}"
        >
          ${icon('delete')}
        </button>
      </div>`,
  };
}

/** Después de redibujar la tabla, devuelve el foco al botón de esa columna. */
export function focusSortButton(region: HTMLElement, key: string): void {
  region.querySelector<HTMLElement>(`[data-sort="${CSS.escape(key)}"]`)?.focus();
}

/** Después de redibujar la tabla, vuelve al botón usado, o al otro si este quedó deshabilitado. */
export function focusPageButton(region: HTMLElement, label: string): void {
  const buttons = [...region.querySelectorAll<HTMLElement>('[data-page]:not(:disabled)')];
  const used = buttons.find((button) => button.getAttribute('aria-label') === label);
  (used ?? buttons[0])?.focus();
}

function columnClasses<T>(column: Column<T>): string {
  return [column.numeric ? 'nx-table__number' : '', column.className ?? '']
    .filter(Boolean)
    .join(' ');
}

function headerCell<T>(column: Column<T>, sort: TableSort): SafeHtml {
  const classes = columnClasses(column);

  if (!column.sortable) {
    return html`<th class="${classes}" scope="col">${column.label}</th>`;
  }

  const isSorted = sort.key === column.key;
  const ariaSort = sort.direction === 'asc' ? 'ascending' : 'descending';

  return html`<th
    class="nx-table__sortable ${classes}"
    scope="col"
    ${isSorted ? html`aria-sort="${ariaSort}"` : null}
  >
    <button class="nx-table__sort" type="button" data-sort="${column.key}">
      ${column.label} ${isSorted ? icon(sort.direction === 'asc' ? 'arrowUp' : 'arrowDown') : null}
    </button>
  </th>`;
}

function bodyCell<T>(column: Column<T>, row: T): SafeHtml {
  return html`<td class="${columnClasses(column)}" data-label="${column.label}">
    ${column.cell(row)}
  </td>`;
}

function pagination<T>(page: Page<T>): SafeHtml | null {
  if (page.pageCount <= 1) return null;

  const isFirst = page.page <= 1;
  const isLast = page.page >= page.pageCount;

  return html`<nav class="nx-pagination" aria-label="Paginación">
    <button
      class="nx-btn nx-btn--secondary nx-btn--icon"
      type="button"
      aria-label="Página anterior"
      data-page="${page.page - 1}"
      ${isFirst ? 'disabled' : ''}
    >
      ${icon('chevronLeft')}
    </button>
    <span class="nx-num">Página ${page.page} de ${page.pageCount}</span>
    <button
      class="nx-btn nx-btn--secondary nx-btn--icon"
      type="button"
      aria-label="Página siguiente"
      data-page="${page.page + 1}"
      ${isLast ? 'disabled' : ''}
    >
      ${icon('chevronRight')}
    </button>
  </nav>`;
}

/**
 * Dibuja la tabla y su paginación. No guarda estado ni escucha eventos: la vista decide qué mostrar
 * y atiende los clics en `data-sort` y `data-page`, por lo que sirve para cualquier módulo.
 */
export function dataTable<T>(options: {
  caption: string;
  columns: readonly Column<T>[];
  page: Page<T>;
  sort: TableSort;
  countLabel(total: number): string;
}): SafeHtml {
  const { caption, columns, page, sort, countLabel } = options;
  // En el celular, los encabezados ordenables pasan a ser botones bajo "Ordenar por". Sin ninguno,
  // ese título quedaría solo.
  const tableClass = columns.some((column) => column.sortable)
    ? 'nx-table'
    : 'nx-table nx-table--no-sort';

  return html`<table class="${tableClass}">
      <caption class="visually-hidden">
        ${caption}
      </caption>
      <thead>
        <tr>
          ${columns.map((column) => headerCell(column, sort))}
        </tr>
      </thead>
      <tbody>
        ${page.items.map(
          (row) =>
            html`<tr>
              ${columns.map((column) => bodyCell(column, row))}
            </tr>`,
        )}
      </tbody>
    </table>
    <div class="nx-table-footer">
      <p class="nx-table-footer__count">${countLabel(page.totalItems)}</p>
      ${pagination(page)}
    </div>`;
}
