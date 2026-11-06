import type { DatabaseStore } from '../data/database';
import { html, setHtml } from '../ui/html';
import { resolveRoute, type Route, type RouteName } from './routes';
import type { Session } from './session';
import { createShell, type Shell } from './shell';
import type { View } from './view';

export interface Router {
  navigate(path: string): void;
  start(): void;
}

export function createRouter(options: {
  root: HTMLElement;
  views: Readonly<Record<RouteName, View>>;
  database: DatabaseStore;
  session: Session;
  includeDevRoutes: boolean;
}): Router {
  const { root, views, database, session, includeDevRoutes } = options;

  let shell: Shell | null = null;
  let viewController: AbortController | null = null;
  let viewCleanup: (() => void) | void;

  function navigate(path: string): void {
    if (path === window.location.pathname) return;
    window.history.pushState(null, '', path);
    render();
  }

  function unmountCurrentView(): void {
    viewController?.abort();
    viewController = null;
    if (viewCleanup) viewCleanup();
    viewCleanup = undefined;
  }

  function prepareOutlet(route: Route): HTMLElement {
    if (route.name === 'login') {
      shell?.destroy();
      shell = null;
      return root;
    }

    shell ??= createShell(root, {
      database,
      onLogout() {
        session.end();
        navigate('/login');
      },
    });
    shell.setRoute(route);
    return shell.outlet;
  }

  function showViewError(outlet: HTMLElement, signal: AbortSignal): void {
    setHtml(
      outlet,
      html`<div class="nx-empty">
        <h2>No se pudo mostrar esta pantalla</h2>
        <p class="nx-empty__description">Recargá la página. Tus datos siguen guardados.</p>
        <button class="nx-btn nx-btn--primary nx-empty__action" type="button" data-action="reload">
          Recargar
        </button>
      </div>`,
    );
    outlet.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Element && event.target.closest('[data-action="reload"]')) {
          window.location.reload();
        }
      },
      { signal },
    );
  }

  function mountView(route: Route): void {
    const outlet = prepareOutlet(route);
    const controller = new AbortController();
    viewController = controller;

    try {
      viewCleanup = views[route.name]({
        root: outlet,
        signal: controller.signal,
        database,
        session,
        navigate,
        now: () => new Date(),
      });
    } catch (error) {
      console.error(`No se pudo montar la vista ${route.name}`, error);
      showViewError(outlet, controller.signal);
    }
  }

  function render(): void {
    const resolution = resolveRoute(window.location.pathname, {
      isAuthenticated: session.isActive(),
      includeDevRoutes,
    });

    if (resolution.kind === 'redirect') {
      window.history.replaceState(null, '', resolution.to);
      render();
      return;
    }

    unmountCurrentView();
    mountView(resolution.route);

    document.title = `${resolution.route.title} | NEXO`;
    window.scrollTo(0, 0);
    root.querySelector<HTMLElement>('h1')?.focus();
  }

  function handleLinkClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.origin !== window.location.origin) return;

    event.preventDefault();
    navigate(link.pathname);
  }

  return {
    navigate,
    start() {
      root.addEventListener('click', handleLinkClick);
      window.addEventListener('popstate', render);
      render();
    },
  };
}
