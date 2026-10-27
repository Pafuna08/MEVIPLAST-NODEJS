-- Variante (medida, calibre, color) en las plantillas de órdenes frecuentes.
-- Agrega columnas NULL y cambia la clave única de la línea a la variante, para
-- permitir varias plantillas de una misma línea. No modifica ni elimina datos.
SET @add_template_size = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'plantillas_produccion'
      AND column_name = 'medida'
  ),
  'SELECT 1',
  'ALTER TABLE plantillas_produccion ADD COLUMN medida VARCHAR(40) NULL AFTER producto'
);
PREPARE add_template_size_stmt FROM @add_template_size;
EXECUTE add_template_size_stmt;
DEALLOCATE PREPARE add_template_size_stmt;

SET @add_template_gauge = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'plantillas_produccion'
      AND column_name = 'calibre'
  ),
  'SELECT 1',
  'ALTER TABLE plantillas_produccion ADD COLUMN calibre VARCHAR(40) NULL AFTER medida'
);
PREPARE add_template_gauge_stmt FROM @add_template_gauge;
EXECUTE add_template_gauge_stmt;
DEALLOCATE PREPARE add_template_gauge_stmt;

SET @add_template_color = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'plantillas_produccion'
      AND column_name = 'color'
  ),
  'SELECT 1',
  'ALTER TABLE plantillas_produccion ADD COLUMN color VARCHAR(80) NULL AFTER calibre'
);
PREPARE add_template_color_stmt FROM @add_template_color;
EXECUTE add_template_color_stmt;
DEALLOCATE PREPARE add_template_color_stmt;

-- La clave única anterior (una plantilla por línea) se llama «producto»
SET @drop_template_product_key = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'plantillas_produccion'
      AND index_name = 'producto'
  ),
  'ALTER TABLE plantillas_produccion DROP INDEX producto',
  'SELECT 1'
);
PREPARE drop_template_product_key_stmt FROM @drop_template_product_key;
EXECUTE drop_template_product_key_stmt;
DEALLOCATE PREPARE drop_template_product_key_stmt;

SET @add_template_variant_key = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'plantillas_produccion'
      AND index_name = 'uq_plantilla_variante'
  ),
  'SELECT 1',
  'ALTER TABLE plantillas_produccion ADD UNIQUE KEY uq_plantilla_variante (producto, medida, calibre, color)'
);
PREPARE add_template_variant_key_stmt FROM @add_template_variant_key;
EXECUTE add_template_variant_key_stmt;
DEALLOCATE PREPARE add_template_variant_key_stmt;
