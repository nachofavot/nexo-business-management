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

  return html`<table class="nx-table">
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
