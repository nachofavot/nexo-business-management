# Etapa 2 (Diseño y estructura): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** definir la identidad visual de NEXO y dejar funcionando la estructura de la app: acceso demo, menú, rutas y Dashboard con datos reales. Termina con la aprobación visual del autor.

**Arquitectura:** SPA en TypeScript. `app` resuelve rutas y sesión, `ui` aporta plantillas seguras y componentes, y `views` arma cada pantalla. Las funciones sin DOM se prueban con TDD; lo visual se comprueba en el navegador real.

**Stack:** TypeScript, Bootstrap 5.3.8 parcial, SCSS, Geist y Bootstrap Icons. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 4, 8, 9 y 10.

## Dirección visual

**Asunto:** NEXO administra clientes, productos y ventas de un comercio. Quien lo mira primero es una persona que evalúa el portfolio; quien lo usaría, alguien que quiere ver cómo va el negocio y registrar una venta rápido.

**Idea central:** *nexo* significa vínculo, y lo que hace la app es vincular un cliente con productos en una venta. Esa idea es lo único llamativo de la interfaz; todo lo demás queda sobrio.

1. **La pestaña que se une al panel.** El contenido es un panel con esquinas redondeadas sobre el fondo. El ítem activo del menú tiene el mismo color que el panel y se funde con él mediante esquinas invertidas: la navegación queda literalmente conectada con lo que muestra. Al navegar, ese indicador se desliza al nuevo ítem. Es el único movimiento de la interfaz que no pide el usuario de forma directa, y responde a su acción.
2. **La venta como imagen de marca.** La pantalla de acceso muestra la última venta real de la demo como tres nodos unidos por una línea: cliente, productos y total.

```text
Escritorio (desde 992 px)
┌──────────┬───────────────────────────────────┐
│ N  NEXO  │╭─────────────────────────────────╮│
│          ││ Dashboard              Usuario ▾││
│  Dashboard══                                ││
│  Clientes││ Ingresos de noviembre           ││
│  Productos│ $ 39.107.835,25                 ││
│  Ventas  ││ +42 % contra octubre            ││
│  Reportes││─────────────────────────────────││
│  Config. ││ Ventas     │ Ticket    │ Stock  ││
│          ││─────────────────────────────────││
│          ││ Actividad        │ Stock bajo   ││
│          │╰─────────────────────────────────╯│
└──────────┴───────────────────────────────────┘

Acceso (se apila en móvil, con el botón primero)
┌──────────────────────┬───────────────────────┐
│ N  NEXO              │  ● Olivia Herrera     │
│                      │  │                    │
│ Clientes, productos  │  ● Teclado × 2        │
│ y ventas en un lugar │  │ Servidor × 1       │
│                      │  │                    │
│ [Entrar a la demo]   │  ● $ 3.910.783,25     │
│ Los datos son...     │    V-000350           │
└──────────────────────┴───────────────────────┘
```

**Color.** Dos acentos con dos significados, nunca mezclados:

- **Violeta:** lo que podés hacer. Acción principal, selección y foco.
- **Azul eléctrico:** lo que pasó en el negocio. Datos y gráficos.

| Token | Valor | Uso |
|---|---|---|
| `--nx-bg` | `#0A0D14` | Fondo y menú lateral |
| `--nx-surface-1` | `#141823` | Panel principal e ítem activo |
| `--nx-surface-2` | `#1B2130` | Elementos elevados, filas con hover |
| `--nx-border` | `rgba(255, 255, 255, 0.08)` | Separadores |
| `--nx-border-control` | `#6B7386` | Borde de campos |
| `--nx-text` | `#E8EAF0` | Texto principal |
| `--nx-text-muted` | `#9AA3B5` | Texto secundario |
| `--nx-violet-500` | `#7450FF` | Botón principal |
| `--nx-violet-600` | `#6840F5` | Botón principal, hover |
| `--nx-violet-700` | `#5C36DE` | Botón principal, active |
| `--nx-violet-300` | `#A78FFF` | Enlaces, foco, ícono activo |
| `--nx-blue` | `#2E9BFF` | Datos y gráficos |
| `--nx-success` | `#2FBF8F` | Estado positivo |
| `--nx-warning` | `#E8A33D` | Stock bajo |
| `--nx-danger` | `#F0616D` | Texto de error |
| `--nx-danger-fill` | `#C93A47` | Botón destructivo |
| `--nx-danger-fill-hover` | `#B5303C` | Botón destructivo, hover |

