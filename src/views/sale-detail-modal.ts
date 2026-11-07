import type { Currency, Sale } from '../domain/types';
import {
  createModalId,
  hideModal,
  mountModal,
  openModal,
  removeModal,
} from '../ui/components/modal';
import { saleDetailContent } from './sale-detail';

/**
 * Abre el detalle de una venta. "Anular venta" cierra el detalle, y onClosed('cancel') se llama
 * recién cuando terminó de cerrarse: así la confirmación nunca se abre encima de otro modal.
 * onClosed no se llama si el modal se cerró porque el usuario salió de la vista.
 */
export function openSaleDetail(
  sale: Sale,
  options: { currency: Currency; onClosed(action: 'cancel' | null): void },
  signal: AbortSignal,
): void {
  const titleId = `${createModalId()}-title`;
  const element = mountModal(saleDetailContent(sale, { currency: options.currency, titleId }), {
    titleId,
  });
  let action: 'cancel' | null = null;

  element.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-action="cancel-sale"]')) {
      action = 'cancel';
      hideModal(element);
    }
  });

  openModal(element, signal);

  element.addEventListener(
    'hidden.bs.modal',
    () => {
      removeModal(element);
      if (!signal.aborted) options.onClosed(action);
    },
    { once: true },
  );
}
