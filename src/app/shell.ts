import Dropdown from 'bootstrap/js/dist/dropdown';
import Offcanvas from 'bootstrap/js/dist/offcanvas';

import type { DatabaseStore } from '../data/database';
import { brand } from '../ui/components/brand';
import { requireElement } from '../ui/dom';
import { html, setHtml } from '../ui/html';
import { icon, type IconName } from '../ui/icons';
import { activeNavPath, NAV_ROUTES, type Route, type RouteName } from './routes';

const NAV_ICONS: Partial<Readonly<Record<RouteName, IconName>>> = {
  dashboard: 'dashboard',
  customers: 'customers',
  products: 'products',
  sales: 'sales',
  reports: 'reports',
  settings: 'settings',
};

export interface Shell {
  outlet: HTMLElement;
  setRoute(route: Route): void;
  destroy(): void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function createShell(
  root: HTMLElement,
  options: { database: DatabaseStore; onLogout(): void },
): Shell {
  const { database, onLogout } = options;
  const { displayName } = database.read().settings.profile;
  const controller = new AbortController();

  setHtml(
    root,
    html`<div class="nx-shell">
      <aside
        class="nx-sidebar offcanvas-lg offcanvas-start"
        id="nx-sidebar"
        tabindex="-1"
        aria-label="Menú principal"
      >
        <a class="nx-sidebar__brand" href="/dashboard">${brand()}</a>
        <nav class="nx-nav" id="nx-nav" aria-label="Módulos">
          <span class="nx-nav__indicator" id="nx-nav-indicator" aria-hidden="true"></span>
          ${NAV_ROUTES.map(
            (route) =>
              html`<a class="nx-nav__link" href="${route.path}">
                ${icon(NAV_ICONS[route.name] ?? 'dashboard')}
                <span>${route.title}</span>
              </a>`,
          )}
        </nav>
      </aside>

      <div class="nx-panel">
        <header class="nx-topbar">
          <button
            class="nx-btn nx-btn--ghost nx-btn--icon nx-topbar__menu"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#nx-sidebar"
            aria-controls="nx-sidebar"
            aria-label="Abrir el menú"
          >
            ${icon('menu')}
          </button>
          <h1 class="nx-topbar__title" id="nx-page-title" tabindex="-1"></h1>
          <div class="dropdown">
            <button
              class="nx-btn nx-btn--ghost nx-topbar__user"
              id="nx-user-menu"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span class="nx-avatar" aria-hidden="true">${initials(displayName)}</span>
              <span class="nx-topbar__user-name">${displayName}</span>
              ${icon('chevronDown')}
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <a class="dropdown-item" href="/configuracion">
                  ${icon('settings')} Configuración
                </a>
              </li>
              <li>
                <button class="dropdown-item" type="button" data-action="logout">
                  ${icon('logout')} Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </header>
        ${
          database.mode === 'memory'
            ? html`<p class="nx-banner" role="status">
                Tu navegador no permite guardar datos: los cambios se pierden al recargar.
              </p>`
            : null
        }
        <main class="nx-content" id="nx-outlet"></main>
      </div>
    </div>`,
  );

  const outlet = requireElement('nx-outlet', HTMLElement);
  const title = requireElement('nx-page-title', HTMLElement);
  const sidebar = requireElement('nx-sidebar', HTMLElement);
  const nav = requireElement('nx-nav', HTMLElement);
  const indicator = requireElement('nx-nav-indicator', HTMLElement);
  const userMenuButton = requireElement('nx-user-menu', HTMLElement);

  function moveIndicator(): void {
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    indicator.classList.toggle('nx-nav__indicator--hidden', !active);
    if (!active) return;

    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.transform = `translateY(${active.offsetTop}px)`;
  }

  root.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;

      if (event.target.closest('[data-action="logout"]')) {
        onLogout();
        return;
      }

      // En el celular, el menú se cierra al elegir un módulo y el foco vuelve al título.
      if (event.target.closest('.nx-nav__link, .nx-sidebar__brand')) {
        const offcanvas = Offcanvas.getInstance(sidebar);
        if (!offcanvas) return;

        sidebar.addEventListener('hidden.bs.offcanvas', () => title.focus(), { once: true });
        offcanvas.hide();
      }
    },
    { signal: controller.signal },
  );
  window.addEventListener('resize', moveIndicator, { signal: controller.signal });

  let isFirstRoute = true;

  return {
    outlet,
    setRoute(route) {
      title.textContent = route.title;

      const activePath = activeNavPath(route);
      for (const link of nav.querySelectorAll('a')) {
        if (link.getAttribute('href') === activePath) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      moveIndicator();

      // El indicador se desliza solo al navegar, no cuando aparece por primera vez.
      if (isFirstRoute) {
        isFirstRoute = false;
        requestAnimationFrame(() => indicator.classList.add('nx-nav__indicator--animated'));
      }
    },
    destroy() {
      controller.abort();
      Dropdown.getInstance(userMenuButton)?.dispose();
      Offcanvas.getInstance(sidebar)?.dispose();
    },
  };
}
