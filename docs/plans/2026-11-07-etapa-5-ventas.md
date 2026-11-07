# Etapa 5 (Ventas): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar funcionando el registro de ventas con totales en vivo, el historial con búsqueda, filtros y páginas, y el detalle con anulación, con el stock siempre correcto.

**Arquitectura:** igual que Clientes y Productos. Las vistas leen con `database.read()` o `services` y solo modifican con `services`. El servicio valida y calcula con `domain` antes de escribir, y guarda venta, stock, número y actividad en una sola escritura. El historial reutiliza `dataTable` y su manejo del foco. Nueva venta es una pantalla propia, no un modal, porque tiene líneas que se agregan y se quitan. Sigue sin haber un controlador genérico de vistas: cada pantalla tiene otra forma.

**Stack:** TypeScript, Bootstrap 5.3.8 parcial, SCSS y Vitest. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 4 (flujo al registrar una venta), 5, 6, 8, 9 y 11.

## Restricciones globales

- La dirección visual aprobada no se cambia: mismos tokens, componentes `nx-*` y dos acentos con dos significados.
- Bootstrap no incluye `btn`, `card`, `nav`, `badge`, `table` ni las utilidades `d-*` y `mt-*`. Se usan clases `nx-`, y los estilos nuevos van en `src/styles`.
- Las vistas solo leen con `database.read()` o `services`, y solo modifican con `services`.
- Todo contenido dinámico pasa por `html`, con los atributos entre comillas y sin atributos `style`. Los `href` son fijos y nunca llevan datos del usuario.
- Los modales reciben la señal de la vista, para cerrarse al navegar. Los listeners de `shown.bs.modal` se registran después de `openModal`.
- Los errores esperables se devuelven con `Result`.
- Sin `any` y sin dependencias nuevas.
- Se trabaja en la rama `etapa-5-ventas`.
- Cada commit termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Los títulos de las tareas usan `### Task N:`, porque los scripts de ejecución los necesitan.

**Comprobación de cada tarea:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test` terminan con código 0. Si `format:check` falla, se ejecuta `npm run format`. En los comandos de varios pasos, cada comprobación lleva `|| exit 1`.

**Medición de desborde:** siempre `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, nunca con `innerWidth`, con nombres largos sin espacios y en todas las páginas de la tabla. Dentro de un modal se compara el rectángulo del texto con el de `.modal-content`. Las capturas se repiten después de cada corrección de estilos.

**Entrada rápida:** lo que ocurre durante una animación se prueba con mouse y teclado reales y tiempos fijos, sin `.click()` por código ni esperas hasta que termine de abrirse.

**Fuera de alcance:**

- Editar o borrar ventas: el diseño dice que no se eliminan, y la anulación conserva el historial.
- Ordenar el historial por columnas: el diseño pide las más recientes primero, y nada más.
- Avisar al salir de Nueva venta con datos escritos, buscar ventas por producto y ocultar en cada selector los productos ya elegidos: elegir dos veces el mismo producto se rechaza al registrar.
- Ventas de más de unas 75 líneas al precio y la cantidad máximos: la suma superaría `Number.MAX_SAFE_INTEGER` centavos, unos 90 billones de pesos. Con 32 productos demo no se alcanza.
- Conservar los filtros al volver a la pantalla y los detalles menores que dejaron las Etapas 3 y 4.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra.

1. **Fechas locales en el filtro:** con "Desde" en el 4 de noviembre, una venta del 3 a las 23:30 hora local no aparece, y con "Hasta" en el 5 entra una del 5 a las 23:59. Con `new Date('2026-11-04')`, que es UTC, en Argentina se correría tres horas (Task 1 y Task 2).
2. **Una venta que falla no deja rastros:** si una línea no tiene stock o el almacenamiento falla, no cambia nada: ni el stock de las otras líneas, ni el número siguiente, ni la actividad (Task 2).
3. **El resumen en vivo es lo que se guarda:** para una entrada válida, los importes que muestra Nueva venta son exactamente los de la venta registrada, con el descuento antes del IVA y las mitades hacia arriba, también con importes muy grandes (Task 1 y Task 2).
4. **Anular dos veces o con un producto borrado:** la segunda anulación se rechaza sin devolver stock otra vez, y anular una venta de un producto eliminado devuelve el stock solo de los que existen (Task 2 y Task 4).
5. **Rango de fechas invertido:** con "Desde" posterior a "Hasta", la tabla explica por qué no hay resultados en lugar de mostrar solo "Sin resultados" (Task 4).

---

### Task 1: Dominio para registrar y filtrar ventas

**Archivos:**

- Crear: `src/domain/dates.ts`
- Modificar: `src/domain/types.ts`, `src/domain/validation/sale.ts`, `src/domain/sales.ts`, `src/domain/money.ts`, `src/domain/reports.ts`
- Test: `src/domain/dates.test.ts`, `src/domain/validation/sale.test.ts`, `src/domain/sales.test.ts`, `src/domain/money.test.ts`

**Interfaces:**

- Consume: `parseIntegerInRange`, `calculateTotals`, `SaleTotals`.
- Produce:

