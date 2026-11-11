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
- CP-028: orden del administrador (rechazada sin medida, calibre y color; queda sin supervisor fijo, CR-014) → asignación del supervisor, que toma la orden → avance del operario (rechazo por exceso y finalización) → inventario (la variante de la orden se crea si no existe, con la medida normalizada «40 x 60 cm») y movimiento → venta del vendedor → comprobante (CP-056) → reportes semanales y descarga en Excel (CP-059).
- CP-029: acceso directo a 16 operaciones (incluido `POST /ventas`, que el supervisor ya no puede usar, DEF-007) con el token de cada uno de los cinco roles y sin token (401/403 según la matriz de permisos).
- CP-031: cinco ventas concurrentes sobre 1 500 unidades: se aceptan tres, se rechazan dos y el saldo queda en 0 sin valores negativos.
- HU-019: bloqueo al quinto intento, rechazo con la contraseña correcta, desbloqueo del administrador y registro en auditoría.
- ADR-004 (CP-054): el token deja de servir al desactivar al usuario o cambiarle el rol.
- DEF-023 (CP-092): JSON mal formado (400); una orden pendiente sin avance se elimina (204) y luego da 404, una con avance no se elimina (400) y sigue en la base; usuario y bobina inexistentes (404); cantidad al editar una bobina (400); tipo de movimiento inventado (400); fecha 2026-13-45 en la auditoría (400).
- DEF-022 y CR-018 (CP-090, CP-091): una meta de 10^12, de 10,5 o «2abc», un ingreso de 10^12, una salida de 1,5, una venta de 60 unidades por paquete, de 1 001 paquetes, con «2abc» paquetes o con precio de 10^15, una bobina repetida, un stock mínimo negativo y un usuario con espacio se rechazan con 400 o 409 sin guardar nada; además, la base en modo estricto rechaza un valor que no cabe en la columna.
- DEF-021 (CP-089): el administrador no puede quitarse el rol, desactivarse ni eliminarse (400 y sin cambios en la base); sí puede desactivar a otro administrador.
- DEF-013 (CP-062): compra, ajuste mayor al saldo (rechazo sin cambios), permisos por tipo de movimiento, consumo en una orden que no usa la bobina (rechazo) y consumo válido ligado a la orden.
- Salida manual de inventario: sin motivo o con «Otro» sin detalle se rechaza sin descontar; con motivo queda en el movimiento. Una medida de 41 caracteres y un cliente de 121 se rechazan con 400 (validación de largo en el servidor).
- Migración `20261027_login_lockout.sql` aplicada sobre una tabla sin las columnas y ejecutada dos veces (idempotente).
- Edición de órdenes: la variante incompleta se rechaza, el supervisor edita variante, meta y prioridad de una orden pendiente, y una orden con avance no se puede editar. El administrador y el supervisor no inician ni finalizan (400) y sí cancelan (CR-013).
- Mi historial: el operario ve su avance del día con la observación (`/produccion/mis-registros`); otro rol recibe 403 y un periodo inválido, 400.
- HU-022 (CP-079): el operario activo aparece en el reporte de rendimiento aunque no tenga órdenes; al crearle una orden de 200 con avance de 50 y otra cancelada de 999, su meta sube 200, lo producido 50 (la cancelada no cuenta) y el cumplimiento es producido ÷ meta. El operario y el vendedor reciben 403, un periodo inválido 400, y el Excel trae su fila en la hoja «Por operario».
- CR-014: los supervisores ven la orden pendiente del administrador, el administrador puede asignar el operario sin cambiar el supervisor y el operario no puede asignar (403).
- Plantillas: sin variante o sin materia prima se rechaza (400, RN-026), la misma variante repetida da 409 y otra variante de la misma línea se acepta.
- RN-025 y RN-026 (CP-081, CP-086, CP-087): una medida «eddc», un calibre «eew» o un color fuera de la lista («Fdsa») se rechazan con 400; la medida «40x60 cm» se guarda como «40 x 60 cm»; una orden sin materia prima se rechaza.
- CR-016 (CP-083, CP-084): los inicios de sesión no quedan en la tabla `auditoria`; la bitácora filtra por acción y fechas con total y páginas, rechaza filtros inválidos, y el archivo de lo de más de 12 meses escribe el CSV, borra solo eso, deja un evento ARCHIVAR_AUDITORIA y no repite.
- CR-019 (CP-095): una orden de Cargadera en «t20» se guarda como T20; en «15 x 20» se rechaza con 400, igual que una talla en otra línea; la migración `20261110_cargadera_tallas.sql`, aplicada dos veces, pasa existencias, órdenes y plantillas de Cargadera en «15 x 20» a T15 sin perder unidades.
- CR-020 (CP-096): `GET /lineas` trae las seis líneas de base; el supervisor no puede crear una línea (403), un nombre con «<» se rechaza (400), «  bolsa   de regalo » se guarda como «Bolsa de regalo», «BOLSA DE REGALO» y «troquel rinon» responden 409; con la línea nueva se crea una orden en «20x30» (en «T20», 400), se ingresa inventario y se vende, y la creación queda en la auditoría.
- Migración `20261109_drop_unused_columns.sql` (CR-015, CP-082) aplicada sobre una base con `inventario.ubicacion` y `produccion.lote`, dos veces: quita las columnas sin perder filas.
- Migración `20261027_template_variant.sql` aplicada sobre la tabla anterior (clave única por línea) y ejecutada dos veces; conserva la plantilla existente.

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

