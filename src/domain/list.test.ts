import { describe, expect, it } from 'vitest';
import { paginate, searchItems, sortItems } from './list';

describe('searchItems', () => {
  const people = [
    { name: 'García', company: 'Aurora Demo' },
    { name: 'Núñez', company: 'Cumbre Demo' },
  ];
  const fields = (person: (typeof people)[number]) => [person.name, person.company];

  it('ignora tildes y mayúsculas', () => {
    expect(searchItems(people, 'garcia', fields)).toEqual([people[0]]);
  });

  it('recorta espacios y trata la ñ como n', () => {
    expect(searchItems(people, ' NUNEZ ', fields)).toEqual([people[1]]);
  });

  it('busca también en los demás campos', () => {
    expect(searchItems(people, 'cumbre', fields)).toEqual([people[1]]);
  });

  it.each(['', '   '])('devuelve todos con la búsqueda "%s"', (query) => {
    expect(searchItems(people, query, fields)).toEqual(people);
  });

  it('devuelve una lista vacía sin coincidencias', () => {
    expect(searchItems(people, 'xyz', fields)).toEqual([]);
  });
});

describe('sortItems', () => {
  const identity = <T extends string | number>(value: T) => value;

  it('no manda las palabras con tilde al final', () => {
    expect(sortItems(['Bravo', 'Álvarez', 'Zeta'], identity, 'asc')).toEqual([
      'Álvarez',
      'Bravo',
      'Zeta',
    ]);
  });

  it('ubica la ñ entre la n y la o', () => {
    expect(sortItems(['oso', 'ñandú', 'nube'], identity, 'asc')).toEqual(['nube', 'ñandú', 'oso']);
  });

  it('no distingue mayúsculas', () => {
    expect(sortItems(['Bea', 'ana'], identity, 'asc')).toEqual(['ana', 'Bea']);
  });

  it('ordena números por valor en ambos sentidos', () => {
    expect(sortItems([10, 9, 100], identity, 'asc')).toEqual([9, 10, 100]);
    expect(sortItems([10, 9, 100], identity, 'desc')).toEqual([100, 10, 9]);
  });

  it('no modifica la lista original', () => {
    const original = [2, 1];

    sortItems(original, identity, 'asc');

    expect(original).toEqual([2, 1]);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  it('devuelve la primera página con los totales', () => {
    const page = paginate(items, 1, 10);

    expect(page.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page).toMatchObject({ page: 1, pageCount: 3, totalItems: 23 });
  });

  it('devuelve los elementos restantes en la última página', () => {
    expect(paginate(items, 3, 10).items).toEqual([21, 22, 23]);
  });

  it('pasa a la última página si la pedida ya no existe', () => {
    expect(paginate(items, 99, 10)).toMatchObject({ page: 3, items: [21, 22, 23] });
  });

  it('pasa a la primera página con un número menor que 1', () => {
    expect(paginate(items, 0, 10).page).toBe(1);
  });

  it('no agrega una página vacía con una cantidad exacta', () => {
    expect(paginate(items.slice(0, 20), 1, 10).pageCount).toBe(2);
  });

  it('devuelve una página vacía sin elementos', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, totalItems: 0 });
  });
});
