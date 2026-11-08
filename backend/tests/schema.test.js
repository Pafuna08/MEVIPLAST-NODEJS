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
