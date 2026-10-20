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
- **Usuarios:** crear cuenta (nombre, usuario, contraseña y rol), activar/desactivar; eliminar otros usuarios requiere confirmación. No puedes eliminar tu propia cuenta desde esta vista.
- **Materias primas:** registrar material y consultar existencia/bajo stock. No hay flujo de compras ni historial de consumo.
- **Inventario:** ingresar producto terminado o sumar unidades a una referencia.
- **Producción:** consultar órdenes y cambiar estado.
- **Ventas:** registrar cliente, producto, cantidad y precio. El total se calcula y el stock disminuye si hay existencias.
- **Reportes:** consultar resúmenes; “Imprimir/guardar PDF” usa la impresión del navegador.

## Supervisor

- **Inicio:** consultar resumen.
- **Asignar tareas:** crear órdenes para operarios activos y asociar opcionalmente materia prima; asociar no registra consumo.
- **Operarios:** consultar equipo y órdenes activas.
- **Seguimiento:** consultar órdenes y cambiar estados.
- **Reportes:** consultar resúmenes.

La API autoriza ventas a supervisor, pero la interfaz no muestra esa opción. Confirmar esta diferencia con el administrador antes de usar el perfil para ventas.

## Operario

- **Inicio / Mis tareas:** consultar órdenes asociadas a tu cuenta.
- **Registrar producción:** elegir una orden abierta e indicar cantidad, lote y observaciones. No superar la meta pendiente; el avance incrementa inventario terminado.
- **Mi historial:** consultar órdenes asignadas.

## Problemas frecuentes

- Si una vista no carga, comprueba conexión y usa **Reintentar**; si persiste, reporta perfil, sección y hora.
- Si aparece stock insuficiente, solicita revisar la existencia al responsable autorizado.
- No registres compras, consumo, comprobantes o exportaciones: esas operaciones no están disponibles en la versión revisada.

## Aprobación pendiente

Hacer un recorrido guiado por cada perfil, anexar capturas con datos ficticios y validar lenguaje, accesibilidad y permisos. Este borrador no reemplaza la aceptación DOC-07/DOC-09.