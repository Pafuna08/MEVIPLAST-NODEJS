# Evidencia: rediseño visual del panel (2026-11-25)

- Alcance: rediseño de Inicio, Reportes, Ventas y Producción del administrador, y estilo base de paneles y tarjetas (PR #113 y #114). Lo aprobó el usuario sobre maquetas que conservan los colores de MEVIPLAST.
- Qué no cambia: la API, la base de datos, las validaciones y los permisos por rol. El Inicio agrega solo la consulta de lectura `GET /api/materia-prima/bajo-stock`, con los mismos roles que ya la tenían. Si esa consulta falla, el Inicio se muestra igual, sin ese aviso.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-01 · Rediseño del panel

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` y `npm run build` del frontend | Sin errores |
| Pruebas unitarias y de rutas | 161 de 161 |
| Navegadores (`npm run test:browser`), PR #113 | 54 de 54 flujos en Edge 158, Chrome 156 y Firefox 157 |
| Navegadores, PR #114 | 54 de 54 flujos en los mismos navegadores |
| Revisión visual con capturas sobre una copia desechable de `meviplast_db` | Inicio del administrador, del supervisor (sin ventas, CR-021) y del operario; Reportes y el detalle de producción; Ventas del vendedor; Producción del administrador |

Ajustes de las pruebas de navegador:

- El rendimiento de operarios se abre eligiendo «Mensual» en el selector de periodo y luego «Abrir reporte».
- La nueva orden se crea después de pulsar «+ Nueva orden».

Los selectores de la venta (`input[name=cliente]`, `.sale-cart`, «Agregar a la venta», «Registrar venta») no cambiaron.

Chromium y Firefox de Playwright se reinstalaron en `J:\ms-playwright`, porque la limpieza del disco C: los había borrado. Para correr las pruebas: `PLAYWRIGHT_BROWSERS_PATH=J:\ms-playwright npm run test:browser`.
