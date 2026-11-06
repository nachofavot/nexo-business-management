# Etapa 4 (Productos): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar funcionando el módulo Productos (crear, editar, eliminar, buscar, filtrar, ordenar y paginar) con los componentes de la Etapa 3.

**Arquitectura:** igual que Clientes. La vista arma la pantalla y solo modifica datos a través de `services`. El servicio valida con `domain` y guarda con `data`. Las piezas compartidas de la tabla se sacan de `customers.ts`. El armado de cada vista se repite a propósito: son dos casos, y Ventas tiene otra forma, así que un controlador genérico todavía no se justifica.

**Stack:** TypeScript, Bootstrap 5.3.8 parcial, SCSS y Vitest. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 5, 6, 8, 9 y 11.

## Restricciones globales

- La dirección visual aprobada no se cambia: mismos tokens, componentes `nx-*` y dos acentos con dos significados.
- Bootstrap no incluye `btn`, `card`, `nav`, `badge`, `table` ni las utilidades `d-*` y `mt-*`. Se usan clases `nx-`, y los estilos nuevos van en `src/styles`.
- Las vistas solo leen con `database.read()` o `services`, y solo modifican con `services`.
- Todo contenido dinámico pasa por `html`, con los atributos entre comillas y sin atributos `style`.
- Los modales reciben la señal de la vista, para cerrarse al navegar.
- Los errores esperables se devuelven con `Result`.
- Sin `any` y sin dependencias nuevas.
- Se trabaja en la rama `etapa-4-productos`.
- Cada commit termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Los títulos de las tareas usan `### Task N:`, porque los scripts de ejecución los necesitan.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` terminan con código 0. Si `format:check` falla, se ejecuta `npm run format`.

**Medición de desborde:** siempre `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, nunca con `innerWidth`, y con nombres largos sin espacios. Dentro de un modal se compara el rectángulo del texto con el de `.modal-content`.

**Entrada rápida:** lo que ocurre durante una animación se prueba con mouse y teclado reales y tiempos fijos, sin `.click()` por código ni esperas hasta que termine de abrirse.

**Fuera de alcance:** gestión de categorías (el diseño la excluye), conservar los filtros al volver a la pantalla (el diseño descarta los query strings) y los detalles menores que dejó la Etapa 3. Entre ellos, guardar sin cambios sigue registrando actividad, igual que en Clientes.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Editar sin cambiar nada:** abrir un producto y guardarlo no da error ni modifica el precio, que se precarga como `1234,56` (Task 3 y Task 4).
2. **Guardar un producto que deja de cumplir el filtro:** con "Solo stock bajo" activo, subir el stock a 50 no hace desaparecer la fila: se quitan los filtros y el producto queda a la vista (Task 2 y Task 4).
3. **Umbral y bordes:** un stock igual al umbral es "Stock bajo"; 0 siempre es "Sin stock", también con umbral 0; etiqueta y filtro usan el umbral configurado, no un 5 fijo (Task 2 y Task 3).
4. **Precio escrito como lo escribiría una persona:** `1.500`, `1.234,56` y `$ 1500` dan error sin guardar otro importe; `1500,5` y `1500.50` guardan $ 1.500,50 (Task 2 y Task 4).
5. **Datos al límite en pantallas medianas:** con un nombre de 80 caracteres sin espacios, un SKU de 20, $ 99.999.999,99 y stock con etiqueta, la tabla no desborda en 768 ni en 992 px, donde hay menos lugar (Task 5).

---

### Task 1: Piezas compartidas de la tabla

**Archivos:**

- Modificar: `src/ui/components/data-table.ts`, `src/views/customers.ts`
- Test: `src/ui/components/data-table.test.ts`

**Interfaces:**

- Consume: `Column<T>`, `icon`, `html`.
- Produce en `data-table.ts`:

```ts
/** Sirve para cualquier fila con id y nombre: Clientes y Productos. */
function actionsColumn<T extends { id: string; name: string }>(): Column<T>;

/** Después de redibujar la tabla, devuelven el foco al control que se usó. */
function focusSortButton(region: HTMLElement, key: string): void;
function focusPageButton(region: HTMLElement, label: string): void;
```

