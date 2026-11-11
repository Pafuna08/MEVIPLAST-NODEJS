# Evidencia de los reportes en PDF (2026-11-11)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP), Chromium, Edge y Firefox de Playwright. Bases desechables `meviplast_e2e` y `meviplast_browser`; PDF de muestra con los datos de `meviplast_prueba` (periodo anual).
- Código: rama `feature/MEVI-87-reportes-pdf`, sobre `develop` (`6b9c366`).
- Origen: la misma observación del instructor que el comprobante: «Imprimir / guardar PDF» abría el diálogo de impresión; el reporte debe abrirse como PDF en otra pestaña.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-11-05 · RF-028 · CP-100

| Comprobación | Resultado |
| --- | --- |
| PDF de ventas (admin), producción y rendimiento (supervisor) | 200, `application/pdf`, `inline; filename="reporte-<tipo>-<periodo>-<desde>.pdf"`, empieza por `%PDF-` |
| PDF de ventas pedido por el supervisor / periodo inválido | 403 (CR-021) / 400 |
| Contenido (revisado como imagen) | Logo, título y periodo, fecha de generación, tarjetas de resumen, tablas con las mismas columnas del Excel, textos largos en dos líneas en lugar de cortados, «Página X de Y»; en rendimiento, la nota de cómo se calcula el cumplimiento |
| Reporte largo (60 ventas) | Sigue en varias páginas con los títulos de la tabla repetidos |
| Botón «Abrir PDF» del reporte (administrador y supervisor) | Abre el PDF en otra pestaña (visor en Edge y Chrome; descarga en el Firefox de Playwright, que no trae visor) |
| Listado de reportes | Sin el botón de imprimir, que solo imprimía las tarjetas |

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint --prefix backend` | Sin errores |
| `npm run lint --prefix frontend` | Sin errores |
| `npm test --prefix backend` | 125 de 125 |
| `npm run test:e2e --prefix backend` | 24 de 24 |
| `npm run test:browser --prefix backend` | 54 de 54 flujos |
| `npm run build --prefix frontend` | Correcto |
