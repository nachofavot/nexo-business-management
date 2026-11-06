export type RouteName =
  | 'login'
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'sales'
  | 'new-sale'
  | 'reports'
  | 'settings'
  | 'not-found'
  | 'style-guide';

export interface Route {
  name: RouteName;
  path: string;
  title: string;
}

export type RouteResolution = { kind: 'render'; route: Route } | { kind: 'redirect'; to: string };

const LOGIN_PATH = '/login';
const HOME_PATH = '/dashboard';

const LOGIN_ROUTE: Route = { name: 'login', path: LOGIN_PATH, title: 'Acceso' };
const NEW_SALE_ROUTE: Route = { name: 'new-sale', path: '/ventas/nueva', title: 'Nueva venta' };
const NOT_FOUND_ROUTE: Route = { name: 'not-found', path: '', title: 'Página no encontrada' };
const STYLE_GUIDE_ROUTE: Route = {
  name: 'style-guide',
  path: '/dev/componentes',
  title: 'Guía de componentes',
};

export const NAV_ROUTES: readonly Route[] = [
  { name: 'dashboard', path: HOME_PATH, title: 'Dashboard' },
  { name: 'customers', path: '/clientes', title: 'Clientes' },
  { name: 'products', path: '/productos', title: 'Productos' },
  { name: 'sales', path: '/ventas', title: 'Ventas' },
  { name: 'reports', path: '/reportes', title: 'Reportes' },
  { name: 'settings', path: '/configuracion', title: 'Configuración' },
];

function withoutTrailingSlash(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/** Decide qué mostrar para una URL. No toca el navegador, por eso se puede probar sin él. */
export function resolveRoute(
  pathname: string,
  options: { isAuthenticated: boolean; includeDevRoutes: boolean },
): RouteResolution {
  const path = withoutTrailingSlash(pathname);

  if (!options.isAuthenticated) {
    return path === LOGIN_PATH
      ? { kind: 'render', route: LOGIN_ROUTE }
      : { kind: 'redirect', to: LOGIN_PATH };
  }
  if (path === '/' || path === LOGIN_PATH) return { kind: 'redirect', to: HOME_PATH };

  const routes = [
    ...NAV_ROUTES,
    NEW_SALE_ROUTE,
    ...(options.includeDevRoutes ? [STYLE_GUIDE_ROUTE] : []),
  ];
  const route = routes.find((candidate) => candidate.path === path) ?? NOT_FOUND_ROUTE;

  return { kind: 'render', route };
}

/** Indica qué ítem del menú marcar. "Nueva venta" pertenece a Ventas. */
export function activeNavPath(route: Route): string | null {
  const path = route.name === 'new-sale' ? '/ventas' : route.path;
  return NAV_ROUTES.some((candidate) => candidate.path === path) ? path : null;
}
