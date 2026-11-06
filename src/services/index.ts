import { createCustomersService, type CustomersService } from './customers';
import type { ServiceDependencies } from './types';

export interface Services {
  customers: CustomersService;
}

export function createServices(dependencies: ServiceDependencies): Services {
  return { customers: createCustomersService(dependencies) };
}
