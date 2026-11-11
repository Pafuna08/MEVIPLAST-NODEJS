# Evidencia del despliegue en Render (2026-11-11)

- Servicio: **https://meviplast.onrender.com**. Render, servicio web `meviplast` (plan Free, Virginia), creado desde el Blueprint `render.yaml` de la rama `develop`; se vuelve a desplegar en cada fusión.
- Base de datos: Aiven for MySQL 8.4.11, plan Developer-1 (1 CPU, 1 GB de RAM, 8 GB), pagado con los créditos de prueba de Aiven; conexión TLS 1.3 con el certificado de Aiven; `sql_require_primary_key` activo (todas las tablas tienen llave primaria).
- Código: `develop` en `3fad621` (PR #91 y #92).
- Datos: los mismos datos coherentes de las bases locales, cargados por la API con contraseñas aleatorias, guardadas solo en el equipo del responsable. No hay cuentas demo.
- Origen: el instructor preguntó si la aplicación estaba desplegada; el equipo decidió publicarla en Render.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-11-06 · PROD-04 / RNF-009 · DEF-026

| Comprobación | Resultado |
| --- | --- |
| Compilación en Render (`npm ci`, compilación del panel) | Correcta |
| Primer arranque | Falló con `getaddrinfo ENOTFOUND <host>\n`: el valor de `DB_HOST` pegado en el panel de Render terminaba en un salto de línea (DEF-026) |
| Corrección (PR #92) | Se quitan espacios y saltos de línea de los datos de conexión y del certificado; el despliegue siguiente arrancó sin tocar las variables |
| `GET /api/health` | 200 `{"estado":"ok","baseDatos":"ok"}` |
| Inicio, `login.html` y `dashboard.html` | 200 |
| Inicio de sesión del administrador | 200; el panel muestra 6 órdenes activas, 3 670 unidades producidas y $381 500 en 7 ventas |
| `admin` con la contraseña demo `admin123` | 401: la versión publicada no tiene cuentas demo |
| Comprobante y reporte de ventas en PDF | 200 `application/pdf` |
| Reporte diario | Del 2026-11-11 al 2026-11-11, con las 7 ventas del día |
| Hora de las fechas guardadas | La última venta quedó con 04:33:54, la hora de Colombia (servidores en UTC; `TZ` y `DB_TIME_ZONE=-05:00`) |
| Supervisor en `GET /ventas` | 403 (CR-021) |

## Limitaciones del plan gratuito

- Render duerme el servicio tras 15 minutos sin uso; la primera visita después tarda entre 30 y 60 segundos.
- Los créditos de prueba de Aiven tienen fecha de vencimiento; sin un medio de pago, Aiven apaga la base. Antes se exporta un respaldo.
- La recuperación de contraseña por correo no está configurada en la nube (variables `SMTP_*` vacías).
- Render anunció mantenimiento para el 17/11/2026 a las 9:00 p. m. (hora de Colombia).
