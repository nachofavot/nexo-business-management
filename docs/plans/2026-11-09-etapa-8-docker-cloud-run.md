# Etapa 8 (Docker y Cloud Run): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar la app lista para producción: una imagen Docker de dos etapas, nginx con las cabeceras de seguridad y el comportamiento de una SPA, un script que comprueba cualquier despliegue y la guía para publicarla en Cloud Run.

**Arquitectura:** `node:26-alpine` compila la app y `nginxinc/nginx-unprivileged` sirve `dist/` en el puerto 8080, sin root. Las cabeceras de seguridad tienen una sola fuente, `deploy/security-headers.ts`: la usan `vite preview` y el script de verificación, y un test compara contra ella el archivo de nginx. El script `npm run check:deploy -- <url>` comprueba la imagen local y, después, la URL pública de Cloud Run.

**Stack:** Docker, nginx (imagen sin privilegios), TypeScript ejecutado directamente por Node 26 y Vitest. Una dependencia de desarrollo nueva: `@types/node` 26.6.6 (decisión 4).

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 10 (seguridad y cabeceras), 12 (despliegue) y 13 (la Etapa 8 termina con Dockerfile y nginx listos, cabeceras comprobadas y la guía escrita en el README; la imagen se prueba si Docker está disponible).

## Decisiones para tu aprobación

1. **Docker Desktop lo instalás vos.** Hoy no están Docker, gcloud ni nginx; sí está WSL 2 con Ubuntu, que Docker Desktop necesita. Se instala desde docker.com con permisos de administrador y es gratis para uso personal. Sin Docker, todo lo demás de la etapa se hace igual, pero la imagen queda sin probar y lo digo así.
2. **El despliegue lo hacés vos, con tu cuenta y cuando quieras.** Cloud Run necesita un proyecto de Google Cloud con facturación activa. Yo dejo la guía, el comando y el script que comprueba la URL pública. No afirmo que la app está publicada hasta que la URL responda y pase el script.
3. **Imágenes por línea, no por versión exacta:** `node:26-alpine` y `nginxinc/nginx-unprivileged:stable-alpine`. Cada reconstrucción toma los parches de seguridad de esa línea; a cambio, dos builds hechos con meses de diferencia pueden usar versiones menores distintas. Antes de usarlas se confirma en Docker Hub que las dos etiquetas existen.
4. **`@types/node` como dependencia de desarrollo, con un `tsconfig.node.json` aparte.** El script de verificación y los tests de la configuración usan `fetch`, `process` y `node:fs`; sin esos tipos, TypeScript no los conoce. El código del navegador sigue sin tipos de Node, así que `process` no se puede usar ahí por error. No llega ni al navegador ni a la imagen final.
5. **nginx comprime y no da pistas:** gzip para HTML, CSS, JS y SVG (el JS baja de 327 a unos 108 kB), `server_tokens off` para no publicar la versión de nginx, y `absolute_redirect off`. Cloud Run recibe HTTPS y le habla al contenedor por HTTP en el puerto 8080; con redirecciones absolutas, nginx mandaría al navegador a `http://…:8080`.
6. **`npm audit` se informa y el riesgo se acepta de nuevo.** Hoy da 0 vulnerabilidades en producción y 9 moderadas con una sola causa, `minimatch` (GHSA-g3hv-75wg-m249), que usan ESLint y `typescript-eslint` solo al desarrollar. Tampoco llegan a la imagen final: la etapa de nginx copia solo `dist/`.

## Restricciones globales

