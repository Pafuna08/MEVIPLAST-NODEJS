SET @add_email_column = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'correo'
  ),
  'SELECT 1',
  'ALTER TABLE usuarios ADD COLUMN correo VARCHAR(254) NULL'
);
PREPARE add_email_column_stmt FROM @add_email_column;
EXECUTE add_email_column_stmt;
DEALLOCATE PREPARE add_email_column_stmt;

SET @add_email_index = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND index_name = 'uq_usuarios_correo'
  ),
  'SELECT 1',
  'CREATE UNIQUE INDEX uq_usuarios_correo ON usuarios (correo)'
);
PREPARE add_email_index_stmt FROM @add_email_index;
EXECUTE add_email_index_stmt;
DEALLOCATE PREPARE add_email_index_stmt;
