# Etapa 0 (Cimientos): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar el repositorio y toda la cadena de herramientas funcionando, para que las etapas siguientes solo se ocupen de la aplicación.

**Arquitectura:** proyecto Vite con TypeScript estricto, SCSS con importación parcial de Bootstrap y tests con Vitest. La única lógica real es `src/domain/result.ts`; `src/main.ts` es una página de comprobación que se reemplaza en la Etapa 2.

**Stack:** las versiones de la sección 3 del documento de diseño.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md)

## Restricciones globales

- Las versiones se instalan exactas (`-E`) y el proyecto declara `"engines": { "node": ">=26" }`.
- TypeScript es 6.0.3, no 7: `typescript-eslint` 8.72.1 exige una versión menor a 6.1.
- `@typescript-eslint/no-explicit-any` es un error.
- Sin frameworks ni dependencias fuera de la sección 3 del diseño.
- Los archivos del repositorio usan finales de línea LF.
- No ejecutar `npm audit fix --force` ni aprobar scripts de instalación.
- No afirmar que algo funciona sin haber ejecutado su comprobación.
- Git puede no estar en el PATH de la sesión. En ese caso, usar `C:\Program Files\Git\cmd\git.exe`.

## Foco de revisión

Fallos que los tests unitarios no cubren. Cada uno tiene su comprobación en la tarea indicada.

1. **Clon limpio:** `npm ci` desde cero debe dejar todo funcionando (Tarea 4).
2. **Comprobaciones que no detectan nada:** un error de tipos, un `any` o un test roto deben hacer fallar su comando, y el build no debe pasar con errores de tipos (Tareas 2 y 3).
3. **CSP en el build:** el modal, el gráfico, la fuente y los iconos deben funcionar con la política real, sin errores en consola (Tarea 3).
4. **Recargar una ruta interna:** `/clientes` debe devolver la app y no un 404 (Tarea 3).
5. **Finales de línea en Windows:** Git convierte a CRLF por defecto y Prettier exige LF; `format:check` debe pasar tras un checkout (Tareas 1 y 4).

---

### Tarea 1: Base del repositorio e instalación

**Archivos:**
- Crear: `.gitattributes`, `.gitignore`, `package.json`, `package-lock.json`

**Interfaces:**
- Produce: los scripts de npm y las dependencias que usan las demás tareas.

- [ ] **Paso 1: Fijar los finales de línea**

Crear `.gitattributes` con el contenido `* text=auto eol=lf` y normalizar lo ya versionado:

```bash
git add --renormalize .
```

- [ ] **Paso 2: Crear `.gitignore`**

```text
node_modules
dist
coverage
*.log
.claude
```

- [ ] **Paso 3: Crear `package.json`**

```json
{
  "name": "nexo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=26" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Paso 4: Instalar las dependencias**

```bash
npm i -E bootstrap@5.3.8 @popperjs/core@2.11.8 bootstrap-icons@1.13.2 chart.js@4.6.1 @fontsource-variable/geist@5.3.0
```

```bash
npm i -D -E vite@8.3.5 typescript@6.0.3 sass@1.107.1 vitest@5.1.0 @vitest/coverage-v8@5.1.0 eslint@10.14.0 typescript-eslint@8.72.1 prettier@3.9.10 @types/bootstrap@5.2.11
```

Esperado: termina sin errores. Puede aparecer un aviso sobre el script de instalación de `@parcel/watcher`; no se aprueba porque el build no lo necesita.

- [ ] **Paso 5: Comprobar versiones y auditoría**

Ejecutar `npm ls --depth=0`. Esperado: las versiones exactas de los dos comandos anteriores.

Ejecutar `npm audit --omit=dev`. Esperado: 0 vulnerabilidades.

Ejecutar `npm audit` y anotar el resultado. Esperado en la prueba previa: 9 moderadas con una sola causa, `minimatch` (GHSA-g3hv-75wg-m249), usada por ESLint y `typescript-eslint`. Solo se ejecuta en desarrollo y con patrones propios, así que el riesgo se acepta. Si aparece algo distinto, se informa antes de seguir.

- [ ] **Paso 6: Commit**

```bash
git add .gitattributes .gitignore package.json package-lock.json docs
```

```bash
git commit -m "chore: inicializar proyecto e instalar dependencias"
```

### Tarea 2: Tipos, lint, formato y tests

**Archivos:**
- Crear: `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `vite.config.ts`
- Crear: `src/domain/result.ts`
- Test: `src/domain/result.test.ts`

