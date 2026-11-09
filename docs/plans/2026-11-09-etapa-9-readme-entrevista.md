# Etapa 9 (README y entrevista): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que el repositorio se pueda mostrar y defender: un README completo con capturas de la app real y una guía de entrevista que explique cada decisión con sus alternativas, sin afirmar nada que el código o una ejecución real no respalden.

**Arquitectura:** dos documentos, `README.md` (para quien llega al repositorio) y `docs/guia-entrevista.md` (para preparar la entrevista), más las capturas en `docs/screenshots/`. Un test comprueba que cada enlace relativo de los dos documentos apunta a un archivo que existe, respetando mayúsculas. Antes, dos arreglos chicos de las herramientas que se notan al abrir el repositorio en un editor.

**Stack:** Markdown (con un diagrama Mermaid, que GitHub dibuja), Playwright para las capturas y Vitest para el test de enlaces. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 1 (alcance), 3 (estructura de carpetas), 10 (seguridad: el README advierte que LocalStorage no está cifrado), 13 (la Etapa 9 termina con README completo, capturas de la app real y guía de entrevista) y 14 (contenido de la guía).

## Decisiones para tu aprobación

1. **README y guía en castellano**, como la app. Si después querés una versión en inglés para postularte afuera, se traduce el README en una etapa aparte.
2. **Se arreglan en esta etapa solo los dos pendientes que se ven al mostrar el repositorio:** VS Code marca errores en `scripts/` y `deploy/`, y Vite avisa en cada build por una importación sin extensión. Los demás pendientes de las Etapas 7 y 8 no se arreglan: van a la guía como limitaciones conocidas, cada uno con cómo se resolvería.
3. **La imagen Docker se declara sin probar** mientras Docker no esté instalado. El README lo dice en la sección de despliegue, y la guía lo cuenta como limitación. Si instalás Docker antes de cerrar la etapa, se hace la prueba pendiente de la Etapa 8 (Task 4) y se quita la aclaración.
4. **Siete capturas** en `docs/screenshots/`, con datos demo nuevos, acento violeta y la CSP activa (`npm run preview`): acceso, Dashboard, Clientes, Nueva venta, Reportes y Configuración en 1280 px, y el Dashboard en 375 px. Se suben al repositorio (unos 2 MB en total) para que el README las muestre en GitHub sin servicios externos.
5. **Sin licencia** salvo que me digas otra cosa. Sin archivo de licencia, el código se puede ver pero nadie tiene permiso para reutilizarlo; si preferís MIT, que lo permite con atribución, se agrega en esta etapa.

## Restricciones globales

- **Nada inventado.** Cada número (tests, cobertura, tamaños) sale de una ejecución hecha en la etapa y se anota con la fecha. Cada afirmación técnica de la guía nombra el archivo o el plan que la respalda. Si algo no se puede comprobar, se dice.
- El README tiene, como pide el diseño: descripción, tecnologías, características, instalación, ejecución local, pruebas, despliegue, capturas y arquitectura general, y advierte que LocalStorage no está cifrado.
- La guía tiene, como pide el diseño: cómo presentar el proyecto en dos minutos, las decisiones técnicas con sus alternativas, preguntas probables con respuestas y limitaciones conocidas con cómo se resolverían en un producto real.
- Las respuestas de la guía usan palabras que el autor pueda explicar: cada término técnico se explica la primera vez.
- Los enlaces son relativos y respetan mayúsculas: GitHub distingue `Captura.png` de `captura.png`, Windows no.
- Sin `any` y sin dependencias nuevas. Rama `etapa-9-readme-entrevista`. Commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` y títulos de tareas con `### Task N:`.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` y `npm run build` terminan con código 0. En los comandos de varios pasos, cada comprobación lleva `|| exit 1`.

**Fuera de alcance:**

