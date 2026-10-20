# MEVIPLAST

Sistema web interno para apoyar la gestión de producción, materias primas, inventario terminado, ventas y reportes de MEVIPLAST.

**Estado:** en desarrollo académico. No se ha aprobado como despliegue productivo ni se han verificado disponibilidad, restauración de copias o compatibilidad en todos los navegadores.

## Funcionalidad verificada en código

- Inicio de sesión con JWT y contraseñas almacenadas con bcryptjs.
- Panel React/Vite en una sola página, con vistas para Administrador, Supervisor y Operario.
- Usuarios, materias primas, producción, inventario terminado, ventas y reportes básicos.
- Los avances de producción incrementan inventario y las ventas descuentan existencias dentro de una transacción.
- API REST protegida por token y permisos para los roles `admin`, `supervisor` y `operario`.

El panel no define roles de acceso `vendedor` ni `almacenista`. La recuperación de contraseña, el bloqueo de intentos, las compras/consumos trazables de materia prima, los comprobantes de venta, el análisis de rendimiento por operario y la exportación Excel no están implementados. La impresión del reporte depende de la función de imprimir del navegador.

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

`db:init` crea o actualiza el esquema y agrega cuentas y datos de demostración cuando no existen. Úsalo únicamente en una base local de desarrollo; haz copia de seguridad antes de ejecutarlo sobre una base con información real. Las credenciales de demostración están definidas en `backend/src/config/initDb.js` y no son adecuadas para producción.

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

Las pruebas automatizadas actuales cubren tres casos de sanitización. Aún falta ampliar la cobertura funcional, de integración, permisos y aceptación. La auditoría de dependencias conserva avisos altos en dependencias de desarrollo; no se aplicó el downgrade mayor propuesto por npm.

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