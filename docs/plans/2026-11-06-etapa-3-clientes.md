# Etapa 3 (Clientes): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar funcionando el módulo Clientes (crear, editar, eliminar, buscar, ordenar y paginar) y las piezas reutilizables que heredan Productos y Ventas: servicio, tabla, campo de formulario, modal de formulario y confirmación.

**Arquitectura:** la vista arma pantallas con componentes y solo modifica datos a través de `services`. El servicio valida con `domain` y guarda con `data`. Los componentes que devuelven HTML son funciones puras y se prueban sin navegador; lo que usa Bootstrap se comprueba en el navegador real.

**Stack:** TypeScript, Bootstrap 5.3.8 parcial, SCSS y Vitest. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 4, 6, 8, 9 y 11.

## Restricciones globales

- La dirección visual aprobada en la Etapa 2 no se cambia: mismos tokens, componentes `nx-*` y dos acentos con dos significados.
- Bootstrap no incluye `btn`, `card`, `nav`, `badge`, `table` ni las utilidades `d-*` y `mt-*`. Se usan clases `nx-`, y los estilos nuevos van en `src/styles`.
- Las vistas solo leen con `database.read()` o `services`, y solo modifican con `services`.
- Todo contenido dinámico pasa por `html`, y sin atributos `style`.
- El escape no protege atributos sin comillas ni `href` armados con datos: los atributos siempre van entre comillas y no se arman enlaces con datos.
- Los modales reciben la señal de la vista, para cerrarse al navegar.
- Los errores esperables se devuelven con `Result`.
- Sin `any` y sin dependencias nuevas.
- Se trabaja en la rama `etapa-3-clientes`.
- Cada commit termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Los títulos de las tareas usan `### Task N:`, porque los scripts de ejecución los necesitan.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` terminan con código 0. Si `format:check` falla, se ejecuta `npm run format`.

**Medición de desborde:** siempre `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, nunca con `innerWidth`, y con nombres largos sin espacios.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Doble envío:** dos clics seguidos o dos Enter en "Crear cliente" crean un solo cliente y no muestran un error de email duplicado (Task 4).
2. **Almacenamiento lleno al guardar:** el formulario queda abierto con lo escrito, aparece un error y la lista no cambia (Task 2 y Task 5).
3. **Borrar el último cliente de la última página:** la tabla pasa a la página anterior, sin quedar vacía (Task 5).
4. **Texto malicioso en cada contexto:** un nombre con `"><img src=x onerror=alert(1)>` se ve como texto en la tabla, el `aria-label` de sus botones, la confirmación, el aviso, la actividad del Dashboard y el formulario (Task 3 y Task 6).
5. **Navegar con un modal abierto:** con Atrás, el modal se cierra, la app sigue respondiendo y no se guarda nada (Task 4 y Task 5).

---

### Task 1: Ajustes que hereda este módulo

**Archivos:**
- Modificar: `src/ui/icons.ts`, `src/ui/components/empty-state.ts`, `src/app/router.ts`, `src/styles/components/_empty-state.scss`
- Test: `src/ui/icons.test.ts`, `src/ui/components/empty-state.test.ts`

**Interfaces:**
- Produce: `icon(name)` con `aria-hidden="true"` y `emptyState(title, description, action?: SafeHtml)`, sin encabezado propio.

- [ ] **Paso 1: Escribir los tests que fallan**

| Llamada | Esperado |
|---|---|
| `icon('menu').value` | Contiene `aria-hidden="true"` |
| `emptyState('Sin datos', 'Detalle').value` | Contiene ambos textos y no contiene `<h3` |
| `emptyState('<b>', '<i>').value` | Texto escapado: no contiene `<b>` ni `<i>` |
| `emptyState('T', 'D', html`<a href="/x">Ir</a>`).value` | Contiene el enlace sin escapar |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan los casos de `aria-hidden`, del encabezado y de `action`. El de escape ya pasa: comprueba que el cambio no lo rompa.

- [ ] **Paso 3: Implementar los cambios**

- El título del estado vacío pasa a ser `<p class="nx-empty__title">`: ya no salta de `h1` a `h3`.
- `handleLinkClick` deja pasar los enlaces con `target`, con `download` y los que difieren solo en el `hash`.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `fix: ocultar íconos a lectores de pantalla y respetar enlaces especiales`.

### Task 2: Servicio de clientes

**Archivos:**
- Crear: `src/services/types.ts`, `src/services/customers.ts`, `src/services/index.ts`
- Test: `src/services/customers.test.ts`

