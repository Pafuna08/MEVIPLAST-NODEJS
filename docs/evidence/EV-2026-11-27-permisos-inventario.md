# Evidencia: permisos de inventario terminado del supervisor (2026-11-27)

- Ambiente: Windows 11, Node.js 22, MariaDB 10.4.32 (XAMPP) para la consulta de datos.
- Código: `develop` después del PR #137 (`f744755`), rama `fix/MEVI-134-permisos-inventario`.
- Origen: observación de la revisión del mismo día (EV-2026-11-27-02). El usuario decidió quitar el permiso, igual que en DEF-007 (ventas) y CR-026 (historial de materias primas).
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-27-03 · DEF-044 · CP-120

### Antes del cambio

| Comprobación | Resultado |
| --- | --- |
| Menú del supervisor (`frontend/src/comun/constantes.js`) | Inicio, Asignar tareas, Operarios, Seguimiento y Reportes; sin Inventario |
| Llamadas del panel del supervisor (`frontend/src/comun/api.js`) | Solo `GET /api/inventario` (Inicio) y `GET /api/reportes/inventario`; nunca los ingresos, salidas ni el historial |
| Botón «Consumo» de Seguimiento (`ConsumoDialog.jsx`) | Usa `POST /api/materia-prima/movimientos` (materia prima), no el inventario terminado |
| Ingresos y salidas manuales en `meviplast_db` y `meviplast_prueba` | 6 ingresos y 10 salidas, todos del almacenista; ninguno del supervisor |
| Permisos del servidor | `POST /inventario`, `POST /inventario/{id}/salida` y el historial admitían al supervisor |

### Cambio

`backend/src/routes/inventario.routes.js`: esas cuatro rutas quedan para el administrador y el almacenista. El supervisor conserva `GET /inventario` y el registro de consumo. Swagger (`x-roles`), el catálogo de la API, la guía de usuario, los diagramas de casos de uso (DIA-CU-05, DIA-CU-016 y DIA-CU-017) y el paquete ADSO se actualizaron.

### Verificación

| Prueba | Resultado |
| --- | --- |
| `inventario.permisos.test.js` (CP-120), escrita antes del cambio | Falló con el permiso viejo y pasa después: 403 al supervisor, al operario y al vendedor; el administrador y el almacenista pasan; el supervisor consulta existencias (200) y registra consumo (pasa el rol) |
| `npm test --prefix backend` | 171 de 171 |
| Matriz de permisos E2E (CP-029) | Actualizada con `GET /inventario/movimientos` y `POST /inventario` para administrador y almacenista; la corre el CI |
| `openapi.test.js` y `api-docs.test.js` | 6 de 6 |
