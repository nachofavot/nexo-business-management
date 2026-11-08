# Etapa 7 (Configuración y pulido): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** construir Configuración (perfil, preferencias y "Restaurar datos demo"), hacer que cada preferencia cambie la app de verdad y cerrar los pendientes de responsive, accesibilidad y estados vacíos anotados en las Etapas 2 a 6.

**Arquitectura:** un servicio nuevo, `services/settings.ts`, guarda perfil y preferencias con las validaciones que existen desde la Etapa 1 y restaura los datos demo con `replace`. El acento y la densidad se aplican como atributos `data-*` en `<html>`, y los estilos hacen el resto: no hay estilos escritos desde JavaScript. Moneda, IVA y umbral ya se leen al abrir cada pantalla, así que basta con guardarlos. El resto de la etapa son correcciones chicas, cada una con su test o con una medición en el navegador.

**Stack:** TypeScript, SCSS, Bootstrap 5.3.8 (Modal, Dropdown, Offcanvas y Toast), Chart.js 4.6.1 y Vitest. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 5 (Settings), 6 (validaciones), 7 (datos demo), 8 (Configuración, actividad y formularios), 9 (sistema de diseño y accesibilidad) y 11 (cobertura).

## Decisiones para tu aprobación

1. **Acento azul con tonos propios.** El azul del acento no es el azul de datos (`#2E9BFF`): con texto blanco ese azul da 2,90:1 y no sirve para un botón. El acento azul usa `#2F6BF0` (4,69:1 con texto blanco) y `#8DB4FF` para enlaces y foco (8,53:1 sobre el panel). Los gráficos siguen en el azul de datos con cualquier acento.
2. **Restaurar conserva el perfil y las preferencias.** Se regeneran clientes, productos, ventas y actividad. Quien eligió USD y densidad compacta no espera perderlos al pedir datos nuevos. El diálogo de confirmación lo dice.
3. **Restaurar también desde el Dashboard.** Si alguien vuelve meses después, el Dashboard queda en cero. En ese caso muestra un aviso con el botón "Restaurar datos demo", con la misma confirmación que en Configuración.
4. **El IVA nuevo vale solo para las ventas nuevas.** Cada venta guarda su IVA desde la Etapa 5. El campo lo explica.
5. **La densidad compacta cambia solo la tabla, desde 768 px.** En el celular las filas son tarjetas, y achicarlas empeoraría el uso táctil.
6. **Guardar sin cambios no escribe ni registra actividad.** Vale para Configuración, Clientes y Productos. Configuración avisa "No había cambios para guardar".
7. **El perfil no usa autocompletado.** Con `autocomplete="name"`, el navegador ofrecería el nombre y el email reales de la persona en una demo con datos ficticios.

## Restricciones globales

- La dirección visual aprobada no se cambia. El acento marca lo que el usuario puede hacer y el azul de datos, lo que pasó en el negocio. Nunca se mezclan en un mismo elemento.
- Contraste AA: 4,5:1 para el texto y 3:1 para los bordes de campos y el foco. Cada color nuevo se mide con la fórmula WCAG y el valor queda en el plan o en el commit.
- Bootstrap no incluye `btn`, `card`, `nav`, `badge`, `table` ni las utilidades `d-*` y `mt-*`. Los estilos nuevos van en `src/styles`, con clases `nx-`.
- Las vistas solo leen con `database.read()` y modifican con `services`. Todo contenido dinámico pasa por `html`, sin atributos `style`.
- Formularios: validan al enviar, revalidan al escribir después del primer intento, muestran el error junto al campo y llevan el foco al primer campo inválido (diseño, sección 8).
- Actividad: se registra al cambiar la configuración (`settings`) y al restaurar los datos (`data`). Se conservan las últimas 100 entradas.
- Sin `any` y sin dependencias nuevas. Rama `etapa-7-configuracion-pulido`. Commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` y títulos de tareas con `### Task N:`.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` terminan con código 0. En los comandos de varios pasos, cada comprobación lleva `|| exit 1`.

**Medición de desborde:** siempre `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, con los datos demo y con nombres de 80 caracteres sin espacios (60 en el perfil, su máximo). Las capturas se repiten después de cada corrección de estilos.

**Pruebas en el navegador:** se hacen en `npm run preview`, porque la CSP solo está activa ahí. Los controles se usan con mouse y teclado reales, nunca asignando valores por código. Cada pantalla se prueba también con una recarga completa y la caché desactivada. Con Playwright se llama a `page.bringToFront()` antes de medir un cambio de tamaño. Lo que no se puede importar en Node (Bootstrap, Chart.js montado) se separa de las funciones puras.

**Fuera de alcance:**

- Lo que el diseño excluye: tema claro, conversión de monedas, gestión de categorías y exportar.
- Docker y Cloud Run, en la Etapa 8. README y guía de entrevista, en la Etapa 9.
- Pendientes anotados que no cambian nada para quien usa la app:
  - `handleLinkClick` ignora los enlaces con `#`, pero la app no tiene ninguno.
  - Los cambios de movimiento reducido del sistema se aplican al navegar.
  - "$ 1.000 mil" no aparece, porque las marcas del eje son redondas.
  - Se crea un formateador `Intl` por marca del eje, a un costo despreciable.
  - El texto del canvas no sigue el tamaño de letra del navegador, pero la tabla de "Ver los datos" sí.
