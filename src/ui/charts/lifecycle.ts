export interface Destroyable {
  destroy(): void;
}

/**
 * Monta un gráfico y, si la fuente todavía no cargó, lo vuelve a montar cuando esté lista.
 * Chart.js mide los textos al crearse: con la fuente de respaldo, después dibuja cortado.
 * Devuelve la función que destruye el gráfico vigente; si ya se salió de la vista, no remonta.
 */
export function remountWhenReady(
  create: () => () => void,
  ready: Promise<unknown> | null,
): () => void {
  let destroy = create();
  let isDestroyed = false;

  if (ready) {
    void ready.then(() => {
      if (isDestroyed) return;
      destroy();
      destroy = create();
    });
  }

  return () => {
    isDestroyed = true;
    destroy();
  };
}

/**
 * Crea todos los gráficos o ninguno: si uno falla, destruye los anteriores y relanza el error.
 * Si no, los que ya se habían creado seguirían escuchando el tamaño de la ventana.
 */
export function createAll(factories: readonly (() => Destroyable)[]): Destroyable[] {
  const created: Destroyable[] = [];
  try {
    for (const factory of factories) created.push(factory());
    return created;
  } catch (error) {
    for (const chart of created) chart.destroy();
    throw error;
  }
}
