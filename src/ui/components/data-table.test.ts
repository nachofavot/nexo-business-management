import { describe, expect, it } from 'vitest';
import type { Page } from '../../domain/list';
import { actionsColumn, dataTable, nextSort, type Column, type TableSort } from './data-table';

interface Row {
  name: string;
  price: string;
}

const columns: readonly Column<Row>[] = [
  { key: 'name', label: 'Nombre', sortable: true, cell: (row) => row.name },
  { key: 'price', label: 'Precio', numeric: true, sortable: true, cell: (row) => row.price },
  { key: 'actions', label: 'Acciones', cell: () => 'Editar' },
];

const onePage: Page<Row> = {
  items: [{ name: 'Ana', price: '$ 1' }],
  page: 1,
  pageCount: 1,
  totalItems: 1,
};

function render(
  page: Page<Row> = onePage,
  sort: TableSort = { key: 'name', direction: 'asc' },
): string {
  return dataTable({
    caption: 'Lista de clientes',
    columns,
    page,
    sort,
    countLabel: (total) => `${total} clientes`,
  }).value;
}

describe('dataTable', () => {
  it('marca la columna ordenada de forma ascendente', () => {
    expect(render()).toMatch(/<th[^>]*aria-sort="ascending"[^>]*>\s*<button[^>]*data-sort="name"/);
  });

  it('marca la columna ordenada de forma descendente', () => {
    expect(render(onePage, { key: 'name', direction: 'desc' })).toContain('aria-sort="descending"');
  });

  it('las demás columnas ordenables tienen botón y no indican orden', () => {
    const markup = render();

    expect(markup).toContain('data-sort="price"');
    expect(markup.match(/aria-sort=/g)).toHaveLength(1);
  });

  it('las columnas ordenables indican que son encabezados y usan botones', () => {
    const markup = render();

    expect(markup).toMatch(
      /<th[^>]*nx-table__sortable[^>]*scope="col"[^>]*>\s*<button[^>]*type="button"/,
    );
    expect(markup.match(/nx-table__sortable/g)).toHaveLength(2);
  });

  it('la flecha indica el sentido del orden, solo en la columna ordenada', () => {
    const ascending = render();
    const descending = render(onePage, { key: 'name', direction: 'desc' });

    expect(ascending.match(/bi-arrow-up/g)).toHaveLength(1);
    expect(ascending).not.toContain('bi-arrow-down');
    expect(descending.match(/bi-arrow-down/g)).toHaveLength(1);
    expect(descending).not.toContain('bi-arrow-up');
  });

  it('las columnas no ordenables no tienen botón', () => {
    const markup = render();

    expect(markup).not.toContain('data-sort="actions"');
    expect(markup).toMatch(/<th[^>]*scope="col"[^>]*>\s*Acciones/);
  });

  it('cada celda lleva la etiqueta de su columna', () => {
    const markup = render();

    expect(markup).toContain('data-label="Nombre"');
    expect(markup).toContain('data-label="Precio"');
    expect(markup).toContain('data-label="Acciones"');
  });

  it('alinea las columnas numéricas en encabezado y celda', () => {
    const markup = render();

    expect(markup).toMatch(/<th[^>]*nx-table__number/);
    expect(markup).toMatch(/<td[^>]*nx-table__number[^>]*data-label="Precio"/);
  });

  it('no marca como numéricas a las demás columnas', () => {
    expect(render()).not.toMatch(/nx-table__number[^>]*data-label="Nombre"/);
  });

  it('escapa los datos de las celdas', () => {
    const markup = render({ ...onePage, items: [{ name: '<script>x</script>', price: '' }] });

    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&lt;script&gt;');
  });

  it('incluye una descripción accesible de la tabla', () => {
    expect(render()).toMatch(/<caption class="visually-hidden">\s*Lista de clientes/);
  });

  it('muestra el total, sin región de anuncios porque la tabla se vuelve a dibujar', () => {
    const markup = render({ ...onePage, totalItems: 24 });

    expect(markup).toContain('24 clientes');
    expect(markup).not.toContain('aria-live');
  });

  it('marca la tabla sin columnas ordenables, para no mostrar "Ordenar por" vacío', () => {
    const markup = dataTable({
      caption: 'Historial',
      columns: [{ key: 'name', label: 'Nombre', cell: (row: Row) => row.name }],
      page: onePage,
      sort: { key: 'name', direction: 'asc' },
      countLabel: () => '',
    }).value;

    expect(markup).toContain('class="nx-table nx-table--no-sort"');
    expect(render()).not.toContain('nx-table--no-sort');
  });

  it('aplica la clase de la columna en encabezado y celda', () => {
    const markup = dataTable({
      caption: 'Lista',
      columns: [{ key: 'a', label: 'A', className: 'nx-table__actions', cell: () => 'x' }],
      page: onePage,
      sort: { key: 'a', direction: 'asc' },
      countLabel: () => '',
    }).value;

    expect(markup.match(/nx-table__actions/g)).toHaveLength(2);
  });

  describe('paginación', () => {
    const pageNumber = (page: number): Page<Row> => ({
      items: onePage.items,
      page,
      pageCount: 3,
      totalItems: 24,
    });

    it('tiene un nombre accesible', () => {
      expect(render(pageNumber(2))).toContain('aria-label="Paginación"');
    });

    it('en una página intermedia permite ir a la anterior y a la siguiente', () => {
      const markup = render(pageNumber(2));

      expect(markup).toContain('Página 2 de 3');
      expect(markup).toContain('data-page="1"');
      expect(markup).toContain('data-page="3"');
      expect(markup).not.toMatch(/<button[^>]*disabled/);
    });

    it('en la primera página deshabilita "anterior"', () => {
      const markup = render(pageNumber(1));

      expect(markup).toMatch(/<button[^>]*aria-label="Página anterior"[^>]*disabled/);
      expect(markup).not.toMatch(/<button[^>]*aria-label="Página siguiente"[^>]*disabled/);
    });

    it('en la última página deshabilita "siguiente"', () => {
      const markup = render(pageNumber(3));

      expect(markup).toMatch(/<button[^>]*aria-label="Página siguiente"[^>]*disabled/);
      expect(markup).not.toMatch(/<button[^>]*aria-label="Página anterior"[^>]*disabled/);
    });

    it('con una sola página no muestra botones, pero sí el total', () => {
      const markup = render();

      expect(markup).not.toContain('data-page');
      expect(markup).toContain('1 clientes');
    });
  });
});

