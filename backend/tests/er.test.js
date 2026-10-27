const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(path.join(__dirname, "..", "sql", "schema.sql"), "utf8");
const er = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "data", "er.md"), "utf8");

// Tablas y claves foráneas declaradas en schema.sql
function leerEsquema() {
  const tablas = {};
  for (const [, nombre, cuerpo] of schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)) {
    const fks = [...cuerpo.matchAll(/FOREIGN KEY \((\w+)\) REFERENCES (\w+)\(id\) ON DELETE (CASCADE|SET NULL|RESTRICT)/g)]
      .map(([, columna, padre, regla]) => ({ columna, padre, regla }));
    const columnas = [...cuerpo.matchAll(/^\s+(\w+) (?:INT|VARCHAR|DECIMAL|ENUM|DATETIME|TINYINT|CHAR)\b/gm)].map(([, c]) => c);
    tablas[nombre] = { fks, columnas };
  }
  return tablas;
}

test("el diagrama ER tiene todas las tablas y columnas de schema.sql", () => {
  const tablas = leerEsquema();
  assert.ok(Object.keys(tablas).length >= 10, "no se leyeron las tablas de schema.sql");
  for (const [nombre, { columnas }] of Object.entries(tablas)) {
    const bloque = er.match(new RegExp(`\\n\\s+${nombre} \\{([\\s\\S]*?)\\n\\s+\\}`));
    assert.ok(bloque, `falta la entidad ${nombre} en docs/data/er.md`);
    for (const columna of columnas) {
      assert.match(bloque[1], new RegExp(`\\s${columna}(\\s|$)`), `${nombre}.${columna} no aparece en el diagrama`);
    }
  }
});

test("el diagrama ER tiene cada clave foránea con su regla de borrado", () => {
  const tablas = leerEsquema();
  let total = 0;
  for (const [hija, { fks }] of Object.entries(tablas)) {
    for (const { columna, padre, regla } of fks) {
      total += 1;
      const relacion = new RegExp(`\\n\\s+${padre} \\S+ ${hija} : "${columna}, ${regla}"`);
      assert.match(er, relacion, `falta la relación ${padre} → ${hija} (${columna}, ${regla})`);
    }
  }
  assert.equal(total, 16, "se esperaban 16 claves foráneas en schema.sql");
});
