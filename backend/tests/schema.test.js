const test = require("node:test");
const assert = require("node:assert/strict");
const {
  leerEsquema,
  validarNombreBase,
  describirErrorBase,
  migracionesPendientes,
} = require("../src/config/schema");

test("leerEsquema quita la base fija meviplast_db y conserva las tablas", () => {
  const esquema = leerEsquema();
  assert.doesNotMatch(esquema, /CREATE DATABASE/i);
  assert.doesNotMatch(esquema, /^\s*USE\s+meviplast_db/im);
  assert.match(esquema, /CREATE TABLE IF NOT EXISTS usuarios/);
  assert.match(esquema, /CREATE TABLE IF NOT EXISTS movimientos_inventario/);
});

test("validarNombreBase rechaza nombres con caracteres que permitirían inyectar SQL", () => {
  assert.equal(validarNombreBase("meviplast_e2e"), "meviplast_e2e");
  assert.throws(() => validarNombreBase("meviplast_db`; DROP DATABASE x; --"), /no válido/);
  assert.throws(() => validarNombreBase(""), /no válido/);
});

test("describirErrorBase explica MySQL apagado aunque el AggregateError venga sin mensaje", () => {
  const apagado = new AggregateError(
    [Object.assign(new Error("connect ECONNREFUSED ::1:3306"), { code: "ECONNREFUSED" })],
    "",
  );
  const texto = describirErrorBase(apagado, { host: "localhost", port: 3306 });
  assert.match(texto, /No se pudo conectar a MySQL en localhost:3306/);
  assert.match(texto, /XAMPP/);
  const acceso = Object.assign(new Error("Access denied"), { code: "ER_ACCESS_DENIED_ERROR" });
  assert.match(describirErrorBase(acceso), /DB_USER y DB_PASSWORD/);
  assert.doesNotMatch(describirErrorBase(acceso), /Access denied/);
  assert.equal(describirErrorBase(new Error("otro fallo")), "otro fallo");
});

test("migracionesPendientes devuelve solo los .sql sin registrar, en orden", () => {
  const archivos = ["20261027_b.sql", "20261020_a.sql", "LEEME.md", "20261026_c.sql"];
  assert.deepEqual(
    migracionesPendientes(archivos, ["20261020_a.sql"]),
    ["20261026_c.sql", "20261027_b.sql"],
  );
  assert.deepEqual(migracionesPendientes(archivos, archivos), []);
});

// DEF-020: db:init carga esta semilla sobre el esquema final de schema.sql,
// así que cada columna que inserta o actualiza debe existir en la tabla.
test("la semilla DEMO solo usa columnas que existen en schema.sql", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const esquema = leerEsquema();
  const columnasDe = (tabla) => {
    const bloque = esquema.split("CREATE TABLE IF NOT EXISTS ").find((parte) => parte.startsWith(`${tabla} (`));
    assert.ok(bloque, `schema.sql no define la tabla ${tabla}`);
    const definicion = bloque.split(/\r?\n\);/)[0];
    return new Set([...definicion.matchAll(/^\s*([a-z_]+)\s+[A-Z]/gm)].map((m) => m[1]));
  };
  const semilla = fs.readFileSync(
    path.join(__dirname, "..", "sql", "migrations", "20261026_seed_demo_inventory.sql"),
    "utf8",
  );
  const inserciones = [...semilla.matchAll(/INSERT INTO (\w+)\s*\(([^)]*)\)/g)];
  assert.ok(inserciones.length > 0);
  for (const [, tabla, lista] of inserciones) {
    const columnas = columnasDe(tabla);
    for (const columna of lista.split(",").map((c) => c.trim())) {
      assert.ok(columnas.has(columna), `${tabla}.${columna} no existe en schema.sql`);
    }
  }
  for (const [, tabla, asignaciones] of semilla.matchAll(/UPDATE (\w+)\s+SET([\s\S]*?)WHERE/g)) {
    const columnas = columnasDe(tabla);
    for (const [, columna] of asignaciones.matchAll(/(\w+)\s*=/g)) {
      assert.ok(columnas.has(columna), `${tabla}.${columna} no existe en schema.sql`);
    }
  }
});