- Con dos pestañas abiertas gana la última escritura. Es una limitación documentada en el diseño.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Restaurar los datos:** después de restaurar, la sesión sigue abierta, el perfil y las preferencias no cambian y la próxima venta toma un número que no repite ninguno. Si el almacenamiento falla, no cambia nada (Task 1, Task 4 y Task 5).
2. **Acento azul completo:** en ninguna pantalla ni estado (hover, foco, elegido, abierto) queda un color violeta, tampoco en las reglas que Bootstrap compila con `$primary` (Task 2).
3. **Preferencias de negocio:** con USD, todos los importes usan `US$`, también el acceso demo y los ejes. Con IVA del 10,5 %, una venta nueva lo usa y el detalle de una venta vieja conserva el 21 % (Task 4).
4. **Perfil con nombres difíciles:** un nombre de 60 caracteres sin espacios, `<script>` o un emoji al principio: el título de la página se sigue leyendo, las iniciales no muestran caracteres rotos y nada se interpreta como HTML (Task 4).
5. **Umbral en los bordes:** con 0, "Productos con stock bajo" muestra solo los productos sin stock y dice "Sin stock". Con 1 dice "1 unidad o menos" y con 1000, "1.000 unidades o menos" (Task 9).

---

### Task 1: Servicio de configuración y guardados sin cambios

**Archivos:**

- Crear: `src/services/settings.ts`, `src/services/settings.test.ts`
- Modificar: `src/services/index.ts`, `src/services/types.ts`, `src/services/customers.ts`, `src/services/products.ts`
- Test: `src/services/customers.test.ts`, `src/services/products.test.ts`

**Interfaces:**

- Consume: `validateProfile`, `validatePreferences`, `createSeedDatabase(now)`, `withActivity`, `database.update` y `database.replace`.
- Produce:

```ts
// services/types.ts
/** true si algún campo de `next` difiere del actual. Guardar sin cambios no escribe nada. */
function hasChanges<T extends object>(current: T, next: Partial<T>): boolean;

// services/settings.ts
type ProfileField = keyof Settings['profile'];
type SettingsFailure<K extends string> = Exclude<ServiceFailure<K>, { kind: 'not-found' }>;
type SaveOutcome = 'saved' | 'unchanged';

interface SettingsService {
  read(): Settings;
  validateProfile(input: Settings['profile']): FieldErrors<ProfileField>;
  validatePreferences(input: PreferencesInput): FieldErrors<keyof PreferencesInput>;
  updateProfile(input: Settings['profile']): Result<SaveOutcome, SettingsFailure<ProfileField>>;
  updatePreferences(
    input: PreferencesInput,
  ): Result<SaveOutcome, SettingsFailure<keyof PreferencesInput>>;
  /** Datos demo nuevos con la fecha de hoy. Conserva el perfil y las preferencias. */
  restoreDemo(): Result<void, StorageFailure>;
}
// Services suma `settings: SettingsService`.
```

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| `hasChanges({ a: 1, b: 'x' }, { b: 'x' })` | `false` |
| `hasChanges({ a: 1, b: 'x' }, { b: 'y' })` | `true` |
| `updateProfile({ displayName: '  Ana Gómez ', email: 'ANA@Example.com', role: '' })` | `ok('saved')`; perfil `{ displayName: 'Ana Gómez', email: 'ana@example.com', role: '' }`; primera actividad `{ type: 'settings', message: 'Perfil actualizado' }` |
| `updateProfile` con el perfil guardado | `ok('unchanged')`; la actividad y el texto guardado no cambian |
| `updateProfile` con `displayName: 'A'` | error de validación en `displayName`; nada cambia |
| `updatePreferences({ currency: 'USD', taxPercent: '10,5', lowStockThreshold: '3', tableDensity: 'compact', accent: 'blue' })` | `ok('saved')`; preferencias `{ currency: 'USD', taxPercent: 10.5, lowStockThreshold: 3, tableDensity: 'compact', accent: 'blue' }`; actividad `Preferencias actualizadas` |
| `updatePreferences` con `taxPercent: '21,555'` | error en `taxPercent`; nada cambia |
| `restoreDemo()` con `now` = 2026-11-08 12:00 (-03:00) | clientes, productos, ventas y `nextSaleNumber` iguales a los de `createSeedDatabase(now)`; perfil y preferencias iguales a los anteriores; primera actividad `{ type: 'data', message: 'Datos demo restaurados' }` |
| `updateProfile`, `updatePreferences` y `restoreDemo` con el almacenamiento lleno | `quota-exceeded`; `read()` igual que antes |
| `customers.update` y `products.update` con los mismos datos | `ok`; sin actividad nueva y `updatedAt` sin cambios |
| `customers.update` y `customers.remove` con un id inexistente en una base con clientes | `not-found`; nada cambia |

Los casos de almacenamiento lleno siguen el patrón de `describe('con el almacenamiento lleno')` de `customers.test.ts`.

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `settings.ts` y `hasChanges` no existen, y porque `update` registra actividad aunque no haya cambios.

- [ ] **Paso 3: Implementar**

`restoreDemo` arma `{ ...createSeedDatabase(now()), settings: actual.settings }`, le suma la actividad con `withActivity` y lo guarda con `replace`, como pide el diseño para reemplazar la base entera. `updateProfile` y `updatePreferences` comparan el valor validado con `hasChanges` antes de llamar a `update`.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: agregar servicio de configuración`.

### Task 2: Acento y densidad aplicados

**Archivos:**

- Crear: `src/ui/appearance.ts`, `src/ui/appearance.test.ts`
- Modificar: `src/styles/_tokens.scss`, `src/styles/_bootstrap.scss`, `src/styles/components/_table.scss`, los estilos que usan `--nx-violet-*` (`components/_base.scss`, `_button.scss`, `_chart.scss`, `_form.scss`, `_table.scss`, `layout/_nav.scss`, `_shell.scss`, `views/_reports.scss` y `_style-guide.scss`), `src/views/style-guide.ts` y `src/main.ts`

**Interfaces:**

- Consume: `Settings['preferences']`.
- Produce:

```ts
type AppearancePreferences = Pick<Settings['preferences'], 'accent' | 'tableDensity'>;
/** Escribe data-accent y data-density en el elemento raíz. Los estilos hacen el resto. */
function applyAppearance(target: { dataset: DOMStringMap }, preferences: AppearancePreferences): void;
```

- Tokens nuevos, en `:root` (violeta) y en `:root[data-accent='blue']`. Contraste medido el 2026-11-08:

| Token | Violeta | Azul | Contraste del azul |
|---|---|---|---|
| `--nx-accent-300` | `#A78FFF` | `#8DB4FF` | 8,53:1 sobre el panel y 9,35:1 sobre el fondo |
| `--nx-accent-500` | `#7450FF` | `#2F6BF0` | 4,69:1 con texto blanco |
| `--nx-accent-600` | `#6840F5` | `#285FDB` | 5,60:1 con texto blanco (hover) |
| `--nx-accent-700` | `#5C36DE` | `#2353C2` | 6,80:1 con texto blanco (active) |
| `--nx-accent-tint` | `rgba(116, 80, 255, 0.2)` | `rgba(47, 107, 240, 0.2)` | fondo del avatar |

