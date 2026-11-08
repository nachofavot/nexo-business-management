# Etapa 6 (Dashboard y Reportes): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** sumar al Dashboard sus dos gráficos y construir Reportes (selector de período, métricas, tres gráficos y la tabla de mejores clientes), todo calculado desde los datos guardados.

**Arquitectura:** los cálculos ya existen en `domain/reports.ts`, probados desde la Etapa 1. Esta etapa suma una función que arma el reporte de un período, formatos para ejes y etiquetas, y un componente de gráfico en dos partes, como el detalle de ventas: la configuración es una función pura y se prueba, y el montaje con Chart.js no se prueba, porque necesita el navegador. Cada vista devuelve una función de limpieza que destruye sus gráficos, y el router la ejecuta aunque falle.

**Stack:** TypeScript, Chart.js 4.6.1 (ya instalado desde la Etapa 0, importado por partes), SCSS y Vitest. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 4 (ciclo de vida), 6 (métricas y períodos), 8 (Dashboard y Reportes), 9 (accesibilidad) y 10 (CSP).

## Restricciones globales

- La dirección visual aprobada no se cambia. Los gráficos usan el azul de datos (`--nx-blue`), nunca el violeta: el azul es lo que pasó en el negocio.
- Un solo color por gráfico: ingresos es una serie, y categorías y productos se nombran en el eje. No hace falta una paleta categórica ni leyenda. El azul tiene un contraste de 6,12:1 contra el panel (`#141823`), comprobado con el validador de la guía de visualización.
- Marcas finas: línea de 2 px sin puntos (punto de 8 px al pasar el cursor), barras con extremos redondeados de 4 px, grilla con `--nx-border` y textos con los tokens de texto.
- Cada gráfico tiene un título visible, una frase que resume lo importante y una tabla oculta con todos los datos para lectores de pantalla. El `canvas` lleva `aria-hidden="true"`.
- Con `prefers-reduced-motion: reduce` no hay animaciones.
- Bootstrap no incluye `btn`, `card`, `nav`, `badge`, `table` ni las utilidades `d-*` y `mt-*`. Los estilos nuevos van en `src/styles`.
- Las vistas solo leen con `database.read()` o `services`. Todo contenido dinámico pasa por `html`, sin atributos `style`; las medidas que necesite Chart.js las asigna él desde JavaScript, que la CSP permite.
- Sin `any`, sin dependencias nuevas, rama `etapa-6-dashboard-reportes`, commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` y títulos de tareas con `### Task N:`.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` terminan con código 0. En los comandos de varios pasos, cada comprobación lleva `|| exit 1`.

