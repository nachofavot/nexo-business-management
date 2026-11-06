import { paginate, searchItems, sortItems, type Page, type SortDirection } from '../domain/list';
import { err, ok, type Result } from '../domain/result';
import { isLowStock } from '../domain/stock';
import type {
  Database,
  FieldErrors,
  Product,
  ProductCategory,
  ProductInput,
} from '../domain/types';
import { validateProduct } from '../domain/validation/product';
import { withActivity, type ServiceDependencies, type ServiceFailure } from './types';

export type ProductSortKey = 'name' | 'sku' | 'category' | 'priceCents' | 'stock';
export type ProductFailure = ServiceFailure<keyof ProductInput>;

export interface ProductQuery {
  search: string;
  /** null muestra todas las categorías. */
  category: ProductCategory | null;
  lowStockOnly: boolean;
  sortKey: ProductSortKey;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

export interface ProductsService {
  query(options: ProductQuery): Page<Product>;
  /** Indica en qué página queda un producto con esos filtros y ese orden, o null si no aparece. */
  pageOf(id: string, options: Omit<ProductQuery, 'page'>): number | null;
  find(id: string): Product | null;
  /** No guarda nada: permite revalidar un formulario mientras el usuario escribe. */
  validate(input: ProductInput, currentId?: string): FieldErrors<keyof ProductInput>;
  create(input: ProductInput): Result<Product, ProductFailure>;
  update(id: string, input: ProductInput): Result<Product, ProductFailure>;
  remove(id: string): Result<Product, ProductFailure>;
}

export function createProductsService(dependencies: ServiceDependencies): ProductsService {
  const { database, generateId, now } = dependencies;

  function findProduct(id: string): Product | null {
    return database.read().products.find((product) => product.id === id) ?? null;
  }

  /** El producto y su actividad se guardan juntos: o queda todo o no queda nada. */
  function save(
    product: Product,
    change: (products: readonly Product[]) => readonly Product[],
    activityMessage: string,
  ): Result<Product, ProductFailure> {
    const result = database.update((current: Database) =>
      withActivity(
        { ...current, products: change(current.products) },
        dependencies,
        'product',
        activityMessage,
      ),
    );

    return result.ok ? ok(product) : err({ kind: 'storage', failure: result.error });
  }

  function listMatching(options: Omit<ProductQuery, 'page' | 'pageSize'>): readonly Product[] {
    const { search, category, lowStockOnly, sortKey, direction } = options;
    const { products, settings } = database.read();
    const threshold = settings.preferences.lowStockThreshold;

    const filtered = products.filter(
      (product) =>
        (category === null || product.category === category) &&
        (!lowStockOnly || isLowStock(product, threshold)),
    );
    const found = searchItems(filtered, search, (product) => [product.name, product.sku]);
    return sortItems(found, (product) => product[sortKey], direction);
  }

  return {
    query(options) {
      return paginate(listMatching(options), options.page, options.pageSize);
    },

    pageOf(id, options) {
      const index = listMatching(options).findIndex((product) => product.id === id);
      return index === -1 ? null : Math.floor(index / options.pageSize) + 1;
    },

    find: findProduct,

    validate(input, currentId) {
      const result = validateProduct(input, database.read().products, currentId);
      return result.ok ? {} : result.error;
    },

    create(input) {
      const validation = validateProduct(input, database.read().products);
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });

      const timestamp = now().toISOString();
      const product: Product = {
        id: generateId(),
        ...validation.value,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return save(product, (products) => [product, ...products], `Producto ${product.name} creado`);
    },

    update(id, input) {
      const existing = findProduct(id);
      if (!existing) return err({ kind: 'not-found' });

      const validation = validateProduct(input, database.read().products, id);
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });

      const product: Product = {
        ...existing,
        ...validation.value,
        updatedAt: now().toISOString(),
      };

      return save(
        product,
        (products) => products.map((other) => (other.id === id ? product : other)),
        `Producto ${product.name} actualizado`,
      );
    },

    remove(id) {
      const existing = findProduct(id);
      if (!existing) return err({ kind: 'not-found' });

      return save(
        existing,
        (products) => products.filter((product) => product.id !== id),
        `Producto ${existing.name} eliminado`,
      );
    },
  };
}
