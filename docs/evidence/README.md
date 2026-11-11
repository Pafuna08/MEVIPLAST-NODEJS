# Índice de evidencias

Usa identificadores `EV-AAAA-MM-DD-NN`. Cada registro debe indicar requisito o cambio trazado, comando/ambiente, versión o commit, resultado y responsable. Las capturas complementan pruebas, no las sustituyen. No adjuntes tokens, credenciales, datos personales o dumps reales.

| ID               | Elemento trazado              | Tipo                        | Estado                                 | Registro                               |
| ---------------- | ----------------------------- | --------------------------- | -------------------------------------- | -------------------------------------- |
| EV-2026-10-19-01 | Dashboard React por perfiles  | Prueba manual de navegación | Verificado localmente                  | [`EV-2026-10-19.md`](EV-2026-10-19.md) |
| EV-2026-10-19-02 | Sanitización backend          | Prueba automatizada         | 3 aprobadas                            | [`EV-2026-10-19.md`](EV-2026-10-19.md) |
| EV-2026-10-19-03 | Build frontend                | Compilación Vite            | Aprobado                               | [`EV-2026-10-19.md`](EV-2026-10-19.md) |
| EV-2026-10-20-01 | Install, tests, audit y build | Ejecución local en Windows  | Aprobado con alertas altas no críticas | [`EV-2026-10-20.md`](EV-2026-10-20.md) |
| EV-2026-10-21-01 | Tests, build y migración aislada | Windows, MariaDB temporal | 11 pruebas, build y migración aislada aprobados; integración de aplicación pendiente | [`EV-2026-10-21.md`](EV-2026-10-21.md) |
| EV-2026-10-27-01 | Unitarias, lint, build y E2E | Windows + MariaDB 10.4; CI | 41 unitarias y 7 E2E aprobadas | [`EV-2026-10-27.md`](EV-2026-10-27.md) |
| EV-2026-10-27-02 | Respaldo de `meviplast_db` | mysqldump | Completo, con hash SHA-256 | [`EV-2026-10-27.md`](EV-2026-10-27.md) |
| EV-2026-10-27-03 | Restauración de prueba (CP-034) | Base desechable | 11 tablas, 0 diferencias | [`EV-2026-10-27.md`](EV-2026-10-27.md) |
| EV-2026-10-27-04 | Migración de bloqueo (HU-019) | `meviplast_db` local | Aplicada y verificada con smoke test | [`EV-2026-10-27.md`](EV-2026-10-27.md) |
| EV-2026-10-27-05 | `db:init` con `DB_NAME` (DEF-009) | MariaDB local | `meviplast_db` sin cambios | [`EV-2026-10-27.md`](EV-2026-10-27.md) |
| EV-2026-10-27-06 | RNF-004 rendimiento | Prueba de carga, 5 usuarios, 1 480 registros | p95 de 60 a 69 ms (umbral 3 s), 0 errores | [`EV-2026-10-27-rnf.md`](EV-2026-10-27-rnf.md) |
| EV-2026-10-27-07 | RNF-007 compatibilidad | Edge 156, Chrome 156, Firefox 157 | 30 de 30 flujos sin bloqueo | [`EV-2026-10-27-rnf.md`](EV-2026-10-27-rnf.md) |
| EV-2026-10-27-08 | DEF-013 formulario de materia prima | E2E + navegadores | 9 de 9 E2E; 39 de 39 flujos | [`EV-2026-10-27-rnf.md`](EV-2026-10-27-rnf.md) |
| EV-2026-10-27-09 | PROD-04 instalación limpia; DEF-014, DEF-015 | Clon nuevo + README | Instala y arranca; 2 hallazgos corregidos | [`EV-2026-10-27-instalacion.md`](EV-2026-10-27-instalacion.md) |
| EV-2026-11-08-01 | PROD-04 / RNF-009 instalación limpia; DEF-016, DEF-017 | Clon nuevo de `4bb3c70` + README | Instala y arranca; 72 unitarias y 14 E2E; 2 hallazgos corregidos | [`EV-2026-11-08-instalacion.md`](EV-2026-11-08-instalacion.md) |
| EV-2026-11-08-02 | HU-022 / RF-027 rendimiento por operario (CP-079) | E2E con MariaDB | 15 de 15 E2E; 77 unitarias | [`EV-2026-11-08-rendimiento.md`](EV-2026-11-08-rendimiento.md) |
| EV-2026-11-08-03 | RNF-007 con el reporte de rendimiento (CP-080) | Edge 156, Chrome 156, Firefox 157 | 42 de 42 flujos sin bloqueo | [`EV-2026-11-08-rendimiento.md`](EV-2026-11-08-rendimiento.md) |
| EV-2026-11-08-04 | CP-030 recuperación de contraseña y usuario con correo real | Gmail del proyecto + `meviplast_prueba` | Correo recibido, enlace de un solo uso, reutilización rechazada | [`EV-2026-11-08-correo.md`](EV-2026-11-08-correo.md) |
| EV-2026-11-08-05 | PROD-04 / RNF-009 instalación limpia por Carlos Herrera Sibaja (CP-063) | Clon nuevo de `62ed8d3` + README, equipo de Carlos | Instala y arranca; 77 unitarias y 15 E2E; sin hallazgos | [`EV-2026-11-08-instalacion-carlos.md`](EV-2026-11-08-instalacion-carlos.md) |
| EV-2026-11-09-01 | RN-025 formato de la variante, CR-015 sin ubicación ni lote (CP-081, CP-082); DEF-018 | Unitarias, E2E y Chrome | Correcto; migración idempotente; DEF-018 corregido | [`EV-2026-11-09-afinado.md`](EV-2026-11-09-afinado.md) |
| EV-2026-11-09-02 | CR-016 auditoría: accesos en archivo, filtros, páginas y archivo de lo antiguo (CP-083, CP-084); DEF-019 | E2E con MariaDB + `meviplast_prueba` | Correcto; OBS-005 definida; DEF-019 corregido | [`EV-2026-11-09-afinado.md`](EV-2026-11-09-afinado.md) |
| EV-2026-11-09-03 | Regresión completa y RNF-007 (CP-085) | Edge 157, Chrome 156, Firefox 157 | 90 unitarias, 17 E2E, 42 de 42 flujos | [`EV-2026-11-09-afinado.md`](EV-2026-11-09-afinado.md) |
| EV-2026-11-09-04 | RN-026 materia prima obligatoria, RN-025 lista de colores, lista de referencias en Ventas (CP-086 a CP-088), CR-017 | Unitarias, E2E, navegadores y `meviplast_prueba` | 91 unitarias, 17 E2E, 42 de 42 flujos; cobertura 68,0 % / 84,7 % | [`EV-2026-11-09-ronda2.md`](EV-2026-11-09-ronda2.md) |
| EV-2026-11-09-05 | PROD-04 `db:init` en una base nueva; DEF-020 | `meviplast_capturas` + unitarias y E2E | Inicializa con las existencias DEMO; 92 unitarias, 17 E2E; DEF-020 corregido | [`EV-2026-11-09-base-nueva.md`](EV-2026-11-09-base-nueva.md) |
| EV-2026-11-09-06 | DEF-021 / CP-089: siempre queda un administrador activo | Unitarias, E2E y navegadores | El admin no se quita el rol, no se desactiva ni se elimina; 97 unitarias, 18 E2E, 42 flujos | [`EV-2026-11-09-admin.md`](EV-2026-11-09-admin.md) |
| EV-2026-11-09-07 | DEF-022 / CR-018 / CP-090, CP-091: topes de cantidades y base en modo estricto | Unitarias, E2E y navegadores | Nada se recorta ni se guarda cambiado; 104 unitarias, 19 E2E, 42 flujos | [`EV-2026-11-09-topes.md`](EV-2026-11-09-topes.md) |
| EV-2026-11-09-08 | DEF-023 / CP-092: códigos de respuesta 400 y 404; solo se eliminan órdenes pendientes sin avance | Unitarias, E2E y navegadores | 109 unitarias, 20 E2E, 42 flujos | [`EV-2026-11-09-respuestas.md`](EV-2026-11-09-respuestas.md) |
| EV-2026-11-10-01 | ACC-001 / AC-003 contraste WCAG AA; DEF-024 aviso vacío visible; uso en celular | 21 vistas en escritorio y celular (Chromium) + navegadores | 0 combinaciones bajo 4,5:1 en 42 vistas; 42 de 42 flujos | [`EV-2026-11-10-contraste.md`](EV-2026-11-10-contraste.md) |
| EV-2026-11-10-02 | RNF-012 uso solo con teclado; DEF-025 ventanas sin Esc ni foco atrapado | 21 vistas de los cinco roles + venta completa; Edge, Chrome y Firefox | Todo alcanzable con Tab, foco visible, 45 de 45 flujos | [`EV-2026-11-10-teclado.md`](EV-2026-11-10-teclado.md) |
| EV-2026-11-10-03 | CR-019 / CP-095: Cargadera por tallas T15 a T30 y migración de «15 x 20» a T15 | Unitarias, E2E y navegadores | 111 unitarias, 21 E2E, 45 de 45 flujos; migración idempotente | [`EV-2026-11-10-tallas.md`](EV-2026-11-10-tallas.md) |
| EV-2026-11-10-04 | CR-020 / CP-096: crear línea y material desde los selectores (solo el administrador) | Unitarias, E2E y navegadores | 116 unitarias, 22 E2E, 48 de 48 flujos | [`EV-2026-11-10-lineas.md`](EV-2026-11-10-lineas.md) |
| EV-2026-11-11-01 | Órdenes del administrador en tabla con detalle en una ventana (sugerencia del instructor) | Navegadores (Edge, Chrome, Firefox) | 51 de 51 flujos | [`EV-2026-11-11-ordenes.md`](EV-2026-11-11-ordenes.md) |
| EV-2026-11-11-02 | CR-021 / CP-097: el supervisor no ve ventas; comprobante desde el reporte de ventas | Rutas, E2E y navegadores | 116 unitarias, 22 E2E, 54 de 54 flujos | [`EV-2026-11-11-reportes.md`](EV-2026-11-11-reportes.md) |
| EV-2026-11-11-03 | CR-022 / CP-098: venta con varios productos y un comprobante; migración de ventas a encabezado y detalle | Unitarias, E2E, navegadores y `meviplast_prueba` | 120 unitarias, 24 E2E, 54 de 54 flujos; totales iguales tras migrar | [`EV-2026-11-11-ventas.md`](EV-2026-11-11-ventas.md) |
| EV-2026-11-11-04 | RF-023 / CP-099: comprobante de venta en PDF en otra pestaña (observación del instructor) | Unitarias, E2E y navegadores | 122 unitarias, 24 E2E, 54 de 54 flujos | [`EV-2026-11-11-pdf.md`](EV-2026-11-11-pdf.md) |
