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

Los registros que mueven inventario o dinero (venta, salida manual, ingreso de inventario, movimiento de materia prima y avance de producción) muestran un resumen y piden confirmación antes de guardar, porque no se pueden deshacer desde el panel: **Revisar** vuelve al formulario sin guardar. Los demás formularios guardan directo.

El backend valida permisos. No compartas contraseña ni token. Si aparece un error de permisos, informa el perfil, sección y hora sin adjuntar credenciales.

## Administrador

- **Inicio:** resumen operativo: órdenes activas (pendientes y en proceso), unidades producidas con el detalle por línea, inventario terminado y ventas.
- **Usuarios:** crear cuenta (nombre, usuario, contraseña y rol), activar/desactivar; eliminar otros usuarios requiere confirmación. No puedes eliminar tu propia cuenta desde esta vista. Si una cuenta muestra «Bloqueado hasta las…», usa **Desbloquear** para habilitarla antes de que termine el bloqueo.
- **Materias primas:** crear el catálogo y consultar existencias, movimientos y bajo stock. En **Registrar movimiento** se eligen la bobina, el tipo (compra, ajuste de entrada, ajuste de salida o consumo en una orden), la cantidad en kg y una observación. El consumo solo ofrece las órdenes activas que usan esa bobina.
- **Inventario:** registrar ingresos o salidas manuales y consultar el ledger. Cada salida manual exige un motivo (dañado, muestra, merma, devolución a producción, ajuste por conteo u otro, con detalle) que queda en «Movimientos recientes». Los avances de producción y las ventas actualizan el saldo y dejan su movimiento automáticamente.
- **Producción:** crear, editar y cancelar órdenes. La orden del administrador no se dirige a un supervisor: queda **pendiente para los supervisores** y la toma el que le asigna el operario (CR-014). Si falta el supervisor, el administrador asigna el operario desde la misma lista («Asignar operario a la orden #N»). El administrador y el supervisor **no cambian el estado**: solo pueden **Cancelar** una orden abierta, con confirmación; el operario la inicia y la orden se finaliza sola al completar la meta (CR-013). Cada orden nueva exige línea, **medida, calibre y color**: es la variante del inventario terminado que recibirá lo producido. Si esa variante aún no existe, el primer avance la crea con ubicación «Por ubicar» (corríjala al guardarla en bodega). Las órdenes creadas antes de este cambio no tienen variante y suman al registro general de la línea; al editarlas se pide completarla. **Editar** abre el formulario debajo de esa misma orden y se cierra al guardar (si hay un error, se queda abierto con lo escrito). La **prioridad** ordena la lista: las órdenes abiertas aparecen primero, de alta a baja (y de la más reciente a la más antigua dentro de cada prioridad), con una etiqueta «Prioridad alta/media/baja»; las finalizadas o canceladas van al final. Ese mismo orden se ve en las tareas del operario y en «Registrar producción».
- **Órdenes frecuentes (plantillas):** cada plantilla guarda línea, medida, calibre, color, meta, materia prima y prioridad; puede haber varias de la misma línea si cambia la variante. **Usar plantilla** llena el formulario de la nueva orden, incluida la variante. Las plantillas creadas antes de este cambio no tienen variante: al usarlas hay que escribirla.
- **Ventas:** registrar cliente, línea, variante, paquetes, unidades por paquete y precio por paquete. El total se calcula, el stock disminuye si hay existencias y se abre el comprobante.
- **Reportes:** el reporte del periodo se abre en la misma pestaña; **← Volver a reportes** regresa al listado y el menú lleva a cualquier otra sección. «Imprimir/guardar PDF» usa la impresión del navegador y **Descargar Excel** baja el detalle del periodo en un archivo `.xlsx` con las hojas Resumen, Por producto y Detalle.
- **Auditoría:** bitácora de acciones (inicios de sesión, cambios de usuarios, órdenes, movimientos y ventas) con fecha, usuario, acción y detalle; muestra los últimos 500 eventos y tiene un buscador.

## Supervisor

- **Inicio:** consultar resumen.
- **Asignar tareas:** crear órdenes para operarios activos con línea, medida, calibre y color, y asociar opcionalmente materia prima; asociar no registra consumo.
- **Operarios:** consultar equipo y órdenes activas.
- **Seguimiento:** consultar las órdenes, asignar el operario a las pendientes (la orden queda a tu cargo), editarlas mientras no tengan avance y **Cancelar** las abiertas. El estado no se cambia a mano: el operario inicia la orden y se finaliza sola al completar la meta.
- **Reportes:** consultar resúmenes, imprimirlos o descargarlos en Excel.
- **Materias primas:** consultar existencias y movimientos, y registrar el consumo de una bobina en una orden activa que la usa (**Registrar movimiento → Consumo en una orden**). Asociar la materia prima a la orden no consume stock automáticamente.

El supervisor tiene permiso de venta en la API, pero no la vista Ventas en el menú (DEF-007, por decidir con el cliente).

## Operario

- **Inicio:** tareas activas, unidades producidas por línea, órdenes completadas y meta pendiente.
- **Mis tareas:** solo las órdenes abiertas, primero las de prioridad alta, con su barra de avance y cuánto falta. **Iniciar** pasa una orden pendiente a «en proceso»; **Registrar avance** abre «Registrar producción» con esa orden elegida.
- **Registrar producción:** elegir una orden abierta e indicar cantidad y observaciones. No superar la meta pendiente; el avance incrementa la variante del inventario terminado que indica la orden (medida, calibre y color) y, si completa la meta, finaliza la orden.
- **Mi historial:** elegir **Hoy, Esta semana, Este mes o Este año** para ver las unidades producidas, cada registro de avance (fecha, orden, producto, cantidad y observación) y las órdenes finalizadas o canceladas.

## Vendedor

- **Ventas:** registrar ventas y consultar únicamente las ventas registradas con su cuenta.
- **Comprobante de venta:** se abre al registrar una venta y desde el botón **Ver** de cada venta. **Imprimir / guardar PDF** imprime solo el comprobante; para obtener el PDF, elija "Guardar como PDF" como impresora. Es un documento de control interno, no una factura electrónica.
- La vista de productos consulta existencias para seleccionar el artículo; no permite modificar inventario.

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