**Medición de desborde:** siempre `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, con los datos demo y con nombres de 80 caracteres sin espacios. Las capturas se repiten después de cada corrección de estilos.

**Pruebas en el navegador:** los controles se usan con mouse y teclado reales, nunca asignando valores por código. Lo que no se pueda importar en Node (Chart.js montado, Bootstrap) se separa de las funciones puras.

**Fuera de alcance:** exportar datos (el diseño lo excluye), comparar un período con el anterior en Reportes (el diseño no lo pide), elegir fechas a mano en Reportes, el estado vacío del Dashboard para quien vuelve meses después y el umbral de stock en singular ("1 unidades"), anotados para la Etapa 7.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Navegar muchas veces:** ir y volver entre Dashboard, Reportes y otras pantallas diez veces no deja gráficos vivos ni errores en consola; si la limpieza de una vista falla, la siguiente igual se monta (Task 2 y Task 5).
2. **La CSP en producción:** Chart.js no puede depender de estilos bloqueados. En `npm run preview` los gráficos se ven con su tamaño y la consola queda sin errores (Task 5).
3. **Bordes del período:** "7 días" incluye hoy y los 6 días anteriores, "12 meses" incluye el mes actual y los 11 anteriores, una venta de hoy a las 23:59 cuenta, una anulada no cuenta en nada, y un cliente o producto borrado sigue en los rankings (Task 4).
4. **Nombres largos en los gráficos:** un producto de 80 caracteres no se come el área del gráfico en 320 px: el eje muestra el nombre recortado, y el tooltip y la tabla, completo (Task 1 y Task 5).
5. **Cambiar de período rápido:** elegir con el teclado 7, 30, 90 días y 12 meses seguido deja un solo juego de gráficos, con los datos del último período, y el foco en el selector (Task 4 y Task 5).

---

### Task 1: Formatos para gráficos

**Archivos:**

- Modificar: `src/ui/format.ts`
- Test: `src/ui/format.test.ts`

**Interfaces:**

- Consume: `parseDateInput`, `ReportPeriod`, `formatMoney`.
- Produce en `format.ts`:

```ts
/** Importe corto para un eje: "$ 950", "$ 12,5 mil", "$ 5 M". */
function formatMoneyShort(cents: number, currency: Currency): string;
/** Entero con separador de miles: 9999 → "9.999". */
function formatNumber(value: number): string;
/** Etiqueta de un punto de la serie de ingresos: corta para el eje y larga para el tooltip y la tabla. */
function formatSeriesLabel(key: string, period: ReportPeriod): { short: string; long: string };
/** Recorta un nombre para el eje de un gráfico, con "…" al final. */
function truncateLabel(text: string, maxLength: number): string;
```

- [ ] **Paso 1: Escribir los tests que fallan**

| Llamada | Esperado |
|---|---|
| `formatMoneyShort(0, 'ARS')` | `$ 0` |
| `formatMoneyShort(95_000, 'ARS')` | `$ 950` |
| `formatMoneyShort(1_250_000, 'ARS')` | `$ 12,5 mil` |
| `formatMoneyShort(500_000_000, 'ARS')` | `$ 5 M` |
| `formatMoneyShort(18_100_000_000, 'ARS')` | `$ 181 M` |
| `formatMoneyShort(500_000_000, 'USD')` | `US$ 5 M` |
| `formatNumber(9999)` y `formatNumber(5)` | `9.999` y `5` |
| `formatSeriesLabel('2026-11-05', '30d')` | `{ short: '5 nov', long: '5 de noviembre' }` |
| `formatSeriesLabel('2026-11-02', '90d')` | `{ short: '2 nov', long: 'Semana del 2 de noviembre' }` |
| `formatSeriesLabel('2026-11', '12m')` | `{ short: 'nov', long: 'noviembre de 2026' }` |
| `truncateLabel('Monitor', 24)` | `Monitor` |
| `truncateLabel('X'.repeat(80), 24)` | 24 caracteres: 23 `X` y `…` |

Comparar con espacios normales, como los tests actuales: Intl usa espacios duros. Los valores salen de `Intl` en `es-AR`, comprobados en Node el 2026-11-07. `Intl` con `notation: 'compact'` no sirve: mezcla `k` y `K` y usa `B`, que en español se confunde con billón.

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque las funciones no existen.

- [ ] **Paso 3: Implementar**

`formatMoneyShort` toma el símbolo de las partes de `formatMoney` (`$`, `US$`, `EUR`) y escribe el número con un decimal como máximo: `M` desde el millón, `mil` desde mil. `formatSeriesLabel` lee los días con `parseDateInput` y los meses como el día 1.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: agregar formatos para gráficos`.

### Task 2: Componente de gráfico y limpieza al navegar

**Archivos:**

- Crear: `src/ui/charts/config.ts`, `src/ui/charts/figure.ts`, `src/ui/charts/mount.ts`, `src/styles/components/_chart.scss`
- Modificar: `src/app/router.ts`, `src/styles/main.scss`
- Test: `src/ui/charts/config.test.ts`, `src/ui/charts/figure.test.ts`

**Interfaces:**

- Consume: `html`, `emptyState`, los formatos de la Task 1 y los tipos de `chart.js`.
- Produce:

```ts
// ui/charts/config.ts: puras, sin el DOM.
interface ChartTheme {
  series: string; // --nx-blue
  grid: string; // --nx-border
  text: string; // --nx-text-muted
  tooltipBackground: string; // --nx-surface-2
  tooltipText: string; // --nx-text
  fontFamily: string;
}
interface ChartPoint {
  label: string; // la del eje
  title: string; // la del tooltip
  value: number;
}
interface ChartOptions {
  theme: ChartTheme;
  reducedMotion: boolean;
  formatValue(value: number): string; // tooltip
  formatTick(value: number): string; // eje de valores
}
function lineChartConfig(points: readonly ChartPoint[], options: ChartOptions): ChartConfiguration<'line'>;
/** Barras horizontales, en el orden recibido. */
function barChartConfig(points: readonly ChartPoint[], options: ChartOptions): ChartConfiguration<'bar'>;

// ui/charts/figure.ts: el marcado que rodea al canvas.
function chartFigure(options: {
  id: string;
  title: string;
  summary: string;
  table: { headers: readonly [string, string]; rows: readonly (readonly [string, string])[] };
}): SafeHtml;

// ui/charts/mount.ts: necesita el navegador; no se prueba con Vitest.
function readChartTheme(): ChartTheme; // lee los tokens con getComputedStyle
function prefersReducedMotion(): boolean;
/** Crea el gráfico y devuelve la función que lo destruye. */
function mountChart(canvas: HTMLCanvasElement, config: ChartConfiguration): () => void;
```

- [ ] **Paso 1: Escribir los tests que fallan**

`config.test.ts`, con un tema de prueba y tres puntos:

| Caso | Esperado |
|---|---|
| `lineChartConfig` | Tipo `line`, `labels` con las etiquetas cortas, datos con los valores, `borderColor` del tema, `borderWidth: 2`, `pointRadius: 0`, `pointHoverRadius: 4`, `tension: 0` |
| Ejes de la línea | El de valores empieza en 0, su grilla usa `theme.grid` y sus marcas usan `formatTick`; el horizontal no tiene grilla |
| Tooltip de la línea | El título es el `title` del punto y el cuerpo es `formatValue(value)`, llamando a los callbacks configurados |
| `barChartConfig` | `indexAxis: 'y'`, `backgroundColor` del tema, `borderRadius: 4`, en el mismo orden recibido |
| `reducedMotion: true` | `animation: false` en los dos |
| Cualquiera | `responsive: true`, `maintainAspectRatio: false`, leyenda oculta y la fuente del tema |

`figure.test.ts`:

| Caso | Esperado |
|---|---|
| Título "Ingresos" e `id` `revenue` | `h2` con "Ingresos" e `id="revenue-title"`, y la figura con `aria-labelledby="revenue-title"` |
| Resumen | Se ve como texto bajo el título |
| Canvas | `aria-hidden="true"` dentro de `.nx-chart__canvas` |
| Tabla | `class="visually-hidden"`, caption igual al título, los dos encabezados y una fila por punto |
| Una fila con `<img src=x>` | No contiene `<img` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque los módulos no existen.

- [ ] **Paso 3: Implementar**