- Cabeceras de producción, exactas (diseño, sección 10):
  - `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
- nginx (diseño, sección 12): cualquier ruta de la SPA sirve `index.html`; un archivo inexistente en `/assets/` devuelve 404; `/assets/*` usa `Cache-Control: public, max-age=31536000, immutable`; `index.html` usa `Cache-Control: no-cache`; las cabeceras de seguridad van en todas las respuestas.
- La imagen corre sin root y escucha en el puerto 8080.
- Sin `any`. Sin dependencias nuevas fuera de `@types/node`. Rama `etapa-8-docker-cloud-run`. Commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` y títulos de tareas con `### Task N:`.
- No se inventan credenciales ni se afirma un despliegue que no se hizo. Los comandos de `gcloud` los ejecuta el autor.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` y `npm run build` terminan con código 0. En los comandos de varios pasos, cada comprobación lleva `|| exit 1`.

**Fuera de alcance:**

- El despliegue real, que hace el autor (decisión 2).
- README completo, capturas y guía de entrevista: Etapa 9. Esta etapa crea `README.md` solo con la sección de despliegue.
- Integración continua, dominio propio y HTTPS propio: Cloud Run ya da una URL con HTTPS.
- Los pendientes menores de la Etapa 7, anotados al final de su plan.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Recargar una pantalla:** en la imagen, recargar `/clientes` o `/ventas/nueva` muestra la app y no un 404 de nginx (Task 2 y Task 4).
2. **Cabeceras perdidas:** en nginx, un `add_header` dentro de un `location` anula todos los que vienen del bloque `server`, y sin `always` no se envían en los errores. Cada respuesta, incluido el 404 de `/assets/`, lleva las tres cabeceras (Task 2, Task 3 y Task 4).
3. **Un 404 guardado un año:** un archivo inexistente de `/assets/` no lleva `immutable`; si lo llevara, el navegador recordaría el error aunque el archivo llegue en el próximo despliegue (Task 2).
4. **Una versión nueva que no aparece:** después de un despliegue, `index.html` se pide de nuevo (`no-cache`) y apunta a los archivos nuevos (Task 2 y Task 4).
5. **Redirecciones detrás de Cloud Run:** pedir `/assets` sin barra no manda al navegador a `http://…:8080` (Task 2 y Task 4).

---

### Task 1: Cabeceras con una sola fuente y tipos de Node

**Archivos:**

- Crear: `deploy/security-headers.ts`, `deploy/security-headers.test.ts`, `tsconfig.node.json`
- Modificar: `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`

**Interfaces:**

- Produce:

```ts
// deploy/security-headers.ts
/** Las directivas de la CSP de producción, en el orden del diseño. */
export const CONTENT_SECURITY_POLICY: string;
/** Las cabeceras que llevan todas las respuestas, en vite preview y en nginx. */
export const SECURITY_HEADERS: Readonly<Record<string, string>>;
```

- `tsconfig.json` incluye solo `src`. `tsconfig.node.json` incluye `vite.config.ts`, `deploy` y `scripts`, con `"types": ["node"]`, `"lib": ["ES2023"]` y las mismas opciones estrictas.
- `package.json`:
  - `"typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json"`
  - `build` sigue igual (`tsc --noEmit && vite build`): en Docker alcanza con comprobar la app.
  - `@types/node` exacto `26.6.6` en `devDependencies`, instalado con `npm install -D -E @types/node@26.6.6`.
- `vite.config.ts`: `preview.headers` pasa a ser `SECURITY_HEADERS`, y `test.include` suma `deploy/**/*.test.ts` y `scripts/**/*.test.ts`.

- [ ] **Paso 1: Escribir el test que falla**

| Caso | Esperado |
|---|---|
| `CONTENT_SECURITY_POLICY` | Igual, carácter por carácter, a la CSP de las restricciones globales |
| `SECURITY_HEADERS` | Exactamente `Content-Security-Policy`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer` |

- [ ] **Paso 2: Comprobar que falla**

Ejecutar `npx vitest run deploy`. Esperado: falla porque `deploy/security-headers.ts` no existe.

- [ ] **Paso 3: Implementar e instalar `@types/node`**

- [ ] **Paso 4: Comprobar `vite preview`**

Con `npm run build` y `npm run preview`, `curl -sI http://localhost:4173/` muestra las tres cabeceras con los mismos valores que antes.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `chore: unificar las cabeceras de seguridad y separar los tipos de Node`.

### Task 2: nginx y Dockerfile

**Archivos:**

- Crear: `deploy/nginx.conf`, `deploy/security-headers.conf`, `deploy/nginx-config.test.ts`, `Dockerfile`, `.dockerignore`

