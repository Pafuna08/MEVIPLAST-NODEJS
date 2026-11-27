# Seguridad

## Estado

Este repositorio es un proyecto académico en desarrollo, no un servicio aprobado para producción. El backend usa JWT, bcryptjs, permisos por rol y consultas parametrizadas en los servicios revisados; esto no reemplaza una auditoría de seguridad ni pruebas de despliegue.

El 2026-10-27 `npm audit` reportó 0 vulnerabilidades en backend y frontend, después de actualizar `nodemailer` a la 10.2.1 y `body-parser` a la 1.20.9 (PR #29). El CI falla si aparece una vulnerabilidad crítica. Repite la auditoría antes de cada entrega o despliegue.

Controles relevantes: bloqueo de la cuenta tras 5 intentos fallidos, CORS limitado a `CORS_ORIGINS` y rechazo del token de un usuario desactivado o con el rol cambiado ([ADR-004](docs/adr/ADR-004-autenticacion-jwt.md)). Limitación conocida: cerrar sesión borra el token del navegador, pero no lo revoca en el servidor; vence a las 8 horas.

## Reporte responsable

No publiques credenciales, tokens, datos personales ni detalles explotables en issues públicos. Usa la opción **Report a vulnerability** de GitHub si está habilitada; de lo contrario, informa al propietario del repositorio por un canal privado y describe impacto, pasos de reproducción y versión afectada.

## Reglas para el equipo

- Mantén secretos únicamente en `backend/.env`, excluido de Git.
- Cambia el secreto JWT de ejemplo por uno aleatorio y privado.
- No uses cuentas demo en un entorno real.
- No ejecutes `db:init` sobre datos reales sin respaldo y aprobación.
- Valida permisos en la API; ocultar opciones en el frontend no es un control de seguridad.
