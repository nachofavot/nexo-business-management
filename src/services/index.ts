import { createCustomersService, type CustomersService } from './customers';
import { createProductsService, type ProductsService } from './products';
import type { ServiceDependencies } from './types';

export interface Services {
  customers: CustomersService;
  products: ProductsService;
}

export function createServices(dependencies: ServiceDependencies): Services {
  return {
    customers: createCustomersService(dependencies),
    products: createProductsService(dependencies),
  };
}