```ts
// domain/types.ts: la pantalla necesita saber qué control de la línea marcar.
type SaleField = 'customerId' | 'lines' | 'discountPercent' | 'paymentMethod';
interface LineError {
  field: 'productId' | 'quantity';
  message: string;
}
type SaleErrors = FieldErrors<SaleField> & { lineErrors?: Readonly<Record<number, LineError>> };

// domain/validation/sale.ts
const MAX_SALE_QUANTITY = 9_999;

// domain/sales.ts
interface SalePreview {
  /** Una por cada línea de la entrada, en el mismo orden. */
  lines: readonly { availableStock: number | null; subtotalCents: number | null }[];
  totals: SaleTotals;
}
function previewSale(
  input: SaleInput,
  products: readonly Product[],
  taxPercent: number,
): SalePreview;

// domain/dates.ts
/** Lee el texto de <input type="date"> como medianoche local, o null si no es una fecha real. */
function parseDateInput(value: string): Date | null;
function endOfDay(date: Date): Date; // se mueve desde reports.ts, que pasa a importarla
```

- [ ] **Paso 1: Escribir los tests que fallan**

`validateSale`, con `p1` de stock 5, `p2` de stock 1 y `p3` de stock 0:

| Línea | `lineErrors[i]` esperado |
|---|---|
| Sin producto o con uno inexistente | `{ field: 'productId', message: 'Elegí un producto.' }` |
| `p1` repetido en la segunda línea | En la segunda: `{ field: 'productId', message: 'Este producto ya está en la venta.' }` |
| `p3` con cantidad `1` | `{ field: 'productId', message: 'Este producto no tiene stock.' }` |
| `p1` con `0`, `1,5`, `abc` y `10000` | `{ field: 'quantity', message: 'Ingresá una cantidad entera de 1 a 9.999.' }` |
| `p1` con `6` | `{ field: 'quantity', message: 'Solo hay 5 unidades disponibles.' }` |
| `p2` con `2` | `{ field: 'quantity', message: 'Solo hay 1 unidad disponible.' }` |
| `p3` con `abc` | El error de stock: se comprueba antes que la cantidad |
| Un producto con stock 9999 y cantidad `9999` | Sin error |

`previewSale`, con `p1` a 1000 centavos y stock 5, `p2` a 2500 y stock 10, e IVA 21:

| Entrada | `totals` esperado | `lines` esperado |
|---|---|---|
| Sin líneas, descuento `0` | Todo en 0 | `[]` |
| `p1 × 2`, descuento `0` | 2000, 0, 420, 2420 | `[{ availableStock: 5, subtotalCents: 2000 }]` |
| `p1 × 2` y `p2 × 1`, descuento `10` | 4500, 450, 851, 4901 | Subtotales 2000 y 2500 |
| `p1 × 2` y una línea sin producto con `3` | Subtotal 2000 | La segunda es `{ availableStock: null, subtotalCents: null }` |
| `p1` con `abc`, `0` y `10000` | Subtotal 0 | `{ availableStock: 5, subtotalCents: null }` |
| `p1 × 2` y `p1 × 3` | Subtotal 2000: la repetida no suma, igual que en la validación | La segunda tiene `subtotalCents: null` |
| `p1 × 9`, por encima del stock | Subtotal 9000: el stock lo controla la validación | `{ availableStock: 5, subtotalCents: 9000 }` |
| `p1 × 2` con descuento `abc` y con `150` | Descuento 0 | |
| `p1 × 2` con IVA 0 | IVA 0 y total 2000 | |

`percentOfCents`: `percentOfCents(35_371_200_965_850, 21)` es `7_427_952_202_829`. El valor exacto termina en ,5 y se redondea hacia arriba. Con decimales, `35_371_200_965_850 * 2100` supera `Number.MAX_SAFE_INTEGER` y daba `…828`. Los tests actuales deben seguir pasando.

`dates.test.ts`, con la zona horaria de los tests (`America/Argentina/Buenos_Aires`):

| Llamada | Esperado |
|---|---|
| `parseDateInput('2026-11-05')` | `toISOString()` es `2026-11-05T03:00:00.000Z` |
| `parseDateInput('2024-02-29')` | Una fecha: 2024 es bisiesto |
| `parseDateInput('2025-02-29')`, `'2026-02-30'`, `'2026-13-01'` | `null`, aunque `new Date(2026, 1, 30)` daría el 2 de marzo |
| `parseDateInput('')`, `'05/11/2026'`, `'2026-11-5'` | `null` |
| `endOfDay(parseDateInput('2026-11-05'))` | `2026-11-06T02:59:59.999Z` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan los mensajes y la forma de `lineErrors`, `previewSale` y `parseDateInput` no existen, y `percentOfCents` da `…828`.

- [ ] **Paso 3: Implementar**