- Las propiedades `--nx-violet-*` desaparecen: todos sus usos marcan acciones y pasan a `--nx-accent-*`. Las variables Sass `$violet-*` quedan, porque Bootstrap las necesita al compilar.
- Densidad compacta: `:root[data-density='compact'] .nx-table`, desde 768 px, con `th` de `0.375rem` y `td` de `0.5rem` de relleno vertical.
- `main.ts` llama a `applyAppearance(document.documentElement, database.read().settings.preferences)` antes de `createRouter`.

- [ ] **Paso 1: Escribir los tests que fallan**

`applyAppearance({ dataset: {} }, { accent: 'blue', tableDensity: 'compact' })` deja `dataset` en `{ accent: 'blue', density: 'compact' }`. Una segunda llamada con `violet` y `comfortable` reemplaza los dos valores.

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `appearance.ts` no existe.

- [ ] **Paso 3: Implementar la función y los tokens**

- [ ] **Paso 4: Buscar el violeta que compila Bootstrap**

Ejecutar `npm run build` y buscar `#7450ff`, `#a78fff`, `116, ?80, ?255` y `167, ?143, ?255` en `dist/assets/*.css`. Cada regla que afecte a un componente en uso (foco de campos, `form-check`, `dropdown-item` activo, `--bs-focus-ring-color`) se sobrescribe en el componente con `var(--nx-accent-*)`.

- [ ] **Paso 5: Verificar en el navegador**

Cambiar las preferencias con la herramienta de desarrollo (es solo una prueba: la pantalla llega en la Task 4) y recargar. En cada pantalla, con un modal abierto, el menú de usuario abierto y un campo con foco, un script recorre todos los elementos. Revisa `color`, `background-color`, los cuatro `border-*-color`, `outline-color` y `box-shadow`.

| Preferencias | Esperado |
|---|---|
| Acento azul | Ningún elemento con los violetas `rgb(116, 80, 255)`, `rgb(167, 143, 255)`, `rgb(104, 64, 245)`, `rgb(92, 54, 222)` ni sus tintes |
| Acento violeta | Las capturas de 1280 px coinciden con las de la Etapa 6 |
| Densidad compacta | El `td` mide 8 px de relleno en 1280 px, y la tarjeta de 375 px no cambia |

- [ ] **Paso 6: Comprobar y hacer commit**

Mensaje: `feat: aplicar el color de acento y la densidad de tablas`.

### Task 3: Ayudas, campos opcionales y control segmentado

**Archivos:**

- Crear: `src/ui/components/form-state.ts`, `src/ui/components/segmented.ts`, `src/ui/components/segmented.test.ts`, `src/styles/components/_segmented.scss`
- Modificar: `src/ui/components/form-field.ts`, `src/ui/components/form-field.test.ts`, `src/ui/components/form-modal.ts`, `src/views/reports.ts`, `src/styles/views/_reports.scss`, `src/styles/main.scss`

**Interfaces:**

- Consume: `html`, `FieldErrors`.
- Produce:

```ts
// form-field.ts
interface FieldDefinition<K extends string> {
  // …los campos actuales, y:
  /** Ayuda visible bajo el campo, asociada con aria-describedby. */
  hint?: string;
}
function fieldHintId(idPrefix: string, name: string): string;
/** Los id que describen un campo: su ayuda y, si hay, su error. */
function describedBy(ids: { hint?: string; error?: string }): string | null;

// form-state.ts: se mueven de form-modal.ts sin cambiar su comportamiento.
function readFormValues<K extends string>(
  form: HTMLFormElement,
  fields: readonly FieldDefinition<K>[],
  fallback: Readonly<Record<K, string>>,
): Readonly<Record<K, string>>;
function showFieldErrors<K extends string>(
  form: HTMLFormElement,
  fields: readonly FieldDefinition<K>[],
  idPrefix: string,
  errors: FieldErrors<K>,
): void;
function focusFirstInvalid<K extends string>(
  form: HTMLFormElement,
  fields: readonly FieldDefinition<K>[],
  errors: FieldErrors<K>,
): void;

// segmented.ts: radios nativos con aspecto de control segmentado.
interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}
function segmented<V extends string>(options: {
  name: string;
  legend: string;
  idPrefix: string;
  options: readonly SegmentedOption<V>[];
  value: V;
}): SafeHtml;
```

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| `formField` sin `required` | La etiqueta termina en `<span class="nx-field__optional">(opcional)</span>` |
| `formField` con `required` | Sin "(opcional)" |
| `formField` con `hint`, sin error | `<div class="form-text" id="p-tax-hint">` y `aria-describedby="p-tax-hint"` |
| `formField` con `hint` y error | `aria-describedby="p-tax-hint p-tax-error"` |
| `describedBy({})`, `({ hint: 'a' })` y `({ hint: 'a', error: 'b' })` | `null`, `'a'` y `'a b'` |
| `segmented` | `fieldset` con `legend` oculta, un radio por opción con `id="{idPrefix}-{value}"`, `checked` solo en `value` y etiquetas escapadas |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `hint`, `describedBy` y `segmented` no existen, y porque falta "(opcional)".