- [ ] **Paso 1: Escribir los tests que fallan**

Con `dataTable` y las columnas `[actionsColumn<Row>()]`, donde `Row` tiene `id` y `name`:

| Fila | Esperado |
|---|---|
| `{ id: 'a1', name: 'Ana' }` | Contiene `data-edit="a1"`, `data-delete="a1"`, `aria-label="Editar Ana"` y `aria-label="Eliminar Ana"` |
| `{ id: 'a1', name: 'Ana' }` | Contiene `class="nx-table__actions"` y no contiene `data-sort="actions"` |
| `{ id: 'a1', name: '"><img src=x>' }` | No contiene `<img` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `actionsColumn` no existe.

- [ ] **Paso 3: Implementar y usar las piezas en `customers.ts`**

- `actionsColumn` usa la misma columna y los mismos botones que hoy tiene `customers.ts`.
- `focusSortButton` y `focusPageButton` reemplazan lo que hoy hacen `changeSort` y `changePage`.
- `focusPageButton` busca entre `[data-page]:not(:disabled)` el botón con esa `aria-label` y, si no está, enfoca el primero. Así deja de armar un selector con el texto.

- [ ] **Paso 4: Comprobar que Clientes sigue igual**

En `npm run dev`, en `/clientes`: ordenar deja el foco en el botón de esa columna, y en la última página el foco pasa a "Página anterior" cuando "Página siguiente" queda deshabilitado. Editar y Eliminar siguen funcionando.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `refactor: compartir acciones y foco de la tabla`.

### Task 2: Servicio de productos

**Archivos:**

- Crear: `src/services/products.ts`
- Modificar: `src/services/index.ts`
- Test: `src/services/products.test.ts`

**Interfaces:**

- Consume: `ServiceDependencies`, `ServiceFailure`, `withActivity`, `validateProduct`, `isLowStock`, `searchItems`, `sortItems`, `paginate`.
- Produce en `products.ts`:

```ts
type ProductSortKey = 'name' | 'sku' | 'category' | 'priceCents' | 'stock';
type ProductFailure = ServiceFailure<keyof ProductInput>;

interface ProductQuery {
  search: string;
  category: ProductCategory | null;
  lowStockOnly: boolean;
  sortKey: ProductSortKey;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

interface ProductsService {
  query(options: ProductQuery): Page<Product>;
  pageOf(id: string, options: Omit<ProductQuery, 'page'>): number | null;
  find(id: string): Product | null;
  validate(input: ProductInput, currentId?: string): FieldErrors<keyof ProductInput>;
  create(input: ProductInput): Result<Product, ProductFailure>;
  update(id: string, input: ProductInput): Result<Product, ProductFailure>;
  remove(id: string): Result<Product, ProductFailure>;
}

function createProductsService(dependencies: ServiceDependencies): ProductsService;
```

- Produce en `index.ts`: `Services` suma `products: ProductsService`.

- [ ] **Paso 1: Escribir los tests de creación, edición y borrado**

Con el mismo `setup()` de `customers.test.ts`, sumándole `products` y `settings`. La entrada válida es `{ name: ' Monitor ', sku: 'mon-1', category: 'Periféricos', price: '1234,56', stock: '7' }`.

| Llamada | Esperado |
|---|---|
| `create(válida)` | Producto `{ id: 'id-1', name: 'Monitor', sku: 'MON-1', category: 'Periféricos', priceCents: 123456, stock: 7, createdAt: NOW_ISO, updatedAt: NOW_ISO }`, primero en la lista; actividad `product` con "Producto Monitor creado" |
| `create` con precio `1500,5` y con `1500.50` | `priceCents: 150050` |
| `create` con precio `1.500`, `1.234,56`, `$ 1500` y `0` | `kind: 'validation'` con error en `price`, sin guardar nada |
| `create` con `mon-1` si existe `MON-1` | `kind: 'validation'` con error en `sku`, sin guardar nada |
| `update` con otros datos | Conserva `id` y `createdAt`, `updatedAt` es `NOW_ISO`; actividad "Producto Monitor actualizado" |
| `update` conservando su propio SKU | `ok: true` |
| `update` con el SKU de otro producto | `kind: 'validation'` con error en `sku` |
| `update` y `remove` con un id inexistente | `kind: 'not-found'` |
| `remove` | Lo quita, `sales` queda igual y hay actividad "Producto Monitor eliminado" |
| `create`, `update` y `remove` con el almacenamiento lleno | `kind: 'storage'` y `database.read()` sin cambios |
| `find` | Devuelve el producto, o `null` si no existe |
| `validate` con su propio SKU y `currentId` | `{}` |