- `percentOfCents` multiplica con `BigInt` y convierte el resultado con `Number`. El resultado siempre entra en un entero seguro, y la multiplicación intermedia ya no pierde precisión.
- `previewSale` cuenta una línea solo si su producto existe, no apareció antes y la cantidad es un entero de 1 a `MAX_SALE_QUANTITY`. Un descuento inválido cuenta como 0. Calcula con `calculateTotals`, la misma función que usa `buildSale`.
- `parseDateInput` acepta solo `AAAA-MM-DD`, arma la fecha con `new Date(año, mes - 1, día)` y la rechaza si el año, el mes o el día cambiaron.
- `reports.ts` importa `endOfDay` desde `dates.ts`, sin otros cambios.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: preparar el dominio para registrar y filtrar ventas`.

### Task 2: Servicio de ventas

**Archivos:**

- Crear: `src/services/sales.ts`
- Modificar: `src/services/index.ts`
- Test: `src/services/sales.test.ts`

**Interfaces:**

- Consume: `ServiceDependencies`, `withActivity`, `validateSale`, `decreaseStock`, `restoreStock`, `buildSale`, `cancelSale`, `formatSaleNumber`, `previewSale`, `parseDateInput`, `endOfDay`, `searchItems`, `sortItems`, `paginate`.
- Produce en `sales.ts`:

```ts
interface SaleQuery {
  search: string;
  /** null muestra todos los estados. */
  status: SaleStatus | null;
  /** Texto de <input type="date">; '' no pone límite. */
  from: string;
  to: string;
  page: number;
  pageSize: number;
}

// Cada operación declara solo lo que le puede pasar.
type RegisterSaleFailure =
  | { kind: 'validation'; errors: SaleErrors }
  | { kind: 'storage'; failure: StorageFailure };
type CancelSaleFailure =
  | { kind: 'not-found' }
  | { kind: 'already-cancelled' }
  | { kind: 'storage'; failure: StorageFailure };

interface SalesService {
  query(options: SaleQuery): Page<Sale>;
  pageOf(id: string, options: Omit<SaleQuery, 'page'>): number | null;
  find(id: string): Sale | null;
  validate(input: SaleInput): SaleErrors;
  preview(input: SaleInput): SalePreview;
  register(input: SaleInput): Result<Sale, RegisterSaleFailure>;
  cancel(id: string): Result<Sale, CancelSaleFailure>;
}

