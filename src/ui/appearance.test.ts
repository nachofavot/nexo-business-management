import { describe, expect, it } from 'vitest';
import { applyAppearance } from './appearance';

describe('applyAppearance', () => {
  it('escribe el acento y la densidad en el elemento raíz', () => {
    const dataset: DOMStringMap = {};
    const target = { dataset };

    applyAppearance(target, { accent: 'blue', tableDensity: 'compact' });

    expect(target.dataset).toEqual({ accent: 'blue', density: 'compact' });
  });

  it('una segunda llamada reemplaza los dos valores', () => {
    const dataset: DOMStringMap = {};
    const target = { dataset };

    applyAppearance(target, { accent: 'blue', tableDensity: 'compact' });
    applyAppearance(target, { accent: 'violet', tableDensity: 'comfortable' });

    expect(target.dataset).toEqual({ accent: 'violet', density: 'comfortable' });
  });
});
