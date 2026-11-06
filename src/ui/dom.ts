/** Busca un elemento y comprueba su tipo real, en lugar de suponerlo con un cast. */
export function requireElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Falta el elemento #${id} del tipo esperado`);
  return element;
}
