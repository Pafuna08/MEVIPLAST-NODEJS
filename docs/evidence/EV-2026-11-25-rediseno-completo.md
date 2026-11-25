# Evidencia: rediseño completo del panel (2026-11-25)

- Alcance: todas las pantallas del panel y la pantalla de inicio de sesión con el mismo estilo. Completa el rediseño de los PR #113 y #114, que solo cubrían Inicio, Reportes, Ventas y Producción del administrador.
- Pedidos del usuario que se aplicaron:
  - íconos en lugar de letras en el menú;
  - se conserva el logo de MEVIPLAST;
  - todo alineado en columnas fijas;
  - en «Avance de órdenes» del Inicio, clic en una orden para abrir su detalle en una ventana, como en Producción.
- Qué no cambia: la API, la base de datos, las validaciones y los permisos por rol. El Inicio del administrador pide además los materiales y los operarios (`GET /api/materia-prima` y `GET /api/produccion/operarios`, que ese rol ya consultaba en Producción), para editar o asignar la orden desde la ventana.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-02 · Rediseño completo del panel

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` y `npm run build` del frontend | Sin errores |
| Pruebas unitarias y de rutas | 161 de 161 |
| Navegadores (`npm run test:browser`) | 54 de 54 flujos en Edge 158, Chrome 156 y Firefox 157 |
| Ventana de detalle desde «Avance de órdenes» (Inicio) | Administrador: «Cancelar orden», «Editar» y «Cerrar». Supervisor: solo «Cerrar» (consulta). Esc la cierra en los dos casos |
| Revisión visual con capturas sobre una copia desechable de `meviplast_db` | Todas las vistas del administrador, supervisor, operario, vendedor y almacenista, y el inicio de sesión |

El primer recorrido con los navegadores encontró un fallo: en «Almacenista: ingreso de inventario», después de guardar, el formulario se cerraba, porque el panel recarga los datos y vuelve a montar la vista. Se corrigió guardando en la sesión del navegador qué formulario está abierto en cada vista (`useFormularioAbierto`), así el formulario sigue abierto para el siguiente registro. El segundo recorrido dio 54 de 54.

Ajustes de las pruebas de navegador: «Registrar movimiento» se abre con «+ Registrar movimiento» y «Ingreso de inventario» con «+ Ingreso de inventario».

También se corrigió la separación de los paneles apilados, que desalineaba las tarjetas 2 a 4 de Reportes (publicado en el PR #113).
