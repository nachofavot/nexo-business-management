# Guía de entrevista: NEXO

Esta guía es para preparar una entrevista sobre NEXO. Cada decisión y cada respuesta nombra el archivo o el plan que la respalda: antes de decir algo, conviene abrirlo y poder explicarlo con tus palabras. Los números (tests, cobertura y tamaños) son del 9 de noviembre de 2026.

## 1. El proyecto en dos minutos

Para decir en voz alta, sin leer:

> NEXO es una aplicación web de gestión para un negocio chico: clientes, productos, ventas y reportes. La hice como proyecto de portfolio, así que no tiene servidor: los datos son ficticios, se generan al entrar y se guardan en el navegador.
>
> La armé con TypeScript sin framework, a propósito. Quería mostrar que entiendo lo que un framework resuelve por mí: un router con la History API, una plantilla HTML que escapa los datos para evitar XSS y una forma ordenada de montar y desmontar pantallas.
>
> Hay tres decisiones de las que puedo hablar con detalle. La primera: el código está en capas, y las reglas del negocio (totales, IVA, stock) son funciones puras que no tocan el navegador. Por eso se prueban en Node: solo el dominio tiene unos 300 tests, y la suite completa, unos 1000, corre en un par de segundos. La segunda: el dinero se guarda en centavos y los porcentajes se calculan con enteros, porque con decimales el 1,13 % de 50 pesos da 56 centavos en lugar de 57. La tercera: la app tiene una Content-Security-Policy estricta, y eso me obligó a no escribir estilos dentro del HTML.
>
> Trabajé por etapas con un asistente de IA: cada etapa tuvo un plan que yo aprobaba, tests escritos antes del código, pruebas en el navegador desde que hubo pantallas y una revisión final hecha por otra sesión de IA, con instrucciones de buscar errores. Esas revisiones encontraron errores reales, como un "Cancelar" que podía borrar un cliente si se apretaba durante la animación del diálogo.
>
> También preparé el despliegue: una imagen Docker con nginx sin permisos de administrador, lista para Cloud Run, y un script que comprueba cualquier despliegue. La imagen la probé con Docker: corre sin permisos de administrador, sirve la app y pasa el script. Lo que falta es publicarla.

## 2. Decisiones técnicas con sus alternativas

### Sin framework, con una plantilla que escapa los datos

- **Decisión:** TypeScript sin framework. Las pantallas se arman con una plantilla `html` que escapa todo dato interpolado (`&`, `<`, `>`, `"` y `'`), salvo otros fragmentos ya marcados como seguros.
- **Alternativa:** React o Vue, que escapan solos y manejan el estado de la pantalla.
- **Por qué:** con ocho pantallas, un framework no era necesario, y sin él se ve cómo se resuelve cada cosa: el router, el ciclo de vida de una pantalla y la protección contra XSS. El costo es escribir a mano lo que un framework trae, como volver a dibujar solo una parte de la pantalla.
- **Dónde:** [`src/ui/html.ts`](../src/ui/html.ts), [`src/app/router.ts`](../src/app/router.ts), [`src/app/view.ts`](../src/app/view.ts).

### Una sola clave de LocalStorage

- **Decisión:** toda la base es un JSON en la clave `nexo:db`. Se cambia con `update` (una función recibe el estado y devuelve el nuevo) o con `replace` (el estado nuevo completo). Antes de escribir se valida la estructura con `isDatabase`, y la memoria cambia solo si la escritura salió bien.
- **Alternativa:** una clave por colección (clientes, productos, ventas), o IndexedDB, la base de datos del navegador para volúmenes más grandes.
- **Por qué:** una venta cambia la venta, el stock y la actividad. En una sola clave, eso se escribe de una vez: queda todo o nada. Si el almacenamiento está lleno o falla al escribir, no cambia nada y se avisa. Si el navegador no deja usar LocalStorage desde el principio, la app funciona en memoria y lo avisa con un cartel.
- **Por qué Ventas usa `replace`:** `validateSale` y `decreaseStock` pueden devolver errores del dominio, y la función que recibe `update` no tiene cómo devolverlos. Entonces el servicio lee una vez, valida, arma el estado nuevo y lo guarda con `replace`.
- **Dónde:** [`src/data/database.ts`](../src/data/database.ts), [`src/data/schema.ts`](../src/data/schema.ts), [`src/services/sales.ts`](../src/services/sales.ts).

