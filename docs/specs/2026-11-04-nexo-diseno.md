# NEXO: documento de diseño

- **Fecha:** 2026-11-04
- **Estado:** pendiente de revisión
- **Origen:** Master Development Brief y propuesta técnica aprobada

## 1. Objetivo

NEXO es una aplicación web demostrativa de gestión empresarial para un portfolio de Desarrollador Junior. No es un producto comercial. Funciona por completo en el navegador, con datos ficticios en LocalStorage.

**Criterios de éxito:**

1. Se ve como un SaaS profesional y no como una plantilla.
2. Todos los módulos funcionan de verdad: ningún botón es decorativo.
3. No hay errores de TypeScript y los tests pasan al ejecutarlos.
4. El autor puede explicar y defender cada decisión en una entrevista.

## 2. Alcance

**Incluye:** acceso demo, Dashboard, Clientes, Productos, Ventas (con anulación), Reportes, Configuración, tests con Vitest, preparación para Docker y Cloud Run, README con capturas reales y guía de entrevista.

**No incluye:** tema claro, backend, autenticación real, conversión de monedas, gestión de categorías, búsqueda global, notificaciones, exportar CSV, tests end-to-end ni GitHub Actions.

## 3. Stack

Versiones comprobadas en npm el 2026-11-04. Se instalan con versión exacta y se fijan con `package-lock.json`.

| Paquete | Versión | Tipo | Uso |
|---|---|---|---|
| `bootstrap` | 5.3.8 | Producción | Grilla, modales, menús, offcanvas |
| `@popperjs/core` | 2.11.8 | Producción | Requerido por Bootstrap |
| `bootstrap-icons` | 1.13.2 | Producción | Iconos SVG individuales |
| `chart.js` | 4.6.1 | Producción | Gráficos |
| `@fontsource-variable/geist` | 5.3.0 | Producción | Tipografía servida desde la app |
| `vite` | 8.3.5 | Desarrollo | Servidor local y build |
| `typescript` | 6.0.3 | Desarrollo | Chequeo de tipos en modo estricto |
| `sass` | 1.107.1 | Desarrollo | Compilar SCSS |
| `vitest` | 5.1.0 | Desarrollo | Tests |
| `@vitest/coverage-v8` | 5.1.0 | Desarrollo | Cobertura |
| `eslint` | 10.14.0 | Desarrollo | Análisis de código |
| `typescript-eslint` | 8.72.1 | Desarrollo | Reglas de ESLint para TypeScript |
| `prettier` | 3.9.10 | Desarrollo | Formato uniforme |
| `@types/bootstrap` | 5.2.11 | Desarrollo | Tipos de los módulos de Bootstrap |

**Restricciones comprobadas:**

- `typescript-eslint` 8.72.1 exige TypeScript menor a 6.1. Por eso se usa 6.0.3 y no 7.0.2.
- Node 26.13 cumple los requisitos de Vite y Vitest. El proyecto declara `"engines": { "node": ">=26" }` y la imagen Docker usa `node:26-alpine`.
- Bootstrap 5.3.8 compila con Sass 1.107.1, con 21 avisos de deprecación. Bajan a 0 con `quietDeps` y silenciando `import`. La importación parcial se comprueba en la Etapa 0.
- `@types/bootstrap` describe Bootstrap 5.2. Solo se usan Modal, Dropdown, Offcanvas y Toast.
- `npm audit --omit=dev` informa 0 vulnerabilidades. `npm audit` informa 9 moderadas con una sola causa, `minimatch` (GHSA-g3hv-75wg-m249), usada por ESLint y `typescript-eslint` solo durante el desarrollo. El riesgo se acepta, porque `npm audit fix --force` bajaría a versiones anteriores de esas herramientas. Se revisa de nuevo en la Etapa 8.

**No hacen falta variables de entorno.** La app no tiene secretos, y todo lo que empieza con `VITE_` queda visible en el navegador.