function createSalesService(dependencies: ServiceDependencies): SalesService;
```

- Produce en `index.ts`: `Services` suma `sales: SalesService`.

- [ ] **Paso 1: Escribir los tests de registro y anulación**

Con el `setup()` de `products.test.ts`, más la clienta Ana Gómez (`c1`), `p1` Monitor (`MON-1`, 1000 centavos, stock 5) y `p2` Teclado (`TEC-1`, 2500, stock 10), una venta existente número 7 y `nextSaleNumber: 8`. La entrada válida es `{ customerId: 'c1', lines: [{ productId: 'p1', quantity: '2' }, { productId: 'p2', quantity: '1' }], discountPercent: '10', paymentMethod: 'card' }`.

| Llamada | Esperado |
|---|---|
| `register(válida)` | Venta `id-1`, número 8, `customerName: 'Ana Gómez'`, ítems con nombre, SKU, categoría y precio copiados, totales 4500, 450, 851 y 4901, `taxPercent: 21`, `completed`, `createdAt: NOW_ISO` y `cancelledAt: null` |
| Lo mismo, en la base | La venta va primera en `sales`, `p1` queda con stock 3 y `p2` con 9, los dos con `updatedAt: NOW_ISO`, `nextSaleNumber: 9` y actividad `sale` con "Venta V-000008 registrada" |
| `preview(válida)` antes de registrar | `totals` igual a los totales de la venta registrada |
| Dos `register` seguidos | Números 8 y 9, el 9 primero |
| Con IVA 0 en la configuración | `taxPercent: 0` y `taxCents: 0` |
| `p2` con `11` en la segunda línea | `kind: 'validation'` con `lineErrors[1].field: 'quantity'`, y `database.read()` es el mismo objeto que antes: tampoco cambió el stock de `p1` |
| Cliente inexistente | `kind: 'validation'` con error en `customerId`, sin cambios |
| `register` con el almacenamiento lleno | `kind: 'storage'` con `quota-exceeded`, sin cambios: el número 8 no se gasta |
| `register` con otra falla de escritura | `kind: 'storage'` con `write-failed` |
| `cancel` de la venta 7, con `p1 × 2` | `cancelled`, `cancelledAt: NOW_ISO`, `p1` sube a 7 y hay actividad "Venta V-000007 anulada" |
| `cancel` de una venta con un ítem de un producto borrado y otro de `p1` | `ok: true`, `p1` sube y los productos siguen siendo dos |
| `cancel` dos veces | La segunda da `kind: 'already-cancelled'` y no devuelve stock otra vez |
| `cancel` de un id inexistente, con ventas guardadas | `kind: 'not-found'`, sin cambios |
| `cancel` con el almacenamiento lleno | `kind: 'storage'`; la venta sigue `completed` y el stock igual |
| Registrar y después borrar el cliente y los productos | `find(id)` devuelve la venta sin cambios |
| `validate(válida)` | `{}` |

- [ ] **Paso 2: Escribir los tests de búsqueda y filtros**

Guardadas desordenadas, para probar el orden:

| Venta | Cliente | Estado | `createdAt` | Hora local |
|---|---|---|---|---|
| 1 | Ana Gómez | completada | `2026-11-01T15:00:00.000Z` | 1 de noviembre, 12:00 |
| 2 | Bruno Díaz | anulada | `2026-11-04T02:30:00.000Z` | 3 de noviembre, 23:30 |
| 3 | Ana Gómez | completada | `2026-11-05T03:00:00.000Z` | 5 de noviembre, 00:00 |
| 12 | Carla Ruiz | completada | `2026-11-06T02:59:59.999Z` | 5 de noviembre, 23:59 |

| Opciones | Esperado, en orden |
|---|---|
| Sin búsqueda ni filtros | 12, 3, 2, 1: por número, de mayor a menor |
| `search: 'V-000003'` | 3 |
| `search: 'v-000001'` | 1 |
| `search: '12'` | 12 |
| `search: 'gomez'` | 3, 1 |
| `search: 'Monitor'` | Ninguna: no se busca por producto |
| `status: 'cancelled'` | 2 |
| `status: 'completed'` | 12, 3, 1 |
| `from: '2026-11-04'` | 12, 3: la 2 fue el 3 a las 23:30 hora local |
| `to: '2026-11-03'` | 2, 1 |
| `from` y `to` en `'2026-11-05'` | 12, 3: entran los dos bordes del día |
| `from: '2026-11-06'` | Ninguna |
| `from: '2026-11-05'` y `to: '2026-11-01'` | Ninguna |
| `from: '2026-02-30'` | Las cuatro: una fecha imposible no limita |
| `search: 'ana'`, `status: 'completed'` y `from: '2026-11-05'` | 3 |
| `pageSize: 2`, `page: 2` | 2 y 1, con `totalItems: 4` |
| `pageOf` de la 1 con `pageSize: 2` | `2` |
| `pageOf` de la 2 con `status: 'completed'` | `null` |

- [ ] **Paso 3: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque `sales.ts` no existe.

- [ ] **Paso 4: Implementar el servicio y sumarlo a `createServices`**

- **Registrar:** se lee la base una vez, y con esa lectura se ejecutan `validateSale`, `buildSale` y `decreaseStock`. Recién después se llama a `database.update`, porque `update` no puede devolver errores del dominio. Así, si algo falla, no se guarda nada. La venta se agrega al principio: el Dashboard y el acceso demo suponen que la primera es la más nueva. Si `decreaseStock` fallara después de validar con la misma lectura, se devuelve como error de validación de esa línea.
- **Anular:** `cancelSale` y `restoreStock` con las cantidades de la venta. Venta, stock y actividad se guardan juntos.
- **Listar:** primero el estado y las fechas, después la búsqueda en `[formatSaleNumber(number), customerName]` y al final el orden por `number` descendente. El número es único y se asigna en orden de registro; dos ventas pueden tener el mismo `createdAt`.

- [ ] **Paso 5: Comprobar y hacer commit**

Mensaje: `feat: agregar servicio de ventas`.

### Task 3: Columnas, detalle y formatos de ventas

**Archivos:**

- Crear: `src/views/sale-columns.ts`, `src/views/sale-detail.ts`
- Modificar: `src/ui/format.ts`, `src/ui/components/data-table.ts`, `src/styles/components/_table.scss`
- Test: `src/views/sale-columns.test.ts`, `src/views/sale-detail.test.ts`, `src/ui/format.test.ts`, `src/ui/components/data-table.test.ts`

**Interfaces:**

- Consume: `Column`, `dataTable`, `formatMoney`, `formatDateTime`, `formatSaleNumber`, `mountModal`, `openModal`, `hideModal`, `removeModal`.
- Produce:

```ts
// ui/format.ts
function formatPaymentMethod(method: PaymentMethod): string; // Efectivo, Tarjeta, Transferencia
function formatPercent(value: number): string; // 21 → "21 %", 10.5 → "10,5 %"

// views/sale-columns.ts
function saleColumns(options: { currency: Currency }): readonly Column<Sale>[];

// views/sale-detail.ts
/** Contenido completo del modal: encabezado, datos, líneas, totales y botones. */
function saleDetailContent(sale: Sale, options: { currency: Currency; titleId: string }): SafeHtml;
/** onClosed recibe 'cancel' si se pidió anular; no se llama si se salió de la vista. */
function openSaleDetail(
  sale: Sale,
  options: { currency: Currency; onClosed(action: 'cancel' | null): void },
  signal: AbortSignal,
): void;
```

- [ ] **Paso 1: Escribir los tests que fallan**

`format.test.ts`: `formatPaymentMethod` da "Efectivo", "Tarjeta" y "Transferencia". `formatPercent(21)`, `(10.5)`, `(0)` y `(100)` dan "21 %", "10,5 %", "0 %" y "100 %".

`data-table.test.ts`: sin columnas ordenables, la tabla tiene la clase `nx-table--no-sort`; con una ordenable, no la tiene.

`sale-columns.test.ts`, dibujando una fila con `dataTable`:

| Venta | Esperado |
|---|---|
| Número 123 | Contiene "V-000123" |
| `createdAt: '2026-11-05T17:30:00.000Z'` | Contiene "05/11/2026 14:30" |
| `paymentMethod: 'transfer'` | Contiene "Transferencia" |
| `totalCents: 123456`, ARS | Contiene "1.234,56" |
| Anulada | Contiene "Anulada" y `nx-table__void`; completada, ninguno de los dos |
| Cualquiera | Sin `data-sort`; contiene `data-detail="s1"` y `aria-label="Ver detalle de la venta V-000001"` |
| Cliente `"><img src=x>` | No contiene `<img` |

