# Catálogo de API

Base: `/api`. Las rutas protegidas esperan `Authorization: Bearer <token>`. Los roles y respuestas siguientes se derivan de los routers y middleware del backend; este catálogo no sustituye todavía una especificación OpenAPI validada.

| Método | Ruta | Acceso definido en backend | Propósito |
|---|---|---|---|
| POST | `/auth/login` | Público | Iniciar sesión y recibir JWT |
| GET, POST | `/usuarios` | Admin | Consultar y crear usuarios |
| PUT, DELETE | `/usuarios/{id}` | Admin | Actualizar o eliminar usuario |
| GET | `/materia-prima`, `/materia-prima/bajo-stock`, `/materia-prima/{id}` | Token | Consultar materias primas |
| POST, PUT | `/materia-prima`, `/materia-prima/{id}` | Admin, supervisor | Crear o actualizar material |
| DELETE | `/materia-prima/{id}` | Admin | Eliminar material |
| GET | `/produccion` | Token; operario limitado a sus órdenes | Consultar órdenes |
| GET | `/produccion/operarios` | Admin, supervisor | Consultar operarios activos |
| POST | `/produccion` | Admin, supervisor | Crear orden |
| PUT | `/produccion/{id}/estado` | Admin, supervisor, operario asignado | Cambiar estado |
| POST | `/produccion/{id}/avance` | Operario asignado | Registrar avance |
| DELETE | `/produccion/{id}` | Admin | Eliminar orden |
| GET | `/inventario` | Token | Consultar existencias |
| POST | `/inventario` | Admin, supervisor | Ingresar producto terminado |
| POST | `/inventario/{id}/salida` | Admin, supervisor | Registrar salida |
| GET | `/ventas` | Token | Consultar ventas |
| POST | `/ventas` | Admin, supervisor | Registrar venta y descontar inventario |
| GET | `/reportes/produccion`, `/reportes/ventas`, `/reportes/inventario` | Admin, supervisor | Consultar resúmenes |
| GET | `/reportes/auditoria` | Admin | Consultar bitácora |

El middleware valida token/rol. La autorización efectiva debe seguir probándose por endpoint, no solo por la interfaz. No existen rutas de recuperación de contraseña, bloqueo de intentos, compra/consumo de materias primas ni exportación Excel en los routers revisados.