- `mount.ts` registra solo lo que se usa de Chart.js: `LineController`, `LineElement`, `PointElement`, `BarController`, `BarElement`, `CategoryScale`, `LinearScale` y `Tooltip`.
- `_chart.scss`: `.nx-chart__canvas` es `position: relative` con una altura fija (16rem, 13rem en el celular), porque `maintainAspectRatio: false` toma el alto del contenedor.
- En `router.ts`, `unmountCurrentView` guarda la limpieza en una variable local, deja `viewCleanup` en `undefined` y recién después la ejecuta dentro de `try`/`catch`, con `console.error` si falla. Antes, una limpieza que lanzara un error dejaba la variable sin limpiar y trababa cada navegación posterior.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: agregar componente de gráficos`.

### Task 3: Gráficos del Dashboard

**Archivos:**

- Modificar: `src/views/dashboard.ts`, `src/styles/views/_dashboard.scss`
- Crear: `src/views/chart-summaries.ts`
- Test: `src/views/chart-summaries.test.ts`

**Interfaces:**

- Consume: `revenueSeries`, `grossByCategory`, `salesInRange`, `currentMonthRange`, `chartFigure`, `lineChartConfig`, `barChartConfig`, `mountChart`, `readChartTheme`, `prefersReducedMotion`.
- Produce en `chart-summaries.ts`, que también usa Reportes:

```ts
/** "Total: $ X. Mayor ingreso: 5 de noviembre, con $ Y." Usa el título largo de cada punto. */
function revenueSummary(points: readonly ChartPoint[], currency: Currency): string;
/** "Computación encabeza con $ X." */
function leaderSummary(points: readonly ChartPoint[], formatValue: (value: number) => string): string;
```

- Produce: `dashboardView` devuelve la función que destruye sus dos gráficos.

- [ ] **Paso 1: Escribir los tests de los resúmenes**

| Caso | Esperado |
|---|---|
| Serie de 30 días con total 45.000 y máximo 20.000 el 5 de noviembre | `Total: $ 450,00. Mayor ingreso: 5 de noviembre, con $ 200,00.` |
| Serie de 90 días | "Mayor ingreso: Semana del 2 de noviembre, con…" |
| Serie de 12 meses | "Mayor ingreso: noviembre de 2026, con…" |
| Todos los puntos en 0 | `Total: $ 0,00.`, sin la segunda frase |
| Dos máximos iguales | Gana el más reciente |
| Barras con Computación primero | `Computación encabeza con $ X.` |
| Barras vacías | Cadena vacía |

- [ ] **Paso 2: Comprobar que fallan, implementar y comprobar que pasan**

- [ ] **Paso 3: Sumar los gráficos al Dashboard**

- Entre la franja de métricas y las listas, una fila con "Ingresos de los últimos 30 días" (línea, `col-lg-7`) y "Ventas brutas por categoría" de este mes (barras, `col-lg-5`).
- Sin ventas en los últimos 30 días, el primero muestra "Sin ventas en los últimos 30 días". Sin ventas este mes, el segundo muestra "Sin ventas este mes". En los dos casos no se monta ningún gráfico.
- Los gráficos se montan después de `setHtml` y sus destructores se juntan en la limpieza que devuelve la vista.

- [ ] **Paso 4: Comprobar en `npm run dev`**

| Acción | Esperado |
|---|---|
| Abrir el Dashboard | Los dos gráficos en azul, con título y resumen; el total del resumen de 30 días coincide con la suma de los ingresos de esos días en `nexo:db` |
| Pasar el mouse por la línea | Tooltip con la fecha larga y el importe completo |
| Registrar una venta y volver | El punto de hoy y la barra de su categoría suben |
| Ir y volver entre Dashboard y Clientes diez veces | Sin errores en consola y dos `canvas` en la página |
| En 375 px | Los gráficos uno debajo del otro y sin desborde |

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar gráficos al Dashboard`.

### Task 4: Reportes

**Archivos:**

- Modificar: `src/domain/reports.ts`, `src/main.ts`, `src/styles/main.scss`
- Crear: `src/views/reports.ts`, `src/styles/views/_reports.scss`
- Test: `src/domain/reports.test.ts`

**Interfaces:**

- Consume: todo lo anterior, más `summarizeSales`, `periodRange`, `topProducts`, `topCustomers` y `metric`.
- Produce en `reports.ts` del dominio:

```ts
interface Report {
  summary: SalesSummary;
  revenue: readonly { key: string; revenueCents: number }[];
  categories: readonly { category: ProductCategory; grossCents: number }[];
  topProducts: readonly { productId: string; productName: string; units: number }[];
  topCustomers: readonly { customerId: string; customerName: string; revenueCents: number }[];
}
/** Todo con las ventas del período: los rankings no mezclan ventas de otras fechas. */
function buildReport(sales: readonly Sale[], period: ReportPeriod, now: Date): Report;
```

- Produce: `reportsView: View`, que reemplaza a `createUpcomingView('Reportes', 6)`.

- [ ] **Paso 1: Escribir los tests de `buildReport`**

Con `now` el 7 de noviembre de 2026 a las 12:00 hora local:

| Venta | Esperado con `7d` |
|---|---|
| Completada, hoy a las 23:59 | Cuenta en el resumen, los ingresos, las categorías y los rankings |
| Completada, el 1 de noviembre a las 00:00 | Cuenta: es el primer día de los 7 |
| Completada, el 31 de octubre a las 23:59 | No cuenta en nada, tampoco en los rankings |
| Anulada, ayer | No cuenta en nada |
| De un cliente y un producto que ya no existen | Cuenta con los nombres guardados en la venta |
| Siete productos distintos | `topProducts` trae 5; `topCustomers` también corta en 5 |

Con `12m`, una venta del 1 de diciembre de 2025 cuenta y una del 30 de noviembre de 2025 no.

- [ ] **Paso 2: Comprobar que fallan, implementar y comprobar que pasan**

- [ ] **Paso 3: Implementar la vista**

