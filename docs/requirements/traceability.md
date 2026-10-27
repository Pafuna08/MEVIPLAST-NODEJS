# Trazabilidad y estado por historia

Estado del código en `develop`, commit `55dce18` (27/10/2026). Se genera desde la misma fuente que la **Matriz Maestra de Trazabilidad** (`02_Requisitos/Matriz_de_Trazabilidad.xlsx` del paquete documental), que es la fuente única de relaciones; si hay diferencias, manda la matriz.

«Implementado» describe el código y las pruebas, no la aceptación: ninguna historia está aceptada por el cliente todavía.

Historias: 19 implementadas, 5 parciales y 1 pendiente de 25. Requisitos funcionales: 26 implementados, 2 parciales y 1 pendiente de 29.

## Historias de usuario (por rol)

| ID | Rol | Historia | RF | Estado | Observación |
|---|---|---|---|---|---|
| HU-006 | Administrador | Registrar materias primas | RF-014 | Implementado | Catálogo de bobinas PEBD, PEAD y PP con medida, calibre, color y peso de rollo. |
| HU-017 | Administrador | Gestionar roles y permisos | RF-002 | Parcial | Cinco roles fijos; el administrador asigna el rol. Los permisos por rol están en el código, no son configurables. |
| HU-009 | Administrador | Consultar disponibilidad de insumos | RF-017 | Implementado | Listado y alerta de bajo stock (cantidad ≤ stock mínimo). El stock mínimo inicia en 0 y debe configurarse. |
| HU-010 | Administrador | Registrar compras de materiales | RF-015 | Parcial | Movimiento tipo compra con fecha y usuario; no registra costo ni número de factura. |
| HU-011 | Administrador | Registrar productos terminados | RF-018 | Implementado | Catálogo de 6 líneas con variantes (medida, calibre, color); ingresos y salidas manuales con ledger. |
| HU-022 | Administrador | Consultar rendimiento de operarios | RF-027 | Pendiente | No implementado. Acordar indicador y fórmula con el cliente. |
| HU-023 | Administrador | Generar reporte de inventario | RF-026 | Parcial | Lista existencias de producto terminado; no incluye materias primas en el mismo reporte. |
| HU-015 | Administrador | Generar reportes de ventas | RF-025 | Implementado | Resumen y detalle por periodo diario, semanal, mensual y anual. |
| HU-025 | Administrador | Exportar reportes | RF-028 | Implementado | PDF con la impresión del navegador y Excel con «Descargar Excel» (PR #28). |
| HU-001 | Supervisor | Asignar tareas de producción | RF-007, RF-008, RF-013 | Implementado | El administrador crea la orden para un supervisor activo; el supervisor la asigna a un operario activo. Plantillas frecuentes disponibles. |
| HU-008 | Supervisor | Registrar consumo de materiales | RF-016 | Implementado | Consumo explícito asociado a una orden activa que usa esa materia prima; no es automático. Probado en E2E (CP-062) y en navegadores (CP-033). |
| HU-004 | Supervisor | Consultar historial de producción | RF-024 | Parcial | Detalle por periodo calendario; falta filtro por operario y producto. |
| HU-005 | Supervisor | Modificar órdenes de producción | RF-012 | Implementado | Solo órdenes pendientes sin avance; campos editables restringidos. |
| HU-021 | Supervisor | Generar reporte de producción | RF-024 | Implementado | Resumen por estado y detalle de unidades producidas por periodo. |
| HU-002 | Operario | Consultar tareas asignadas | RF-009 | Implementado | El operario solo recibe las órdenes cuyo responsable es su cuenta. |
| HU-003 | Operario | Registrar producción realizada | RF-010, RF-011 | Implementado | Avance > 0 y ≤ meta pendiente; incrementa inventario y finaliza la orden al completar la meta. |
| HU-007 | Almacenista | Actualizar cantidades disponibles | RF-015 | Implementado | Solo mediante movimientos (compra, ajuste de entrada/salida) desde «Registrar movimiento»; la cantidad no se edita directamente. Formulario restaurado en DEF-013 (PR #33). |
| HU-013 | Vendedor | Registrar ventas | RF-020, RF-023 | Implementado | Venta por paquetes (1–500 unidades por paquete) con comprobante imprimible (RF-023, PR #27). |
| HU-014 | Vendedor | Actualizar stock automáticamente | RF-021 | Implementado | Venta, descuento y movimiento se confirman en una sola transacción con bloqueo de fila. |
| HU-012 | Vendedor | Consultar inventario disponible | RF-019 | Implementado | El vendedor consulta existencias sin poder modificarlas. |
| HU-024 | Vendedor | Visualizar historial de ventas | RF-022 | Implementado | El vendedor ve solo sus ventas; sin filtros por fecha o cliente. |
| HU-016 | Todos los roles | Iniciar sesión | RF-001 | Implementado | JWT con expiración de 8 h; contraseñas con bcrypt; mensaje de error genérico. El token deja de servir si el usuario se desactiva o cambia de rol (CP-053, CP-054). |
| HU-018 | Todos los roles | Recuperar contraseña | RF-003 | Implementado | Enlace por correo de un solo uso, vigente 30 min. Requiere SMTP configurado. Probado con un servidor SMTP local (CP-061); falta probar con el correo real de MEVIPLAST (CP-030). |
| HU-019 | Todos los roles | Bloquear intentos fallidos | RF-004 | Implementado | 5 intentos seguidos bloquean 15 minutos (configurable); el administrador desbloquea. Probado con MySQL real (CP-051). |
| HU-020 | Todos los roles | Cerrar sesión | RF-005 | Parcial | Elimina la sesión del navegador. El token no se revoca al cerrar sesión, pero el servidor lo rechaza si el usuario se desactiva o cambia de rol (DEF-011) y vence a las 8 h. |

## Requisitos funcionales, API y pruebas

| RF | Nombre | Estado | Versión | API | Casos de prueba |
|---|---|---|---|---|---|
| RF-001 | Autenticar usuario | Implementado | MVP | API-01 | CP-027 (pendiente), CP-046 |
| RF-002 | Gestionar usuarios y rol | Implementado | MVP | API-03 | CP-047, CP-054 |
| RF-003 | Recuperar acceso por correo | Implementado | MVP | API-02 | CP-001, CP-002, CP-003, CP-030 (pendiente), CP-061 |
| RF-004 | Bloquear intentos fallidos | Implementado | MVP | API-03 | CP-043, CP-044, CP-045, CP-046, CP-047, CP-051 |
| RF-005 | Cerrar sesión | Parcial | MVP | — | — |
| RF-006 | Registrar auditoría | Implementado | MVP | — | — |
| RF-007 | Crear orden de producción | Implementado | MVP | API-06 | CP-028, CP-048 |
| RF-008 | Asignar orden a operario | Implementado | MVP | API-07 | CP-016, CP-028 |
| RF-009 | Consultar órdenes asignadas | Implementado | MVP | API-06 | CP-015, CP-020 |
| RF-010 | Registrar avance de producción | Implementado | MVP | API-07 | CP-028, CP-036, CP-037, CP-038, CP-039 |
| RF-011 | Cambiar estado de la orden | Implementado | MVP | API-07 | CP-014 |
| RF-012 | Editar orden pendiente | Implementado | MVP | API-06 | CP-011, CP-012 |
| RF-013 | Gestionar plantillas de producción | Implementado | MVP | API-06 | CP-013 |
| RF-014 | Registrar materia prima | Implementado | MVP | API-04 | CP-007, CP-008, CP-048 |
| RF-015 | Registrar compras y ajustes | Implementado | MVP | API-05 | CP-009, CP-010, CP-033, CP-062 |
| RF-016 | Registrar consumo por orden | Implementado | MVP | API-05 | CP-033, CP-062 |
| RF-017 | Consultar existencias y bajo stock | Implementado | MVP | API-04 | CP-020 |
| RF-018 | Registrar ingreso/salida de producto terminado | Implementado | MVP | API-08 | CP-004, CP-005, CP-006, CP-048 |
| RF-019 | Consultar inventario y movimientos | Implementado | MVP | API-08 | — |
| RF-020 | Registrar venta por paquetes | Implementado | MVP | API-09 | CP-024, CP-028 |
| RF-021 | Descontar stock por venta | Implementado | MVP | API-09 | CP-025, CP-028, CP-031 |
| RF-022 | Consultar historial de ventas | Implementado | MVP | API-09 | CP-026 |
| RF-023 | Generar comprobante de venta | Implementado | MVP | API-09 | CP-055, CP-056, CP-057 |
| RF-024 | Reporte de producción por periodo | Implementado | MVP | API-10 | CP-017, CP-018, CP-028 |
| RF-025 | Reporte de ventas por periodo | Implementado | MVP | API-10 | CP-019, CP-028 |
| RF-026 | Reporte de inventario | Parcial | MVP | API-10 | — |
| RF-027 | Rendimiento por operario | Pendiente | V1.1 | — | — |
| RF-028 | Exportar reportes | Implementado | MVP | API-10 | CP-058, CP-059, CP-060 |
| RF-029 | Consultar bitácora de auditoría | Implementado | MVP | API-11 | — |

## Brechas abiertas

- HU-022 / RF-027: falta que el cliente defina el indicador de rendimiento por operario.
- CP-030: probar la recuperación de contraseña con el SMTP real de MEVIPLAST (con un servidor local ya está probada, CP-061).
- Aceptación del cliente por rol y etiqueta `v1.0.0`.

Las evidencias de cada prueba están en [`../evidence/README.md`](../evidence/README.md).
