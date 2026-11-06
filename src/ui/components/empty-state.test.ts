import { describe, expect, it } from 'vitest';
import { html } from '../html';
import { emptyState } from './empty-state';

describe('emptyState', () => {
  it('muestra el título y la descripción sin agregar un encabezado', () => {
    const markup = emptyState('Sin datos', 'Detalle').value;

    expect(markup).toContain('Sin datos');
    expect(markup).toContain('Detalle');
    expect(markup).not.toContain('<h3');
  });

  it('escapa los textos', () => {
    expect(emptyState('<b>', '<i>').value).not.toMatch(/<b>|<i>/);
  });

  it('muestra la acción sin escaparla', () => {
    const markup = emptyState('T', 'D', html`<a href="/x">Ir</a>`).value;

    expect(markup).toContain('<a href="/x">Ir</a>');
  });
});