**Herramientas externas:** Git 2.56 está instalado y falta configurar la identidad. Docker y gcloud se instalan recién en la Etapa 8.

## 4. Arquitectura

SPA en TypeScript sin framework, con cuatro capas:

```text
views/ + ui/      Pantallas, componentes y eventos del usuario
     │
services/         Casos de uso: "registrar venta"
     │
     ├── domain/  Reglas puras: tipos, cálculos, validaciones
     └── data/    Persistencia en LocalStorage
```

**Reglas de dependencia:**

- `domain` no importa nada de las otras capas, ni usa el DOM, LocalStorage o `Date.now()`. La fecha actual se recibe como parámetro.
- `data` conoce solo a `domain`.
- `services` usa `domain` y `data`, y recibe sus dependencias por parámetro (`database`, `generateId`, `now`).
- `views` y `ui` solo modifican datos a través de `services`.
- `main.ts` crea las dependencias reales y las conecta.

**Flujo al registrar una venta:**

1. La vista envía los datos del formulario a `salesService.register()`.
2. El servicio valida y calcula con funciones de `domain`.
3. El servicio arma el nuevo estado: venta, stock, actividad y número siguiente.
4. `database.update()` guarda todo en una sola escritura.
5. La vista recibe un `Result`: si salió bien, muestra un aviso y navega al historial; si falló, muestra los errores.

**Resultado de las operaciones:** los errores esperables no lanzan excepciones. Se devuelven con un tipo explícito:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

**Ciclo de vida de las vistas:** cada vista recibe un `ViewContext` con su contenedor y una señal `AbortSignal`, y puede devolver una función de limpieza. Al navegar, el router aborta la señal (lo que quita los eventos registrados con ella), ejecuta la limpieza (que destruye los gráficos) y monta la vista siguiente.

**Router:** usa la History API y rutas estáticas, sin parámetros ni query strings. La decisión se aísla en una función pura `resolveRoute(path, isAuthenticated)`. Al navegar actualiza `document.title`, sube al inicio de la página y mueve el foco al título.

### Estructura de carpetas

```text
Proyecto/
├── index.html
├── package.json · package-lock.json
├── tsconfig.json · vite.config.ts · eslint.config.js · .prettierrc
├── Dockerfile · .dockerignore · .gitignore · .gitattributes · README.md
├── deploy/nginx.conf
├── docs/
│   ├── specs/                  # Documentos de diseño
│   ├── plans/                  # Planes de cada etapa
│   ├── screenshots/            # Capturas reales
│   └── guia-entrevista.md
├── public/favicon.svg
└── src/
    ├── main.ts                 # Punto de entrada: conecta las dependencias
    ├── app/                    # router, routes, session, shell
    ├── domain/
    │   ├── types.ts · result.ts
    │   ├── money.ts · sales.ts · stock.ts
    │   ├── reports.ts · list.ts
    │   ├── activity.ts
    │   └── validation/         # rules, customer, product, sale, settings
    ├── data/
    │   ├── schema.ts           # Comprueba la estructura de los datos guardados
    │   ├── database.ts         # Lee, valida, guarda y maneja errores
    │   └── seed.ts             # Datos ficticios
    ├── services/               # customers, products, sales, settings
    ├── testing/                # Utilidades que solo usan los tests
    ├── ui/
    │   ├── html.ts             # Plantillas con escape automático
    │   ├── icons.ts · format.ts
    │   └── components/         # data-table, form-field, modal, confirm-dialog,
    │                           # toast, stat-card, chart, empty-state
    ├── views/                  # login, dashboard, customers, products,
    │                           # sales, reports, settings, not-found
    └── styles/                 # main, _tokens, _bootstrap, layout/, components/, views/
```

Los tests (`*.test.ts`) van al lado del archivo que prueban.

## 5. Modelo de datos

Los importes son enteros en centavos. Las fechas se guardan como texto ISO en UTC y se muestran en la zona horaria del navegador. Los identificadores se generan con `crypto.randomUUID()`.

