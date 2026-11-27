-- HU-019: bloqueo temporal de cuentas tras intentos fallidos de inicio de sesión.
-- Solo agrega columnas; no modifica ni elimina datos existentes.
SET @add_failed_attempts = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'intentos_fallidos'
  ),
  'SELECT 1',
  'ALTER TABLE usuarios ADD COLUMN intentos_fallidos INT NOT NULL DEFAULT 0 AFTER activo'
);
PREPARE add_failed_attempts_stmt FROM @add_failed_attempts;
EXECUTE add_failed_attempts_stmt;
DEALLOCATE PREPARE add_failed_attempts_stmt;

SET @add_locked_until = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'bloqueado_hasta'
  ),
  'SELECT 1',
  'ALTER TABLE usuarios ADD COLUMN bloqueado_hasta DATETIME NULL AFTER intentos_fallidos'
);
PREPARE add_locked_until_stmt FROM @add_locked_until;
EXECUTE add_locked_until_stmt;
DEALLOCATE PREPARE add_locked_until_stmt;
