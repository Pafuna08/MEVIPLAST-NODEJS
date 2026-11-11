-- CR-020: catálogo de líneas de producto terminado en la base, para que el administrador agregue líneas nuevas.
-- Crea la tabla con las seis líneas de la reunión inicial (RN-012). Idempotente.

CREATE TABLE IF NOT EXISTS lineas_producto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO lineas_producto (id, nombre) VALUES
  (1, 'Adhesivo PP'),
  (2, 'Adhesivo Seguridad'),
  (3, 'Sencilla PP'),
  (4, 'Bolsas para la basura'),
  (5, 'Cargadera'),
  (6, 'Troquel riñón');
