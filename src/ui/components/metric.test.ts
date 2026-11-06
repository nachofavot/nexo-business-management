import { describe, expect, it } from 'vitest';
import { metric } from './metric';

const base = { label: 'Ventas', value: '18' };

describe('metric', () => {
  it('muestra la etiqueta y el valor, sin detalle si no hay cambio ni ayuda', () => {
    const markup = metric(base).value;

    expect(markup).toContain('Ventas');
    expect(markup).toContain('18');
    expect(markup).not.toContain('nx-metric__detail');
  });

  it('marca como positivo un aumento y muestra la ayuda', () => {
    const markup = metric({ ...base, change: 12.5, helper: 'contra octubre' }).value;

    expect(markup).toContain('+12,5 %');
    expect(markup).toContain('nx-metric__change--up');
    expect(markup).toContain('contra octubre');
  });

  it('marca como negativa una baja', () => {
    const markup = metric({ ...base, change: -4.2 }).value;

    expect(markup).toContain('-4,2 %');
    expect(markup).toContain('nx-metric__change--down');
  });

  it('no marca un cambio de 0', () => {
    const markup = metric({ ...base, change: 0 }).value;

    expect(markup).toContain('0 %');
    expect(markup).not.toContain('nx-metric__change--up');
    expect(markup).not.toContain('nx-metric__change--down');
  });

  it('sin datos previos no muestra la ayuda de la comparación', () => {
    const markup = metric({ ...base, change: null, helper: 'contra octubre' }).value;

    expect(markup).toContain('Sin datos previos');
    expect(markup).not.toContain('contra octubre');
  });

  it('muestra la ayuda aunque no haya comparación', () => {
    const markup = metric({ ...base, helper: '5 unidades o menos' }).value;

    expect(markup).toContain('5 unidades o menos');
  });

  it('destaca la cifra principal', () => {
    expect(metric({ ...base, lead: true }).value).toContain('nx-metric--lead');
  });

  it('escapa los datos', () => {
    expect(metric({ label: '<b>', value: '<i>' }).value).not.toMatch(/<b>|<i>/);
  });
});
