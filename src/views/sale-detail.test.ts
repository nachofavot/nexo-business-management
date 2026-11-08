import { describe, expect, it } from 'vitest';
import type { Sale } from '../domain/types';
import { makeSale, makeSaleItem } from '../testing/fixtures';
import { formatMoney } from '../ui/format';
import { saleDetailContent } from './sale-detail';

function render(sale: Sale): string {
  return saleDetailContent(sale, { currency: 'ARS', titleId: 'detail-title' }).value;
}

// Intl separa algunos datos con espacios duros, que no se distinguen a simple vista.
const withPlainSpaces = (text: string) => text.replace(/\s/g, ' ');

const saleWithDiscount = makeSale({
  number: 7,
  items: [
    makeSaleItem({
      productId: 'p1',
      productName: 'Monitor',
      sku: 'MON-1',
      unitPriceCents: 1000,
      quantity: 2,
    }),
    makeSaleItem({
      productId: 'p2',
      productName: 'Teclado',
      sku: 'TEC-1',
      unitPriceCents: 2500,
      quantity: 1,
    }),
  ],
  discountPercent: 10,
  taxPercent: 21,
  subtotalCents: 4500,
  discountCents: 450,
  taxCents: 851,
  totalCents: 4901,
});

describe('saleDetailContent', () => {
  it('titula el modal con el número de la venta', () => {
    expect(render(saleWithDiscount)).toMatch(/id="detail-title"[^>]*>\s*Venta V-000007/);
  });

  it('muestra cada línea con su subtotal', () => {
    const markup = render(saleWithDiscount);

    for (const text of ['Monitor', 'MON-1', 'Teclado', 'TEC-1']) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain(formatMoney(1000, 'ARS'));
    expect(markup).toContain(formatMoney(2000, 'ARS'));
    expect(markup).toContain(formatMoney(2500, 'ARS'));
  });

  it('muestra el descuento en negativo, el IVA y el total', () => {
    const markup = render(saleWithDiscount);

    expect(markup).toContain('Descuento (10 %)');
    expect(markup).toContain(formatMoney(-450, 'ARS'));
    expect(withPlainSpaces(markup)).toContain('IVA (21 %)');
    expect(markup).toContain(formatMoney(851, 'ARS'));
    expect(markup).toContain(formatMoney(4901, 'ARS'));
  });

  it('muestra un descuento de 0 sin signo menos', () => {
    const markup = withPlainSpaces(render(makeSale({ discountPercent: 0, discountCents: 0 })));

    expect(markup).toContain('Descuento (0 %)');
    expect(markup).not.toContain('-$');
  });

  it('usa el IVA guardado en la venta', () => {
    expect(withPlainSpaces(render(makeSale({ taxPercent: 10.5 })))).toContain('IVA (10,5 %)');
  });

  it('ofrece anular una venta completada', () => {
    const markup = render(makeSale());

    expect(markup).toContain('data-action="cancel-sale"');
    // "Anular venta" abre la confirmación.
    expect(markup).toMatch(/data-action="cancel-sale"[^>]*aria-haspopup="dialog"/);
    expect(markup).not.toContain('Anulada el');
  });

  it('muestra cuándo se anuló, sin ofrecer anularla otra vez', () => {
    const markup = withPlainSpaces(
      render(makeSale({ status: 'cancelled', cancelledAt: '2026-11-05T18:30:00.000Z' })),
    );

    expect(markup).toContain('Anulada el 05/11/2026, 15:30');
    expect(markup).not.toContain('data-action="cancel-sale"');
  });

  it('escapa los nombres guardados', () => {
    const sale = makeSale({
      customerName: '"><img src=x>',
      items: [makeSaleItem({ productName: '<img src=x>' })],
    });

    expect(render(sale)).not.toContain('<img');
  });
});