- [ ] **Paso 3: Implementar**

`showFieldErrors` arma `aria-describedby` con `describedBy`, para no perder la ayuda al mostrar un error. `.nx-segmented` pasa de `views/_reports.scss` a `components/_segmented.scss`, sin su margen, que queda en Reportes. Se suman tres correcciones de la Etapa 6:

- `:active` con `rgba(255, 255, 255, 0.1)`;
- con colores forzados, `Highlight` en la opción elegida y en el foco;
- por debajo de 360 px, relleno lateral de `0.25rem` y `min-width: 0`.

En Reportes, el selector pasa a `segmented()` y `PERIOD_VALUES` lleva `satisfies readonly ReportPeriod[]`.

- [ ] **Paso 4: Verificar en el navegador**

| Prueba | Esperado |
|---|---|
| Reportes en 1280 y 375 px | Igual que en la Etapa 6; las flechas cambian el período y el foco queda en el selector |
| Reportes con 305 px de ancho | En cada opción, `scrollWidth <= clientWidth` |
| Reportes con `forced-colors: active` emulado | El período elegido se distingue en la captura |
| Nuevo cliente, enviado vacío | Errores junto a Nombre y Email, foco en Nombre, revalidación al escribir; Teléfono y Empresa dicen "(opcional)" |

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar ayudas, campos opcionales y control segmentado`.

### Task 4: Pantalla de Configuración

**Archivos:**

- Crear: `src/views/settings.ts`, `src/views/settings-form.ts`, `src/views/settings-form.test.ts`, `src/views/restore-demo.ts`, `src/styles/views/_settings.scss`
- Modificar: `src/main.ts`, `src/app/view.ts`, `src/app/router.ts`, `src/app/shell.ts`, `src/ui/format.ts`, `src/ui/format.test.ts`, `src/styles/layout/_shell.scss`, `src/styles/main.scss`
- Eliminar: `src/views/upcoming.ts`. Su único uso era Configuración, y su comentario dice que cada etapa la reemplaza.

**Interfaces:**

- Consume: `SettingsService` (Task 1), `applyAppearance` (Task 2), `formField`, `segmented` y `form-state` (Task 3), `confirmDialog`, `showToast` y `storageFailureMessage`.
- Produce:

```ts
// app/view.ts: ViewContext suma
/** Vuelve a montar la pantalla actual, por ejemplo después de restaurar los datos. */
refresh(): void;
/** Vuelve a leer el perfil guardado y actualiza el menú de usuario. */
refreshShell(): void;

// app/shell.ts: Shell suma refreshProfile(): void.

// ui/format.ts: reemplaza a initials() de shell.ts.
/** Iniciales de las dos primeras palabras, sin partir emojis ni letras compuestas. */
function formatInitials(name: string): string;

// views/settings-form.ts: puras.
const PROFILE_FIELDS: readonly FieldDefinition<keyof Settings['profile']>[];
const PREFERENCE_FIELDS: readonly FieldDefinition<'currency' | 'taxPercent' | 'lowStockThreshold'>[];
const DENSITY_OPTIONS: readonly SegmentedOption<TableDensity>[];
const ACCENT_OPTIONS: readonly SegmentedOption<Accent>[];
function preferencesToInput(preferences: Settings['preferences']): PreferencesInput;

// views/restore-demo.ts: la usan Configuración y el Dashboard.
/** Pide confirmación, restaura y avisa. Devuelve true si se restauraron los datos. */
function confirmRestoreDemo(services: Services, signal: AbortSignal): Promise<boolean>;
```

- Campos (todos con `autocomplete="off"`):

| Campo | Etiqueta | Control | Ayuda |
|---|---|---|---|
| `displayName` | Nombre | texto, obligatorio | — |
| `email` | Email | email, obligatorio | — |
| `role` | Rol | texto, opcional | — |
| `currency` | Moneda | `select`: "Peso argentino (ARS)", "Dólar estadounidense (USD)" y "Euro (EUR)" | "Cambia el formato de los importes. No convierte valores." |
| `taxPercent` | IVA (%) | texto decimal, obligatorio | "Se aplica a las ventas nuevas. Las registradas conservan el suyo." |
| `lowStockThreshold` | Umbral de stock bajo | texto numérico, obligatorio | "Un producto con esta cantidad o menos se marca con stock bajo." |
| `tableDensity` | Densidad de tablas | segmentado: Cómoda o Compacta | — |
| `accent` | Color de acento | segmentado: Violeta o Azul | — |

- Textos:
  - Pantalla: tres secciones en una columna (Perfil, Preferencias y Datos demo), cada una con su `h2`.
  - Botones: "Guardar perfil" y "Guardar preferencias".
  - Avisos: "Perfil guardado.", "Preferencias guardadas.", "No había cambios para guardar.", "Datos demo restaurados." y, si falla, `storageFailureMessage`.
  - Datos demo: "Volvé a generar clientes, productos y ventas de ejemplo con fechas de hoy. Tu perfil y tus preferencias se mantienen." y el botón de peligro "Restaurar datos demo", con `aria-haspopup="dialog"`.
  - Confirmación: título "¿Restaurar los datos demo?", mensaje "Se reemplazan los clientes, los productos, las ventas y la actividad. Los cambios que hiciste en ellos se pierden." y botón "Restaurar datos".
- Al guardar el perfil, la pantalla llama a `refreshShell()`; al guardar las preferencias, a `applyAppearance(document.documentElement, …)`.
- En la barra superior, el nombre del usuario mide como máximo `12rem` y termina en "…".

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| `preferencesToInput` con `{ currency: 'USD', taxPercent: 10.5, lowStockThreshold: 3, tableDensity: 'compact', accent: 'blue' }` | `{ currency: 'USD', taxPercent: '10,5', lowStockThreshold: '3', tableDensity: 'compact', accent: 'blue' }` |
| `preferencesToInput` y después `validatePreferences`, con IVA 0, 21, 10.5, 99.99 y 100 | Devuelve las mismas preferencias |
| `PROFILE_FIELDS` y `PREFERENCE_FIELDS` | Etiquetas, obligatorios, ayudas y `autocomplete: 'off'` de la tabla |
| `formatInitials` con `'Usuario Demo'`, `'ana'`, `'  ana   gómez  '`, `'😀 Ana'`, `'ñandú élite'` y `''` | `'UD'`, `'A'`, `'AG'`, `'😀A'`, `'ÑÉ'` y `''` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `settings-form.ts` y `formatInitials` no existen.

- [ ] **Paso 3: Implementar**

El router implementa `refresh()` desmontando y volviendo a montar la ruta actual, sin tocar el historial. `refreshShell()` llama a `shell?.refreshProfile()`. `formatInitials` usa `Intl.Segmenter` para tomar el primer grafema de cada palabra.

- [ ] **Paso 4: Verificar en el navegador**

| Prueba | Esperado |
|---|---|
| Guardar el perfil "Ana Gómez" | Aviso, menú con "AG" y "Ana Gómez", `aria-label="Menú de Ana Gómez"` y la actividad en el Dashboard |
| Perfil vacío y "Guardar perfil" | Errores junto a los campos, foco en Nombre; al escribir, el error se va |
| Nombre de 60 caracteres sin espacios, `<script>alert(1)</script>` y `😀 Ana` | Se ven como texto, el título "Configuración" se lee entero de 320 a 1920 px y no hay desborde |
| USD y volver a cada pantalla | `US$` en métricas, tablas, ejes, detalle de venta y acceso demo |
| IVA 10,5 y una venta nueva | La vista previa y el detalle usan 10,5 %; una venta vieja conserva 21 % |
| Umbral 1 | Productos y Dashboard marcan stock bajo con 1 unidad o menos |
| Azul y compacta, y recargar | Se aplican al guardar y siguen después de recargar |
| Guardar sin cambios | "No había cambios para guardar." y ninguna actividad nueva |
| Restaurar y cancelar | No cambia nada y el foco vuelve al botón |
| Restaurar y confirmar | Datos nuevos, sesión abierta, perfil y preferencias intactos; la próxima venta lleva el número siguiente al último de los datos nuevos |
| Formularios con el teclado, en 375 y 1280 px | Se recorren y envían con Tab y Enter, con el foco siempre visible |

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar la pantalla de Configuración`.

