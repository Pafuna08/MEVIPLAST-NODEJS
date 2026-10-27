# Seguridad

## Estado

Este repositorio es un proyecto académico en desarrollo, no un servicio aprobado para producción. El backend usa JWT, bcryptjs, permisos por rol y consultas parametrizadas en los servicios revisados; esto no reemplaza una auditoría de seguridad ni pruebas de despliegue.

La auditoría consultada el 2026-10-19 encontró tres vulnerabilidades altas en dependencias de desarrollo relacionadas con `nodemon`/`chokidar`/`braces`. Se corrigieron los hallazgos críticos y moderados mediante actualizaciones compatibles. No se aplicó `npm audit fix --force`, porque proponía degradar `nodemon` a una versión mayor anterior. Revisa la auditoría antes de una entrega o despliegue.

## Reporte responsable

No publiques credenciales, tokens, datos personales ni detalles explotables en issues públicos. Usa la opción **Report a vulnerability** de GitHub si está habilitada; de lo contrario, informa al propietario del repositorio por un canal privado y describe impacto, pasos de reproducción y versión afectada.

## Reglas para el equipo

- Mantén secretos únicamente en `backend/.env`, excluido de Git.
- Cambia el secreto JWT de ejemplo por uno aleatorio y privado.
- No uses cuentas demo en un entorno real.
- No ejecutes `db:init` sobre datos reales sin respaldo y aprobación.
- Valida permisos en la API; ocultar opciones en el frontend no es un control de seguridad.
