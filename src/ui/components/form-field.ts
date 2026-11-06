import { html, type SafeHtml } from '../html';

export interface FieldDefinition<K extends string> {
  name: K;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select';
  autocomplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  required?: boolean;
  options?: readonly { value: string; label: string }[];
}

export function fieldId(idPrefix: string, name: string): string {
  return `${idPrefix}-${name}`;
}

export function fieldErrorId(idPrefix: string, name: string): string {
  return `${fieldId(idPrefix, name)}-error`;
}

/**
 * Dibuja una etiqueta, su campo y el lugar de su mensaje de error. El mensaje existe siempre,
 * aunque esté vacío, para poder actualizarlo sin volver a dibujar el campo y perder el foco.
 */
export function formField<K extends string>(
  field: FieldDefinition<K>,
  options: { idPrefix: string; value: string; error?: string },
): SafeHtml {
  const { idPrefix, value, error } = options;
  const id = fieldId(idPrefix, field.name);
  const errorId = fieldErrorId(idPrefix, field.name);
  const invalidClass = error === undefined ? '' : 'is-invalid';
  const invalidAttributes =
    error === undefined ? null : html`aria-invalid="true" aria-describedby="${errorId}"`;
  const requiredAttribute = field.required ? 'required' : '';

  const control =
    field.type === 'select'
      ? html`<select
          class="form-select ${invalidClass}"
          id="${id}"
          name="${field.name}"
          ${requiredAttribute}
          ${invalidAttributes}
        >
          ${field.options?.map(
            (option) =>
              html`<option value="${option.value}" ${option.value === value ? 'selected' : ''}>
                ${option.label}
              </option>`,
          )}
        </select>`
      : html`<input
          class="form-control ${invalidClass}"
          id="${id}"
          name="${field.name}"
          type="${field.type ?? 'text'}"
          value="${value}"
          ${field.autocomplete ? html`autocomplete="${field.autocomplete}"` : null}
          ${field.inputMode ? html`inputmode="${field.inputMode}"` : null}
          ${requiredAttribute}
          ${invalidAttributes}
        />`;

  return html`<div class="nx-field">
    <label class="form-label" for="${id}">${field.label}</label>
    ${control}
    <div class="invalid-feedback" id="${errorId}">${error}</div>
  </div>`;
}
