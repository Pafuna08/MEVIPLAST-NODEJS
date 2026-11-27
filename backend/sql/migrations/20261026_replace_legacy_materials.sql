DELETE FROM movimientos_materia_prima
WHERE materia_prima_id IN (
  SELECT id FROM materia_prima
  WHERE nombre IN ('Polietileno BD', 'Pigmento azul')
);

DELETE FROM materia_prima
WHERE nombre IN ('Polietileno BD', 'Pigmento azul');

INSERT INTO materia_prima
  (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo)
SELECT 'Bobina o rollo de polietileno de baja densidad (PEBD) - 6 x 12 - calibre 0.95 - Transparente',
       'PEBD', '6 x 12', '0.95', 'Transparente', 25, 0, 'kg', 0
WHERE NOT EXISTS (
  SELECT 1 FROM materia_prima
  WHERE tipo = 'PEBD' AND medida = '6 x 12' AND calibre = '0.95' AND color = 'Transparente'
);

INSERT INTO materia_prima
  (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo)
SELECT 'Bobina o rollo de polietileno de baja densidad (PEBD) - 8 x 12 - calibre 1 - Natural',
       'PEBD', '8 x 12', '1', 'Natural', 30, 0, 'kg', 0
WHERE NOT EXISTS (
  SELECT 1 FROM materia_prima
  WHERE tipo = 'PEBD' AND medida = '8 x 12' AND calibre = '1' AND color = 'Natural'
);

INSERT INTO materia_prima
  (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo)
SELECT 'Bobina o rollo de polietileno de alta densidad (PEAD) - 6 x 8 - calibre 2 - Natural',
       'PEAD', '6 x 8', '2', 'Natural', 25, 0, 'kg', 0
WHERE NOT EXISTS (
  SELECT 1 FROM materia_prima
  WHERE tipo = 'PEAD' AND medida = '6 x 8' AND calibre = '2' AND color = 'Natural'
);

INSERT INTO materia_prima
  (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo)
SELECT 'Bobina o rollo de polietileno de alta densidad (PEAD) - 10 x 15 - calibre 2 - Blanco',
       'PEAD', '10 x 15', '2', 'Blanco', 30, 0, 'kg', 0
WHERE NOT EXISTS (
  SELECT 1 FROM materia_prima
  WHERE tipo = 'PEAD' AND medida = '10 x 15' AND calibre = '2' AND color = 'Blanco'
);

INSERT INTO materia_prima
  (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo)
SELECT 'Bobina o rollo de polipropileno (PP) - 6 x 12 - calibre 2 - Transparente',
       'PP', '6 x 12', '2', 'Transparente', 25, 0, 'kg', 0
WHERE NOT EXISTS (
  SELECT 1 FROM materia_prima
  WHERE tipo = 'PP' AND medida = '6 x 12' AND calibre = '2' AND color = 'Transparente'
);

INSERT INTO materia_prima
  (nombre, tipo, medida, calibre, color, peso_rollo, cantidad, unidad, stock_minimo)
SELECT 'Bobina o rollo de polipropileno (PP) - 8 x 12 - calibre 3 - Blanco',
       'PP', '8 x 12', '3', 'Blanco', 30, 0, 'kg', 0
WHERE NOT EXISTS (
  SELECT 1 FROM materia_prima
  WHERE tipo = 'PP' AND medida = '8 x 12' AND calibre = '3' AND color = 'Blanco'
);
