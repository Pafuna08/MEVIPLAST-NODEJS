-- CR-022: una venta con varios productos. «ventas» queda como encabezado (cliente, total, vendedor y fecha)
-- y cada producto pasa a una línea de «ventas_detalle». Cada venta anterior se copia como una venta de una
-- sola línea antes de quitar sus columnas de producto; no se pierden datos ni cambian los números.
-- Idempotente y compatible con MySQL 8 y MariaDB 10.4 (cada cambio se hace solo si hace falta).

CREATE TABLE IF NOT EXISTS ventas_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  inventario_id INT NULL,
  producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(12,4) NOT NULL,
  cantidad_paquetes INT NOT NULL,
  unidades_paquete INT NOT NULL,
  precio_paquete DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_paquetes * precio_paquete) STORED,
  INDEX idx_ventas_detalle_venta (venta_id),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE SET NULL
);

-- Estado antes de cambiar nada
SET @tiene_producto = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'producto');
SET @total_generado = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'total' AND (extra LIKE '%GENERATED%' OR COALESCE(generation_expression, '') <> ''));
SET @fk_inventario = (SELECT constraint_name FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'inventario_id' AND referenced_table_name IS NOT NULL LIMIT 1);

-- 1. Cada venta anterior pasa a ser una línea (solo las que aún no la tienen)
SET @copiar = IF(
  @tiene_producto > 0,
  'INSERT INTO ventas_detalle (venta_id, inventario_id, producto, cantidad, precio_unitario, cantidad_paquetes, unidades_paquete, precio_paquete) SELECT v.id, v.inventario_id, v.producto, v.cantidad, v.precio_unitario, v.cantidad_paquetes, v.unidades_paquete, v.precio_paquete FROM ventas v WHERE NOT EXISTS (SELECT 1 FROM ventas_detalle d WHERE d.venta_id = v.id)',
  'SELECT 1'
);
PREPARE copiar_lineas_stmt FROM @copiar;
EXECUTE copiar_lineas_stmt;
DEALLOCATE PREPARE copiar_lineas_stmt;

-- 2. El total del encabezado deja de calcularse con las columnas de producto: se guarda su valor
SET @agregar_total = IF(
  @total_generado > 0,
  'ALTER TABLE ventas ADD COLUMN total_venta DECIMAL(12,2) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE agregar_total_stmt FROM @agregar_total;
EXECUTE agregar_total_stmt;
DEALLOCATE PREPARE agregar_total_stmt;
SET @copiar_total = IF(
  @total_generado > 0,
  'UPDATE ventas SET total_venta = total',
  'SELECT 1'
);
PREPARE copiar_total_stmt FROM @copiar_total;
EXECUTE copiar_total_stmt;
DEALLOCATE PREPARE copiar_total_stmt;
SET @quitar_total = IF(
  @total_generado > 0,
  'ALTER TABLE ventas DROP COLUMN total',
  'SELECT 1'
);
PREPARE quitar_total_stmt FROM @quitar_total;
EXECUTE quitar_total_stmt;
DEALLOCATE PREPARE quitar_total_stmt;
SET @renombrar_total = IF(
  @total_generado > 0,
  'ALTER TABLE ventas CHANGE total_venta total DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cliente',
  'SELECT 1'
);
PREPARE renombrar_total_stmt FROM @renombrar_total;
EXECUTE renombrar_total_stmt;
DEALLOCATE PREPARE renombrar_total_stmt;

-- 3. Sin la clave foránea a inventario: la variante ahora está en cada línea
SET @quitar_fk = IF(
  @fk_inventario IS NOT NULL,
  CONCAT('ALTER TABLE ventas DROP FOREIGN KEY `', @fk_inventario, '`'),
  'SELECT 1'
);
PREPARE quitar_fk_stmt FROM @quitar_fk;
EXECUTE quitar_fk_stmt;
DEALLOCATE PREPARE quitar_fk_stmt;

-- 4. Columnas de producto del encabezado (sus datos ya están en ventas_detalle)
SET @quitar_producto = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'producto'),
  'ALTER TABLE ventas DROP COLUMN producto',
  'SELECT 1'
);
PREPARE quitar_producto_stmt FROM @quitar_producto;
EXECUTE quitar_producto_stmt;
DEALLOCATE PREPARE quitar_producto_stmt;
SET @quitar_cantidad = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'cantidad'),
  'ALTER TABLE ventas DROP COLUMN cantidad',
  'SELECT 1'
);
PREPARE quitar_cantidad_stmt FROM @quitar_cantidad;
EXECUTE quitar_cantidad_stmt;
DEALLOCATE PREPARE quitar_cantidad_stmt;
SET @quitar_precio_unitario = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'precio_unitario'),
  'ALTER TABLE ventas DROP COLUMN precio_unitario',
  'SELECT 1'
);
PREPARE quitar_precio_unitario_stmt FROM @quitar_precio_unitario;
EXECUTE quitar_precio_unitario_stmt;
DEALLOCATE PREPARE quitar_precio_unitario_stmt;
SET @quitar_inventario_id = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'inventario_id'),
  'ALTER TABLE ventas DROP COLUMN inventario_id',
  'SELECT 1'
);
PREPARE quitar_inventario_id_stmt FROM @quitar_inventario_id;
EXECUTE quitar_inventario_id_stmt;
DEALLOCATE PREPARE quitar_inventario_id_stmt;
SET @quitar_cantidad_paquetes = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'cantidad_paquetes'),
  'ALTER TABLE ventas DROP COLUMN cantidad_paquetes',
  'SELECT 1'
);
PREPARE quitar_cantidad_paquetes_stmt FROM @quitar_cantidad_paquetes;
EXECUTE quitar_cantidad_paquetes_stmt;
DEALLOCATE PREPARE quitar_cantidad_paquetes_stmt;
SET @quitar_unidades_paquete = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'unidades_paquete'),
  'ALTER TABLE ventas DROP COLUMN unidades_paquete',
  'SELECT 1'
);
PREPARE quitar_unidades_paquete_stmt FROM @quitar_unidades_paquete;
EXECUTE quitar_unidades_paquete_stmt;
DEALLOCATE PREPARE quitar_unidades_paquete_stmt;
SET @quitar_precio_paquete = IF(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'precio_paquete'),
  'ALTER TABLE ventas DROP COLUMN precio_paquete',
  'SELECT 1'
);
PREPARE quitar_precio_paquete_stmt FROM @quitar_precio_paquete;
EXECUTE quitar_precio_paquete_stmt;
DEALLOCATE PREPARE quitar_precio_paquete_stmt;
