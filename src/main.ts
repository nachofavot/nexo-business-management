import '@fontsource-variable/geist';
import './styles/main.scss';

import { createRouter } from './app/router';
import type { RouteName } from './app/routes';
import { createSession } from './app/session';
import type { View } from './app/view';
import { createDatabaseStore } from './data/database';
import { createSeedDatabase } from './data/seed';
import { showToast } from './ui/components/toast';
import { requireElement } from './ui/dom';
import { loginView } from './views/login';
import { notFoundView } from './views/not-found';
import { styleGuideView } from './views/style-guide';
import { createUpcomingView } from './views/upcoming';

const database = createDatabaseStore({
  getStorage: () => window.localStorage,
  createSeed: () => createSeedDatabase(new Date()),
});
const session = createSession(() => window.sessionStorage);

const views: Readonly<Record<RouteName, View>> = {
  login: loginView,
  dashboard: createUpcomingView('El Dashboard', 2),
  customers: createUpcomingView('Clientes', 3),
  products: createUpcomingView('Productos', 4),
  sales: createUpcomingView('Ventas', 5),
  'new-sale': createUpcomingView('Nueva venta', 5),
  reports: createUpcomingView('Reportes', 6),
  settings: createUpcomingView('Configuración', 7),
  'not-found': notFoundView,
  'style-guide': import.meta.env.DEV ? styleGuideView : notFoundView,
};

// Vite elimina este bloque del build: los estilos de la guía no llegan a producción.
if (import.meta.env.DEV) {
  void import('./styles/views/_style-guide.scss');
}

function showUnexpectedError(): void {
  showToast('Ocurrió un error inesperado. Si algo deja de funcionar, recargá la página.', 'error');
}

window.addEventListener('error', showUnexpectedError);
window.addEventListener('unhandledrejection', showUnexpectedError);

createRouter({
  root: requireElement('app', HTMLElement),
  views,
  database,
  session,
  includeDevRoutes: import.meta.env.DEV,
}).start();

if (database.notice === 'recovered') {
  showToast(
    'Los datos guardados estaban dañados. Cargamos los datos demo y guardamos una copia.',
    'warning',
  );
}