- [ ] **Paso 2: Escribir los tests de búsqueda, filtros y orden**

Con cuatro productos: Notebook 14 (`NB-14`, Computación, 900 centavos, stock 12), Cámara web (`CAM-1`, Periféricos, 10000, stock 5), Router (`ROU-1`, Redes, 5000, stock 6) y NAS (`NAS-2`, Computación, 50000, stock 0). Por defecto: sin búsqueda ni filtros, por nombre ascendente y umbral 5.

| Opciones | Esperado, en orden |
|---|---|
| Por defecto | Cámara, NAS, Notebook, Router |
| `search: 'camara'` | Cámara |
| `search: 'rou-1'` | Router |
| `search: 'Redes'` | Ninguno: no se busca por categoría |
| `category: 'Computación'` | NAS, Notebook |
| `lowStockOnly: true` | Cámara, NAS |
| `lowStockOnly: true` con umbral 6 | Cámara, NAS, Router |
| `lowStockOnly: true` con umbral 0 | NAS |
| `category: 'Computación'` y `lowStockOnly: true` | NAS |
| `search: 'notebook'`, `category: 'Computación'` y `lowStockOnly: true` | Ninguno: se aplican los tres a la vez |
| `sortKey: 'priceCents'` | Notebook, Router, Cámara, NAS: orden numérico |
| `sortKey: 'stock'`, `direction: 'desc'` | Notebook, Router, Cámara, NAS |
| `sortKey: 'sku'` | Cámara, NAS, Notebook, Router |
| `sortKey: 'category'` | Notebook y NAS antes que Cámara, y Router al final |
| `pageSize: 2`, `page: 2` | Notebook y Router, con `totalItems: 4` y `pageCount: 2` |
| `pageOf` de Router con `pageSize: 2` | `2` |
| `pageOf` de Router con `category: 'Computación'` | `null` |
| `pageOf` de un id inexistente | `null` |

- [ ] **Paso 3: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `products.ts` no existe.

- [ ] **Paso 4: Implementar el servicio y sumarlo a `createServices`**

Misma estructura que `customers.ts`. Primero aplica categoría y stock bajo, después la búsqueda por nombre y SKU, y por último el orden. Lee el umbral de `settings.preferences.lowStockThreshold`.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar servicio de productos`.

### Task 3: Formulario y columnas de productos

**Archivos:**

- Crear: `src/views/product-form.ts`, `src/views/product-columns.ts`
- Modificar: `src/domain/money.ts`
- Test: `src/domain/money.test.ts`, `src/views/product-form.test.ts`, `src/views/product-columns.test.ts`

**Interfaces:**

- Consume: `parseMoneyToCents`, `formatMoney`, `isLowStock`, `isOutOfStock`, `PRODUCT_CATEGORIES`, `actionsColumn`, `FieldDefinition`.
- Produce:

```ts
// domain/money.ts: el texto que acepta parseMoneyToCents, sin símbolo ni separador de miles.
function formatCentsForInput(cents: number): string;

// views/product-form.ts
const PRODUCT_FIELDS: readonly FieldDefinition<keyof ProductInput>[];
function toProductInput(product: Product | null): ProductInput;