**Interfaces:**
- Consume: `DatabaseStore`, `validateCustomer`, `searchItems`, `sortItems`, `paginate`, `addActivity`, `ok`, `err`.
- Produce en `types.ts`:

```ts
interface ServiceDependencies {
  database: DatabaseStore;
  generateId(): string;
  now(): Date;
}

type ServiceFailure<K extends string> =
  | { kind: 'validation'; errors: FieldErrors<K> }
  | { kind: 'not-found' }
  | { kind: 'storage'; failure: StorageFailure };
```

- Produce en `customers.ts`:

```ts
type CustomerSortKey = 'name' | 'email' | 'company';
type CustomerFailure = ServiceFailure<keyof CustomerInput>;

interface CustomerQuery {
  search: string;
  sortKey: CustomerSortKey;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

interface CustomersService {
  query(options: CustomerQuery): Page<Customer>;
  find(id: string): Customer | null;
  validate(input: CustomerInput, currentId?: string): FieldErrors<keyof CustomerInput>;
  create(input: CustomerInput): Result<Customer, CustomerFailure>;
  update(id: string, input: CustomerInput): Result<Customer, CustomerFailure>;
  remove(id: string): Result<Customer, CustomerFailure>;
}

function createCustomersService(dependencies: ServiceDependencies): CustomersService;
```

- Produce en `index.ts`: `type Services = { customers: CustomersService }` y `createServices(dependencies: ServiceDependencies): Services`.

**Actividad, de tipo `customer`:** `Cliente <nombre> creado`, `Cliente <nombre> actualizado` y `Cliente <nombre> eliminado`.

- [ ] **Paso 1: Escribir los tests que fallan**

Los tests usan el almacenamiento en memoria real, una fecha fija y un `generateId` que da `id-1`, `id-2`, y así en adelante.

| Caso | Esperado |
|---|---|
| `create` válido | `ok`, con `id-1`, datos normalizados (email en minúsculas), `createdAt` y `updatedAt` iguales a `now`; queda en la base y guardado |
| `create` | Agrega la actividad `Cliente Ana Gómez creado` al principio, con su propio id |
| `create` inválido | `err({ kind: 'validation', errors })` con error en `name`; la base no cambia y no hay actividad nueva |
| `create` con email ya usado, en otras mayúsculas | Error de validación en `email` |
| `update` válido | Cambia los datos y `updatedAt`, conserva `id` y `createdAt`, y registra la actividad |
| `update` con su propio email | `ok` |
| `update` con el email de otro cliente | Error de validación en `email` |
| `update` de un id inexistente | `err({ kind: 'not-found' })` |
| `remove` | Devuelve el cliente, lo quita de la base y registra la actividad |
| `remove` de un id inexistente | `err({ kind: 'not-found' })` |
| `remove` de un cliente con ventas | Las ventas siguen iguales, con su nombre copiado |
| `find` | Devuelve el cliente, o `null` si no existe |
| `validate` con datos válidos | Sin errores, y la base y la actividad no cambian |
| `validate` con un email ya usado | Error en `email`; sin error si `currentId` es el de su dueño |
| `query` con búsqueda sin tilde | Encuentra por nombre, email y empresa |
| `query` con `company` descendente | Ordena por empresa de mayor a menor |
| `query` con 12 clientes, tamaño 10 y página 2 | 2 elementos, `pageCount: 2`, `totalItems: 12` |
| `query` con página 9 | Devuelve la última página |
| Almacenamiento lleno en `create`, `update` o `remove` | `err({ kind: 'storage', failure: 'quota-exceeded' })` y `read()` sin cambios |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./customers`.

- [ ] **Paso 3: Implementar los módulos**

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Mensaje: `feat: agregar servicio de clientes`.

### Task 3: Tabla y campo de formulario

**Archivos:**
- Crear: `src/ui/components/form-field.ts`, `src/ui/components/data-table.ts`, `src/styles/components/_pagination.scss`
- Modificar: `src/styles/components/_table.scss`, `src/styles/main.scss`
- Test: `src/ui/components/form-field.test.ts`, `src/ui/components/data-table.test.ts`

**Interfaces:**
- Consume: `html`, `SafeHtml`, `Page`, `SortDirection`, `icon`.
- Produce en `form-field.ts`:

```ts
interface FieldDefinition<K extends string> {
  name: K;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select';
  autocomplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  required?: boolean;
  options?: readonly { value: string; label: string }[];
}

