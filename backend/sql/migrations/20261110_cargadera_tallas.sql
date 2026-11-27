-- CR-019: Cargadera se mide por tallas (T15, T20, T25 y T30). Las variantes «15 x 20» pasan a T15.
-- Idempotente: si ya existe la misma variante en T15, no se toca (la clave única la impediría).
-- Las ventas ya registradas conservan el texto con el que se vendieron.

UPDATE inventario i
SET i.medida = 'T15',
    i.producto = CONCAT('Cargadera · T15 · calibre ', i.calibre, ' · ', i.color)
WHERE i.familia = 'Cargadera'
  AND i.medida = '15 x 20'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT familia, medida, calibre, color FROM inventario) otra
    WHERE otra.familia = 'Cargadera' AND otra.medida = 'T15'
      AND otra.calibre = i.calibre AND otra.color = i.color
  );

UPDATE produccion
SET medida = 'T15'
WHERE producto = 'Cargadera' AND medida = '15 x 20';

UPDATE plantillas_produccion p
SET p.medida = 'T15'
WHERE p.producto = 'Cargadera'
  AND p.medida = '15 x 20'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT producto, medida, calibre, color FROM plantillas_produccion) otra
    WHERE otra.producto = 'Cargadera' AND otra.medida = 'T15'
      AND otra.calibre = p.calibre AND otra.color = p.color
  );
