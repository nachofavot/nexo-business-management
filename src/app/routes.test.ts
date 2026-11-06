import { describe, expect, it } from 'vitest';
import { activeNavPath, NAV_ROUTES, resolveRoute, type Route } from './routes';

const withSession = { isAuthenticated: true, includeDevRoutes: false };
const withoutSession = { isAuthenticated: false, includeDevRoutes: false };

function renderedName(pathname: string, options = withSession): string | null {
  const resolution = resolveRoute(pathname, options);
  return resolution.kind === 'render' ? resolution.route.name : null;
}

describe('resolveRoute sin sesión', () => {
  it.each(['/', '/clientes', '/no-existe'])('redirige %s al acceso', (pathname) => {
    expect(resolveRoute(pathname, withoutSession)).toEqual({ kind: 'redirect', to: '/login' });
  });

  it('muestra el acceso', () => {
    expect(renderedName('/login', withoutSession)).toBe('login');
  });
});

describe('resolveRoute con sesión', () => {
  it.each(['/', '/login'])('redirige %s al Dashboard', (pathname) => {
    expect(resolveRoute(pathname, withSession)).toEqual({ kind: 'redirect', to: '/dashboard' });
  });

  it.each([
    ['/dashboard', 'dashboard'],
    ['/clientes', 'customers'],
    ['/productos', 'products'],
    ['/ventas', 'sales'],
    ['/ventas/nueva', 'new-sale'],
    ['/reportes', 'reports'],
    ['/configuracion', 'settings'],
  ])('muestra %s', (pathname, name) => {
    expect(renderedName(pathname)).toBe(name);
  });

  it('ignora la barra final', () => {
    expect(renderedName('/clientes/')).toBe('customers');
  });

  it('muestra la página no encontrada para una ruta desconocida', () => {
    expect(renderedName('/no-existe')).toBe('not-found');
  });

  it('oculta la guía de componentes fuera de desarrollo', () => {
    expect(renderedName('/dev/componentes')).toBe('not-found');
  });

  it('muestra la guía de componentes en desarrollo', () => {
    const options = { isAuthenticated: true, includeDevRoutes: true };

    expect(renderedName('/dev/componentes', options)).toBe('style-guide');
  });
});

describe('NAV_ROUTES', () => {
  it('lista los seis módulos en orden', () => {
    expect(NAV_ROUTES.map(({ title }) => title)).toEqual([
      'Dashboard',
      'Clientes',
      'Productos',
      'Ventas',
      'Reportes',
      'Configuración',
    ]);
  });
});

describe('activeNavPath', () => {
  function routeNamed(pathname: string): Route {
    const resolution = resolveRoute(pathname, withSession);
    if (resolution.kind !== 'render') throw new Error(`La ruta ${pathname} redirige`);
    return resolution.route;
  }

  it.each([
    ['/ventas/nueva', '/ventas'],
    ['/clientes', '/clientes'],
    ['/no-existe', null],
  ])('para %s marca %s', (pathname, expected) => {
    expect(activeNavPath(routeNamed(pathname))).toBe(expected);
  });
});
