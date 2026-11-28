# Evidencia: auditoría de coherencia del proyecto (2026-11-27)

- Ambiente: Windows 11, Node.js 22, MariaDB 10.4.32 (XAMPP) con bases desechables (`meviplast_e2e` y `meviplast_perf`, que las pruebas crean y borran).
- Código: `develop` al PR #138 (`58a6baa`).
- Origen: pedido del equipo de auditar todo el proyecto para que nada esté desactualizado ni incoherente.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-27-04 · EV-067 · CP-032 · RNF-004 · TST-02

### Cifras medidas de nuevo

| Dato | Valor | Cómo se obtuvo |
| --- | --- | --- |
| Pruebas unitarias y de rutas | 171 de 171, en 41 archivos | `npm test --prefix backend` |
| Pruebas con E2E | 195 de 195 (171 + 24) | `npm run test:coverage:total --prefix backend` |
| Cobertura, solo unitarias | 80,3 % de líneas, 82,0 % de ramas, 81,1 % de funciones | `npm run test:coverage --prefix backend` |
| Cobertura, unitarias + E2E | 92,4 % de líneas, 83,8 % de ramas, 95,5 % de funciones | `npm run test:coverage:total --prefix backend` |
| Prueba de carga (RNF-004, CP-032) | p95 de 51, 53 y 56 ms en tres ejecuciones; 445 peticiones cada una, 1 480 registros, 0 errores | `npm run test:perf --prefix backend` |
| `npm audit` | 0 vulnerabilidades en backend y frontend | `npm audit` |
| Operaciones de la API | 60, con los mismos roles en Swagger (`x-roles`) y en Express | `docs/api/openapi.json`, `openapi.test.js` |
| Migraciones, tablas y claves foráneas | 17; 12 tablas más `schema_migrations`; 17 | `backend/sql` |
| Commits | 406: Pablo 397 (dos cuentas), Carlos 9 | `git shortlog -sn HEAD` |
| PR fusionados | 138 | API de GitHub |
| Revisión de Carlos en GitHub | Aprobados los PR #12 a #54, #59 y #64 a #127 (108), más visto bueno a 8 en su commit de fusión; faltan los PR desde el #128 | API de GitHub |
| Enlaces internos de la documentación | 154 en 72 archivos `.md`, 0 rotos | Revisión automática |

### Coherencia del paquete documental

Se revisó con `auditoria_coherencia.py` (solo lectura): versión de cada documento (Índice Maestro, control de versiones, portada y pie), listas maestras repetidas (casos de prueba en el Plan de Calidad y la Matriz, defectos en el Plan de Calidad y el Informe, evidencias en el Plan de Calidad, la Guía de Estructura y la Matriz) y códigos citados que no existen.

| Hallazgo | Corrección |
| --- | --- |
| Nueve documentos mostraban «Versión 1.0» en el pie (de la plantilla) con versiones 2.7 a 3.5 | El pie muestra la versión vigente |
| EV-029 (instalación limpia de Carlos) faltaba en la tabla de evidencias del Plan de Calidad | Agregada |
| Carlos ya había aprobado los PR #124 a #127 y los documentos los daban como pendientes | Revisiones al día (116 PR del #12 al #127) |
| Cobertura (79,0 % / 91,6 %), carga (60 a 69 ms) y commits (362) del 25/11 o antes | Cifras de esta medición |
| El commit 62ed8d3 figuraba como estado actual (22 reglas, 2 casos de uso, la tabla de aceptación y el Acta) | v1.0.0 y develop al PR #138 |
| Matriz de permisos sin las líneas de producto (CR-020) y con «descargar Excel» sin los PDF | Completa |
| Manual de Usuario: el supervisor sin CR-026 ni DEF-044 | Al día |
| INT-01 con el proveedor de correo «por confirmar» (RSD-05 ya confirmado); 48 de 61 criterios con prueba | Gmail y Brevo; 60 de 62 (CP-071 cubre CA-HU-005-03) |
| README con 54 flujos, 17 operaciones de la matriz E2E y 91,3 % de cobertura; `npm audit` del 16/11 | Al día |
| El póster decía 52 ms de p95 sin evidencia | Usa esta medición |
| Al crecer la tabla de aprobaciones, Gestión quedó con una página en blanco antes del índice (dos párrafos vacíos y un salto manual) | En Gestión, Arquitectura, Diseño UX y Calidad el índice empieza con «salto de página anterior», sin párrafos vacíos; los 13 documentos, sin páginas en blanco |

Después de corregir, el verificador no reporta diferencias: casos de prueba CP-001 a CP-120, defectos DEF-001 a DEF-044, evidencias EV-001 a EV-067 y ciclos CIC-01 a CIC-22 coinciden en todas las listas. Las versiones nuevas quedaron firmadas por el equipo con la autorización del usuario.

Quedan sin prueba propia, y así lo dicen los documentos: RN-003 (correo único), RN-022 / CA-HU-009-01 (el listado de bajo stock compara contra el mínimo en SQL) y CA-HU-001-03 (orden del supervisor sin operario).
