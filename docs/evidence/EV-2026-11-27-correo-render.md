# Evidencia: recuperación por correo en local y en Render (2026-11-27)

- Alcance: DEF-042, MEVI-127, CP-118. El usuario informó que no le funcionaban la recuperación de contraseña ni el recordatorio de usuario, ni en local ni en la demostración de Render.
- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP); demostración en `https://meviplast.onrender.com` (Render, plan gratuito, con la base en Aiven).
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-27-01 · Diagnóstico

| Comprobación | Resultado |
| --- | --- |
| Render: `POST /api/auth/recordar-usuario` y `/recuperar-password` con un correo que no existe (no envía nada) | 503 «falta configurar SMTP»: el servicio no tenía las variables del correo |
| Render, plan gratuito | Desde septiembre de 2025 bloquea la salida a los puertos SMTP 25, 465 y 587 (registro de cambios de Render): aunque se configure Gmail, el correo no sale |
| Local: inicio de sesión SMTP en Gmail (`verify`, sin enviar) | Gmail acepta el usuario y la contraseña de aplicación |
| Local: correo de las cuentas en `meviplast_db` | Direcciones de ejemplo (`admin@gmail.com`, `supervisor@gmail.com`…): el mensaje iba a buzones ajenos o inexistentes, nunca al del equipo. Si se escribe un correo que no tiene ninguna cuenta, la API responde lo mismo y no envía nada (así se evita revelar qué correos existen) |
| Nube: correo de las cuentas | El administrador tiene el buzón del proyecto; las demás, direcciones `@meviplast.test`, que no reciben correo |

## Corrección

- Código (DEF-042): con `BREVO_API_KEY`, el servidor envía la recuperación y el recordatorio por la API HTTPS de Brevo (puerto 443, que Render no bloquea), con el remitente de `SMTP_FROM`; sin esa variable sigue usando SMTP. Si Brevo rechaza el envío, el enlace se borra y la API responde 500 sin dejar un token huérfano.
- Datos locales (`meviplast_db` y `meviplast_prueba`, respaldo previo de la tabla `usuarios`): cada cuenta recibe una dirección del buzón del proyecto (`meviplast@gmail.com` para el administrador y `meviplast+<usuario>@gmail.com` para las demás; Gmail entrega las direcciones con «+» en el mismo buzón). Cada usuario puede cambiarla por su correo real en «Mi perfil».

| Prueba | Resultado |
| --- | --- |
| Local, API en el puerto 3996 con `meviplast_db`: recordatorio de usuario de `meviplast+supervisor@gmail.com` | 200; enviado por Gmail al buzón del proyecto |
| Local: recuperación de contraseña de `meviplast+operario@gmail.com` | 200; el enlace quedó guardado (solo se guarda si el envío no falla) |
| Pruebas unitarias (`npm test`) | 168 de 168; CP-118 en `auth.brevo.test.js`: envío por Brevo sin SMTP, recordatorio por Brevo, enlace borrado si Brevo rechaza, 503 sin remitente |
| Lint del backend; `git diff --check` | Sin errores |

Pendiente en Render: crear la cuenta de Brevo con el buzón del proyecto, verificar el remitente y escribir `BREVO_API_KEY`, `SMTP_FROM` y `FRONTEND_URL` en el panel (pasos en `docs/operations/despliegue-render.md`, sección 6). La prueba en Render se agrega a esta evidencia cuando esté hecha.
