# Etapa 1 (Dominio y datos): plan de implementación

> **Para quien ejecute el plan:** usar `superpowers:executing-plans` o `superpowers:subagent-driven-development`, tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** implementar y probar toda la lógica de NEXO que no depende de la pantalla: tipos, dinero, ventas, stock, validaciones, listas, reportes, persistencia y datos demo.

**Arquitectura:** funciones puras en `src/domain` y persistencia en `src/data`, con el almacenamiento y la fecha recibidos por parámetro. Todo se prueba en Node, sin navegador.

**Stack:** TypeScript 6.0.3 estricto y Vitest 5.1.0. Sin dependencias nuevas.

**Diseño:** [2026-11-04-nexo-diseno.md](../specs/2026-11-04-nexo-diseno.md), secciones 4 a 7 y 11.

## Restricciones globales

- `domain` no importa de otras capas ni usa el DOM, LocalStorage, `Date.now()` o `new Date()` sin argumentos. La fecha se recibe como `now: Date`.
- Los importes son enteros en centavos. Las fechas se guardan como texto ISO en UTC y se agrupan en la zona horaria del navegador.
- Las funciones no modifican sus argumentos: devuelven datos nuevos.
- Los identificadores del código van en inglés; los mensajes para el usuario, en español.
- Los errores esperables se devuelven con `Result`; no se lanzan excepciones.
- Sin `any` y sin dependencias nuevas.
- Se trabaja en la rama `etapa-1-dominio-datos`.
- Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Los tests comparan contra valores literales calculados a mano y comprueban si hay error por campo, no el texto exacto del mensaje.

**Comprobación de cada tarea:** además de sus tests, `npm run typecheck`, `npm run lint` y `npm run format:check` terminan con código 0. Si `format:check` falla, se ejecuta `npm run format`.

## Foco de revisión

Fallos que una persona real encontraría y el diseño no nombra. Cada uno tiene su test en la tarea indicada.

1. **Precio con formato argentino:** `1.234,56` o `1.234` deben rechazarse; nunca leerse como 1,23 ni como 1.234,00 (Task 1).
2. **Días y horario de verano:** una venta a las 23:30 cuenta en el día local, y un gráfico no repite ni saltea días al cambiar la hora (Task 6).
3. **Meses de distinta duración:** el 31 de marzo se compara hasta el 28 de febrero, sin desbordar a marzo (Task 6).
4. **Datos dañados con JSON válido:** un cliente sin nombre o un importe con decimales en LocalStorage no debe romper la app (Task 7).
5. **Abrir la demo el día 1 del mes:** el Dashboard debe mostrar datos del mes, incluso minutos después de la medianoche (Task 8).

---

### Task 1: Tipos y dinero

**Archivos:**
- Crear: `src/domain/types.ts`, `src/domain/money.ts`
- Test: `src/domain/money.test.ts`

**Interfaces:**
- Produce en `types.ts`:
  - Los tipos de la sección 5 del diseño, sin cambios: `ProductCategory`, `PaymentMethod`, `SaleStatus`, `Customer`, `Product`, `SaleItem`, `Sale`, `ActivityEntry`, `Settings`, `Database`.
  - Listas `as const` de las que derivan sus tipos: `PRODUCT_CATEGORIES`, `PAYMENT_METHODS`, `SALE_STATUSES`, `ACTIVITY_TYPES`, `CURRENCIES`, `TABLE_DENSITIES`, `ACCENTS`. Tipos nuevos: `ActivityType`, `Currency`, `TableDensity`, `Accent`.
  - Los tipos de formularios y resultados:

```ts
type FieldErrors<K extends string> = Partial<Record<K, string>>;

interface CustomerInput { name: string; email: string; phone: string; company: string }
type CustomerData = Pick<Customer, 'name' | 'email' | 'phone' | 'company'>;

interface ProductInput { name: string; sku: string; category: string; price: string; stock: string }
type ProductData = Pick<Product, 'name' | 'sku' | 'category' | 'priceCents' | 'stock'>;

interface SaleLineInput { productId: string; quantity: string }
interface SaleInput {
  customerId: string; lines: readonly SaleLineInput[];
  discountPercent: string; paymentMethod: string;
}
interface ValidatedSale {
  customer: Customer;
  lines: readonly { product: Product; quantity: number }[];
  discountPercent: number; paymentMethod: PaymentMethod;
}
type SaleErrors = FieldErrors<'customerId' | 'lines' | 'discountPercent' | 'paymentMethod'> & {
  lineErrors?: Readonly<Record<number, string>>;
};

interface PreferencesInput {
  currency: string; taxPercent: string; lowStockThreshold: string;
  tableDensity: string; accent: string;
}
```