`sale-detail.test.ts`, con `saleDetailContent`:

| Venta | Esperado |
|---|---|
| Número 7 | Título "Venta V-000007" con el `titleId` recibido |
| Dos ítems | Nombre, SKU, cantidad, precio unitario y subtotal de cada uno; el subtotal es precio × cantidad |
| Descuento 10, IVA 21 | "Descuento (10 %)" con `formatMoney(-discountCents)`, "IVA (21 %)" y el total |
| Descuento 0 | "Descuento (0 %)" con `formatMoney(0)`, sin signo menos |
| IVA guardado 10,5 | "IVA (10,5 %)": se usa el de la venta, no el de la configuración actual |
| Completada | Contiene `data-action="cancel-sale"` y no contiene "Anulada el" |
| Anulada con `cancelledAt: '2026-11-05T18:30:00.000Z'` | Contiene "Anulada el 05/11/2026 15:30" y no contiene `data-action="cancel-sale"` |
| Producto `<img src=x>` | No contiene `<img` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: fallan porque esas funciones no existen.

- [ ] **Paso 3: Implementar**

- **Columnas:** Número, Fecha, Cliente, Medio de pago, Total y Acciones. Ninguna es ordenable. Número, Fecha, Medio de pago y Total llevan `nx-table__nowrap`, así que solo el cliente se parte. Total es numérica.
- **Ventas anuladas:** el total lleva la etiqueta neutra `nx-tag` "Anulada" en `nx-table__tagged`, igual que el stock de Productos, y el número va en `nx-table__void`, tachado y en color secundario, porque no cuenta en las métricas. No hay etiqueta para las completadas: serían el 97 % de las filas.
- **Acciones:** un botón `nx-btn nx-btn--ghost` con el texto "Ver detalle", `data-detail` y `aria-haspopup="dialog"`. La `aria-label` empieza con el texto visible, como pide WCAG 2.5.3.
- **`nx-table--no-sort`:** en el celular oculta el `thead`. Sin esto, "Ordenar por" aparecería solo, sin botones.
- **Detalle:** `modal-dialog modal-lg`. Muestra fecha, cliente, medio de pago y las líneas en una `nx-table nx-table--no-sort` con `data-label`, para que en el celular sean tarjetas, y después los totales. El descuento se muestra en negativo, salvo cuando es 0: `formatMoney(-0)` se vería como `-$ 0,00`. Botones: "Cerrar" (ghost) y, si está completada, "Anular venta" (danger, `data-action="cancel-sale"`). "Anular venta" cierra el detalle, y `onClosed('cancel')` se llama recién en `hidden.bs.modal`. Así la confirmación nunca se abre encima de otro modal.

- [ ] **Paso 4: Comprobar y hacer commit**

Mensaje: `feat: agregar columnas y detalle de ventas`.

### Task 4: Historial de ventas

**Archivos:**

- Crear: `src/views/sales.ts`, `src/styles/views/_sales.scss`
- Modificar: `src/main.ts`, `src/styles/main.scss`, `src/styles/components/_toolbar.scss`

**Interfaces:**

- Consume: todo lo anterior, más `confirmDialog`, `showToast`, `emptyState`, `focusPageButton`, `storageFailureMessage`.
- Produce: `salesView: View`, que reemplaza a `createUpcomingView('Ventas', 5)`.

**Comportamiento**, igual que `products.ts` salvo lo que se indica:

- **Barra:** buscador `#sales-search` ("Buscar por número o cliente", etiqueta oculta "Buscar ventas"); selector `#sales-status` (etiqueta oculta "Filtrar por estado", con "Todos los estados", "Completadas" y "Anuladas"); fechas `#sales-from` y `#sales-to`, `type="date"`, con etiquetas visibles "Desde" y "Hasta" dentro de `.nx-toolbar__date`; y el enlace `<a class="nx-btn nx-btn--primary nx-toolbar__action" href="/ventas/nueva">` "Nueva venta". En 375 px, Desde y Hasta comparten una fila.
- **Fechas:** se aplican con `change`. Al cambiar una, `#sales-to` recibe `min` igual a Desde, y `#sales-from` recibe `max` igual a Hasta. Así el calendario no ofrece un rango invertido, aunque escribiéndolo igual se puede.
- **Tabla:** las columnas se crean una vez con la moneda de la configuración, en páginas de 10 filas. Estado `role="status"` con "1 venta" o "N ventas", y caption "Historial de ventas".
- **Estados vacíos:** sin ventas, "Todavía no hay ventas" y "Registrá la primera con Nueva venta." Con filtros y sin resultados, "Sin resultados" y "Probá con otra búsqueda o quitá los filtros."; si Desde es posterior a Hasta, la descripción es "La fecha Desde es posterior a la fecha Hasta." Los dos llevan "Limpiar filtros", que restablece los cuatro controles, quita `min` y `max` y lleva el foco al buscador.
- **Detalle y anulación:** "Ver detalle" abre `openSaleDetail`. Si se pide anular, se abre `confirmDialog` con el título `Anular venta V-000123`, el mensaje "La venta queda en el historial como anulada y se devuelve el stock de los productos que todavía existen. No se puede deshacer." y el botón "Anular venta". Al confirmar, la tabla lleva hasta la venta con `pageOf`. Si un filtro la oculta, por ejemplo "Completadas", se limpian los filtros, como en Productos. El foco queda en su botón "Ver detalle".
- **Avisos:** "Venta V-000123 anulada.", "Esta venta ya no existe.", "Esta venta ya estaba anulada." y el de almacenamiento. Después de cualquier falla se vuelve a dibujar la tabla.

