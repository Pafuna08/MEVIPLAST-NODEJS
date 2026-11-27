SET @add_supervisor_column = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produccion'
      AND column_name = 'supervisor_id'
  ),
  'SELECT 1',
  'ALTER TABLE produccion ADD COLUMN supervisor_id INT NULL'
);
PREPARE add_supervisor_column_stmt FROM @add_supervisor_column;
EXECUTE add_supervisor_column_stmt;
DEALLOCATE PREPARE add_supervisor_column_stmt;

SET @add_supervisor_fk = IF(
  EXISTS (
    SELECT 1 FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'produccion'
      AND column_name = 'supervisor_id'
      AND referenced_table_name = 'usuarios'
  ),
  'SELECT 1',
  'ALTER TABLE produccion ADD CONSTRAINT fk_produccion_supervisor FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL'
);
PREPARE add_supervisor_fk_stmt FROM @add_supervisor_fk;
EXECUTE add_supervisor_fk_stmt;
DEALLOCATE PREPARE add_supervisor_fk_stmt;

CREATE TABLE IF NOT EXISTS plantillas_produccion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto VARCHAR(120) NOT NULL UNIQUE,
  cantidad DECIMAL(10,2) NOT NULL,
  materia_prima_id INT NULL,
  prioridad ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media',
  creado_por INT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);
