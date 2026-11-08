import { requireElement } from './dom';

/**
 * Anuncia un cambio a los lectores de pantalla en la región #nx-announcer de index.html. La región
 * existe desde el principio: los lectores solo anuncian los cambios de una región que ya estaba.
 * Se vacía y se escribe en el cuadro siguiente, para que un mensaje repetido también se anuncie.
 */
export function announce(message: string): void {
  const region = requireElement('nx-announcer', HTMLElement);
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