**Interfaces:**

- Consume: `SECURITY_HEADERS` (Task 1).
- `deploy/security-headers.conf`: una línea `add_header <Nombre> "<valor>" always;` por cada cabecera de `SECURITY_HEADERS`. `always` hace que vayan también en los errores.
- `deploy/nginx.conf` es un bloque `server` que reemplaza a `/etc/nginx/conf.d/default.conf`:

| Directiva | Valor |
|---|---|
| `listen` | `8080` |
| `root` / `index` | `/usr/share/nginx/html` / `index.html` |
| `server_tokens` | `off` |
| `absolute_redirect` | `off` |
| `gzip` | `on`, con `gzip_vary on`, `gzip_min_length 1024` y `gzip_types text/css application/javascript text/javascript image/svg+xml` |
| `location /` | `include` del archivo de cabeceras y `try_files $uri /index.html` |
| `location = /index.html` | `include` del archivo de cabeceras y `add_header Cache-Control "no-cache"` |
| `location /assets/` | `include` del archivo de cabeceras, `add_header Cache-Control "public, max-age=31536000, immutable"` **sin** `always`, y `try_files $uri =404` |

- `Dockerfile`:
  - Etapa `build`: `FROM node:26-alpine`, `WORKDIR /app`, copia `package.json` y `package-lock.json`, ejecuta `npm ci`, copia el resto y ejecuta `npm run build`. Copiar primero los dos archivos de dependencias hace que Docker reutilice `npm ci` mientras no cambien.
  - Etapa final: `FROM nginxinc/nginx-unprivileged:stable-alpine`. Copia `deploy/nginx.conf` a `/etc/nginx/conf.d/default.conf`, `deploy/security-headers.conf` a `/etc/nginx/snippets/security-headers.conf` y `dist/` a `/usr/share/nginx/html`, y declara `EXPOSE 8080`. Sin `USER root` en ningún paso.
- `.dockerignore`: `node_modules`, `dist`, `coverage`, `.git`, `.claude`, `.playwright-mcp`, `.superpowers`, `docs`, `*.log`. `deploy/` queda en el contexto, porque `vite.config.ts` importa `deploy/security-headers.ts`.

- [ ] **Paso 1: Escribir los tests que fallan**

`deploy/nginx-config.test.ts` lee los dos archivos con `node:fs`. Los bloques `location` no se anidan, así que se pueden recorrer con una expresión regular.

| Caso | Esperado |
|---|---|
| Las líneas `add_header` de `security-headers.conf` | Las mismas cabeceras y valores que `SECURITY_HEADERS`, todas con `always`, ni una más |
| Cada bloque `location` de `nginx.conf` | Tiene `include /etc/nginx/snippets/security-headers.conf;`. Si faltara, su `add_header` anularía las cabeceras heredadas |
| `location /assets/` | `try_files $uri =404;` y el `Cache-Control` inmutable sin `always` |
| `location = /index.html` | `Cache-Control "no-cache"` |
| `location /` | `try_files $uri /index.html;` |
| Bloque `server` | `listen 8080;`, `server_tokens off;`, `absolute_redirect off;` y `gzip on;` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npx vitest run deploy`. Esperado: fallan porque los archivos no existen.

- [ ] **Paso 3: Implementar los cinco archivos**

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: agregar la imagen Docker y la configuración de nginx`.

### Task 3: Script de verificación del despliegue

**Archivos:**

- Crear: `scripts/deploy-checks.ts`, `scripts/deploy-checks.test.ts`, `scripts/check-deploy.ts`
- Modificar: `package.json` (`"check:deploy": "node scripts/check-deploy.ts"`)

**Interfaces:**

- Consume: `SECURITY_HEADERS` (Task 1).
- Produce:

```ts
// scripts/deploy-checks.ts: puro, sin red.
export interface ResponseSummary {
  status: number;
  /** Nombres en minúsculas, como los devuelve Headers. */
  headers: Readonly<Record<string, string>>;
}
export interface Expectation {
  /** Qué se pide, para el informe: "Recargar /clientes". */
  label: string;
  path: string;
  status: number;
  contentType?: RegExp;
  cacheControl?: string;
  /** Si el contenido tiene que llegar comprimido (gzip o br). */
  compressed?: boolean;
}
/** Los problemas de una respuesta, en castellano; una lista vacía es que está bien. */
export function checkResponse(expectation: Expectation, response: ResponseSummary): string[];
/** El primer JS de /assets/ que carga index.html, o null si no hay. */
export function findScriptAsset(indexHtml: string): string | null;
/** Lo que tiene que cumplir un despliegue, con el JS real que carga index.html. */
export function deployExpectations(scriptAsset: string): readonly Expectation[];
```

- `checkResponse` siempre controla las tres cabeceras de `SECURITY_HEADERS` y que la cabecera `Server`, si existe, no tenga números de versión. Cloud Run la reemplaza por `Google Frontend`, que también pasa.
- `deployExpectations`:

| Etiqueta | Ruta | Esperado |
|---|---|---|
| Página principal | `/` | 200, `text/html`, `no-cache` |
| Recargar /clientes | `/clientes` | 200, `text/html`, `no-cache` |
| Recargar /ventas/nueva | `/ventas/nueva` | 200, `text/html`, `no-cache` |
| JS de la app | el de `index.html` | 200, `javascript`, `public, max-age=31536000, immutable`, comprimido |
| Archivo inexistente | `/assets/no-existe-0000.js` | 404, sin `immutable` |
| Ícono | `/favicon.svg` | 200, `image/svg+xml` |

- `check-deploy.ts` recibe la URL base como argumento. Pide `index.html`, arma las expectativas, hace cada pedido con `fetch` y `redirect: 'manual'`, e imprime una línea por pedido: `OK  Recargar /clientes` o `MAL Recargar /clientes: <problema>`. Además pide `/assets` sin barra y, si la respuesta es una redirección, comprueba que el `Location` sea relativo. Termina con código 1 si hubo algún problema, y con código 2 y el modo de uso si falta la URL.

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| Respuesta que cumple todo | `[]` |
| Falta `Referrer-Policy` | Un problema que nombra la cabecera |
| CSP con `'unsafe-inline'` agregado | Un problema que nombra la CSP |
| `Server: nginx/1.29.5` | Un problema por la versión expuesta |
| `Server: Google Frontend` o `nginx` | Sin problema |
| Estado 200 donde se esperaba 404 | Un problema que dice los dos estados |
| `Cache-Control` distinto | Un problema con el valor esperado y el recibido |
| `compressed` sin `content-encoding` | Un problema |
| 404 con `immutable` | Un problema |
| `findScriptAsset` con el `index.html` del build | `/assets/index-<hash>.js` |
| `findScriptAsset` sin scripts | `null` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npx vitest run scripts`. Esperado: fallan porque `deploy-checks.ts` no existe.

- [ ] **Paso 3: Implementar**

- [ ] **Paso 4: Ver el rojo contra `vite preview`**

Con `npm run preview` levantado, `npm run check:deploy -- http://localhost:4173` tiene que terminar con código 1: Vite no pone `Cache-Control` ni comprime. Las cabeceras de seguridad tienen que dar OK en todas las respuestas. Esto prueba que el script detecta lo que falta, antes de tener Docker.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar un script que comprueba el despliegue`.

### Task 4: Probar la imagen

Requiere Docker. Si `docker version` no responde, la tarea se saltea, se registra en el plan y el cierre dice que la imagen no se probó.

- [ ] **Paso 1: Confirmar las imágenes base**

En Docker Hub, las etiquetas `node:26-alpine` y `nginxinc/nginx-unprivileged:stable-alpine` existen. En la imagen de nginx, `/etc/nginx/conf.d/default.conf` es el archivo que se reemplaza y el usuario es el 101. Si algo de esto cambió, se ajusta el Dockerfile y se registra la decisión.

- [ ] **Paso 2: Construir y medir**

`docker build -t nexo:etapa-8 .` termina sin errores. Se anota el tamaño de la imagen (`docker image ls nexo:etapa-8`).

