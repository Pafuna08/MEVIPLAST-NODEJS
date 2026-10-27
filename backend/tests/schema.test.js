const test = require("node:test");
const assert = require("node:assert/strict");
const { leerEsquema, validarNombreBase } = require("../src/config/schema");

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