// views/product-columns.ts
function productColumns(options: {
  currency: Currency;
  lowStockThreshold: number;
}): readonly Column<Product>[];
```

- [ ] **Paso 1: Escribir los tests que fallan**

`formatCentsForInput`:

| Centavos | Texto | Y además |
|---|---|---|
| `123456` | `1234,56` | `parseMoneyToCents` devuelve `123456` |
| `100` | `1,00` | Devuelve `100` |
| `5` | `0,05` | Devuelve `5` |
| `1999` | `19,99` | Devuelve `1999` |
| `9_999_999_999` | `99999999,99` | Devuelve `9_999_999_999` |

`product-form.test.ts`:

| Caso | Esperado |
|---|---|
| `toProductInput(null)` | Todos los campos vacíos |
| `toProductInput` con `makeProduct({ priceCents: 123456, stock: 0 })` | `price: '1234,56'` y `stock: '0'` |
| `validateProduct(toProductInput(producto), [producto], producto.id)` | `ok: true` con el mismo `priceCents` y el mismo `stock` |
| `PRODUCT_FIELDS` | Los campos son `name`, `sku`, `category`, `price` y `stock`, en ese orden y todos obligatorios |
| Campo `category` | Opción vacía "Elegí una categoría" y una opción por cada una de `PRODUCT_CATEGORIES` |
| Campos `price` y `stock` | `inputMode` es `decimal` y `numeric` |

`product-columns.test.ts`, dibujando una fila con `dataTable`:

| Producto y umbral | Esperado |
|---|---|
| Stock 0, umbral 5 | Contiene "Sin stock" y `nx-tag--danger`; no contiene "Stock bajo" |
| Stock 0, umbral 0 | Contiene "Sin stock" |
| Stock 5, umbral 5 | Contiene "Stock bajo" y `nx-tag--warning` |
| Stock 6, umbral 5 | Sin `nx-tag` |
| Stock 10, umbral 10 | Contiene "Stock bajo" |
| `priceCents: 123456`, ARS | Contiene `1.234,56` |
| `priceCents: 123456`, USD | Contiene `formatMoney(123456, 'USD')` |
| Cualquiera | Tiene `data-sort` en `name`, `sku`, `category`, `priceCents` y `stock`, y no en `actions` |
| Nombre `"><img src=x>` | No contiene `<img` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque esas funciones no existen.

- [ ] **Paso 3: Implementar**

