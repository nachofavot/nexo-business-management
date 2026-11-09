# NEXO

Demo de gestión de clientes, productos y ventas, hecha con TypeScript, Bootstrap 5, SCSS, Vite y Chart.js. Los datos son ficticios y se guardan en el navegador.

## Despliegue

### Qué se publica

La imagen se construye en dos etapas. `node:26-alpine` instala las dependencias y compila la app; la imagen final es `nginx/nginx-unprivileged:stable-alpine` con los archivos de `dist/`, y no incluye Node ni dependencias de desarrollo. nginx corre sin root, escucha en el puerto 8080 y:

- devuelve `index.html` en cualquier ruta de la app, para que recargar `/clientes` funcione;
- devuelve 404 si se pide un archivo inexistente de `/assets/`;
- guarda un año los archivos de `/assets/`, porque su nombre cambia con el contenido, y pide de nuevo `index.html` en cada visita;
- envía en todas las respuestas las cabeceras de seguridad de [`deploy/security-headers.ts`](deploy/security-headers.ts): Content-Security-Policy, `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`;
- comprime HTML, CSS, JS y SVG, y no publica su versión.

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), para probar la imagen en tu computadora.
- Para publicar: la [CLI de Google Cloud](https://cloud.google.com/sdk/docs/install) y un proyecto de Google Cloud con facturación activa. Conviene crear una alerta de presupuesto en **Facturación → Presupuestos y alertas** antes de desplegar.

### Probar la imagen

Construir la imagen:

```bash
docker build -t nexo .
```

Levantarla en `http://localhost:8080`:

```bash
docker run --rm -p 8080:8080 nexo
```

En otra terminal, comprobar que cumple todo lo anterior:

```bash
npm run check:deploy -- http://localhost:8080
```

El script pide `index.html`, el JS de la app, dos pantallas recargadas, un archivo inexistente y el ícono, y revisa estado, tipo de contenido, `Cache-Control`, compresión y cabeceras de seguridad. Termina con código 0 si todo está en orden y con 1 si encuentra un problema.

### Publicar en Cloud Run

Cloud Run construye la imagen con el `Dockerfile` del proyecto, usando Cloud Build, y la guarda en un repositorio de Artifact Registry llamado `cloud-run-source-deploy`, que crea solo.

1. Iniciar sesión:

   ```bash
   gcloud auth login
   ```

2. Elegir el proyecto, cambiando `MI-PROYECTO` por su ID:

   ```bash
   gcloud config set project MI-PROYECTO
   ```

3. Habilitar Cloud Run y Cloud Build:

   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```

4. Dar permiso para compilar a la cuenta de servicio predeterminada de Compute Engine. Se hace una sola vez por proyecto, y tarda un par de minutos en aplicarse. Primero, ver el número del proyecto:

   ```bash
   gcloud projects describe MI-PROYECTO --format="value(projectNumber)"
   ```

   Después, con ese número en lugar de `NUMERO`:

   ```bash
   gcloud projects add-iam-policy-binding MI-PROYECTO --member=serviceAccount:NUMERO-compute@developer.gserviceaccount.com --role=roles/run.builder
   ```

5. Desplegar desde la carpeta del proyecto:

   ```bash
   gcloud run deploy nexo --source . --region southamerica-east1 --allow-unauthenticated --port 8080 --memory 512Mi --max-instances 1
   ```

| Opción                        | Por qué                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `--region southamerica-east1` | San Pablo, la región más cercana a Argentina                                            |
| `--allow-unauthenticated`     | La demo es pública: no pide iniciar sesión en Google                                    |
| `--port 8080`                 | El puerto en que escucha nginx sin root                                                 |
| `--memory 512Mi`              | Es el valor mínimo que admiten las dos generaciones de Cloud Run; nginx usa mucho menos |
| `--max-instances 1`           | Una demo no necesita más, y así el costo tiene un techo                                 |

Al terminar, `gcloud` muestra la URL del servicio.

### Comprobar la URL pública

Con la URL que mostró `gcloud`:

```bash
npm run check:deploy -- https://nexo-XXXXXXXX.southamerica-east1.run.app
```

Después, abrir la URL en el navegador, entrar a la demo, ir a Clientes y recargar la página.

### Borrar el servicio

Cuando ya no se use, borrar el servicio:

```bash
gcloud run services delete nexo --region southamerica-east1
```

Y el repositorio con las imágenes:

```bash
gcloud artifacts repositories delete cloud-run-source-deploy --location southamerica-east1
```

Documentación consultada: [Desplegar desde el código fuente](https://cloud.google.com/run/docs/deploying-source-code), [límites de memoria](https://cloud.google.com/run/docs/configuring/services/memory-limits), [contrato del contenedor](https://cloud.google.com/run/docs/reference/container-contract) y [referencia de `gcloud run deploy`](https://cloud.google.com/sdk/gcloud/reference/run/deploy).
