# Changelog

Los cambios relevantes se registran aquí. El proyecto todavía no tiene una versión estable etiquetada.

## Unreleased - 2026-10-19

### Added
- Dashboard unificado por rol con React y Vite.
- Documentación de instalación, arquitectura, API, datos, pruebas y brechas funcionales.
- CI para pruebas del backend, auditoría crítica y build del frontend.

### Changed
- Express prioriza el build React y conserva el sitio público estático.
- El proxy de Vite toma el puerto del entorno del backend en vez de fijarlo a 3001.
- Actualizadas dependencias transitivas compatibles del backend; quedan avisos altos en herramientas de desarrollo.

### Removed
- Páginas de dashboard HTML separadas por rol y su motor JavaScript anterior.