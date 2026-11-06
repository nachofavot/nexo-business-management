import Toast from 'bootstrap/js/dist/toast';
import { html, setHtml } from '../html';
import { icon } from '../icons';

export type ToastKind = 'success' | 'warning' | 'error';

const REGION_ID = 'nx-toast-region';
const DELAY_MS: Readonly<Record<ToastKind, number>> = {
  success: 4000,
  warning: 8000,
  error: 8000,
};

function getRegion(): HTMLElement {
  const existing = document.getElementById(REGION_ID);
  if (existing) return existing;

  const region = document.createElement('div');
  region.id = REGION_ID;
  region.className = 'nx-toast-region';
  document.body.append(region);
  return region;
}

export function showToast(message: string, kind: ToastKind): void {
  const element = document.createElement('div');
  element.className = `toast nx-toast nx-toast--${kind}`;
  element.setAttribute('role', kind === 'success' ? 'status' : 'alert');
  element.setAttribute('aria-live', kind === 'success' ? 'polite' : 'assertive');

  setHtml(
    element,
    html`<div class="nx-toast__body">
      ${icon(kind)}
      <span>${message}</span>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>`,
  );

  element.addEventListener('hidden.bs.toast', () => element.remove());
  getRegion().append(element);
  new Toast(element, { delay: DELAY_MS[kind] }).show();
}