Contraste medido el 2026-11-05 con la fórmula WCAG: todos los textos superan 4,5:1 (el mínimo es 4,85:1, blanco sobre violeta) y los bordes de campos y el foco superan 3:1 (mínimo 3,38:1).

**Tipografía.** Geist en toda la interfaz, con números tabulares en tablas y cifras.

| Uso | Tamaño | Peso |
|---|---|---|
| Cifra principal | 40 px (32 px en móvil), interletraje -0,02 em | 600 |
| Título de página | 20 px | 600 |
| Títulos de sección | 16 px | 600 |
| Cuerpo | 14 px, interlineado 1,5 | 400 |
| Texto secundario | 13 px | 400 |
| Etiquetas | 12 px | 500 |

**Forma.** Tres radios con jerarquía: 14 px en panel y modal, 8 px en controles y 6 px en etiquetas. Espaciado en múltiplos de 4 px. Bordes de 1 px. Sombra solo en elementos flotantes: `0 12px 32px rgba(3, 5, 10, 0.55)`.

**Disposición.** Alineada a la izquierda. La jerarquía sale del tamaño, no de cajas: el panel contiene las secciones y estas se separan con líneas.

**Descartado por genérico:**

- Cuatro tarjetas iguales de estadísticas: ahora hay una cifra principal y una franja dividida.
- Íconos dentro de cuadrados de color, degradados y efecto vidrio.
- Etiquetas en mayúsculas, textos separados con puntos medios y flechas en los enlaces.
- Entradas animadas en cada sección y hover en cada bloque.
- Un solo radio para todo.

**Textos.** En español, sentence case y voz activa. Un botón dice lo que hace. Los errores explican qué pasó y qué hacer, sin disculparse.

## Restricciones globales