### Dinero en centavos y porcentajes con enteros

- **Decisión:** los importes son enteros en centavos. `parseMoneyToCents` lee el texto que escribe el usuario sin pasar por decimales, y `percentOfCents` calcula descuento e IVA con `BigInt`, redondeando las mitades hacia arriba.
- **Alternativa:** guardar decimales y redondear al mostrar, o usar una biblioteca de decimales.
- **Por qué:** `19.99 * 100` da `1998.9999999999998`, y `5000 * 1.13` da `5649.999999999999`: el 1,13 % de 5000 centavos redondearía a 56 en lugar de 57. `BigInt` hace falta porque centavos × centésimos de porcentaje, con importes grandes, pasa el entero más grande que JavaScript representa exacto.
- **Dónde:** [`src/domain/money.ts`](../src/domain/money.ts).

### `Result` en lugar de excepciones

- **Decisión:** los errores esperables se devuelven: `{ ok: true, value }` o `{ ok: false, error }`, con el tipo de falla (`validation`, `not-found` o `storage`).
- **Alternativa:** lanzar excepciones y atraparlas en la pantalla.
- **Por qué:** TypeScript obliga a mirar el error antes de usar el valor, y cada pantalla sabe qué mostrar: los errores de validación junto al campo y los de almacenamiento en un aviso. Las excepciones quedan para lo que no se espera.
- **Dónde:** [`src/domain/result.ts`](../src/domain/result.ts), [`src/services/types.ts`](../src/services/types.ts).

### Fechas locales

- **Decisión:** el texto de un campo de fecha se lee con `parseDateInput`, que arma la medianoche local, y "hasta" usa `endOfDay`.
- **Alternativa:** `new Date('2026-11-05')`.
- **Por qué:** ese constructor interpreta la fecha en UTC, que en Argentina es el 4 a las 21:00. Además, `new Date(2026, 1, 30)` no falla: pasa al 2 de marzo, así que `parseDateInput` comprueba que el día exista.
- **Dónde:** [`src/domain/dates.ts`](../src/domain/dates.ts). Los tests corren con la zona horaria de Buenos Aires, en [`vite.config.ts`](../vite.config.ts).

### Los gráficos solo dibujan

- **Decisión:** las series y los totales se calculan en el dominio y tienen tests. Chart.js recibe los puntos ya calculados y se importa por partes: solo los dos tipos de gráfico que se usan.
- **Alternativa:** calcular dentro de la configuración del gráfico, e importar Chart.js entero.
- **Por qué:** un cálculo dentro del gráfico no se puede probar sin navegador. Chart.js, importado por partes, sumó unos 62 kB comprimidos: el JS de la app pasó de 43 a 105 kB (hoy es de 108 kB). No se midió cuánto pesaría importado entero.
- **Accesibilidad:** un canvas es una imagen para un lector de pantalla. Cada gráfico tiene un resumen escrito ("Computación encabeza con…") y un desplegable "Ver los datos" con la tabla, que se recorre con el teclado.
- **Dónde:** [`src/domain/reports.ts`](../src/domain/reports.ts), [`src/ui/charts/config.ts`](../src/ui/charts/config.ts), [`src/ui/charts/mount.ts`](../src/ui/charts/mount.ts), [`src/ui/charts/figure.ts`](../src/ui/charts/figure.ts).

### Content-Security-Policy estricta

- **Decisión:** `script-src 'self'` y `style-src 'self'`, sin `unsafe-inline`. No hay atributos `style` ni `onclick` en el HTML: los eventos se registran con delegación (un solo listener en un contenedor, que mira el `data-action` del elemento tocado).
- **Alternativa:** una CSP más permisiva, o ninguna.
- **Por qué:** si alguien lograra inyectar HTML, el navegador no ejecutaría scripts ni estilos que no vengan del sitio. Ojo con un detalle: `style-src 'self'` bloquea el atributo `style` escrito en el HTML, pero no `element.style` desde JavaScript. Por eso el indicador del menú se mueve con `element.style`.
- **Dónde:** [`deploy/security-headers.ts`](../deploy/security-headers.ts), [`src/app/shell.ts`](../src/app/shell.ts).

### El color de acento con un atributo