- Produce en `money.ts`:
  - `parseMoneyToCents(raw: string): number | null`
  - `percentOfCents(cents: number, percent: number): number`

- [ ] **Paso 1: Crear `src/domain/types.ts`**

- [ ] **Paso 2: Escribir los tests que fallan**

```ts
it.each([
  ['1234', 123400], ['19.99', 1999], ['19,99', 1999], ['1.5', 150],
  ['0.07', 7], [' 100 ', 10000], ['99999999.99', 9999999999],
])('parseMoneyToCents(%s) convierte a %i centavos', (raw, cents) => {
  expect(parseMoneyToCents(raw)).toBe(cents);
});

it.each([
  '', 'abc', '-5', '1e5', '.5', '5.', '1.234,56', '1.234', '12.345', '1,234.56',
  '99999999999999999999',
])('parseMoneyToCents(%s) rechaza el formato', (raw) => {
  expect(parseMoneyToCents(raw)).toBeNull();
});

it.each([
  [100, 21, 21], [1000, 1.15, 12], [1005, 50, 503], [0, 21, 0],
  [12345, 100, 12345], [12345, 0, 0], [1000, 10.5, 105],
])('percentOfCents(%i, %d) da %i', (cents, percent, expected) => {
  expect(percentOfCents(cents, percent)).toBe(expected);
});
```

`percentOfCents(1000, 1.15)` da 12 y no 11: es el caso que falla si se calcula con decimales.

- [ ] **Paso 3: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./money`.

- [ ] **Paso 4: Implementar `src/domain/money.ts`**

`parseMoneyToCents` valida con `^\d+([.,]\d{1,2})?$`, separa la parte entera de la decimal como texto y devuelve `null` si el resultado no es un entero seguro. No usa multiplicación con decimales.

`percentOfCents` trabaja con enteros: `Math.floor((cents * Math.round(percent * 100) + 5000) / 10000)`.

- [ ] **Paso 5: Comprobar que pasan y hacer commit**

Ejecutar `npm test`. Esperado: todos aprobados. Mensaje: `feat: agregar tipos del dominio y cálculos de dinero`.

### Task 2: Cálculo de ventas

**Archivos:**
- Crear: `src/domain/sales.ts`, `src/testing/fixtures.ts`
- Test: `src/domain/sales.test.ts`

**Interfaces:**
- Consume: `percentOfCents`, `ok`, `err`, los tipos de la Task 1.
- Produce en `sales.ts`:
  - `interface SaleTotals { subtotalCents: number; discountCents: number; taxCents: number; totalCents: number }`
  - `calculateTotals(lines: readonly { unitPriceCents: number; quantity: number }[], discountPercent: number, taxPercent: number): SaleTotals`
  - `buildSale(validated: ValidatedSale, meta: { id: string; number: number; taxPercent: number; now: Date }): Sale`
  - `cancelSale(sale: Sale, now: Date): Result<Sale, 'already-cancelled'>`
  - `formatSaleNumber(number: number): string`
- Produce en `fixtures.ts`: `makeCustomer`, `makeProduct`, `makeSaleItem` y `makeSale`, cada una con la firma `(overrides?: Partial<T>) => T` y valores literales por defecto.

- [ ] **Paso 1: Crear `src/testing/fixtures.ts`**

- [ ] **Paso 2: Escribir los tests que fallan**

```ts
it.each([
  // líneas, descuento %, IVA %, subtotal, descuento, IVA, total
  [[[1000, 2], [550, 1]], 10, 21, 2550, 255, 482, 2777],
  [[[1000, 1]], 50, 21, 1000, 500, 105, 605],     // el IVA se calcula después del descuento
  [[[1005, 1]], 50, 0, 1005, 503, 0, 502],        // la mitad redondea hacia arriba
  [[[1000, 3]], 0, 21, 3000, 0, 630, 3630],
  [[[1000, 3]], 100, 21, 3000, 3000, 0, 0],
  [[], 10, 21, 0, 0, 0, 0],
])('calculateTotals %#', () => { /* compara las cuatro cifras */ });
```

- `buildSale` con cliente `c1` "Ana Gómez", producto `p1` "Monitor" (`MON-1`, Periféricos, 1000 centavos), cantidad 2, descuento 0, IVA 21, `id: 's1'`, `number: 7` y fecha `2026-11-05T12:00:00.000Z` devuelve: `customerName: 'Ana Gómez'`, una línea con esos datos copiados, subtotal 2000, IVA 420, total 2420, `status: 'completed'`, `createdAt` igual a esa fecha y `cancelledAt: null`.
- `cancelSale` de una venta completada da `ok`, con `status: 'cancelled'`, `cancelledAt` igual a `now` y los importes sin cambios. La venta original no cambia.
- `cancelSale` de una venta anulada da `err('already-cancelled')`.
- `formatSaleNumber(123)` da `'V-000123'` y `formatSaleNumber(1234567)` da `'V-1234567'`.

- [ ] **Paso 3: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./sales`.

