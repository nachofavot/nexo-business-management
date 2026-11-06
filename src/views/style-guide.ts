import 'bootstrap/js/dist/dropdown';

import type { View } from '../app/view';
import { isOneOf } from '../domain/validation/rules';
import { emptyState } from '../ui/components/empty-state';
import { metric } from '../ui/components/metric';
import { openModal } from '../ui/components/modal';
import { showToast, type ToastKind } from '../ui/components/toast';
import { requireElement } from '../ui/dom';
import { html, setHtml } from '../ui/html';
import { icon } from '../ui/icons';

const COLORS = [
  ['Fondo', 'bg'],
  ['Superficie 1', 'surface-1'],
  ['Superficie 2', 'surface-2'],
  ['Violeta 500', 'violet-500'],
  ['Violeta 300', 'violet-300'],
  ['Azul', 'blue'],
  ['Éxito', 'success'],
  ['Advertencia', 'warning'],
  ['Peligro', 'danger'],
] as const;

const TOAST_KINDS = ['success', 'warning', 'error'] as const;
const TOAST_MESSAGES: Readonly<Record<ToastKind, string>> = {
  success: 'Cliente guardado.',
  warning: 'Quedan 2 unidades de este producto.',
  error: 'No se pudo guardar. El almacenamiento del navegador está lleno.',
};

/** Muestra juntos todos los componentes y estados. Solo existe en `npm run dev`. */
export const styleGuideView: View = ({ root, signal }) => {
  setHtml(
    root,
    html`<div class="nx-guide">
        <section class="nx-guide__section">
          <h2>Colores</h2>
          <div class="nx-guide__swatches">
            ${COLORS.map(
              ([name, token]) =>
                html`<div class="nx-guide__swatch">
                  <div class="nx-guide__chip nx-guide__chip--${token}"></div>
                  ${name}
                </div>`,
            )}
          </div>
        </section>

        <section class="nx-guide__section">
          <h2>Tipografía</h2>
          ${metric({ label: 'Cifra principal, 40 px', value: '$ 39.107.835,25', lead: true })}
          <h1 class="nx-guide__sample">Título de página, 20 px</h1>
          <h2 class="nx-guide__sample">Título de sección, 16 px</h2>
          <p class="nx-guide__sample">Cuerpo de texto, 14 px, con interlineado de 1,5.</p>
          <p class="nx-guide__sample nx-muted">Texto secundario para ayudas y detalles.</p>
        </section>

        <section class="nx-guide__section">
          <h2>Botones</h2>
          <div class="nx-guide__row">
            <button class="nx-btn nx-btn--primary" type="button">Registrar venta</button>
            <button class="nx-btn nx-btn--secondary" type="button">Editar</button>
            <button class="nx-btn nx-btn--ghost" type="button">Cancelar</button>
            <button class="nx-btn nx-btn--danger" type="button">Eliminar</button>
            <button class="nx-btn nx-btn--primary" type="button" disabled>Deshabilitado</button>
            <button class="nx-btn nx-btn--ghost nx-btn--icon" type="button" aria-label="Ajustes">
              ${icon('settings')}
            </button>
          </div>
        </section>

        <section class="nx-guide__section">
          <h2>Formulario</h2>
          <form class="nx-guide__form" id="guide-form">
            <div class="nx-field">
              <label class="form-label" for="guide-name">Nombre</label>
              <input class="form-control" id="guide-name" value="Ana Gómez" />
            </div>
            <div class="nx-field">
              <label class="form-label" for="guide-email">Email</label>
              <input
                class="form-control is-invalid"
                id="guide-email"
                value="ana@example"
                aria-describedby="guide-email-error"
                aria-invalid="true"
              />
              <div class="invalid-feedback" id="guide-email-error">Ingresá un email válido.</div>
            </div>
            <div class="nx-field">
              <label class="form-label" for="guide-category">Categoría</label>
              <select class="form-select" id="guide-category">
                <option>Periféricos</option>
                <option>Redes</option>
              </select>
            </div>
          </form>
        </section>

        <section class="nx-guide__section">
          <h2>Tabla y etiquetas</h2>
          <table class="nx-table">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Estado</th>
                <th scope="col" class="nx-table__number">Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Producto">Monitor 27 pulgadas QHD</td>
                <td data-label="Estado"><span class="nx-tag nx-tag--success">Disponible</span></td>
                <td data-label="Precio" class="nx-table__number">$ 410.000,00</td>
              </tr>
              <tr>
                <td data-label="Producto">Punto de acceso para techo</td>
                <td data-label="Estado"><span class="nx-tag nx-tag--warning">Stock bajo</span></td>
                <td data-label="Precio" class="nx-table__number">$ 139.000,00</td>
              </tr>
              <tr>
                <td data-label="Producto">Servidor de oficina</td>
                <td data-label="Estado"><span class="nx-tag nx-tag--danger">Sin stock</span></td>
                <td data-label="Precio" class="nx-table__number">$ 2.500.000,00</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="nx-guide__section">
          <h2>Elementos flotantes</h2>
          <div class="nx-guide__row">
            <button class="nx-btn nx-btn--secondary" type="button" data-action="modal">
              Abrir modal
            </button>
            <button class="nx-btn nx-btn--secondary" type="button" data-toast="success">
              Aviso de éxito
            </button>
            <button class="nx-btn nx-btn--secondary" type="button" data-toast="warning">
              Aviso de advertencia
            </button>
            <button class="nx-btn nx-btn--secondary" type="button" data-toast="error">
              Aviso de error
            </button>
            <div class="dropdown">
              <button
                class="nx-btn nx-btn--secondary"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Menú ${icon('chevronDown')}
              </button>
              <ul class="dropdown-menu">
                <li><button class="dropdown-item" type="button">Primera opción</button></li>
                <li><button class="dropdown-item" type="button">Segunda opción</button></li>
              </ul>
            </div>
          </div>
        </section>

        <section class="nx-guide__section">
          <h2>Estado vacío</h2>
          ${emptyState('Todavía no hay ventas', 'Las ventas que registres aparecen en esta lista.')}
        </section>

        <section class="nx-guide__section">
          <h2>Métricas</h2>
          <div class="nx-guide__row">
            ${metric({ label: 'Ventas', value: '18', change: 12.5, helper: 'contra octubre' })}
            ${metric({ label: 'Ticket promedio', value: '$ 41.324,47', change: -4.2 })}
            ${metric({ label: 'Ingresos', value: '$ 0,00', change: null })}
          </div>
        </section>
      </div>

      <div
        class="modal fade"
        id="guide-modal"
        tabindex="-1"
        aria-labelledby="guide-modal-title"
        aria-hidden="true"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h2 class="modal-title" id="guide-modal-title">Eliminar cliente</h2>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
              ></button>
            </div>
            <div class="modal-body">Ana Gómez se quita de la lista. Sus ventas se conservan.</div>
            <div class="modal-footer">
              <button class="nx-btn nx-btn--ghost" type="button" data-bs-dismiss="modal">
                Cancelar
              </button>
              <button class="nx-btn nx-btn--danger" type="button" data-bs-dismiss="modal">
                Eliminar cliente
              </button>
            </div>
          </div>
        </div>
      </div>`,
  );

  root.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;

      if (event.target.closest('[data-action="modal"]')) {
        openModal(requireElement('guide-modal', HTMLElement));
        return;
      }

      const toastKind = event.target.closest('[data-toast]')?.getAttribute('data-toast') ?? '';
      if (isOneOf(toastKind, TOAST_KINDS)) showToast(TOAST_MESSAGES[toastKind], toastKind);
    },
    { signal },
  );
};