- **Decisión:** las preferencias de acento y densidad se escriben como `data-accent` y `data-density` en `<html>`, y el CSS cambia variables según ese atributo. Guardar sin cambios no escribe ni registra actividad (`hasChanges`).
- **Alternativa:** cambiar estilos elemento por elemento desde JavaScript.
- **Por qué:** los colores viven solo en el CSS, y un atributo alcanza para que cambie toda la app, sin recorrer elementos. Que guardar sin cambios no escriba evita una actividad que no dice nada.
- **Dónde:** [`src/ui/appearance.ts`](../src/ui/appearance.ts), [`src/styles/_tokens.scss`](../src/styles/_tokens.scss), [`src/services/types.ts`](../src/services/types.ts).

### Bootstrap parcial

- **Decisión:** de Bootstrap se importan la grilla, los formularios y el comportamiento de modales, menús, avisos y menú lateral. Los botones, tablas y tarjetas son componentes propios, con la clase `nx-`.
- **Alternativa:** Bootstrap completo, o ninguna biblioteca.
- **Por qué:** modales accesibles y bien hechos llevan mucho trabajo, y Bootstrap ya lo resuelve. El aspecto visual, en cambio, tenía que ser propio.
- **Dónde:** [`src/styles/_bootstrap.scss`](../src/styles/_bootstrap.scss), [`src/styles/components/`](../src/styles/components/).

### Tests sin navegador

- **Decisión:** los tests corren en Node, sin DOM. Lo que necesita el navegador (montar un gráfico, abrir un modal) se separa de las funciones puras, que son las que se prueban. Cada cambio de lógica empezó con un test que fallaba (TDD); los estilos, las capturas y la documentación no.
- **Alternativa:** tests con un DOM simulado (jsdom) o tests de punta a punta automatizados.
- **Por qué:** son rápidos y prueban las reglas del negocio sin depender del navegador. Para medir si los tests protegen de verdad, de la Etapa 2 a la 7 se rompieron condiciones a propósito (mutaciones): si ningún test fallaba, faltaba un test. En la Etapa 8 se hizo lo mismo con la configuración de nginx. La cobertura exige un mínimo de 80 % de líneas en `domain`, `services` y `data`, y hoy está en 100 %, 99,24 % y 100 %.
- **Dónde:** [`vite.config.ts`](../vite.config.ts) y las secciones "Decisiones tomadas al ejecutar el plan" de [`docs/plans/`](plans/).

### Docker y nginx

- **Decisión:** imagen en dos etapas: Node compila y la imagen final tiene solo nginx sin root y los archivos compilados. nginx devuelve `index.html` en cualquier ruta de la app, guarda un año los archivos con hash y vuelve a pedir `index.html` en cada visita.
- **Alternativa:** servir con Node, o una sola etapa con todo adentro.
- **Por qué:** la imagen final no lleva Node ni las dependencias de desarrollo, y nginx no corre como administrador.
- **Dos detalles de nginx:**
  - Las cabeceras de seguridad se incluyen en cada `location` (el bloque que dice qué hacer con un grupo de rutas), porque un `add_header` dentro de un `location` anula las del bloque de arriba.
  - El `Cache-Control` de un año va sin `always`, para que un 404 no quede guardado un año.
- **Dónde:** [`Dockerfile`](../Dockerfile), [`deploy/nginx.conf`](../deploy/nginx.conf), [`deploy/nginx-config.test.ts`](../deploy/nginx-config.test.ts).

## 3. Errores que aparecieron y cómo se resolvieron

Buenas historias para "contame de un problema difícil":