- Columnas: Nombre, SKU, Categoría, Precio, Stock y Acciones. Precio y Stock son numéricas.
- SKU, Categoría, Precio y Stock llevan `nx-table__nowrap`: si no, un nombre largo en otra fila los partiría, y es Nombre quien debe ceder lugar.
- Stock muestra la etiqueta y después el número, dentro de `<span class="nx-table__tagged">`. Con el número a la derecha, las cifras quedan alineadas aunque solo algunas filas tengan etiqueta.
- "Sin stock" tiene prioridad sobre "Stock bajo". Sin problemas de stock no hay etiqueta: "Disponible" en casi todas las filas sería ruido y el diseño no lo pide.
- Los campos de texto llevan `autocomplete: 'off'`, como en Clientes.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: agregar formulario y columnas de productos`.

### Task 4: Vista de productos

**Archivos:**

- Crear: `src/views/products.ts`
- Modificar: `src/main.ts`, `src/styles/components/_form.scss`, `src/styles/components/_toolbar.scss`, `src/styles/components/_button.scss`, `src/styles/components/_table.scss`

**Interfaces:**

- Consume: todo lo anterior, más `openFormModal`, `confirmDialog`, `showToast`, `emptyState`, `dataTable`, `nextSort`, `storageFailureMessage`.
- Produce: `productsView: View`, que reemplaza a `createUpcomingView('Productos', 4)`.

**Comportamiento**, igual que `customers.ts` salvo lo que se indica:

- **Barra:** buscador ("Buscar por nombre o SKU"), selector de categoría (etiqueta oculta "Filtrar por categoría", primera opción "Todas las categorías"), botón "Solo stock bajo" con `aria-pressed` y "Nuevo producto". Cambiar un filtro vuelve a la página 1 y no redibuja la barra, para no perder el foco.
- **Tabla:** las columnas se crean una vez con la moneda y el umbral de `database.read().settings.preferences`. Orden inicial por nombre. Estado `role="status"` con "1 producto" o "N productos".
- **Botón "Solo stock bajo":** lleva siempre `icon('success')`, y el SCSS lo oculta si `aria-pressed` es `false`. Activo, además, tiene texto y borde `--nx-violet-300`. Así el estado no depende solo del color.
- **Al guardar:** lleva la tabla hasta el producto con `pageOf`. Si los filtros o la búsqueda lo ocultan, los limpia, actualiza los controles y vuelve a calcular.
- **Estados vacíos:** sin productos, "Todavía no hay productos" y "Agregá el primero con Nuevo producto." Con filtros y sin resultados, "Sin resultados", "Probá con otra búsqueda o quitá los filtros." y un botón "Limpiar filtros" (`data-action="clear-filters"`) que restablece los tres controles y lleva el foco al buscador.
- **Textos:** "Nuevo producto" y "Crear producto"; "Editar producto" y "Guardar cambios". Avisos: "Producto creado.", "Cambios guardados.", "Producto eliminado." y "Este producto ya no existe." Confirmación: título y botón "Eliminar producto", mensaje `${nombre} se quita de la lista. Las ventas ya registradas lo conservan.`
- **Estilos:**
  - En `_form.scss`, `background-image: none` queda solo para `.form-control`. En `.form-select.is-invalid` se usa `--bs-form-select-bg-icon: none`: conserva la flecha y quita el ícono de error.
  - En `_toolbar.scss`, se agregan `.nx-toolbar__filters` y `.nx-toolbar__select`.
  - En `_table.scss`, `.nx-table__tagged` es `inline-flex`, con `align-items: center` y `gap: 0.5rem`.

- [ ] **Paso 1: Implementar la vista y sus estilos, y conectarla en `main.ts`**

- [ ] **Paso 2: Comprobar en `npm run dev`**

Con los datos demo: 32 productos, 8 con stock de 5 o menos, 2 de ellos sin stock.

| Acción | Esperado |
|---|---|
| Abrir `/productos` | "32 productos", "Página 1 de 4", por nombre y con etiquetas |
| Buscar `mon-` | 3 filas |
| Buscar `camara` | "Cámara web 1080p", sin perder el foco |
| Buscar `Redes` | "Sin resultados"; "Limpiar filtros" restablece y deja el foco en el buscador |
| Elegir Redes | 6 filas, con el foco en el selector |
| Activar "Solo stock bajo" | 8 filas: incluye "Cámara web 1080p" (stock 5), y el botón cambia de aspecto |
| Computación más "Solo stock bajo" | 3 filas |
| Ordenar por Precio | Primero "Funda para tablet"; al invertir, "Servidor de oficina" |
| Ordenar por Stock | Primero los de stock 0, con `aria-sort` actualizado |
| Crear sin categoría | Error junto al selector, que recibe el foco y conserva la flecha |
| Elegir una categoría después de ese error | El error desaparece sin enviar |
| Crear con precio `1.500` | Error en el precio y modal abierto |
| Crear con precio `1500.5` y SKU `abc-1` | Aparece a la vista con $ 1.500,50 y `ABC-1`, y hay actividad en el Dashboard |
| Crear con SKU `mon-24` | Error junto al SKU y modal abierto |
| Editar "Monitor 24 pulgadas Full HD" y guardar sin cambios | Sigue en $ 245.000,00 y el foco vuelve a su botón |
| Con "Solo stock bajo", subir un stock a 50 | Se quita el filtro, la fila queda a la vista y pierde la etiqueta |
| Bajar un stock a 3 | Aparece "Stock bajo", y el Dashboard suma uno al contador y a la lista |
| Eliminar y cancelar | Sigue en la lista |
| Eliminar y confirmar | "31 productos", y el historial en `nexo:db` y los ingresos del Dashboard no cambian |
| Borrar la única fila de la última página | Pasa a la página anterior |
| Recargar | Los cambios siguen |
| Simular almacenamiento lleno y guardar | Aviso de error, formulario abierto con lo escrito y lista sin cambios |
| Atrás con el modal abierto | Se cierra, sin guardar, y la app responde |

- [ ] **Paso 3: Comprobar y hacer commit**

Mensaje: `feat: agregar módulo de productos`.

### Task 5: Comprobación en producción

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**

- Produce: evidencia y capturas.

Con `npm run build` y `npm run preview`:

- [ ] **Paso 1: Comprobar la CSP**

Crear, editar y eliminar un producto. Esperado: sin errores en consola.

- [ ] **Paso 2: Probar texto malicioso**

Crear un producto con el nombre `"><img src=x onerror=alert(1)>`. Esperado: se ve como texto en la tabla, en el `aria-label`, en la confirmación, en el formulario al editar y en la actividad del Dashboard, sin `img` y sin alerta. Si queda con stock bajo, también en la lista del Dashboard.

