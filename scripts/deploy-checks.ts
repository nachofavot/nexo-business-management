import { SECURITY_HEADERS } from '../deploy/security-headers.ts';

/** Lo que importa de una respuesta para comprobarla. No depende de fetch: se puede probar sin red. */
export interface ResponseSummary {
  status: number;
  /** Nombres en minúsculas, como los devuelve Headers. */
  headers: Readonly<Record<string, string>>;
}

export interface Expectation {
  /** Qué se pide, para el informe: "Recargar /clientes". */
  label: string;
  path: string;
  status: number;
  contentType?: RegExp;
  cacheControl?: string;
  /** Si el contenido tiene que llegar comprimido (gzip o br). */
  compressed?: boolean;
}

const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Los problemas de una respuesta, en castellano; una lista vacía es que está bien. */
export function checkResponse(expectation: Expectation, response: ResponseSummary): string[] {
  const problems: string[] = [];
  const header = (name: string): string | undefined => response.headers[name.toLowerCase()];

  if (response.status !== expectation.status) {
    problems.push(`Se esperaba el estado ${expectation.status} y llegó ${response.status}.`);
  }

  // En todas las respuestas, también en los errores.
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    const actual = header(name);
    if (actual === undefined) problems.push(`Falta la cabecera ${name}.`);
    else if (actual !== value) problems.push(`La cabecera ${name} es distinta: "${actual}".`);
  }

  // "nginx" o "Google Frontend" no dicen nada; "nginx/1.29.5" le dice a un atacante qué buscar.
  const server = header('server');
  if (server !== undefined && /\d/.test(server)) {
    problems.push(`La cabecera Server publica una versión: "${server}".`);
  }

  if (expectation.contentType !== undefined) {
    const type = header('content-type') ?? '';
    if (!expectation.contentType.test(type)) {
      problems.push(
        `Se esperaba un contenido ${expectation.contentType.source} y llegó "${type}".`,
      );
    }
  }

  if (expectation.cacheControl !== undefined) {
    const cache = header('cache-control') ?? '';
    if (cache !== expectation.cacheControl) {
      problems.push(`Se esperaba Cache-Control "${expectation.cacheControl}" y llegó "${cache}".`);
    }
  }

  if (expectation.compressed === true && !/gzip|br/.test(header('content-encoding') ?? '')) {
    problems.push('El contenido no llegó comprimido.');
  }

  // Un 404 inmutable quedaría guardado un año, aunque el archivo llegue en el próximo despliegue.
  if (response.status >= 400 && (header('cache-control') ?? '').includes('immutable')) {
    problems.push('Un error no puede guardarse como inmutable.');
  }

  return problems;
}

export interface RedirectVerdict {
  /** 'info' cuando no hay nada que comprobar: no cuenta como problema ni como control aprobado. */
  kind: 'ok' | 'info' | 'problem';
  message: string;
}

/**
 * La respuesta a /assets sin barra. Detrás de Cloud Run, una redirección absoluta mandaría al
 * navegador a http://…:8080; "//host/…" también es absoluta, aunque empiece con barra.
 */
export function checkRedirect(response: ResponseSummary): RedirectVerdict {
  if (response.status < 300 || response.status >= 400) {
    return { kind: 'info', message: '/assets no redirige: no hay redirección que comprobar.' };
  }
  const location = response.headers.location ?? '';
  return location.startsWith('/') && !location.startsWith('//')
    ? { kind: 'ok', message: 'La redirección de /assets es relativa.' }
    : { kind: 'problem', message: `La redirección de /assets va a "${location}".` };
}

/** El primer JS de /assets/ que carga index.html, o null si no hay. */
export function findScriptAsset(indexHtml: string): string | null {
  return /<script\b[^>]*\bsrc="(\/assets\/[^"]+\.js)"/.exec(indexHtml)?.[1] ?? null;
}

/** Lo que tiene que cumplir un despliegue, con el JS real que carga index.html. */
export function deployExpectations(scriptAsset: string): readonly Expectation[] {
  const page = { status: 200, contentType: /text\/html/, cacheControl: 'no-cache' };

  return [
    { label: 'Página principal', path: '/', ...page },
    { label: 'Recargar /clientes', path: '/clientes', ...page },
    { label: 'Recargar /ventas/nueva', path: '/ventas/nueva', ...page },
    {
      label: 'JS de la app',
      path: scriptAsset,
      status: 200,
      contentType: /javascript/,
      cacheControl: IMMUTABLE,
      compressed: true,
    },
    { label: 'Archivo inexistente', path: '/assets/no-existe-0000.js', status: 404 },
    { label: 'Ícono', path: '/favicon.svg', status: 200, contentType: /image\/svg\+xml/ },
  ];
}