### Task 5: Datos demo viejos y estados vacíos

**Archivos:**

- Modificar: `src/domain/reports.ts`, `src/domain/reports.test.ts`, `src/views/dashboard.ts`, `src/views/login.ts`, `src/ui/components/modal.ts`, `src/styles/views/_dashboard.scss`

**Interfaces:**

- Consume: `periodRange`, `currentMonthRange`, `confirmRestoreDemo` y `refresh()` (Task 4).
- Produce:

```ts
/** Hay ventas, pero ninguna completada en los últimos 30 días: los datos demo quedaron viejos. */
function isDemoOutdated(sales: readonly Sale[], now: Date): boolean;
/** Criterio único de "sin ventas" para el Dashboard y Reportes. */
function hasCompletedSales(sales: readonly Sale[], range: DateRange): boolean;
```

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso (`now` = 2026-11-08 12:00) | Esperado |
|---|---|
| Última venta completada hoy | `isDemoOutdated` es `false` |
| Última venta completada el 2026-10-10 a las 00:00 (dentro de "30 días") | `false` |
| Última venta completada el 2026-10-09 a las 23:59 | `true` |
| Solo ventas anuladas en los últimos 30 días y completadas antes | `true` |
| Sin ventas | `false` |
| `hasCompletedSales` con una venta de $ 0 (100 % de descuento) | `true` |
| `hasCompletedSales` con solo ventas anuladas | `false` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque las funciones no existen.

- [ ] **Paso 3: Implementar**

- **Dashboard:** si `isDemoOutdated`, arriba de las métricas aparece "No hay ventas en los últimos 30 días. Restaurá los datos demo para verlos con fechas de hoy." y el botón "Restaurar datos demo". Ese botón llama a `confirmRestoreDemo` y después a `refresh()`. Los gráficos deciden su estado vacío con `hasCompletedSales`, como Reportes.
- **Acceso demo:** si `database.mode === 'memory'`, la nota dice "Los datos son ficticios. Tu navegador no permite guardarlos: los cambios se pierden al recargar."
- **Modales:** si al cerrarse el botón que abrió el modal ya no está en la página, el foco va a `#nx-page-title`, nunca a `body`.

- [ ] **Paso 4: Verificar en el navegador**

| Prueba | Esperado |
|---|---|
| Datos con la última venta de hace 4 meses (fechas corridas en el JSON guardado) | Aviso en el Dashboard; restaurar lo quita y muestra métricas del mes |
| Borrar un cliente con `setItem` forzado a lanzar `QuotaExceededError` | Aviso de error, el cliente sigue y el foco no queda en `body` |
| Atrás del navegador mientras se abre un modal | El modal se cierra y el foco queda en el título de la pantalla anterior |
| `localStorage` bloqueado | La nota del acceso avisa que no se guarda |

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: avisar cuando los datos demo quedaron viejos`.

### Task 6: Ejes y montaje de los gráficos

**Archivos:**

- Modificar: `src/ui/charts/config.ts`, `src/ui/charts/config.test.ts`, `src/ui/charts/lifecycle.ts`, `src/ui/charts/lifecycle.test.ts`, `src/ui/charts/mount.ts`, `src/ui/format.ts`, `src/ui/format.test.ts`, `src/views/dashboard.ts`, `src/views/reports.ts`

**Interfaces:**

- Consume: `lineChartConfig`, `formatSeriesLabel`, `truncateLabel`, `mountChartById`.
- Produce:

```ts
// config.ts
/** Índices del eje de fechas con etiqueta: siempre el primero y el último, repartidos. */
function tickIndices(count: number, maxTicks: number): ReadonlySet<number>;
const MIN_TICK_SPACING = 64; // px entre etiquetas del eje de fechas