- [ ] **Paso 1: Implementar la vista y sus estilos, y conectarla en `main.ts`**

- [ ] **Paso 2: Comprobar en `npm run dev`**

Con los datos demo: 350 ventas, de V-000001 a V-000350, y 10 anuladas, las múltiplos de 33 hasta la V-000330.

| Acción | Esperado |
|---|---|
| Abrir `/ventas` | "350 ventas", "Página 1 de 35" y V-000350 primera |
| Buscar `000123` | Solo V-000123, sin perder el foco |
| Buscar el nombre de un cliente sin tildes | Solo sus ventas |
| Elegir "Anuladas" | 10 filas, todas con "Anulada" y el total tachado |
| Desde y Hasta en el día de hoy | Las ventas de hoy, incluidas las de hace 5, 10 y 15 minutos |
| Desde posterior a Hasta, escribiéndolo | El mensaje del rango invertido y "Limpiar filtros" |
| Ver detalle de una venta con descuento | Líneas, descuento antes del IVA y el mismo total que la fila |
| Anular y cancelar | Nada cambia y el foco vuelve a "Ver detalle" |
| Anular y confirmar | La fila queda "Anulada", el stock vuelve en `/productos`, bajan los ingresos del Dashboard si era de este mes y hay actividad |
| Ver detalle de una anulada | "Anulada el …" y sin "Anular venta" |
| Con "Completadas", anular | Se quitan los filtros y la fila anulada queda a la vista |
| En 375 px | Sin "Ordenar por" y con cada venta como tarjeta |
| Recargar | Los cambios siguen |
| Simular almacenamiento lleno y anular | Aviso de error, y la venta sigue completada |
| Atrás con el detalle o la confirmación abiertos | Se cierran, sin anular, y la app responde |

- [ ] **Paso 3: Comprobar y hacer commit**

Mensaje: `feat: agregar historial de ventas`.

### Task 5: Nueva venta

**Archivos:**

- Crear: `src/views/new-sale.ts`, `src/styles/views/_new-sale.scss`
- Modificar: `src/main.ts`, `src/styles/main.scss`

**Interfaces:**

- Consume: `services.sales.preview`, `validate` y `register`, `formField`, `fieldErrorId`, `formatMoney`, `formatPercent`, `formatPaymentMethod`, `formatSaleNumber`, `sortItems`, `emptyState`, `showToast`, `storageFailureMessage`, `PAYMENT_METHODS`, `SaleField`, `LineError`.
- Produce: `newSaleView: View`, que reemplaza a `createUpcomingView('Nueva venta', 5)`.

**Comportamiento:**

- **Requisitos:** sin clientes, "Todavía no hay clientes", "Para registrar una venta, primero agregá un cliente." y un enlace a `/clientes` "Ir a Clientes". Sin productos con stock, "No hay productos con stock", "Para registrar una venta, agregá un producto o subí el stock de uno." y un enlace a `/productos` "Ir a Productos".
- **Formulario** `#new-sale-form` con `novalidate`, en este orden:
  - "Cliente", un selector con `formField`. La primera opción es "Elegí un cliente", y después vienen los clientes ordenados por nombre.
  - La sección "Productos" (`h2`), con una línea vacía al empezar y el botón "Agregar producto".
  - "Descuento (%)", con `inputmode="numeric"` y valor inicial `0`.
  - "Medio de pago", con "Elegí un medio de pago" y las tres opciones de `formatPaymentMethod`.
- **Cada línea** es una fila con una clave propia (`data-line`), no con su posición, para que los `id` no cambien al quitar otra:
  - "Producto": selector con "Elegí un producto" y los productos por nombre, con el texto `Nombre (SKU)`. Los de stock 0 dicen `Nombre (SKU, sin stock)` y están `disabled`.
  - "Cantidad": valor inicial `1`, con `inputmode="numeric"` y `autocomplete="off"`. Su `aria-describedby` apunta a la ayuda y al error de la línea.
  - La ayuda "Disponibles: N", vacía si no hay producto.
  - El subtotal de la línea, con `formatMoney` o "—".
  - Un botón para quitarla, con `aria-label` "Quitar Nombre", o "Quitar línea sin producto" si no hay producto.
  - Su mensaje de error.