- **Selector de período:** radios nativos dentro de un `fieldset` con la leyenda oculta "Período", con el aspecto de un control segmentado: "7 días", "30 días" (elegido al entrar), "90 días" y "12 meses". Las flechas cambian de opción, como en cualquier grupo de radios, y el foco se ve en la opción.
- **Métricas:** Ingresos, Ventas, Ticket promedio y Unidades vendidas, en una franja de cuatro columnas desde 992 px y de dos entre 576 y 991 px.
- **Gráficos:** "Ingresos" a todo el ancho; debajo, "Ventas brutas por categoría" y "Productos más vendidos" (unidades), en dos columnas desde 992 px. Los nombres del eje se recortan a 24 caracteres; el tooltip y la tabla los muestran completos.
- **Mejores clientes:** una tabla `nx-table nx-table--no-sort` con Cliente e Ingresos, hasta 5 filas.
- **Al cambiar de período:** se destruyen los gráficos y se vuelve a dibujar todo salvo el selector, para no perder el foco. Sin ventas en el período, cada gráfico y la tabla muestran "Sin ventas en este período" y "Probá con un período más largo."
- La vista devuelve la función que destruye los gráficos vivos.

- [ ] **Paso 4: Comprobar en `npm run dev`**

| Acción | Esperado |
|---|---|
| Abrir `/reportes` | "30 días" elegido; las métricas coinciden con `summarizeSales` sobre las ventas de esos días en `nexo:db` |
| Elegir "12 meses" | 12 puntos, del mes de hace 11 meses al actual. Anotar los ingresos de cada mes para la aprobación visual: según la Etapa 1, van de unos $ 54 a $ 181 millones |
| Elegir "90 días" | Puntos por semana, de lunes a domingo |
| Anular una venta de hoy y volver | Bajan los ingresos, las ventas y su categoría |
| Borrar un cliente con ventas y volver | Sigue en "Mejores clientes" con su nombre |
| Con `sales: []` en `nexo:db` | Métricas en cero y los estados vacíos |
| Ir y volver entre Reportes y el Dashboard diez veces | Sin errores en consola |

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar reportes`.

### Task 5: Comprobación en producción

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**

- Produce: evidencia y capturas.

Con `npm run build` y `npm run preview`:

- [ ] **Paso 1: Comprobar la CSP y el tamaño**

Abrir el Dashboard y Reportes, pasar el mouse por los gráficos y cambiar de período. Esperado: sin errores en consola y cada `canvas` con el ancho de su contenedor y la altura de `.nx-chart__canvas`. Informar cuánto creció el JS del build.

- [ ] **Paso 2: Probar texto malicioso y nombres largos**

Con un producto y un cliente llamados `"><img src=x onerror=alert(1)>`, y otro producto con 80 caracteres sin espacios, registrar ventas de este mes. Esperado: en el Dashboard y en Reportes se ven como texto en el resumen, la tabla oculta y "Mejores clientes", sin `img` ni alerta. En el eje, el nombre largo aparece recortado.

- [ ] **Paso 3: Probar el responsive**

En 320, 375, 767, 768, 991, 992, 1280 y 1920 px, el Dashboard y Reportes en los cuatro períodos, sin desborde según **Restricciones globales**. Achicar y agrandar la ventana con los gráficos a la vista: siguen el ancho sin quedar cortados.

- [ ] **Paso 4: Probar con teclado y con movimiento reducido**

- Solo con el teclado, en 1280 y 375 px: recorrer el Dashboard y, en Reportes, cambiar de período con las flechas. Esperado: foco visible, el foco sigue en el selector y nunca entra al `canvas`.
- Con `prefers-reduced-motion: reduce` emulado, los gráficos aparecen sin animación.

- [ ] **Paso 5: Probar con entrada rápida**

Con teclado real, pasar por los cuatro períodos sin pausa, ida y vuelta, cinco veces. Esperado: queda un gráfico por figura (tres `canvas` en Reportes), con los datos del período elegido y sin errores en consola.

- [ ] **Paso 6: Sacar capturas**

Guardar en `.playwright-mcp/capturas/` el Dashboard y Reportes en 30 días y 12 meses, en 1280 y 375 px, y Reportes en 992 px. Revisarlas con ojo crítico y corregir lo que no alcance el nivel aprobado.

### Task 6: Cierre de la etapa

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**

- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Ejecutar todas las comprobaciones**

Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0 y sin avisos de Sass.