- [ ] **Paso 3: Probar el responsive**

En 320, 375, 767, 768, 991, 992, 1280 y 1920 px, con los datos demo y con un producto de nombre de 80 caracteres sin espacios, SKU de 20, precio `99999999,99`, stock 999999 y otro con stock 3. Esperado: sin desborde, según la medición de **Restricciones globales**, y barra usable. En 320 px, los cinco botones de "Ordenar por" entran sin desbordar.

Con los datos demo, medir el ancho de la columna Nombre en 768 y 992 px. Si queda por debajo de 120 px, poner la etiqueta debajo del número y volver a medir.

- [ ] **Paso 4: Probar con teclado**

Solo con el teclado, en 1280 y 375 px: buscar, filtrar por categoría, activar "Solo stock bajo", ordenar, paginar, crear, corregir un error, editar y eliminar. Esperado: foco visible, orden lógico y foco recuperado después de cada acción.

- [ ] **Paso 5: Probar con entrada rápida**

| Acción, con mouse y teclado reales | Esperado |
|---|---|
| Confirmar a los 160, 200, 260 y 320 ms y después cancelar | No se borra |
| Confirmar con el diálogo abierto | Se borra |
| Doble Enter en "Nuevo producto" y en Eliminar | Un solo modal; con Esc el foco vuelve al botón |
| Guardar a los 170 ms de abrir | Sin aviso prematuro; un clic real después guarda y cierra |
| Doble Enter en "Crear producto" | Un solo producto, sin error de SKU duplicado |
| Clic en el fondo con datos escritos | El modal sigue abierto con lo escrito |
| Nombre de 80 caracteres en la confirmación, en 320, 375 y 1280 px | El texto queda dentro de `.modal-content` |

- [ ] **Paso 6: Sacar capturas**

Guardar en `.playwright-mcp/capturas/` la lista, la lista con filtros, el formulario con un error y la confirmación, en 1280 y 375 px. Sumar la lista en 992 px. Revisarlas con ojo crítico y corregir lo que no alcance el nivel aprobado.

### Task 6: Cierre de la etapa

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**

- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Ejecutar todas las comprobaciones**

Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0 y sin avisos de Sass.

- [ ] **Paso 2: Comprobar los tests con mutaciones**

En `services/products.ts`, `product-form.ts`, `product-columns.ts`, `actionsColumn` y `formatCentsForInput`, romper a propósito cada filtro, cada borde del umbral, cada registro de actividad, el escape y la prioridad de las etiquetas. Esperado: cada cambio hace fallar un test. Los cambios deben estar en un commit antes de empezar, porque los scripts restauran con `git checkout`.

- [ ] **Paso 3: Revisar e informar**

Pedir una revisión independiente contra este plan y el diseño, sin escribir en el proyecto salvo en `.playwright-mcp`, y corregir lo que corresponda.

El informe incluye la salida real de cada comprobación, los errores que aparecieron y cómo se resolvieron, y qué se construyó, con estos conceptos: reutilizar componentes y cuándo no abstraer, filtros combinados, restricciones en genéricos (`T extends`), `aria-pressed` y por qué el precio se guarda en centavos. Cierra con la respuesta a "¿qué pasa con las ventas si borrás un producto?" para una entrevista.

No se empieza la Etapa 5 sin la aprobación del autor.