// lifecycle.ts
interface Destroyable {
  destroy(): void;
}
/** Crea todos los gráficos o ninguno: si uno falla, destruye los anteriores y relanza el error. */
function createAll(factories: readonly (() => Destroyable)[]): Destroyable[];
```

- `mountChartById` lanza `Error('No existe el lienzo …')` si falta el canvas. Las vistas montan solo los gráficos con datos, con `createAll`.
- Eje de fechas de la línea: `autoSkip: false`, `align: 'inner'`. El callback muestra la etiqueta solo en `tickIndices(cantidad, clamp(floor(ancho / MIN_TICK_SPACING), 2, 6))` y devuelve `null` en las demás.
- `formatSeriesLabel` en "12 meses": la etiqueta corta de enero lleva el año.
- `truncateLabel` cuenta grafemas con `Intl.Segmenter`.

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| `tickIndices(5, 6)` | `{0, 1, 2, 3, 4}` |
| `tickIndices(30, 6)` | `{0, 6, 12, 17, 23, 29}` |
| `tickIndices(30, 2)`, `tickIndices(1, 6)` y `tickIndices(0, 6)` | `{0, 29}`, `{0}` y `{}` |
| Callback del eje x con `chart.width` de 300 y 30 puntos | Etiqueta en los índices 0, 10, 19 y 29; `null` en el resto |
| Eje x de la línea | `{ autoSkip: false, align: 'inner' }` |
| `createAll` con dos fábricas | Devuelve los dos gráficos |
| `createAll` si la segunda lanza | El primero queda destruido y el error sube |
| `formatSeriesLabel` de `2026-01` y `2026-11` en `12m` | Corta: `ene 2026` y `nov` |
| `truncateLabel('👩‍💻'.repeat(30), 5)` | Cuatro `👩‍💻` y `…` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque las funciones y opciones no existen.

- [ ] **Paso 3: Implementar**

- [ ] **Paso 4: Verificar en el navegador**

En 320 px, las fechas del eje de 30 días no se tocan y la última fecha del eje es la de hoy. "12 meses" muestra el año en enero. Diez idas y vueltas entre Dashboard y Reportes no dejan errores, y la cantidad de gráficos es la justa.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `fix: mostrar la última fecha y limpiar los gráficos si uno falla`.

### Task 7: Pantallas chicas y táctiles

**Archivos:**

- Modificar: `src/styles/layout/_shell.scss`, `src/styles/layout/_nav.scss`, `src/styles/views/_login.scss`, `src/styles/components/_button.scss`, `_table.scss`, `_pagination.scss`, `_modal.scss`, `_dropdown.scss`, `_chart.scss` y `_toolbar.scss`, y `src/app/shell.ts` si el offcanvas lo necesita

Esta tarea es CSS y no tiene tests de Vitest. Su prueba es un script de medidas: antes del cambio tiene que listar los controles chicos (el rojo) y después tiene que quedar vacío.

- [ ] **Paso 1: Medir antes del cambio**

Con 375 × 812 px, emulación táctil (`hasTouch`, `isMobile`) y `(pointer: coarse)`, el script lista cada `button`, `a`, `summary`, `select`, `input` y `label.nx-segmented__option` visible de cada pantalla que mida menos de 44 px de alto o de ancho. Corre también con un modal, el menú de usuario y el menú lateral abiertos. No se cuentan los enlaces dentro de un párrafo. Esperado: la lista no está vacía, por ejemplo con los botones de orden de 20 px.

- [ ] **Paso 2: Corregir**

- `min-height: 100vh` queda como respaldo, seguido de `100dvh`. Lo mismo con el `height` del menú lateral.
- Con `@media (pointer: coarse)`, los controles miden al menos 44 × 44 px: botones de icono, botones de orden, paginación, `btn-close`, ítems del menú, "Ver los datos", enlaces del menú lateral y campos.
- Entre 480 y 767 px, la búsqueda y la categoría de Productos tienen el mismo ancho.
- Menú lateral: Esc lo cierra y devuelve el foco al botón del menú. Si la ventana pasa a 992 px con el menú abierto, no queda fondo oscuro ni el scroll bloqueado. Si falla, se cierra con `matchMedia('(min-width: 992px)')`.

- [ ] **Paso 3: Medir después del cambio**

| Prueba | Esperado |
|---|---|
| El script del Paso 1 | Lista vacía |
| Capturas de 1280 px con mouse | Iguales a las de antes del cambio |
| Tocar un punto del gráfico de ingresos con emulación táctil | Aparece su tooltip |
| Desborde de 320 a 1920 px en todas las pantallas | Ninguno |

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `fix: adaptar los controles a pantallas táctiles`.

### Task 8: Avisos y nombres accesibles

**Archivos:**

- Crear: `src/ui/announce.ts`
- Modificar: `index.html`, `src/ui/messages.ts`, `src/ui/messages.test.ts`, `src/views/customers.ts`, `src/views/products.ts`, `src/views/sales.ts`, `src/views/reports.ts`, `src/views/new-sale.ts`, `src/views/sale-columns.ts`, `src/views/product-columns.ts`

**Interfaces:**

- Produce:

```ts
// announce.ts
/** Anuncia un cambio a los lectores de pantalla en la región #nx-announcer de index.html. */
function announce(message: string): void;

