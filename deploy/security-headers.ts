/**
 * Las cabeceras de seguridad de producción (diseño, sección 10), en un solo lugar. Las usan
 * `vite preview` y el script que comprueba un despliegue, y un test compara contra ellas el
 * archivo de nginx: así no pueden quedar distintas sin que falle algo.
 */
const CSP_DIRECTIVES = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
] as const;

/** Las directivas de la CSP de producción, en el orden del diseño. */
export const CONTENT_SECURITY_POLICY: string = CSP_DIRECTIVES.join('; ');

/** Las cabeceras que llevan todas las respuestas, en vite preview y en nginx. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
