import Modal from 'bootstrap/js/dist/modal';

/** Bootstrap solo devuelve el foco si el modal se abre con data-bs-toggle: acá se hace siempre. */
export function openModal(element: HTMLElement): void {
  const opener = document.activeElement;

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      if (opener instanceof HTMLElement) opener.focus();
    },
    { once: true },
  );
  Modal.getOrCreateInstance(element).show();
}