function formField<K extends string>(
  field: FieldDefinition<K>,
  options: { idPrefix: string; value: string; error?: string },
): SafeHtml;
```

- Produce en `data-table.ts`:

```ts
interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  numeric?: boolean;
  cell(row: T): HtmlValue;
}

interface TableSort { key: string; direction: SortDirection }

function nextSort(current: TableSort, key: string): TableSort;

function dataTable<T>(options: {
  caption: string;
  columns: readonly Column<T>[];
  page: Page<T>;
  sort: TableSort;
  countLabel(total: number): string;
}): SafeHtml;
```

- [ ] **Paso 1: Escribir los tests que fallan**

`formField`:

| Caso | Esperado |
|---|---|
| Campo sin error | `label` con `for` igual al `id` del `input`; `value` y `name` presentes; sin `aria-invalid` |
| Campo con error | `is-invalid`, `aria-invalid="true"`, `aria-describedby` igual al `id` del mensaje, y el mensaje presente |
| `required` | Marca `required` en el `input` y el texto de la etiqueta no cambia |
| `type: 'select'` | Genera `select` con cada opción y `selected` solo en la del valor actual |
| Valor `"><img src=x onerror=alert(1)>` | No aparece `<img`, y sí `&lt;img` |

`dataTable` y `nextSort`:

| Caso | Esperado |
|---|---|
| Columna ordenada ascendente | `aria-sort="ascending"` en su `th` |
| Columna ordenada descendente | `aria-sort="descending"` |
| Otra columna ordenable | Tiene `button` con `data-sort`, sin `aria-sort` |
| Columna no ordenable | Sin `button` ni `data-sort` |
| Celdas | Cada `td` lleva `data-label` con la etiqueta de su columna |
| Columna numérica | `th` y `td` llevan `nx-table__number` |
| Dato con `<script>` en una celda | Sale escapado |
| Página 2 de 3 | "Página 2 de 3", y botones con `data-page="1"` y `data-page="3"` |
| Página 1 de 3 | El botón de la página anterior está `disabled` |
| Página 3 de 3 | El botón de la página siguiente está `disabled` |
| Una sola página | Sin botones de paginación, pero con el total |
| Total | Muestra el texto de `countLabel` en una región con `aria-live="polite"` |
| `caption` | Dentro de la tabla, con `visually-hidden` |
| `nextSort` con otra columna | Esa columna, ascendente |
| `nextSort` con la misma columna | Invierte el sentido en ambos casos |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existen los módulos.

- [ ] **Paso 3: Implementar los componentes y sus estilos**

En celdas, `overflow-wrap: anywhere`. En los encabezados ordenables, el botón hereda el texto de la tabla y muestra una flecha que indica el sentido, con su propio `focus-visible`. Las celdas de acciones no muestran etiqueta en móvil. Los botones de paginación usan `nx-btn nx-btn--secondary`.

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Mensaje: `feat: agregar tabla de datos y campo de formulario reutilizables`.

### Task 4: Modal de formulario y confirmación

**Archivos:**
- Crear: `src/ui/components/form-modal.ts`, `src/ui/components/confirm-dialog.ts`
- Modificar: `src/views/style-guide.ts`

**Interfaces:**
- Consume: `openModal`, `formField`, `FieldDefinition`, `html`, `setHtml`.
- Produce en `form-modal.ts`:

```ts
function openFormModal<K extends string>(
  options: {
    title: string;
    submitLabel: string;
    fields: readonly FieldDefinition<K>[];
    values: Readonly<Record<K, string>>;
    /** No guarda nada: se usa para revalidar al escribir, después del primer intento. */
    validate(values: Readonly<Record<K, string>>): FieldErrors<K>;
    /** ok cierra el modal; err muestra los errores y lo deja abierto. */
    onSubmit(values: Readonly<Record<K, string>>): Result<void, FieldErrors<K>>;
    onClosed?(saved: boolean): void;
  },
  signal: AbortSignal,
): void;
```

- Produce en `confirm-dialog.ts`:

```ts
function confirmDialog(
  options: { title: string; message: string; confirmLabel: string },
  signal: AbortSignal,
): Promise<boolean>;
```

**Comportamiento:**
- Ambos crean su modal al abrirse, lo agregan a `document.body` y lo eliminan al cerrarse, liberando la instancia de Bootstrap.
- **Formulario:** usa `novalidate`, porque la validación la hace `domain`. Al abrir, el foco va al primer campo. Al enviar con errores, se muestran junto a cada campo y el foco va al primero inválido, conservando lo escrito. Después del primer intento, cada cambio llama a `validate` y actualiza los mensajes y `aria-invalid` sin volver a dibujar los campos, para no perder el foco ni lo escrito.
- **Doble envío:** mientras el modal se cierra después de guardar, los envíos se ignoran.
- **Confirmación:** el foco inicial va a "Cancelar", para que un Enter no borre por accidente. Devuelve `true` solo con el botón de confirmar; Esc, cancelar, cerrar y navegar devuelven `false`.

