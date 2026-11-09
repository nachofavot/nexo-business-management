import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const stages = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((match) => match[1]);

describe('Dockerfile', () => {
  it('compila con Node 26 sobre Alpine', () => {
    expect(stages[0]).toBe('node:26-alpine');
  });

  // nginxinc/nginx-unprivileged dejó de actualizarse con nginx 1.30.6: la imagen que sigue
  // recibiendo parches es nginx/nginx-unprivileged.
  it('sirve con la imagen de nginx sin root que se sigue actualizando', () => {
    expect(stages).toHaveLength(2);
    expect(stages[1]).toBe('nginx/nginx-unprivileged:stable-alpine');
  });

  it('nunca vuelve a root', () => {
    expect(dockerfile).not.toMatch(/^USER\s+root/m);
  });
});
