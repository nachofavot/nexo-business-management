/** HTML que ya es seguro insertar: viene de una plantilla `html` o de contenido propio con `raw`. */
export class SafeHtml {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

export type HtmlValue =
  string | number | boolean | null | undefined | SafeHtml | readonly HtmlValue[];

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

function toMarkup(value: HtmlValue): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toMarkup).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeText(String(value));
}

/**
 * Arma HTML escapando todos los datos interpolados, salvo otras plantillas `html`.
 * Así, un nombre como `<img onerror=...>` se muestra como texto y no se ejecuta.
 */
export function html(strings: TemplateStringsArray, ...values: readonly HtmlValue[]): SafeHtml {
  const markup = strings.reduce(
    (result, text, index) => result + text + toMarkup(values[index]),
    '',
  );
  return new SafeHtml(markup);
}

/** Marca como seguro un contenido propio, como un ícono. Nunca usarlo con datos del usuario. */
export function raw(trustedMarkup: string): SafeHtml {
  return new SafeHtml(trustedMarkup);
}

/** Es el único lugar del proyecto que asigna innerHTML: solo acepta contenido ya escapado. */
export function setHtml(element: Element, content: SafeHtml): void {
  element.innerHTML = content.value;
}