- [ ] **Paso 3: Ejecutar y comprobar**

| Prueba | Esperado |
|---|---|
| `docker run -d --name nexo -p 8080:8080 nexo:etapa-8`, después `docker exec nexo id -u` | `101` |
| `npm run check:deploy -- http://localhost:8080` | Todas las líneas OK y código 0 |
| `curl -sI http://localhost:8080/assets` | Si redirige, `Location: /assets/`, sin host ni puerto |
| Navegador en `http://localhost:8080`: recarga completa sin caché de `/clientes`, entrar a la demo, crear un cliente y recargar | La app funciona, el cliente sigue y la consola no tiene errores ni avisos de la CSP |
| Construir de nuevo sin cambios | Docker reutiliza el paso de `npm ci` |

- [ ] **Paso 4: Limpiar**

`docker rm -f nexo`. La imagen queda para que el autor la pruebe.

Esta tarea no tiene commit propio, salvo que el Paso 1 cambie el Dockerfile. Sus resultados se registran en el plan, en la Task 5.

### Task 5: Guía de despliegue y cierre

**Archivos:**

- Crear: `README.md`, solo con el título, una línea de descripción y la sección "Despliegue". La Etapa 9 completa el resto.
- Modificar: este plan, que suma al final "Decisiones tomadas al ejecutar el plan".

- [ ] **Paso 1: Confirmar los comandos contra la documentación vigente**

En la referencia oficial de `gcloud run deploy` y en la guía de despliegue desde el código fuente de Cloud Run, comprobar:

- Que `--source .` construye con el `Dockerfile` del proyecto.
- Que `--region southamerica-east1`, `--allow-unauthenticated`, `--port 8080`, `--memory 256Mi` y `--max-instances 1` siguen siendo válidos, y el mínimo de memoria vigente.
- Qué APIs hay que habilitar.

Cada diferencia con el diseño se corrige en la guía y se registra.

- [ ] **Paso 2: Escribir la sección "Despliegue"**

Contenido, en este orden:

1. Requisitos: Docker para probar la imagen; para publicar, la CLI de gcloud y un proyecto de Google Cloud con facturación activa. Se recomienda una alerta de presupuesto.
2. Probar la imagen: `docker build`, `docker run` y `npm run check:deploy -- http://localhost:8080`.
3. Publicar: `gcloud auth login`, `gcloud config set project <ID>`, habilitar las APIs y el comando de despliegue confirmado en el Paso 1.
4. Comprobar la URL pública: `npm run check:deploy -- <URL>` y una recarga de `/clientes` en el navegador.
5. Borrar el servicio cuando ya no se use: `gcloud run services delete nexo --region southamerica-east1`.

- [ ] **Paso 3: Registrar las decisiones y el resultado de `npm audit`**

- [ ] **Paso 4: Comprobar y hacer commit**

Mensajes: `docs: agregar la guía de despliegue` y `docs: registrar las decisiones de Docker y Cloud Run`.

## Decisiones tomadas al ejecutar el plan

Registradas para que el plan describa lo que se construyó.

**La imagen no se probó.** Docker no estaba instalado al llegar a la Task 4. Sin Docker se confirmó en Docker Hub que existen `node:26-alpine` y `nginx/nginx-unprivileged:stable-alpine`, las dos con imagen `amd64`, que es la que usa Cloud Run. El Dockerfile oficial de la línea estable confirma nginx 1.30.6, el usuario 101, el puerto 8080 y que la configuración del servidor es `/etc/nginx/conf.d/default.conf`, el archivo que se reemplaza. Construir la imagen, `npm run check:deploy -- http://localhost:8080` y la prueba en el navegador quedan pendientes hasta tener Docker.

**Configuración de TypeScript**

- `tsconfig.node.json` suma `allowImportingTsExtensions`, y los scripts importan con `.ts`. Node exige la extensión cuando ejecuta TypeScript directamente; TypeScript lo permite porque el proyecto no genera archivos (`noEmit`).
- `test.include` de Vitest suma `deploy` y `scripts`.

**nginx**

