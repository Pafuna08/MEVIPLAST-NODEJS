# Manual de usuario MEVIPLAST

**Borrador 0.1 - 2026-10-20. Pendiente de validación por usuarios e instructor.** Los pasos describen la interfaz localizada y deben actualizarse al cambiar el producto. No usar cuentas demo fuera de desarrollo.

- Código: DOC-09-MEV-01
- Estado: Borrador
- Elaboración, responsable de revisión y aprobación: pendientes de confirmar por el equipo.

## Acceso

1. Abre la URL entregada por el responsable técnico.
2. Ingresa el usuario y contraseña asignados.
3. El panel abre en `/dashboard.html` con navegación según el rol de la cuenta.
4. Usa **Cerrar sesión** para retirar la sesión del navegador.

El backend valida permisos. No compartas contraseña ni token. Si aparece un error de permisos, informa el perfil, sección y hora sin adjuntar credenciales.

## Administrador

- **Inicio:** resumen operativo, órdenes, inventario y ventas.
- **Usuarios:** crear cuenta (nombre, usuario, contraseña y rol), activar/desactivar; eliminar otros usuarios requiere confirmación. No puedes eliminar tu propia cuenta desde esta vista. Si una cuenta muestra «Bloqueado hasta las…», usa **Desbloquear** para habilitarla antes de que termine el bloqueo.
- **Materias primas:** crear el catálogo y consultar existencias, movimientos y bajo stock; registrar compras, ajustes y consumos asociados a una orden.
- **Inventario:** registrar ingresos o salidas manuales y consultar el ledger. Los avances de producción y las ventas actualizan el saldo y dejan su movimiento automáticamente.
- **Producción:** consultar, asignar y editar órdenes pendientes sin avance; cambiar estados respetando las transiciones disponibles.
- **Ventas:** registrar cliente, producto, cantidad y precio. El total se calcula y el stock disminuye si hay existencias.
- **Reportes:** consultar resúmenes; “Imprimir/guardar PDF” usa la impresión del navegador.

## Supervisor

- **Inicio:** consultar resumen.
- **Asignar tareas:** crear órdenes para operarios activos y asociar opcionalmente materia prima; asociar no registra consumo.
- **Operarios:** consultar equipo y órdenes activas.
- **Seguimiento:** consultar órdenes y cambiar estados.
- **Reportes:** consultar resúmenes.

- **Materias primas:** consultar movimientos y registrar consumo asociado a una orden. La asociación de materia prima a la orden no consume stock automáticamente.
- **Ventas:** registrar ventas; el descuento de inventario y el movimiento relacionado se guardan en una transacción.

## Operario

- **Inicio / Mis tareas:** consultar órdenes asociadas a tu cuenta.
- **Registrar producción:** elegir una orden abierta e indicar cantidad, lote y observaciones. No superar la meta pendiente; el avance incrementa inventario terminado.
- **Mi historial:** consultar órdenes asignadas.

## Vendedor

- **Ventas:** registrar ventas y consultar únicamente las ventas registradas con su cuenta.
- La vista de productos consulta existencias para seleccionar el artículo; no permite modificar inventario.

## Almacenista

- **Materias primas:** registrar compras y ajustes, consultar existencias e historial de movimientos.
- **Inventario:** registrar ingresos y salidas manuales, y consultar el historial. La producción y las ventas mantienen sus movimientos desde sus respectivos procesos.

## Problemas frecuentes

- Tras 5 intentos fallidos seguidos la cuenta se bloquea 15 minutos, aunque después escribas la contraseña correcta. Espera ese tiempo, pide al administrador que la desbloquee o recupera la contraseña por correo (el restablecimiento también la desbloquea).

- Si una vista no carga, comprueba conexión y usa **Reintentar**; si persiste, reporta perfil, sección y hora.
- Si aparece stock insuficiente, solicita revisar la existencia al responsable autorizado.
- Si una salida excede el saldo disponible, revisa el stock antes de volver a intentar; la operación se rechaza sin aplicar cambios parciales.
- Las modificaciones de órdenes están limitadas a órdenes pendientes sin avance. El consumo de materia prima debe registrarse explícitamente y asociarse a la orden.

## Aprobación pendiente

Hacer un recorrido guiado por cada perfil, anexar capturas con datos ficticios y validar lenguaje, accesibilidad y permisos. Este borrador no reemplaza la aceptación DOC-07/DOC-09.