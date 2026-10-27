# ADR-004: autenticar con JWT de 8 horas y controlar permisos por rol en la API

- Estado: Aceptado
- Fecha de la decisión: 2026-08-04 (estructura base); registrada el 2026-10-27
- Trazabilidad: RF-001, RF-002, RF-004, RF-005, HU-019, RNF-001 (seguridad), commit `9173119`; bloqueo de cuenta en el PR #17

## Contexto

El sistema tiene cinco roles (administrador, supervisor, operario, almacenista y vendedor), y cada uno ve y modifica cosas distintas. La API la consumen dos clientes: el login y el sitio público en HTML y JavaScript, y el panel en React (ADR-001). Se necesitaba identificar al usuario en cada petición y comprobar su rol en el servidor, no solo ocultar opciones en la pantalla.

## Opciones

1. Sesiones en el servidor con cookie (por ejemplo, `express-session` con almacén en MySQL).
2. Token JWT firmado por el servidor, enviado en el encabezado `Authorization: Bearer`.
3. Un proveedor externo de identidad (OAuth, Auth0, etc.).

## Decisión

Opción 2, con estas reglas:

- `POST /api/auth/login` verifica la contraseña con bcryptjs y devuelve un JWT firmado con `JWT_SECRET` que contiene `id`, `usuario` y `rol`. Vence a las 8 horas (`JWT_EXPIRES_IN`, una jornada de trabajo).
- `verificarToken` valida la firma y la vigencia en cada ruta protegida; `verificarRol(...)` restringe cada ruta a los roles permitidos (`backend/src/middlewares/auth.middleware.js`). Los permisos se deciden en el servidor.
- Tras 5 intentos fallidos la cuenta se bloquea 15 minutos (HU-019, HTTP 423). El administrador puede desbloquearla.
- El cliente guarda el token en `localStorage` y lo borra al cerrar sesión.

Se descartó la opción 1 porque obliga a guardar sesiones en el servidor y a manejar cookies y CSRF para dos clientes. Se descartó la opción 3 porque depende de un servicio externo y es más de lo que necesita un sistema interno de una sola empresa.

## Consecuencias

- La API no guarda sesiones: cada petición se valida sola con la firma, y los dos clientes usan el mismo mecanismo.
- **No se puede revocar un token antes de que venza.** Si se desactiva un usuario o se le cambia el rol, su token anterior sigue sirviendo hasta 8 horas. Cerrar sesión solo borra el token del navegador. Mejora posible: comprobar en `verificarToken` que el usuario sigue activo y que su rol no cambió.
- Guardar el token en `localStorage` lo expone si la página sufriera XSS. Se mitiga saneando las entradas (`sanitizar.js`) y porque React escapa el contenido. Una alternativa futura es una cookie `HttpOnly`.
- La seguridad depende de que `JWT_SECRET` sea largo, aleatorio y privado: no va en el repositorio (`backend/.env` está ignorado y gitleaks lo vigila en CI), y cambiarlo cierra todas las sesiones.
- Si no hay HTTPS, el token viaja en claro. Un despliegue productivo debe usar HTTPS.
