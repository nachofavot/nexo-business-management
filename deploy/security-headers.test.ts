import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from './security-headers';

// Copiada del diseño (sección 10): si alguien cambia la política, este test lo obliga a decidirlo.
const DESIGN_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; " +
  "frame-ancestors 'none'";

describe('cabeceras de seguridad', () => {
  it('la CSP es la del diseño, carácter por carácter', () => {
    expect(CONTENT_SECURITY_POLICY).toBe(DESIGN_CSP);
  });

  it('son exactamente las tres del diseño', () => {
    expect(SECURITY_HEADERS).toEqual({
      'Content-Security-Policy': DESIGN_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
  });
});
