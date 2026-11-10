const test = require("node:test");
const assert = require("node:assert/strict");

test("las pruebas unitarias no usan la base configurada en .env", () => {
  assert.equal(process.env.DB_NAME, "meviplast_pruebas_sin_base");
  const { pool } = require("../src/config/database");
  assert.equal(pool.pool.config.connectionConfig.database, "meviplast_pruebas_sin_base");
});
