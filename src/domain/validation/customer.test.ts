import { describe, expect, it } from 'vitest';
import { makeCustomer } from '../../testing/fixtures';
import type { CustomerInput } from '../types';
import { validateCustomer } from './customer';

const validInput: CustomerInput = {
  name: 'Ana Gómez',
  email: 'ana@example.com',
  phone: '+54 11 5555-0101',
  company: '',
};

function errorsFor(overrides: Partial<CustomerInput>) {
  const result = validateCustomer({ ...validInput, ...overrides }, []);
  return result.ok ? {} : result.error;
}

describe('validateCustomer', () => {
  it('recorta los textos y guarda el email en minúsculas', () => {
    const result = validateCustomer(
      {
        name: ' Ana Gómez ',
        email: ' ANA@Example.com ',
        phone: ' +54 11 5555-0101 ',
        company: ' Aurora Demo ',
      },
      [],
    );

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Ana Gómez',
        email: 'ana@example.com',
        phone: '+54 11 5555-0101',
        company: 'Aurora Demo',
      },
    });
  });

  it.each([
    ['name', 'A'],
    ['name', '   '],
    ['name', 'x'.repeat(81)],
    ['email', ''],
    ['email', 'ana@example'],
    ['email', `${'a'.repeat(109)}@example.com`],
    ['phone', '12345'],
    ['phone', 'abc123'],
    ['phone', '------'],
    ['phone', '1'.repeat(21)],
    ['company', 'x'.repeat(81)],
  ])('marca error en %s con "%s"', (field, value) => {
    expect(errorsFor({ [field]: value })).toHaveProperty(field);
  });

  it.each([
    ['name', 'Al'],
    ['name', 'x'.repeat(80)],
    ['email', `${'a'.repeat(108)}@example.com`],
    ['phone', ''],
    ['phone', '1'.repeat(20)],
    ['company', ''],
    ['company', 'x'.repeat(80)],
  ])('acepta %s con "%s"', (field, value) => {
    expect(errorsFor({ [field]: value })).toEqual({});
  });

  it('rechaza un email ya usado sin distinguir mayúsculas', () => {
    const existing = [makeCustomer({ id: 'c1', email: 'ana@example.com' })];

    const result = validateCustomer({ ...validInput, email: 'ANA@example.com' }, existing);

    expect(result.ok ? {} : result.error).toHaveProperty('email');
  });

  it('acepta el mismo email al editar a su dueño', () => {
    const existing = [makeCustomer({ id: 'c1', email: 'ana@example.com' })];

    const result = validateCustomer(validInput, existing, 'c1');

    expect(result.ok).toBe(true);
  });

  it('reúne todos los errores', () => {
    expect(Object.keys(errorsFor({ name: '', email: '' })).sort()).toEqual(['email', 'name']);
  });
});
