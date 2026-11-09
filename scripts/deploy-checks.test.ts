import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../deploy/security-headers';
import {
  checkResponse,
  deployExpectations,
  findScriptAsset,
  type Expectation,
  type ResponseSummary,
} from './deploy-checks';

const securityHeaders = Object.fromEntries(
  Object.entries(SECURITY_HEADERS).map(([name, value]) => [name.toLowerCase(), value]),
);

const page: Expectation = {
  label: 'Recargar /clientes',
  path: '/clientes',
  status: 200,
  contentType: /text\/html/,
  cacheControl: 'no-cache',
};

const goodPage: ResponseSummary = {
  status: 200,
  headers: {
    ...securityHeaders,
    'content-type': 'text/html',
    'cache-control': 'no-cache',
    server: 'nginx',
  },
};

function withHeaders(headers: Record<string, string | undefined>): ResponseSummary {
  const merged: Record<string, string> = {};
  for (const [name, value] of Object.entries({ ...goodPage.headers, ...headers })) {
    if (value !== undefined) merged[name] = value;
  }
  return { status: goodPage.status, headers: merged };
}

describe('checkResponse', () => {
  it('no encuentra problemas en una respuesta que cumple todo', () => {
    expect(checkResponse(page, goodPage)).toEqual([]);
  });

  it('avisa si falta una cabecera de seguridad', () => {
    const problems = checkResponse(page, withHeaders({ 'referrer-policy': undefined }));

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Referrer-Policy');
  });

  it('avisa si la CSP es distinta', () => {
    const csp = `${SECURITY_HEADERS['Content-Security-Policy'] ?? ''}; script-src 'unsafe-inline'`;
    const problems = checkResponse(page, withHeaders({ 'content-security-policy': csp }));

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Content-Security-Policy');
  });

  it('avisa si el servidor publica su versión', () => {
    expect(checkResponse(page, withHeaders({ server: 'nginx/1.29.5' }))).toEqual([
      'La cabecera Server publica una versión: "nginx/1.29.5".',
    ]);
  });

  it.each(['Google Frontend', 'nginx'])('acepta Server: %s', (server) => {
    expect(checkResponse(page, withHeaders({ server }))).toEqual([]);
  });

  it('acepta una respuesta sin cabecera Server', () => {
    expect(checkResponse(page, withHeaders({ server: undefined }))).toEqual([]);
  });

  it('avisa si el estado es otro, con los dos valores', () => {
    const problems = checkResponse({ ...page, status: 404 }, goodPage);

    expect(problems).toEqual(['Se esperaba el estado 404 y llegó 200.']);
  });

  it('avisa si Cache-Control es otro, con los dos valores', () => {
    const problems = checkResponse(page, withHeaders({ 'cache-control': 'max-age=60' }));

    expect(problems).toEqual(['Se esperaba Cache-Control "no-cache" y llegó "max-age=60".']);
  });

  it('avisa si el tipo de contenido es otro', () => {
    const problems = checkResponse(page, withHeaders({ 'content-type': 'application/json' }));

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('application/json');
  });

  it('avisa si el contenido tenía que llegar comprimido y no llegó', () => {
    expect(checkResponse({ ...page, compressed: true }, goodPage)).toEqual([
      'El contenido no llegó comprimido.',
    ]);
    expect(
      checkResponse({ ...page, compressed: true }, withHeaders({ 'content-encoding': 'br' })),
    ).toEqual([]);
  });

  // Un 404 guardado como inmutable quedaría un año en el navegador.
  it('avisa si un error se guarda como inmutable', () => {
    const missing: Expectation = {
      label: 'Archivo inexistente',
      path: '/assets/x.js',
      status: 404,
    };
    const response: ResponseSummary = {
      status: 404,
      headers: { ...securityHeaders, 'cache-control': 'public, max-age=31536000, immutable' },
    };

    expect(checkResponse(missing, response)).toEqual([
      'Un error no puede guardarse como inmutable.',
    ]);
  });
});

describe('findScriptAsset', () => {
  it('encuentra el JS que carga index.html', () => {
    const html = `<head>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <script type="module" crossorigin src="/assets/index-BBljRCqK.js"></script>
      <link rel="stylesheet" crossorigin href="/assets/index-C_KWDupQ.css">
    </head>`;

    expect(findScriptAsset(html)).toBe('/assets/index-BBljRCqK.js');
  });

  it('da null si no hay ningún script de /assets/', () => {
    expect(findScriptAsset('<html><body>Hola</body></html>')).toBeNull();
  });
});

describe('deployExpectations', () => {
  const expectations = deployExpectations('/assets/index-abc.js');
  const byLabel = (label: string) =>
    expectations.find((expectation) => expectation.label === label);

  it('recarga varias pantallas de la SPA', () => {
    for (const path of ['/', '/clientes', '/ventas/nueva']) {
      expect(expectations.find((expectation) => expectation.path === path)).toMatchObject({
        status: 200,
        cacheControl: 'no-cache',
      });
    }
  });

  it('el JS de la app se guarda un año y llega comprimido', () => {
    expect(byLabel('JS de la app')).toMatchObject({
      path: '/assets/index-abc.js',
      status: 200,
      cacheControl: 'public, max-age=31536000, immutable',
      compressed: true,
    });
  });

  it('un archivo inexistente de /assets/ da 404', () => {
    expect(byLabel('Archivo inexistente')).toMatchObject({
      path: '/assets/no-existe-0000.js',
      status: 404,
    });
  });
});
