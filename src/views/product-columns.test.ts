import { describe, expect, it } from 'vitest';
import type { Currency, Product } from '../domain/types';
import { makeProduct } from '../testing/fixtures';
import { dataTable } from '../ui/components/data-table';
import { formatMoney } from '../ui/format';
import { productColumns } from './product-columns';

function renderRow(
  product: Product,
  options: { currency?: Currency; lowStockThreshold?: number } = {},
): string {
  return dataTable({
    caption: 'Lista',
    columns: productColumns({
      currency: options.currency ?? 'ARS',
      lowStockThreshold: options.lowStockThreshold ?? 5,
    }),
    page: { items: [product], page: 1, pageCount: 1, totalItems: 1 },
    sort: { key: 'name', direction: 'asc' },
    countLabel: () => '',
  }).value;
}

describe('etiquetas de stock', () => {
  it('sin stock prevalece sobre stock bajo', () => {
    const markup = renderRow(makeProduct({ stock: 0 }));

    expect(markup).toContain('Sin stock');
    expect(markup).toContain('nx-tag--danger');
    expect(markup).not.toContain('Stock bajo');
  });

  it('0 sigue siendo "Sin stock" con umbral 0', () => {
    expect(renderRow(makeProduct({ stock: 0 }), { lowStockThreshold: 0 })).toContain('Sin stock');
  });

  it('un stock igual al umbral es "Stock bajo"', () => {
    const markup = renderRow(makeProduct({ stock: 5 }));

    expect(markup).toContain('Stock bajo');
    expect(markup).toContain('nx-tag--warning');
    expect(markup).not.toContain('Sin stock');
  });

  it('un stock mayor que el umbral no lleva etiqueta', () => {
    expect(renderRow(makeProduct({ stock: 6 }))).not.toContain('nx-tag');
  });

  it('usa el umbral configurado', () => {
    expect(renderRow(makeProduct({ stock: 10 }), { lowStockThreshold: 10 })).toContain(
      'Stock bajo',
    );
    expect(renderRow(makeProduct({ stock: 5 }), { lowStockThreshold: 4 })).not.toContain('nx-tag');
  });

  it('muestra el número a la derecha de la etiqueta, para que las cifras queden alineadas', () => {
    expect(renderRow(makeProduct({ stock: 3 }))).toMatch(
      /nx-table__tagged[^>]*>\s*<span[^>]*>\s*Stock bajo\s*<\/span>\s*<span>\s*3\s*<\/span>/,
    );
  });

  it('muestra el 0, aunque sea un valor falso para JavaScript', () => {
    expect(renderRow(makeProduct({ stock: 0 }))).toMatch(/<span>\s*0\s*<\/span>/);
  });

  it('muestra el número también sin etiqueta', () => {
    expect(renderRow(makeProduct({ stock: 6 }))).toMatch(
      /nx-table__tagged[^>]*>\s*<span>\s*6\s*<\/span>/,
    );
  });
});

describe('columnas', () => {
  it('muestra los datos del producto', () => {
    const markup = renderRow(makeProduct({ name: 'Monitor', sku: 'MON-1', category: 'Redes' }));

    expect(markup).toContain('Monitor');
    expect(markup).toContain('MON-1');
    expect(markup).toContain('Redes');
  });

  it('muestra el precio en la moneda configurada', () => {
    const product = makeProduct({ priceCents: 123456 });

    expect(renderRow(product)).toContain('1.234,56');
    expect(renderRow(product, { currency: 'USD' })).toContain(formatMoney(123456, 'USD'));
    expect(renderRow(product)).not.toContain('US$');
  });

  it('permite ordenar por cada dato, con las mismas claves que el servicio', () => {
    const markup = renderRow(makeProduct());

    for (const key of ['name', 'sku', 'category', 'priceCents', 'stock']) {
      expect(markup).toContain(`data-sort="${key}"`);
    }
    expect(markup).not.toContain('data-sort="actions"');
  });

  it('alinea como números el precio y el stock', () => {
    const markup = renderRow(makeProduct());

    expect(markup).toMatch(/<td class="[^"]*nx-table__number[^"]*" data-label="Precio"/);
    expect(markup).toMatch(/<td class="[^"]*nx-table__number[^"]*" data-label="Stock"/);
    expect(markup).not.toMatch(/<td class="[^"]*nx-table__number[^"]*" data-label="SKU"/);
  });

  it('un SKU de 20 caracteres se puede partir, para que la tabla no desborde', () => {
    const markup = renderRow(makeProduct());

    expect(markup).toMatch(/<td class="nx-table__code" data-label="SKU"/);
  });

  it.each(['Categoría', 'Precio', 'Stock'])(
    'un nombre largo en otra fila no parte la columna %s',
    (label) => {
      expect(renderRow(makeProduct())).toMatch(
        new RegExp(`<td class="[^"]*nx-table__nowrap[^"]*" data-label="${label}"`),
      );
    },
  );

  it('es el nombre quien cede lugar', () => {
    expect(renderRow(makeProduct())).toMatch(/<td class="" data-label="Nombre"/);
  });

  it('escapa el nombre en la fila y en sus botones', () => {
    const markup = renderRow(makeProduct({ name: '"><img src=x>' }));

    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
  });
});
