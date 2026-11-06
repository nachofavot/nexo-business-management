import { html } from '../html';
import { createModalId, hideModal, mountModal, openModal, removeModal } from './modal';

/** Pide confirmación para una acción destructiva. Devuelve true solo si el usuario la confirma. */
export function confirmDialog(
  options: { title: string; message: string; confirmLabel: string },
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve) => {
    const titleId = `${createModalId()}-title`;
    const element = mountModal(
      html`<div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title" id="${titleId}">${options.title}</h2>
            <button
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Cerrar"
            ></button>
          </div>
          <div class="modal-body">${options.message}</div>
          <div class="modal-footer">
            <button class="nx-btn nx-btn--ghost" type="button" data-bs-dismiss="modal">
              Cancelar
            </button>
            <button class="nx-btn nx-btn--danger" type="button" data-action="confirm">
              ${options.confirmLabel}
            </button>
          </div>
        </div>
      </div>`,
      titleId,
    );
    let confirmed = false;

    element.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="confirm"]')) {
        confirmed = true;
        hideModal(element);
      }
    });

    // El foco empieza en Cancelar: un Enter por accidente no debe borrar nada.
    element.addEventListener(
      'shown.bs.modal',
      () => element.querySelector<HTMLElement>('.modal-footer .nx-btn--ghost')?.focus(),
      { once: true },
    );

    openModal(element, signal);

    element.addEventListener(
      'hidden.bs.modal',
      () => {
        removeModal(element);
        resolve(confirmed);
      },
      { once: true },
    );
  });
}
