# Catálogo de API

Base: `/api`. Las rutas protegidas esperan `Authorization: Bearer <token>`. Responden 401 si falta el token, si está vencido o es inválido, o si el usuario fue desactivado, eliminado o cambió de rol desde que inició sesión; el panel cierra la sesión al recibir 401. Responden 403 cuando el rol no tiene permiso para la ruta. Los roles y respuestas siguientes se derivan de los routers y middleware del backend. El contrato formal está en [`openapi.json`](openapi.json) (OpenAPI 3.0.3): cuerpos de petición, códigos de respuesta y roles por ruta (`x-roles`). La prueba `backend/tests/openapi.test.js` falla si el contrato y las rutas registradas en Express no coinciden.

| Método      | Ruta                                                                 | Acceso definido en backend             | Propósito                              |
| ----------- | -------------------------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| GET         | `/health`                                                            | Público                                | Verificar que la API y la base de datos respondan (200 / 503) |
| POST        | `/auth/login`                                                        | Público                                | Iniciar sesión y recibir JWT           |
| POST        | `/auth/recuperar-password`                                           | Público                                | Solicitar enlace de recuperación por correo |
| POST        | `/auth/recordar-usuario`                                             | Público                                | Enviar nombre de usuario al correo asociado |
| POST        | `/auth/restablecer-password`                                         | Público con token de un solo uso       | Cambiar contraseña con enlace vigente   |
| GET, POST   | `/usuarios`                                                          | Admin                                  | Consultar y crear usuarios             |
| PUT, DELETE | `/usuarios/{id}`                                                     | Admin                                  | Actualizar o eliminar usuario          |
| PUT         | `/usuarios/{id}/desbloquear`                                         | Admin                                  | Desbloquear una cuenta bloqueada por intentos fallidos |
| GET         | `/materia-prima`, `/materia-prima/bajo-stock`, `/materia-prima/{id}` | Admin, supervisor, almacenista         | Consultar materias primas              |
| POST        | `/materia-prima`                                                     | Admin                                  | Crear material y registrar saldo inicial |
| PUT         | `/materia-prima/{id}`                                                | Admin, almacenista                     | Actualizar datos (no cantidad)          |
| DELETE      | `/materia-prima/{id}`                                                | Admin                                  | Eliminar material                      |
| GET         | `/materia-prima/movimientos`, `/materia-prima/{id}/movimientos`     | Admin, supervisor, almacenista         | Consultar ledger de materias primas    |
| POST        | `/materia-prima/movimientos`                                         | Admin, almacenista; consumo: admin/supervisor | Compra, ajuste o consumo asociado a orden |
| GET         | `/produccion`                                                        | Admin; supervisor limitado a órdenes entregadas; operario limitado a sus órdenes | Consultar órdenes (abiertas primero, por prioridad) |
| GET         | `/produccion/operarios`                                              | Admin, supervisor                      | Consultar operarios activos            |
| GET         | `/produccion/supervisores`                                           | Admin                                  | Consultar supervisores activos         |
| GET         | `/produccion/plantillas`                                             | Admin, supervisor                      | Consultar plantillas de órdenes        |
| POST        | `/produccion/plantillas`                                             | Admin                                  | Crear plantilla de orden con su variante (409 si ya existe) |
| DELETE      | `/produccion/plantillas/{id}`                                        | Admin                                  | Eliminar plantilla                     |
| GET         | `/produccion/mis-registros?periodo={diario\|semanal\|mensual\|anual}` | Operario (solo los suyos)        | Avances registrados en el periodo calendario actual (Mi historial); por defecto, mensual |
| POST        | `/produccion`                                                        | Admin (queda pendiente para los supervisores), supervisor (a un operario) | Crear orden con línea, medida, calibre y color |
| PUT         | `/produccion/{id}/asignar`                                           | Supervisor (toma la orden), admin (si falta el supervisor; no cambia el supervisor) | Asignar operario a orden pendiente sin avance |
| PUT         | `/produccion/{id}/estado`                                            | Operario asignado (solo inicia), admin y supervisor (solo cancelan) | Cambiar estado; la orden se finaliza sola al completar la meta (CR-013) |
| PUT         | `/produccion/{id}`                                                   | Admin, supervisor                      | Editar orden pendiente sin avance (medida, calibre y color van juntos) |
| POST        | `/produccion/{id}/avance`                                            | Operario asignado                      | Registrar avance; suma a la variante de la orden y la crea «Por ubicar» si no existe; la observación (máx. 255) queda en el movimiento |
| DELETE      | `/produccion/{id}`                                                   | Admin                                  | Eliminar orden                         |
| GET         | `/inventario`                                                        | Admin, supervisor, almacenista, vendedor | Consultar existencias                  |
| GET         | `/inventario/movimientos`, `/inventario/{id}/movimientos`            | Admin, supervisor, almacenista         | Consultar ledger de inventario         |
| POST        | `/inventario`                                                        | Admin, supervisor, almacenista         | Registrar ingreso manual              |
| POST        | `/inventario/{id}/salida`                                            | Admin, supervisor, almacenista         | Registrar salida manual con `cantidad`, `motivo` (de la lista) y `detalle` (obligatorio si el motivo es «Otro») |
| GET         | `/ventas`                                                            | Admin, supervisor; vendedor (solo propias) | Consultar ventas                  |
| POST        | `/ventas`                                                            | Admin, supervisor, vendedor             | Registrar venta y descontar inventario |
| GET         | `/ventas/:id/comprobante`                                            | Admin, supervisor; vendedor (solo propias, 404 si no) | Datos del comprobante imprimible con número `V-000123` (RF-023) |
| GET         | `/reportes/produccion`, `/reportes/ventas`, `/reportes/inventario`   | Admin, supervisor                      | Consultar resúmenes                    |
| GET         | `/reportes/produccion/detalle?periodo={diario\|semanal\|mensual\|anual}` | Admin, supervisor                   | Ver producción registrada y agregados del periodo calendario actual |
| GET         | `/reportes/ventas/detalle?periodo={diario\|semanal\|mensual\|anual}` | Admin, supervisor                      | Ver ventas registradas y agregados del periodo calendario actual |
| GET         | `/reportes/{produccion\|ventas}/detalle/excel?periodo=…`             | Admin, supervisor                      | Descargar el mismo detalle en `.xlsx` (hojas Resumen, Por producto y Detalle) (RF-028) |
| GET         | `/reportes/auditoria?limite=…`                                       | Admin                                  | Consultar bitácora (1 a 1 000 eventos, 100 por defecto; la usa la vista Auditoría) |

La venta, el movimiento de inventario relacionado y el descuento de saldo se confirman en una sola transacción. Las compras, ajustes y consumos de materia prima actualizan saldo y ledger en la misma transacción. La recuperación requiere SMTP configurado y un correo asociado a la cuenta. La autorización efectiva debe probarse por endpoint, no solo por la interfaz. Tras 5 intentos fallidos seguidos (`LOGIN_MAX_INTENTOS`), `/auth/login` responde 423 durante 15 minutos (`LOGIN_BLOQUEO_MINUTOS`), incluso con la contraseña correcta; el administrador puede desbloquear la cuenta antes. El panel usa `POST /materia-prima/movimientos` desde el formulario «Registrar movimiento» de Materias primas (restaurado en DEF-013).
