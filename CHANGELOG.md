# Changelog

Los cambios relevantes se registran aquí. El proyecto todavía no tiene una versión estable etiquetada.

## Unreleased - 2026-10-27

### Added

- Reporte «Rendimiento de operarios» (HU-022, RF-027) para el administrador y el supervisor: % de cumplimiento de la meta de cada operario activo por día, semana, mes o año (producido ÷ meta de las órdenes asignadas y creadas en el periodo, sin las canceladas), con barra por operario, total general, unidades registradas en el periodo, impresión y Excel. Nuevos `GET /api/reportes/rendimiento` y `GET /api/reportes/rendimiento/excel`. El indicador lo eligió el equipo con la delegación de MEVIPLAST (EV-2026-11-08-02 y 03).
- Vista «Auditoría» en el menú del administrador (RF-029): últimos 500 eventos con fecha, usuario, acción, tabla y detalle, y buscador. Antes la bitácora solo se podía consultar por la API. La API limita la consulta a 1–1 000 eventos y desempata por id.
- Registros estructurados del servidor (`src/utils/logger.js`): una línea JSON por evento con fecha, nivel, módulo y mensaje; registro de cada petición a la API sin su cuerpo; campos sensibles ocultos; nivel con `LOG_LEVEL`.
- Diagrama entidad-relación en Mermaid (`docs/data/er.md`) con las 10 tablas y 16 claves foráneas, y una prueba que falla si deja de coincidir con `schema.sql`.
- Contrato OpenAPI 3.0.3 (`docs/api/openapi.json`) con las 47 operaciones, sus cuerpos, respuestas y roles, y una prueba que falla si el contrato y las rutas de Express dejan de coincidir.
- Cobertura de pruebas medida con Node.js (`test:coverage` y `test:coverage:total`): 61 % de líneas con unitarias y 78 % con E2E; el CI exige un mínimo de 58 % y 75 %.
- Bloqueo temporal de la cuenta tras 5 intentos fallidos seguidos (15 minutos, configurable) y desbloqueo por el administrador.
- Endpoint `GET /api/health` para verificar la API y la base de datos.
- Licencia propietaria y lint con ESLint en backend, frontend y CI.
- Comprobante de venta imprimible (RF-023): número consecutivo, cliente, producto, cantidades, total y vendedor; se abre al registrar la venta y desde la tabla de ventas, con `GET /api/ventas/:id/comprobante`.
- Exportación a Excel de los reportes detallados de producción y ventas (RF-028), con `GET /api/reportes/{tipo}/detalle/excel` y el botón "Descargar Excel"; dependencia `exceljs` (MIT).
- Prueba de carga `npm run test:perf` (RNF-004: p95 de 60 a 69 ms con 5 usuarios y 1 480 registros) y prueba multinavegador `npm run test:browser` (RNF-007: 30 de 30 flujos en Edge 156, Chrome 156 y Firefox 157), con bases desechables.
- ADR-002 (backend en Node.js), ADR-003 (movimientos de stock en transacción) y ADR-004 (autenticación con JWT).

- Recuperación de contraseña y recordatorio de usuario por correo, con tokens de un solo uso vigentes 30 minutos.
- Ruta de órdenes de producción: el administrador asigna un supervisor y este asigna el operario; plantillas de órdenes frecuentes.
- Reportes de producción y ventas con detalle por periodo diario, semanal, mensual y anual.
- Catálogo de materias primas PEBD, PEAD y PP con medida, calibre, color y peso de rollo.
- Catálogo de seis líneas de producto terminado con variantes y ventas por paquetes de hasta 500 unidades.
- Existencias DEMO de ejemplo para materias primas y producto terminado.

### Security

