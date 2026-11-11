# Manual de usuario MEVIPLAST

**Versión 0.3 - 2026-10-28, según la rama `feature/MEVI-47-ajustes-pruebas-manuales`. Pendiente de validación por usuarios e instructor.** Resumen del Manual de Usuario (MEV-DOC-09 del paquete documental, con capturas por rol). Los pasos deben actualizarse al cambiar el producto. No usar cuentas demo fuera de desarrollo.

- Código: DOC-09-MEV-01
- Estado: En revisión
- Elaboración: Pablo E. Fuenmayor Osuna; revisión: Carlos Herrera Sibaja; aprobación: pendiente.

## Acceso

1. Abre la URL entregada por el responsable técnico.
2. Ingresa el usuario y contraseña asignados.
3. El panel abre en `/dashboard.html` con navegación según el rol de la cuenta. En el centro de la barra superior aparece la bienvenida con tu nombre y lo que hace tu rol.
4. Usa **Cerrar sesión** para retirar la sesión del navegador; el panel pide confirmarlo. La sesión vence a las 8 horas; si vence, o si el administrador desactiva tu cuenta o cambia tu rol, el panel te devuelve al inicio de sesión.

Si falta un campo o un dato no cumple su regla (largo máximo, número mayor que cero, correo válido, o medida, calibre y color con su formato: medida como «10 x 15» o «40 x 60 cm» (en Cargadera, una talla de la lista: T15, T20, T25 o T30), calibre como «0.95» o «2» y color elegido de la lista), el formulario lo avisa debajo de los campos y marca el campo en rojo; el servidor vuelve a validar todo.

Los registros que mueven inventario o dinero (venta, salida manual, ingreso de inventario, movimiento de materia prima y avance de producción) muestran un resumen y piden confirmación antes de guardar, porque no se pueden deshacer desde el panel: **Revisar** vuelve al formulario sin guardar. Los demás formularios guardan directo.

El backend valida permisos. No compartas contraseña ni token. Si aparece un error de permisos, informa el perfil, sección y hora sin adjuntar credenciales.

## Administrador

