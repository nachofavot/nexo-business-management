import { html, type SafeHtml } from '../html';

export interface FieldDefinition<K extends string> {
  name: K;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select';
  autocomplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  required?: boolean;
  options?: readonly { value: string; label: string }[];
  /** Ayuda visible bajo el campo, asociada con aria-describedby. */
  hint?: string;
}

export function fieldId(idPrefix: string, name: string): string {
  return `${idPrefix}-${name}`;
}

export function fieldErrorId(idPrefix: string, name: string): string {
  return `${fieldId(idPrefix, name)}-error`;
}

export function fieldHintId(idPrefix: string, name: string): string {
  return `${fieldId(idPrefix, name)}-hint`;
}

/** Los id que describen un campo: su ayuda y, si hay, su error. */
export function describedBy(ids: { hint?: string; error?: string }): string | null {
  const joined = [ids.hint, ids.error].filter((id) => id !== undefined).join(' ');
  return joined === '' ? null : joined;
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
  const hintId = fieldHintId(idPrefix, field.name);
  const description = describedBy({
    hint: field.hint === undefined ? undefined : hintId,
    error: error === undefined ? undefined : errorId,
  });
  const invalidClass = error === undefined ? '' : 'is-invalid';
  const invalidAttributes = html`${error === undefined ? null : html`aria-invalid="true"`}
  ${description === null ? null : html`aria-describedby="${description}"`}`;
  const requiredAttribute = field.required ? 'required' : '';
  // Sin esta marca, los obligatorios y los opcionales se veían iguales.
  const optionalMark = field.required
    ? null
    : html` <span class="nx-field__optional">(opcional)</span>`;

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
    <label class="form-label" for="${id}">${field.label}${optionalMark}</label>
    ${control}
    ${
      field.hint === undefined
        ? null
        : html`<div class="form-text" id="${hintId}">${field.hint}</div>`
    }
    <div class="invalid-feedback" id="${errorId}">${error}</div>
  </div>`;
}
