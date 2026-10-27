UPDATE materia_prima
SET cantidad = 50,
    proveedor = 'DEMO - Proveedor de ejemplo',
    stock_minimo = 25
WHERE tipo = 'PEBD'
  AND medida = '6 x 12'
  AND calibre = '0.95'
  AND color = 'Transparente'
  AND cantidad = 0
  AND proveedor IS NULL;

UPDATE materia_prima
SET cantidad = 60,
    proveedor = 'DEMO - Proveedor de ejemplo',
    stock_minimo = 30
WHERE tipo = 'PEBD'
  AND medida = '8 x 12'
  AND calibre = '1'
  AND color = 'Natural'
  AND cantidad = 0
  AND proveedor IS NULL;

UPDATE materia_prima
SET cantidad = 50,
    proveedor = 'DEMO - Proveedor de ejemplo',
    stock_minimo = 25
WHERE tipo = 'PEAD'
  AND medida = '6 x 8'
  AND calibre = '2'
  AND color = 'Natural'
  AND cantidad = 0
  AND proveedor IS NULL;

UPDATE materia_prima
SET cantidad = 90,
    proveedor = 'DEMO - Proveedor de ejemplo',
    stock_minimo = 30
WHERE tipo = 'PEAD'
  AND medida = '10 x 15'
  AND calibre = '2'
  AND color = 'Blanco'
  AND cantidad = 0
  AND proveedor IS NULL;

UPDATE materia_prima
SET cantidad = 75,
    proveedor = 'DEMO - Proveedor de ejemplo',
    stock_minimo = 25
WHERE tipo = 'PP'
  AND medida = '6 x 12'
  AND calibre = '2'
  AND color = 'Transparente'
  AND cantidad = 0
  AND proveedor IS NULL;

UPDATE materia_prima
SET cantidad = 60,
    proveedor = 'DEMO - Proveedor de ejemplo',
    stock_minimo = 30
WHERE tipo = 'PP'
  AND medida = '8 x 12'
  AND calibre = '3'
  AND color = 'Blanco'
  AND cantidad = 0
  AND proveedor IS NULL;

INSERT INTO inventario
  (producto, familia, medida, calibre, color, cantidad, ubicacion)
SELECT CONCAT(
         muestras.familia,
         ' · ',
         muestras.medida,
         ' · calibre ',
         muestras.calibre,
         ' · ',
         muestras.color
       ),
       muestras.familia,
       muestras.medida,
       muestras.calibre,
       muestras.color,
       muestras.cantidad,
       muestras.ubicacion
FROM (
  SELECT 'Adhesivo PP' AS familia, '10 x 15' AS medida, '2' AS calibre,
         'Transparente' AS color, 1200 AS cantidad, 'DEMO - Bodega A' AS ubicacion
  UNION ALL
  SELECT 'Adhesivo Seguridad', '10 x 15', '2', 'Blanco', 900, 'DEMO - Bodega A'
  UNION ALL
  SELECT 'Sencilla PP', '6 x 9', '1', 'Natural', 1500, 'DEMO - Bodega A'
  UNION ALL
  SELECT 'Bolsas para la basura', '20 x 30', '2', 'Negro', 750, 'DEMO - Bodega B'
  UNION ALL
  SELECT 'Cargadera', '15 x 20', '2', 'Blanco', 1100, 'DEMO - Bodega B'
  UNION ALL
  SELECT 'Troquel riñón', '12 x 18', '2', 'Transparente', 600, 'DEMO - Bodega B'
) AS muestras
WHERE NOT EXISTS (
  SELECT 1
  FROM inventario existentes
  WHERE existentes.familia = muestras.familia
    AND existentes.medida = muestras.medida
    AND existentes.calibre = muestras.calibre
    AND existentes.color = muestras.color
);