- **Inicio:** resumen operativo: órdenes activas (pendientes y en proceso), unidades producidas con el detalle por línea, inventario terminado y ventas.
- **Usuarios:** crear cuenta (nombre, usuario, contraseña y rol), activar/desactivar; eliminar otros usuarios requiere confirmación. No puedes eliminar tu propia cuenta desde esta vista. Si una cuenta muestra «Bloqueado hasta las…», usa **Desbloquear** para habilitarla antes de que termine el bloqueo.
- **Materias primas:** crear el catálogo y consultar existencias, movimientos y bajo stock. En **Registrar movimiento** se eligen la bobina, el tipo (compra, ajuste de entrada, ajuste de salida o consumo en una orden), la cantidad en kg y una observación. El consumo solo ofrece las órdenes activas que usan esa bobina. Si la bobina no está en la lista, la última opción, **+ Crear nuevo material…**, abre una ventana con los mismos campos de «Registrar material» y, al crearla, queda elegida.
- **Inventario:** registrar ingresos o salidas manuales y consultar el ledger. Cada salida manual exige un motivo (dañado, muestra, merma, devolución a producción, ajuste por conteo u otro, con detalle) que queda en «Movimientos recientes». Los avances de producción y las ventas actualizan el saldo y dejan su movimiento automáticamente.
- **Producción:** crear, editar y cancelar órdenes. Las órdenes se ven en una tabla con su avance; los botones de arriba filtran por estado («Abiertas» al entrar, con el número de órdenes de cada uno). **Un clic en una orden** abre su detalle en una ventana, con las acciones que su estado permite: **Editar** (pendiente y sin avance), **Asignar operario** (pendiente y sin operario) y **Cancelar orden** (abierta, con confirmación). Esc o «Cerrar» la cierran. La orden del administrador no se dirige a un supervisor: queda **pendiente para los supervisores** y la toma el que le asigna el operario (CR-014). Si falta el supervisor, el administrador asigna el operario desde la misma lista («Asignar operario a la orden #N»). El administrador y el supervisor **no cambian el estado**: solo pueden **Cancelar** una orden abierta, con confirmación; el operario la inicia y la orden se finaliza sola al completar la meta (CR-013). Cada orden nueva exige línea, **medida, calibre y color**: es la variante del inventario terminado que recibirá lo producido. Si esa variante aún no existe, el primer avance la crea en el inventario. Cada orden exige también la **materia prima** (la bobina con la que se produce, RN-026): al editarla se puede cambiar por otra, pero no quitar. En la nueva orden, los selectores de línea y de materia prima terminan en **+ Crear nueva línea…** y **+ Crear nuevo material…**: abren una ventana y lo creado queda elegido. Una línea nueva se usa solo para un producto que la empresa empieza a fabricar; no se puede borrar, no se repite (sin importar mayúsculas ni tildes) y se mide en «ancho x largo» (CR-020). Solo el administrador ve estas opciones. Las órdenes creadas antes de este cambio no tienen variante y suman al registro general de la línea; al editarlas se pide completarla. **Editar** abre el formulario debajo de esa misma orden y se cierra al guardar (si hay un error, se queda abierto con lo escrito). La **prioridad** ordena la lista: las órdenes abiertas aparecen primero, de alta a baja (y de la más reciente a la más antigua dentro de cada prioridad), con una etiqueta «Prioridad alta/media/baja»; las finalizadas o canceladas van al final. Ese mismo orden se ve en las tareas del operario y en «Registrar producción».
- **Órdenes frecuentes (plantillas):** cada plantilla guarda línea, medida, calibre, color, meta, materia prima (obligatoria, RN-026) y prioridad; puede haber varias de la misma línea si cambia la variante. **Usar plantilla** llena el formulario de la nueva orden, incluida la variante. Las plantillas creadas antes de este cambio no tienen variante: al usarlas hay que escribirla.
- **Ventas:** elegir la línea en su tarjeta; debajo aparecen sus referencias con existencias (medida, calibre, color y unidades) y con un clic queda elegida la variante, que se confirma en el recuadro gris. Luego, en **Nueva venta**, el cliente y, en **Agregar producto**, unidades por paquete (50, 100 o 500, de la lista), número de paquetes (hasta 1 000) y precio por paquete, y **Agregar a la venta**. Se repite con cada producto que pida el cliente (hasta 20, sin repetir la misma referencia); la tabla muestra el subtotal de cada uno, el total y el botón **Quitar**. Si es un solo producto, basta con llenarlo y pulsar **Registrar venta**. La venta admite hasta $100 000 000 en total. Al confirmar, el stock de todos los productos disminuye a la vez (si a uno le falta, no se guarda nada) y se abre un solo comprobante con todos los productos (CR-022).
- **Reportes:** en el detalle de cada reporte, **Abrir PDF** lo abre en otra pestaña para imprimirlo o descargarlo con los botones del visor, y **Descargar Excel** baja la hoja de cálculo. En el detalle del reporte de ventas, **un clic en una venta** (o en «Ver») abre su comprobante. El reporte del periodo se abre en la misma pestaña; **← Volver a reportes** regresa al listado y el menú lleva a cualquier otra sección. «Imprimir/guardar PDF» usa la impresión del navegador y **Descargar Excel** baja el detalle del periodo en un archivo `.xlsx` con las hojas Resumen, Por producto y Detalle. **Rendimiento de operarios** muestra, para cada operario activo, el % de cumplimiento de la meta del periodo: unidades producidas ÷ meta de las órdenes que se le asignaron y se crearon en ese periodo, sin las canceladas. «Sin órdenes» indica que no tuvo órdenes en el periodo; «Unidades registradas» suma todos sus avances del periodo, incluidos los de órdenes anteriores.
- **Auditoría:** bitácora de acciones (cambios de usuarios, bloqueos de cuenta, órdenes, movimientos y ventas) con fecha, usuario, acción, módulo y detalle. Se elige qué buscar: rango de fechas, usuario, acción, módulo y un texto del detalle; por defecto muestra los últimos 7 días, en páginas de 20, con el total encontrado. **Ver todo** quita los filtros. Los inicios de sesión no aparecen aquí: quedan en el archivo de accesos del servidor (ver `docs/operations/backup-restore.md`).

## Supervisor

- **Inicio:** consultar resumen.
- **Asignar tareas:** crear órdenes para operarios activos con línea, medida, calibre, color y **materia prima** (obligatoria, RN-026); asociarla no registra consumo.
- **Operarios:** consultar equipo y órdenes activas.
- **Seguimiento:** consultar las órdenes, asignar el operario a las pendientes (la orden queda a tu cargo), editarlas mientras no tengan avance y **Cancelar** las abiertas. El estado no se cambia a mano: el operario inicia la orden y se finaliza sola al completar la meta.
- **Reportes:** consultar la producción y el rendimiento de los operarios (% de cumplimiento de la meta), imprimirlos o descargarlos en Excel.
- **Materias primas:** consultar existencias y movimientos, y registrar el consumo de una bobina en una orden activa que la usa (**Registrar movimiento → Consumo en una orden**). Asociar la materia prima a la orden no consume stock automáticamente.

El supervisor no registra ventas (DEF-007) ni las consulta (CR-021): los precios, totales y clientes son información comercial del administrador. Su Inicio muestra las órdenes finalizadas en lugar del total vendido. Sigue viendo las existencias de producto terminado para planear la producción.

## Operario

- **Inicio:** tareas activas, unidades producidas por línea, órdenes completadas y meta pendiente.
- **Mis tareas:** solo las órdenes abiertas, primero las de prioridad alta, con su barra de avance y cuánto falta. **Iniciar** pasa una orden pendiente a «en proceso»; **Registrar avance** abre «Registrar producción» con esa orden elegida.
- **Registrar producción:** elegir una orden abierta e indicar cantidad y observaciones. No superar la meta pendiente; el avance incrementa la variante del inventario terminado que indica la orden (medida, calibre y color) y, si completa la meta, finaliza la orden.
- **Mi historial:** elegir **Hoy, Esta semana, Este mes o Este año** para ver las unidades producidas, cada registro de avance (fecha, orden, producto, cantidad y observación) y las órdenes finalizadas o canceladas.

## Vendedor

- **Ventas:** registrar ventas con uno o varios productos para el mismo cliente (ver «Ventas» del administrador) y consultar únicamente las ventas registradas con su cuenta, con su número, sus productos y su total.
- **Comprobante de venta:** se abre al registrar una venta y desde el botón **Ver** de cada venta. **Abrir PDF** abre el comprobante en otra pestaña del navegador; allí se imprime o se descarga con los botones del visor de PDF (no hace falta saber configurar la impresora). Es un documento de control interno, no una factura electrónica.
- La vista de ventas muestra las referencias con existencias de cada línea para elegir la variante; no permite modificar inventario.

## Almacenista

- **Materias primas:** registrar compras y ajustes de entrada o salida (**Registrar movimiento**), y consultar existencias e historial. Una salida mayor al saldo se rechaza sin cambios.
- **Inventario:** registrar ingresos y salidas manuales (con su motivo), y consultar el historial. La producción y las ventas mantienen sus movimientos desde sus respectivos procesos.

## Problemas frecuentes

- Tras 5 intentos fallidos seguidos la cuenta se bloquea 15 minutos, aunque después escribas la contraseña correcta. Espera ese tiempo, pide al administrador que la desbloquee o recupera la contraseña por correo (el restablecimiento también la desbloquea).

- Si una vista no carga, comprueba conexión y usa **Reintentar**; si persiste, reporta perfil, sección y hora.
- Si aparece stock insuficiente, solicita revisar la existencia al responsable autorizado.
- Si una salida excede el saldo disponible, revisa el stock antes de volver a intentar; la operación se rechaza sin aplicar cambios parciales.
- Las modificaciones de órdenes están limitadas a órdenes pendientes sin avance. El consumo de materia prima debe registrarse explícitamente y asociarse a la orden.

## Aprobación pendiente

Hacer un recorrido guiado por cada perfil con usuarios de MEVIPLAST y validar lenguaje, accesibilidad y permisos. Las capturas con datos ficticios están en el Manual de Usuario (MEV-DOC-09). Esta guía no reemplaza la aceptación DOC-07/DOC-09.