ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin', 'supervisor', 'operario', 'vendedor', 'almacenista') NOT NULL;

CREATE TABLE IF NOT EXISTS movimientos_materia_prima (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_prima_id INT NOT NULL,
  usuario_id INT NULL,
  produccion_id INT NULL,
  tipo ENUM('compra', 'ajuste_entrada', 'ajuste_salida', 'consumo_produccion') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  observaciones VARCHAR(255) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_materia_fecha (materia_prima_id, fecha),
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (produccion_id) REFERENCES produccion(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventario_id INT NOT NULL,
  usuario_id INT NULL,
  produccion_id INT NULL,
  venta_id INT NULL,
  tipo ENUM('saldo_inicial', 'ingreso_manual', 'produccion', 'salida_manual', 'venta') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  observaciones VARCHAR(255) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_inventario_fecha (inventario_id, fecha),
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (produccion_id) REFERENCES produccion(id) ON DELETE SET NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
);

INSERT INTO movimientos_materia_prima
  (materia_prima_id, usuario_id, tipo, cantidad, observaciones, fecha)
SELECT mp.id, NULL, 'ajuste_entrada', mp.cantidad,
       'Saldo inicial importado al activar el ledger', mp.fecha_ingreso
FROM materia_prima mp
WHERE mp.cantidad > 0
  AND NOT EXISTS (
    SELECT 1 FROM movimientos_materia_prima m
    WHERE m.materia_prima_id = mp.id
      AND m.observaciones = 'Saldo inicial importado al activar el ledger'
  );

INSERT INTO movimientos_inventario
  (inventario_id, usuario_id, tipo, cantidad, observaciones, fecha)
SELECT i.id, NULL, 'saldo_inicial', i.cantidad,
       'Saldo inicial importado al activar el ledger', i.actualizado_en
FROM inventario i
WHERE i.cantidad > 0
  AND NOT EXISTS (
    SELECT 1 FROM movimientos_inventario m
    WHERE m.inventario_id = i.id AND m.tipo = 'saldo_inicial'
  );