- Los pendientes menores de las Etapas 7 y 8 que no nombra la decisión 2.
- El despliegue real en Cloud Run, que hace el autor.
- Traducir el README, publicar el repositorio en GitHub y escribir el CV.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Una afirmación falsa en una entrevista:** un número, un nombre de función o una explicación de la guía que no coincide con el código. La revisión compara cada afirmación con el archivo que cita (Task 5).
2. **Un comando del README que no funciona copiado tal cual**, en PowerShell o en bash (Task 4).
3. **Una captura que no se ve en GitHub** por un enlace roto o una mayúscula distinta (Task 2 y Task 3).
4. **Datos personales en una captura o en un ejemplo:** solo datos demo con dominios `example.com` (Task 2).
5. **Una limitación escondida:** la imagen sin probar, las dos pestañas, LocalStorage sin cifrar y los pendientes menores tienen que estar dichos, no omitidos (Task 4 y Task 5).

---

### Task 1: Herramientas sin avisos al abrir el repositorio

**Archivos:**

- Crear: `tsconfig.app.json`
- Modificar: `tsconfig.json`, `tsconfig.node.json`, `package.json`, `vite.config.ts`, `.gitignore`

**Interfaces:**

- `tsconfig.json` pasa a ser solo una referencia a los otros dos, como en las plantillas de Vite: `"files": []` y `"references"` a `tsconfig.app.json` (código de `src`, con las opciones de hoy) y a `tsconfig.node.json`. Así el editor encuentra la configuración correcta para cada archivo.
- Los dos llevan `"composite": true` y `"tsBuildInfoFile"` dentro de `node_modules/.tmp/`, y siguen con `"noEmit": true`.
- `package.json`: `"typecheck": "tsc -b"` y `"build": "tsc -b tsconfig.app.json && vite build"`.
- `vite.config.ts` importa `./deploy/security-headers.ts`, con la extensión.

- [ ] **Paso 1: Ver el problema antes de arreglarlo**

| Prueba | Esperado antes del cambio |
|---|---|
| `npx tsc --noEmit --ignoreConfig scripts/check-deploy.ts` (lo que ve un editor sin la referencia) | Errores TS5097 y TS2591 |
| `npm run build` | El aviso de Vite por la importación sin extensión |

- [ ] **Paso 2: Cambiar la configuración**

- [ ] **Paso 3: Comprobar**

| Prueba | Esperado |
|---|---|
| `npm run typecheck` | Código 0, y falla si se agrega `process` en `src` o un error de tipos en `scripts/` (se prueba y se deshace) |
| `npm run build` | Sin el aviso de la importación |
| `npm test` y el resto | Igual que antes |
| VS Code en `scripts/check-deploy.ts` y `deploy/nginx-config.test.ts` | Sin errores. Lo comprueba el autor, porque el editor no se puede abrir desde acá |

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `chore: referenciar las configuraciones de TypeScript para el editor`.

### Task 2: Capturas de la app real

**Archivos:**

- Crear: `docs/screenshots/acceso.png`, `dashboard.png`, `clientes.png`, `nueva-venta.png`, `reportes.png`, `configuracion.png` y `dashboard-celular.png`

- [ ] **Paso 1: Preparar los datos**

`npm run build` y `npm run preview`. Antes de levantarlo, comprobar con `netstat -ano` que el puerto 4173 está libre y, después, que el proceso que escucha es el recién lanzado. Navegador con el almacenamiento vacío: datos demo nuevos, acento violeta, densidad cómoda y perfil "Usuario Demo".

- [ ] **Paso 2: Tomar las capturas**

| Archivo | Pantalla | Ancho | Detalle |
|---|---|---|---|
| `acceso.png` | Acceso demo | 1280 | Pantalla completa |
| `dashboard.png` | Dashboard | 1280 | Hasta la actividad reciente |
| `clientes.png` | Clientes | 1280 | Primera página |
| `nueva-venta.png` | Nueva venta | 1280 | Un cliente, dos productos y el resumen con IVA |
| `reportes.png` | Reportes | 1280 | Período "90 días" |
| `configuracion.png` | Configuración | 1280 | Página completa |
| `dashboard-celular.png` | Dashboard | 375 | Pantalla completa del celular |

