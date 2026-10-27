-- Variante (medida, calibre, color) en las órdenes de producción, para que el avance
-- sume a la variante exacta del inventario terminado.
-- Solo agrega columnas NULL; las órdenes existentes quedan sin variante y conservan su comportamiento.
SET @add_production_size = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produccion'
      AND column_name = 'medida'
  ),
  'SELECT 1',
  'ALTER TABLE produccion ADD COLUMN medida VARCHAR(40) NULL AFTER producto'
);
PREPARE add_production_size_stmt FROM @add_production_size;
EXECUTE add_production_size_stmt;
DEALLOCATE PREPARE add_production_size_stmt;

SET @add_production_gauge = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produccion'
      AND column_name = 'calibre'
  ),
  'SELECT 1',
  'ALTER TABLE produccion ADD COLUMN calibre VARCHAR(40) NULL AFTER medida'
);
PREPARE add_production_gauge_stmt FROM @add_production_gauge;
EXECUTE add_production_gauge_stmt;
DEALLOCATE PREPARE add_production_gauge_stmt;

SET @add_production_color = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produccion'
      AND column_name = 'color'
  ),
  'SELECT 1',
  'ALTER TABLE produccion ADD COLUMN color VARCHAR(80) NULL AFTER calibre'
);
PREPARE add_production_color_stmt FROM @add_production_color;
EXECUTE add_production_color_stmt;
DEALLOCATE PREPARE add_production_color_stmt;
