import type { Result } from '../../domain/result';
import type { FieldErrors } from '../../domain/types';
import { html } from '../html';
import { fieldErrorId, formField, type FieldDefinition } from './form-field';
import { createModalId, hideModal, mountModal, openModal, removeModal } from './modal';

export interface FormModalOptions<K extends string> {
  title: string;
  submitLabel: string;
  fields: readonly FieldDefinition<K>[];
  values: Readonly<Record<K, string>>;
  /** No guarda nada: se usa para revalidar al escribir, después del primer intento. */
  validate(values: Readonly<Record<K, string>>): FieldErrors<K>;
  /** ok cierra el modal; err muestra los errores y lo deja abierto. */
  onSubmit(values: Readonly<Record<K, string>>): Result<void, FieldErrors<K>>;
  /** No se llama si el modal se cerró porque el usuario salió de la vista. */
  onClosed?(saved: boolean): void;
}

function findForm(element: HTMLElement): HTMLFormElement {
  const form = element.querySelector('form');
  if (!form) throw new Error('El modal no tiene un formulario');
  return form;
}

export function openFormModal<K extends string>(
  options: FormModalOptions<K>,
  signal: AbortSignal,
): void {
  const { title, submitLabel, fields, values, validate, onSubmit, onClosed } = options;
  const idPrefix = createModalId();
  const titleId = `${idPrefix}-title`;

  const element = mountModal(
    html`<div class="modal-dialog">
      <form class="modal-content" novalidate>
        <div class="modal-header">
          <h2 class="modal-title" id="${titleId}">${title}</h2>
          <button
            class="btn-close"
            type="button"
            data-bs-dismiss="modal"
            aria-label="Cerrar"
          ></button>
        </div>
        <div class="modal-body">
          ${fields.map((field) => formField(field, { idPrefix, value: values[field.name] }))}
        </div>
        <div class="modal-footer">
          <button class="nx-btn nx-btn--ghost" type="button" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button class="nx-btn nx-btn--primary" type="submit">${submitLabel}</button>
        </div>
      </form>
    </div>`,
    titleId,
  );

  const form = findForm(element);

  let hasAttempted = false;
  let saved = false;

  function controlOf(name: K): HTMLElement | null {
    const control = form.elements.namedItem(name);
    return control instanceof HTMLElement ? control : null;
  }

  function readValues(): Readonly<Record<K, string>> {
    const current: Record<K, string> = { ...values };
    const data = new FormData(form);
    for (const { name } of fields) {
      const value = data.get(name);
      current[name] = typeof value === 'string' ? value : '';
    }
    return current;
  }

  /** Actualiza solo los mensajes: volver a dibujar los campos haría perder el foco. */
  function showErrors(errors: FieldErrors<K>): void {
    for (const { name } of fields) {
      const control = controlOf(name);
      const errorId = fieldErrorId(idPrefix, name);
      const message = errors[name];

      control?.classList.toggle('is-invalid', message !== undefined);
      if (message === undefined) {
        control?.removeAttribute('aria-invalid');
        control?.removeAttribute('aria-describedby');
      } else {
        control?.setAttribute('aria-invalid', 'true');
        control?.setAttribute('aria-describedby', errorId);
      }

      const errorElement = element.querySelector(`[id="${errorId}"]`);
      if (errorElement) errorElement.textContent = message ?? '';
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // Mientras el modal se cierra, un segundo envío crearía el registro dos veces.
    if (saved) return;

    hasAttempted = true;
    const result = onSubmit(readValues());

    if (result.ok) {
      saved = true;
      hideModal(element);
      return;
    }

    showErrors(result.error);
    const firstInvalid = fields.find(({ name }) => result.error[name] !== undefined);
    if (firstInvalid) controlOf(firstInvalid.name)?.focus();
  });

  form.addEventListener('input', () => {
    if (hasAttempted && !saved) showErrors(validate(readValues()));
  });

  element.addEventListener(
    'shown.bs.modal',
    () => {
      const [firstField] = fields;
      if (firstField) controlOf(firstField.name)?.focus();
    },
    { once: true },
  );

  openModal(element, signal);

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      removeModal(element);
      if (!signal.aborted) onClosed?.(saved);
    },
    { once: true },
  );
}