**Interfaces:**
- Consume: los scripts de la Tarea 1.
- Produce, en `src/domain/result.ts`:
  - `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`
  - `ok<T>(value: T): Result<T, never>`
  - `err<E>(error: E): Result<never, E>`

- [ ] **Paso 1: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Paso 2: Crear `eslint.config.js`**

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist', 'coverage']),
  tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
```

- [ ] **Paso 3: Crear la configuración de Prettier**

`.prettierrc`:

```json
{ "singleQuote": true, "printWidth": 100, "endOfLine": "lf" }
```

`.prettierignore`:

```text
package-lock.json
docs/
```

- [ ] **Paso 4: Crear `vite.config.ts` con la parte de tests**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/services/**', 'src/data/**'],
      exclude: ['**/*.test.ts'],
    },
  },
});
```

El umbral de 80 % se agrega al cerrar la Etapa 7, como indica el diseño.

- [ ] **Paso 5: Escribir el test que falla**

En `src/domain/result.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { err, ok } from './result';

describe('Result', () => {
  it('ok envuelve el valor', () => {
    expect(ok(5)).toEqual({ ok: true, value: 5 });
  });

  it('err envuelve el error', () => {
    expect(err('falló')).toEqual({ ok: false, error: 'falló' });
  });
});
```

- [ ] **Paso 6: Comprobar que falla**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./result`.

- [ ] **Paso 7: Implementar `src/domain/result.ts`**

Con el tipo y las dos funciones de **Interfaces**.

- [ ] **Paso 8: Comprobar que pasa**

Ejecutar `npm test`. Esperado: 2 tests aprobados.

- [ ] **Paso 9: Comprobar que las herramientas detectan errores**

Crear `src/verification-temp.ts` con `export const value: any = 1;` y ejecutar `npm run lint`. Esperado: falla por `no-explicit-any`.

Cambiar el contenido a `export const value: number = 'texto';` y ejecutar `npm run typecheck`. Esperado: falla por el tipo.

Borrar ese archivo, cambiar temporalmente `value: 5` por `value: 6` en el primer test y ejecutar `npm test`. Esperado: falla. Revertir el cambio.

- [ ] **Paso 10: Comprobar el estado final**

Ejecutar `npm run format`, y después `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` y `npm run test:coverage`. Esperado: todos terminan con código 0.

- [ ] **Paso 11: Commit**

```bash
git add tsconfig.json eslint.config.js .prettierrc .prettierignore vite.config.ts src
```

```bash
git commit -m "chore: configurar TypeScript, ESLint, Prettier y Vitest"
```

### Tarea 3: Build, estilos y seguridad con una página de comprobación

**Archivos:**
- Crear: `index.html`, `public/favicon.svg`, `src/main.ts`
- Crear: `src/styles/main.scss`, `src/styles/_bootstrap.scss`
- Modificar: `vite.config.ts`

**Interfaces:**
- Produce: `src/styles/_bootstrap.scss`, que la Etapa 2 amplía con los tokens. La página y `src/main.ts` son temporales y se reemplazan en la Etapa 2.

- [ ] **Paso 1: Crear `src/styles/_bootstrap.scss`**

```scss
@import 'bootstrap/scss/functions';

$primary: #7450ff;
$body-bg-dark: #0a0d14;
$font-family-sans-serif: 'Geist Variable', system-ui, sans-serif;

@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/utilities';
@import 'bootstrap/scss/root';
@import 'bootstrap/scss/reboot';
@import 'bootstrap/scss/type';
@import 'bootstrap/scss/containers';
@import 'bootstrap/scss/grid';
@import 'bootstrap/scss/tables';
@import 'bootstrap/scss/forms';
@import 'bootstrap/scss/buttons';
@import 'bootstrap/scss/transitions';
@import 'bootstrap/scss/dropdown';
@import 'bootstrap/scss/badge';
@import 'bootstrap/scss/close';
@import 'bootstrap/scss/toasts';
@import 'bootstrap/scss/modal';
@import 'bootstrap/scss/offcanvas';
@import 'bootstrap/scss/helpers';
@import 'bootstrap/scss/utilities/api';
```

`src/styles/main.scss` contiene solo `@use 'bootstrap';`.

- [ ] **Paso 2: Crear `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#7450ff"/><path d="M10 23V9l12 14V9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

- [ ] **Paso 3: Crear `index.html`**

Con `<html lang="es" data-bs-theme="dark">`, charset, viewport, `<title>NEXO</title>`, el favicon y `<script type="module" src="/src/main.ts">`. Sin atributos `style` ni scripts en línea. Debe contener:

