import { describe, expect, it } from 'vitest';
import { compareWithPreviousMonth } from '../domain/reports';
import { calculateTotals } from '../domain/sales';
import { isLowStock, isOutOfStock } from '../domain/stock';
import { PRODUCT_CATEGORIES } from '../domain/types';
import { isDatabase } from './schema';
import { createSeedDatabase } from './seed';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const now = new Date(2026, 10, 5, 12);
const database = createSeedDatabase(now);
const timeOf = (isoDate: string) => new Date(isoDate).getTime();

describe('createSeedDatabase', () => {
  it('da los mismos datos con la misma fecha', () => {
    expect(createSeedDatabase(now)).toEqual(database);
  });

  it('tiene una estructura válida', () => {
    expect(isDatabase(database)).toBe(true);
  });

  it('tiene las cantidades previstas', () => {
    expect(database.customers).toHaveLength(24);
    expect(database.products).toHaveLength(32);
    expect(database.sales).toHaveLength(350);
    expect(database.nextSaleNumber).toBe(351);
  });

  it.each(PRODUCT_CATEGORIES)('tiene al menos 4 productos en %s', (category) => {
    const products = database.products.filter((product) => product.category === category);

    expect(products.length).toBeGreaterThanOrEqual(4);
  });

  it('usa precios dentro del rango previsto', () => {
    for (const { priceCents } of database.products) {
      expect(priceCents).toBeGreaterThanOrEqual(800_000);
      expect(priceCents).toBeLessThanOrEqual(250_000_000);
    }
  });

  it('cada venta apunta a un cliente y productos existentes, con los datos copiados', () => {
    for (const sale of database.sales) {
      const customer = database.customers.find(({ id }) => id === sale.customerId);
      expect(sale.customerName).toBe(customer?.name);

      for (const item of sale.items) {
        const product = database.products.find(({ id }) => id === item.productId);
        expect(item).toMatchObject({
          productName: product?.name,
          sku: product?.sku,
          category: product?.category,
          unitPriceCents: product?.priceCents,
        });
      }
    }
  });

  it('cada venta tiene de 1 a 4 productos distintos, con cantidades de 1 a 5', () => {
    for (const { items } of database.sales) {
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.length).toBeLessThanOrEqual(4);
      expect(new Set(items.map(({ productId }) => productId)).size).toBe(items.length);

      for (const { quantity } of items) {
        expect(quantity).toBeGreaterThanOrEqual(1);
        expect(quantity).toBeLessThanOrEqual(5);
      }
    }
  });

  it('los importes de cada venta coinciden con sus líneas', () => {
    for (const sale of database.sales) {
      expect(calculateTotals(sale.items, sale.discountPercent, sale.taxPercent)).toEqual({
        subtotalCents: sale.subtotalCents,
        discountCents: sale.discountCents,
        taxCents: sale.taxCents,
        totalCents: sale.totalCents,
      });
    }
  });

  it('ordena las ventas de la más nueva a la más vieja, con números del 350 al 1', () => {
    expect(database.sales[0]?.number).toBe(350);
    expect(database.sales[349]?.number).toBe(1);

    database.sales.slice(1).forEach((sale, index) => {
      const newer = database.sales[index];
      expect(sale.number).toBe((newer?.number ?? 0) - 1);
      expect(timeOf(sale.createdAt)).toBeLessThanOrEqual(timeOf(newer?.createdAt ?? ''));
    });
  });

  it('todas las fechas están dentro de los últimos 366 días', () => {
    for (const { createdAt, cancelledAt } of database.sales) {
      expect(timeOf(createdAt)).toBeLessThanOrEqual(now.getTime());
      expect(timeOf(createdAt)).toBeGreaterThanOrEqual(now.getTime() - 366 * DAY_MS);

      if (cancelledAt !== null) {
        expect(timeOf(cancelledAt)).toBeGreaterThanOrEqual(timeOf(createdAt));
        expect(timeOf(cancelledAt)).toBeLessThanOrEqual(now.getTime());
      }
    }
  });

  it('reparte las ventas en al menos 10 de los últimos 12 meses', () => {
    const months = new Set(database.sales.map(({ createdAt }) => createdAt.slice(0, 7)));

    expect(months.size).toBeGreaterThanOrEqual(10);
  });

  it('anula algunas ventas, sin llegar al 6 %, y nunca las 3 más recientes', () => {
    const cancelled = database.sales.filter(({ status }) => status === 'cancelled');

    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.length).toBeLessThanOrEqual(21);
    expect(database.sales.slice(0, 3).map(({ status }) => status)).toEqual([
      'completed',
      'completed',
      'completed',
    ]);
  });

  it('incluye productos con stock bajo y sin stock', () => {
    const inStockButLow = database.products.filter(
      (product) => isLowStock(product, 5) && !isOutOfStock(product),
    );

    expect(inStockButLow.length).toBeGreaterThanOrEqual(3);
    expect(database.products.filter(isOutOfStock).length).toBeGreaterThanOrEqual(1);
  });

  it('usa solo datos claramente ficticios', () => {
    const emails = database.customers.map(({ email }) => email);

    expect(new Set(emails).size).toBe(24);
    for (const email of emails) {
      expect(email).toMatch(/^[a-z]+\.[a-z]+@example\.com$/);
    }
    for (const { company } of database.customers) {
      expect(company === '' || company.includes('Demo')).toBe(true);
    }
    expect(database.settings.profile).toEqual({
      displayName: 'Usuario Demo',
      email: 'demo@example.com',
      role: 'Administrador',
    });
  });

  it('usa los valores iniciales de preferencias', () => {
    expect(database.settings.preferences).toEqual({
      currency: 'ARS',
      taxPercent: 21,
      lowStockThreshold: 5,
      tableDensity: 'comfortable',
      accent: 'violet',
    });
  });

  it('registra la actividad de las 8 ventas más recientes', () => {
    expect(database.activity).toHaveLength(8);
    expect(database.activity[0]).toMatchObject({
      type: 'sale',
      message: 'Venta V-000350 registrada',
      createdAt: database.sales[0]?.createdAt,
    });
    expect(database.activity[7]?.message).toBe('Venta V-000343 registrada');
  });

  it('ocupa menos de 1.000.000 de caracteres', () => {
    expect(JSON.stringify(database).length).toBeLessThan(1_000_000);
  });

  it('mueve las fechas junto con la fecha actual', () => {
    const later = new Date(2026, 11, 5, 12);

    const { sales } = createSeedDatabase(later);

    expect(timeOf(sales[0]?.createdAt ?? '')).toBe(later.getTime() - 5 * MINUTE_MS);
  });

  it('tiene ventas del mes aunque se abra minutos después de la medianoche del día 1', () => {
    const firstOfMonth = new Date(2026, 11, 1, 0, 2);

    const { sales } = createSeedDatabase(firstOfMonth);
    const { current } = compareWithPreviousMonth(sales, firstOfMonth);

    expect(current.salesCount).toBeGreaterThanOrEqual(3);
  });
});
