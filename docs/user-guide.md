# Manual de usuario MEVIPLAST

**Versión 0.2 - 2026-10-27, según `develop` en `55dce18`. Pendiente de validación por usuarios e instructor.** Resumen del Manual de Usuario (MEV-DOC-09 del paquete documental, con capturas por rol). Los pasos deben actualizarse al cambiar el producto. No usar cuentas demo fuera de desarrollo.

- Código: DOC-09-MEV-01
- Estado: En revisión
- Elaboración: Pablo E. Fuenmayor Osuna; revisión: Carlos Herrera Sibaja; aprobación: pendiente.

## Acceso

1. Abre la URL entregada por el responsable técnico.
2. Ingresa el usuario y contraseña asignados.
3. El panel abre en `/dashboard.html` con navegación según el rol de la cuenta.
4. Usa **Cerrar sesión** para retirar la sesión del navegador. La sesión vence a las 8 horas; si vence, o si el administrador desactiva tu cuenta o cambia tu rol, el panel te devuelve al inicio de sesión.

El backend valida permisos. No compartas contraseña ni token. Si aparece un error de permisos, informa el perfil, sección y hora sin adjuntar credenciales.

## Administrador

- **Inicio:** resumen operativo, órdenes, inventario y ventas.
- **Usuarios:** crear cuenta (nombre, usuario, contraseña y rol), activar/desactivar; eliminar otros usuarios requiere confirmación. No puedes eliminar tu propia cuenta desde esta vista. Si una cuenta muestra «Bloqueado hasta las…», usa **Desbloquear** para habilitarla antes de que termine el bloqueo.
- **Materias primas:** crear el catálogo y consultar existencias, movimientos y bajo stock. En **Registrar movimiento** se eligen la bobina, el tipo (compra, ajuste de entrada, ajuste de salida o consumo en una orden), la cantidad en kg y una observación. El consumo solo ofrece las órdenes activas que usan esa bobina.
- **Inventario:** registrar ingresos o salidas manuales y consultar el ledger. Los avances de producción y las ventas actualizan el saldo y dejan su movimiento automáticamente.
- **Producción:** consultar, asignar y editar órdenes pendientes sin avance; cambiar estados respetando las transiciones disponibles.
- **Ventas:** registrar cliente, línea, variante, paquetes, unidades por paquete y precio por paquete. El total se calcula, el stock disminuye si hay existencias y se abre el comprobante.
- **Reportes:** consultar resúmenes; “Imprimir/guardar PDF” usa la impresión del navegador y **Descargar Excel** baja el detalle del periodo en un archivo `.xlsx` con las hojas Resumen, Por producto y Detalle.

## Supervisor

- **Inicio:** consultar resumen.
- **Asignar tareas:** crear órdenes para operarios activos y asociar opcionalmente materia prima; asociar no registra consumo.
- **Operarios:** consultar equipo y órdenes activas.
- **Seguimiento:** consultar órdenes y cambiar estados.
- **Reportes:** consultar resúmenes, imprimirlos o descargarlos en Excel.
- **Materias primas:** consultar existencias y movimientos, y registrar el consumo de una bobina en una orden activa que la usa (**Registrar movimiento → Consumo en una orden**). Asociar la materia prima a la orden no consume stock automáticamente.

El supervisor tiene permiso de venta en la API, pero no la vista Ventas en el menú (DEF-007, por decidir con el cliente).

## Operario

- **Inicio / Mis tareas:** consultar órdenes asociadas a tu cuenta.
- **Registrar producción:** elegir una orden abierta e indicar cantidad, lote y observaciones. No superar la meta pendiente; el avance incrementa inventario terminado.
- **Mi historial:** consultar órdenes asignadas.

## Vendedor

- **Ventas:** registrar ventas y consultar únicamente las ventas registradas con su cuenta.
- **Comprobante de venta:** se abre al registrar una venta y desde el botón **Ver** de cada venta. **Imprimir / guardar PDF** imprime solo el comprobante; para obtener el PDF, elija "Guardar como PDF" como impresora. Es un documento de control interno, no una factura electrónica.
- La vista de productos consulta existencias para seleccionar el artículo; no permite modificar inventario.

## Almacenista

- **Materias primas:** registrar compras y ajustes de entrada o salida (**Registrar movimiento**), y consultar existencias e historial. Una salida mayor al saldo se rechaza sin cambios.
- **Inventario:** registrar ingresos y salidas manuales, y consultar el historial. La producción y las ventas mantienen sus movimientos desde sus respectivos procesos.

## Problemas frecuentes

- Tras 5 intentos fallidos seguidos la cuenta se bloquea 15 minutos, aunque después escribas la contraseña correcta. Espera ese tiempo, pide al administrador que la desbloquee o recupera la contraseña por correo (el restablecimiento también la desbloquea).

- Si una vista no carga, comprueba conexión y usa **Reintentar**; si persiste, reporta perfil, sección y hora.
- Si aparece stock insuficiente, solicita revisar la existencia al responsable autorizado.
- Si una salida excede el saldo disponible, revisa el stock antes de volver a intentar; la operación se rechaza sin aplicar cambios parciales.
- Las modificaciones de órdenes están limitadas a órdenes pendientes sin avance. El consumo de materia prima debe registrarse explícitamente y asociarse a la orden.

## Aprobación pendiente

Hacer un recorrido guiado por cada perfil con usuarios de MEVIPLAST y validar lenguaje, accesibilidad y permisos. Las capturas con datos ficticios están en el Manual de Usuario (MEV-DOC-09). Esta guía no reemplaza la aceptación DOC-07/DOC-09.