```ts
const PRODUCT_CATEGORIES = [
  'Computación', 'Periféricos', 'Redes', 'Almacenamiento', 'Accesorios',
] as const;
type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
type PaymentMethod = 'cash' | 'card' | 'transfer';
type SaleStatus = 'completed' | 'cancelled';

interface Customer {
  id: string; name: string; email: string;
  phone: string; company: string;
  createdAt: string; updatedAt: string;
}

interface Product {
  id: string; name: string; sku: string;
  category: ProductCategory;
  priceCents: number; stock: number;
  createdAt: string; updatedAt: string;
}

// Copia de los datos del producto al momento de vender.
interface SaleItem {
  productId: string; productName: string; sku: string;
  category: ProductCategory;
  unitPriceCents: number; quantity: number;
}

interface Sale {
  id: string; number: number;
  customerId: string; customerName: string;
  items: readonly SaleItem[];
  paymentMethod: PaymentMethod;
  discountPercent: number; taxPercent: number;
  subtotalCents: number; discountCents: number;
  taxCents: number; totalCents: number;
  status: SaleStatus;
  createdAt: string; cancelledAt: string | null;
}

interface ActivityEntry {
  id: string;
  type: 'customer' | 'product' | 'sale' | 'settings' | 'data';
  message: string;
  createdAt: string;
}

interface Settings {
  profile: { displayName: string; email: string; role: string };
  preferences: {
    currency: 'ARS' | 'USD' | 'EUR';
    taxPercent: number;
    lowStockThreshold: number;
    tableDensity: 'comfortable' | 'compact';
    accent: 'violet' | 'blue';
  };
}

interface Database {
  version: 1;
  customers: readonly Customer[];
  products: readonly Product[];
  sales: readonly Sale[];
  activity: readonly ActivityEntry[];
  settings: Settings;
  nextSaleNumber: number;
}
```

**Valores iniciales:** perfil ficticio "Usuario Demo" (`demo@example.com`, Administrador), ARS, IVA 21 %, stock bajo en 5 unidades, densidad cómoda y acento violeta.

## 6. Reglas de negocio

### Cálculo de una venta

```text
subtotal  = suma de (precio unitario × cantidad)
descuento = redondear(subtotal × descuento% / 100)
base      = subtotal - descuento
IVA       = redondear(base × IVA% / 100)
total     = base + IVA
```

El descuento se aplica antes del IVA. Cada importe se redondea al centavo más cercano y las mitades hacia arriba.

### Validaciones

Todos los textos se recortan antes de validar.

| Entidad | Campo | Obligatorio | Regla |
|---|---|---|---|
| Cliente | `name` | Sí | 2 a 80 caracteres |
| Cliente | `email` | Sí | Formato válido, máximo 120, único sin distinguir mayúsculas; se guarda en minúsculas |
| Cliente | `phone` | No | 6 a 20 caracteres: dígitos, espacios, `+`, `-`, `(` y `)` |
| Cliente | `company` | No | Máximo 80 caracteres |
| Producto | `name` | Sí | 2 a 80 caracteres |
| Producto | `sku` | Sí | 3 a 20 caracteres: letras, dígitos y guiones; único; se guarda en mayúsculas |
| Producto | `category` | Sí | Una de las categorías fijas |
| Producto | precio | Sí | Mayor que 0, máximo 2 decimales y 99.999.999,99; acepta coma o punto |
| Producto | `stock` | Sí | Entero de 0 a 999.999 |
| Venta | cliente | Sí | Debe existir |
| Venta | líneas | Sí | Al menos una, sin productos repetidos |
| Venta | cantidad | Sí | Entero de 1 a 9.999, sin superar el stock disponible |
| Venta | descuento | Sí | Entero de 0 a 100 |
| Venta | medio de pago | Sí | `cash`, `card` o `transfer` |
| Perfil | `displayName` | Sí | 2 a 60 caracteres |
| Perfil | `email` | Sí | Formato válido, máximo 120 |
| Perfil | `role` | No | Máximo 60 caracteres |
| Preferencias | `taxPercent` | Sí | De 0 a 100, máximo 2 decimales |
| Preferencias | `lowStockThreshold` | Sí | Entero de 0 a 1.000 |

