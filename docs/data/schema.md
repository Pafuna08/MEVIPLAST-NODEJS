# Esquema de datos

La fuente ejecutable es [`../../backend/sql/schema.sql`](../../backend/sql/schema.sql); la inicialización y migración inicial están en `backend/src/config/initDb.js`.

| Tabla           | Propósito                                 | Relaciones / notas                                                    |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `usuarios`      | Cuenta, correo de recuperación, hash, rol y estado | Roles: `admin`, `supervisor`, `operario`, `vendedor`, `almacenista`; el correo es único y opcional en cuentas preexistentes |
| `auditoria`     | Acciones registradas                      | Usuario opcional; conserva el registro al eliminar usuario            |
| `materia_prima` | Existencia agregada de insumos            | `movimientos_materia_prima` registra compras, ajustes y consumos      |
| `produccion`    | Orden y avance acumulado                  | Supervisor asignado y operario responsable; registra lote y observaciones |
| `plantillas_produccion` | Recetas/órdenes frecuentes reutilizables | El administrador mantiene plantillas para crear órdenes con datos sugeridos |
| `inventario`    | Existencia agregada de producto terminado | `movimientos_inventario` registra saldos iniciales, ingresos, producción, salidas y ventas |
| `ventas`        | Venta, precio y fecha                     | `total` calculado por MySQL; movimiento enlazado al descontar stock; no existe comprobante |

La migración `backend/sql/migrations/20261020_roles_and_stock_movements.sql` amplía los roles, crea ambos ledgers e importa los saldos existentes como movimientos iniciales. Se probó dos veces sobre un esquema previo y datos ficticios en una instancia temporal aislada MariaDB 10.4.32; no se validaron respaldos/restauración ni la integración de toda la aplicación. `db:init` omite la migración por defecto. Para autorizar la aplicación se requieren `DB_APPLY_MIGRATIONS=true` y `DB_BACKUP_CONFIRMED=true`, tras verificar el respaldo, revisar el plan y obtener aprobación expresa; no la ejecutes contra una base compartida o real antes de esos pasos. `db:init` sí crea el esquema y agrega datos demo, así que tampoco debe tratarse como una operación inocua sobre datos existentes.

La migración `backend/sql/migrations/20261022_add_user_email.sql` agrega el correo de forma opcional para conservar las cuentas existentes sin un dato de contacto. El formulario de creación exige un correo válido y único. La recuperación de contraseña y el envío del nombre de usuario usan enlaces/correos y requieren SMTP configurado; las cuentas anteriores deben recibir un correo desde Gestión de usuarios para poder recuperarlas.

La migración `backend/sql/migrations/20261022_production_routing_and_templates.sql` agrega la asignación de supervisor a las órdenes y el catálogo de plantillas frecuentes. El administrador crea una orden dirigida a un supervisor activo; este asigna la orden a un operario activo. Las plantillas guardan producto, meta habitual, materia prima y prioridad, que se pueden ajustar al crear cada orden.
