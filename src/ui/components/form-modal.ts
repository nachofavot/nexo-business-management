import type { Result } from '../../domain/result';
import type { FieldErrors } from '../../domain/types';
import { html } from '../html';
import { formField, type FieldDefinition } from './form-field';
import { focusFirstInvalid, readFormValues, showFieldErrors } from './form-state';
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
    { titleId },
  );

  const form = findForm(element);

  let hasAttempted = false;
  let saved = false;

  const readValues = () => readFormValues(form, fields, values);
  const showErrors = (errors: FieldErrors<K>) => showFieldErrors(form, fields, idPrefix, errors);

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
    focusFirstInvalid(form, fields, result.error);
  });

  form.addEventListener('input', () => {
    if (hasAttempted && !saved) showErrors(validate(readValues()));
  });

  openModal(element, signal);

  element.addEventListener(
    'shown.bs.modal',
    () => {
      const [firstField] = fields;
      const control = firstField ? form.elements.namedItem(firstField.name) : null;
      if (control instanceof HTMLElement) control.focus();
    },
    { once: true },
  );

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      removeModal(element);
      if (!signal.aborted) onClosed?.(saved);
    },
    { once: true },
  );
}