### Stock y anulación

- Registrar una venta descuenta el stock de cada línea, y este nunca queda negativo.
- Si una línea no tiene stock suficiente, la venta entera se rechaza y no se guarda nada.
- Anular una venta cambia su estado a `cancelled`, guarda la fecha y devuelve el stock de los productos que aún existen.
- Una venta ya anulada no se puede anular de nuevo.
- Las ventas no se eliminan.

### Eliminación

Borrar un cliente o producto pide confirmación y siempre es posible. Las ventas conservan su copia de nombre, SKU, categoría y precio, por lo que el historial no cambia.

### Métricas

Las ventas anuladas no cuentan en ninguna métrica.

| Métrica | Definición |
|---|---|
| Ingresos | Suma de `totalCents`, con descuento e IVA incluidos |
| Ventas | Cantidad de ventas completadas |
| Ticket promedio | Ingresos dividido ventas; 0 si no hay ventas |
| Unidades vendidas | Suma de las cantidades |
| Ventas brutas | Precio × cantidad de cada línea, antes de descuento e IVA; se usa por categoría y producto |
| Stock bajo | Productos con stock menor o igual al umbral configurado |

**Comparación mensual del Dashboard:** el mes actual hasta hoy contra los mismos días transcurridos del mes anterior, o hasta su último día si es más corto. Si el mes anterior no tiene datos, se muestra "Sin datos previos".

**Períodos:** se calculan en la zona horaria del navegador e incluyen el día de hoy.

**Cambiar la moneda** solo cambia el formato de todos los importes, incluso los históricos. No convierte valores.

## 7. Persistencia y errores

Todo el estado se guarda como JSON en una sola clave, `nexo:db`. Así, una venta y su cambio de stock se escriben juntos.

```ts
type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface DatabaseStore {
  read(): Database;
  update(change: (current: Database) => Database): Result<Database, StorageFailure>;
  replace(next: Database): Result<Database, StorageFailure>;
  readonly mode: 'persistent' | 'memory';
  readonly notice: 'recovered' | null;
}
```

| Situación | Comportamiento |
|---|---|
| Primer ingreso | Se generan los datos demo con fechas relativas a hoy |
| JSON inválido o estructura incorrecta | Se intenta copiar el dato a `nexo:db:backup`, se cargan datos demo y se avisa |
| `version` desconocida | Mismo tratamiento que un dato inválido |
| Almacenamiento lleno al guardar | El estado en memoria no cambia y se muestra un error |
| Almacenamiento del navegador bloqueado | Datos y sesión funcionan en memoria, con un aviso visible: los cambios se pierden al recargar |
| Error inesperado | Se registra en consola y se muestra un mensaje genérico, sin detalles técnicos |
| Error al montar una vista | Vista de error con un botón para recargar |

**Limitación documentada:** con dos pestañas abiertas, la última escritura gana.

### Datos demo

- Generados con un generador pseudoaleatorio con semilla fija, para que sean reproducibles.
- 24 clientes, 32 productos y unas 350 ventas repartidas en los últimos 12 meses.
- Alrededor del 3 % de las ventas están anuladas, y hay productos con stock bajo y sin stock.
- Los totales se calculan con las mismas funciones de `domain`; nunca se escriben a mano.
- Son datos claramente ficticios: emails en `example.com`, sin personas ni empresas reales.
- "Restaurar datos demo" los vuelve a generar con la fecha actual, previa confirmación.

## 8. Módulos y rutas

