import { paginate, searchItems, sortItems, type Page, type SortDirection } from '../domain/list';
import { err, ok, type Result } from '../domain/result';
import type { Customer, CustomerInput, Database, FieldErrors } from '../domain/types';
import { validateCustomer } from '../domain/validation/customer';
import { hasChanges, withActivity, type ServiceDependencies, type ServiceFailure } from './types';

export type CustomerSortKey = 'name' | 'email' | 'company';
export type CustomerFailure = ServiceFailure<keyof CustomerInput>;

export interface CustomerQuery {
  search: string;
  sortKey: CustomerSortKey;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

export interface CustomersService {
  query(options: CustomerQuery): Page<Customer>;
  /** Indica en qué página queda un cliente con esa búsqueda y ese orden, o null si no aparece. */
  pageOf(id: string, options: Omit<CustomerQuery, 'page'>): number | null;
  find(id: string): Customer | null;
  /** No guarda nada: permite revalidar un formulario mientras el usuario escribe. */
  validate(input: CustomerInput, currentId?: string): FieldErrors<keyof CustomerInput>;
  create(input: CustomerInput): Result<Customer, CustomerFailure>;
  update(id: string, input: CustomerInput): Result<Customer, CustomerFailure>;
  remove(id: string): Result<Customer, CustomerFailure>;
}

export function createCustomersService(dependencies: ServiceDependencies): CustomersService {
  const { database, generateId, now } = dependencies;

  function findCustomer(id: string): Customer | null {
    return database.read().customers.find((customer) => customer.id === id) ?? null;
  }

  /** El cliente y su actividad se guardan juntos: o queda todo o no queda nada. */
  function save(
    customer: Customer,
    change: (customers: readonly Customer[]) => readonly Customer[],
    activityMessage: string,
  ): Result<Customer, CustomerFailure> {
    const result = database.update((current: Database) =>
      withActivity(
        { ...current, customers: change(current.customers) },
        dependencies,
        'customer',
        activityMessage,
      ),
    );

    return result.ok ? ok(customer) : err({ kind: 'storage', failure: result.error });
  }

  function listMatching(options: Omit<CustomerQuery, 'page' | 'pageSize'>): readonly Customer[] {
    const { search, sortKey, direction } = options;
    const found = searchItems(database.read().customers, search, (customer) => [
      customer.name,
      customer.email,
      customer.company,
    ]);
    return sortItems(found, (customer) => customer[sortKey], direction);
  }

  return {
    query(options) {
      return paginate(listMatching(options), options.page, options.pageSize);
    },

    pageOf(id, options) {
      const index = listMatching(options).findIndex((customer) => customer.id === id);
      return index === -1 ? null : Math.floor(index / options.pageSize) + 1;
    },

    find: findCustomer,

    validate(input, currentId) {
      const result = validateCustomer(input, database.read().customers, currentId);
      return result.ok ? {} : result.error;
    },

    create(input) {
      const validation = validateCustomer(input, database.read().customers);
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });

      const timestamp = now().toISOString();
      const customer: Customer = {
        id: generateId(),
        ...validation.value,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return save(
        customer,
        (customers) => [customer, ...customers],
        `Cliente ${customer.name} creado`,
      );
    },

    update(id, input) {
      const existing = findCustomer(id);
      if (!existing) return err({ kind: 'not-found' });

      const validation = validateCustomer(input, database.read().customers, id);
      if (!validation.ok) return err({ kind: 'validation', errors: validation.error });
      if (!hasChanges(existing, validation.value)) return ok(existing);

      const customer: Customer = {
        ...existing,
        ...validation.value,
        updatedAt: now().toISOString(),
      };

      return save(
        customer,
        (customers) => customers.map((other) => (other.id === id ? customer : other)),
        `Cliente ${customer.name} actualizado`,
      );
    },

    remove(id) {
      const existing = findCustomer(id);
      if (!existing) return err({ kind: 'not-found' });

      return save(
        existing,
        (customers) => customers.filter((customer) => customer.id !== id),
        `Cliente ${existing.name} eliminado`,
      );
    },
  };
}
