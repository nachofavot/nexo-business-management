import Toast from 'bootstrap/js/dist/toast';
import { requireElement } from '../dom';
import { html, setHtml } from '../html';
import { icon } from '../icons';

export type ToastKind = 'success' | 'warning' | 'error';

const DELAY_MS: Readonly<Record<ToastKind, number>> = {
  success: 4000,
  warning: 8000,
  error: 8000,
};

/**
 * La región de avisos ya existe en index.html: los lectores de pantalla solo anuncian
 * los cambios de una región presente antes de que llegue el contenido.
 */
export function showToast(message: string, kind: ToastKind): void {
  const element = document.createElement('div');
  element.className = `toast nx-toast nx-toast--${kind}`;
  element.setAttribute('role', kind === 'success' ? 'status' : 'alert');
  element.setAttribute('aria-live', kind === 'success' ? 'polite' : 'assertive');
  element.setAttribute('aria-atomic', 'true');

  setHtml(
    element,
    html`<div class="nx-toast__body">
      ${icon(kind)}
      <span>${message}</span>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>`,
  );

  element.addEventListener('hidden.bs.toast', () => element.remove());
  requireElement('nx-toast-region', HTMLElement).append(element);
  new Toast(element, { delay: DELAY_MS[kind] }).show();
}