- **Resumen** (`h2` "Resumen"): Subtotal, "Descuento (N %)" en negativo como en el detalle, "IVA (N %)" con el IVA de la configuración, y Total, que tiene `role="status"`. Debajo, "Registrar venta" (`type="submit"`) y el enlace "Cancelar" a `/ventas`. Desde 1200 px, el resumen es una columna de 20rem a la derecha con `position: sticky`; con menos ancho, va debajo del formulario.
- **En vivo:** con cada `input` y `change` del formulario, se leen las líneas en el orden de la pantalla, se llama a `preview` y se actualizan solo los textos de la ayuda, los subtotales y el resumen, sin redibujar campos. Después del primer intento, además se muestran los errores de `validate`.
- **Agregar y quitar:** "Agregar producto" suma una línea y le da el foco a su selector. Al quitar una línea, el foco pasa al selector de la siguiente, o al de la anterior, o a "Agregar producto" si no queda ninguna.
- **Errores:** los de cliente, descuento y medio de pago van junto a su campo. El de una línea marca con `is-invalid` y `aria-invalid` el control de `LineError.field`. El de `lines` va debajo de "Agregar producto", que lo recibe en `aria-describedby`. El foco va al primer control con error en el orden de la pantalla, o a "Agregar producto" si falta agregar productos.
- **Al registrar:** si sale bien, se muestra `Venta V-000351 registrada.` y se navega a `/ventas`. Con un error de almacenamiento se muestra el aviso, y el formulario queda como estaba.

- [ ] **Paso 1: Implementar la vista y sus estilos, y conectarla en `main.ts`**

- [ ] **Paso 2: Comprobar en `npm run dev`**

| Acción | Esperado |
|---|---|
| Abrir `/ventas/nueva` desde el historial | Una línea vacía, total $ 0,00, y "Ventas" marcado en el menú |
| Elegir un producto | Cantidad 1, "Disponibles: N", subtotal y total con IVA 21 % |
| Cantidad 3 y descuento 10 | El descuento se calcula antes del IVA, en vivo y sin perder el foco |
| Productos sin stock | Aparecen deshabilitados |
| Cantidad mayor al stock y registrar | Error en esa cantidad, que recibe el foco; la venta no se guarda |
| El mismo producto en dos líneas | Error en el producto de la segunda |
| Sin cliente | Error junto al cliente, que recibe el foco |
| Quitar todas las líneas y registrar | "Agregá al menos un producto." y el foco en "Agregar producto" |
| Corregir un error después del primer intento | El error desaparece sin registrar |
| Registrar una venta válida | Aviso "Venta V-000351 registrada.", el historial con V-000351 primera, el stock descontado en `/productos`, y en el Dashboard los ingresos y la actividad actualizados |
| Cerrar sesión | El acceso demo muestra V-000351 como la última venta |
| Simular almacenamiento lleno y registrar | Aviso de error y el formulario con lo elegido; al quitar la simulación, se registra con el número siguiente |
| Con `customers: []` en `nexo:db` | El estado vacío con "Ir a Clientes" |
| Atrás con datos escritos | Sale sin guardar nada |

- [ ] **Paso 3: Comprobar y hacer commit**

Mensaje: `feat: agregar registro de ventas`.

### Task 6: Comprobación en producción

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**

- Produce: evidencia y capturas.

Con `npm run build` y `npm run preview`:

- [ ] **Paso 1: Comprobar la CSP**

Registrar una venta, ver su detalle y anularla. Esperado: sin errores en consola.

- [ ] **Paso 2: Probar texto malicioso**

Con un cliente y un producto llamados `"><img src=x onerror=alert(1)>`, registrar una venta. Esperado: se ve como texto en el selector de Nueva venta, en la tabla, en el detalle y en el acceso demo, sin `img` y sin alerta.

- [ ] **Paso 3: Probar el responsive**

En 320, 375, 767, 768, 991, 992, 1199, 1200, 1280 y 1920 px, sin desborde según **Restricciones globales**. Revisar el historial, el detalle y Nueva venta con los datos demo y con datos al límite: un cliente y un producto con nombres de 80 caracteres sin espacios, y una venta de ese producto a $ 99.999.999,99 con 9999 unidades. En el historial, medir en todas las páginas que el cliente no quede por debajo de 120 px en 768 y 992 px. En Nueva venta, los selectores con nombres largos no deben ensanchar la página.

- [ ] **Paso 4: Probar con teclado**

Solo con el teclado, en 1280 y 375 px: buscar, filtrar por estado y fechas, paginar, abrir el detalle, anular, registrar una venta con dos líneas, quitar una línea y corregir un error. Esperado: foco visible, orden lógico y foco recuperado después de cada acción.

- [ ] **Paso 5: Probar con entrada rápida**

| Acción, con mouse y teclado reales | Esperado |
|---|---|
| Doble clic en "Anular venta" del detalle | Una sola confirmación, que no se confirma sola |
| Confirmar a los 160, 200, 260 y 320 ms y después cancelar | Si la confirmación seguía abriéndose, el clic no cuenta y "Cancelar" no anula |
| Doble Enter en "Ver detalle" | Un solo modal |
| Doble Enter en "Registrar venta" | Una sola venta y un solo número |
| Escribir rápido en la cantidad | El total final coincide con el de la venta registrada |
| Clic en el fondo del detalle | Sigue abierto |

- [ ] **Paso 6: Sacar capturas**