describe('actionsColumn', () => {
  interface Entity {
    id: string;
    name: string;
  }

  function renderActions(row: Entity): string {
    return dataTable({
      caption: 'Lista',
      columns: [actionsColumn<Entity>()],
      page: { items: [row], page: 1, pageCount: 1, totalItems: 1 },
      sort: { key: 'name', direction: 'asc' },
      countLabel: () => '',
    }).value;
  }

  it('cada botón actúa sobre esa fila y dice sobre quién', () => {
    const markup = renderActions({ id: 'a1', name: 'Ana' });

    expect(markup).toContain('data-edit="a1"');
    expect(markup).toContain('data-delete="a1"');
    expect(markup).toContain('aria-label="Editar Ana"');
    expect(markup).toContain('aria-label="Eliminar Ana"');
  });

  it('los dos botones anuncian que abren un diálogo', () => {
    const markup = renderActions({ id: 'a1', name: 'Ana' });

    expect(markup.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
  });

  it('usa el ancho de la columna de acciones y no se puede ordenar', () => {
    const markup = renderActions({ id: 'a1', name: 'Ana' });

    expect(markup).toContain('class="nx-table__actions"');
    expect(markup).not.toContain('data-sort="actions"');
  });

  it('escapa el nombre en los botones', () => {
    expect(renderActions({ id: 'a1', name: '"><img src=x>' })).not.toContain('<img');
  });
});

describe('nextSort', () => {
  it('con otra columna empieza en orden ascendente', () => {
    expect(nextSort({ key: 'name', direction: 'desc' }, 'price')).toEqual({
      key: 'price',
      direction: 'asc',
    });
  });

  it('con la misma columna invierte el sentido', () => {
    expect(nextSort({ key: 'name', direction: 'asc' }, 'name')).toEqual({
      key: 'name',
      direction: 'desc',
    });
    expect(nextSort({ key: 'name', direction: 'desc' }, 'name')).toEqual({
      key: 'name',
      direction: 'asc',
    });
  });
});