Los navegadores ocupan unos 300 MB y por defecto se guardan en el perfil del usuario (disco C:). Para guardarlos en otro disco, defina la misma ruta al instalar y al ejecutar, por ejemplo `$env:PLAYWRIGHT_BROWSERS_PATH = "J:\playwright-navegadores"`.

`backend/tests/browser/navegadores.browser.js` crea `meviplast_browser` y ejecuta 17 flujos críticos (incluidos las órdenes del administrador en tabla, con su detalle, edición y cancelación en una ventana; crear una línea y un material desde los selectores de la nueva orden, CR-020; las ventanas de confirmación y el comprobante usados solo con teclado, RNF-012; el reporte de rendimiento de operarios con su descarga en Excel, CP-080; compra, ajuste rechazado y consumo de materia prima; cerrar sesión con confirmación; el menú desde un reporte; «Mis tareas» → «Registrar avance» → «Mi historial»; y la confirmación con resumen de los registros irreversibles, donde «Revisar» no guarda; y la validación propia del panel: venta sin cliente y paquete de 600 unidades muestran su aviso sin abrir la confirmación) en Edge (instalado en el equipo), Chrome for Testing y el Firefox de Playwright. Un flujo falla si aparece un error de JavaScript o una respuesta de error de la API no esperada. Resultado en [`../evidence/EV-2026-10-27-rnf.md`](../evidence/EV-2026-10-27-rnf.md).

## Cobertura automatizada

116 pruebas unitarias y de rutas con `node:test` (116 aprobadas el 2026-11-10), en 25 archivos. `npm test` y la cobertura cargan antes `tests/entorno-pruebas.js`, que apunta `DB_NAME` a una base que no existe: ninguna prueba unitaria puede leer ni escribir en la base configurada en `.env`.

- `auditoria.test.js` (7): archivo diario de accesos con campos sensibles ocultos, borrado de los archivos de log más viejos que la retención, `LOG_DIR=off`, filtros de la bitácora en el servidor, páginas de 20 (máximo 100), filtros inválidos (400) y formato del CSV de archivo (CR-016).