| Ruta | Vista | Acceso |
|---|---|---|
| `/login` | Acceso demo | Solo sin sesión |
| `/` | Redirige a `/dashboard` | Con sesión |
| `/dashboard` | Dashboard | Con sesión |
| `/clientes` | Clientes | Con sesión |
| `/productos` | Productos | Con sesión |
| `/ventas` | Historial | Con sesión |
| `/ventas/nueva` | Nueva venta | Con sesión |
| `/reportes` | Reportes | Con sesión |
| `/configuracion` | Configuración | Con sesión |
| Cualquier otra | Página no encontrada | Con sesión |

Sin sesión, toda ruta redirige a `/login`. Con sesión, `/login` redirige a `/dashboard`.

**Acceso demo:** presenta la marca, explica que los datos son ficticios y solo se guardan en el navegador, y ofrece el botón "Entrar a la demo". No hay campos de usuario ni contraseña. La sesión se guarda en `sessionStorage`, y el menú de usuario permite cerrarla.

**Estructura general:** menú lateral fijo desde 992 px y offcanvas por debajo. La barra superior muestra el título de la página y el menú de usuario (Configuración y Cerrar sesión).

**Dashboard:**
- Tarjetas: ingresos, ventas y ticket promedio del mes con comparación, más productos con stock bajo.
- Gráficos: ingresos de los últimos 30 días y ventas brutas por categoría del mes.
- Listas: las 8 actividades más recientes y hasta 5 productos con stock bajo.

**Clientes:** crear, editar y eliminar en modales, con búsqueda por nombre, email y empresa, orden por columnas y páginas de 10 filas. El orden inicial es por nombre.

**Productos:** crear, editar y eliminar en modales, con búsqueda por nombre y SKU, filtros por categoría y por stock bajo, orden por columnas y páginas de 10 filas. El orden inicial es por nombre. Las etiquetas indican "Stock bajo" o "Sin stock".

**Ventas:**
- *Nueva venta:* elegir cliente, agregar productos con cantidad, descuento y medio de pago. Los totales y el stock disponible se actualizan en vivo.
- *Historial:* búsqueda por número y cliente, filtros por estado y rango de fechas, y páginas de 10 filas, con las ventas más recientes primero. El número se muestra como `V-000123`.
- *Detalle:* un modal muestra las líneas y permite anular la venta, previa confirmación.

**Reportes:** selector de 7, 30 o 90 días o 12 meses, con ingresos, ventas, ticket promedio y unidades.
- *Agrupación del gráfico de ingresos:* por día para 7 y 30 días, por semana de lunes a domingo para 90 días y por mes para 12 meses. "12 meses" incluye el mes actual y los 11 anteriores.
- *Otros gráficos:* ventas brutas por categoría y los 5 productos con más unidades.
- *Tabla:* los 5 clientes con más ingresos, agrupados por `customerId` para que un cliente borrado siga contando.

**Configuración:** perfil (nombre, email y rol), preferencias (moneda, IVA, umbral de stock, densidad de tablas y acento) y "Restaurar datos demo".

**Actividad:** se registra al crear, editar o eliminar clientes y productos, al registrar o anular ventas, al cambiar la configuración y al restaurar los datos. Se conservan las últimas 100 entradas.

**Formularios:** validan al enviar y revalidan al escribir después del primer intento. Los errores aparecen junto al campo y el foco va al primer campo inválido.

**Tablas responsive:** por debajo de 768 px, cada fila se muestra como una tarjeta.

## 9. Sistema de diseño

**Principios:** Bootstrap aporta grilla, modales y comportamiento. La identidad sale de tokens propios (`--nx-*`) y componentes con prefijo `nx-`. Sin degradados decorativos ni efecto vidrio.

**Valores iniciales.** El contraste se mide en la Etapa 2 y estos valores pueden ajustarse:

| Token | Valor | Uso |
|---|---|---|
| Fondo | `#0A0D14` | Página |
| Superficie 1 | `#141823` | Tarjetas, tablas, menú lateral |
| Superficie 2 | `#1B2130` | Elementos elevados y hover |
| Borde | `rgba(255, 255, 255, 0.08)` | Separadores |
| Texto | `#E8EAF0` | Texto principal |
| Texto secundario | `#9AA3B5` | Etiquetas y ayudas |
| Violeta 500 | `#7450FF` | Acción principal con texto blanco |
| Violeta 300 | `#A78FFF` | Selección, enlaces e iconos activos |
| Azul eléctrico | `#2E9BFF` | Datos, gráficos e información |
| Éxito | `#2FBF8F` | Estado positivo |
| Advertencia | `#E8A33D` | Stock bajo |
| Peligro | `#F0616D` | Errores y acciones destructivas |

**Tipografía:** Geist, con números tabulares en tablas y métricas. Base de 14 px, escala de 12, 13, 14, 16, 20, 24 y 32 px y pesos 400, 500 y 600. En móvil, los campos usan 16 px para evitar el zoom automático de iOS.

**Forma:** espaciado en múltiplos de 4 px, radio de 8 px, bordes de 1 px y sombras solo en elementos flotantes.

**Iconos:** SVG individuales de `bootstrap-icons`, importados de uno en uno para incluir solo los usados.

**Interacción:** todos los elementos interactivos tienen estados hover, focus y active. Las transiciones duran entre 120 y 180 ms y se reducen con `prefers-reduced-motion`.

**Accesibilidad:**
- Contraste AA: 4,5:1 para texto normal.
- Uso completo con teclado y foco siempre visible.
- Campos con etiqueta, y errores asociados con `aria-describedby`.
- Avisos con `aria-live`.
- Gráficos con una descripción textual.

**Responsive:** se revisa en 375, 768, 1280 y 1920 px, sin scroll horizontal en la página.

## 10. Seguridad

- **XSS:** la plantilla `html` escapa todo dato interpolado, salvo los fragmentos ya marcados como seguros. Los atributos siempre van entre comillas y no se interpolan datos del usuario en `href` ni `src`.
- **Eventos:** sin atributos `onclick`; se usa delegación con `data-action`.
- **Datos:** no se piden contraseñas ni datos sensibles, y el README advierte que LocalStorage no está cifrado.
- **Dependencias:** `npm audit` se ejecuta en las Etapas 0 y 8 y se informa el resultado.
- **Cabeceras en producción:**