Guardar en `.playwright-mcp/capturas/` el historial, el historial filtrado, el detalle de una venta anulada, la confirmación y Nueva venta con dos líneas y con errores, en 1280 y 375 px. Sumar Nueva venta en 992 px. Revisarlas con ojo crítico y corregir lo que no alcance el nivel aprobado.

### Task 7: Cierre de la etapa

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**

- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Ejecutar todas las comprobaciones**

Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0 y sin avisos de Sass.

- [ ] **Paso 2: Comprobar los tests con mutaciones**

Romper a propósito, de a una:

- En `services/sales.ts`: cada filtro, los bordes `>=` y `<=` de las fechas, el orden, el agregado al principio, el aumento de `nextSaleNumber`, la devolución de stock, el control de doble anulación y cada mensaje de actividad.
- En el dominio: `previewSale`, `parseDateInput`, los mensajes de `validateSale` y la versión con `BigInt` de `percentOfCents`.
- En las vistas: `sale-columns.ts` y `sale-detail.ts`, incluido el escape.

Sumar los casos que pidió la Etapa 4: un id inexistente en una base con datos y fallas distintas de `quota-exceeded`. Esperado: cada cambio hace fallar un test. Los cambios deben estar en un commit antes de empezar, porque los scripts restauran con `git checkout`.

- [ ] **Paso 3: Revisar e informar**

Pedir una revisión independiente contra este plan y el diseño, sin escribir en el proyecto salvo en `.playwright-mcp`, y corregir lo que corresponda.

El informe incluye la salida real de cada comprobación, los errores que aparecieron y cómo se resolvieron, y qué se construyó, con estos conceptos:

- escribir todo o nada en una sola escritura;
- uniones discriminadas con las fallas de cada operación;
- la copia de los datos en cada venta;
- fechas locales y UTC;
- valores derivados que se calculan y no se guardan, como el resumen en vivo;
- por qué `BigInt` hizo falta en un cálculo con enteros.

Cierra con la respuesta a "¿cómo evitás que una venta deje el stock a medias?" para una entrevista.

No se empieza la Etapa 6 sin la aprobación del autor.

---

## Decisiones tomadas al ejecutar el plan

Registradas para que el plan describa lo que se construyó.

**Dominio y servicio**

- `SalePreview` también devuelve `discountPercent`, el descuento que se aplicó: uno inválido cuenta como 0. Así el resumen muestra "Descuento (N %)" sin repetir la regla del dominio.
- Registrar y anular arman la base nueva con una sola lectura y la guardan con `database.replace(next)`. Con `update(change)`, la función habría ignorado su argumento. El efecto es el mismo que pide el diseño: una sola escritura, todo o nada.
- Si `decreaseStock` fallara después de validar con la misma lectura, cosa que no puede pasar, el error va en `lines`: "El stock cambió. Revisá las cantidades."
- En `parseDateInput`, comparar el día y comparar el mes son redundantes entre sí si también se compara el año. Las dos mutaciones son equivalentes y se dejan las tres comparaciones porque se leen mejor.

**Vistas**

- `openSaleDetail` va en `sale-detail-modal.ts`: Bootstrap no se puede importar en el entorno Node de Vitest, y `saleDetailContent` tiene que poder probarse.
- `formatDiscount` va en `ui/format.ts` y lo usan el detalle y Nueva venta. `formatMoney(-0)` mostraría `-$ 0,00`.
- Las fechas del historial se ven con coma ("05/11/2026, 14:30"), como ya las formatea `formatDateTime`.
- Entre 768 y 1199 px, "Ver detalle" muestra solo un ícono de ojo, con su `aria-label` completo. Con texto, Cliente quedaba en 116 y 92 px con los datos demo. Partir la fecha ganaba poco y la partía también en 1280 px.
- En el celular, Desde y Hasta llevan la etiqueta arriba: al lado, el campo medía 119 px y cortaba la fecha.
- Cada fecha actualiza solo el límite de la otra, y `syncAttribute` (en `ui/dom.ts`) no vuelve a escribir un atributo que no cambió. Chromium rehace el editor de la fecha cuando le escriben `min` o `max`, y se perdía lo que se estaba tecleando. Lo encontró la revisión: mis pruebas habían asignado las fechas por código.
- `openModal` lleva el foco al diálogo al terminar de abrirse. Bootstrap lo intentaba cuando el diálogo todavía estaba `inert`, y en el detalle el foco quedaba en `body` y Escape no cerraba.
- Los estilos nuevos compartidos son `components/_totals.scss` y `.nx-form-error` en `components/_form.scss`.
- La grilla de Nueva venta usa `minmax(0, 1fr)`, y entre 576 y 1199 px el resumen mide hasta 26rem y va a la derecha.

**Detalles menores que quedan para más adelante**

- Entre 768 y 1199 px, Desde y Hasta pueden quedar en filas distintas: conviene agruparlas.
- Después del primer intento, una línea nueva aparece con el error "Elegí un producto." antes de tocarla.
- Falta un test con una venta a las 00:00 del día siguiente a Hasta.
- Las cantidades de stock van sin separador de miles ("Disponibles: 9999").
- Los controles de cada línea comparten el nombre accesible ("Producto", "Cantidad") y no llevan `required`.