1. **"Cancelar" que borraba.** Bootstrap ignora el pedido de cerrar un modal mientras se está abriendo. Si en ese momento se apretaba "Eliminar" y después "Cancelar", el borrado quedaba registrado. Se resolvió dejando el modal inerte (`inert`) hasta que termina de abrirse. Lo encontró la revisión, probando con eventos reales de mouse y teclado: con un `.click()` por código no aparecía. Ver [`src/ui/components/modal.ts`](../src/ui/components/modal.ts) y el plan de la [Etapa 3](plans/2026-11-06-etapa-3-clientes.md).
2. **Escape que no cerraba el detalle de una venta.** Por el arreglo anterior, el diálogo está inerte mientras se abre. Bootstrap intentaba llevar el foco al diálogo en ese momento, fallaba, y el foco quedaba en `body`: Escape no cerraba el detalle. Se resolvió llevando el foco al diálogo cuando termina de abrirse. Ver [`src/ui/components/modal.ts`](../src/ui/components/modal.ts) y el plan de la [Etapa 5](plans/2026-11-07-etapa-5-ventas.md).
3. **Gráficos con texto cortado al recargar.** Chart.js mide los textos al crearse; si la fuente Geist todavía no había cargado, medía con la de respaldo. Se resolvió volviendo a montar el gráfico cuando la fuente termina de cargar. Ver [`src/ui/charts/lifecycle.ts`](../src/ui/charts/lifecycle.ts) y el plan de la [Etapa 6](plans/2026-11-07-etapa-6-dashboard-reportes.md).
4. **Un campo de fecha que borraba lo que se escribía.** Chromium rehace el editor de un `<input type="date">` cada vez que se le escribe `min` o `max`, aunque sea el mismo valor. Se resolvió escribiendo el atributo solo si cambia. Ver `syncAttribute` en [`src/ui/dom.ts`](../src/ui/dom.ts).
5. **Un desborde que la medición escondía.** Para detectar scroll horizontal se comparaba con `innerWidth`, que incluye la barra de desplazamiento y escondía hasta 15 px. Se cambió a `scrollWidth <= clientWidth`. Ver las pruebas en el navegador del plan de la [Etapa 2](plans/2026-11-05-etapa-2-diseno-estructura.md).
6. **Una imagen de nginx que dejó de actualizarse.** El Dockerfile usaba `nginxinc/nginx-unprivileged`, que dejó de recibir parches cuando la imagen pasó a llamarse `nginx/nginx-unprivileged`. Lo encontró la revisión de la Etapa 8. La lección: al elegir una imagen base, mirar que se siga actualizando, no solo que exista. Ver el plan de la [Etapa 8](plans/2026-11-09-etapa-8-docker-cloud-run.md).
7. **La fecha que habría caído un día antes (un riesgo que se evitó).** Al planear los filtros de Ventas, el plan de la Etapa 5 anotó como primer riesgo que `new Date('2026-11-05')` se interpreta en UTC: en Argentina son las 21:00 del día anterior, y un filtro "desde el 5" habría mostrado ventas del 4. Por eso `parseDateInput` arma la fecha local desde el principio, con tests que fijan la zona horaria. Ver [`src/domain/dates.ts`](../src/domain/dates.ts).

## 4. Preguntas probables

### Arquitectura

**¿Por qué no usaste React?**
Porque con ocho pantallas no hacía falta, y quería mostrar las bases: cómo se escapa el HTML, cómo funciona un router con la History API y cómo se limpian los eventos al salir de una pantalla. En un equipo que ya usa React, usaría React. Ver [`src/app/router.ts`](../src/app/router.ts).

