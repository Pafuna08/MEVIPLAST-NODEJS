-- HU-010 / RF-015: las compras de materia prima registran el costo total y el número de factura.
-- Columnas opcionales (NULL) para que los movimientos anteriores sigan válidos. Idempotente.

SET @add_costo = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'movimientos_materia_prima'
      AND column_name = 'costo'
  ),
  'SELECT 1',
  'ALTER TABLE movimientos_materia_prima ADD COLUMN costo DECIMAL(12,2) NULL AFTER cantidad'
);
PREPARE add_costo_stmt FROM @add_costo;
EXECUTE add_costo_stmt;
DEALLOCATE PREPARE add_costo_stmt;

SET @add_factura = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'movimientos_materia_prima'
      AND column_name = 'factura'
  ),
  'SELECT 1',
  'ALTER TABLE movimientos_materia_prima ADD COLUMN factura VARCHAR(40) NULL AFTER costo'
);
PREPARE add_factura_stmt FROM @add_factura;
EXECUTE add_factura_stmt;
DEALLOCATE PREPARE add_factura_stmt;