- [ ] **Paso 2: Comprobar los tests con mutaciones**

Romper a propósito, de a una:

- En `buildReport`, cada filtro por período.
- En la configuración de gráficos: cada valor que fija el plan.
- En los formatos: cada umbral y cada redondeo.
- En los resúmenes: la elección del máximo.
- En `chartFigure`: el escape y la tabla oculta.

Esperado: cada cambio hace fallar un test. Los cambios deben estar en un commit antes de empezar, porque los scripts restauran con `git checkout`.

- [ ] **Paso 3: Revisar e informar**

Pedir una revisión independiente contra este plan y el diseño, sin escribir en el proyecto salvo en `.playwright-mcp`, y corregir lo que corresponda.

El informe incluye la salida real de cada comprobación, los errores que aparecieron y cómo se resolvieron, y qué se construyó, con estos conceptos:

- por qué el cálculo vive en el dominio y el gráfico solo dibuja;
- importar Chart.js por partes y cuánto pesa;
- destruir lo que se crea (ciclo de vida y limpieza);
- accesibilidad de un `canvas`;
- un solo color con nombres en el eje en lugar de una paleta.

Muestra las capturas para la **aprobación visual del autor**, con la variación mensual de los ingresos demo. Cierra con la respuesta a "¿cómo hacés accesible un gráfico?" para una entrevista.

No se empieza la Etapa 7 sin la aprobación del autor.

---

## Decisiones tomadas al ejecutar el plan

Registradas para que el plan describa lo que se construyó.

**Componente de gráficos**

- `chartFigure` acepta un estado vacío: sin datos, muestra el mensaje en lugar del gráfico.
- Los datos de cada gráfico no van en una tabla oculta, sino en un desplegable "Ver los datos" con una `nx-table`. Lo pidió la revisión: el diseño exige uso completo con teclado, y antes el valor de cada punto solo aparecía con el mouse. Además, una tabla oculta con `visually-hidden` estiraba la página, porque una tabla no respeta `height` ni `overflow`.
- Los nombres del eje de barras se recortan midiendo el texto con la fuente real (`fitLabel`, contra el 40 % del ancho). Un recorte fijo de 24 caracteres dejaba nombres cortados por la izquierda en 320 px y en 992 px.
- La última marca del eje de valores de las barras se alinea hacia adentro (`ticks.align: 'inner'`): centrada, quedaba cortada contra el borde.
- Si la fuente Geist todavía no cargó, el gráfico se vuelve a montar cuando termina (`remountWhenReady`). Con la fuente de respaldo, Chart.js medía mal y dibujaba textos cortados al recargar la página.
- El tooltip parte el título en líneas de hasta 32 caracteres y aparece en cualquier parte de la fila de una barra. El encabezado del gráfico parte las palabras largas.
- El eje de unidades no marca fracciones (`integerTicks`).
- `.nx-chart__canvas` lleva `overflow: hidden`: al achicar la ventana, el lienzo se recorta en lugar de ensanchar la página hasta que Chart.js se acomoda.
- La limpieza segura de las vistas es `runViewCleanup`, en `app/view.ts`, y tiene tests.

**Datos**

- `revenueSeries` devuelve los días que cubre cada punto, recortados al período. La primera semana de "90 días" se llama "Del 11 al 16 de agosto", y el mes en curso de "12 meses", "noviembre de 2026 (hasta el 8)". Así una caída por un período incompleto no parece real.
- Chart.js se importa por partes y no se carga de forma diferida: el Dashboard es la primera pantalla después de entrar. El JS pasó de 43 a 105 kB comprimidos.

**Detalles menores que quedan para más adelante**

- En 320 px, las fechas del eje de 30 días se tocan; el eje no marca el final, y en 12 meses falta el año en el cambio de año.
- Con 305 px útiles, "12 meses" pasa 4 px el borde del selector; con colores forzados no se distingue el período elegido, y falta el estado `:active`.
- El cambio de período no se anuncia a lectores de pantalla.
- El Dashboard y Reportes deciden el estado vacío con criterios distintos.
- La limpieza no anota un gráfico si otro falla al montarse, y un id de canvas mal escrito pasa en silencio.
- `PERIOD_VALUES` no está atado a `ReportPeriod`, y `truncateLabel` puede partir un emoji.
