import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

// Sin Docker no se puede levantar nginx: estos tests leen la configuración como texto y comprueban
// lo que, si se rompe, nginx no avisa. La imagen se prueba aparte con npm run check:deploy.
const headersConf = readFileSync(new URL('./security-headers.conf', import.meta.url), 'utf8');
const nginxConf = readFileSync(new URL('./nginx.conf', import.meta.url), 'utf8');

const INCLUDE_HEADERS = 'include /etc/nginx/snippets/security-headers.conf;';

/** Los bloques `location` de nginx.conf, que no se anidan: modificador y ruta, y su contenido. */
function locations(): Map<string, string> {
  const blocks = new Map<string, string>();
  for (const match of nginxConf.matchAll(/location\s+([^{]+?)\s*\{([^}]*)\}/g)) {
    blocks.set(match[1] ?? '', match[2] ?? '');
  }
  return blocks;
}

function location(name: string): string {
  const block = locations().get(name);
  if (block === undefined) throw new Error(`Falta el bloque location ${name}`);
  return block;
}

describe('security-headers.conf', () => {
  const lines = headersConf.split('\n').filter((line) => line.trim().startsWith('add_header'));

  it('tiene exactamente las cabeceras de deploy/security-headers.ts, con sus valores', () => {
    const declared = Object.fromEntries(
      lines.map((line) => {
        const match = /^\s*add_header\s+(\S+)\s+"([^"]*)"/.exec(line);
        return [match?.[1] ?? line, match?.[2] ?? ''];
      }),
    );

    expect(declared).toEqual(SECURITY_HEADERS);
  });

  // Sin always, nginx no las envía en los errores, como el 404 de un archivo inexistente.
  it('las envía también en los errores', () => {
    for (const line of lines) expect(line).toMatch(/\salways;\s*$/);
  });
});

describe('nginx.conf', () => {
  // Un add_header dentro de un location anula todos los que vienen del bloque server: sin este
  // include, las respuestas de ese location saldrían sin cabeceras de seguridad.
  it('cada location incluye las cabeceras de seguridad', () => {
    expect(locations().size).toBeGreaterThanOrEqual(3);
    for (const [name, block] of locations()) {
      expect(block, `location ${name}`).toContain(INCLUDE_HEADERS);
    }
  });

  it('cualquier ruta de la SPA sirve index.html', () => {
    expect(location('/')).toMatch(/try_files \$uri \/index\.html;/);
  });

  it('index.html se vuelve a pedir en cada visita', () => {
    expect(location('= /index.html')).toMatch(/add_header Cache-Control "no-cache";/);
  });

  it('un archivo inexistente de /assets/ da 404', () => {
    expect(location('/assets/')).toMatch(/try_files \$uri =404;/);
  });

  // Con always, un 404 de /assets/ también quedaría guardado un año en el navegador.
  it('los archivos de /assets/ se guardan un año, pero un 404 no', () => {
    expect(location('/assets/')).toMatch(
      /add_header Cache-Control "public, max-age=31536000, immutable";/,
    );
  });

  it('escucha en 8080, oculta la versión, redirige con rutas relativas y comprime', () => {
    expect(nginxConf).toMatch(/listen 8080;/);
    expect(nginxConf).toMatch(/server_tokens off;/);
    expect(nginxConf).toMatch(/absolute_redirect off;/);
    expect(nginxConf).toMatch(/gzip on;/);
  });
});
