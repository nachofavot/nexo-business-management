import { createCustomersService, type CustomersService } from './customers';
import { createProductsService, type ProductsService } from './products';
import { createSalesService, type SalesService } from './sales';
import { createSettingsService, type SettingsService } from './settings';
import type { ServiceDependencies } from './types';

export interface Services {
  customers: CustomersService;
  products: ProductsService;
  sales: SalesService;
  settings: SettingsService;
}

export function createServices(dependencies: ServiceDependencies): Services {
  return {
    customers: createCustomersService(dependencies),
    products: createProductsService(dependencies),
    sales: createSalesService(dependencies),
    settings: createSettingsService(dependencies),
  };
}