- [ ] **Paso 3: Revisar cada captura**

Mirar cada imagen: sin texto cortado, sin avisos abiertos (salvo que muestren algo a propósito), sin datos que no sean demo y sin desborde. Anotar el tamaño de cada archivo; si alguno pasa los 400 kB, tomarla de nuevo con menos alto.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `docs: agregar capturas de la app real`.

### Task 3: Test de enlaces de la documentación

**Archivos:**

- Crear: `scripts/docs-links.test.ts`

**Interfaces:**

- Lee `README.md` y `docs/guia-entrevista.md` (si todavía no existe, solo el README) y busca los enlaces e imágenes de Markdown con destino relativo, sin `http`, `mailto` ni `#`. Para cada uno, quita el ancla y comprueba que el archivo exista con esas mismas mayúsculas, comparando contra la lista real de la carpeta (`readdirSync`), porque en Windows `existsSync` no distingue mayúsculas.

- [ ] **Paso 1: Escribir el test y ver el rojo**

Con el README actual pasa: no tiene enlaces rotos. Para ver el rojo, agregar al README un enlace a `docs/screenshots/Dashboard.png` (con mayúscula), comprobar que el test falla y deshacerlo.

- [ ] **Paso 2: Comprobar y hacer commit**

Mensaje: `test: comprobar los enlaces de la documentación`.

### Task 4: README completo

**Archivos:**

- Modificar: `README.md`, que conserva la sección "Despliegue" de la Etapa 8.

**Contenido, en este orden:**

1. **Título y descripción:** qué es NEXO, para qué sirve la demo y que los datos son ficticios. Una captura del Dashboard.
2. **Características:** una línea por módulo (acceso demo, Dashboard, Clientes, Productos, Ventas con anulación, Reportes, Configuración) y lo transversal: responsive, teclado y lectores de pantalla, CSP estricta.
3. **Tecnologías:** cada una con su versión, sacada de `package.json`, y para qué se usa. Por qué no hay framework, en una línea con enlace a la guía.
4. **Instalación y ejecución local:** Node 26 o posterior, `npm ci`, `npm run dev` y `npm run preview` (con la CSP de producción).
5. **Pruebas:** `npm test`, `npm run test:coverage` (mínimo de 80 % por carpeta), `npm run typecheck`, `npm run lint` y `npm run format:check`, con los resultados de una ejecución de esta etapa y su fecha.
6. **Capturas:** las siete, con un texto alternativo que diga qué muestran.
7. **Arquitectura:** diagrama Mermaid de las capas (vistas → servicios → dominio y datos), la estructura de carpetas real (no la del diseño, que cambió) y el recorrido de una venta, de la pantalla al almacenamiento.
8. **Seguridad y privacidad:** LocalStorage no está cifrado y cualquiera con acceso al navegador puede leerlo; no se piden datos sensibles; CSP, cabeceras y plantillas con escape.
9. **Despliegue:** la sección de la Etapa 8, con la aclaración de la decisión 3.
10. **Documentación:** enlaces al diseño, a los planes y a la guía de entrevista.

- [ ] **Paso 1: Escribir**

- [ ] **Paso 2: Probar cada comando del README**

Ejecutar cada comando tal como está escrito, en bash y en PowerShell, y comparar la salida con lo que dice el texto. Los comandos de `gcloud` y `docker` no se pueden ejecutar acá: se dejan como en la Etapa 8.

- [ ] **Paso 3: Comprobar y hacer commit**

Mensaje: `docs: completar el README`.

### Task 5: Guía de entrevista

**Archivos:**

- Crear: `docs/guia-entrevista.md`

**Contenido, en este orden:**

