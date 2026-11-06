import type { Customer, CustomerInput } from '../domain/types';
import type { FieldDefinition } from '../ui/components/form-field';

// Se cargan datos de terceros: el navegador no debe sugerir los del propio usuario.
export const CUSTOMER_FIELDS: readonly FieldDefinition<keyof CustomerInput>[] = [
  { name: 'name', label: 'Nombre', required: true, autocomplete: 'off' },
  { name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'off' },
  { name: 'phone', label: 'Teléfono', type: 'tel', autocomplete: 'off' },
  { name: 'company', label: 'Empresa', autocomplete: 'off' },
];

export function toCustomerInput(customer: Customer | null): CustomerInput {
  return {
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    company: customer?.company ?? '',
  };
}
