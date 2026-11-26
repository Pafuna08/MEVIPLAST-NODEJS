# Trazabilidad y estado por historia

Estado del código en `develop` al PR #124 (25/11/2026). Coincide con la misma fuente que la **Matriz Maestra de Trazabilidad** ([`02_Requisitos/Matriz_de_Trazabilidad.xlsx`](../Documentacion_Proyecto_ADSO/02_Requisitos/Matriz_de_Trazabilidad.xlsx) del paquete documental), que es la fuente única de relaciones; si hay diferencias, manda la matriz.

«Implementado» describe el código y las pruebas. MEVIPLAST aprobó el alcance en la reunión inicial y delegó en el equipo las decisiones pendientes ([`decisiones-por-delegacion.md`](decisiones-por-delegacion.md)); la sesión de aceptación por rol con usuarios de la empresa no se realizó.

Historias: 25 implementadas de 25. Requisitos funcionales: 29 implementados de 29, todos con caso de prueba (CP-112 para RF-019) (desde el 24/11/2026: HU-004, HU-010, HU-020 y HU-023 en los PR #107 a #109, y HU-017 por la decisión CR-025). «Mi perfil» (CR-028) no tiene historia: es una decisión del equipo por delegación, con sus casos CP-115 y CP-116.

## Historias de usuario (por rol)

| ID | Rol | Historia | RF | Estado | Observación |
|---|---|---|---|---|---|
| HU-006 | Administrador | Registrar materias primas | RF-014 | Implementado | Catálogo de bobinas PEBD, PEAD y PP con tamaño del rollo y su unidad (pulgadas o centímetros, CR-027), calibre, color de la lista (RN-025) y peso de rollo; CP-114. |
| HU-017 | Administrador | Gestionar roles y permisos | RF-002 | Implementado | Cinco roles fijos (CR-002); el administrador crea usuarios y les asigna, cambia o retira el rol. Los permisos de cada rol son fijos y se aplican en el servidor en cada ruta (CR-025, decisión del equipo por delegación); CP-111. |
| HU-009 | Administrador | Consultar disponibilidad de insumos | RF-017 | Implementado | Listado y alerta de bajo stock (cantidad ≤ stock mínimo). El stock mínimo inicia en 0 y debe configurarse. |
| HU-010 | Administrador | Registrar compras de materiales | RF-015 | Implementado | Movimiento tipo compra con fecha y usuario, y costo total y número de factura opcionales, solo en compras (PR #108); CP-109. |
| HU-011 | Administrador | Registrar productos terminados | RF-018 | Implementado | Catálogo de 6 líneas con variantes (medida, calibre, color) con formato RN-025 (Cargadera por tallas T15 a T30, CR-019); el administrador agrega líneas desde la nueva orden (CR-020); ingresos y salidas manuales con ledger; la salida exige motivo; sin ubicación (CR-015). |
| HU-022 | Administrador | Consultar rendimiento de operarios | RF-027 | Implementado | % de cumplimiento de la meta por operario y periodo (diario, semanal, mensual, anual), para administrador y supervisor, con Excel. Indicador elegido por el equipo con la delegación de MEVIPLAST: producido ÷ meta de las órdenes asignadas y creadas en el periodo, sin las canceladas. Lo producido por cada operario se divide por referencia (CP-117). |
| HU-023 | Administrador | Generar reporte de inventario | RF-026 | Implementado | Existencias de producto terminado y materias primas con su alerta de stock bajo en el mismo reporte (PR #107), en el panel desde «Reportes → Reporte de inventario» (PR #112); CP-108. |
| HU-015 | Administrador | Generar reportes de ventas | RF-025 | Implementado | Resumen y detalle por periodo diario, semanal, mensual y anual. |
| HU-025 | Administrador | Exportar reportes | RF-028 | Implementado | PDF generado por el servidor, que se abre en otra pestaña con «Abrir PDF» (PR #90), y Excel con «Descargar Excel» (PR #28). |
| HU-001 | Supervisor | Asignar tareas de producción | RF-007, RF-008, RF-013 | Implementado | La orden del administrador queda pendiente para los supervisores; el que asigna el operario la toma y, si falta, el administrador asigna (CR-014). En «Asignar tareas» el supervisor ve las órdenes por asignar y elige el operario en una ventana con la carga de cada uno (MEVI-113). Plantillas frecuentes disponibles. Toda orden y plantilla indican su materia prima (RN-026). |
| HU-008 | Supervisor | Registrar consumo de materiales | RF-016 | Implementado | Consumo explícito asociado a una orden activa que usa esa materia prima; no es automático. Desde el 25/11/2026 el supervisor lo registra en Seguimiento (botón «Consumo»), sin la vista de Materias primas (CR-026). Probado en E2E (CP-062), en navegadores (CP-033) y en rutas (CP-113). |
| HU-004 | Supervisor | Consultar historial de producción | RF-024 | Implementado | Detalle por periodo calendario filtrado por operario y por producto, en pantalla, Excel y PDF (PR #107); CP-107. |
| HU-005 | Supervisor | Modificar órdenes de producción | RF-012 | Implementado | Solo órdenes pendientes sin avance; campos editables restringidos. |
| HU-021 | Supervisor | Generar reporte de producción | RF-024 | Implementado | Resumen por estado y detalle de unidades producidas por periodo. |
| HU-002 | Operario | Consultar tareas asignadas | RF-009 | Implementado | El operario solo recibe las órdenes cuyo responsable es su cuenta. «Mis tareas» muestra solo las abiertas, con «Iniciar» y «Registrar avance». |
| HU-003 | Operario | Registrar producción realizada | RF-010, RF-011 | Implementado | Avance > 0 y ≤ meta pendiente; incrementa la variante de la orden (medida, calibre y color) en el inventario y finaliza la orden al completar la meta. «Mi historial» muestra los avances propios por día, semana, mes o año. |
| HU-007 | Almacenista | Actualizar cantidades disponibles | RF-015 | Implementado | Solo mediante movimientos (compra, ajuste de entrada/salida) desde «Registrar movimiento»; la cantidad no se edita directamente. Formulario restaurado en DEF-013 (PR #33). |
| HU-013 | Vendedor | Registrar ventas | RF-020, RF-023 | Implementado | Venta por paquetes de 50, 100 o 500 unidades, hasta 1 000 paquetes y $100 000 000 (CR-018) con comprobante imprimible (RF-023, PR #27); la lista de referencias en existencia de cada línea permite elegir la variante (PR #66); una venta puede llevar varios productos con un solo comprobante (CR-022). |
| HU-014 | Vendedor | Actualizar stock automáticamente | RF-021 | Implementado | Venta, descuento y movimiento se confirman en una sola transacción con bloqueo de fila. |
| HU-012 | Vendedor | Consultar inventario disponible | RF-019 | Implementado | El vendedor consulta existencias sin poder modificarlas. |
| HU-024 | Vendedor | Visualizar historial de ventas | RF-022 | Implementado | El vendedor ve solo sus ventas; sin filtros por fecha o cliente. |
| HU-016 | Todos los roles | Iniciar sesión | RF-001 | Implementado | JWT con expiración de 8 h; contraseñas con bcrypt; mensaje de error genérico. El token deja de servir si el usuario se desactiva o cambia de rol (CP-053, CP-054). |
| HU-018 | Todos los roles | Recuperar contraseña | RF-003 | Implementado | Enlace por correo de un solo uso, vigente 30 min. Requiere SMTP configurado. Probado con un servidor SMTP local (CP-061) y con el buzón Gmail del proyecto (CP-030, EV-2026-11-08-04). |
| HU-019 | Todos los roles | Bloquear intentos fallidos | RF-004 | Implementado | 5 intentos seguidos bloquean 15 minutos (configurable); el administrador desbloquea. Probado con MySQL real (CP-051). |
| HU-020 | Todos los roles | Cerrar sesión | RF-005 | Implementado | Cerrar sesión revoca el token en el servidor (`POST /api/auth/logout`): el mismo token responde 401 (PR #109). El servidor también lo rechaza si el usuario se desactiva o cambia de rol (DEF-011) y vence a las 8 h; CP-110. |

## Requisitos funcionales, API y pruebas

| RF | Nombre | Estado | Versión | API | Casos de prueba |
|---|---|---|---|---|---|
| RF-001 | Autenticar usuario | Implementado | MVP | API-01 | CP-027 (pendiente), CP-046 |
| RF-002 | Gestionar usuarios y rol | Implementado | MVP | API-03 | CP-047, CP-054, CP-089 (siempre queda un administrador activo, DEF-021), CP-111 (permisos fijos por rol, CR-025) |
| RF-003 | Recuperar acceso por correo | Implementado | MVP | API-02 | CP-001, CP-002, CP-003, CP-030, CP-061 |
| RF-004 | Bloquear intentos fallidos | Implementado | MVP | API-03 | CP-043, CP-044, CP-045, CP-046, CP-047, CP-051, CP-115 (la contraseña actual equivocada en «Mi perfil» cuenta como intento fallido) |
| RF-005 | Cerrar sesión | Implementado | MVP | API-01 | CP-110 (el token queda revocado en el servidor) |
| RF-006 | Registrar auditoría | Implementado | MVP | — | CP-083 (inicios de sesión en el archivo de accesos, CR-016) |
| RF-007 | Crear orden de producción | Implementado | MVP | API-06 | CP-028, CP-048, CP-069, CP-075, CP-086 (materia prima obligatoria, RN-026), CP-090 (meta entera hasta 1 000 000, DEF-022) |
| RF-008 | Asignar orden a operario | Implementado | MVP | API-07 | CP-016, CP-028, CP-075 |
| RF-009 | Consultar órdenes asignadas | Implementado | MVP | API-06 | CP-015, CP-020, CP-070 |
| RF-010 | Registrar avance de producción | Implementado | MVP | API-07 | CP-028, CP-036, CP-037, CP-038, CP-039, CP-069, CP-073, CP-076, CP-077 |
| RF-011 | Cambiar estado de la orden (el operario inicia; administrador y supervisor solo cancelan; CR-013) | Implementado | MVP | API-07 | CP-074, CP-092 (una orden con avance se cancela, no se elimina, DEF-023) |
| RF-012 | Editar orden pendiente | Implementado | MVP | API-06 | CP-011, CP-012, CP-071 |
| RF-013 | Gestionar plantillas de producción | Implementado | MVP | API-06 | CP-013, CP-072 |
| RF-014 | Registrar materia prima | Implementado | MVP | API-04 | CP-007, CP-008, CP-048, CP-087 (color de la lista, RN-025), CP-090 (kg hasta 100 000 y bobina única, DEF-022), CP-114 (tamaño del rollo con su unidad, CR-027) |
| RF-015 | Registrar compras y ajustes | Implementado | MVP | API-05 | CP-009, CP-010, CP-033, CP-062, CP-109 (costo y factura de la compra) |
| RF-016 | Registrar consumo por orden | Implementado | MVP | API-05 | CP-033, CP-062, CP-113 (CR-026: el supervisor registra el consumo, pero no consulta el historial de movimientos) |
| RF-017 | Consultar existencias y bajo stock | Implementado | MVP | API-04 | CP-020 |
| RF-018 | Registrar ingreso/salida de producto terminado | Implementado | MVP | API-08 | CP-004, CP-005, CP-006, CP-048, CP-067, CP-078, CP-081, CP-082, CP-090 (unidades enteras hasta 1 000 000, DEF-022), CP-095 (tallas de Cargadera, CR-019), CP-096 (líneas nuevas, CR-020) |
| RF-019 | Consultar inventario y movimientos | Implementado | MVP | API-08 | CP-112 (lista del catálogo e historial de movimientos) |
| RF-020 | Registrar venta por paquetes | Implementado | MVP | API-09 | CP-024, CP-028, CP-078, CP-088 (lista de referencias), CP-091 (paquetes de 50, 100 o 500 y topes de venta, CR-018), CP-098 (varios productos por venta, CR-022) |
| RF-021 | Descontar stock por venta | Implementado | MVP | API-09 | CP-025, CP-028, CP-031, CP-098 (todo o nada con varios productos) |
| RF-022 | Consultar historial de ventas | Implementado | MVP | API-09 | CP-026 |
| RF-023 | Generar comprobante de venta | Implementado | MVP | API-09 | CP-055, CP-056, CP-057, CP-097 (desde el reporte de ventas; el supervisor no lo ve, CR-021), CP-099 (PDF en otra pestaña) |
| RF-024 | Reporte de producción por periodo | Implementado | MVP | API-10 | CP-017, CP-018, CP-028, CP-107 (filtro por operario y producto) |
| RF-025 | Reporte de ventas por periodo | Implementado | MVP | API-10 | CP-019, CP-028 |
| RF-026 | Reporte de inventario | Implementado | MVP | API-10 | CP-108 (producto terminado y materias primas) |
| RF-027 | Rendimiento por operario | Implementado | MVP | API-10 | CP-079, CP-080, CP-117 (producción por referencia) |
| RF-028 | Exportar reportes | Implementado | MVP | API-10 | CP-058, CP-059, CP-060, CP-100 (PDF en otra pestaña) |
| RF-029 | Consultar bitácora de auditoría | Implementado | MVP | API-11 | CP-068, CP-083, CP-084 (filtros, páginas y archivo, CR-016) |

## Brechas abiertas

- Usabilidad con usuarios de MEVIPLAST (RNF-006): la sesión de aceptación por rol no se realizó.
- Etiqueta `v1.0.0`. La instalación limpia por Carlos Herrera Sibaja (RNF-009) ya se hizo (EV-2026-11-08-05).

Las evidencias de cada prueba están en [`../evidence/README.md`](../evidence/README.md).