```text
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self';
  img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none';
  form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

Para respetar esa política, las plantillas no usan atributos `style`. Los valores dinámicos se asignan desde TypeScript con `element.style`. La misma política se configura en `preview.headers` de Vite, para probar el build sin Docker.

## 11. Testing

Los tests corren en el entorno Node de Vitest, sin navegador y con la zona horaria fija en `America/Argentina/Buenos_Aires`. El almacenamiento se reemplaza con una implementación en memoria.

| Archivo | Qué comprueba |
|---|---|
| `domain/money.test.ts` | Conversión a centavos, coma y punto, formatos inválidos, redondeo |
| `domain/sales.test.ts` | Subtotal, descuento, IVA, total, bordes en 0 % y 100 % |
| `domain/stock.test.ts` | Descuento, rechazo por stock insuficiente, restauración, producto borrado |
| `domain/reports.test.ts` | Métricas, períodos, ventas anuladas excluidas, comparación mensual |
| `domain/list.test.ts` | Búsqueda, orden y paginación |
| `domain/validation/*.test.ts` | Reglas de cliente, producto, venta y configuración |
| `data/schema.test.ts` | Estructura válida y datos dañados con JSON válido |
| `data/database.test.ts` | Primer ingreso, datos corruptos, versión desconocida, almacenamiento lleno o bloqueado |
| `data/seed.test.ts` | Reproducibilidad, referencias válidas, totales correctos, tamaño menor a 1.000.000 de caracteres |
| `services/customers.test.ts` | Crear, editar, eliminar, buscar y email duplicado |
| `services/products.test.ts` | Crear, editar, eliminar, filtrar y SKU duplicado |
| `services/sales.test.ts` | Registrar, stock insuficiente sin cambios parciales, anular, doble anulación, historial tras borrar datos |
| `services/settings.test.ts` | Actualizar perfil y preferencias, validaciones y restauración de datos demo |
| `ui/html.test.ts` | Escape de caracteres peligrosos, fragmentos seguros, listas y valores vacíos |
| `app/routes.test.ts` | Redirecciones según sesión y ruta desconocida |

**Cobertura exigida:** al menos 80 % de líneas en `domain`, `services` y `data`. Se controla con `npm run test:coverage` desde el cierre de la Etapa 7. Las vistas se verifican en el navegador.

**Calidad de código:** TypeScript en modo `strict` y con `allowUnreachableCode: false`. En ESLint, la regla `no-explicit-any` como error para evitar `any`, y además `no-cond-assign`, `no-constant-condition`, `no-debugger` y `no-empty`.

## 12. Despliegue

**Imagen en dos etapas:** `node:26-alpine` ejecuta `npm ci` y `npm run build`. Después, `nginxinc/nginx-unprivileged:alpine` sirve `dist/` en el puerto 8080, sin usuario root.

**nginx:**
- Cualquier ruta de la SPA sirve `index.html`, para que recargar `/clientes` funcione.
- Un archivo inexistente dentro de `/assets/` devuelve 404.
- `/assets/*` usa `Cache-Control: public, max-age=31536000, immutable`, porque esos nombres incluyen un hash.
- `index.html` usa `Cache-Control: no-cache`.
- Las cabeceras de seguridad se aplican a todas las respuestas.

**Comando de despliegue previsto.** Se confirma contra la documentación vigente en la Etapa 8. Lo ejecuta el autor con su cuenta:

```bash
gcloud run deploy nexo --source . --region southamerica-east1 --allow-unauthenticated --port 8080 --memory 256Mi --max-instances 1
```

Requisitos: un proyecto de Google Cloud con facturación activa. Se recomienda una alerta de presupuesto.

El despliegue solo se considera hecho cuando la URL pública responde y se prueba una recarga en `/clientes`.

## 13. Etapas

Una etapa termina cuando pasan `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`, se prueba en el navegador lo que corresponda y el autor da su OK. En la Etapa 0 también se crean y comprueban esos scripts.

| # | Etapa | Terminada cuando |
|---|---|---|
| 0 | Cimientos | Repositorio iniciado, cadena de herramientas funcionando, importación parcial de Bootstrap comprobada y `npm audit` informado |
| 1 | Dominio y datos | `domain` y `data` implementados con sus tests |
| 2 | Diseño y estructura | Tokens, componentes base, menú, router y acceso demo, con **aprobación visual del autor** |
| 3 | Clientes | Módulo completo, con tabla y formulario reutilizables |
| 4 | Productos | Módulo completo usando esos mismos componentes |
| 5 | Ventas | Registro, historial, detalle y anulación con stock correcto |
| 6 | Dashboard y Reportes | Métricas y gráficos calculados desde los datos guardados |
| 7 | Configuración y pulido | Preferencias aplicadas de verdad, estados vacíos y de error, revisión responsive y de accesibilidad |
| 8 | Docker y Cloud Run | Dockerfile y nginx listos, cabeceras comprobadas y guía escrita en el README. La imagen se prueba si Docker está disponible |
| 9 | README y entrevista | README completo, capturas de la app real y guía de entrevista |

Cada etapa tiene su propio plan detallado, escrito justo antes de empezarla.

**El README incluye:** descripción, tecnologías, características, instalación, ejecución local, pruebas, despliegue, capturas y arquitectura general.

## 14. Aprendizaje

En cada etapa se explica qué se construyó, los conceptos usados, las funciones importantes y cómo se resolvieron los errores que aparecieron.

`docs/guia-entrevista.md` incluye: cómo presentar el proyecto en dos minutos, las decisiones técnicas con sus alternativas, preguntas probables con respuestas y limitaciones conocidas con cómo se resolverían en un producto real.
