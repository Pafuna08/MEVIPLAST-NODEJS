# Evidencia de los códigos de respuesta de la API (2026-11-09)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP). Bases desechables `meviplast_afinado` (sondeo), `meviplast_e2e` y `meviplast_browser`.
- Código: rama `fix/MEVI-71-respuestas-api`, sobre `develop` después del PR #73.
- Origen: sondeo de casos límite contra la API, hecho por el equipo en la tercera ronda de afinado. La regla para eliminar órdenes la decidió el equipo (opción 1: solo pendientes sin avance).
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-09-08 · DEF-023 · CP-092

| Caso | Antes | Después |
| --- | --- | --- |
| Cuerpo JSON mal formado (`{malo`) en cualquier ruta | 500 «Error interno del servidor» | 400 «El cuerpo de la petición no es un JSON válido» |
| `DELETE /api/produccion/{id}` de una orden con 40 unidades producidas | 204: la orden se borró y lo producido quedó sin su orden | 400 «Solo se pueden eliminar órdenes pendientes sin avance; las demás se cancelan»; la orden sigue en la base |
| `DELETE /api/produccion/{id}` de una orden pendiente sin avance | 204 | 204 (sigue permitido) y, al repetirlo, 404 |
| `PUT /api/usuarios/999999` (no existe) | 200 con `null` | 404 «Usuario no encontrado» |
| `PUT /api/materia-prima/{id}` con el campo `cantidad` | 500 «Error al actualizar materia prima» | 400 «Actualiza las cantidades mediante una compra, consumo o ajuste de inventario» |
| `PUT /api/materia-prima/{id}` con material «PVC» o de una bobina que no existe | 200 | 400 «Selecciona un material válido» / 404 |
| Movimiento de bobina con tipo «regalo» | 403 «Tu rol no puede registrar este tipo de movimiento» | 400 «Tipo de movimiento no válido» |
| Auditoría con `desde=2026-13-45` | 200: el filtro se ignoraba | 400 «La fecha inicial no es una fecha válida» |

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint` (backend y frontend) | Sin errores |
| `npm test --prefix backend` | 109 de 109 (5 nuevas en `respuestas-api.test.js`, que fallaron antes de la corrección) |
| `npm run test:e2e --prefix backend` | 20 de 20 (19 escenarios; nuevo DEF-023) |
| `npm run test:browser --prefix backend` | 42 de 42 flujos en Edge, Chrome y Firefox |
| `npm run test:coverage` / `test:coverage:total` | 70,8 % / 88,5 % de líneas (82,5 % de ramas con E2E) |
| `git diff --check` | Sin errores |

## Incidente durante la prueba

Al escribir las pruebas nuevas, antes de corregir el código, dos de ellas llamaron a servicios que todavía no tenían la comprobación y llegaron a la base configurada en `backend/.env` (`meviplast_db`). Se ejecutó un `DELETE` de la orden 99, que no existía (la tabla `produccion` de esa base está vacía, igual que en el respaldo `meviplast_db-antes-MEVI62-20261109.sql`), y quedaron dos registros de auditoría de prueba (ids 202 y 203). No se borró ningún dato. Desde entonces las pruebas unitarias se corren con `DB_NAME` apuntando a una base inexistente, y se propone dejar esa protección en el script de pruebas.
