import { describe, expect, it } from 'vitest';
import { chartFigure } from './figure';

function render(overrides: Partial<Parameters<typeof chartFigure>[0]> = {}): string {
  return chartFigure({
    id: 'revenue',
    title: 'Ingresos',
    summary: 'Total: $ 450,00.',
    table: {
      headers: ['Día', 'Ingresos'],
      rows: [
        ['5 de noviembre', '$ 200,00'],
        ['6 de noviembre', '$ 250,00'],
      ],
    },
    ...overrides,
  }).value;
}

describe('chartFigure', () => {
  it('titula la figura y la nombra con ese título', () => {
    const markup = render();

    expect(markup).toMatch(/<h2[^>]*id="revenue-title"[^>]*>\s*Ingresos/);
    expect(markup).toContain('aria-labelledby="revenue-title"');
  });

  it('muestra el resumen como texto', () => {
    expect(render()).toContain('Total: $ 450,00.');
  });

  it('oculta el canvas a los lectores de pantalla', () => {
    expect(render()).toMatch(/class="nx-chart__canvas"[^>]*>\s*<canvas[^>]*aria-hidden="true"/);
  });

  // La clase va en un div: una tabla no respeta height ni overflow, y con muchas filas estiraba la
  // página aunque estuviera oculta.
  it('incluye una tabla oculta con todos los datos', () => {
    const markup = render();

    expect(markup).toMatch(/<div class="visually-hidden">\s*<table>\s*<caption>\s*Ingresos/);
    expect(markup).not.toContain('<table class=');
    expect(markup).toContain('<th scope="col">Día</th>');
    expect(markup).toContain('<th scope="col">Ingresos</th>');
    expect(markup.match(/<tr>/g)).toHaveLength(3);
    expect(markup).toContain('6 de noviembre');
  });

  it('escapa los datos de la tabla y del resumen', () => {
    const markup = render({
      summary: '<img src=x> encabeza',
      table: { headers: ['Producto', 'Unidades'], rows: [['<img src=x>', '5']] },
    });

    expect(markup).not.toContain('<img');
  });

  it('sin datos muestra el estado vacío en lugar del gráfico y la tabla', () => {
    const markup = render({
      empty: { title: 'Sin ventas este mes', description: 'Las ventas del mes aparecen acá.' },
    });

    expect(markup).toContain('Sin ventas este mes');
    expect(markup).not.toContain('<canvas');
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('Total: $ 450,00.');
  });
});
