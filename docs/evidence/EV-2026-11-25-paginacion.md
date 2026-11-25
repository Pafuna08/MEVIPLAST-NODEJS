# Evidencia: listas en páginas de 10 (2026-11-25)

- Alcance: MEVI-114, pedido del usuario al revisar la demostración: «que solo se vean de a 10 por página en todos los paneles de todos los roles», sea cual sea el movimiento.
- Qué cambia:
  - un componente común (`usePaginacion` y `Paginacion` en `frontend/src/comun/componentes.jsx`) muestra 10 registros por página y, debajo, «Mostrando 1–10 de N», **Anterior**, los números de página (1 … 4 5 6 … 12) y **Siguiente**; en el celular, solo las flechas;
  - todas las tablas (`DataTable`) quedan paginadas: movimientos de materias primas y de inventario, ventas registradas, usuarios, materiales, productos y las tablas de los reportes;
  - también las listas de órdenes (Producción con sus filtros, Seguimiento, Asignar tareas, Mis tareas, Registrar producción y Mi historial), las plantillas, las tarjetas de operarios y la auditoría (que pagina en el servidor: el panel ahora pide 10 en lugar de 20);
  - al cambiar un filtro o guardar un registro se vuelve a la página 1, donde están los registros más recientes; si el comienzo de la lista quedó arriba de la pantalla, el cambio de página vuelve a él.
- Qué no cambia: la API (el servidor sigue entregando las listas completas y la auditoría con 20 por defecto si no se pide otro tamaño), la base de datos y los permisos. El Inicio sigue mostrando las primeras cinco órdenes con «Ver todas».
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-04 · Listas en páginas de 10

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` y `npm run build` del frontend; `npm run lint` del backend | Sin errores |
| Pruebas unitarias y de rutas (`npm test`) | 161 de 161 |
| Navegadores (`npm run test:browser`) | 60 de 60 flujos (20 por navegador) en Edge 158, Chrome 156 y Firefox 157 |
| Revisión visual con capturas sobre una copia desechable de `meviplast_db` | Inventario del almacenista (23 movimientos: páginas 1 a 3), Materias primas, Seguimiento del supervisor, Producción del administrador y Auditoría con «Ver todo» (86 eventos: «Mostrando 11–20 de 86», páginas 1 2 3 … 9), también en celular |

Flujo nuevo en los navegadores, «Almacenista: movimientos en páginas de 10»: la base de prueba agrega 15 ajustes de 1 kg a la bobina; la primera página muestra 10 movimientos con «Mostrando 1–10 de N» y «Anterior» desactivado; «Siguiente» muestra los siguientes (la página 2 queda marcada y no repite la primera) y el número 1 vuelve al comienzo.

Los demás flujos siguieron pasando sin cambios: sus registros nuevos quedan en la primera página.
