# Declaración de uso de herramientas de IA

**Estado: borrador. El equipo debe revisarlo, completar los campos marcados con `____` y firmarlo antes de la entrega. No es una declaración firmada.**

Declarar el uso de IA no invalida el trabajo. Lo que sí lo invalida es entregar algo que el equipo no comprende ni puede sustentar (guía de repositorio, numeral 13). Las decisiones de alcance, licencia, aceptación y responsabilidad del producto corresponden a los autores humanos.

## 1. Herramientas

| Herramienta | Modalidad | Periodo | Quién la usó |
|---|---|---|---|
| Claude Code (Anthropic) | Asistente en Visual Studio Code con acceso al repositorio, la terminal y GitHub, siempre con permiso del usuario | Octubre de 2026; los PR #13 a #23 son del 27/10/2026 | Pablo E. Fuenmayor Osuna |
| ____ | ____ | ____ | ____ |

## 2. Uso realizado con Claude Code

### Documentación (suite ADSO)

- Revisión de las guías del SENA (ADSO-AD-001, EST-TEC-01, guía de repositorio, plantillas ADSO-REQ-01 y ADSO-BAC-01) frente al código real.
- Generación de los documentos DOC-01 a DOC-10, el índice maestro, la matriz de trazabilidad, la lista de chequeo y la guía de sustentación, mediante scripts que leen una sola fuente de datos.
- Diagramas de casos de uso UML y capturas del sistema real, tomadas con datos de demostración sobre una base desechable.
- Correcciones pedidas por el instructor: "numeral" en lugar de "§", historias de usuario ordenadas por rol y nombre del instructor.

### Código y repositorio (pull requests en `develop`)

| PR | Cambio |
|---|---|
| #13 | Licencia propietaria (`LICENSE`); el equipo eligió el tipo de licencia |
| #14 | ESLint en backend y frontend, ejecutado en CI |
| #15 | Pruebas del registro de avance de producción (RF-010) |
| #16 | CORS restringido por `CORS_ORIGINS` y `GET /api/health` |
| #17 | Bloqueo de cuenta tras 5 intentos fallidos durante 15 minutos (HU-019); el equipo aprobó los valores |
| #18 | Corrección DEF-008: el saneador vaciaba textos cuya clave contenía "id" |
| #19 | Pruebas E2E contra MySQL y su ejecución en CI |
| #20 | Corrección DEF-009: `db:init` ignoraba `DB_NAME` |
| #21 | Evidencia de la ejecución E2E, el respaldo, la prueba de restauración y la migración del bloqueo |
| #22 | ADR-002: backend en Node.js; el motivo (recomendación del instructor y dominio de JavaScript) lo dio el equipo |
| #23 | Tildes, lista de roles y plurales en la interfaz |
| #24 | Este borrador de declaración de uso de IA |
| #25 | ADR-003 (ledger de movimientos) y ADR-004 (JWT), redactados a partir del código |
| #26 | Corrección DEF-011: el token de un usuario desactivado o con el rol cambiado deja de servir; token vencido responde 401 |
| #27 | Comprobante de venta imprimible (RF-023) |
| #28 | Exportación de reportes a Excel (RF-028) |
| #29 | Actualización de `nodemailer` y `body-parser` por alertas de seguridad, con prueba SMTP |
| #30 | Pruebas de rendimiento (RNF-004) y de navegadores (RNF-007), con su evidencia |
| #31 | Revisión de la documentación del repositorio contra el código actual |
| #32 | README, arquitectura, esquema y guías al día |
| #33 | Corrección DEF-013: formulario de movimientos de materia prima restaurado, con prueba E2E y de navegadores; la decisión de restaurarlo la tomó el equipo |
| #34 | Prueba de instalación limpia; correcciones DEF-014 (datos demo por rol) y DEF-015 (ruta de migraciones) |
| #35 | Medición de la cobertura de pruebas y mínimo exigido en CI |
| #36 | Contrato OpenAPI y prueba de correspondencia con las rutas |
| #37 | Diagrama entidad-relación y prueba de correspondencia con el esquema |
| #38 | Registros estructurados del servidor |
| #39 | Sin textos de ejemplo en los formularios del panel (pedido por el equipo) y lockfile del frontend al día |
| #40 | Entrada del CHANGELOG del PR #39 |
| #41 | Motivo obligatorio en la salida manual de inventario (observación del equipo en pruebas) |
| #42 | Vista de auditoría en el panel (observación del equipo en pruebas) |
| #43 | Medida, calibre y color en las órdenes de producción, para que el avance entre a la variante correcta del inventario (observación del equipo en pruebas) |
| #44 | Prioridad que ordena las órdenes, edición de la orden en su misma fila y retiro del campo «Lote» (observaciones del equipo en pruebas; el equipo pidió a la IA proponer el uso de la prioridad) |
| #45 | Medida, calibre y color en las plantillas de órdenes frecuentes (mejora pendiente que el equipo pidió aplicar) |
| #46 | Evidencia de la prueba de navegadores repetida (RNF-007) |
| #47 | Trazabilidad del repositorio al día con los PR #39 a #46 |
| #48 | Prefijos de rama y uso de la plantilla de PR en `CONTRIBUTING.md`; el equipo detectó que seis ramas usaban `feat/` y que los PR #43 a #47 no seguían la plantilla, y pidió seguir la guía al pie de la letra |
| #49 | Evidencia de las migraciones de variante en `meviplast_db` (autorizadas por el equipo) y corrección del aviso sobre `schema_migrations` |

Además, operaciones sobre la base de datos local, siempre con autorización explícita: respaldo de `meviplast_db`, prueba de restauración en una base aparte y aplicación de las migraciones `20261027_login_lockout.sql`, `20261027_production_variant.sql` y `20261027_template_variant.sql` (EV-2026-10-27-04 y EV-2026-10-27-06).

### Otros usos por confirmar

- PR #11 y `docs/adso-review-2026-10-20.md` (alineación del repositorio con la guía): el borrador anterior de esta declaración ya mencionaba asistencia de IA en la documentación del repositorio. Herramienta y alcance: ____.
- Código de los sprints 1 a 3: ____ (indicar si se usó IA y para qué).

## 3. Validación humana

- Cada cambio de código pasó por un pull request con lint, pruebas unitarias (41) y pruebas E2E (7) en GitHub Actions antes de fusionarse.
- Revisión de los PR #12 a #23 por Carlos Herrera Sibaja: ____ (pendiente; registrar la fecha).
- Los documentos se contrastaron con el código, las pruebas y las capturas. Revisión del equipo: ____.

## 4. Limitaciones detectadas

- No se pudo abrir Word de forma automática, así que la estructura de los documentos se validó con scripts. El equipo debe revisarlos visualmente en Word (tabla de contenido, firmas).
- La IA no conoce decisiones que no están escritas (por ejemplo, por qué se cambió Django por Node.js). Esas respuestas las dio el equipo.
- Hay que confirmar la aceptación del cliente por rol, que solo puede dar MEVIPLAST.
- Otras: ____

## 5. Responsables

Pablo E. Fuenmayor Osuna y Carlos Herrera Sibaja asumen la autoría del proyecto y su sustentación, y declaran que comprenden y pueden explicar el código y los documentos entregados.

| Nombre | Firma | Fecha |
|---|---|---|
| Pablo E. Fuenmayor Osuna | ____ | ____ |
| Carlos Herrera Sibaja | ____ | ____ |