- [ ] **Paso 1: Implementar `form-modal.ts` y `confirm-dialog.ts`**

- [ ] **Paso 2: Sumarlos a la guía de componentes**

Un botón abre un formulario de ejemplo, con `validate` y `onSubmit` que rechazan un nombre vacío y aceptan el resto. Otro abre una confirmación y muestra el resultado con un aviso. Reemplazan al modal estático de la guía.

- [ ] **Paso 3: Comprobar en `npm run dev`**

| Acción | Esperado |
|---|---|
| Abrir el formulario | Foco en el primer campo |
| Enviar con error | Mensaje junto al campo, foco en él, modal abierto y texto conservado |
| Corregir el campo con error | El mensaje desaparece al escribir, con el foco y el texto intactos |
| Volver a dejarlo inválido | El mensaje reaparece sin enviar |
| Enviar válido | Se cierra; `onClosed(true)`; el modal ya no está en el DOM |
| Dos envíos seguidos por código | `onSubmit` se llama una sola vez |
| Cancelar y Esc | `onClosed(false)` y el foco vuelve al botón que lo abrió |
| Confirmación con Enter recién abierta | Devuelve `false` |
| Confirmar | Devuelve `true` |
| Atrás con cualquiera abierto | Sin fondo oscuro, `body` limpio y el menú responde; la confirmación devuelve `false` |
| Abrir y cerrar 5 veces | Queda un solo elemento `.modal` como máximo y ninguno al final |

- [ ] **Paso 4: Comprobar y hacer commit**

Ejecutar las comprobaciones de la tarea. Mensaje: `feat: agregar modal de formulario y diálogo de confirmación`.

### Task 5: Vista de clientes

**Archivos:**
- Crear: `src/views/customers.ts`, `src/views/customer-form.ts`, `src/styles/views/_customers.scss`
- Modificar: `src/app/view.ts`, `src/app/router.ts`, `src/main.ts`, `src/styles/main.scss`

**Interfaces:**
- Consume: `Services`, `dataTable`, `nextSort`, `openFormModal`, `confirmDialog`, `showToast`, `emptyState`.
- Produce: `customersView: View`. `ViewContext` suma `services: Services`.

**Pantalla:**
- **Barra:** campo de búsqueda con etiqueta oculta, "Buscar por nombre, email o empresa", y el botón principal "Nuevo cliente".
- **Tabla:** Nombre, Email, Teléfono, Empresa y acciones. Ordenable por nombre, email y empresa. Orden inicial por nombre. Páginas de 10 filas.
- **Acciones de cada fila:** botones de ícono con `aria-label` "Editar <nombre>" y "Eliminar <nombre>".
- **Total:** "24 clientes" o "1 cliente".
- **Valores vacíos:** teléfono o empresa vacíos se muestran como "Sin datos", en texto secundario.

**Textos:**

| Acción | Modal | Botón | Aviso |
|---|---|---|---|
| Crear | Nuevo cliente | Crear cliente | Cliente creado. |
| Editar | Editar cliente | Guardar cambios | Cambios guardados. |
| Eliminar | Eliminar cliente | Eliminar cliente | Cliente eliminado. |

La confirmación dice: "<nombre> se quita de la lista. Sus ventas se conservan."

**Comportamiento:**
- **Búsqueda:** actualiza solo la región de la tabla, para no perder el foco del campo, y vuelve a la página 1.
- **Orden:** vuelve a la página 1 y mantiene el foco en el encabezado usado.
- **Paginación:** mantiene el foco en el botón usado, o en el otro si queda deshabilitado.
- **Estados vacíos:** sin clientes, "Todavía no hay clientes" e "Agregá el primero con Nuevo cliente." Sin resultados, "Sin resultados" y un botón "Limpiar búsqueda".
- **Errores:** `validation` muestra los errores del formulario; `storage` muestra el aviso de error "No se pudo guardar. El almacenamiento del navegador está lleno." o "No se pudo guardar." y deja el formulario abierto; `not-found` muestra "Este cliente ya no existe." y cierra.
- **Foco al terminar:** al crear, vuelve a "Nuevo cliente"; al editar, al botón Editar de esa fila, o al buscador si ya no está visible; al eliminar, al buscador.
- **Página:** la vista usa el número de página que devuelve `query`, para pasar a la anterior si se borró la última fila.

