# Estrategia y estado de pruebas

## Comandos

```powershell
npm run lint --prefix backend
npm test --prefix backend
npm audit --prefix backend
npm run build --prefix frontend
```

## Pruebas extremo a extremo (MySQL/MariaDB real)

```powershell
npm run test:e2e --prefix backend
```

`backend/tests/e2e/flujos.e2e.js` crea una base desechable (`E2E_DB_NAME`, por defecto `meviplast_e2e`), levanta la API, ejecuta los flujos y elimina la base al terminar (`E2E_KEEP_DB=true` la conserva). Se niega a ejecutarse si el nombre no empieza por `meviplast_e2e`, para no tocar `meviplast_db`. En CI corre en un job aparte con un contenedor MariaDB 10.4.

- Health check con base real.
- CP-028: orden del administrador → asignación del supervisor → avance del operario (rechazo por exceso y finalización) → inventario y movimiento → venta del vendedor → comprobante (CP-056) → reportes semanales y descarga en Excel (CP-059).
- CP-029: acceso directo a 13 endpoints con el token de cada uno de los cinco roles y sin token (401/403 según la matriz de permisos).
- CP-031: cinco ventas concurrentes sobre 1 500 unidades: se aceptan tres, se rechazan dos y el saldo queda en 0 sin valores negativos.
- HU-019: bloqueo al quinto intento, rechazo con la contraseña correcta, desbloqueo del administrador y registro en auditoría.
- ADR-004 (CP-054): el token deja de servir al desactivar al usuario o cambiarle el rol.
- DEF-013 (CP-062): compra, ajuste mayor al saldo (rechazo sin cambios), permisos por tipo de movimiento, consumo en una orden que no usa la bobina (rechazo) y consumo válido ligado a la orden.
- Salida manual de inventario: sin motivo o con «Otro» sin detalle se rechaza sin descontar; con motivo queda en el movimiento.
- Migración `20261027_login_lockout.sql` aplicada sobre una tabla sin las columnas y ejecutada dos veces (idempotente).

## Rendimiento (RNF-004)

```powershell
npm run test:perf --prefix backend
```

`backend/tests/perf/carga.perf.js` crea `meviplast_perf` con unos 1 500 registros, levanta la API como proceso aparte y simula cinco usuarios concurrentes, uno por rol, con sus operaciones habituales. Falla si el percentil 95 supera 3 s o si alguna respuesta es un error. No corre en CI: los tiempos de los servidores compartidos de GitHub no son representativos. Resultado en [`../evidence/EV-2026-10-27-rnf.md`](../evidence/EV-2026-10-27-rnf.md).

## Compatibilidad (RNF-007)

```powershell
npm run build --prefix frontend
cd backend
npx playwright-core install chromium firefox   # una sola vez por equipo
npm run test:browser
```

`backend/tests/browser/navegadores.browser.js` crea `meviplast_browser` y ejecuta 13 flujos críticos (incluidos compra, ajuste rechazado y consumo de materia prima) en Edge (instalado en el equipo), Chrome for Testing y el Firefox de Playwright. Un flujo falla si aparece un error de JavaScript o una respuesta de error de la API no esperada. Resultado en [`../evidence/EV-2026-10-27-rnf.md`](../evidence/EV-2026-10-27-rnf.md).

## Cobertura automatizada

62 pruebas unitarias y de rutas con `node:test` (62 aprobadas el 2026-10-27):

