# Catálogo de API

Base: `/api`. Las rutas protegidas esperan `Authorization: Bearer <token>`. Los roles y respuestas siguientes se derivan de los routers y middleware del backend; este catálogo no sustituye todavía una especificación OpenAPI validada.

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
| GET         | `/produccion`                                                        | Admin; supervisor limitado a órdenes entregadas; operario limitado a sus órdenes | Consultar órdenes |
| GET         | `/produccion/operarios`                                              | Admin, supervisor                      | Consultar operarios activos            |
| GET         | `/produccion/supervisores`                                           | Admin                                  | Consultar supervisores activos         |
| GET         | `/produccion/plantillas`                                             | Admin, supervisor                      | Consultar plantillas de órdenes        |
| POST        | `/produccion/plantillas`                                             | Admin                                  | Crear plantilla de orden               |
| DELETE      | `/produccion/plantillas/{id}`                                        | Admin                                  | Eliminar plantilla                     |
| POST        | `/produccion`                                                        | Admin (a un supervisor), supervisor (a un operario) | Crear orden               |
| PUT         | `/produccion/{id}/asignar`                                           | Supervisor de la orden                 | Asignar operario a orden pendiente sin avance |
| PUT         | `/produccion/{id}/estado`                                            | Admin, supervisor, operario asignado   | Cambiar estado                         |
| PUT         | `/produccion/{id}`                                                   | Admin, supervisor                      | Editar orden pendiente sin avance      |
| POST        | `/produccion/{id}/avance`                                            | Operario asignado                      | Registrar avance                       |
| DELETE      | `/produccion/{id}`                                                   | Admin                                  | Eliminar orden                         |
| GET         | `/inventario`                                                        | Admin, supervisor, almacenista, vendedor | Consultar existencias                  |
| GET         | `/inventario/movimientos`, `/inventario/{id}/movimientos`            | Admin, supervisor, almacenista         | Consultar ledger de inventario         |
| POST        | `/inventario`                                                        | Admin, supervisor, almacenista         | Registrar ingreso manual              |
| POST        | `/inventario/{id}/salida`                                            | Admin, supervisor, almacenista         | Registrar salida manual                |
| GET         | `/ventas`                                                            | Admin, supervisor; vendedor (solo propias) | Consultar ventas                  |
| POST        | `/ventas`                                                            | Admin, supervisor, vendedor             | Registrar venta y descontar inventario |
| GET         | `/reportes/produccion`, `/reportes/ventas`, `/reportes/inventario`   | Admin, supervisor                      | Consultar resúmenes                    |
| GET         | `/reportes/produccion/detalle?periodo={diario\|semanal\|mensual\|anual}` | Admin, supervisor                   | Ver producción registrada y agregados del periodo calendario actual |
| GET         | `/reportes/ventas/detalle?periodo={diario\|semanal\|mensual\|anual}` | Admin, supervisor                      | Ver ventas registradas y agregados del periodo calendario actual |
| GET         | `/reportes/auditoria`                                                | Admin                                  | Consultar bitácora                     |

La venta, el movimiento de inventario relacionado y el descuento de saldo se confirman en una sola transacción. Las compras, ajustes y consumos de materia prima actualizan saldo y ledger en la misma transacción. La recuperación requiere SMTP configurado y un correo asociado a la cuenta. La autorización efectiva debe probarse por endpoint, no solo por la interfaz. Tras 5 intentos fallidos seguidos (`LOGIN_MAX_INTENTOS`), `/auth/login` responde 423 durante 15 minutos (`LOGIN_BLOQUEO_MINUTOS`), incluso con la contraseña correcta; el administrador puede desbloquear la cuenta antes. No se implementan comprobantes ni exportación Excel.