- Un administrador ya no puede quitarse su propio rol, desactivar su cuenta ni eliminarla, y el sistema nunca se queda sin un administrador activo: esos cambios responden 400. Antes la API lo permitía y el sistema podía quedar sin nadie que administre usuarios; en la tabla de usuarios, la fila propia muestra «Tu cuenta» en lugar de «Desactivar» (DEF-021, EV-2026-11-09-06).
- El supervisor ya no puede registrar ventas por la API (`POST /ventas` responde 403); sigue consultando ventas, comprobantes y reportes. Antes la API se lo permitía aunque su menú no tenía la vista Ventas (DEF-007, decisión del equipo con la delegación de MEVIPLAST).
- `npm audit` vuelve a 0 vulnerabilidades en backend y frontend (había 3 moderadas en herramientas de desarrollo, halladas en la instalación limpia del 2026-11-08): `vite` 6.4.4 → 6.4.5 y `minimatch` 10 → 11.0.5 dentro de `nodemon`, mediante un `override` porque `nodemon` 3.1.14 todavía pide la versión 10. Ninguna llegaba a producción (`npm audit --omit=dev` ya daba 0).
- Los formularios ya no usan atributos de validación en el HTML (`required`, `maxlength`, `minlength`, `min`, `max`, `step`, `type="email"`), por indicación del instructor. El panel valida con su propio código (campo obligatorio, largo, número positivo, correo) y muestra «Completa el campo …»; el servidor sigue validando todo y ahora rechaza con 400 los textos más largos que su columna (`validarLongitudes`, y medida, calibre y color de las variantes), en lugar de fallar al guardarlos.
- La API solo acepta llamadas de otros dominios listados en `CORS_ORIGINS`.
- El token de un usuario desactivado, eliminado o con el rol cambiado deja de servir de inmediato (401), en lugar de seguir vigente hasta 8 horas.
- Un token vencido o inválido responde 401 en lugar de 403, para que el panel cierre la sesión y lleve al login.
- `nodemailer` 7.0.13 → 10.2.1 y `body-parser` 1.20.8 → 1.20.9 (dependencia de Express): `npm audit` queda sin vulnerabilidades. El backend requiere Node.js 20 o superior.

### Changed

