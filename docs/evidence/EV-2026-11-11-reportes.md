# Evidencia de los reportes por rol y el comprobante desde el reporte (2026-11-11)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP), Chromium, Edge y Firefox de Playwright. Bases desechables `meviplast_e2e` y `meviplast_browser`; capturas con los datos de `meviplast_prueba`.
- Código: rama `feature/MEVI-84-reportes-supervisor-y-comprobante`, sobre `develop` (`eb36287`).
- Origen: pregunta del equipo sobre qué reportes debe ver el supervisor. Con el criterio de mínimo privilegio, el equipo decidió CR-021 por delegación de MEVIPLAST. Además, el administrador no podía abrir el comprobante de una venta desde el reporte de ventas.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-11-02 · CR-021 · CP-097

| Comprobación | Antes | Después |
| --- | --- | --- |
| Supervisor: `GET /ventas`, `GET /ventas/{id}/comprobante` | 200 | 403 |
| Supervisor: `GET /reportes/ventas`, `/detalle` y `/detalle/excel` | 200 | 403 |
| Supervisor: reportes de producción y rendimiento, existencias | 200 | 200 (sin cambio) |
| Inicio del supervisor | Tarjeta «Ventas» con el total vendido | Tarjeta «Completadas» con las órdenes finalizadas |
| Reportes del supervisor | Producción, ventas y rendimiento | Producción y rendimiento |
| Reporte de ventas del administrador | Tabla sin acceso al comprobante | Clic en la venta (o «Ver») abre su comprobante |
| Imprimir el comprobante desde el reporte | — | Solo sale el comprobante (vista de impresión revisada) |

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint --prefix backend` | Sin errores |
| `npm run lint --prefix frontend` | Sin errores |
| `npm test --prefix backend` | 116 de 116 (role-access con los 403 del supervisor) |
| `npm run test:e2e --prefix backend` | 22 de 22 (matriz de permisos con 17 operaciones) |
| `npm run test:browser --prefix backend` | 54 de 54 flujos (18 por navegador) |
| `npm run build --prefix frontend` | Correcto |
