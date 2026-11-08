import { html, type SafeHtml } from '../html';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

/**
 * Radios nativos con el aspecto de un control segmentado: las flechas cambian de opción y el
 * navegador maneja el foco del grupo, sin código propio.
 */
export function segmented<V extends string>(options: {
  name: string;
  legend: string;
  idPrefix: string;
  options: readonly SegmentedOption<V>[];
  value: V;
}): SafeHtml {
  const { name, legend, idPrefix, value } = options;

  return html`<fieldset class="nx-segmented">
    <legend class="visually-hidden">${legend}</legend>
    ${options.options.map(
      (option) =>
        html`<input
            class="nx-segmented__input"
            type="radio"
            name="${name}"
            id="${idPrefix}-${option.value}"
            value="${option.value}"
            ${option.value === value ? 'checked' : ''}
          /><label class="nx-segmented__option" for="${idPrefix}-${option.value}"
            >${option.label}</label
          >`,
    )}
  </fieldset>`;
}