- Los tests corren en Node, sin DOM: solo `html`, `routes`, `session` y `format` llevan TDD. Lo demás se comprueba en el navegador.
- Todo contenido dinámico pasa por `html`. `innerHTML` aparece únicamente en `src/ui/html.ts`.
- Sin atributos `style` en plantillas ni en `index.html`. Los valores dinámicos se asignan con `element.style`.
- Sin `any` y sin dependencias nuevas.
- Sin botones decorativos: todo lo clicable hace algo. Los módulos de etapas siguientes lo dicen con un estado vacío.
- Las comprobaciones visuales finales se hacen con `npm run build` y `npm run preview`, porque la CSP solo está activa allí.
- Se trabaja en la rama `etapa-2-diseno-estructura`.
- Cada commit termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` terminan con código 0. Si `format:check` falla, se ejecuta `npm run format`.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Texto malicioso en datos guardados:** un mensaje con `<img src=x onerror=alert(1)>` en LocalStorage se ve como texto y no se ejecuta (Task 1 y Task 7).
2. **Atrás después de salir:** al cerrar la sesión y volver atrás, no se muestra la app (Task 5).
3. **Navegar y volver a entrar muchas veces:** tras 20 navegaciones y 5 ciclos de entrar y salir, cada clic hace una sola cosa (Task 5).
4. **Cifras y nombres largos en el celular:** `$ 99.999.999,99` y un nombre de 80 caracteres no generan scroll horizontal a 375 px (Task 7).
5. **Sin datos:** sin ventas, sin actividad y sin stock bajo, el Dashboard muestra estados vacíos útiles y "Sin datos previos" (Task 6).

---

### Task 1: Plantillas seguras

**Archivos:**
- Crear: `src/ui/html.ts`
- Test: `src/ui/html.test.ts`
- Modificar: `.gitignore` (agregar `.playwright-mcp`)

**Interfaces:**
- Produce:
  - `class SafeHtml { readonly value: string }`
  - `type HtmlValue = string | number | boolean | null | undefined | SafeHtml | readonly HtmlValue[]`
  - `html(strings: TemplateStringsArray, ...values: readonly HtmlValue[]): SafeHtml`
  - `raw(trustedMarkup: string): SafeHtml`, solo para contenido propio, como los íconos
  - `setHtml(element: Element, content: SafeHtml): void`

- [ ] **Paso 1: Escribir los tests que fallan**

| Entrada | `.value` esperado |
|---|---|
| ``html`<p>${'<img src=x onerror=alert(1)>'}</p>` `` | `<p>&lt;img src=x onerror=alert(1)&gt;</p>` |
| ``html`<a title="${'" onclick="x'}">` `` | `<a title="&quot; onclick=&quot;x">` |
| ``html`${"O'Brien & Hijos"}` `` | `O&#39;Brien &amp; Hijos` |
| ``html`<ul>${html`<li>a</li>`}</ul>` `` | `<ul><li>a</li></ul>` |
| ``html`${html`${'<'}`}` `` | `&lt;`, sin escapar dos veces |
| ``html`${['<b>', html`<i></i>`]}` `` | `&lt;b&gt;<i></i>`, sin comas |
| ``html`${null}${undefined}${false}` `` | Texto vacío |
| ``html`${0}` `` | `0` |
| ``html`${raw('<svg></svg>')}` `` | `<svg></svg>` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./html`.

- [ ] **Paso 3: Implementar `src/ui/html.ts`**

Escapa `&`, `<`, `>`, `"` y `'`. `setHtml` es el único lugar del proyecto que asigna `innerHTML`.

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Mensaje: `feat: agregar plantillas HTML con escape automático`.

### Task 2: Rutas y sesión

**Archivos:**
- Crear: `src/app/routes.ts`, `src/app/session.ts`
- Test: `src/app/routes.test.ts`, `src/app/session.test.ts`

**Interfaces:**
- Consume: `KeyValueStorage` de `src/data/database.ts`.
- Produce en `routes.ts`:
  - `type RouteName = 'login' | 'dashboard' | 'customers' | 'products' | 'sales' | 'new-sale' | 'reports' | 'settings' | 'not-found' | 'style-guide'`
  - `interface Route { name: RouteName; path: string; title: string }`
  - `NAV_ROUTES: readonly Route[]`, con Dashboard, Clientes, Productos, Ventas, Reportes y Configuración
  - `type RouteResolution = { kind: 'render'; route: Route } | { kind: 'redirect'; to: string }`
  - `resolveRoute(pathname: string, options: { isAuthenticated: boolean; includeDevRoutes: boolean }): RouteResolution`
  - `activeNavPath(route: Route): string | null`
- Produce en `session.ts`:
  - `interface Session { isActive(): boolean; start(): void; end(): void }`
  - `createSession(getStorage: () => KeyValueStorage): Session`, con la clave `nexo:session`

- [ ] **Paso 1: Escribir los tests que fallan**

`resolveRoute`, con las rutas de la sección 8 del diseño:

| Sesión | Ruta | Esperado |
|---|---|---|
| No | `/`, `/clientes`, `/no-existe` | Redirige a `/login` |
| No | `/login` | Muestra `login` |
| Sí | `/`, `/login` | Redirige a `/dashboard` |
| Sí | `/dashboard`, `/clientes`, `/productos`, `/ventas`, `/ventas/nueva`, `/reportes`, `/configuracion` | Muestra la ruta correspondiente |
| Sí | `/clientes/` | Muestra `customers` |
| Sí | `/no-existe` | Muestra `not-found` |
| Sí | `/dev/componentes` sin rutas de desarrollo | Muestra `not-found` |
| Sí | `/dev/componentes` con rutas de desarrollo | Muestra `style-guide` |