**¿Cómo se organiza el código?**
En capas: pantallas, servicios, dominio y datos. El dominio son reglas puras que no tocan el navegador; los servicios son los casos de uso, como registrar una venta; las pantallas leen los datos, pero solo los cambian a través de los servicios. Así cada parte se prueba por separado. Ver el diagrama del [README](../README.md#arquitectura).

**¿Cómo funciona el router?**
`resolveRoute` es una función pura que, con la ruta y si hay sesión, decide qué pantalla mostrar o adónde redirigir. El router intercepta los clics en enlaces, usa `pushState` y, al cambiar de pantalla, actualiza el título y lleva el foco al encabezado, para que un lector de pantalla anuncie la pantalla nueva. Ver [`src/app/routes.ts`](../src/app/routes.ts).

**¿Qué pasa con los eventos al cambiar de pantalla?**
Cada pantalla recibe un `AbortSignal` y registra sus eventos con él. Al salir, el router aborta la señal, lo que quita todos esos eventos, y ejecuta la función de limpieza de la pantalla, que por ejemplo destruye los gráficos. Ver [`src/app/view.ts`](../src/app/view.ts).

**¿Cómo inyectás las dependencias?**
Los servicios reciben `database`, `generateId` y `now` por parámetro. En la app son los reales; en los tests, una base en memoria, ids predecibles y una fecha fija. Así un test de "registrar venta" no depende del día en que corre. Ver [`src/services/types.ts`](../src/services/types.ts) y [`src/main.ts`](../src/main.ts).

### Datos

**¿Por qué LocalStorage y no una base de datos?**
Porque la demo no tiene servidor: cualquiera la prueba sin registrarse. Todo está en una clave, así una venta y su cambio de stock se guardan juntos. En un producto real iría un backend con base de datos. Ver [`src/data/database.ts`](../src/data/database.ts).

**¿Qué pasa si los datos guardados se dañan?**
Al leer, se valida la estructura con `isDatabase`. Si no es válida, se intenta guardar una copia en `nexo:db:backup`, se cargan datos demo y se avisa. Y nunca se guarda un estado que después no se podría leer. Ver [`src/data/schema.ts`](../src/data/schema.ts).

**¿De dónde salen los datos demo?**
De un generador reproducible: con la misma semilla, siempre los mismos 24 clientes, 32 productos y 350 ventas, con fechas relativas a hoy. Así los tests pueden comprobar totales exactos. Si alguien vuelve meses después, el Dashboard ofrece generarlos de nuevo. Ver [`src/data/seed.ts`](../src/data/seed.ts).

**¿Cómo evitás errores de redondeo con dinero?**
Guardo centavos, que son enteros, y calculo porcentajes con `BigInt`, redondeando las mitades hacia arriba. Con decimales, el 1,13 % de 50 pesos daría 56 centavos en lugar de 57. Ver [`src/domain/money.ts`](../src/domain/money.ts).

**¿Qué pasa al anular una venta?**
Queda en el historial como anulada, deja de contar en las métricas y el stock vuelve a los productos que todavía existen. Una venta guarda una copia del nombre y el precio de cada producto, así el historial no cambia si después se edita o se borra el producto. Ver [`src/services/sales.ts`](../src/services/sales.ts) y [`src/domain/stock.ts`](../src/domain/stock.ts).

### Seguridad

**¿Cómo evitás XSS?**
Todo dato que se muestra pasa por la plantilla `html`, que escapa los caracteres especiales; los atributos van siempre entre comillas, y no se ponen datos del usuario en `href` ni `src`. Además, la CSP no deja ejecutar scripts que no vengan del sitio. Los tests prueban `<img src=x onerror=alert(1)>` como texto y `"><img src=x onerror=alert(1)>` dentro del valor de un campo, que intenta cerrar el atributo: los dos salen escapados. Ojo: un `<script>` insertado con `innerHTML` no se ejecuta nunca; el peligro real son atributos como `onerror`. Ver [`src/ui/html.ts`](../src/ui/html.ts), su test y el de [`form-field.ts`](../src/ui/components/form-field.ts).

**¿Qué hace la Content-Security-Policy?**
Le dice al navegador de dónde puede cargar cada cosa. Acá solo scripts, estilos, fuentes e imágenes del mismo sitio (las imágenes también pueden ser `data:`, como la flecha de los `select` de Bootstrap), y nada escrito dentro del HTML. Las tres cabeceras de seguridad salen de un solo archivo, y un test compara la configuración de nginx con él. Ver [`deploy/security-headers.ts`](../deploy/security-headers.ts).

**¿Es seguro guardar datos en LocalStorage?**
No para datos sensibles: no está cifrado y cualquiera con acceso al navegador lo lee. Por eso la demo no pide contraseñas ni datos reales, y el README lo advierte.

### Accesibilidad

**¿Qué hiciste para la accesibilidad?**
Todo se usa con el teclado y el foco siempre se ve. Al abrir un modal, el foco entra; al cerrarlo, vuelve al botón que lo abrió. Los errores de un formulario se asocian a su campo y el foco va al primero. Los cambios que no mueven el foco, como pasar de página, se anuncian con una región `aria-live`. Los gráficos tienen su tabla, y los colores cumplen el contraste AA. Ver [`src/ui/components/modal.ts`](../src/ui/components/modal.ts) y [`src/ui/announce.ts`](../src/ui/announce.ts).

**¿Cómo probaste el contraste?**
Con la fórmula de WCAG, calculada con un script para cada color nuevo. Por ejemplo, el acento azul usa `#2F6BF0`, que con texto blanco da 4,69:1; el azul de los gráficos daba 2,90:1 y no servía para un botón. Ver el plan de la [Etapa 7](plans/2026-11-08-etapa-7-configuracion-pulido.md).

**¿Y en el celular?**
Funciona de 320 a 1920 px sin scroll horizontal; se midió en cada pantalla. Las tablas pasan a tarjetas debajo de 768 px, y con pantalla táctil cada control mide al menos 44 px, también en tablets.

### Pruebas

**¿Cómo probaste la app?**
Unos 1000 tests en Node: unos 300 del dominio, y el resto de los servicios, los datos, las partes puras de la interfaz, la configuración de despliegue y los enlaces de la documentación. Las pantallas se probaron en Chromium con scripts de Playwright, con eventos reales de mouse y teclado (no con `.click()` por código), en varios anchos y con recarga sin caché. Esos scripts no quedaron en el repositorio; es una de las limitaciones.

**¿Qué es TDD y lo usaste?**
Escribir primero un test que falle, verlo fallar, escribir el código mínimo para que pase y después ordenar. Sí, en cada cambio de lógica; no en los estilos, las capturas ni la documentación. Lo importante es verlo fallar: un test que nunca falló puede no estar probando nada.

**¿La cobertura alta no alcanza?**
No. La cobertura dice qué líneas se ejecutaron, no si un test fallaría ante un error. Por eso, de la Etapa 2 a la 7, hubo rondas de mutaciones: se rompían condiciones a propósito y se comprobaba que algún test fallara. Encontraron casos sin cubrir y hasta un filtro que no hacía nada.

### Despliegue

**¿Cómo se despliega?**
Con `gcloud run deploy --source .`, Cloud Run construye la imagen con el Dockerfile y la publica. Antes conviene probarla local y pasarle `npm run check:deploy`. Ver la sección de despliegue del [README](../README.md#despliegue).

**¿Por qué nginx sin root?**
Si alguien encontrara una falla en nginx, tendría los permisos de un usuario común dentro del contenedor y no los de administrador. La imagen oficial `nginx-unprivileged` corre con el usuario 101 y escucha en el puerto 8080.

**¿Cómo probaste la imagen?**
Primero, tests que leen la configuración de nginx como texto: comprueban las reglas pedidas y que ningún `location` pierda las cabeceras. Después, con Docker: `nginx -t` dentro de la imagen, el contenedor corriendo con el usuario 101 y `npm run check:deploy` contra `localhost:8080`, que revisa estados, cabeceras, caché y compresión. Además, se recargó cada pantalla en el navegador sin errores en la consola. La prueba se hizo después de cerrar la Etapa 9, cuando hubo Docker; está en el plan de la [Etapa 8](plans/2026-11-09-etapa-8-docker-cloud-run.md).

### Trabajo en equipo

**¿Cómo trabajarías este proyecto en equipo?**
Cada etapa ya se trabajó en su propia rama, con un plan aprobado antes de empezar y una revisión antes de integrarla a `main`. En un equipo sumaría pull requests revisados por otra persona e integración continua que corra typecheck, lint, tests, build y `check:deploy` en cada cambio.

**¿Cómo dejaste documentadas las decisiones?**
Cada plan termina con "Decisiones tomadas al ejecutar el plan": qué cambió respecto de lo planeado y por qué, y qué quedó pendiente. Así otra persona entiende por qué el código es como es sin tener que preguntar. Ver [`docs/plans/`](plans/).

### Proceso

**¿Lo hiciste solo? ¿Usaste inteligencia artificial?**
Respondé con la verdad, sin adornos. Por ejemplo: "Lo desarrollé con un asistente de IA, y yo dirigía el trabajo: definí el alcance, aprobé el diseño y el plan de cada etapa, y decidí en cada duda. El asistente escribía el código con tests primero, y al final de cada etapa otra sesión de IA, con instrucciones de buscar errores, hacía la revisión. Mi trabajo fue decidir, revisar los resultados y entender cada parte: por eso puedo explicar cualquier decisión de esta guía." Si no podés explicar algo de esta guía con tus palabras, repasalo antes de la entrevista.

**¿Qué harías distinto?**
Automatizaría las pruebas de navegador en el repositorio desde el principio, con Playwright, para que corran solas en cada cambio. Y tendría Docker instalado desde la primera etapa, para probar la imagen al terminar la Etapa 8 y no dejarla pendiente.

## 5. Limitaciones conocidas y cómo se resolverían

| Limitación | En un producto real |
| --- | --- |
| No hay backend ni usuarios: el acceso es un botón | Un backend con base de datos y autenticación real, con sesiones o tokens |
| LocalStorage no está cifrado y tiene un límite de unos megabytes | Los datos en el servidor; en el navegador, solo lo necesario |
| Con dos pestañas abiertas, gana la última que guarda | Detectar cambios con el evento `storage`, o resolverlo en el servidor con versiones |
| La app no está publicada: la imagen se probó en una computadora | Publicarla en Cloud Run y pasarle `npm run check:deploy` a la URL pública, idealmente desde integración continua |
| Las pruebas de navegador no están automatizadas en el repositorio | Tests de Playwright en el repositorio, en integración continua |
| Al guardar sin cambios, Clientes y Productos dicen "Cambios guardados." aunque no escriben nada | Que el servicio devuelva si guardó, como ya hace Configuración |
| Se acepta un nombre de perfil hecho solo de caracteres invisibles, y un carácter de control al principio pasa a ser la inicial | Exigir al menos una letra o un número, y saltear los caracteres de control al tomar las iniciales |
| Si se confirma "Restaurar" y se vuelve atrás mientras se cierra el diálogo, los datos se restauran pero la pantalla anterior no se vuelve a dibujar | Volver a dibujar la pantalla que quedó, o terminar la restauración antes de permitir la navegación |
| Los errores del umbral y del stock dicen "1000" y "999999", sin separador de miles | Formatear el número del mensaje |
| "Quitar la línea 2" no dice qué producto quita | "Quitar la línea 2 (Switch de 8 puertos)" |
| Dos tests flojos: el de `lineControlNames` no cubre el nombre que se arma en la pantalla, y otro muestra 10.5 como "10" en su nombre | Testear el nombre real y usar `%s` en el nombre del test |
| `/favicon.svg` se sirve sin `Cache-Control` | Agregar `no-cache`, como en `index.html` |
| Los errores que nginx da antes de elegir un `location` (un pedido mal formado: 400, 414 o 431) salen sin cabeceras de seguridad | Incluir las cabeceras también en el bloque `server` |
| Si falla la red, `check:deploy` dice solo "fetch failed" | Mostrar la causa del error y el estado de la respuesta |
| La imagen conserva `/50x.html` y una directiva `index` que no se usan | Quitarlos |

Los detalles de cada una están al final de los planes de las [Etapas 7](plans/2026-11-08-etapa-7-configuracion-pulido.md) y [8](plans/2026-11-09-etapa-8-docker-cloud-run.md).

## 6. Glosario

- **SPA (single page application):** una aplicación que carga una sola página y cambia de pantalla con JavaScript, sin recargar.
- **XSS (cross-site scripting):** un ataque que mete código en una página a través de datos, por ejemplo un nombre como `<img src=x onerror=alert(1)>`.
- **CSP (Content-Security-Policy):** una cabecera que le dice al navegador de dónde puede cargar scripts, estilos e imágenes.
- **Delegación de eventos:** un solo listener en un contenedor que atiende los clics de todos sus elementos, en lugar de uno por botón.
- **TDD (test-driven development):** escribir el test antes que el código y verlo fallar primero.
- **Mutación:** un cambio a propósito en el código, como `<` por `<=`, para comprobar que algún test lo detecta.
- **Cobertura:** el porcentaje de líneas que los tests ejecutan. No dice si los tests comprueban algo.
- **`Result`:** un valor que es `{ ok: true, value }` o `{ ok: false, error }`, para devolver errores sin excepciones.
- **`aria-live`:** un atributo que hace que un lector de pantalla anuncie los cambios de una región.
- **Contraste WCAG:** la relación de luminancia entre texto y fondo. AA pide al menos 4,5:1 para texto normal.
- **Tokens de diseño:** variables con los colores, tamaños, radios y sombras de la app, definidas en un solo lugar.
- **IndexedDB:** una base de datos del navegador para guardar más datos y con consultas, más compleja que LocalStorage.
- **Imagen en dos etapas:** un Dockerfile que compila en una imagen y copia solo el resultado a otra más chica.
- **Archivos con hash:** archivos cuyo nombre incluye un código que cambia con el contenido, como `index-BBljRCqK.js`. Se pueden guardar mucho tiempo porque una versión nueva tiene otro nombre.
- **`location` (nginx):** un bloque de la configuración que dice qué hacer con un grupo de rutas, como `/assets/`.
- **History API:** la parte del navegador que permite cambiar la dirección (`pushState`) sin recargar la página.
