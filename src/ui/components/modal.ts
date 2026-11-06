import Modal from 'bootstrap/js/dist/modal';
import { setHtml, type SafeHtml } from '../html';

let modalCount = 0;

export function createModalId(): string {
  modalCount += 1;
  return `nx-modal-${modalCount}`;
}

/** Crea un modal temporal: existe solo mientras está abierto. */
export function mountModal(
  content: SafeHtml,
  labels: { titleId: string; descriptionId?: string },
): HTMLElement {
  const element = document.createElement('div');
  element.className = 'modal fade';
  element.tabIndex = -1;
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('aria-labelledby', labels.titleId);
  if (labels.descriptionId) element.setAttribute('aria-describedby', labels.descriptionId);
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
 *
 * Quien agregue un listener de `shown.bs.modal` debe hacerlo después de llamar a esta función,
 * para que el modal ya acepte el foco cuando se ejecute.
 */
export function openModal(element: HTMLElement, signal: AbortSignal): void {
  const opener = document.activeElement;
  // Con el fondo estático, un clic afuera no descarta lo que se estaba escribiendo.
  const modal = Modal.getOrCreateInstance(element, { backdrop: 'static' });
  let isOpen = false;

  // El foco no puede quedar en el botón: otro Enter abriría un segundo modal encima.
  if (opener instanceof HTMLElement) opener.blur();

  // Bootstrap ignora hide() durante la animación de apertura. Si el modal aceptara clics en ese
  // momento, "Eliminar" quedaría registrado sin cerrarlo y "Cancelar" terminaría borrando.
  element.inert = true;

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      if (opener instanceof HTMLElement) opener.focus();
    },
    { once: true },
  );

  element.addEventListener(
    'shown.bs.modal',
    () => {
      element.inert = false;
      isOpen = true;
      // Si se navegó durante la apertura, el modal se cierra apenas termina de abrirse.
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
