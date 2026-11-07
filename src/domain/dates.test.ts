import { describe, expect, it } from 'vitest';
import { endOfDay, parseDateInput } from './dates';

// Los tests corren con la zona horaria de Buenos Aires (UTC-3), fijada en vite.config.ts.
describe('parseDateInput', () => {
  it('lee la fecha como medianoche local, no como UTC', () => {
    expect(parseDateInput('2026-11-05')?.toISOString()).toBe('2026-11-05T03:00:00.000Z');
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(parseDateInput('2024-02-29')?.toISOString()).toBe('2024-02-29T03:00:00.000Z');
  });

  // new Date(2026, 1, 30) no falla: pasa al 2 de marzo. Por eso hay que comprobar la fecha.
  it.each(['2025-02-29', '2026-02-30', '2026-13-01'])('rechaza la fecha imposible %s', (value) => {
    expect(parseDateInput(value)).toBeNull();
  });

  it.each(['', '05/11/2026', '2026-11-5'])('rechaza el texto "%s"', (value) => {
    expect(parseDateInput(value)).toBeNull();
  });
});

describe('endOfDay', () => {
  it('devuelve el último milisegundo del día local', () => {
    expect(endOfDay(new Date(2026, 10, 5, 15, 30)).toISOString()).toBe('2026-11-06T02:59:59.999Z');
  });
});
