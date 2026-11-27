SET @add_medida = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'materia_prima'
      AND column_name = 'medida'
  ),
  'SELECT 1',
  'ALTER TABLE materia_prima ADD COLUMN medida VARCHAR(80) NULL'
);
PREPARE add_medida_stmt FROM @add_medida;
EXECUTE add_medida_stmt;
DEALLOCATE PREPARE add_medida_stmt;

SET @add_calibre = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'materia_prima'
      AND column_name = 'calibre'
  ),
  'SELECT 1',
  'ALTER TABLE materia_prima ADD COLUMN calibre VARCHAR(40) NULL'
);
PREPARE add_calibre_stmt FROM @add_calibre;
EXECUTE add_calibre_stmt;
DEALLOCATE PREPARE add_calibre_stmt;

SET @add_color = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'materia_prima'
      AND column_name = 'color'
  ),
  'SELECT 1',
  'ALTER TABLE materia_prima ADD COLUMN color VARCHAR(80) NULL'
);
PREPARE add_color_stmt FROM @add_color;
EXECUTE add_color_stmt;
DEALLOCATE PREPARE add_color_stmt;

SET @add_peso_rollo = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'materia_prima'
      AND column_name = 'peso_rollo'
  ),
  'SELECT 1',
  'ALTER TABLE materia_prima ADD COLUMN peso_rollo DECIMAL(10,2) NULL'
);
PREPARE add_peso_rollo_stmt FROM @add_peso_rollo;
EXECUTE add_peso_rollo_stmt;
DEALLOCATE PREPARE add_peso_rollo_stmt;
