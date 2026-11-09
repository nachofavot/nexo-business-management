import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCUMENTS = ['README.md', 'docs/guia-entrevista.md'].filter((path) =>
  existsSync(join(ROOT, path)),
);

/** Los destinos relativos de los enlaces e imágenes de Markdown: [texto](destino). */
function relativeTargets(markdown: string): string[] {
  const targets: string[] = [];
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1] ?? '';
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    targets.push(decodeURI(target.split('#')[0] ?? ''));
  }
  return targets;
}

/**
 * Comprueba cada parte del camino contra la lista real de la carpeta. En Windows, existsSync no
 * distingue mayúsculas, pero GitHub sí: "Dashboard.png" se rompería al publicar.
 */
function existsWithSameCase(absolutePath: string): boolean {
  const parts = relative(ROOT, absolutePath)
    .split(sep)
    .filter((part) => part !== '');
  let current = ROOT;
  for (const part of parts) {
    if (!existsSync(current) || !readdirSync(current).includes(part)) return false;
    current = join(current, part);
  }
  return true;
}

describe.each(DOCUMENTS)('enlaces de %s', (document) => {
  const markdown = readFileSync(join(ROOT, document), 'utf8');
  const targets = relativeTargets(markdown);

  it.each(targets.length > 0 ? targets : ['(sin enlaces relativos)'])(
    'existe %s, con esas mayúsculas',
    (target) => {
      if (target === '(sin enlaces relativos)') return;
      const absolute = normalize(join(ROOT, dirname(document), target));
      expect(absolute.startsWith(ROOT), `${target} sale del repositorio`).toBe(true);
      expect(existsWithSameCase(absolute), `${target} no existe con esas mayúsculas`).toBe(true);
    },
  );
});
