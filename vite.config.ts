import { defineConfig } from 'vitest/config';
import { SECURITY_HEADERS } from './deploy/security-headers.ts';

export default defineConfig({
  build: { assetsInlineLimit: 0 },
  css: {
    preprocessorOptions: {
      scss: { quietDeps: true, silenceDeprecations: ['import'] },
    },
  },
  // Las mismas cabeceras que nginx en producción: así se prueba el build con la CSP activa.
  preview: { headers: { ...SECURITY_HEADERS } },
  test: {
    environment: 'node',
    env: { TZ: 'America/Argentina/Buenos_Aires' },
    include: ['src/**/*.test.ts', 'deploy/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/services/**', 'src/data/**'],
      exclude: ['**/*.test.ts'],
      // El diseño (sección 11) exige al menos 80 % de líneas en cada capa con lógica de negocio.
      thresholds: {
        'src/domain/**': { lines: 80 },
        'src/services/**': { lines: 80 },
        'src/data/**': { lines: 80 },
      },
    },
  },
});
