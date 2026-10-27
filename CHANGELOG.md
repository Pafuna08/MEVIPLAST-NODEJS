# Changelog

Los cambios relevantes se registran aquí. El proyecto todavía no tiene una versión estable etiquetada.

## Unreleased - 2026-10-27

### Added

- Bloqueo temporal de la cuenta tras 5 intentos fallidos seguidos (15 minutos, configurable) y desbloqueo por el administrador.
- Endpoint `GET /api/health` para verificar la API y la base de datos.
- Licencia propietaria y lint con ESLint en backend, frontend y CI.

- Recuperación de contraseña y recordatorio de usuario por correo, con tokens de un solo uso vigentes 30 minutos.
- Ruta de órdenes de producción: el administrador asigna un supervisor y este asigna el operario; plantillas de órdenes frecuentes.
- Reportes de producción y ventas con detalle por periodo diario, semanal, mensual y anual.
- Catálogo de materias primas PEBD, PEAD y PP con medida, calibre, color y peso de rollo.
- Catálogo de seis líneas de producto terminado con variantes y ventas por paquetes de hasta 500 unidades.
- Existencias DEMO de ejemplo para materias primas y producto terminado.

### Security

- La API solo acepta llamadas de otros dominios listados en `CORS_ORIGINS`.

### Changed

- Las migraciones del 2026-10-26 retiran materias primas, productos, ventas y movimientos ajenos al catálogo confirmado.

### Fixed

- Acceso del operario a su panel.
- Nombres de producto mal formados ocultos en ventas y dashboards.

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