- [ ] **Paso 1: Sumar `services` a `ViewContext`, al router y a `main.ts`**

`main.ts` crea los servicios con `crypto.randomUUID()` y `new Date()`.

- [ ] **Paso 2: Implementar `customer-form.ts`**

Define los campos: nombre (obligatorio), email (obligatorio), teléfono y empresa, con su `autocomplete`, y traduce entre `Customer` y `CustomerInput`.

- [ ] **Paso 3: Implementar `customers.ts` y sus estilos**

- [ ] **Paso 4: Comprobar en `npm run dev`**

| Acción | Esperado |
|---|---|
| Crear con datos válidos | Aparece en la tabla, aviso y actividad en el Dashboard |
| Crear con email duplicado en otras mayúsculas | Error junto al campo y modal abierto |
| Editar | La fila cambia y el foco vuelve a su botón |
| Eliminar y cancelar | Sigue en la lista |
| Eliminar y confirmar | Se quita de la lista, y el historial en `nexo:db` conserva sus ventas |
| Borrar la única fila de la última página | Pasa a la página anterior |
| Buscar `garcia` con tilde en los datos, y una búsqueda sin resultados | Filtra sin perder el foco, y "Limpiar búsqueda" restaura |
| Ordenar por cada columna, en ambos sentidos | Orden correcto y `aria-sort` actualizado |
| Recargar | Los cambios siguen |
| Simular almacenamiento lleno reemplazando `localStorage.setItem` y guardar | Aviso de error, formulario abierto con lo escrito y lista sin cambios |
| Atrás con el modal abierto | Se cierra, sin guardar, y la app responde |

- [ ] **Paso 5: Comprobar y hacer commit**

Ejecutar las comprobaciones de la tarea. Mensaje: `feat: agregar módulo de clientes`.

### Task 6: Comprobación en producción

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**
- Produce: evidencia y capturas.

Con `npm run build` y `npm run preview`:

- [ ] **Paso 1: Comprobar la CSP**

Crear, editar y eliminar un cliente. Esperado: sin errores en consola.

- [ ] **Paso 2: Probar texto malicioso**

Crear un cliente con el nombre `"><img src=x onerror=alert(1)>` (cumple la regla de longitud). Esperado: se ve como texto en la tabla, en el `aria-label`, en la confirmación, en el aviso, en el formulario al editar y en la actividad del Dashboard. Sin `img` en esos lugares y sin alerta.

- [ ] **Paso 3: Probar el responsive**

En 320, 375, 768, 991, 992, 1280 y 1920 px, con la tabla llena, con un nombre de 80 caracteres sin espacios y un email de 120 caracteres. Esperado: sin desborde según la medición de **Restricciones globales**. Por debajo de 768 px, cada fila es un bloque con sus etiquetas.

- [ ] **Paso 4: Probar con teclado**

Solo con el teclado: buscar, ordenar, paginar, crear, corregir un error, editar y eliminar. Esperado: foco visible, orden lógico y foco recuperado después de cada acción.

- [ ] **Paso 5: Sacar capturas**

Guardar en `.playwright-mcp/capturas/` la lista, el formulario con un error y la confirmación, en 1280 y 375 px. Revisarlas con ojo crítico y corregir lo que no alcance el nivel aprobado.

### Task 7: Cierre de la etapa

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**
- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Ejecutar todas las comprobaciones**

Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0 y sin avisos de Sass.

- [ ] **Paso 2: Comprobar los tests con mutaciones**

En `services/customers.ts`, `form-field.ts` y `data-table.ts`, romper a propósito cada validación, cada registro de actividad, el escape y los atributos de accesibilidad. Esperado: cada cambio hace fallar un test.

- [ ] **Paso 3: Revisar e informar**

Pedir una revisión independiente contra este plan y el diseño, sin escribir en el proyecto salvo en `.playwright-mcp`, y corregir lo que corresponda.

El informe incluye la salida real de cada comprobación, los errores que aparecieron y cómo se resolvieron, y qué se construyó, con estos conceptos: capa de servicios, CRUD, tipos unión con `kind`, genéricos, componentes como funciones, delegación de eventos y gestión del foco. Cierra con la respuesta a "¿qué pasa si dos personas cargan el mismo email?" para una entrevista, incluida la limitación de LocalStorage.

No se empieza la Etapa 4 sin la aprobación del autor.
