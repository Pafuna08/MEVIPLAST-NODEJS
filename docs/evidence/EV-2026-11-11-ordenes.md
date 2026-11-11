# Evidencia de las órdenes del administrador en tabla (2026-11-11)

- Ambiente: Windows 11, Node.js 22.21.0, MariaDB 10.4.32 (XAMPP), Chromium, Edge y Firefox de Playwright. Base desechable `meviplast_browser`; capturas con los datos de `meviplast_prueba`.
- Código: rama `feature/MEVI-83-ordenes-admin-modal`, sobre `develop` (`ac8a1fb`).
- Origen: sugerencia del instructor para que la vista del administrador sea más liviana: en lugar de una fila larga con botones por orden, una tabla y el detalle con sus acciones en una ventana.
- Responsable de la ejecución: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-11-01

| Comprobación | Antes | Después |
| --- | --- | --- |
| Lista de órdenes del administrador | Filas con Editar, Cancelar y el formulario de asignar debajo de cada orden | Tabla: orden, producto, operario, barra de avance, prioridad y estado, sin botones por fila |
| Filtro | No había | Abiertas (al entrar), Pendientes, En proceso, Finalizadas, Canceladas y Todas, con su conteo |
| Clic en una orden | — | Ventana con meta, producido, materia prima, operario, supervisor, fechas y observaciones |
| Acciones en la ventana | — | Editar (pendiente sin avance), Asignar operario (pendiente sin operario), Cancelar orden (abierta, con confirmación), Cerrar |
| Teclado | — | El número de la orden es un botón; Esc cierra la ventana y el foco vuelve a la tabla |
| Supervisor y operario | Lista con botones | Sin cambios |

Flujo nuevo en navegadores: el administrador crea una orden, la ubica en la tabla, abre su detalle, revisa las acciones, entra a Editar y vuelve, cierra con Esc, la cancela desde la ventana y la encuentra en «Canceladas».

## Regresión

| Comando | Resultado |
| --- | --- |
| `npm run lint --prefix backend` | Sin errores |
| `npm run lint --prefix frontend` | Sin errores |
| `npm run build --prefix frontend` | Correcto |
| `npm run test:browser --prefix backend` | 51 de 51 flujos (17 por navegador) |

La API no cambió: las pruebas unitarias (116) y E2E (22) corren en el CI.
