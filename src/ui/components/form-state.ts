import type { FieldErrors } from '../../domain/types';
import { describedBy, fieldErrorId, fieldHintId, type FieldDefinition } from './form-field';

function controlOf(form: HTMLFormElement, name: string): HTMLElement | null {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLElement ? control : null;
}

/** Lee los campos del formulario. Un campo que falta conserva el valor de `fallback`. */
export function readFormValues<K extends string>(
  form: HTMLFormElement,
  fields: readonly FieldDefinition<K>[],
  fallback: Readonly<Record<K, string>>,
): Readonly<Record<K, string>> {
  const current: Record<K, string> = { ...fallback };
  const data = new FormData(form);
  for (const { name } of fields) {
    const value = data.get(name);
    current[name] = typeof value === 'string' ? value : '';
  }
  return current;
}

/** Actualiza solo los mensajes: volver a dibujar los campos haría perder el foco. */
export function showFieldErrors<K extends string>(
  form: HTMLFormElement,
  fields: readonly FieldDefinition<K>[],
  idPrefix: string,
  errors: FieldErrors<K>,
): void {
  for (const field of fields) {
    const control = controlOf(form, field.name);
    const errorId = fieldErrorId(idPrefix, field.name);
    const message = errors[field.name];

    control?.classList.toggle('is-invalid', message !== undefined);
    if (message === undefined) control?.removeAttribute('aria-invalid');
    else control?.setAttribute('aria-invalid', 'true');

    // La ayuda sigue asociada aunque aparezca un error.
    const description = describedBy({
      hint: field.hint === undefined ? undefined : fieldHintId(idPrefix, field.name),
      error: message === undefined ? undefined : errorId,
    });
    if (description === null) control?.removeAttribute('aria-describedby');
    else control?.setAttribute('aria-describedby', description);

    const errorElement = form.querySelector(`[id="${errorId}"]`);
    if (errorElement) errorElement.textContent = message ?? '';
  }
}

export function focusFirstInvalid<K extends string>(
  form: HTMLFormElement,
  fields: readonly FieldDefinition<K>[],
  errors: FieldErrors<K>,
): void {
  const firstInvalid = fields.find(({ name }) => errors[name] !== undefined);
  if (firstInvalid) controlOf(form, firstInvalid.name)?.focus();
}
