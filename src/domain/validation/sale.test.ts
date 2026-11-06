import { describe, expect, it } from 'vitest';
import { makeCustomer, makeProduct } from '../../testing/fixtures';
import type { SaleInput } from '../types';
import { validateSale } from './sale';

const customer = makeCustomer({ id: 'c1' });
const p1 = makeProduct({ id: 'p1', stock: 5 });
const p2 = makeProduct({ id: 'p2', stock: 1 });
const context = { customers: [customer], products: [p1, p2] };

const validInput: SaleInput = {
  customerId: 'c1',
  lines: [{ productId: 'p1', quantity: '2' }],
  discountPercent: '10',
  paymentMethod: 'card',
};

function errorsFor(overrides: Partial<SaleInput>) {
  const result = validateSale({ ...validInput, ...overrides }, context);
  return result.ok ? {} : result.error;
}

describe('validateSale', () => {
  it('devuelve el cliente y los productos completos', () => {
    expect(validateSale(validInput, context)).toEqual({
      ok: true,
      value: {
        customer,
        lines: [{ product: p1, quantity: 2 }],
        discountPercent: 10,
        paymentMethod: 'card',
      },
    });
  });

  it('rechaza un cliente inexistente', () => {
    expect(errorsFor({ customerId: 'nope' })).toHaveProperty('customerId');
  });

  it('rechaza una venta sin líneas', () => {
    expect(errorsFor({ lines: [] })).toHaveProperty('lines');
  });

  it.each(['', 'nope'])('marca la línea con el producto "%s"', (productId) => {
    const errors = errorsFor({ lines: [{ productId, quantity: '1' }] });

    expect(errors).toHaveProperty(['lineErrors', 0]);
  });

  it('marca la línea repetida, no la primera', () => {
    const errors = errorsFor({
      lines: [
        { productId: 'p1', quantity: '1' },
        { productId: 'p1', quantity: '1' },
      ],
    });

    expect(errors).toHaveProperty(['lineErrors', 1]);
    expect(errors).not.toHaveProperty(['lineErrors', 0]);
  });

  it.each(['', '0', '1.5', '10000', '6'])('marca la línea con la cantidad "%s"', (quantity) => {
    const errors = errorsFor({ lines: [{ productId: 'p1', quantity }] });

    expect(errors).toHaveProperty(['lineErrors', 0]);
  });

  it('limita la cantidad a 9.999 aunque haya más stock', () => {
    const plenty = makeProduct({ id: 'p3', stock: 999_999 });
    const withQuantity = (quantity: string): SaleInput => ({
      ...validInput,
      lines: [{ productId: 'p3', quantity }],
    });
    const plentyContext = { customers: [customer], products: [plenty] };

    expect(validateSale(withQuantity('9999'), plentyContext).ok).toBe(true);
    expect(validateSale(withQuantity('10000'), plentyContext).ok).toBe(false);
  });

  it('acepta exactamente el stock disponible', () => {
    expect(errorsFor({ lines: [{ productId: 'p1', quantity: '5' }] })).toEqual({});
  });

  it.each(['', '-1', '5.5', '101'])('rechaza el descuento "%s"', (discountPercent) => {
    expect(errorsFor({ discountPercent })).toHaveProperty('discountPercent');
  });

  it.each(['0', '100'])('acepta el descuento "%s"', (discountPercent) => {
    expect(errorsFor({ discountPercent })).toEqual({});
  });

  it('rechaza un medio de pago desconocido', () => {
    expect(errorsFor({ paymentMethod: 'crypto' })).toHaveProperty('paymentMethod');
  });

  it('reúne todos los errores', () => {
    const errors = errorsFor({ customerId: 'nope', paymentMethod: 'crypto' });

    expect(Object.keys(errors).sort()).toEqual(['customerId', 'paymentMethod']);
  });
});
