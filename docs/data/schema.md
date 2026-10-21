# Esquema de datos

La fuente ejecutable es [`../../backend/sql/schema.sql`](../../backend/sql/schema.sql); la inicialización y migración inicial están en `backend/src/config/initDb.js`.

| Tabla | Propósito | Relaciones / notas |
|---|---|---|
| `usuarios` | Cuenta, hash, rol y estado | Roles actuales: `admin`, `supervisor`, `operario` |
| `auditoria` | Acciones registradas | Usuario opcional; conserva el registro al eliminar usuario |
| `materia_prima` | Existencia agregada de insumos | No hay tabla de movimientos ni compras |
| `produccion` | Orden y avance acumulado | Responsable y materia prima opcionales; registra lote y observaciones |
| `inventario` | Existencia agregada de producto terminado | No hay historial general de movimientos |
| `ventas` | Venta, precio y fecha | `total` calculado por MySQL; no existe comprobante |

No hay directorio de migraciones numeradas ni una política de reversión implementada. `db:init` crea tablas, ejecuta una alteración compatible y agrega datos demo; no lo ejecutes contra datos productivos sin respaldo y revisión.