- [ ] **Paso 4: Implementar `src/domain/sales.ts`**

- [ ] **Paso 5: Comprobar que pasan y hacer commit**

Ejecutar `npm test`. Esperado: todos aprobados. Mensaje: `feat: calcular totales, registrar y anular ventas`.

### Task 3: Stock

**Archivos:**
- Crear: `src/domain/stock.ts`
- Test: `src/domain/stock.test.ts`

**Interfaces:**
- Produce:
  - `interface StockChange { productId: string; quantity: number }`
  - `interface StockShortage { productId: string; requested: number; available: number }`
  - `decreaseStock(products: readonly Product[], changes: readonly StockChange[], now: Date): Result<readonly Product[], StockShortage>`
  - `restoreStock(products: readonly Product[], changes: readonly StockChange[], now: Date): readonly Product[]`
  - `isLowStock(product: Product, threshold: number): boolean`
  - `isOutOfStock(product: Product): boolean`

- [ ] **Paso 1: Escribir los tests que fallan**

Con `p1` en stock 5 y `p2` en stock 2:

| Caso | Esperado |
|---|---|
| `decreaseStock` con `p1`×2 y `p2`×2 | `p1` queda en 3, `p2` en 0, y ambos con `updatedAt` igual a `now`. El arreglo original no cambia |
| `decreaseStock` con `p1`×2 y `p2`×3 | `err({ productId: 'p2', requested: 3, available: 2 })` |
| `decreaseStock` con `p1`×3 y `p1`×3 | `err({ productId: 'p1', requested: 6, available: 5 })` |
| `decreaseStock` con un producto inexistente `x`×1 | `err({ productId: 'x', requested: 1, available: 0 })` |
| `restoreStock` con `p1`×2 y un producto borrado `x`×1 | `p1` queda en 7, `p2` conserva su `updatedAt` y el arreglo sigue con 2 productos |
| `isLowStock` con umbral 5 | Stock 5 y 0: `true`. Stock 6: `false` |
| `isOutOfStock` | Stock 0: `true`. Stock 1: `false` |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./stock`.

- [ ] **Paso 3: Implementar `src/domain/stock.ts`**

`decreaseStock` suma primero las cantidades por producto, para detectar repeticiones.

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Ejecutar `npm test`. Esperado: todos aprobados. Mensaje: `feat: descontar y restaurar stock`.

### Task 4: Validaciones

**Archivos:**
- Crear: `src/domain/validation/rules.ts`, `customer.ts`, `product.ts`, `sale.ts`, `settings.ts`
- Test: un `*.test.ts` junto a cada uno

**Interfaces:**
- Consume: `parseMoneyToCents`, `ok`, `err`, los tipos de la Task 1.
- Produce:
  - En `rules.ts`: `isValidEmail(value: string): boolean`, `parseIntegerInRange(raw: string, min: number, max: number): number | null`, `parsePercent(raw: string, maxDecimals: number): number | null`.
  - `validateCustomer(input: CustomerInput, existing: readonly Customer[], currentId?: string): Result<CustomerData, FieldErrors<keyof CustomerInput>>`
  - `validateProduct(input: ProductInput, existing: readonly Product[], currentId?: string): Result<ProductData, FieldErrors<keyof ProductInput>>`
  - `validateSale(input: SaleInput, context: { customers: readonly Customer[]; products: readonly Product[] }): Result<ValidatedSale, SaleErrors>`
  - `validateProfile(input: Settings['profile']): Result<Settings['profile'], FieldErrors<keyof Settings['profile']>>`
  - `validatePreferences(input: PreferencesInput): Result<Settings['preferences'], FieldErrors<keyof PreferencesInput>>`

Las reglas son las de la sección 6 del diseño. Cada validador reúne todos los errores, no solo el primero.

- [ ] **Paso 1: Escribir los tests de `rules.ts` y comprobar que fallan**

| Función | Válido | Inválido |
|---|---|---|
| `isValidEmail` | `ana@example.com` | `''`, `ana@example`, `ana example.com`, `a@b@c.com` |
| `parseIntegerInRange(raw, 0, 10)` | `'5'` da 5, `' 7 '` da 7 | `''`, `'5.5'`, `'1e3'`, `'-1'`, `'11'` |
| `parsePercent(raw, 2)` | `'21'` da 21, `'10,5'` da 10.5, `'10.55'` da 10.55, `'100'` da 100 | `''`, `'21.555'`, `'100.01'`, `'-1'` |

- [ ] **Paso 2: Implementar `rules.ts` y comprobar que pasan**

El email usa `^[^\s@]+@[^\s@]+\.[^\s@]+$`.

- [ ] **Paso 3: Escribir los tests de los validadores y comprobar que fallan**

**Cliente.** La entrada `{ name: ' Ana Gómez ', email: ' ANA@Example.com ', phone: '+54 11 5555-0101', company: '' }` da `ok` con el nombre recortado y el email `ana@example.com`.

| Campo | Da error | Es válido |
|---|---|---|
| `name` | `'A'`, `'   '`, 81 caracteres | 2 y 80 caracteres |
| `email` | `''`, `'ana@example'`, 121 caracteres, `'ANA@example.com'` si ya existe `ana@example.com` | Ese mismo email al editar a su dueño (`currentId`) |
| `phone` | `'12345'`, `'abc123'`, `'------'`, 21 caracteres | `''`, 20 caracteres con dígitos |
| `company` | 81 caracteres | `''`, 80 caracteres |

**Producto.** La entrada `{ name: 'Monitor', sku: 'mon-1', category: 'Periféricos', price: '1234,56', stock: '0' }` da `ok` con `sku: 'MON-1'`, `priceCents: 123456` y `stock: 0`.

| Campo | Da error | Es válido |
|---|---|---|
| `name` | `'A'`, 81 caracteres | 2 y 80 caracteres |
| `sku` | `'ab'`, `'a b c'`, 21 caracteres, `'MON-1'` si ya existe `mon-1` | Ese mismo SKU al editar a su dueño |
| `category` | `'Inventada'` | Cada categoría fija |
| `price` | `''`, `'0'`, `'1.234,56'`, `'100000000'` | `'99999999.99'`, `'0.01'` |
| `stock` | `''`, `'-1'`, `'1.5'`, `'1000000'` | `'0'`, `'999999'` |

**Venta.** Con el cliente `c1`, `p1` en stock 5 y `p2` en stock 1, la entrada `{ customerId: 'c1', lines: [{ productId: 'p1', quantity: '2' }], discountPercent: '10', paymentMethod: 'card' }` da `ok`, con el cliente y el producto completos, cantidad 2 y descuento 10.

| Entrada | Error en |
|---|---|
| `customerId: 'nope'` | `customerId` |
| `lines: []` | `lines` |
| Línea con `productId: ''` o un producto inexistente | `lineErrors[0]` |
| `p1` repetido en dos líneas | `lineErrors[1]` |
| Cantidad `''`, `'0'`, `'1.5'`, `'10000'` | `lineErrors[0]` |
| Cantidad `'6'` de `p1` | `lineErrors[0]` |
| Descuento `''`, `'-1'`, `'5.5'`, `'101'` | `discountPercent` |
| `paymentMethod: 'crypto'` | `paymentMethod` |
| Cliente inválido y medio de pago inválido a la vez | `customerId` y `paymentMethod` |

**Perfil.** `{ displayName: ' Usuario ', email: 'DEMO@Example.com', role: '' }` da `ok`, recortado y con el email en minúsculas. Dan error `displayName` de 1 o 61 caracteres, un email inválido y `role` de 61 caracteres.

**Preferencias.** `{ currency: 'USD', taxPercent: '10,5', lowStockThreshold: '0', tableDensity: 'compact', accent: 'blue' }` da `ok` con `taxPercent: 10.5` y `lowStockThreshold: 0`. Dan error `currency: 'BTC'`, `taxPercent` `''`, `'-1'`, `'21.555'`, `'100.01'`, `lowStockThreshold` `'1.5'`, `'1001'`, y valores desconocidos en `tableDensity` y `accent`.

- [ ] **Paso 4: Implementar los validadores y comprobar que pasan**

Ejecutar `npm test`. Esperado: todos aprobados.

- [ ] **Paso 5: Hacer commit**

Mensaje: `feat: validar clientes, productos, ventas y configuración`.

### Task 5: Listas y actividad

**Archivos:**
- Crear: `src/domain/list.ts`, `src/domain/activity.ts`
- Test: `src/domain/list.test.ts`, `src/domain/activity.test.ts`

**Interfaces:**
- Produce en `list.ts`:
  - `type SortDirection = 'asc' | 'desc'`
  - `interface Page<T> { items: readonly T[]; page: number; pageCount: number; totalItems: number }`
  - `searchItems<T>(items: readonly T[], query: string, getFields: (item: T) => readonly string[]): readonly T[]`
  - `sortItems<T>(items: readonly T[], getKey: (item: T) => string | number, direction: SortDirection): readonly T[]`
  - `paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T>`
- Produce en `activity.ts`: `MAX_ACTIVITY_ENTRIES = 100` y `addActivity(entries: readonly ActivityEntry[], entry: ActivityEntry): readonly ActivityEntry[]`.

- [ ] **Paso 1: Escribir los tests que fallan**

| Función | Caso | Esperado |
|---|---|---|
| `searchItems` | `'garcia'` sobre "García" | Lo encuentra, sin importar tildes ni mayúsculas |
| `searchItems` | `' NUNEZ '` sobre "Núñez" | Lo encuentra, recortando espacios |
| `searchItems` | Coincidencia solo en el segundo campo | Lo encuentra |
| `searchItems` | `''` o `'   '` | Devuelve todos |
| `searchItems` | `'xyz'` sin coincidencias | Devuelve una lista vacía |
| `sortItems` asc | `Bravo`, `Álvarez`, `Zeta` | `Álvarez`, `Bravo`, `Zeta` |
| `sortItems` asc | `oso`, `ñandú`, `nube` | `nube`, `ñandú`, `oso` |
| `sortItems` asc | `Bea`, `ana` | `ana`, `Bea` |
| `sortItems` asc y desc | 10, 9, 100 | 9, 10, 100 y 100, 10, 9. El original no cambia |
| `paginate` | 23 elementos, tamaño 10, página 1 | 10 elementos, `pageCount: 3`, `totalItems: 23` |
| `paginate` | Página 3 | 3 elementos |
| `paginate` | Página 99 y página 0 | Devuelve la página 3 y la 1 |
| `paginate` | 20 elementos | `pageCount: 2` |
| `paginate` | Lista vacía | `items: []`, `page: 1`, `pageCount: 1`, `totalItems: 0` |
| `addActivity` | 100 entradas y una nueva | 100 entradas: la nueva primero y sin la más antigua. El original no cambia |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existen los módulos.

- [ ] **Paso 3: Implementar `list.ts` y `activity.ts`**

La búsqueda normaliza con `normalize('NFD')` y quita marcas con `\p{Diacritic}`. El orden de textos usa `localeCompare` con locale `es` y `sensitivity: 'base'`.

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Ejecutar `npm test`. Esperado: todos aprobados. Mensaje: `feat: buscar, ordenar y paginar listas, y registrar actividad`.

### Task 6: Reportes

**Archivos:**
- Crear: `src/domain/reports.ts`
- Modificar: `vite.config.ts`
- Test: `src/domain/reports.test.ts`

**Interfaces:**
- Consume: `makeSale`, `makeSaleItem`.
- Produce en `reports.ts`:
  - `type ReportPeriod = '7d' | '30d' | '90d' | '12m'`
  - `interface DateRange { start: Date; end: Date }`
  - `interface SalesSummary { revenueCents: number; salesCount: number; averageTicketCents: number; unitsSold: number }`
  - `interface MonthlyComparison { current: SalesSummary; previous: SalesSummary; revenueChange: number | null; salesCountChange: number | null; averageTicketChange: number | null }`
  - `periodRange(period: ReportPeriod, now: Date): DateRange`
  - `currentMonthRange(now: Date): DateRange`
  - `salesInRange(sales: readonly Sale[], range: DateRange): readonly Sale[]`
  - `summarizeSales(sales: readonly Sale[]): SalesSummary`
  - `percentChange(current: number, previous: number): number | null`
  - `compareWithPreviousMonth(sales: readonly Sale[], now: Date): MonthlyComparison`
  - `revenueSeries(sales: readonly Sale[], period: ReportPeriod, now: Date): readonly { key: string; revenueCents: number }[]`
  - `grossByCategory(sales: readonly Sale[]): readonly { category: ProductCategory; grossCents: number }[]`
  - `topProducts(sales: readonly Sale[], limit: number): readonly { productId: string; productName: string; units: number }[]`
  - `topCustomers(sales: readonly Sale[], limit: number): readonly { customerId: string; customerName: string; revenueCents: number }[]`

`salesInRange` filtra solo por fecha. Todas las demás funciones de métricas ignoran las ventas anuladas. `end` incluye el último milisegundo del día.

- [ ] **Paso 1: Fijar la zona horaria de los tests**

En `vite.config.ts`, agregar a `test`: `env: { TZ: 'America/Argentina/Buenos_Aires' }`.

- [ ] **Paso 2: Escribir los tests que fallan**

Las fechas se crean con el constructor local, por ejemplo `new Date(2026, 10, 5, 12)`. Hoy es jueves 5 de noviembre de 2026.

| Función | Caso | Esperado |
|---|---|---|
| Comprobación de la zona | `new Date(2026, 10, 5, 23, 30).toISOString()` | `'2026-11-06T02:30:00.000Z'` |
| `summarizeSales` | Totales 1000 y 2001, más una anulada de 5000 | Ingresos 3001, 2 ventas, ticket 1501 |
| `summarizeSales` | Unidades 2 y 3, más una anulada con 9 | `unitsSold: 5` |
| `summarizeSales` | Lista vacía | Todo en 0 |
| `percentChange` | (150, 100), (50, 100), (0, 100) | 50, -50, -100 |
| `percentChange` | (100, 0), (0, 0) | `null` |
| `revenueSeries` 7d | Claves | 7, desde `2026-10-30` hasta `2026-11-05`, con 0 en los días sin ventas |
| `revenueSeries` 7d | Venta del 4/11 a las 23:30 local | Cuenta en `2026-11-04` |
| `revenueSeries` 7d | Una anulada y una de antes del período | No cuentan |
| `revenueSeries` 30d | Claves | 30, desde `2026-10-07` |
| `revenueSeries` 90d | Claves | 14, desde `2026-08-03` hasta `2026-11-02` |
| `revenueSeries` 90d | Venta del domingo 9/8 | Cuenta en `2026-08-03` |
| `revenueSeries` 90d | Venta del lunes 10/8 | Cuenta en `2026-08-10` |
| `revenueSeries` 90d | Venta del 5/8, antes del inicio del 8/8 | No cuenta |
| `revenueSeries` 12m | Con `now` en 5/11 | 12 claves, desde `2025-12` hasta `2026-11` |
| `revenueSeries` 12m | Con `now` en 31/10 | 12 claves sin repetir, desde `2025-11` hasta `2026-10` |
| `revenueSeries` 7d en Nueva York | `vi.stubEnv('TZ', 'America/New_York')` y `now` en `new Date(2026, 2, 10, 12)` | Del `2026-03-04` al `2026-03-10`, sin repetir (el 8/3 dura 23 horas). Restaurar con `vi.unstubAllEnvs()` |
| `compareWithPreviousMonth` | `now` en 5/11; ventas del 5/10 a las 23:00 y del 6/10 a las 00:00 | Solo la primera cuenta en `previous` |
| `compareWithPreviousMonth` | `now` en 31/3; ventas del 28/2 y del 1/3 | La del 28/2 en `previous` y la del 1/3 en `current` |
| `compareWithPreviousMonth` | `now` en 15/1/2026; venta del 15/12/2025 | Cuenta en `previous` |
| `compareWithPreviousMonth` | Mes anterior sin ventas | Los tres cambios son `null` |
| `grossByCategory` | Redes 1000×2 y Periféricos 5000×1 con descuento, más una anulada | Periféricos 5000 y Redes 2000, de mayor a menor. Ignora descuento e IVA |
| `topProducts` | `p1` con 5 unidades, `p2` con 8, límite 1 | Solo `p2` |
| `topProducts` | Dos ventas de `p1` con nombres distintos | Suma las unidades y usa el nombre de la venta más reciente |
| `topCustomers` | Cliente con dos ventas y nombres distintos | Suma los ingresos y usa el nombre más reciente |

- [ ] **Paso 3: Comprobar que fallan**

Ejecutar `npm test`. Esperado: la comprobación de la zona pasa y el resto falla porque no existe `./reports`.

- [ ] **Paso 4: Implementar `src/domain/reports.ts`**

Recorrer días y meses con `new Date(year, month, day + i)` y `new Date(year, month - i, 1)`. No sumar milisegundos ni usar `setMonth`: fallan con el horario de verano y los días 31.

Las claves usan la fecha local: `YYYY-MM-DD` para días, el lunes de la semana para semanas y `YYYY-MM` para meses.

- [ ] **Paso 5: Comprobar que pasan y hacer commit**

Ejecutar `npm test`. Esperado: todos aprobados. Mensaje: `feat: calcular métricas y series de reportes`.

### Task 7: Persistencia

**Archivos:**
- Crear: `src/data/schema.ts`, `src/data/database.ts`, `src/testing/memory-storage.ts`
- Modificar: `src/testing/fixtures.ts`
- Test: `src/data/schema.test.ts`, `src/data/database.test.ts`

**Interfaces:**
- Consume: los tipos de la Task 1, `ok`, `err`.
- Produce:
  - En `schema.ts`: `isDatabase(value: unknown): value is Database`
  - En `database.ts`:

```ts
const DATABASE_KEY = 'nexo:db';
const BACKUP_KEY = 'nexo:db:backup';
type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type StorageFailure = 'quota-exceeded' | 'write-failed';