- `auth.lockout.test.js` (5): contador de intentos fallidos, bloqueo en el quinto intento con auditoría, rechazo de una cuenta bloqueada aunque la contraseña sea correcta, reinicio al iniciar sesión y desbloqueo por el administrador.
- `auth.middleware.test.js` (6): token válido, usuario desactivado, rol cambiado, usuario eliminado, token vencido y falta de token (DEF-011).
- `auth.recovery.test.js` (3): correo inválido, token inválido o vencido y consumo del token en una transacción.
- `auth.smtp.test.js` (1): la recuperación entrega el correo a un servidor SMTP local con el enlace de un solo uso.
- `entorno.test.js` (1): falla si se quita la carga de `tests/entorno-pruebas.js` (las pruebas unitarias no usan la base de `.env`).
- `er.test.js` (2): el diagrama `docs/data/er.md` tiene todas las tablas y columnas de `schema.sql` y sus 16 claves foráneas con la regla de borrado.
- `health-cors.routes.test.js` (3): health check con base de datos disponible (200) y caída (503 sin exponer el error), y CORS limitado a los orígenes configurados.
- `inventario.service.test.js` (5): variantes del catálogo, rechazo de líneas ajenas, salida manual con ledger, motivo obligatorio (y detalle si es «Otro») y motivo guardado en el movimiento y la auditoría.
- `longitudes.test.js` (2): un texto más largo que su columna se rechaza con 400 y la variante respeta el largo de medida, calibre y color.
- `lineas.test.js` (5): nombre de una línea nueva (limpio, de 3 a 60 caracteres, sin símbolos), lista de la tabla con las seis de base si falta, sin consultar la base para una línea de base, 409 si ya existe sin importar mayúsculas y auditoría, y una línea nueva medida en «ancho x largo» (CR-020).
- `logger.test.js` (4): formato JSON por línea, filtro por `LOG_LEVEL`, campos sensibles ocultos, errores convertidos a texto y registro de cada petición sin el cuerpo.
- `materiaPrima.service.test.js` (4): registro de bobinas, validaciones, compra transaccional y rollback por stock insuficiente.
- `numeros.test.js` (7): lectura estricta de números («2abc», «1e5» y «0x10» no son números), enteros de 1 a 1 000 000, kg con 2 decimales hasta 100 000, metas y avances enteros, ingresos y salidas con tope, bobina única por variante (409) y ventas de 50, 100 o 500 unidades por paquete, hasta 1 000 paquetes y $100 000 000 (DEF-022, CR-018).
- `openapi.test.js` (2): el contrato `docs/api/openapi.json` tiene exactamente las 52 operaciones registradas en Express, y cada ruta protegida declara roles y respuestas 401 y 403.
- `production.service.test.js` (17): edición parcial sin quitar la materia prima (RN-026), plantillas del catálogo con variante y materia prima, administrador y supervisor solo cancelan (CR-013), alcance del supervisor y orden por prioridad, observación del avance en el movimiento (máx. 255), historial del operario por periodo, registro de avance, variante obligatoria al crear y editar, y avance sumado a la variante de la orden (o creada si no existe).
- `reportes.service.test.js` (6): límites de periodo calendario, filtro de ventas por rango, páginas de la bitácora (20 por defecto, de 1 a 100, del más reciente al más antiguo) y cumplimiento de la meta por operario (HU-022): porcentaje por operario y total, orden de mayor a menor, operario sin órdenes sin porcentaje, órdenes canceladas excluidas y producido limitado a la meta.
- `reportesExcel.service.test.js` (3): hojas, montos numéricos con formato, hora local, texto con «=» sin fórmula, periodo inválido y Excel de rendimiento con una fila por operario.
- `respuestas-api.test.js` (5): JSON mal formado (400), eliminación solo de órdenes pendientes sin avance (400 y 404), usuario inexistente (404), cantidad o material inválido al editar una bobina (400) y fechas inexistentes en la auditoría (400) (DEF-023).
- `role-access.routes.test.js` (1): permisos HTTP de lectura por rol y registro de ventas solo para administrador y vendedor (DEF-007), con base de datos simulada.
- `sanitize.test.js` (4): sanitización de texto, números y objetos (un número mal escrito como «2abc» queda como texto para que el servicio lo rechace); los campos de texto cuya clave contiene «id» no se convierten en número.
- `schema.test.js` (5): el esquema se carga en la base indicada por `DB_NAME`, el nombre rechaza caracteres de inyección, `db:init` explica un MySQL apagado o un usuario rechazado (DEF-016), calcula las migraciones pendientes (DEF-017) y la semilla DEMO solo usa columnas de `schema.sql` (DEF-020).
- `usuarios.service.test.js` (5): nadie se quita su propio rol de administrador, se desactiva ni se elimina; con otro administrador activo sí se cambia a un admin; siempre queda al menos uno activo; el admin sí cambia su propio nombre o correo (DEF-021).
- `variantes.test.js` (8): medida «ancho x largo» normalizada, tallas T15 a T30 solo para Cargadera (CR-019), calibre numérico, color de la lista fija (RN-025), rechazo de «eddc», «eew» o «Fdsa», y materia prima obligatoria y existente en la orden (RN-026).
- `ventas.service.test.js` (5): paquetes de 50, 100 o 500 unidades (CR-018), descuento por paquetes, aislamiento del vendedor y comprobante.

