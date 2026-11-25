# Evidencia: supervisor sin «Materias primas» y órdenes por asignar (2026-11-25)

- Alcance: CR-026 y la asignación de órdenes del supervisor (MEVI-113), pedidos por el usuario al revisar la demostración:
  - «el supervisor no debería acceder al panel de materia prima»;
  - «no estoy viendo en qué parte asigna el operario cuando la orden viene del administrador».
- Qué cambia:
  - el menú del supervisor ya no tiene Materias primas; con `#materia` el panel abre su Inicio;
  - el consumo de material de sus órdenes (HU-008, RF-016) se registra en Seguimiento con el botón «Consumo»: una ventana con la bobina de la orden y su existencia, los kilos y una observación, y el resumen para confirmar («Revisar» vuelve a los datos);
  - la API responde 403 al supervisor en `GET /api/materia-prima/movimientos` y `GET /api/materia-prima/{id}/movimientos` (el historial incluye el costo y la factura de las compras); sigue listando las bobinas, viendo el stock bajo y registrando consumo;
  - «Asignar tareas» muestra las órdenes por asignar (pendientes sin operario); un clic abre la orden en una ventana con los operarios activos y su carga de trabajo; la orden nueva del supervisor se abre con «+ Nueva orden»;
  - en Seguimiento, la orden sin operario muestra un aviso con «Asignar operario», que abre la misma ventana (antes había un formulario debajo de la fila);
  - en el celular, el encabezado de las páginas ya no deja un espacio vacío arriba y abajo del título.
- Qué no cambia: la base de datos, las reglas del consumo (orden abierta que usa la bobina, del supervisor o sin supervisor, con stock suficiente) y los permisos de los demás roles.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-03 · Supervisor: consumo desde Seguimiento y órdenes por asignar

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` y `npm run build` del frontend; `npm run lint` del backend | Sin errores |
| Pruebas unitarias y de rutas (`npm test`) | 161 de 161; `role-access.routes.test.js` con CP-113: el supervisor recibe 403 en el historial de materias primas y 200 en la lista de bobinas y el stock bajo; su consumo pasa el control de rol y su compra se rechaza |
| E2E con MySQL (`npm run test:e2e`) | 24 de 24; la matriz de permisos (CP-029) deja el historial de materias primas al administrador y al almacenista |
| Navegadores (`npm run test:browser`) | 57 de 57 flujos (19 por navegador) en Edge 158, Chrome 156 y Firefox 157 |
| Revisión visual con capturas sobre una copia desechable de `meviplast_db` | Asignar tareas (escritorio y celular), ventana de asignación, Seguimiento con «Consumo» y el aviso de la orden sin operario, ventana de consumo y su confirmación |

Flujos nuevos o cambiados en los navegadores:

- «Supervisor: consumo de materia prima desde Seguimiento (CR-026)»: el menú no muestra Materias primas y `#materia` no la abre; el aviso de una orden sin operario abre la ventana de asignación y Esc la cierra; «Consumo» sin cantidad avisa; con 5 kg pasa al resumen; «Revisar» conserva la cantidad; «Sí, guardar» registra el consumo.
- «Supervisor: asignar una orden del administrador»: el formulario de orden nueva aparece cerrado; la orden pendiente sin operario está en «Órdenes por asignar»; la ventana dice «Pendiente para los supervisores» y muestra la carga del operario; sin elegir operario avisa; al asignarla, la orden sale de la lista.

La base de los navegadores agrega una orden por navegador como las que crea el administrador: pendiente, sin supervisor ni operario.

En la copia de `meviplast_db` usada para las capturas había una orden del administrador esperando operario. Antes solo aparecía en Seguimiento, con un formulario debajo de la fila; ahora está también en «Órdenes por asignar».
