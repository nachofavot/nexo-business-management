import { createCustomersService, type CustomersService } from './customers';
import { createProductsService, type ProductsService } from './products';
import { createSalesService, type SalesService } from './sales';
import type { ServiceDependencies } from './types';

export interface Services {
  customers: CustomersService;
  products: ProductsService;
  sales: SalesService;
}

export function createServices(dependencies: ServiceDependencies): Services {
  return {
    customers: createCustomersService(dependencies),
    products: createProductsService(dependencies),
    sales: createSalesService(dependencies),
  };
}
