ALTER TABLE inventario MODIFY COLUMN producto VARCHAR(255) NOT NULL;
ALTER TABLE ventas
  MODIFY COLUMN producto VARCHAR(255) NOT NULL,
  MODIFY COLUMN precio_unitario DECIMAL(12,4) NOT NULL;

SET @add_familia = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'inventario' AND column_name = 'familia'
  ),
  'SELECT 1',
  'ALTER TABLE inventario ADD COLUMN familia VARCHAR(80) NULL'
);
PREPARE add_familia_stmt FROM @add_familia;
EXECUTE add_familia_stmt;
DEALLOCATE PREPARE add_familia_stmt;

SET @add_medida = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'inventario' AND column_name = 'medida'
  ),
  'SELECT 1',
  'ALTER TABLE inventario ADD COLUMN medida VARCHAR(40) NULL'
);
PREPARE add_medida_stmt FROM @add_medida;
EXECUTE add_medida_stmt;
DEALLOCATE PREPARE add_medida_stmt;

SET @add_calibre = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'inventario' AND column_name = 'calibre'
  ),
  'SELECT 1',
  'ALTER TABLE inventario ADD COLUMN calibre VARCHAR(40) NULL'
);
PREPARE add_calibre_stmt FROM @add_calibre;
EXECUTE add_calibre_stmt;
DEALLOCATE PREPARE add_calibre_stmt;

SET @add_color = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'inventario' AND column_name = 'color'
  ),
  'SELECT 1',
  'ALTER TABLE inventario ADD COLUMN color VARCHAR(80) NULL'
);
PREPARE add_color_stmt FROM @add_color;
EXECUTE add_color_stmt;
DEALLOCATE PREPARE add_color_stmt;

SET @add_inventario_id = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'inventario_id'
  ),
  'SELECT 1',
  'ALTER TABLE ventas ADD COLUMN inventario_id INT NULL'
);
PREPARE add_inventario_id_stmt FROM @add_inventario_id;
EXECUTE add_inventario_id_stmt;
DEALLOCATE PREPARE add_inventario_id_stmt;

SET @add_cantidad_paquetes = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'cantidad_paquetes'
  ),
  'SELECT 1',
  'ALTER TABLE ventas ADD COLUMN cantidad_paquetes INT NULL'
);
PREPARE add_cantidad_paquetes_stmt FROM @add_cantidad_paquetes;
EXECUTE add_cantidad_paquetes_stmt;
DEALLOCATE PREPARE add_cantidad_paquetes_stmt;

SET @add_unidades_paquete = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'unidades_paquete'
  ),
  'SELECT 1',
  'ALTER TABLE ventas ADD COLUMN unidades_paquete INT NULL'
);
PREPARE add_unidades_paquete_stmt FROM @add_unidades_paquete;
EXECUTE add_unidades_paquete_stmt;
DEALLOCATE PREPARE add_unidades_paquete_stmt;

SET @add_precio_paquete = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ventas' AND column_name = 'precio_paquete'
  ),
  'SELECT 1',
  'ALTER TABLE ventas ADD COLUMN precio_paquete DECIMAL(12,2) NULL'
);
PREPARE add_precio_paquete_stmt FROM @add_precio_paquete;
EXECUTE add_precio_paquete_stmt;
DEALLOCATE PREPARE add_precio_paquete_stmt;

DELETE FROM movimientos_inventario
WHERE inventario_id IN (
    SELECT id FROM inventario
    WHERE familia IS NULL
       OR familia NOT IN (
         'Adhesivo PP',
         'Adhesivo Seguridad',
         'Sencilla PP',
         'Bolsas para la basura',
         'Cargadera',
         'Troquel riñón'
       )
  )
   OR venta_id IN (
    SELECT id FROM ventas
    WHERE inventario_id IS NULL
       OR producto NOT IN (
         'Adhesivo PP',
         'Adhesivo Seguridad',
         'Sencilla PP',
         'Bolsas para la basura',
         'Cargadera',
         'Troquel riñón'
       )
  )
   OR produccion_id IN (
    SELECT id FROM produccion
    WHERE producto NOT IN (
      'Adhesivo PP',
      'Adhesivo Seguridad',
      'Sencilla PP',
      'Bolsas para la basura',
      'Cargadera',
      'Troquel riñón'
    )
  );
DELETE FROM ventas
WHERE inventario_id IS NULL
   OR producto NOT IN (
     'Adhesivo PP',
     'Adhesivo Seguridad',
     'Sencilla PP',
     'Bolsas para la basura',
     'Cargadera',
     'Troquel riñón'
   );
DELETE FROM plantillas_produccion
WHERE producto NOT IN (
  'Adhesivo PP',
  'Adhesivo Seguridad',
  'Sencilla PP',
  'Bolsas para la basura',
  'Cargadera',
  'Troquel riñón'
);
DELETE FROM produccion
WHERE producto NOT IN (
  'Adhesivo PP',
  'Adhesivo Seguridad',
  'Sencilla PP',
  'Bolsas para la basura',
  'Cargadera',
  'Troquel riñón'
);
DELETE FROM inventario
WHERE familia IS NULL
   OR familia NOT IN (
     'Adhesivo PP',
     'Adhesivo Seguridad',
     'Sencilla PP',
     'Bolsas para la basura',
     'Cargadera',
     'Troquel riñón'
   );

ALTER TABLE ventas
  MODIFY COLUMN cantidad_paquetes INT NOT NULL,
  MODIFY COLUMN unidades_paquete INT NOT NULL,
  MODIFY COLUMN precio_paquete DECIMAL(12,2) NOT NULL;

SET @replace_total = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ventas'
      AND column_name = 'total'
      AND LOCATE('cantidad_paquetes', generation_expression) > 0
  ),
  'SELECT 1',
  'ALTER TABLE ventas DROP COLUMN total, ADD COLUMN total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_paquetes * precio_paquete) STORED'
);
PREPARE replace_total_stmt FROM @replace_total;
EXECUTE replace_total_stmt;
DEALLOCATE PREPARE replace_total_stmt;

SET @add_ventas_inventario_fk = IF(
  EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'ventas'
      AND column_name = 'inventario_id'
      AND referenced_table_name = 'inventario'
  ),
  'SELECT 1',
  'ALTER TABLE ventas ADD CONSTRAINT fk_ventas_inventario FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE SET NULL'
);
PREPARE add_ventas_inventario_fk_stmt FROM @add_ventas_inventario_fk;
EXECUTE add_ventas_inventario_fk_stmt;
DEALLOCATE PREPARE add_ventas_inventario_fk_stmt;

SET @add_inventario_variant_index = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'inventario'
      AND index_name = 'uq_inventario_variante'
  ),
  'SELECT 1',
  'ALTER TABLE inventario ADD UNIQUE KEY uq_inventario_variante (familia, medida, calibre, color)'
);
PREPARE add_inventario_variant_index_stmt FROM @add_inventario_variant_index;
EXECUTE add_inventario_variant_index_stmt;
DEALLOCATE PREPARE add_inventario_variant_index_stmt;
