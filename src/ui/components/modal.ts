import Modal from 'bootstrap/js/dist/modal';

/**
 * Abre un modal atado a la vista: si el usuario navega con el modal abierto, se cierra.
 * Si no, su fondo oscuro quedaría bloqueando toda la app.
 * Además devuelve el foco a quien lo abrió, porque Bootstrap solo lo hace con data-bs-toggle.
 */
export function openModal(element: HTMLElement, signal: AbortSignal): void {
  const opener = document.activeElement;
  const modal = Modal.getOrCreateInstance(element);

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      if (opener instanceof HTMLElement) opener.focus();
    },
    { once: true },
  );
  signal.addEventListener('abort', () => modal.hide(), { once: true });

  modal.show();
}
