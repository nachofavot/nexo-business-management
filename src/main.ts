import '@fontsource-variable/geist';
import './styles/main.scss';

import { createRouter } from './app/router';
import type { RouteName } from './app/routes';
import { createSession } from './app/session';
import type { View } from './app/view';
import { createDatabaseStore } from './data/database';
import { createSeedDatabase } from './data/seed';
import { createServices } from './services';
import { showToast } from './ui/components/toast';
import { requireElement } from './ui/dom';
import { customersView } from './views/customers';
import { dashboardView } from './views/dashboard';
import { loginView } from './views/login';
import { notFoundView } from './views/not-found';
import { newSaleView } from './views/new-sale';
import { productsView } from './views/products';
import { reportsView } from './views/reports';
import { salesView } from './views/sales';
import { styleGuideView } from './views/style-guide';
import { createUpcomingView } from './views/upcoming';

const database = createDatabaseStore({
  getStorage: () => window.localStorage,
  createSeed: () => createSeedDatabase(new Date()),
});
const services = createServices({
  database,
  generateId: () => crypto.randomUUID(),
  now: () => new Date(),
});
const session = createSession(() => window.sessionStorage);

const views: Readonly<Record<RouteName, View>> = {
  login: loginView,
  dashboard: dashboardView,
  customers: customersView,
  products: productsView,
  sales: salesView,
  'new-sale': newSaleView,
  reports: reportsView,
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
  services,
  session,
  includeDevRoutes: import.meta.env.DEV,
}).start();

if (database.notice === 'recovered') {
  showToast(
    'Los datos guardados estaban dañados. Cargamos los datos demo y guardamos una copia.',
    'warning',
  );
}
