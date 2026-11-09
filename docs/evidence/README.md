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