// messages.ts: puras.
function pageAnnouncement(page: number, pageCount: number): string;
function periodAnnouncement(period: ReportPeriod): string;
```

- `index.html` suma `<div id="nx-announcer" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>`. La región tiene que existir antes del primer anuncio, igual que la de los avisos. `announce` vacía el texto y lo escribe en el cuadro siguiente, para que un mensaje repetido también se anuncie.

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| `pageAnnouncement(2, 5)` | `Página 2 de 5` |
| `periodAnnouncement('90d')` y `('12m')` | `Reportes de los últimos 90 días` y `Reportes de los últimos 12 meses` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque las funciones no existen.

- [ ] **Paso 3: Implementar**

- Cambiar de página en Clientes, Productos y Ventas lo anuncia, y cambiar de período en Reportes también.
- Todo botón que abre un modal lleva `aria-haspopup="dialog"`: editar, eliminar, ver detalle, anular y restaurar.
- Nueva venta:
  - El producto y la cantidad de cada línea se llaman "Producto de la línea N" y "Cantidad de la línea N", y el botón, "Quitar la línea N".
  - El producto y la cantidad llevan `required`.
  - Una línea agregada después de un intento fallido no muestra errores hasta el envío siguiente.

- [ ] **Paso 4: Verificar en el navegador**

| Prueba | Esperado |
|---|---|
| Árbol de accesibilidad de Nueva venta con tres líneas | Nombres distintos y `required` en cada control |
| Pasar de página y de período | La región `#nx-announcer` cambia de texto |
| Agregar una línea después de un intento fallido | La línea nueva aparece sin error |

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `fix: anunciar cambios y nombrar los controles de cada línea`.

### Task 9: Orden, unidades y mensajes

**Archivos:**

- Modificar: `src/domain/list.ts`, `src/domain/list.test.ts`, `src/domain/validation/product.ts`, `src/domain/validation/product.test.ts`, `src/ui/format.ts`, `src/ui/format.test.ts`, `src/views/dashboard.ts`, `src/views/reports.ts`, `src/views/product-columns.ts`, `src/views/new-sale.ts`, `src/services/sales.test.ts`

**Interfaces:**

- Produce en `ui/format.ts`:

```ts
/** "1 unidad", "9.999 unidades". Se mueve desde views/reports.ts. */
function formatUnits(count: number): string;
/** Texto del umbral: "Sin stock", "1 unidad o menos", "1.000 unidades o menos". */
function lowStockLabel(threshold: number): string;
```

- [ ] **Paso 1: Escribir los tests que fallan**

| Caso | Esperado |
|---|---|
| `sortItems` con "Switch de 24" y "Switch de 8", ascendente | "Switch de 8" primero |
| `sortItems` por empresa con vacías, en los dos sentidos | Las vacías al final |
| Precio `''` | `Ingresá el precio.` |
| Precio `'abc'` o `'1.234,56'` | `Ingresá solo números, con coma o punto para los decimales. Por ejemplo, 1234,56.` |
| Precio `'12,345'` o `'1.234'` | `Usá hasta 2 decimales, sin separador de miles.` |
| Precio `'0'` | `El precio tiene que ser mayor que 0.` |
| Precio `'100000000'` | `El precio máximo es 99.999.999,99.` |
| `formatUnits(1)` y `formatUnits(9999)` | `1 unidad` y `9.999 unidades` |
| `lowStockLabel(0)`, `(1)`, `(5)` y `(1000)` | `Sin stock`, `1 unidad o menos`, `5 unidades o menos` y `1.000 unidades o menos` |
| El filtro Hasta del historial, con una venta del día elegido a las 23:59 y otra del día siguiente a las 00:00 | Incluye la primera y excluye la segunda |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan los de orden, precio y formatos. El de Hasta puede pasar de entrada, porque el filtro ya usa `endOfDay`. En ese caso, se lo rompe a propósito, cambiando `endOfDay` por la fecha sin hora, para ver que falla, y se lo deja como protección.

- [ ] **Paso 3: Implementar**

- **Orden:** `compareKeys` usa `numeric: true`, y `sortItems` deja los textos vacíos al final en los dos sentidos.
- **Dashboard y Productos:** el umbral usa `lowStockLabel`. Con umbral 0, el estado vacío dice "Los productos sin stock aparecen en esta lista."
- **Stock:** la tabla de productos y Nueva venta lo muestran con `formatNumber`.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `fix: ordenar números y vacíos, y detallar los mensajes de precio`.

### Task 10: Cobertura exigida y revisión completa

**Archivos:**

- Modificar: `vite.config.ts` y este plan, que suma al final la sección "Decisiones tomadas al ejecutar el plan"

- [ ] **Paso 1: Exigir la cobertura**

El diseño pide al menos 80 % de líneas en `domain`, `services` y `data` desde el cierre de esta etapa. Se agregan umbrales por carpeta en `coverage.thresholds`, con la sintaxis comprobada antes en la documentación de Vitest 5.1. Para ver el rojo, se sube un umbral a 100 y `npm run test:coverage` tiene que fallar. Después se vuelve a 80 y tiene que pasar.

- [ ] **Paso 2: Revisión completa en el navegador**

| Prueba | Esperado |
|---|---|
| Cada pantalla en 320, 375, 768, 992, 1280 y 1920 px, con los dos acentos y las dos densidades | Sin desborde; capturas revisadas |
| Recarga completa sin caché en cada ruta | Consola sin errores ni avisos de la CSP |
| Recorrido con teclado de Configuración, Clientes, Nueva venta y Reportes | Todo se alcanza, el foco se ve siempre y Esc cierra los modales |
| Contraste de cada color nuevo | AA, con el valor medido |

- [ ] **Paso 3: Mutaciones**

Romper a mano cada condición de `hasChanges`, `isDemoOutdated`, `hasCompletedSales`, `tickIndices`, `createAll`, `lowStockLabel`, `formatInitials` y el orden de `sortItems`. Cada mutación tiene que hacer fallar algún test. Los mutantes equivalentes se explican.

- [ ] **Paso 4: Capturas para la aprobación visual**

