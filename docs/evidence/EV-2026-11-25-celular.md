# Evidencia: revisión del panel en el celular (2026-11-25)

- Alcance: DEF-040 (MEVI-118). El usuario revisó el panel del administrador en su celular y encontró errores de diseño. Se recorrieron con Edge, en 390 px y 360 px de ancho, las 24 pantallas y ventanas del administrador y las principales de los demás roles (`Respaldos_MEVIPLAST/herramientas_ADSO/revision_movil.js`, sobre una copia desechable de `meviplast_db`), con capturas y una revisión automática de elementos fuera de la pantalla.
- Encontrado y corregido:
  - Inicio: «Avance de órdenes» quedaba en una franja de pocos píxeles junto a «Requiere atención»: la columna mínima de 280 px del rediseño anulaba la regla de una columna para pantallas angostas.
  - Tablas: las columnas de la derecha quedaban escondidas detrás de un desplazamiento horizontal sin aviso (Usuarios sin rol, estado ni botones; reportes sin cantidades; Auditoría sin módulo ni detalle). Ahora, hasta 640 px, cada fila es una tarjeta con el nombre de cada dato a la izquierda (`data-label`), en `DataTable`, en las órdenes del administrador y en el comprobante.
  - Comprobante de venta: la tabla cortaba el precio por paquete y el total.
  - Seguimiento, Registrar producción y Mi historial: la barra de avance desaparecía porque una regla de 780 px volvía «flex» las filas; ahora son cuadrícula con el producto y el avance a lo ancho y, debajo, prioridad, estado y botones de a dos.
  - Menú lateral: botón con ícono (antes «☰»), fondo oscuro detrás del menú abierto que lo cierra al tocarlo, y Esc.
  - Ajustes: botones del encabezado y accesos del Inicio a lo ancho y del mismo tamaño; líneas de Ventas en dos columnas compactas; periodos de Mi historial en dos filas; «Volver a reportes» con ícono.
- Qué no cambia: el computador (las reglas nuevas aplican desde 1050, 780 y 640 px hacia abajo), la API y los permisos.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-08 · Panel en el celular

| Comprobación | Resultado |
| --- | --- |
| Revisión automática en 390 px (administrador, supervisor, operario, vendedor y almacenista) y 360 px (administrador) | Ninguna pantalla más ancha que el celular ni elementos fuera de ella |
| Revisión visual con capturas antes y después | Inicio, menú, Usuarios, Materias primas, Inventario, Producción y su detalle, Ventas y comprobante, Reportes y sus detalles, Auditoría, Mi perfil, Asignar tareas, Seguimiento, Mis tareas y Mi historial |
| Lint y build del frontend | Sin errores |
| Navegadores (`npm run test:browser`, escritorio) | 63 de 63 flujos; capturas de escritorio de Inicio, Usuarios y Producción sin cambios |
