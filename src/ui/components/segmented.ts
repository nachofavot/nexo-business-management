import { html, type SafeHtml } from '../html';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

/**
 * Radios nativos con el aspecto de un control segmentado: las flechas cambian de opción y el
 * navegador maneja el foco del grupo, sin código propio. La leyenda nombra al grupo para los
 * lectores de pantalla; en un formulario se muestra como la etiqueta de un campo.
 */
export function segmented<V extends string>(options: {
  name: string;
  legend: string;
  idPrefix: string;
  options: readonly SegmentedOption<V>[];
  value: V;
  visibleLegend?: boolean;
}): SafeHtml {
  const { name, legend, idPrefix, value, visibleLegend = false } = options;

  return html`<fieldset class="nx-segmented-group">
    <legend class="${visibleLegend ? 'form-label' : 'visually-hidden'}">${legend}</legend>
    <div class="nx-segmented">
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
    </div>
  </fieldset>`;
}
