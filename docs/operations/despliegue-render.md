# Despliegue en Render con MySQL en Aiven

MEVIPLAST se publica como **un solo servicio web en Render**: Express sirve el panel ya compilado y la API. Render no ofrece MySQL, así que la base va en un **MySQL 8 administrado de Aiven**, con conexión cifrada (SSL). Render tiene plan gratuito; Aiven no ofreció plan gratuito para MySQL, y se usa el plan más pequeño con los créditos de prueba.

| Pieza | Dónde | Plan |
| --- | --- | --- |
| Panel y API (Node.js 22) | Render, servicio web `meviplast`, rama `develop` | Free: se «duerme» tras 15 minutos sin uso; la primera visita después tarda unos 30 a 60 segundos |
| Base de datos (MySQL 8.4) | Aiven for MySQL | Developer-1 (5 USD/mes), pagado con los 50 USD de créditos de prueba. La prueba vence hacia el 11/12/2026: sin un medio de pago, Aiven apaga la base. Respaldar antes (sección 5) |

La configuración del servicio está en [`render.yaml`](../../render.yaml). Los secretos (contraseña de la base, certificado, correo) **no** van en el repositorio: se escriben en el panel de Render.

## 1. Crear la base en Aiven

1. Crear una cuenta en [aiven.io](https://aiven.io) y un proyecto.
2. **Create service → MySQL** y el plan más pequeño disponible (en este proyecto, Developer-1). Elegir la nube y la región más cercanas a Render (por ejemplo, AWS `us-east-1`, cerca de Virginia).
3. Esperar a que el servicio quede en **Running**.
4. En **Overview → Connection information** anotar `Host`, `Port`, `User` (`avnadmin`) y `Password`, y descargar el **CA certificate** (`ca.pem`).
5. Guardar estos datos en un archivo **fuera del repositorio** (por ejemplo `Respaldos_MEVIPLAST/despliegue/nube.env`):

```ini
DB_HOST=<host de Aiven>
DB_PORT=<puerto de Aiven>
DB_USER=avnadmin
DB_PASSWORD=<contraseña de Aiven>
DB_NAME=meviplast_db
DB_SSL=true
DB_SSL_CA_FILE=<ruta completa a ca.pem>
DB_TIME_ZONE=-05:00
```

## 2. Crear las tablas en la nube

Desde la carpeta `backend`, con las variables del archivo anterior cargadas (en PowerShell, una por una con `$env:DB_HOST="…"`, etc.):

```powershell
$env:DB_DEMO="false"; $env:ADMIN_PASSWORD="<contraseña larga y privada>"; npm run db:init
```

- `DB_DEMO=false` crea solo el esquema, las seis líneas de producto y el usuario `admin` con `ADMIN_PASSWORD` (mínimo 10 caracteres). **No** crea las cuentas demo con contraseñas conocidas (`admin123`, etc.), que en un servidor público dejarían entrar a cualquiera.
- Las demás cuentas se crean después desde **Usuarios** en el panel, cada una con su contraseña.
- Para una demostración se pueden cargar datos de ejemplo coherentes por la API, siempre con contraseñas propias, nunca las demo.

## 3. Crear el servicio en Render

1. Crear una cuenta en [render.com](https://render.com) entrando con GitHub e **instalar la aplicación de Render en GitHub** (https://github.com/apps/render → Install → Only select repositories → `MEVIPLAST-NODEJS`). Sin la aplicación, Render puede leer un repositorio público pero no se entera de los cambios, y `autoDeploy` no se dispara: cada cambio exigiría **Manual Deploy → Deploy latest commit**.
2. **New → Blueprint** y elegir el repositorio: Render lee `render.yaml` y propone el servicio `meviplast`.
3. Escribir los valores que Render pide (los marcados `sync: false`):
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`: los de Aiven.
   - `DB_SSL_CA`: el contenido completo de `ca.pem` (desde `-----BEGIN CERTIFICATE-----` hasta `-----END CERTIFICATE-----`).
   - `FRONTEND_URL`: viene en `render.yaml` con `https://meviplast.onrender.com`; si Render asigna otra dirección, se cambia allí.
   - Correo de recuperación: el plan gratuito de Render bloquea los puertos SMTP (25, 465 y 587) desde septiembre de 2025, así que Gmail por SMTP no sale de Render. Se usa la API HTTPS de Brevo (gratis, 300 correos al día): solo hace falta `BREVO_API_KEY`; el remitente (`SMTP_FROM`) y `FRONTEND_URL` ya vienen en `render.yaml`. Los demás `SMTP_*` se dejan vacíos. Ver la sección 6.
   - `JWT_SECRET` lo genera Render solo.
4. **Apply**. Render instala, compila el panel (`npm run build --prefix frontend`) y arranca `node server.js`. El despliegue queda listo cuando `GET /api/health` responde 200.

Cada fusión en `develop` vuelve a desplegar el servicio (`autoDeploy`). En **Events** aparece «New commit via Auto-Deploy»; si solo hay despliegues «Manually triggered», revisar que la aplicación de Render siga instalada en el repositorio.

## 4. Verificar

| Comprobación | Esperado |
| --- | --- |
| `https://<servicio>.onrender.com/api/health` | `{"estado":"ok","baseDatos":"ok"}` |
| Iniciar sesión como `admin` | Entra al panel |
| Registrar una venta y abrir el comprobante en PDF | La fecha sale en hora de Colombia |
| Reporte diario | Incluye lo registrado hoy (hora de Colombia) |
| `https://<servicio>.onrender.com/api-docs` | Swagger UI con las 60 operaciones de la API (CR-024) |

## Variables nuevas

| Variable | Uso |
| --- | --- |
| `DB_SSL` | `true` para cifrar la conexión con la base (obligatorio en Aiven) |
| `DB_SSL_CA` / `DB_SSL_CA_FILE` | Certificado de la base: el texto PEM (los saltos de línea pueden escribirse como `\n`) o la ruta del archivo |
| `DB_TIME_ZONE` | Zona horaria de las fechas que guarda MySQL, `±HH:MM` (Colombia: `-05:00`) |
| `TZ` | Zona horaria del servidor Node (Render: `America/Bogota`), para los reportes por día |
| `DB_DEMO` | `false` para que `db:init` no siembre cuentas ni datos de ejemplo |
| `ADMIN_PASSWORD`, `ADMIN_EMAIL` | Contraseña (mínimo 10 caracteres) y correo del `admin` cuando `DB_DEMO=false` |
| `API_DOCS` | `off` para no publicar Swagger UI en `/api-docs`; sin la variable se publica |

En local nada cambia: sin estas variables la conexión es la de XAMPP y `db:init` siembra los datos DEMO.

## 5. Respaldar la base de la nube

Respaldar antes de que venza la prueba de Aiven y antes de cualquier cambio grande. El respaldo se guarda **fuera del repositorio**, junto a `nube.env` (`Respaldos_MEVIPLAST/despliegue/`), porque contiene los datos y los hashes de las contraseñas.

- El `mysqldump` de XAMPP (MariaDB 10.4) no entra a MySQL 8.4 por el método de autenticación. Se puede usar el `mysqldump` de MySQL 8 con `--ssl-ca=ca.pem`, o el script del equipo `respaldo_nube.js` (en `Respaldos_MEVIPLAST/herramientas_ADSO`), que usa el `mysql2` del backend y lee `nube.env` sin mostrar los secretos:

```powershell
cd backend
node ..\..\Respaldos_MEVIPLAST\herramientas_ADSO\respaldo_nube.js ..\..\Respaldos_MEVIPLAST\despliegue\nube.env ..\..\Respaldos_MEVIPLAST\despliegue\meviplast_nube_AAAAMMDD.sql
```

- Aiven usa `ANSI_QUOTES`; el script lo desactiva en su sesión para que la estructura salga con comillas invertidas y se pueda restaurar en cualquier MySQL o MariaDB.
- Comprobar el respaldo restaurándolo en una base vacía y desechable (nunca sobre `meviplast_db`) y comparando el número de filas de cada tabla.

| Fecha | Archivo | Contenido | Restauración de prueba |
| --- | --- | --- | --- |
| 16/11/2026 | `meviplast_nube_20261116.sql` (31 kB) | 13 tablas: 6 usuarios, 10 órdenes, 7 ventas ($381 500), 88 eventos de auditoría, 15 migraciones | Correcta en MariaDB 10.4: mismas filas por tabla y el total de las ventas igual a la suma de su detalle |
| 25/11/2026 | `meviplast_nube_20261125.sql` (124 kB) | 13 tablas con los datos de demostración de tres meses: 6 usuarios, 47 órdenes, 64 ventas ($4 322 295), 563 eventos de auditoría, 17 migraciones | Correcta en MariaDB 10.4: mismas filas por tabla y el total de las ventas igual a la suma de su detalle |

## 6. Correo de recuperación con Brevo

Render (plan gratuito) no deja salir conexiones a los puertos SMTP, así que la recuperación de contraseña y el recordatorio de usuario usan la API de Brevo por HTTPS (MEVI-127). En el equipo local se sigue usando Gmail por SMTP; si existe `BREVO_API_KEY`, el servidor usa Brevo en su lugar.

`render.yaml` ya trae `FRONTEND_URL` y `SMTP_FROM` (no son secretos), así que en Render solo falta la clave:

1. Entrar a [brevo.com](https://www.brevo.com) con **Continuar con Google** usando el buzón del proyecto. El correo de la cuenta queda como remitente verificado; si Brevo pide confirmarlo, llega un código a ese buzón.
2. **SMTP & API → API Keys → Generate a new API key** y copiarla (Brevo la muestra una sola vez; no se guarda en Git).
3. En Render, **meviplast → Environment → Add Environment Variable**: `BREVO_API_KEY` con la clave → **Save**. Render vuelve a desplegar solo.
4. Probar en `https://meviplast.onrender.com/recuperar.html` con el correo de una cuenta: debe llegar el mensaje. Si la API responde 503, falta `BREVO_API_KEY` o `SMTP_FROM`; si responde 500, el registro del servicio muestra el motivo que dio Brevo.

Los correos salen con remitente `@gmail.com` pero desde los servidores de Brevo, así que algunos pueden llegar a la carpeta de spam. Cada cuenta recibe la recuperación en el correo que tiene guardado: si es uno de ejemplo, el mensaje no llega a nadie; cada usuario puede poner su correo real en «Mi perfil».