- Los tests leen la configuración como texto. Se rompió a propósito de cinco maneras (sin el `include` en `/assets/`, `Cache-Control` inmutable con `always`, `Referrer-Policy` sin `always`, una CSP distinta y la SPA sin `index.html`), y cada una hizo fallar algún test.
- `absolute_redirect off` queda como defensa: con `try_files $uri /index.html`, nginx no llega a redirigir carpetas, y `/assets` sin barra devuelve la app. El script lo informa como "no redirige".

**Script de verificación**

- Contra `vite preview` informa dos problemas y termina con código 1, como corresponde: Vite no guarda los archivos un año y responde `index.html` con 200 para un archivo inexistente. Las cabeceras de seguridad dan bien en todas las respuestas.

**Cloud Run.** Los comandos se confirmaron en la documentación vigente, con dos cambios respecto del diseño:

- `--memory 512Mi` en lugar de `256Mi`. El mínimo es de 128 MiB en la primera generación y de 512 MiB en la segunda; 512 MiB vale en las dos y no depende de elegir la generación con otra opción.
- La cuenta de servicio predeterminada de Compute Engine necesita `roles/run.builder` para compilar, y la guía incluye ese paso. Hay que habilitar las API de Cloud Run y de Cloud Build. El repositorio `cloud-run-source-deploy` de Artifact Registry se crea solo.

**`npm audit`** (9 de noviembre de 2026): 0 vulnerabilidades en las dependencias de producción. Hay 9 moderadas con una sola causa, `minimatch` (GHSA-g3hv-75wg-m249), que usan ESLint y `typescript-eslint` solo al desarrollar. No llegan a la imagen final, que tiene solo nginx y `dist/`. Se acepta el riesgo, como en la Etapa 0.

**Revisión independiente**

- No encontró problemas críticos. Comprobó que el build funciona con el contexto que deja `.dockerignore`, y leyó la configuración de nginx contra el arranque de la imagen oficial: nada hace fallar al contenedor. La sintaxis de nginx sigue sin probarse en un nginx real.
- **Importante, corregido:** el Dockerfile usaba `nginxinc/nginx-unprivileged`, que dejó de actualizarse el 19 de octubre. Desde nginx 1.30.6 la imagen se publica como `nginx/nginx-unprivileged`, que se reconstruye cada semana. Con la vieja, la imagen de producción no recibía parches, justo lo contrario de la decisión 3. Al comprobar las etiquetas en la Task 4 se miró que existieran, pero no que se siguieran actualizando. El diseño (sección 12) también se corrigió.
- **Corregidos también:** nginx comprime los pedidos que llegan con una cabecera `Via` (`gzip_proxied any`), como pueden ser los que pasan por los servidores de Google; sin eso, el JS saldría con 327 kB. Y usa el nivel 6, con el que el JS queda en 107,8 kB; con el nivel por defecto quedaba en 121,4, y el comentario prometía 108.
- **Decisión revisada:** el script informaba como OK la línea de redirecciones aunque no hubiera ninguna que comprobar. Ahora la muestra como INFO y no la cuenta.

**Detalles menores que quedan para más adelante**

- `/favicon.svg` y lo que no está en `/assets/` sale sin `Cache-Control`: un ícono nuevo podría tardar días en verse.
- Los errores que nginx da antes de elegir un `location` (un pedido mal formado: 400, 414, 431) salen sin las cabeceras de seguridad.
- El editor marca errores en `scripts/` y `deploy/`, porque `tsconfig.json` no referencia a `tsconfig.node.json`; `npm run typecheck` pasa igual.
- Ante un fallo de red, el script dice solo "fetch failed", sin la causa; si `/` no responde 200, no muestra el estado.
- `vite.config.ts` importa las cabeceras sin la extensión `.ts`, y Vite avisa en cada build que en una versión futura no lo va a aceptar.
- La guía no dice que `gcloud run deploy --source` pregunta si crea el repositorio, ni que al borrar todo queda el bucket con el código fuente.
- Quedan `/50x.html` de la imagen base y la directiva `index`, que no se usa.
