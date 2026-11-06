import Modal from 'bootstrap/js/dist/modal';
import { setHtml, type SafeHtml } from '../html';

let modalCount = 0;

export function createModalId(): string {
  modalCount += 1;
  return `nx-modal-${modalCount}`;
}

/** Crea un modal temporal: existe solo mientras está abierto. */
export function mountModal(content: SafeHtml, titleId: string): HTMLElement {
  const element = document.createElement('div');
  element.className = 'modal fade';
  element.tabIndex = -1;
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('aria-labelledby', titleId);
  setHtml(element, content);
  document.body.append(element);
  return element;
}

export function hideModal(element: HTMLElement): void {
  Modal.getInstance(element)?.hide();
}

export function removeModal(element: HTMLElement): void {
  Modal.getInstance(element)?.dispose();
  element.remove();
}

/**
 * Abre un modal atado a la vista: si el usuario navega con el modal abierto, se cierra.
 * Si no, su fondo oscuro quedaría bloqueando toda la app.
 * Además devuelve el foco a quien lo abrió, porque Bootstrap solo lo hace con data-bs-toggle.
 */
export function openModal(element: HTMLElement, signal: AbortSignal): void {
  const opener = document.activeElement;
  const modal = Modal.getOrCreateInstance(element);
  let isOpen = false;

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      if (opener instanceof HTMLElement) opener.focus();
    },
    { once: true },
  );

  // Bootstrap ignora hide() durante la animación de apertura: si se navegó en ese instante,
  // el modal se cierra apenas termina de abrirse.
  element.addEventListener(
    'shown.bs.modal',
    () => {
      isOpen = true;
      if (signal.aborted) modal.hide();
    },
    { once: true },
  );
  signal.addEventListener(
    'abort',
    () => {
      if (isOpen) modal.hide();
    },
    { once: true },
  );

  modal.show();
}