1. **El proyecto en dos minutos:** un texto para decir en voz alta (unas 250 palabras): qué es, qué problema muestra, las tres decisiones más interesantes y qué aprendió el autor.
2. **Decisiones técnicas con sus alternativas:** una tabla por tema, con la decisión, la alternativa descartada, por qué, y el archivo o el plan que la respalda. Temas:
   - Sin framework (frente a React) y la plantilla `html` con escape.
   - Una sola clave de LocalStorage, `update` y `replace`, y qué pasa si el almacenamiento falla.
   - Dinero en centavos y `percentOfCents` con `BigInt`.
   - `Result` en lugar de excepciones.
   - Fechas locales (`new Date('2026-11-05')` es UTC).
   - El cálculo vive en el dominio y el gráfico solo dibuja; Chart.js importado por partes; cómo se hace accesible un canvas.
   - CSP estricta: por qué no hay atributos `style`, y por qué `element.style` sí está permitido.
   - El acento con `data-accent` y guardar sin cambios.
   - Bootstrap parcial y los componentes `nx-`.
   - Tests en Node sin navegador, TDD, mutaciones y cobertura por carpeta.
   - Docker en dos etapas, nginx sin root, `add_header` en cada `location` y `Cache-Control` sin `always`.
3. **Errores que aparecieron y cómo se resolvieron:** los que mejor cuentan cómo se trabaja, sacados de las secciones de decisiones de los planes:
   - la fecha UTC;
   - "Cancelar" que borraba durante la animación de un modal;
   - Chart.js midiendo con la fuente de respaldo;
   - Chromium borrando lo que se tecleaba en un campo de fecha;
   - el desborde que `innerWidth` ocultaba;
   - la imagen de nginx que dejó de actualizarse;
   - el servidor viejo que contestaba las mediciones.
4. **Preguntas probables con respuestas:** al menos 20, agrupadas por tema (arquitectura, datos, seguridad, accesibilidad, pruebas, despliegue, trabajo en equipo). Cada respuesta en dos a cuatro oraciones, con el archivo que la respalda.
5. **Limitaciones conocidas y cómo se resolverían en un producto real:**
   - sin backend ni autenticación real;
   - LocalStorage sin cifrar y con un límite de tamaño;
   - con dos pestañas, gana la última escritura;
   - la imagen Docker sin probar (si sigue así);
   - sin tests de punta a punta automatizados: las pruebas de navegador se hicieron con scripts a mano;
   - los pendientes menores de las Etapas 7 y 8.
6. **Glosario corto:** CSP, XSS, SPA, TDD, mutación, contraste WCAG, `aria-live` y otros términos que aparecen en las respuestas.

- [ ] **Paso 1: Escribir**

- [ ] **Paso 2: Comprobar cada afirmación**

Para cada número, nombre de función o comportamiento, abrir el archivo citado y confirmarlo. Los números de tests, cobertura y tamaños salen de una ejecución de esta etapa. Lo que no se pueda comprobar se reescribe o se quita.

- [ ] **Paso 3: Comprobar y hacer commit**

Mensajes: `docs: agregar la guía de entrevista` y, al cerrar, `docs: registrar las decisiones de README y entrevista`, que suma al final de este plan "Decisiones tomadas al ejecutar el plan".

## Decisiones tomadas al ejecutar el plan

Registradas para que el plan describa lo que se construyó.

**Herramientas (Task 1)**

- Los dos tsconfig no llevan `composite`, como en las plantillas de Vite: `tsc -b` funciona con `noEmit` y revisa los dos proyectos cada vez. Tampoco hizo falta tocar `.gitignore`: los `tsbuildinfo` quedan en `node_modules/.tmp/`, que ya se ignora.
- Antes del cambio, TypeScript sin configuración daba 4 errores TS2591 y 2 TS5097 en `scripts/check-deploy.ts`. Después, `npm run typecheck` falla con `process` en `src` y con un error de tipos en `scripts/`, y el build ya no avisa. Que VS Code no marque errores lo comprueba el autor.

