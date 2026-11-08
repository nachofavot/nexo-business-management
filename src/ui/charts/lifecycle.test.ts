import { describe, expect, it } from 'vitest';
import { createAll, remountWhenReady, type Destroyable } from './lifecycle';

/** Anota cada gráfico creado y destruido, como si fuera Chart.js. */
function tracker() {
  const created: string[] = [];
  const destroyed: string[] = [];
  let count = 0;
  const create = () => {
    count += 1;
    const id = `g${count}`;
    created.push(id);
    return () => destroyed.push(id);
  };
  return { created, destroyed, create };
}

describe('remountWhenReady', () => {
  it('monta enseguida y destruye al salir', () => {
    const { created, destroyed, create } = tracker();

    const destroy = remountWhenReady(create, null);
    destroy();

    expect(created).toEqual(['g1']);
    expect(destroyed).toEqual(['g1']);
  });

  // Chart.js mide los textos al crearse: con la fuente de respaldo, después dibuja cortado.
  it('vuelve a montar cuando termina de cargar la fuente', async () => {
    const { created, destroyed, create } = tracker();
    const ready = Promise.resolve();

    const destroy = remountWhenReady(create, ready);
    await ready;
    await Promise.resolve();

    expect(created).toEqual(['g1', 'g2']);
    expect(destroyed).toEqual(['g1']);
    destroy();
    expect(destroyed).toEqual(['g1', 'g2']);
  });

  it('no vuelve a montar si ya se salió de la vista', async () => {
    const { created, destroyed, create } = tracker();
    const ready = Promise.resolve();

    remountWhenReady(create, ready)();
    await ready;
    await Promise.resolve();

    expect(created).toEqual(['g1']);
    expect(destroyed).toEqual(['g1']);
  });
});

describe('createAll', () => {
  function chart(log: string[], name: string): Destroyable {
    return { destroy: () => log.push(`${name} destruido`) };
  }

  it('crea todos los gráficos', () => {
    const log: string[] = [];
    const first = chart(log, 'a');
    const second = chart(log, 'b');

    expect(createAll([() => first, () => second])).toEqual([first, second]);
    expect(log).toEqual([]);
  });

  // Si uno fallaba, los anteriores quedaban vivos escuchando el tamaño de la ventana.
  it('si uno falla, destruye los anteriores y deja subir el error', () => {
    const log: string[] = [];
    const failure = new Error('No existe el lienzo');

    expect(() =>
      createAll([
        () => chart(log, 'a'),
        () => {
          throw failure;
        },
        () => chart(log, 'c'),
      ]),
    ).toThrow(failure);
    expect(log).toEqual(['a destruido']);
  });
});
