import { err, ok, type Result } from '../result';
import type { Customer, CustomerData, CustomerInput, FieldErrors } from '../types';
import { compactErrors, emailError, hasErrors, lengthError } from './rules';

const PHONE_PATTERN = /^[\d +()-]{6,20}$/;

function phoneError(phone: string): string | undefined {
  if (phone === '') return undefined;
  if (PHONE_PATTERN.test(phone) && /\d/.test(phone)) return undefined;
  return 'Usá de 6 a 20 caracteres: dígitos, espacios, +, -, ( y ).';
}

export function validateCustomer(
  input: CustomerInput,
  existing: readonly Customer[],
  currentId?: string,
): Result<CustomerData, FieldErrors<keyof CustomerInput>> {
  const data: CustomerData = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    company: input.company.trim(),
  };

  const isEmailTaken = existing.some(
    (customer) => customer.id !== currentId && customer.email.toLowerCase() === data.email,
  );

  const errors = compactErrors<keyof CustomerInput>({
    name: lengthError(data.name, 2, 80),
    email:
      emailError(data.email) ?? (isEmailTaken ? 'Ya hay un cliente con este email.' : undefined),
    phone: phoneError(data.phone),
    company: lengthError(data.company, 0, 80),
  });

  return hasErrors(errors) ? err(errors) : ok(data);
}