- `<h1>` con el texto NEXO.
- Un botón `#open-check-modal` con clases `btn btn-primary`, que incluye `<span id="check-icon"></span>`.
- Un `<canvas id="check-chart" role="img" aria-label="Gráfico de comprobación">`.
- Un modal de Bootstrap `#check-modal`, con su título asociado por `aria-labelledby`.

- [ ] **Paso 4: Crear `src/main.ts`**

Importa `@fontsource-variable/geist`, `./styles/main.scss`, `bootstrap-icons/icons/check2-circle.svg?raw`, `bootstrap/js/dist/modal` y, de `chart.js`, `BarController`, `BarElement`, `CategoryScale`, `Chart` y `LinearScale`.

Define `requireElement<T extends HTMLElement>(id: string): T`, que lanza un `Error` si el elemento no existe. Con esa función, inserta el icono en `#check-icon`, abre el modal al hacer clic en `#open-check-modal` y dibuja un gráfico de barras en `#check-chart`.

- [ ] **Paso 5: Ampliar `vite.config.ts`**

Agregar sin tocar la sección `test`:

```ts
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
```

```ts
build: { assetsInlineLimit: 0 },
css: {
  preprocessorOptions: {
    scss: { quietDeps: true, silenceDeprecations: ['import'] },
  },
},
preview: {
  headers: {
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  },
},
```

`assetsInlineLimit: 0` evita que Vite incruste archivos como `data:`, lo que la CSP bloquearía en el caso de las fuentes.

- [ ] **Paso 6: Comprobar el build**

Ejecutar `npm run build`. Esperado: código 0, sin avisos de deprecación de Sass y con archivos `.woff2` en `dist/assets`.

En la prueba previa, el CSS pesó 165,73 kB (23,38 kB con gzip) y el JS 155,92 kB (54,16 kB con gzip). Son valores de referencia, no un requisito.

- [ ] **Paso 7: Comprobar que un error de tipos frena el build**

Crear `src/verification-temp.ts` con `export const value: number = 'texto';` y ejecutar `npm run build`. Esperado: falla antes de llegar a `vite build`. Borrar el archivo.

- [ ] **Paso 8: Comprobar el modo desarrollo**

Abrir `npm run dev` en el navegador. Esperado: la página carga y el modal se abre. Sin errores en consola.

- [ ] **Paso 9: Comprobar el build con la CSP real**

Con `npm run build` y `npm run preview`, abrir la página en el navegador. Esperado:

- La respuesta incluye las tres cabeceras configuradas.
- No hay errores en la consola, incluidas violaciones de CSP.
- El icono se ve, el gráfico se dibuja y el modal se abre y se cierra.
- `getComputedStyle(document.documentElement).getPropertyValue('--bs-primary')` devuelve `#7450ff`.
- `getComputedStyle(document.body).fontFamily` empieza con `"Geist Variable"` y `document.fonts.check('14px "Geist Variable"')` devuelve `true`.

- [ ] **Paso 10: Comprobar la recarga de una ruta interna**

Con `preview` activo, pedir `/clientes`. Esperado: estado 200 y una respuesta que contiene `<title>NEXO</title>`.

- [ ] **Paso 11: Commit**

Ejecutar antes `npm run format`.

```bash
git add index.html public src vite.config.ts
```

```bash
git commit -m "chore: comprobar build, Bootstrap parcial y CSP con una página temporal"
```

### Tarea 4: Cierre y reproducibilidad

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**
- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Comprobar los finales de línea**

Ejecutar `git ls-files --eol`. Esperado: `i/lf` y `w/lf` en todos los archivos de texto.

- [ ] **Paso 2: Comprobar una instalación limpia**

Borrar `node_modules` y `dist`, y ejecutar `npm ci`. Esperado: termina sin errores y sin modificar `package-lock.json`.

- [ ] **Paso 3: Ejecutar todas las comprobaciones**

Ejecutar en orden: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0.

- [ ] **Paso 4: Comprobar el repositorio**

Ejecutar `git status --short`. Esperado: sin cambios pendientes ni archivos temporales.

- [ ] **Paso 5: Revisar**

Pedir una revisión independiente de lo hecho en la etapa contra este plan y el diseño, y corregir lo que corresponda.

- [ ] **Paso 6: Informar y esperar aprobación**

El informe incluye:

- La salida real de cada comprobación y el resultado de `npm audit`.
- Los errores que aparecieron y cómo se resolvieron.
- Qué se construyó y los conceptos usados: bundler y compilador, lockfile, modo estricto, Result, TDD, CSP y por qué se acepta el aviso de `minimatch`.
- Cómo responder en una entrevista "¿por qué TypeScript 6 y no 7?".

No se empieza la Etapa 1 sin la aprobación del autor.
