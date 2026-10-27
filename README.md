# MEVIPLAST

Sistema web interno para apoyar la gestión de producción, materias primas, inventario terminado, ventas y reportes de MEVIPLAST.

**Estado:** en desarrollo académico. La rama `develop` integra los PR #1 a #31; todavía no hay etiqueta de liberación ni aceptación del cliente. Se verificaron el respaldo y la restauración, el rendimiento con 5 usuarios y la compatibilidad con Edge, Chrome y Firefox en un equipo local; no se ha probado en el servidor de MEVIPLAST ni se ha medido la disponibilidad.

## Funcionalidad presente en `develop`

- Autenticación con JWT y contraseñas almacenadas con bcryptjs.
- Recuperación de contraseña y recordatorio de usuario por correo, con enlace de un solo uso vigente 30 minutos.
- Bloqueo temporal de la cuenta tras 5 intentos fallidos seguidos (15 minutos, configurable); el administrador puede desbloquearla.
- Panel React/Vite con vistas para Administrador, Supervisor, Operario, Vendedor y Almacenista.
- Gestión de usuarios, materias primas, producción, inventario terminado, ventas y reportes.
- Órdenes de producción dirigidas por el administrador a un supervisor, quien las asigna a un operario; plantillas de órdenes frecuentes.
- Catálogo de materias primas (bobinas PEBD, PEAD y PP con medida, calibre, color y peso de rollo) y de seis líneas de producto terminado con variantes.
- Movimientos de materias primas e inventario terminado registrados junto con sus saldos en transacciones.
- Edición de órdenes de producción restringida a órdenes pendientes sin avances registrados.
- Ventas por paquetes (hasta 500 unidades por paquete); el vendedor solo consulta sus ventas y el registro descuenta existencias en la transacción.
- Comprobante de venta imprimible, con número consecutivo.
- Reportes de producción y ventas por periodo diario, semanal, mensual o anual, imprimibles y descargables en Excel.
- API REST con autenticación y controles de acceso por rol.

La presencia en código no equivale a aceptación del requisito. La suite E2E con MySQL cubre los flujos principales, pero falta la aceptación del cliente por rol. Los indicadores de rendimiento por operario no están implementados. Las compras, los ajustes y los consumos de materia prima se registran por la API, pero el panel no tiene su formulario (DEF-013, pendiente de decisión). El consumo de materia prima asociado a una orden es explícito, no automático. El comprobante de venta y el PDF de los reportes usan la impresión del navegador; los reportes detallados también se descargan en Excel. Cerrar sesión elimina el token del navegador; el servidor lo rechaza de inmediato si el usuario se desactiva o cambia de rol, y en todo caso vence a las 8 horas. Consulta el estado historia por historia en [`docs/requirements/traceability.md`](docs/requirements/traceability.md).

## Tecnologías

- Backend: Node.js, Express, JavaScript, JWT, bcryptjs, mysql2, nodemailer (correo de recuperación) y exceljs (reportes en Excel).
- Frontend de trabajo: React, JSX y Vite.
- Sitio público e inicio de sesión: HTML, CSS y JavaScript.
- Base de datos: MySQL.
- Node.js: 20 o superior (lo exige `nodemailer` 10); CI configurado con Node.js 22.

## Requisitos previos

- Node.js 20 o superior y npm.
- MySQL compatible y disponible. En el entorno local del equipo se usa XAMPP.
- Git para clonar el repositorio.

## Instalación local

Desde la raíz del repositorio, copia el archivo de ejemplo y configura las credenciales de tu MySQL. Cambia `JWT_SECRET` por un valor aleatorio privado.

```powershell
Copy-Item .env.example backend/.env
npm ci --prefix backend
npm ci --prefix frontend
npm run db:init --prefix backend
npm start --prefix backend
```

**Usa `db:init` únicamente con una base local desechable de desarrollo.** El comando crea la base indicada en `DB_NAME` (por defecto `meviplast_db`), ejecuta el esquema y agrega datos de demostración. No lo ejecutes sobre una base real o compartida. Para actualizar una base existente se aplican las migraciones de `backend/sql/migrations` después de un respaldo verificado (ver [`docs/operations/backup-restore.md`](docs/operations/backup-restore.md)). Las credenciales de demostración están definidas en `backend/src/config/initDb.js` y no son adecuadas para producción.