`configuracion-1280`, `configuracion-375`, `dashboard-acento-azul-1280`, `clientes-compacta-1280` y `dashboard-datos-viejos-1280`, en `.playwright-mcp/capturas/`.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensajes: `chore: exigir la cobertura mínima` y, para las decisiones, `docs: registrar las decisiones de Configuración y pulido`.

## Decisiones tomadas al ejecutar el plan

Registradas para que el plan describa lo que se construyó.

**Configuración**

- El control segmentado suma `visibleLegend` y su HTML pasa a `<fieldset class="nx-segmented-group">` con la leyenda y una caja `nx-segmented` adentro. En Configuración, densidad y acento necesitaban una etiqueta visible, y una leyenda visible dentro de la caja con borde se dibujaba mal.
- "No había cambios para guardar." usa el aviso de éxito: no es un error ni pide atención.
- Después de guardar, cada campo muestra el valor guardado: sin espacios de más, el email en minúsculas y el IVA con coma.
- `router.refresh()` lleva el foco al título si el elemento que lo tenía desapareció. Restaurar los datos se hace siempre que se confirme, aunque la persona haya salido de la pantalla mientras se cerraba el diálogo.
- En el Dashboard, el botón "Restaurar datos demo" del aviso es secundario: la confirmación ya advierte que se reemplazan los datos.
- Por debajo de 576 px, el botón del menú de usuario tiene menos relleno: con 320 px, "Configuración" quedaba cortado 1 px aun sin el nombre visible.

**Acento**

- La sombra de foco de la X de cerrar (`.btn-close`), que Bootstrap compila en violeta, sigue al acento. Los checkbox y el control deslizante de Bootstrap también salen en violeta, pero la app no los usa.
- Que el acento violeta no cambió se comprobó compilando los estilos de `main` y de esta rama: el CSS solo suma reglas nuevas.

**Gráficos**

- El eje de "12 meses" admite hasta 12 etiquetas si hay lugar (`maxDateTicks`). Con el máximo de 6, enero nunca tenía etiqueta y el año agregado no se veía. En 320 px enero puede seguir sin etiqueta: el tooltip y "Ver los datos" tienen la fecha completa.
- `mountChart` devuelve un objeto con `destroy()`, el mismo tipo que usa `createAll`.

**Formularios, foco y nombres**

- Por debajo de 360 px, una opción del control segmentado puede partir su texto en dos líneas: con solo menos relleno, "12 meses" seguía desbordando 1 px.
- Tras un borrado fallido, Clientes y Productos devuelven el foco al botón "Eliminar" de la fila. El modal ya lo hacía, pero la tabla se volvía a dibujar después y el foco quedaba en `body`.
- Reportes también decide el estado vacío con `hasCompletedSales`, para que el criterio sea uno solo.
- Los nombres de cada línea de venta salen de `lineControlNames`. La etiqueta visible dice "Producto" y suma " de la línea N" oculto, así el nombre accesible incluye el texto visible.
- Un precio bien escrito pero demasiado largo para un número exacto dice "El precio máximo es 99.999.999,99.".
- En Productos el umbral no aparece escrito, así que `lowStockLabel` se usa solo en el Dashboard.

**Pantallas táctiles**

- El script de medidas corrió en 375, 820 y 1024 px: los botones de orden de 20 px solo existen desde 768 px. También corrigió "Ver productos" del Dashboard y el ancho de "Ver detalle" entre 768 y 1199 px.
- El menú lateral no necesitó código: Bootstrap ya lo cierra con Esc y lo limpia al pasar a 992 px.
- La minificación saca el respaldo `100vh`, porque todos los navegadores para los que se compila entienden `100dvh`. El respaldo queda en el SCSS.

**Comprobaciones**

- Cobertura de líneas: 100 % en `domain` y `data`, 99,24 % en `services`. Con un umbral de 100 en `services`, `npm run test:coverage` falla.
- Mutaciones: 26 condiciones rotas a mano. Dos sobreviven y son equivalentes: con tantos puntos como marcas, las dos ramas de `tickIndices` dan el mismo resultado, y el umbral nunca es negativo. La ronda encontró un caso sin test (un gráfico de menos de 128 px se quedaba sin fechas) y un filtro que no hacía nada en `formatInitials`.
- Contraste de los colores nuevos: el aviso de datos viejos da 12,97:1, el avatar azul 6,91:1 y el violeta 5,57:1, y el segmentado elegido en azul 7,73:1.

**Revisión independiente**

- No encontró problemas críticos ni importantes, y verificó por su cuenta los cinco puntos del foco de revisión en el build, con la CSP activa.
- Tres comentarios afirmaban algo falso y se corrigieron. El de `applyAppearance` decía que la CSP no permite escribir estilos desde JavaScript, pero `style-src 'self'` bloquea solo el atributo `style` del HTML, no `element.style`. Otro todavía llamaba "violeta" al color de "Ver los datos". El último decía que el respaldo `100vh` queda en el build.
- El ícono de la pestaña (`favicon.svg`) sigue violeta con cualquier acento: es la marca, un archivo fijo fuera de la página.

**Detalles menores que quedan para más adelante**

- Los errores del umbral y del stock dicen "1000" y "999999", sin separador de miles.
- El perfil acepta un nombre hecho solo de caracteres invisibles (como U+200B), y un carácter de control al principio pasa a ser la primera inicial.
- Si alguien confirma "Restaurar" y vuelve atrás durante el cierre del diálogo, los datos se restauran pero la pantalla anterior no se vuelve a dibujar.
- Clientes y Productos, al guardar sin cambios, siguen diciendo "Cambios guardados.", aunque ya no escriben nada.
- "Quitar la línea N" no dice qué producto quita; podría ser "Quitar la línea 2 (Switch de 8)".
- `lineControlNames` devuelve `product` y `quantity`, que la vista no usa, y su test no cubre el nombre que se arma de verdad.
- Un test de `settings-form` usa `%d` en el nombre y muestra 10.5 como "10".