`activeNavPath`: `new-sale` da `/ventas`; `customers` da `/clientes`; `not-found` da `null`.

`createSession`:

| Caso | Esperado |
|---|---|
| Al crearla | Inactiva |
| Después de `start()` | Activa, también en otra sesión creada sobre el mismo almacenamiento |
| Después de `end()` | Inactiva |
| `getStorage`, `getItem` o `setItem` lanzan un error | Sin errores: `start()` y `end()` funcionan en memoria |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existen los módulos.

- [ ] **Paso 3: Implementar `routes.ts` y `session.ts`**

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Mensaje: `feat: resolver rutas y manejar la sesión demo`.

### Task 3: Formato de datos

**Archivos:**
- Crear: `src/ui/format.ts`
- Test: `src/ui/format.test.ts`

**Interfaces:**
- Produce:
  - `formatMoney(cents: number, currency: Currency): string`
  - `formatPercentChange(change: number | null): string`
  - `formatDateTime(isoDate: string): string`
  - `formatMonth(date: Date): string`

Todas usan `Intl` con locale `es-AR`.

- [ ] **Paso 1: Escribir los tests que fallan**

Los tests reemplazan los espacios duros por espacios normales antes de comparar.

| Llamada | Esperado |
|---|---|
| `formatMoney(123456, 'ARS')` | `$ 1.234,56` |
| `formatMoney(0, 'ARS')` | `$ 0,00` |
| `formatMoney(9999999999, 'ARS')` | `$ 99.999.999,99` |
| `formatMoney(123456, 'USD')` | `US$ 1.234,56` |
| `formatMoney(123456, 'EUR')` | `€ 1.234,56` |
| `formatPercentChange(50)` | `+50 %` |
| `formatPercentChange(-12.34)` | `-12,3 %` |
| `formatPercentChange(0)` | `0 %` |
| `formatPercentChange(null)` | `Sin datos previos` |
| `formatDateTime('2026-11-06T02:30:00.000Z')` | `05/11/2026, 23:30` |
| `formatMonth(new Date(2026, 10, 5))` | `noviembre` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./format`.

- [ ] **Paso 3: Implementar `src/ui/format.ts`**

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Mensaje: `feat: dar formato a dinero, fechas y porcentajes`.

### Task 4: Sistema de diseño y guía de componentes

**Archivos:**
- Crear: `src/styles/_tokens.scss`, `src/styles/components/*.scss`
- Modificar: `src/styles/_bootstrap.scss`, `src/styles/main.scss`
- Crear: `src/ui/icons.ts`, `src/ui/dom.ts`
- Crear: `src/ui/components/modal.ts`, `toast.ts`, `empty-state.ts`, `metric.ts`
- Crear: `src/views/style-guide.ts`

**Interfaces:**
- Produce:
  - `icon(name: IconName): SafeHtml`, con los SVG importados de `bootstrap-icons/icons/*.svg?raw`
  - `requireElement<T extends HTMLElement>(id: string, type: new () => T): T`, que comprueba con `instanceof` y reemplaza al cast de la Etapa 0
  - `openModal(element: HTMLElement): void`, que devuelve el foco a quien lo abrió al cerrarse
  - `showToast(message: string, kind: 'success' | 'warning' | 'error'): void`, en una región con `aria-live`
  - `emptyState(title: string, description: string): SafeHtml`
  - `metric(options: { label: string; value: string; change?: number | null; helper?: string; lead?: boolean }): SafeHtml`, con el cambio en verde o peligro según el signo

- [ ] **Paso 1: Crear `_tokens.scss`**

Con los valores de **Dirección visual**, como variables Sass y propiedades `--nx-*`. Es la única fuente de los colores.

- [ ] **Paso 2: Ampliar `_bootstrap.scss`**

Usa `@use 'tokens'` y mapea a Bootstrap: `$primary`, `$danger`, `$success`, `$warning`, `$body-bg-dark`, `$body-color-dark`, `$body-secondary-color-dark`, `$border-color-translucent-dark`, `$font-size-base: 0.875rem`, `$border-radius: 0.5rem`, modal y dropdown con `--nx-surface-2`, y `$focus-ring-color`.

- [ ] **Paso 3: Escribir los estilos de componentes**

Botones, campos con estado de error, tabla compacta, etiquetas de estado, menú desplegable, modal, aviso, estado vacío y métrica, con clases `nx-*`. Todos tienen estados hover, focus-visible, active y disabled, y `prefers-reduced-motion` reduce las transiciones. Los campos usan 16 px por debajo de 768 px.

- [ ] **Paso 4: Crear `icons.ts`, `dom.ts` y los componentes**

- [ ] **Paso 5: Crear `src/views/style-guide.ts`**

Página solo de desarrollo, con título "Guía de componentes": colores, escala tipográfica, botones en todos sus estados, un formulario con un error, una tabla con etiquetas, un modal real, un aviso de cada tipo, un menú desplegable, un estado vacío y las métricas.

Esta tarea queda sin ruta hasta la Task 5, donde se comprueba en el navegador.

- [ ] **Paso 6: Comprobar y hacer commit**

Ejecutar las comprobaciones de la tarea y `npm run build`. Esperado: todo con código 0 y sin avisos de Sass. Mensaje: `feat: agregar sistema de diseño y componentes base`.

### Task 5: Router y estructura de la app

**Archivos:**
- Crear: `src/app/view.ts`, `src/app/router.ts`, `src/app/shell.ts`, `src/styles/layout/*.scss`
- Crear: `src/views/not-found.ts`, `src/views/upcoming.ts`
- Modificar: `index.html`, `src/main.ts`

**Interfaces:**
- Consume: `resolveRoute`, `activeNavPath`, `NAV_ROUTES`, `Session`, `DatabaseStore`, `html`, `setHtml`, `icon`, `showToast`.
- Produce en `view.ts`:

```ts
interface ViewContext {
  root: HTMLElement;
  signal: AbortSignal;
  database: DatabaseStore;
  session: Session;
  navigate(path: string): void;
  now(): Date;
}
type View = (context: ViewContext) => void | (() => void);
```

- Produce en `router.ts`: `createRouter(options: { root: HTMLElement; views: Record<RouteName, View>; database: DatabaseStore; session: Session; includeDevRoutes: boolean }): { navigate(path: string): void; start(): void }`

**Comportamiento:**
- **Enlaces:** el router intercepta los clics en enlaces internos con el botón izquierdo y sin teclas modificadoras. Responde a `popstate`.
- **Cada navegación:** vuelve a resolver la ruta con la sesión actual, aborta la señal anterior, ejecuta la limpieza, monta la vista, actualiza `document.title` a `<título> | NEXO`, sube al inicio y mueve el foco al `h1` (con `tabindex="-1"`).
- **Errores:** si una vista lanza un error, se registra en consola y se muestra una vista de error con un botón "Recargar". Los errores no controlados muestran un aviso genérico.
- **Acceso y menú:** `login` se monta sin menú. El menú se crea al entrar y se destruye al salir.
- **Indicador:** un único elemento `nx-nav__indicator` se mueve con `element.style.transform`. Las esquinas invertidas son pseudoelementos en el SCSS.
- **Móvil:** por debajo de 992 px, el menú va en un offcanvas y el panel ocupa todo el ancho.
- **Avisos al iniciar:** con `notice: 'recovered'`, un aviso de advertencia; con `mode: 'memory'`, una franja visible en el panel.
- **Vistas temporales:** `upcoming` muestra el nombre del módulo y un estado vacío con la etapa en que llega. Las rutas de módulos futuros usan esa vista.
- **Guía de componentes:** `main.ts` la registra solo con `import.meta.env.DEV`.

- [ ] **Paso 1: Reemplazar `index.html` y `src/main.ts`**

Quedan sin la página temporal de la Etapa 0. `main.ts` crea el almacenamiento, la base y la sesión, y arranca el router.

- [ ] **Paso 2: Crear `view.ts`, `router.ts`, `shell.ts` y las vistas `not-found` y `upcoming`**

Crear además la vista de acceso mínima con un botón que inicia la sesión; se completa en la Task 6.

- [ ] **Paso 3: Comprobar en `npm run dev`**

| Acción | Esperado |
|---|---|
| Abrir `/` sin sesión | Redirige a `/login` |
| Entrar | Muestra el Dashboard con el menú |
| Navegar por los 6 ítems | La URL, el título y el indicador cambian; el indicador se desliza; sin recarga |
| Atrás y adelante | Funcionan |
| Recargar en `/clientes` | Sigue en Clientes |
| Abrir `/no-existe` | Muestra la página no encontrada, con enlace al Dashboard |
| Cerrar sesión y volver atrás | Sigue en `/login` |
| 20 navegaciones y 5 ciclos de entrar y salir | Un clic abre el menú una sola vez, y al cerrar sesión se navega una sola vez |
| Abrir `/dev/componentes` | Muestra la guía; el modal devuelve el foco al cerrarse |
| Lanzar un error temporal en una vista, sin commit | Muestra la vista de error |

- [ ] **Paso 4: Comprobar y hacer commit**

Ejecutar las comprobaciones de la tarea. Mensaje: `feat: agregar router, menú y estructura de la app`.

### Task 6: Acceso demo y Dashboard

**Archivos:**
- Crear: `src/views/login.ts`, `src/views/dashboard.ts`, `src/styles/views/*.scss`
- Modificar: `src/main.ts`, `public/favicon.svg` si hace falta

**Interfaces:**
- Consume: `ViewContext`, `compareWithPreviousMonth`, `isLowStock`, `isOutOfStock`, `formatMoney`, `formatPercentChange`, `formatDateTime`, `formatMonth`, `formatSaleNumber`, `metric`, `emptyState`.

**Acceso:**
- A la izquierda: marca, "Clientes, productos y ventas en un lugar", el botón "Entrar a la demo" y el texto "Los datos son ficticios y solo se guardan en este navegador."
- A la derecha: la venta más reciente de la base, como tres nodos unidos por una línea: cliente, productos (hasta 3, y "y N más" si hay más) y total con su número.
- Si no hay ventas, se muestra solo la columna izquierda.

**Dashboard:**
- Cifra principal: "Ingresos de noviembre", con el cambio "contra octubre".
- Franja dividida: ventas del mes y ticket promedio, con su cambio, y productos con stock bajo.
- Dos columnas: "Actividad reciente" (8 entradas, con fecha) y "Stock bajo" (hasta 5, con etiqueta "Stock bajo" o "Sin stock", y un enlace "Ver productos").
- Sin gráficos: llegan en la Etapa 6.
- La vista solo lee la base.

- [ ] **Paso 1: Implementar `login.ts`**

- [ ] **Paso 2: Implementar `dashboard.ts`**

- [ ] **Paso 3: Comprobar los estados vacíos en `npm run dev`**

Reemplazar temporalmente en LocalStorage los datos por una base sin ventas, sin actividad y con todo el stock alto, y recargar. Esperado: acceso solo con la columna izquierda; Dashboard con importes en $ 0,00, "Sin datos previos" y un estado vacío en cada lista, sin errores. Restaurar los datos después.

- [ ] **Paso 4: Comprobar y hacer commit**

Ejecutar las comprobaciones de la tarea. Mensaje: `feat: agregar acceso demo y Dashboard con datos reales`.

### Task 7: Comprobación en producción

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**
- Produce: capturas y evidencia para la aprobación visual.

Con `npm run build` y `npm run preview`:

- [ ] **Paso 1: Comprobar la CSP y la guía**

Esperado: sin errores en consola en acceso, Dashboard y un módulo; el indicador y el menú móvil funcionan; `/dev/componentes` muestra la página no encontrada; y la búsqueda de "Guía de componentes" en `dist/assets/*.js` no da resultados.

- [ ] **Paso 2: Comprobar el código fuente**

Buscar en `src`: `innerHTML` solo aparece en `ui/html.ts` y `style="` no aparece. Esperado: así es.

- [ ] **Paso 3: Probar texto malicioso**

Con un mensaje de actividad `<img src=x onerror=alert(1)>` en LocalStorage, recargar el Dashboard. Esperado: se ve como texto, sin `img` en el DOM y sin alerta. Restaurar los datos.

- [ ] **Paso 4: Probar datos dañados**

Con `{no es json` en `nexo:db`, recargar. Esperado: aviso de advertencia, datos demo cargados y copia en `nexo:db:backup`.

- [ ] **Paso 5: Probar el responsive**

En 375, 768, 1280 y 1920 px, en acceso, Dashboard y un módulo. Esperado: `scrollWidth <= innerWidth`, sin solapamientos. A 375 px, con un total de `$ 99.999.999,99` y un nombre de 80 caracteres, tampoco hay scroll horizontal.

- [ ] **Paso 6: Probar con teclado**

Solo con el teclado: entrar, navegar por el menú, abrir y cerrar el menú de usuario y el offcanvas, y cerrar sesión. Esperado: foco siempre visible, orden lógico y Esc cierra lo abierto. El orden de foco y la visibilidad se comprueban además con capturas.

- [ ] **Paso 7: Medir el contraste real**

Con estilos calculados en el navegador, medir texto principal, secundario, botón principal y enlaces. Esperado: 4,5:1 o más. Si algún color cambió, repetir la medición de la tabla de tokens.

- [ ] **Paso 8: Sacar las capturas**

Guardar en la carpeta temporal de la sesión capturas de acceso, Dashboard, un módulo y la guía de componentes (esta última desde `npm run dev`), en 1280 y 375 px. Revisarlas con ojo crítico antes de enviarlas y corregir lo que no alcance el nivel del brief, quitando lo que sobre antes de agregar.

### Task 8: Aprobación visual

**Archivos:** los que requieran los cambios pedidos.

**Interfaces:**
- Produce: la dirección visual aprobada, que heredan las etapas siguientes.

- [ ] **Paso 1: Enviar las capturas y esperar**

Este paso detiene la ejecución: el diseño lo exige. Se envían las capturas con una explicación breve, y el autor aprueba o pide cambios.

- [ ] **Paso 2: Aplicar los cambios pedidos**

Se repiten los pasos de la Task 7 que correspondan y se envían capturas nuevas, hasta la aprobación. Cada cambio de tokens se refleja en la sección 9 del diseño.

### Task 9: Cierre de la etapa

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**
- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Ejecutar todas las comprobaciones**

Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0 y sin avisos de Sass.

- [ ] **Paso 2: Comprobar los tests con mutaciones**

En `html.ts`, `routes.ts`, `session.ts` y `format.ts`, romper a propósito cada escape, cada redirección y la caída a memoria. Esperado: cada cambio hace fallar un test.

- [ ] **Paso 3: Revisar e informar**

Pedir una revisión independiente de la etapa contra este plan y el diseño, sin escribir archivos en el proyecto, y corregir lo que corresponda.

El informe incluye la salida real de cada comprobación, los errores que aparecieron y cómo se resolvieron, y qué se construyó, con estos conceptos: XSS y escape, plantillas con etiqueta, SPA y History API, ciclo de vida con `AbortController`, delegación de eventos, design tokens, CSP y accesibilidad con teclado. Cierra con la respuesta a "¿cómo evitás XSS sin un framework?" para una entrevista.

No se empieza la Etapa 3 sin la aprobación del autor.