- Ventas por paquetes de 50, 100 o 500 unidades (se eligen de una lista), hasta 1 000 paquetes y hasta $100 000 000 por venta (CR-018, decisión del equipo). Antes el paquete admitía de 1 a 500 unidades sin tope de paquetes ni de precio.
- Documentación del repositorio al día con `develop` tras el PR #68: README, estado del proyecto, catálogo de API, estrategia de pruebas (91 unitarias, 17 E2E, cobertura 68,0 % / 84,7 %), trazabilidad, guía de usuario y decisiones (CR-017); sin descripciones de campos o comportamientos que ya no existen. Nueva evidencia EV-2026-11-09-04 de la segunda ronda de afinado.
- Toda orden de producción exige su materia prima (RN-026), al crearla (administrador y supervisor) y al editarla: se puede cambiar por otra bobina existente, pero no quitar. Las plantillas frecuentes también la exigen. Antes una orden o una plantilla se guardaba «Sin asociar».
- El color pasa a una lista fija (RN-025): Amarillo, Azul, Blanco, Café, Gris, Morado, Naranja, Natural, Negro, Rojo, Rosado, Transparente y Verde, en un selector en órdenes, plantillas, inventario y bobinas; el servidor rechaza cualquier otro («Fdsa», «Blanco hueso») y acepta mayúsculas y tildes distintas («cafe» → «Café»).
- Sprints numerados de 0 a 10 como en el tablero de Jira del equipo (los Sprints 1 a 6 están registrados allí). `docs/adr/ADR-003-ledger-movimientos.md` ubica los roles de vendedor y almacenista en el sprint 7 (PR #12), y la declaración de uso de IA habla de los sprints 1 a 7 (agosto a octubre de 2026); en ella solo cambió ese número, sin tocar respuestas, fechas ni firmas.
- Auditoría más liviana y con búsqueda (CR-016, recomendación del instructor): los inicios de sesión salen de la tabla `auditoria` y van al archivo plano diario `accesos-AAAA-MM-DD.log` (con los intentos fallidos); el registro del servidor también se guarda en archivos diarios `servidor-AAAA-MM-DD.log` que se borran a los 90 días (`LOG_DIR`, `LOG_RETENTION_DAYS`). `GET /api/reportes/auditoria` filtra en el servidor por fechas, usuario, acción, módulo y texto, y responde por páginas de 20 (máximo 100) con el total; la vista Auditoría tiene esos filtros y muestra por defecto los últimos 7 días. Nuevo `npm run auditoria:archivar`: los registros con más de 12 meses (`AUDIT_RETENTION_MONTHS`) pasan a `auditoria-AAAA.csv` y salen de la tabla, sin borrar nada si falla la escritura.
- El panel ya no toma como lista vacía una respuesta del servidor que no se pudo leer (respuesta cortada o interrumpida al cambiar de página): muestra el aviso de error en vez de fallar.
- Medida, calibre y color con formato (RN-025, CR-015) en el ingreso de inventario, las órdenes, las plantillas y las materias primas: la medida es «ancho x largo» con unidad opcional, el calibre un número mayor que cero con hasta 2 decimales y el color solo letras y espacios. El panel lo avisa y el servidor lo valida y normaliza («10x15» y «10 X 15» quedan como «10 x 15»), para que un dato sin sentido no cree una variante falsa. El ingreso de inventario usa las mismas sugerencias que las órdenes.
- Los campos numéricos del panel no aceptan «e», «+» ni «-» (el navegador los permite por la notación científica, como 4e3) al escribir ni al pegar; si llega un valor que no es número, el aviso dice «debe ser un número» en lugar de «Completa el campo».
- Se quita la ubicación del inventario terminado (CR-015): ningún requisito la pide y todo el producto se guarda en el mismo lugar. La migración `20261109_drop_unused_columns.sql` elimina `inventario.ubicacion` y `produccion.lote`, que no se usaban; `GET /api/reportes/inventario` ya no devuelve la ubicación.
- Panel React dividido por responsabilidad (DT-001): `DashboardApp.jsx` pasó de 2 136 a 619 líneas y conserva la sesión, el menú, la carga de datos y las confirmaciones; las piezas compartidas quedaron en `frontend/src/comun/` (constantes, formato, api, validacion y componentes) y cada pantalla en su archivo de `frontend/src/vistas/`. Es un movimiento sin cambios de comportamiento: las 2 056 líneas de código son idénticas y solo se agregaron `import` y `export`; pasan el lint, las 77 unitarias, las 15 E2E y los 42 flujos en Chrome, Edge y Firefox.
- Declaración de uso de IA completada con las respuestas del equipo: GitHub Copilot en Visual Studio Code al inicio del desarrollo (ambos integrantes), uso de IA antes del PR #13 y revisión de los documentos por los dos integrantes. Firmada por el equipo el 09/11/2026.
- Paquete documental ADSO reconstruido sobre las 18 plantillas institucionales que envió el instructor (versión 2.0 de los documentos, Índice Maestro, Matriz de Trazabilidad y Lista de Chequeo con su formato, y Rúbrica Integral de Evaluación nueva con la evidencia por criterio). Nuevo `docs/architecture/diagramas.md` con las fuentes Mermaid de los diagramas de contexto, contenedores, componentes, secuencia y despliegue. `docs/legal/licensing.md` registra vite 6.4.5.
- Carlos Herrera Sibaja repitió la instalación limpia en su equipo desde un clon nuevo de `develop` (`62ed8d3`) siguiendo solo el README: instala y arranca, 77 unitarias y 15 E2E aprobadas, sin hallazgos. RNF-009 cumple (EV-2026-11-08-05).
- Recuperación de contraseña y de usuario probada con un buzón real, la cuenta Gmail del proyecto (CP-030, EV-2026-11-08-04): el correo llega, el enlace es de un solo uso y vence a los 30 minutos. El README y `.env.example` explican cómo configurar Gmail con una contraseña de aplicación.
- Decisiones del equipo por delegación de MEVIPLAST (`docs/requirements/decisiones-por-delegacion.md`): la empresa aprobó el alcance en la reunión inicial y no habrá sesión de aceptación por rol, así que las preguntas abiertas del Acta MEV-ACT-01 se resuelven con las propuestas del equipo (DEF-007, RN-024, catálogos, umbrales, conservación de datos, consumo manual, costo y factura en v1.1, HU-022 y CR-010) y se ratifican CR-002, CR-004, CR-005, CR-006, CR-010, CR-013 y CR-014. El acta no lleva firma del cliente. README, trazabilidad y estado del proyecto al día con los PR #53 a #57.
- La documentación registra la aprobación de los PR #12 a #50 por Carlos Herrera Sibaja (03/11/2026): GIT-04 pasa a «Cumple» en la lista de chequeo y se cierra el bloqueo BLQ-004.
- Segunda ronda de pruebas manuales del equipo (PR #50):
  - Reglas (CR-013): el administrador y el supervisor ya no cambian el estado de una orden con un selector; solo pueden **Cancelar** (con confirmación). El operario la inicia desde «Mis tareas» y la orden se finaliza sola al registrar el avance que completa la meta. La regla también se aplica en la API.
  - Reglas (CR-014): la orden del administrador ya no pide supervisor; queda pendiente para todos los supervisores y la toma el que asigna el operario. Si falta el supervisor, el administrador asigna el operario desde su panel (`PUT /produccion/{id}/asignar` admite al administrador y no cambia el supervisor).
  - Operario: «Mis tareas» muestra solo las órdenes abiertas con barra de avance, «Iniciar» y «Registrar avance» (abre el formulario con la orden elegida). «Mi historial» muestra los avances propios por día, semana, mes o año con el nuevo `GET /produccion/mis-registros`. La observación de cada avance se guarda en su movimiento (máx. 255 caracteres).
  - Navegación: el reporte detallado se abre en la misma pestaña, el menú funciona desde él (antes se quedaba en el reporte) y «← Volver a reportes» es un botón. Cerrar sesión pide confirmación.
  - Confirmación con resumen antes de guardar los registros irreversibles: venta, salida manual, ingreso de inventario, movimiento de materia prima y avance de producción.
  - Barra superior: títulos en mayúsculas y bienvenida con el nombre y el rol.
  - Inicio: las tarjetas explican su número (unidades producidas por línea, órdenes pendientes y en proceso, variantes con existencias, ventas registradas) en lugar de «Datos reales».
  - Lista de órdenes alineada en columnas; las acciones de tablas y listas son botones (rojo para guardar, eliminar o cancelar; blanco con borde azul para las demás).
  - «1 paquete de 500» en singular en ventas y comprobantes.
- Las migraciones de variante (`20261027_production_variant.sql` y `20261027_template_variant.sql`) se aplicaron en el `meviplast_db` local tras un respaldo verificado (EV-2026-10-27-06). El README y `docs/data/schema.md` ya no afirman que esa base tiene migraciones sin registrar: están registradas las 11.
- `CONTRIBUTING.md` documenta los prefijos de rama que ya se usaban (`docs/`, `test/`, `chore/`), exige el identificador `MEVI-##` y el prefijo completo `feature/`, y pide escribir la descripción del PR sobre la plantilla. Las descripciones de los PR #43 a #47 se reescribieron con esa plantilla.
- Las plantillas de órdenes frecuentes guardan medida, calibre y color, y «Usar plantilla» los llena en la orden (migración `20261027_template_variant.sql`). La clave única pasa de la línea a la variante, así que una línea puede tener varias plantillas. Las órdenes DEMO de `db:init` traen la variante de las existencias DEMO.
- La prioridad de las órdenes ahora tiene efecto: las órdenes abiertas se listan de alta a baja prioridad (las cerradas al final) y muestran la etiqueta «Prioridad alta/media/baja». Antes solo se guardaba.
- «Editar orden» se abre debajo de la orden elegida, no al final de la página, y se cierra al guardar con éxito.
- Se retiró el campo «Lote» del registro de avance y de la API (`POST /produccion/{id}/avance`), porque no se usaba; la columna `produccion.lote` se conserva por los datos históricos.
- Las órdenes de producción exigen medida, calibre y color además de la línea (migración `20261027_production_variant.sql`). El avance suma a esa variante del inventario terminado y, si no existe, la crea con ubicación «Por ubicar»; antes todo iba a un registro genérico de la línea, sin variante, que no se podía vender por variante. Las órdenes anteriores conservan el comportamiento anterior.
- La salida manual de inventario exige un motivo de una lista (y un detalle si es «Otro»); el motivo queda en el movimiento, en la auditoría y en la nueva columna «Motivo / observación». Los tipos de movimiento se muestran con nombre legible («Salida manual» en lugar de `salida_manual`).
- Los formularios del panel ya no muestran textos de ejemplo dentro de los campos (como «Ej. 25»); se conservan las listas de sugerencias de medida, calibre y color.
- Documentación revisada contra el código de `55dce18`: `traceability.md` se genera desde la misma fuente que la matriz de trazabilidad; `project-status.md`, `SECURITY.md` y la guía de usuario reflejan el estado actual, incluido DEF-013.
- Las migraciones del 2026-10-26 retiran materias primas, productos, ventas y movimientos ajenos al catálogo confirmado.

### Fixed

- Las cantidades fuera de rango o mal escritas se rechazan con 400 en lugar de guardarse cambiadas (DEF-022, EV-2026-11-09-07): MariaDB de XAMPP no estaba en modo estricto y recortaba sin avisar una meta de 10^12 a 99 999 999,99 o un precio de 10^15 a 99 999 999,9999; ahora cada conexión activa `STRICT_TRANS_TABLES`. Las unidades (metas, plantillas, avances, ingresos y salidas) son enteras y llegan hasta 1 000 000; los kg de las bobinas, hasta 100 000 con 2 decimales; el saneamiento ya no convierte «2abc» en 2; una bobina se registra una sola vez por variante (409); el stock mínimo va de 0 a 100 000 kg, y el nombre de usuario no admite espacios ni símbolos. El panel aplica los mismos topes.
- `npm run db:init` vuelve a crear una base nueva: la semilla DEMO del inventario todavía escribía la columna `ubicacion`, quitada con CR-015, y la instalación se detenía con «Unknown column 'ubicacion'». Una prueba compara las columnas de la semilla con `schema.sql` (DEF-020, EV-2026-11-09-05).
- El panel valida el color contra la misma lista fija del servidor (RN-025) y avisa «Selecciona un color de la lista»; antes conservaba la regla anterior de «solo letras y espacios».
- Usuarios: los botones «Cambiar» del correo quedan alineados en una misma columna; antes se corrían según el largo de cada correo.
- Ventas: debajo de las tarjetas aparece la lista de referencias con existencias de la línea elegida (medida, calibre, color y unidades), para escoger la correcta con un clic; la tarjeta cuenta solo las referencias con unidades, igual que la lista, y un registro sin variante se muestra como «Sin variante (registro anterior)».
- `db:init` explica por qué falla cuando MySQL está apagado, no existe el servidor o se rechaza el usuario; antes mostraba el error vacío (DEF-016). En una base nueva ya no avisa de migraciones pendientes: las registra como aplicadas porque `schema.sql` trae el esquema final; en una base existente lista solo las que faltan (DEF-017). Hallados en la instalación limpia del 2026-11-08 (EV-2026-11-08-01); el README lista ahora las cuentas de demostración.
- `db:init` crea una cuenta de demostración por rol (antes faltaban vendedor y almacenista) y carga las existencias DEMO de producto terminado, que antes quedaban en cero (DEF-014). Hallado en la prueba de instalación limpia.
- `db:init` buscaba las migraciones en una ruta inexistente, así que `DB_APPLY_MIGRATIONS=true` no aplicaba nada ni mostraba aviso (DEF-015).
- Formulario «Registrar movimiento» de materias primas, retirado por error en el cambio de catálogos (DEF-013): compras y ajustes para administrador y almacenista, y consumo en una orden activa que usa la bobina para administrador y supervisor.
- Acceso del operario a su panel.
- Nombres de producto mal formados ocultos en ventas y dashboards.
- Tildes faltantes en el sitio público, el inicio de sesión y los mensajes de autenticación.
- El inicio de sesión y el sitio público nombran los cinco roles del sistema.
- Singular y plural en el resumen operativo ("1 producto agotado") y siglas en lugar de puntos en las tarjetas.

### Added (2026-10-19)

- Dashboard unificado por rol con React y Vite.
- Perfiles de vendedor y almacenista con vistas y permisos específicos.
- Ledgers transaccionales para materias primas e inventario; las migraciones requieren autorización explícita y confirmación de respaldo.
- Edición segura de órdenes pendientes y pruebas automatizadas de movimientos, permisos y validaciones.
- Documentación de instalación, arquitectura, API, datos, pruebas y brechas funcionales.
- CI para pruebas del backend, auditoría crítica y build del frontend.

### Changed

- Express prioriza el build React y conserva el sitio público estático.
- El proxy de Vite toma el puerto del entorno del backend en vez de fijarlo a 3001.
- Actualizadas dependencias transitivas compatibles del backend; quedan avisos altos en herramientas de desarrollo.

### Removed

- Páginas de dashboard HTML separadas por rol y su motor JavaScript anterior.
