# ADR-004: autenticar con JWT de 8 horas y controlar permisos por rol en la API

- Estado: Aceptado
- Fecha de la decisión: 2026-08-04 (estructura base); registrada el 2026-10-27
- Trazabilidad: RF-001, RF-002, RF-004, RF-005, HU-019, RNF-001 (seguridad), commit `9173119`; bloqueo de cuenta en el PR #17

## Contexto

El sistema tiene cinco roles (administrador, supervisor, operario, almacenista y vendedor), y cada uno ve y modifica cosas distintas. La API la consume la aplicación React: el inicio de sesión y la recuperación de cuenta, y el panel (ADR-001). Se necesitaba identificar al usuario en cada petición y comprobar su rol en el servidor, no solo ocultar opciones en la pantalla.

## Opciones

1. Sesiones en el servidor con cookie (por ejemplo, `express-session` con almacén en MySQL).
2. Token JWT firmado por el servidor, enviado en el encabezado `Authorization: Bearer`.
3. Un proveedor externo de identidad (OAuth, Auth0, etc.).

## Decisión

Opción 2, con estas reglas:

- `POST /api/auth/login` verifica la contraseña con bcryptjs y devuelve un JWT firmado con `JWT_SECRET` que contiene `id`, `usuario` y `rol`. Vence a las 8 horas (`JWT_EXPIRES_IN`, una jornada de trabajo).
- `verificarToken` valida la firma y la vigencia en cada ruta protegida y consulta en la base que el usuario siga activo y con el mismo rol del token; si no, responde 401 (desde el 2026-10-27, PR #26). `verificarRol(...)` restringe cada ruta a los roles permitidos (`backend/src/middlewares/auth.middleware.js`). Los permisos se deciden en el servidor.
- Tras 5 intentos fallidos la cuenta se bloquea 15 minutos (HU-019, HTTP 423). El administrador puede desbloquearla.
- El cliente guarda el token en `localStorage` y lo borra al cerrar sesión.
- Desde el 2026-11-24 (HU-020, PR #109) el token lleva la versión de sesión del usuario (`sv`, columna `usuarios.sesion_version`). `POST /api/auth/logout` y el restablecimiento de contraseña la suben, y `verificarToken` rechaza con 401 los tokens de una versión anterior.

Se descartó la opción 1 porque obliga a guardar sesiones en el servidor y a manejar cookies y CSRF para dos clientes. Se descartó la opción 3 porque depende de un servicio externo y es más de lo que necesita un sistema interno de una sola empresa.

## Consecuencias

- La API no guarda sesiones; los dos clientes usan el mismo mecanismo. Cada petición hace una consulta corta a `usuarios` por clave primaria, a cambio de que desactivar a un usuario o cambiarle el rol tenga efecto de inmediato (lo cubren `auth.middleware.test.js` y la suite E2E).
- Cerrar sesión revoca en el servidor todos los tokens emitidos a ese usuario (en todos sus navegadores), sin guardar sesiones: basta la versión de sesión que ya se consulta en cada petición. Antes del PR #109 solo se borraba el token del navegador (DEF-006). Si el navegador no alcanza al servidor al cerrar sesión, el token vence a las 8 horas.
- Guardar el token en `localStorage` lo expone si la página sufriera XSS. Se mitiga saneando las entradas (`sanitizar.js`) y porque React escapa el contenido. Una alternativa futura es una cookie `HttpOnly`.
- La seguridad depende de que `JWT_SECRET` sea largo, aleatorio y privado: no va en el repositorio (`backend/.env` está ignorado y gitleaks lo vigila en CI), y cambiarlo cierra todas las sesiones.
- Si no hay HTTPS, el token viaja en claro. Un despliegue productivo debe usar HTTPS.
