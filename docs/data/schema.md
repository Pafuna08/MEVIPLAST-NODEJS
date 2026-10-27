# Esquema de datos

La fuente ejecutable es [`../../backend/sql/schema.sql`](../../backend/sql/schema.sql); la inicialización y migración inicial están en `backend/src/config/initDb.js`.

| Tabla           | Propósito                                 | Relaciones / notas                                                    |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `usuarios`      | Cuenta, correo de recuperación, hash, rol y estado | Roles: `admin`, `supervisor`, `operario`, `vendedor`, `almacenista`; el correo es único y opcional en cuentas preexistentes |
| `auditoria`     | Acciones registradas                      | Usuario opcional; conserva el registro al eliminar usuario            |
| `materia_prima` | Existencia y especificaciones de bobinas PEBD, PEAD y PP | Medida, calibre, color y peso por rollo; `movimientos_materia_prima` registra compras, ajustes y consumos |
| `produccion`    | Orden y avance acumulado                  | Supervisor asignado y operario responsable; registra lote y observaciones |
| `plantillas_produccion` | Recetas/órdenes frecuentes reutilizables | El administrador mantiene plantillas para crear órdenes con datos sugeridos |
| `inventario`    | Existencia agregada de producto terminado | `movimientos_inventario` registra saldos iniciales, ingresos, producción, salidas y ventas |
| `ventas`        | Venta, precio y fecha                     | `total` calculado por MySQL; movimiento enlazado al descontar stock; no existe comprobante |

La migración `backend/sql/migrations/20261020_roles_and_stock_movements.sql` amplía los roles, crea ambos ledgers e importa los saldos existentes como movimientos iniciales. Se probó dos veces sobre un esquema previo y datos ficticios en una instancia temporal aislada MariaDB 10.4.32; no se validaron respaldos/restauración ni la integración de toda la aplicación. `db:init` omite la migración por defecto. Para autorizar la aplicación se requieren `DB_APPLY_MIGRATIONS=true` y `DB_BACKUP_CONFIRMED=true`, tras verificar el respaldo, revisar el plan y obtener aprobación expresa; no la ejecutes contra una base compartida o real antes de esos pasos. `db:init` sí crea el esquema y agrega datos demo, así que tampoco debe tratarse como una operación inocua sobre datos existentes.

La migración `backend/sql/migrations/20261022_add_user_email.sql` agrega el correo de forma opcional para conservar las cuentas existentes sin un dato de contacto. El formulario de creación exige un correo válido y único. La recuperación de contraseña y el envío del nombre de usuario usan enlaces/correos y requieren SMTP configurado; las cuentas anteriores deben recibir un correo desde Gestión de usuarios para poder recuperarlas.

La migración `backend/sql/migrations/20261022_production_routing_and_templates.sql` agrega la asignación de supervisor a las órdenes y el catálogo de plantillas frecuentes. El administrador crea una orden dirigida a un supervisor activo; este asigna la orden a un operario activo. Las plantillas guardan producto, meta habitual, materia prima y prioridad, que se pueden ajustar al crear cada orden.

La migración `backend/sql/migrations/20261026_raw_material_roll_details.sql` agrega medida, calibre, color y peso por rollo a las materias primas. El registro inicial del peso del rollo también crea la existencia inicial en kilogramos; los registros preexistentes conservan estos campos vacíos.

La migración `backend/sql/migrations/20261026_replace_legacy_materials.sql` elimina los registros demo anteriores de materia prima y sus movimientos, y agrega seis variantes de ejemplo PEBD, PEAD y PP con existencias en cero. Las órdenes existentes conservan sus datos y quedan sin materia prima asociada cuando apuntaban a esos registros retirados.

La migración `backend/sql/migrations/20261026_finished_product_sales_catalog.sql` limita el inventario terminado y la producción a Adhesivo PP, Adhesivo Seguridad, Sencilla PP, Bolsas para la basura, Cargadera y Troquel riñón. Agrega medida, calibre y color por variante, elimina los productos, ventas y movimientos anteriores no pertenecientes al catálogo confirmado, y registra las ventas por paquetes (hasta 500 unidades por paquete), descontando las unidades del stock. No se usa un campo de categoría; se excluyen Sello fondo y Sin categoría.

La migración `backend/sql/migrations/20261027_login_lockout.sql` agrega a `usuarios` los campos `intentos_fallidos` y `bloqueado_hasta` para el bloqueo temporal por intentos fallidos (HU-019). Solo agrega columnas; no modifica datos existentes.

La migración `backend/sql/migrations/20261026_seed_demo_inventory.sql` agrega existencias DEMO de ejemplo a las seis materias primas y a las seis líneas de producto terminado. No registra ventas ni movimientos y solo actualiza materias primas de ejemplo que todavía están en cero y sin proveedor; las variantes de producto terminado solo se insertan si no existen. En las ubicaciones y proveedores se indica DEMO para distinguirlas de existencias reales.
