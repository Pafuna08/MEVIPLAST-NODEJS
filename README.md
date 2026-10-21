# MEVIPLAST

Sistema web interno para apoyar la gestión de producción, materias primas, inventario terminado, ventas y reportes de MEVIPLAST.

**Estado:** en desarrollo académico. La rama `feature/MEVI-9-completar-backlog` contiene cambios locales aún no integrados ni aceptados. No se ha aprobado como despliegue productivo ni se han verificado disponibilidad, restauración de copias o compatibilidad en todos los navegadores.

## Funcionalidad presente en la rama en revisión

- Autenticación con JWT y contraseñas almacenadas con bcryptjs.
- Panel React/Vite con vistas para Administrador, Supervisor, Operario, Vendedor y Almacenista.
- Gestión de usuarios, materias primas, producción, inventario terminado, ventas y reportes básicos.
- Movimientos de materias primas e inventario terminado registrados junto con sus saldos en transacciones.
- Edición de órdenes de producción restringida a órdenes pendientes sin avances registrados.
- Ventas del vendedor filtradas por usuario; el registro de venta descuenta existencias en la transacción.
- API REST con autenticación y controles de acceso por rol.

La presencia en código no equivale a aceptación del requisito. Los cambios de roles y ledger siguen pendientes de pruebas de integración con MySQL y aprobación de las reglas de acceso. La recuperación de contraseña, el bloqueo de intentos fallidos y los indicadores de rendimiento por operario no están implementados. El consumo de materia prima asociado a una orden es explícito, no automático. No se genera comprobante de venta ni exportación Excel; la impresión del reporte depende del navegador. Consulta el estado historia por historia en [`docs/requirements/traceability.md`](docs/requirements/traceability.md).

## Tecnologías

- Backend: Node.js, Express, JavaScript, JWT, bcryptjs y mysql2.
- Frontend de trabajo: React, JSX y Vite.
- Sitio público e inicio de sesión: HTML, CSS y JavaScript.
- Base de datos: MySQL.
- Node.js: 18 o superior; CI configurado con Node.js 22.

## Requisitos previos

- Node.js y npm.
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

**Usa `db:init` únicamente con una base local desechable de desarrollo.** El comando ejecuta el esquema y agrega datos de demostración. No lo ejecutes sobre una base real o compartida. La migración de roles y movimientos se probó en una instancia temporal aislada de MariaDB con datos ficticios; no se aplicó a una base existente, y la integración de la aplicación con MySQL sigue pendiente. Las credenciales de demostración están definidas en `backend/src/config/initDb.js` y no son adecuadas para producción.

Express sirve el build de React desde `frontend/dist`; el script `prestart` de backend compila el frontend al arrancar. El sitio queda disponible en `http://localhost:3000` por defecto. El puerto se puede cambiar en `backend/.env`.

## Desarrollo

Con MySQL activo y el backend ejecutándose, abre otra terminal:

```powershell
npm run dev --prefix frontend -- --host 127.0.0.1
```

Vite lee `PORT` desde `backend/.env` y reenvía `/api` al backend. Para forzar otro destino puede definirse `API_PORT` en el entorno de Vite.

## Pruebas y build

```powershell
npm test --prefix backend
npm audit --prefix backend --audit-level=critical
npm run build --prefix frontend
```

Las pruebas automatizadas incluyen casos de servicios para movimientos de inventario y materias primas, edición de órdenes, ventas y sanitización. La suite no sustituye las pruebas de integración con MySQL ni la aceptación por rol. La auditoría de dependencias conserva avisos altos en dependencias de desarrollo; no se aplicó el downgrade mayor propuesto por npm.

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

La licencia del producto debe ser aprobada por sus autores antes de redistribuirlo. La decisión sigue pendiente; revisa [`docs/legal/licensing.md`](docs/legal/licensing.md). Las licencias de dependencias se consultan en sus respectivos manifiestos y lockfiles.
