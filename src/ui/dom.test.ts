import { describe, expect, it } from 'vitest';
import { syncAttribute } from './dom';

/** Un elemento mínimo que anota cada escritura de atributos. */
function fakeElement(initial: Record<string, string> = {}) {
  const attributes = new Map(Object.entries(initial));
  const writes: string[] = [];

  return {
    writes,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute(name: string, value: string) {
      writes.push(`set ${name}=${value}`);
      attributes.set(name, value);
    },
    removeAttribute(name: string) {
      writes.push(`remove ${name}`);
      attributes.delete(name);
    },
  };
}

describe('syncAttribute', () => {
  it('pone el atributo si cambia', () => {
    const element = fakeElement({ min: '2026-11-01' });

    syncAttribute(element, 'min', '2026-11-03');

    expect(element.writes).toEqual(['set min=2026-11-03']);
  });

  // Chromium rehace el editor de un campo de fecha cuando le escriben min o max, aunque sea el
  // mismo valor, y se pierde lo que la persona estaba tecleando.
  it('no vuelve a escribir un atributo que no cambió', () => {
    const element = fakeElement({ min: '2026-11-03' });

    syncAttribute(element, 'min', '2026-11-03');

    expect(element.writes).toEqual([]);
  });

  it('quita el atributo con un valor vacío', () => {
    const element = fakeElement({ max: '2026-11-05' });

    syncAttribute(element, 'max', '');

    expect(element.writes).toEqual(['remove max']);
  });

  it('no hace nada si el atributo ya no estaba', () => {
    const element = fakeElement();

    syncAttribute(element, 'max', '');

    expect(element.writes).toEqual([]);
  });
});
