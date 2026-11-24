-- HU-020 / RF-005: cerrar sesión revoca el token en el servidor. Cada usuario tiene una versión de sesión
-- que viaja en el token; al cerrar sesión o restablecer la contraseña sube y los tokens anteriores dejan
-- de servir. Valor inicial 0, igual al de los tokens emitidos antes de este cambio. Idempotente.

SET @add_sesion_version = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'sesion_version'
  ),
  'SELECT 1',
  'ALTER TABLE usuarios ADD COLUMN sesion_version INT NOT NULL DEFAULT 0'
);
PREPARE add_sesion_version_stmt FROM @add_sesion_version;
EXECUTE add_sesion_version_stmt;
DEALLOCATE PREPARE add_sesion_version_stmt;
