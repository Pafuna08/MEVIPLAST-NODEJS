# Esquema de datos

La fuente ejecutable es [`../../backend/sql/schema.sql`](../../backend/sql/schema.sql); la inicialización y migración inicial están en `backend/src/config/initDb.js`.

| Tabla           | Propósito                                 | Relaciones / notas                                                    |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `usuarios`      | Cuenta, hash, rol y estado                | Roles: `admin`, `supervisor`, `operario`, `vendedor`, `almacenista`   |
| `auditoria`     | Acciones registradas                      | Usuario opcional; conserva el registro al eliminar usuario            |
| `materia_prima` | Existencia agregada de insumos            | `movimientos_materia_prima` registra compras, ajustes y consumos      |
| `produccion`    | Orden y avance acumulado                  | Responsable y materia prima opcionales; registra lote y observaciones |
| `inventario`    | Existencia agregada de producto terminado | `movimientos_inventario` registra saldos iniciales, ingresos, producción, salidas y ventas |
| `ventas`        | Venta, precio y fecha                     | `total` calculado por MySQL; movimiento enlazado al descontar stock; no existe comprobante |

La migración `backend/sql/migrations/20261020_roles_and_stock_movements.sql` amplía los roles, crea ambos ledgers e importa los saldos existentes como movimientos iniciales. Se probó dos veces sobre un esquema previo y datos ficticios en una instancia temporal aislada MariaDB 10.4.32; no se validaron respaldos/restauración ni la integración de toda la aplicación. `db:init` omite la migración por defecto. Para autorizar la aplicación se requieren `DB_APPLY_MIGRATIONS=true` y `DB_BACKUP_CONFIRMED=true`, tras verificar el respaldo, revisar el plan y obtener aprobación expresa; no la ejecutes contra una base compartida o real antes de esos pasos. `db:init` sí crea el esquema y agrega datos demo, así que tampoco debe tratarse como una operación inocua sobre datos existentes.
