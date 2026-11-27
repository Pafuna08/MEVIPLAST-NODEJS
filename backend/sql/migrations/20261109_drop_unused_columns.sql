-- Elimina dos columnas que ningún requisito usa (CR-015, decisión del equipo por delegación de MEVIPLAST):
-- inventario.ubicacion (todo el producto terminado se guarda en el mismo lugar) y
-- produccion.lote (sin uso desde el PR #45). Solo borra esas columnas; no toca filas ni otras columnas.
-- Compatible con MySQL 8 y MariaDB 10.4: cada borrado se hace solo si la columna existe.
SET @drop_inventory_location = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'inventario'
      AND column_name = 'ubicacion'
  ),
  'ALTER TABLE inventario DROP COLUMN ubicacion',
  'SELECT 1'
);
PREPARE drop_inventory_location_stmt FROM @drop_inventory_location;
EXECUTE drop_inventory_location_stmt;
DEALLOCATE PREPARE drop_inventory_location_stmt;

SET @drop_production_lot = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produccion'
      AND column_name = 'lote'
  ),
  'ALTER TABLE produccion DROP COLUMN lote',
  'SELECT 1'
);
PREPARE drop_production_lot_stmt FROM @drop_production_lot;
EXECUTE drop_production_lot_stmt;
DEALLOCATE PREPARE drop_production_lot_stmt;