Express sirve el build de React desde `frontend/dist`; el script `prestart` de backend compila el frontend al arrancar. El sitio queda disponible en `http://localhost:3000` por defecto. El puerto se puede cambiar en `backend/.env`.

Para verificar el despliegue, `GET /api/health` responde 200 si la API y la base de datos están disponibles y 503 si la base de datos no responde. La API no acepta llamadas desde otros dominios salvo los listados en `CORS_ORIGINS`; el panel servido por Express no lo necesita.

### Recuperación de cuenta por correo

La pantalla `recuperar.html` permite pedir un enlace de restablecimiento (válido 30 minutos y de un solo uso) o solicitar que se envíe el nombre de usuario. Configura `FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y opcionalmente `SMTP_FROM` en `backend/.env`; usa una contraseña de aplicación del proveedor SMTP y no la guardes en Git. La migración `20261022_recovery_tokens.sql` crea la tabla de tokens. Las cuentas anteriores deben recibir un correo desde Gestión de usuarios antes de poder recuperarlas.

## Desarrollo

Con MySQL activo y el backend ejecutándose, abre otra terminal:

```powershell
npm run dev --prefix frontend -- --host 127.0.0.1
```

Vite lee `PORT` desde `backend/.env` y reenvía `/api` al backend. Para forzar otro destino puede definirse `API_PORT` en el entorno de Vite.

## Pruebas y build

```powershell
npm run lint --prefix backend
npm run lint --prefix frontend
npm test --prefix backend
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
npm run test:e2e --prefix backend      # requiere MySQL/MariaDB activo; base desechable meviplast_e2e
npm run test:perf --prefix backend     # prueba de carga; base desechable meviplast_perf
npm run test:browser --prefix backend  # Edge, Chrome y Firefox; ver docs/testing/strategy.md
```

Hay 52 pruebas unitarias y de rutas (52 aprobadas el 2026-10-27). Cubren sesión, bloqueo por intentos, recuperación de contraseña (incluido el envío por SMTP a un servidor local), health check y CORS, movimientos de inventario y materias primas, órdenes y avances de producción, ventas por paquetes y comprobante, reportes por periodo y en Excel, permisos por rol y sanitización. La suite E2E contra MySQL (8 escenarios, también en CI) recorre el flujo completo por rol, los permisos de 13 endpoints, ventas concurrentes, el bloqueo de cuentas y la invalidación de sesiones. La prueba de carga midió un p95 de 60 a 69 ms con 5 usuarios, y la de navegadores pasó 30 de 30 flujos. `npm audit` reporta 0 vulnerabilidades. Nada de esto sustituye la aceptación del cliente por rol.

## Estructura

```text
backend/       API, servicios, configuración, SQL y pruebas
frontend/      sitio, login y aplicación React/Vite
docs/          arquitectura, API, datos, pruebas y evidencias
.github/       CI, plantillas de issues y pull request
```

La estructura documental y los pendientes funcionales se detallan en [`docs/project-status.md`](docs/project-status.md). El contrato actual de endpoints está resumido en [`docs/api/endpoints.md`](docs/api/endpoints.md).
El índice de manuales, diagramas, procedimientos y evidencias está en [`docs/README.md`](docs/README.md).

## Git y contribuciones

Se usa Git Flow: `main` para entregas estables, `develop` para integración, `feature/*` para funcionalidades y `fix/*` para correcciones. Las ramas de trabajo se integran mediante pull request a `develop`. Los commits siguen Conventional Commits. Consulta [`CONTRIBUTING.md`](CONTRIBUTING.md) y la plantilla del pull request.

## Licencia y terceros

Software propietario: todos los derechos reservados a Pablo E. Fuenmayor Osuna y Carlos Herrera Sibaja. Consulta [`LICENSE`](LICENSE) para los términos y [`docs/legal/licensing.md`](docs/legal/licensing.md) para las licencias de las dependencias de terceros.
