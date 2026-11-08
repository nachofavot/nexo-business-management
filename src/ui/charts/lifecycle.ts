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