- `auth.lockout.test.js` (5): contador de intentos fallidos, bloqueo en el quinto intento con auditoría, rechazo de una cuenta bloqueada aunque la contraseña sea correcta, reinicio al iniciar sesión y desbloqueo por el administrador.
- `auth.middleware.test.js` (6): token válido, usuario desactivado, rol cambiado, usuario eliminado, token vencido y falta de token (DEF-011).
- `auth.recovery.test.js` (3): correo inválido, token inválido o vencido y consumo del token en una transacción.
- `auth.smtp.test.js` (1): la recuperación entrega el correo a un servidor SMTP local con el enlace de un solo uso.
- `er.test.js` (2): el diagrama `docs/data/er.md` tiene todas las tablas y columnas de `schema.sql` y sus 16 claves foráneas con la regla de borrado.
- `health-cors.routes.test.js` (3): health check con base de datos disponible (200) y caída (503 sin exponer el error), y CORS limitado a los orígenes configurados.
- `inventario.service.test.js` (5): variantes del catálogo, rechazo de líneas ajenas, salida manual con ledger, motivo obligatorio (y detalle si es «Otro») y motivo guardado en el movimiento y la auditoría.
- `logger.test.js` (4): formato JSON por línea, filtro por `LOG_LEVEL`, campos sensibles ocultos, errores convertidos a texto y registro de cada petición sin el cuerpo.
- `materiaPrima.service.test.js` (4): registro de bobinas, validaciones, compra transaccional y rollback por stock insuficiente.
- `openapi.test.js` (2): el contrato `docs/api/openapi.json` tiene exactamente las 47 rutas registradas en Express, y cada ruta protegida declara roles y respuestas 401 y 403.
- `production.service.test.js` (10): edición parcial, plantillas del catálogo, finalización con meta pendiente, alcance del supervisor y registro de avance.
- `reportes.service.test.js` (3): límites de periodo calendario y filtro de ventas por rango.
- `reportesExcel.service.test.js` (2): hojas, montos numéricos con formato, hora local, texto con «=» sin fórmula y periodo inválido.
- `role-access.routes.test.js` (1): permisos HTTP de lectura por rol (base de datos simulada).
- `sanitize.test.js` (4): sanitización de texto, números y objetos; los campos de texto cuya clave contiene «id» no se convierten en número.
- `schema.test.js` (2): el esquema se carga en la base indicada por `DB_NAME` y el nombre rechaza caracteres de inyección.
- `ventas.service.test.js` (5): límite de 500 unidades por paquete, descuento por paquetes, aislamiento del vendedor y comprobante.

CI: instalación por lockfile, lint, pruebas, build y la suite E2E con MariaDB.

## Cobertura

```powershell
npm run test:coverage --prefix backend        # solo unitarias; mínimo 58 % de líneas
npm run test:coverage:total --prefix backend  # unitarias + E2E (requiere MySQL); mínimo 75 % de líneas
```

Usa la cobertura integrada de Node.js sobre `backend/src` (sin dependencias nuevas). Medición del 2026-10-27:

| Alcance | Líneas | Ramas | Funciones |
| --- | --- | --- | --- |
| Unitarias | 61,9 % | 68,4 % | 48,9 % |
| Unitarias + E2E | 78,5 % | 70,2 % | 78,4 % |

Los controladores se cubren sobre todo con la suite E2E, por eso suben al combinar. Las áreas menos cubiertas son `usuarios.service.js` (69 %) y los caminos de error de los controladores. El CI ejecuta los dos comandos y falla si la cobertura de líneas baja del mínimo. Los mínimos están un poco por debajo de la medición para tolerar variaciones pequeñas; súbanlos cuando agreguen pruebas.

## Cobertura pendiente

- Flujo E2E de edición de órdenes.
- Envío de un correo de recuperación real con el SMTP de MEVIPLAST.
- Rendimiento medido en el servidor y la red de la empresa.
- Compatibilidad con el Firefox oficial y con la penúltima versión de cada navegador.
- Usabilidad (RNF-006) y accesibilidad (RNF-012) con usuarios de MEVIPLAST.
- Aceptación del cliente por rol.

Los resultados del smoke test con base aislada están en [`../evidence/EV-2026-10-21.md`](../evidence/EV-2026-10-21.md), los de instalación por lockfile en [`../evidence/EV-2026-10-20.md`](../evidence/EV-2026-10-20.md) y la evidencia histórica de navegación en [`../evidence/EV-2026-10-19.md`](../evidence/EV-2026-10-19.md).
