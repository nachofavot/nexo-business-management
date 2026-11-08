import { describe, expect, it } from 'vitest';
import { segmented } from './segmented';

const options = {
  name: 'period',
  legend: 'Período',
  idPrefix: 'report-period',
  options: [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '<b>30</b> días' },
  ],
  value: '30d',
} as const;

const markup = segmented(options).value;

describe('segmented', () => {
  it('agrupa las opciones con una leyenda oculta', () => {
    expect(markup).toMatch(/^<fieldset class="nx-segmented-group">/);
    expect(markup).toMatch(/<legend class="visually-hidden">\s*Período\s*<\/legend>/);
    expect(markup).toContain('<div class="nx-segmented">');
  });

  it('puede mostrar la leyenda como la etiqueta de un campo', () => {
    expect(segmented({ ...options, visibleLegend: true }).value).toMatch(
      /<legend class="form-label">\s*Período\s*<\/legend>/,
    );
  });

  it('dibuja un radio nativo por opción, asociado a su etiqueta', () => {
    expect(markup.match(/type="radio"/g)).toHaveLength(2);
    expect(markup).toMatch(/<input[^>]*name="period"[^>]*id="report-period-7d"[^>]*value="7d"/);
    expect(markup).toContain('for="report-period-7d"');
    expect(markup).toContain('for="report-period-30d"');
  });

  it('elige solo la opción del valor', () => {
    expect(markup.match(/checked/g)).toHaveLength(1);
    expect(markup).toMatch(/id="report-period-30d"[^>]*checked/);
  });

  it('escapa las etiquetas', () => {
    expect(markup).not.toContain('<b>');
    expect(markup).toContain('&lt;b&gt;30');
  });
});
