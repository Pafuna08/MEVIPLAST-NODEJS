# Evidencia: revisión de coherencia de la documentación (2026-11-16)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP); Edge 157, Chrome 156 y Firefox 157 de Playwright.
- Código: `develop` al PR #98 (`a6d418c`).
- Origen: pedido del equipo de revisar todo el proyecto y el paquete ADSO como analista y evaluador, y dejar sin referencias que el código ya no respalda (la revisión anterior fue el 09/11/2026, PR #69 a #71).
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-16-02 · CP-102 · DEF-029 · RNF-011

### Cifras medidas en el código

| Dato | Valor | Cómo se obtuvo |
| --- | --- | --- |
| Pruebas unitarias y de rutas | 134 de 134, en 30 archivos | `npm test --prefix backend` |
| Pruebas E2E con MySQL | 24 de 24 (23 escenarios) | `npm run test:e2e --prefix backend` |
| Flujos en navegadores | 54 de 54 (18 en Edge 157, Chrome 156 y Firefox 157) | `npm run test:browser --prefix backend` |
| Cobertura de líneas | 73,5 % con unitarias; 90,2 % con E2E (ramas 83,1 %, funciones 93,1 %) | `test:coverage` y `test:coverage:total` |
| Operaciones de la API | 56 | `docs/api/openapi.json` (y `openapi.test.js`) |
| Tablas y claves foráneas | 12 tablas más `schema_migrations`; 17 claves foráneas | `backend/sql/schema.sql` |
| Migraciones | 15 | `backend/sql/migrations` |
| Commits | 294: Pablo 285 (dos cuentas), Carlos 9 | `git shortlog -sn HEAD` |
| Revisión de Carlos en GitHub | 75 PR aprobados (#12 a #54, #59 y #64 a #94) | API de GitHub |
| `npm audit` | 0 vulnerabilidades en backend y frontend | `npm audit` |

### Hallazgos corregidos

| Dónde | Qué decía | Ahora |
| --- | --- | --- |
| Fichas de RF-020, RF-022, RF-025, ALC-05 y CU-018 | El supervisor como actor de ventas y una venta de un solo producto | Ventas del vendedor y el administrador (DEF-007, CR-021); uno o varios productos, todo o nada (CR-022) |
| RF-028 y HU-025 | PDF con la impresión del navegador | PDF generado por el servidor, en otra pestaña (CP-100) |
| DIA-002 · Contenedores | Un sitio y login en HTML, CSS y JS aparte | Una sola aplicación React; se publica solo `frontend/dist` (DEF-028) |
| DIA-004 · Secuencia de la venta | Sin la tabla `ventas_detalle` | Encabezado y una línea, un descuento y un movimiento por producto |
| DIA-005 · Despliegue | Solo la red local | Además, la demostración en Render con la base en Aiven (CR-023) |
| Estado, calidad, cierre, sustentación, lista de chequeo y rúbrica | 110 unitarias, 20 E2E, 42 flujos, 50 operaciones, 10 u 11 tablas, 16 claves, 12 migraciones, 88,5 % de cobertura, 211 commits | Las cifras de la tabla anterior |
| Guía de Sustentación | Versión al PR #59, sin ventas de varios productos, PDF, demostración en Render ni el paso a React | Ambiente, flujos DEM-04 y DEM-06, evidencias y preguntas al día |
| Mensajes de la API | «Usuario o contrasena incorrectos», «Orden de produccion no encontrada» y 9 más | Con tildes y ñ; `mensajes.test.js` lo vigila (DEF-029, CP-102, PR #98) |

Los registros históricos (control de versiones, evidencias y ciclos de prueba anteriores) conservan las cifras de su fecha.

### Respaldo de la base de la nube (RNF-011)

| Comprobación | Resultado |
| --- | --- |
| Respaldo de `meviplast_db` en Aiven (MySQL 8.4.11) con `respaldo_nube.js` | 13 tablas, 31 kB, fuera del repositorio |
| Restauración en una base local desechable (MariaDB 10.4) | Mismas filas por tabla; 7 ventas por $381 500, igual a la suma de su detalle; la base de prueba se borró |

### Pendiente de decisión del equipo

La declaración de uso de IA (`docs/legal/ai-use.md`) dice que Claude Code se usó en los «PR #13 a #60» y que los PR posteriores al #50 «quedan pendientes» de revisión. Es un documento firmado: se actualiza solo con autorización del equipo.
