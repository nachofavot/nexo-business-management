type AttributeTarget = Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>;

/**
 * Pone un atributo, o lo quita si el valor está vacío, solo si cambia. Chromium rehace el editor
 * de un campo de fecha cuando le escriben min o max, aunque sea el mismo valor, y se pierde lo
 * que la persona estaba tecleando.
 */
export function syncAttribute(element: AttributeTarget, name: string, value: string): void {
  if ((element.getAttribute(name) ?? '') === value) return;
  if (value === '') element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/** Busca un elemento y comprueba su tipo real, en lugar de suponerlo con un cast. */
export function requireElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) throw new Error(`Falta el elemento #${id} del tipo esperado`);
  return element;
}
