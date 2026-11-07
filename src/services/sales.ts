import type { StorageFailure } from '../data/database';
import { endOfDay, parseDateInput } from '../domain/dates';
import { paginate, searchItems, sortItems, type Page } from '../domain/list';
import { err, ok, type Result } from '../domain/result';
import {
  buildSale,
  cancelSale,
  formatSaleNumber,
  previewSale,
  type SalePreview,
} from '../domain/sales';
import { decreaseStock, restoreStock, type StockChange } from '../domain/stock';
import type { Database, Sale, SaleErrors, SaleInput, SaleItem, SaleStatus } from '../domain/types';
import { validateSale } from '../domain/validation/sale';
import { withActivity, type ServiceDependencies } from './types';

export interface SaleQuery {
  search: string;
  /** null muestra todos los estados. */
  status: SaleStatus | null;
  /** Texto de <input type="date">; '' no pone límite. */
  from: string;
  to: string;
  page: number;
  pageSize: number;
}

// Cada operación declara solo lo que le puede pasar.
export type RegisterSaleFailure =
  { kind: 'validation'; errors: SaleErrors } | { kind: 'storage'; failure: StorageFailure };
export type CancelSaleFailure =
  | { kind: 'not-found' }
  | { kind: 'already-cancelled' }
  | { kind: 'storage'; failure: StorageFailure };

export interface SalesService {
  query(options: SaleQuery): Page<Sale>;
  /** Indica en qué página queda una venta con esos filtros, o null si no aparece. */
  pageOf(id: string, options: Omit<SaleQuery, 'page'>): number | null;
  find(id: string): Sale | null;
  /** No guarda nada: permite revalidar el formulario mientras el usuario escribe. */
  validate(input: SaleInput): SaleErrors;
  /** Los totales que se muestran en vivo, con el IVA de la configuración. */
  preview(input: SaleInput): SalePreview;
  register(input: SaleInput): Result<Sale, RegisterSaleFailure>;
  cancel(id: string): Result<Sale, CancelSaleFailure>;
}

function stockChanges(items: readonly SaleItem[]): readonly StockChange[] {
  return items.map(({ productId, quantity }) => ({ productId, quantity }));
}

export function createSalesService(dependencies: ServiceDependencies): SalesService {
  const { database, generateId, now } = dependencies;

  function findSale(id: string): Sale | null {
    return database.read().sales.find((sale) => sale.id === id) ?? null;
  }

  function listMatching(options: Omit<SaleQuery, 'page' | 'pageSize'>): readonly Sale[] {
    const { search, status, from, to } = options;
    const start = parseDateInput(from)?.getTime() ?? null;
    const toDate = parseDateInput(to);
    const end = toDate ? endOfDay(toDate).getTime() : null;

    const filtered = database.read().sales.filter((sale) => {
      const time = new Date(sale.createdAt).getTime();
      return (
        (status === null || sale.status === status) &&
        (start === null || time >= start) &&
        (end === null || time <= end)
      );
    });
    const found = searchItems(filtered, search, (sale) => [
      formatSaleNumber(sale.number),
      sale.customerName,
    ]);
    // El número es único y se asigna en orden de registro; dos ventas pueden compartir createdAt.
    return sortItems(found, (sale) => sale.number, 'desc');
  }

  /** Todo se arma con una sola lectura y se guarda en una sola escritura: queda todo o nada. */
  function save(next: Database): Result<Database, StorageFailure> {
    return database.replace(next);
  }

  return {
    query(options) {
      return paginate(listMatching(options), options.page, options.pageSize);
    },

    pageOf(id, options) {
      const index = listMatching(options).findIndex((sale) => sale.id === id);
      return index === -1 ? null : Math.floor(index / options.pageSize) + 1;
    },

    find: findSale,

    validate(input) {
      const { customers, products } = database.read();
      const result = validateSale(input, { customers, products });
      return result.ok ? {} : result.error;
    },

    preview(input) {
      const { products, settings } = database.read();
      return previewSale(input, products, settings.preferences.taxPercent);
    },

    register(input) {
      // validateSale y decreaseStock van antes de guardar porque update no puede devolver
      // errores del dominio: si algo falla, no se escribe nada.
      const current = database.read();
      const validation = validateSale(input, {
        customers: current.customers,
        products: current.products,
      });
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });

      const timestamp = now();
      const sale = buildSale(validation.value, {
        id: generateId(),
        number: current.nextSaleNumber,
        taxPercent: current.settings.preferences.taxPercent,
        now: timestamp,
      });
      const products = decreaseStock(current.products, stockChanges(sale.items), timestamp);
      // No puede pasar con la misma lectura que ya validó el stock, pero si pasara, no se guarda.
      if (!products.ok) {
        return err({
          kind: 'validation',
          errors: { lines: 'El stock cambió. Revisá las cantidades.' },
        });
      }

      // Va primera: el Dashboard y el acceso demo suponen que la primera es la más nueva.
      const result = save(
        withActivity(
          {
            ...current,
            sales: [sale, ...current.sales],
            products: products.value,
            nextSaleNumber: current.nextSaleNumber + 1,
          },
          dependencies,
          'sale',
          `Venta ${formatSaleNumber(sale.number)} registrada`,
        ),
      );
      return result.ok ? ok(sale) : err({ kind: 'storage', failure: result.error });
    },

    cancel(id) {
      const current = database.read();
      const sale = current.sales.find((candidate) => candidate.id === id);
      if (!sale) return err({ kind: 'not-found' });

      const timestamp = now();
      const cancelled = cancelSale(sale, timestamp);
      if (!cancelled.ok) return err({ kind: 'already-cancelled' });

      const result = save(
        withActivity(
          {
            ...current,
            sales: current.sales.map((other) => (other.id === id ? cancelled.value : other)),
            products: restoreStock(current.products, stockChanges(sale.items), timestamp),
          },
          dependencies,
          'sale',
          `Venta ${formatSaleNumber(sale.number)} anulada`,
        ),
      );
      return result.ok ? ok(cancelled.value) : err({ kind: 'storage', failure: result.error });
    },
  };
}
