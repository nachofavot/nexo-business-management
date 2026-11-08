import { describe, expect, it } from 'vitest';
import {
  lineControlNames,
  pageAnnouncement,
  periodAnnouncement,
  storageFailureMessage,
} from './messages';

describe('storageFailureMessage', () => {
  it('explica que el almacenamiento está lleno', () => {
    expect(storageFailureMessage('quota-exceeded')).toBe(
      'No se pudo guardar. El almacenamiento del navegador está lleno.',
    );
  });

  it.each(['write-failed', 'invalid-data'] as const)('da un mensaje general con %s', (failure) => {
    expect(storageFailureMessage(failure)).toBe('No se pudo guardar.');
  });
});

// Al cambiar de página o de período, el contenido cambia sin que el foco se mueva: los lectores
// de pantalla no se enteraban.
describe('pageAnnouncement', () => {
  it('dice la página y el total', () => {
    expect(pageAnnouncement(2, 5)).toBe('Página 2 de 5');
  });
});

describe('periodAnnouncement', () => {
  it.each([
    ['7d', 'Reportes de los últimos 7 días'],
    ['30d', 'Reportes de los últimos 30 días'],
    ['90d', 'Reportes de los últimos 90 días'],
    ['12m', 'Reportes de los últimos 12 meses'],
  ] as const)('%s: %s', (period, expected) => {
    expect(periodAnnouncement(period)).toBe(expected);
  });
});

// Con tres líneas, había tres controles llamados "Producto" y tres "Cantidad".
describe('lineControlNames', () => {
  it('nombra cada control con el número de su línea', () => {
    expect(lineControlNames(3)).toEqual({
      product: 'Producto de la línea 3',
      quantity: 'Cantidad de la línea 3',
      remove: 'Quitar la línea 3',
      lineSuffix: ' de la línea 3',
    });
  });
});
