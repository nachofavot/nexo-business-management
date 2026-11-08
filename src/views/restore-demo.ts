import type { Services } from '../services';
import { confirmDialog } from '../ui/components/confirm-dialog';
import { showToast } from '../ui/components/toast';
import { storageFailureMessage } from '../ui/messages';

/**
 * Pide confirmación, restaura y avisa. Devuelve true si se restauraron los datos, para que la
 * pantalla se vuelva a dibujar. La usan Configuración y el Dashboard.
 */
export async function confirmRestoreDemo(
  services: Services,
  signal: AbortSignal,
): Promise<boolean> {
  const confirmed = await confirmDialog(
    {
      title: '¿Restaurar los datos demo?',
      message:
        'Se reemplazan los clientes, los productos, las ventas y la actividad. Los cambios que hiciste en ellos se pierden.',
      confirmLabel: 'Restaurar datos',
    },
    signal,
  );
  if (!confirmed) return false;

  const result = services.settings.restoreDemo();
  if (!result.ok) {
    showToast(storageFailureMessage(result.error), 'error');
    return false;
  }

  showToast('Datos demo restaurados.', 'success');
  return true;
}
