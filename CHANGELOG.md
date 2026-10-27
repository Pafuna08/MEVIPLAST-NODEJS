# Changelog

Los cambios relevantes se registran aquí. El proyecto todavía no tiene una versión estable etiquetada.

## Unreleased - 2026-10-27

### Added

- Registros estructurados del servidor (`src/utils/logger.js`): una línea JSON por evento con fecha, nivel, módulo y mensaje; registro de cada petición a la API sin su cuerpo; campos sensibles ocultos; nivel con `LOG_LEVEL`.
- Diagrama entidad-relación en Mermaid (`docs/data/er.md`) con las 10 tablas y 16 claves foráneas, y una prueba que falla si deja de coincidir con `schema.sql`.
- Contrato OpenAPI 3.0.3 (`docs/api/openapi.json`) con las 47 operaciones, sus cuerpos, respuestas y roles, y una prueba que falla si el contrato y las rutas de Express dejan de coincidir.
- Cobertura de pruebas medida con Node.js (`test:coverage` y `test:coverage:total`): 61 % de líneas con unitarias y 78 % con E2E; el CI exige un mínimo de 58 % y 75 %.
- Bloqueo temporal de la cuenta tras 5 intentos fallidos seguidos (15 minutos, configurable) y desbloqueo por el administrador.
- Endpoint `GET /api/health` para verificar la API y la base de datos.
- Licencia propietaria y lint con ESLint en backend, frontend y CI.
- Comprobante de venta imprimible (RF-023): número consecutivo, cliente, producto, cantidades, total y vendedor; se abre al registrar la venta y desde la tabla de ventas, con `GET /api/ventas/:id/comprobante`.
- Exportación a Excel de los reportes detallados de producción y ventas (RF-028), con `GET /api/reportes/{tipo}/detalle/excel` y el botón "Descargar Excel"; dependencia `exceljs` (MIT).
- Prueba de carga `npm run test:perf` (RNF-004: p95 de 60 a 69 ms con 5 usuarios y 1 480 registros) y prueba multinavegador `npm run test:browser` (RNF-007: 30 de 30 flujos en Edge 156, Chrome 156 y Firefox 157), con bases desechables.
- ADR-002 (backend en Node.js), ADR-003 (movimientos de stock en transacción) y ADR-004 (autenticación con JWT).

- Recuperación de contraseña y recordatorio de usuario por correo, con tokens de un solo uso vigentes 30 minutos.
- Ruta de órdenes de producción: el administrador asigna un supervisor y este asigna el operario; plantillas de órdenes frecuentes.
- Reportes de producción y ventas con detalle por periodo diario, semanal, mensual y anual.
- Catálogo de materias primas PEBD, PEAD y PP con medida, calibre, color y peso de rollo.
- Catálogo de seis líneas de producto terminado con variantes y ventas por paquetes de hasta 500 unidades.
- Existencias DEMO de ejemplo para materias primas y producto terminado.

### Security

- La API solo acepta llamadas de otros dominios listados en `CORS_ORIGINS`.
- El token de un usuario desactivado, eliminado o con el rol cambiado deja de servir de inmediato (401), en lugar de seguir vigente hasta 8 horas.
- Un token vencido o inválido responde 401 en lugar de 403, para que el panel cierre la sesión y lleve al login.
- `nodemailer` 7.0.13 → 10.2.1 y `body-parser` 1.20.8 → 1.20.9 (dependencia de Express): `npm audit` queda sin vulnerabilidades. El backend requiere Node.js 20 o superior.

### Changed

- Los formularios del panel ya no muestran textos de ejemplo dentro de los campos (como «Ej. 25»); se conservan las listas de sugerencias de medida, calibre y color.
- Documentación revisada contra el código de `55dce18`: `traceability.md` se genera desde la misma fuente que la matriz de trazabilidad; `project-status.md`, `SECURITY.md` y la guía de usuario reflejan el estado actual, incluido DEF-013.
- Las migraciones del 2026-10-26 retiran materias primas, productos, ventas y movimientos ajenos al catálogo confirmado.

### Fixed

- `db:init` crea una cuenta de demostración por rol (antes faltaban vendedor y almacenista) y carga las existencias DEMO de producto terminado, que antes quedaban en cero (DEF-014). Hallado en la prueba de instalación limpia.
- `db:init` buscaba las migraciones en una ruta inexistente, así que `DB_APPLY_MIGRATIONS=true` no aplicaba nada ni mostraba aviso (DEF-015).
- Formulario «Registrar movimiento» de materias primas, retirado por error en el cambio de catálogos (DEF-013): compras y ajustes para administrador y almacenista, y consumo en una orden activa que usa la bobina para administrador y supervisor.
- Acceso del operario a su panel.
- Nombres de producto mal formados ocultos en ventas y dashboards.
- Tildes faltantes en el sitio público, el inicio de sesión y los mensajes de autenticación.
- El inicio de sesión y el sitio público nombran los cinco roles del sistema.
- Singular y plural en el resumen operativo ("1 producto agotado") y siglas en lugar de puntos en las tarjetas.

### Added (2026-10-19)

- Dashboard unificado por rol con React y Vite.
- Perfiles de vendedor y almacenista con vistas y permisos específicos.
- Ledgers transaccionales para materias primas e inventario; las migraciones requieren autorización explícita y confirmación de respaldo.
- Edición segura de órdenes pendientes y pruebas automatizadas de movimientos, permisos y validaciones.
- Documentación de instalación, arquitectura, API, datos, pruebas y brechas funcionales.
- CI para pruebas del backend, auditoría crítica y build del frontend.

### Changed

- Express prioriza el build React y conserva el sitio público estático.
- El proxy de Vite toma el puerto del entorno del backend en vez de fijarlo a 3001.
- Actualizadas dependencias transitivas compatibles del backend; quedan avisos altos en herramientas de desarrollo.

### Removed

- Páginas de dashboard HTML separadas por rol y su motor JavaScript anterior.
