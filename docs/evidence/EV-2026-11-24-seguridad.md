# Evidencia: auditoría de seguridad y correcciones (2026-11-23 y 2026-11-24)

- Herramienta: skill `security-audit` de Cloudflare (github.com/cloudflare/security-audit-skill), perfil **quick**, sobre `develop` al commit `abbdf92`.
- Condición: revisión **solo del código fuente**. No había un entorno aislado del sistema operativo (Docker detenido, disco C: casi lleno), así que no se ejecutó código ni se probó el sitio en Render. Ningún hallazgo pudo quedar «confirmado»; los 10 quedaron «por validar» y se corrigieron.
- Agentes: 23 de un tope de 30 (4 de reconocimiento, 8 cazadores, 1 crítico de cobertura, 10 verificadores independientes). Los dos validadores de la skill aprobaron `findings.json` (10 registros) y `coverage-ledger.json` (27 unidades: 13 cubiertas, 11 con hallazgo, 3 diferidas).
- Informes completos (fuera del repositorio): `Scrum/Auditoria_Seguridad/MEVIPLAST-NODEJS/run-1/` (REPORT.md, NEEDS-VALIDATION.md).
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-24-01 · DEF-030 a DEF-039 · CP-104 a CP-106

| Defecto | Hallazgo | Corrección | PR |
| --- | --- | --- | --- |
| DEF-030 | El enlace de recuperación y el recordatorio de usuario iban a la dirección escrita en la petición; la búsqueda no distingue tildes | Coincidencia exacta y envío a la dirección guardada | #103 |
| DEF-031 | `db:init` sembraba cuentas DEMO con contraseñas públicas al migrar una base existente si faltaba `DB_DEMO=false` | DEMO solo en base nueva o con `DB_DEMO=true` | #103 |
| DEF-032 | El correo SMTP podía seguir sin cifrar si el servidor no ofrecía STARTTLS | `requireTLS` cuando `SMTP_SECURE` no es `true` | #103 |
| DEF-033 | Las transacciones de inventario pedían otra conexión al pool (riesgo de bloquear la API) | La validación de la línea usa la conexión de la transacción | #104 |
| DEF-034 | El supervisor recibía el cliente de las ventas en el historial de inventario (contra CR-021) | `cliente_venta` vacío para el supervisor | #104 |
| DEF-035 | Sin defensa contra *clickjacking* | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, sin `x-powered-by` | #104 |
| DEF-036 | `restablecer-password` calculaba bcrypt antes de comprobar el token | Se comprueba el token primero | #104 |
| DEF-037 | Un supervisor podía registrar consumo de bobina en la orden de otro | Se rechaza | #104 |
| DEF-038 | El login dejaba la contraseña en el historial del navegador | Campos limpios y navegación con `replace` | #104 |
| DEF-039 | U+FFFE/U+FFFF en el cliente dañaban el Excel de ventas | El sanitizador los elimina | #104 |

| Comprobación | Resultado |
| --- | --- |
| Pruebas unitarias y de rutas | 148 de 148 (`auth.correo-exacto.test.js` 4, `seguridad-auditoria.test.js` 6, `auth.smtp.test.js` y `auth.recovery.test.js` ajustadas) |
| CI de los PR #103 y #104 | `validate` y `e2e` aprobados (24 E2E) |
| `npm audit` | 0 vulnerabilidades |

Quedaron sin revisar, por el perfil rápido: los `produccion_id` de los ingresos manuales de inventario, el CSV de auditoría y la clave `__proto__` en los servicios.