**Capturas (Task 2)**

- `configuracion.png` se tomó con una ventana de 1280 × 1274 px: la captura de página completa no dibujaba el menú lateral (fijo con `position: sticky`) y salía de 1265 px.
- Las siete pesan 608 kB en total, no los 2 MB estimados.

**README (Task 4)**

- Al comprobar las afirmaciones se corrigieron tres antes del commit: el router mide unas 240 líneas (no 200), la app tiene ocho pantallas (no seis) y los datos dañados no "se recuperan": se guarda una copia y se cargan los datos demo.
- El README da números aproximados ("unos 1000 tests"), porque cada enlace de la documentación suma un caso al test de enlaces y el total cambia con cada edición.
- Explica el aviso de `@parcel/watcher` en `npm ci`: se comprobó que carga con el binario ya compilado para Windows.
- Cada comando se probó tal como está escrito, en bash y en PowerShell, incluido `npm run check:deploy -- <url>`: PowerShell pasa la URL después de `--`.

**Guía (Task 5)**

- Las decisiones técnicas van como listas (decisión, alternativa, por qué, dónde) y no como tablas: con textos largos, una tabla de Markdown se lee peor.
- La guía incluye la pregunta "¿Usaste IA?", con una respuesta que dice cómo se trabajó.

**Revisión independiente**

No encontró problemas críticos. Comprobó contra el código casi todas las afirmaciones, los números, las capturas y los comandos, pero encontró varias frases que el autor repetiría en una entrevista y no se sostenían. Se corrigieron todas:

- La presentación atribuía "más de 900 tests" a las reglas del negocio; el dominio tiene unos 300 de un total de unos 1000.
- La historia de la fecha UTC no fue un error que apareció: fue un riesgo que el plan de la Etapa 5 anticipó. Quedó como "un riesgo que se evitó", y su lugar entre los errores reales lo tomó el de Escape, que no cerraba el detalle de una venta (Etapa 5).
- Con el almacenamiento bloqueado desde el principio, la app no "deja de cambiar": funciona en memoria y lo avisa.
- El ejemplo de XSS era `<script>`, que insertado con `innerHTML` nunca se ejecuta. Ahora es `<img src=x onerror=alert(1)>`, el que prueban los tests.
- La respuesta sobre IA y la presentación no decían que la revisión final la hacía otra sesión de IA. Ahora lo dicen, y las frases sobre pruebas en el navegador ya no están en primera persona.
- Faltaban limitaciones de las Etapas 7 y 8 en la guía, y el README decía que nginx envía las cabeceras "en todas las respuestas". La tabla de limitaciones quedó completa y el README aclara los errores previos a elegir un `location`.
- Además: el diagrama muestra que las pantallas usan el dominio y leen los datos; el README distingue el error de validación del de almacenamiento; la guía explica que la CSP también admite imágenes `data:`, aclara cuánto sumó Chart.js en vez de atribuirle un ahorro y suma preguntas de trabajo en equipo; el glosario suma cinco términos; el README suma una sección de limitaciones y la fecha de `npm audit`; y las generalizaciones con "cada" se ajustaron a lo que registran los planes.

La revisión sugirió decir que `gcloud` pregunta antes de crear el repositorio y que al borrar todo queda un bucket con el código fuente. La documentación oficial no dice ninguna de las dos cosas: dice que el repositorio se crea automáticamente y que hay que responder `y` si `gcloud` pide habilitar APIs. Se agregó solo esto último, y una recomendación general de revisar en la consola que no queden recursos con costo.

**Detalle menor que queda para más adelante**

- El test de enlaces no detecta un archivo que existe en el disco pero no está en git, ni anclas rotas, enlaces de referencia o rutas con `\`, y marca de más los enlaces dentro de bloques de código.
