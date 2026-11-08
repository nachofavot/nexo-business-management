import { describe, expect, it } from 'vitest';
import { makeProduct } from '../../testing/fixtures';
import { PRODUCT_CATEGORIES, type ProductInput } from '../types';
import { validateProduct } from './product';

const validInput: ProductInput = {
  name: 'Monitor',
  sku: 'mon-1',
  category: 'Periféricos',
  price: '1234,56',
  stock: '0',
};

function errorsFor(overrides: Partial<ProductInput>) {
  const result = validateProduct({ ...validInput, ...overrides }, []);
  return result.ok ? {} : result.error;
}

describe('validateProduct', () => {
  it('convierte precio y stock y guarda el SKU en mayúsculas', () => {
    expect(validateProduct(validInput, [])).toEqual({
      ok: true,
      value: {
        name: 'Monitor',
        sku: 'MON-1',
        category: 'Periféricos',
        priceCents: 123456,
        stock: 0,
      },
    });
  });

  it.each([
    ['name', 'A'],
    ['name', 'x'.repeat(81)],
    ['sku', 'ab'],
    ['sku', 'a b c'],
    ['sku', 'A'.repeat(21)],
    ['category', 'Inventada'],
    ['price', ''],
    ['price', '0'],
    ['price', '1.234,56'],
    ['price', '100000000'],
    ['stock', ''],
    ['stock', '-1'],
    ['stock', '1.5'],
    ['stock', '1000000'],
  ])('marca error en %s con "%s"', (field, value) => {
    expect(errorsFor({ [field]: value })).toHaveProperty(field);
  });

  it.each([
    ['name', 'Al'],
    ['name', 'x'.repeat(80)],
    ['sku', 'ABC'],
    ['sku', 'A'.repeat(20)],
    ['price', '99999999.99'],
    ['price', '0.01'],
    ['stock', '999999'],
    ...PRODUCT_CATEGORIES.map((category) => ['category', category]),
  ])('acepta %s con "%s"', (field, value) => {
    expect(errorsFor({ [field as string]: value })).toEqual({});
  });

  // Un único mensaje para todo error de precio no decía qué corregir.
  it.each([
    ['', 'Ingresá el precio.'],
    ['   ', 'Ingresá el precio.'],
    ['abc', 'Ingresá solo números, con coma o punto para los decimales. Por ejemplo, 1234,56.'],
    [
      '1.234,56',
      'Ingresá solo números, con coma o punto para los decimales. Por ejemplo, 1234,56.',
    ],
    ['-5', 'Ingresá solo números, con coma o punto para los decimales. Por ejemplo, 1234,56.'],
    ['12,345', 'Usá hasta 2 decimales, sin separador de miles.'],
    ['1.234', 'Usá hasta 2 decimales, sin separador de miles.'],
    ['0', 'El precio tiene que ser mayor que 0.'],
    ['0,00', 'El precio tiene que ser mayor que 0.'],
    ['100000000', 'El precio máximo es 99.999.999,99.'],
    ['99999999999999999999', 'El precio máximo es 99.999.999,99.'],
  ])('con el precio "%s" dice "%s"', (price, message) => {
    expect(errorsFor({ price })).toEqual({ price: message });
  });

  it('reúne todos los errores', () => {
    const errors = errorsFor({ name: '', sku: '', category: '', price: '', stock: '' });

    expect(Object.keys(errors).sort()).toEqual(['category', 'name', 'price', 'sku', 'stock']);
  });

  it('rechaza un SKU ya usado sin distinguir mayúsculas', () => {
    const existing = [makeProduct({ id: 'p1', sku: 'mon-1' })];

    const result = validateProduct({ ...validInput, sku: 'MON-1' }, existing);

    expect(result.ok ? {} : result.error).toHaveProperty('sku');
  });

  it('acepta el mismo SKU al editar a su dueño', () => {
    const existing = [makeProduct({ id: 'p1', sku: 'MON-1' })];

    expect(validateProduct(validInput, existing, 'p1').ok).toBe(true);
  });
});
