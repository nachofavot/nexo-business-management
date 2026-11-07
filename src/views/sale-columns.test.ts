import { describe, expect, it } from 'vitest';
import type { Currency, Sale } from '../domain/types';
import { makeSale } from '../testing/fixtures';
import { dataTable } from '../ui/components/data-table';
import { saleColumns } from './sale-columns';

// Intl separa algunos datos con espacios duros, que no se distinguen a simple vista.
function renderRow(sale: Sale, currency: Currency = 'ARS'): string {
  return dataTable({
    caption: 'Historial',
    columns: saleColumns({ currency }),
    page: { items: [sale], page: 1, pageCount: 1, totalItems: 1 },
    sort: { key: 'number', direction: 'desc' },
    countLabel: () => '',
  }).value.replace(/\s/g, ' ');
}

describe('saleColumns', () => {
  it('muestra el número con su formato en su celda', () => {
    // La celda, no la fila: el botón también nombra la venta en su aria-label.
    expect(renderRow(makeSale({ number: 123 }))).toMatch(/data-label="Número"\s*>\s*V-000123/);
  });

  it('muestra la fecha en hora local', () => {
    expect(renderRow(makeSale({ createdAt: '2026-11-05T17:30:00.000Z' }))).toContain(
      '05/11/2026, 14:30',
    );
  });

  it('muestra el medio de pago con su nombre', () => {
    expect(renderRow(makeSale({ paymentMethod: 'transfer' }))).toContain('Transferencia');
  });

  it('muestra el total con la moneda', () => {
    expect(renderRow(makeSale({ totalCents: 123456 }))).toContain('$ 1.234,56');
    expect(renderRow(makeSale({ totalCents: 123456 }), 'USD')).toContain('US$ 1.234,56');
  });

  it('marca las anuladas, y solo a ellas', () => {
    const cancelled = renderRow(
      makeSale({ status: 'cancelled', cancelledAt: '2026-01-02T12:00:00.000Z' }),
    );
    const completed = renderRow(makeSale());

    expect(cancelled).toContain('Anulada');
    expect(cancelled).toContain('nx-table__void');
    expect(completed).not.toContain('Anulada');
    expect(completed).not.toContain('nx-table__void');
  });

  it('no se puede ordenar y ofrece el detalle de cada venta', () => {
    const markup = renderRow(makeSale({ id: 's1', number: 1 }));

    expect(markup).not.toContain('data-sort');
    expect(markup).toContain('data-detail="s1"');
    expect(markup).toContain('aria-label="Ver detalle de la venta V-000001"');
  });

  it('escapa el nombre del cliente', () => {
    expect(renderRow(makeSale({ customerName: '"><img src=x>' }))).not.toContain('<img');
  });
});
