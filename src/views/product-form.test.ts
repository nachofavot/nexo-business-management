import { describe, expect, it } from 'vitest';
import { PRODUCT_CATEGORIES } from '../domain/types';
import { validateProduct } from '../domain/validation/product';
import { makeProduct } from '../testing/fixtures';
import { formField } from '../ui/components/form-field';
import { PRODUCT_FIELDS, toProductInput } from './product-form';

function fieldNamed(name: string) {
  const field = PRODUCT_FIELDS.find((candidate) => candidate.name === name);
  if (!field) throw new Error(`No existe el campo ${name}`);
  return field;
}

describe('toProductInput', () => {
  it('sin producto deja todos los campos vacíos', () => {
    expect(toProductInput(null)).toEqual({
      name: '',
      sku: '',
      category: '',
      price: '',
      stock: '',
    });
  });

  it('precarga el precio sin símbolo ni separador de miles, y el stock aunque sea 0', () => {
    const input = toProductInput(makeProduct({ priceCents: 123456, stock: 0 }));

    expect(input).toEqual({
      name: 'Monitor',
      sku: 'MON-1',
      category: 'Periféricos',
      price: '1234,56',
      stock: '0',
    });
  });

  it('guardar sin tocar nada conserva los mismos datos', () => {
    const product = makeProduct({ priceCents: 123456, stock: 0 });

    expect(validateProduct(toProductInput(product), [product], product.id)).toEqual({
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
});

describe('PRODUCT_FIELDS', () => {
  it('pide los cinco datos, todos obligatorios', () => {
    expect(PRODUCT_FIELDS.map(({ name }) => name)).toEqual([
      'name',
      'sku',
      'category',
      'price',
      'stock',
    ]);
    expect(PRODUCT_FIELDS.every(({ required }) => required === true)).toBe(true);
  });

  it('la categoría ofrece una opción vacía y las categorías fijas', () => {
    const category = fieldNamed('category');

    expect(category.type).toBe('select');
    expect(category.options?.[0]).toEqual({ value: '', label: 'Elegí una categoría' });
    expect(category.options?.slice(1).map(({ value }) => value)).toEqual(PRODUCT_CATEGORIES);
    expect(category.options?.slice(1).map(({ label }) => label)).toEqual(PRODUCT_CATEGORIES);
  });

  it('un producto nuevo empieza sin categoría y uno existente con la suya', () => {
    const category = fieldNamed('category');
    const selected = (value: string): string =>
      formField(category, { idPrefix: 'p', value }).value.match(
        /<option[^>]*selected[^>]*>\s*([^<]*?)\s*</,
      )?.[1] ?? '';

    expect(selected('')).toBe('Elegí una categoría');
    expect(selected('Redes')).toBe('Redes');
  });

  it('muestra el teclado numérico adecuado en precio y stock', () => {
    expect(fieldNamed('price').inputMode).toBe('decimal');
    expect(fieldNamed('stock').inputMode).toBe('numeric');
  });

  it('el navegador no sugiere datos propios en los campos de texto', () => {
    const textFields = PRODUCT_FIELDS.filter(({ type }) => type !== 'select');

    expect(textFields.map(({ autocomplete }) => autocomplete)).toEqual([
      'off',
      'off',
      'off',
      'off',
    ]);
  });
});