interface DatabaseStore {
  read(): Database;
  update(change: (current: Database) => Database): Result<Database, StorageFailure>;
  replace(next: Database): Result<Database, StorageFailure>;
  readonly mode: 'persistent' | 'memory';
  readonly notice: 'recovered' | null;
}

function createDatabaseStore(options: {
  getStorage: () => KeyValueStorage;
  createSeed: () => Database;
}): DatabaseStore;
```

  - En `memory-storage.ts`: `createMemoryStorage(initial?: Record<string, string>): KeyValueStorage`
  - En `fixtures.ts`: `makeSettings` y `makeDatabase`

- [ ] **Paso 1: Agregar las utilidades de prueba**

Crear `memory-storage.ts` y agregar `makeSettings` y `makeDatabase` a `fixtures.ts`.

- [ ] **Paso 2: Escribir los tests de `schema.ts` y comprobar que fallan**

`isDatabase(makeDatabase())` da `true`, también con clientes, productos y ventas cargados, y con una venta anulada.

Dan `false`: `null`, `[]`, `'texto'`, `version: 2`, sin `customers`, un cliente sin `name`, un producto con `stock: -1`, `priceCents: 10.5`, una categoría desconocida, una venta con `status` desconocido, una línea con `quantity: 0`, `totalCents: '100'`, una actividad sin `message`, una moneda desconocida, y `nextSaleNumber: 0`.

- [ ] **Paso 3: Implementar `schema.ts` y comprobar que pasan**

- [ ] **Paso 4: Escribir los tests de `database.ts` y comprobar que fallan**

| Caso | Esperado |
|---|---|
| Primer ingreso | `read()` devuelve los datos demo, `nexo:db` queda guardado, `mode: 'persistent'`, `notice: null` |
| Datos válidos guardados | Los devuelve sin llamar a `createSeed` |
| `update` | `read()` da el nuevo estado y otro store sobre el mismo almacenamiento también |
| `replace` | `read()` da el reemplazo y queda guardado |
| JSON inválido | Copia el texto a `nexo:db:backup`, carga los datos demo, `notice: 'recovered'` |
| JSON válido con un cliente sin nombre | Igual que JSON inválido |
| `version: 2` | Igual que JSON inválido |
| Falla la copia de respaldo | Igual carga los datos demo, sin lanzar errores |
| `setItem` lanza `new DOMException('lleno', 'QuotaExceededError')` en un `update` | `err('quota-exceeded')` y `read()` sin cambios |
| `setItem` lanza otro error en un `update` | `err('write-failed')` y `read()` sin cambios |
| `getStorage` lanza un error | `mode: 'memory'`, datos demo y `update` funciona |
| `getItem` lanza un error | `mode: 'memory'` y datos demo |
| `setItem` falla al guardar el primer ingreso | `mode: 'memory'` y datos demo |

- [ ] **Paso 5: Implementar `database.ts` y comprobar que pasan**

El estado en memoria cambia solo después de guardar con éxito. El error de cuota se reconoce por `name`: `QuotaExceededError` o `NS_ERROR_DOM_QUOTA_REACHED`.

- [ ] **Paso 6: Hacer commit**

Mensaje: `feat: guardar y recuperar datos en LocalStorage`.

### Task 8: Datos demo

**Archivos:**
- Crear: `src/data/seed.ts`
- Test: `src/data/seed.test.ts`

**Interfaces:**
- Consume: `calculateTotals`, `formatSaleNumber`, `isDatabase`, `compareWithPreviousMonth`, `isLowStock`, `isOutOfStock`.
- Produce: `createSeedDatabase(now: Date): Database`

**Valores:**
- 24 clientes, 32 productos con al menos 4 por categoría y exactamente 350 ventas, ordenadas de la más nueva a la más vieja.
- `number` del 1 al 350 en orden de fecha y `nextSaleNumber: 351`.
- Identificadores determinísticos: `customer-001`, `product-001`, `sale-0001`, `activity-001`. El diseño pide `crypto.randomUUID()` para los datos que se crean al usar la app; estos deben ser reproducibles.
- Cada venta tiene de 1 a 4 productos distintos, cantidades de 1 a 5, descuento elegido entre 0, 0, 0, 0, 5, 10 y 15, e IVA 21.
- Se anula una de cada 33 ventas, salvo las 3 más recientes. `cancelledAt` es una hora después de `createdAt`, sin superar `now`.
- Las 3 ventas más recientes son de 5, 10 y 15 minutos antes de `now`, sin caer antes del inicio del mes. El resto se reparte en los últimos 12 meses con `Math.pow(random(), 1.3)`, más densas cerca de hoy.
- Productos con nombres genéricos, sin marcas, y precios entre $8.000 y $2.500.000.
- Clientes con emails únicos en `example.com` y teléfonos `+54 11 5555-01NN`. Las empresas llevan la palabra "Demo", o quedan vacías.
- Actividad: una entrada por cada una de las 8 ventas más recientes, con el texto `Venta V-000350 registrada`.
- Configuración: "Usuario Demo", `demo@example.com`, "Administrador" y los valores iniciales de preferencias del diseño.
- El generador pseudoaleatorio es mulberry32 con semilla fija, y no se exporta.

- [ ] **Paso 1: Escribir los tests que fallan**

Con `now = new Date(2026, 10, 5, 12)`:

| Test | Esperado |
|---|---|
| Reproducibilidad | Dos llamadas con el mismo `now` dan datos idénticos |
| Estructura | `isDatabase` da `true` |
| Cantidades | 24 clientes, 32 productos, 350 ventas y `nextSaleNumber: 351` |
| Categorías | Cada una tiene al menos 4 productos |
| Referencias | Cada venta apunta a un cliente y productos existentes, con los datos copiados correctamente |
| Totales | `calculateTotals` sobre las líneas de cada venta da sus mismos importes |
| Orden | `sales[0].number` es 350, y las fechas bajan a la par que los números |
| Fechas | Ninguna es posterior a `now` ni anterior a 366 días; cada `cancelledAt` está entre `createdAt` y `now` |
| Anuladas | Más de 0 y hasta el 6 %; las 3 más recientes están completadas |
| Stock | Con umbral 5, al menos 3 productos con stock bajo y al menos 1 sin stock |
| Datos ficticios | Todos los emails terminan en `@example.com` y son únicos |
| Tamaño | `JSON.stringify` da menos de 1.000.000 de caracteres |
| Fechas relativas | Con `now` un mes después, la venta más reciente sigue siendo de hace 5 minutos |
| **Día 1 del mes** | Con `new Date(2026, 11, 1, 0, 2)`, `compareWithPreviousMonth(...).current.salesCount` es al menos 3 |

- [ ] **Paso 2: Comprobar que fallan**

Ejecutar `npm test`. Esperado: FAIL porque no existe `./seed`.

- [ ] **Paso 3: Implementar `src/data/seed.ts`**

- [ ] **Paso 4: Comprobar que pasan y hacer commit**

Ejecutar `npm test`. Esperado: todos aprobados. Mensaje: `feat: generar datos demo reproducibles`.

### Task 9: Cierre de la etapa

**Archivos:** ninguno, salvo correcciones que surjan.

**Interfaces:**
- Produce: la evidencia para cerrar la etapa.

- [ ] **Paso 1: Ejecutar todas las comprobaciones**

Ejecutar `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` y `npm run build`. Esperado: todas con código 0. El umbral de cobertura se exige recién en la Etapa 7, pero se informa el porcentaje real.

- [ ] **Paso 2: Comprobar que `domain` sigue siendo puro**

Buscar en `src/domain`, sin contar los tests: `document`, `window`, `localStorage`, `Date.now`, `new Date()` e importaciones desde `data`, `services`, `ui` o `views`. Esperado: sin resultados.

- [ ] **Paso 3: Revisar e informar**

Pedir una revisión independiente de la etapa contra este plan y el diseño, y corregir lo que corresponda.

El informe incluye la salida real de cada comprobación, los errores que aparecieron y cómo se resolvieron, y qué se construyó, con estos conceptos: funciones puras, inyección de dependencias, tipos unión, `Result`, redondeo con enteros, guardas de tipos y fechas locales y UTC. Cierra con la respuesta a "¿por qué guardás el dinero en centavos?" para una entrevista.

No se empieza la Etapa 2 sin la aprobación del autor.
