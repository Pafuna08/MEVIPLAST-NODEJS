# Evidencia: historias completas, 25 de 25 (2026-11-24)

- Alcance: las 5 historias que estaban parciales. HU-004, HU-010, HU-020 y HU-023 se completaron con código (PR #107, #108 y #109). HU-017 se cerró con la decisión CR-025, sin cambiar el código.
- Base: `develop` al commit `7623b25`, después de fusionar el PR #109.
- Nube: antes de fusionar, se respaldó la base de Aiven (`meviplast_nube_20261124.sql`, fuera del repositorio) y se aplicaron las migraciones `20261124_compras_costo_factura.sql` y `20261124_sesion_version.sql`, que quedaron registradas en `schema_migrations`. Las dos solo agregan columnas y no cambian datos.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-24-02 · HU-004, HU-010, HU-017, HU-020, HU-023 · CP-107 a CP-111

| Caso | Historia / RF | Qué se comprobó | Resultado |
| --- | --- | --- | --- |
| CP-107 | HU-004 / RF-024 | El detalle de producción se filtra por operario y por producto en pantalla, Excel y PDF; un operario inválido responde 400 | Unitarias (`reportes.filtros.test.js`). En Render, el filtro por una operaria devolvió solo sus registros y `operario_id=abc` respondió 400 |
| CP-108 | HU-023 / RF-026 | El reporte de inventario trae el producto terminado y las materias primas con su alerta de stock bajo | Unitarias. En Render: 10 productos y 7 materias primas, 1 con stock bajo |
| CP-109 | HU-010 / RF-015 | La compra guarda el costo total y el número de factura (opcionales); se rechazan fuera de una compra o con un formato inválido | Unitarias (`compras.costo.test.js`). En Render, los movimientos de materia prima ya traen `costo` y `factura` |
| CP-110 | HU-020 / RF-005 | Cerrar sesión revoca el token en el servidor; el mismo token responde 401 | Unitarias (`auth.logout.test.js`). En Render, con la cuenta del vendedor: 200 antes de cerrar sesión, 200 al cerrar y 401 después con el mismo token |
| CP-111 | HU-017 / RF-002 | Los permisos son fijos por rol (CR-025): cada ruta protegida declara sus roles y el servidor responde 403 a los demás | `role-access.routes.test.js` y `openapi.test.js` (las 57 operaciones; las protegidas con `x-roles`, 401 y 403) |

| Comprobación | Resultado |
| --- | --- |
| Pruebas unitarias y de rutas en `develop` | 158 de 158, en 36 archivos |
| CI de los PR #107, #108 y #109 | `validate` y `e2e` aprobados (24 E2E) |
| Contrato OpenAPI | 57 operaciones; se agregó `POST /auth/logout` |
| Render después del despliegue | `/api/health` responde `{"estado":"ok","baseDatos":"ok"}` y `POST /api/auth/logout` sin token responde 401 |

No se registraron compras ni datos nuevos en la base de la nube; las comprobaciones en Render fueron consultas y cierres de sesión.