CI: instalación por lockfile, lint, pruebas, build y la suite E2E con MariaDB.

## Cobertura

```powershell
npm run test:coverage --prefix backend        # solo unitarias; mínimo 58 % de líneas
npm run test:coverage:total --prefix backend  # unitarias + E2E (requiere MySQL); mínimo 75 % de líneas
```

Usa la cobertura integrada de Node.js sobre `backend/src` (sin dependencias nuevas). Medición del 2026-11-09, sobre la rama `fix/MEVI-71-respuestas-api` (DEF-023):

| Alcance | Líneas | Ramas | Funciones |
| --- | --- | --- | --- |
| Unitarias | 70,8 % | 81,0 % | 65,7 % |
| Unitarias + E2E | 88,5 % | 82,5 % | 89,9 % |

Los controladores se cubren sobre todo con la suite E2E, por eso suben al combinar. Las áreas menos cubiertas son los caminos de error de los controladores. El CI ejecuta los dos comandos y falla si la cobertura de líneas baja del mínimo. Los mínimos están un poco por debajo de la medición para tolerar variaciones pequeñas; súbanlos cuando agreguen pruebas.

## Cobertura pendiente

La recuperación de contraseña y de usuario con un buzón real (Gmail del proyecto) se probó el 08/11/2026: CP-030, [`../evidence/EV-2026-11-08-correo.md`](../evidence/EV-2026-11-08-correo.md).

El contraste de color (WCAG 2.1 AA) se midió con un script sobre las 21 vistas de los cinco roles, en escritorio y en celular, el 10/11/2026: 0 combinaciones por debajo de 4,5:1, sin desborde horizontal en celular y con todos los campos etiquetados ([`../evidence/EV-2026-11-10-contraste.md`](../evidence/EV-2026-11-10-contraste.md)). El uso solo con teclado se probó el mismo día en las 21 vistas y con una venta completa ([`../evidence/EV-2026-11-10-teclado.md`](../evidence/EV-2026-11-10-teclado.md)). Falta probar la accesibilidad con lector de pantalla y con usuarios.

Queda pendiente:

- Rendimiento medido en el servidor y la red de la empresa.
- Compatibilidad con el Firefox oficial y con la penúltima versión de cada navegador.
- Usabilidad (RNF-006) y accesibilidad (RNF-012) con usuarios de MEVIPLAST.
- Sesión de aceptación por rol con usuarios de MEVIPLAST: no se realizó; las decisiones pendientes las tomó el equipo por delegación ([`../requirements/decisiones-por-delegacion.md`](../requirements/decisiones-por-delegacion.md)).

Los resultados del smoke test con base aislada están en [`../evidence/EV-2026-10-21.md`](../evidence/EV-2026-10-21.md), los de instalación por lockfile en [`../evidence/EV-2026-10-20.md`](../evidence/EV-2026-10-20.md) y la evidencia histórica de navegación en [`../evidence/EV-2026-10-19.md`](../evidence/EV-2026-10-19.md).
